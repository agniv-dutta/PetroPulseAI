"""Model 2 - ML production forecasting: Arps anchor + XGBoost + optional LSTM.

Pipeline contract:

    Historical Data -> Feature Engineering -> Arps Baseline
                    -> XGBoost Forecast    -> Optional LSTM
                    -> Ensemble Forecast

Design rules
------------
- XGBoost is the primary supervised backend; if the xgboost package is not
  importable the engine transparently falls back to scikit-learn's
  GradientBoostingRegressor and records that in `backend`/`models_used`.
- The LSTM is OPTIONAL and gated: it is only trained when explicitly enabled,
  torch is installed, AND there are enough observations (default >= 48).
  Otherwise the engine falls back to Arps + XGBoost. We never use an LSTM
  merely because it looks advanced - insufficient data degrades it.
- Every forecast result exposes which models actually produced it.
- Validation is strictly chronological (rolling origin); time series are
  never shuffled.

Canonical cadence is monthly; day-based horizons convert at 30.44 d/month.
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field

import numpy as np

from app.ml.arps import DAYS_PER_MONTH, arps_rate
from app.ml.performance_metrics import PerformanceMetrics

# ------------------------------------------------------------------ features


def trend_slope(series: np.ndarray, window: int = 6) -> float:
    """OLS slope of the last `window` points (units per month)."""
    s = np.asarray(series[-window:], dtype=float)
    if s.size < 2:
        return 0.0
    x = np.arange(s.size, dtype=float)
    return float(np.polyfit(x, s, 1)[0])


FEATURE_LABELS = {
    "lag_1": "Previous month production",
    "lag_2": "Production two months ago",
    "lag_3": "Quarter-lag production",
    "lag_6": "Half-year-lag production",
    "lag_12": "Year-lag production",
    "roll3_mean": "3-month rolling average",
    "roll6_mean": "6-month rolling average",
    "roll3_std": "3-month production volatility",
    "decline_rate": "Month-over-month decline rate",
    "trend_slope": "6-month production trend slope",
    "sin12": "Seasonal cycle (sin)",
    "cos12": "Seasonal cycle (cos)",
    "arps_baseline": "Arps baseline expectation",
}


def feature_row(
    history: list[float],
    month_index: int,
    arps_params: dict | None = None,
    asset_metadata: dict[str, float] | None = None,
) -> tuple[list[float], list[str]]:
    """Build one supervised feature row from the trailing history slice.

    `history` contains every value up to and including month_index. Returns
    (values, feature_names) with a stable ordering shared by fit/predict.
    """
    h = np.asarray(history, dtype=float)

    def lag(k: int) -> float:
        return h[-k] if len(h) >= k else h[0]

    roll3 = float(np.mean(h[-3:]))
    roll6 = float(np.mean(h[-6:]))
    roll3_std = float(np.std(h[-3:], ddof=0))
    prev = h[-2] if len(h) >= 2 else h[0]
    decline_rate = -(h[-1] - prev) / max(abs(prev), 1e-9)
    slope = trend_slope(h)
    phase = month_index % 12

    values: list[float] = [
        lag(1), lag(2), lag(3), lag(6), lag(12),
        roll3, roll6, roll3_std,
        decline_rate, slope,
        float(np.sin(2 * np.pi * phase / 12.0)),
        float(np.cos(2 * np.pi * phase / 12.0)),
    ]
    names = [
        "lag_1", "lag_2", "lag_3", "lag_6", "lag_12",
        "roll3_mean", "roll6_mean", "roll3_std",
        "decline_rate", "trend_slope", "sin12", "cos12",
    ]

    if arps_params:
        values.append(float(arps_rate(
            arps_params["qi"], arps_params["di"], arps_params["b"], float(month_index)
        )))
        names.append("arps_baseline")

    for key in sorted((asset_metadata or {}).keys()):
        value = asset_metadata[key]
        values.append(float(value) if isinstance(value, (int, float)) else 0.0)
        names.append(f"meta_{key}")

    return values, names


def build_supervised_matrix(
    values: list[float],
    arps_params: dict | None = None,
    asset_metadata: dict[str, float] | None = None,
    warmup: int = 13,
) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Chronological feature matrix/target over a monthly series."""
    X_rows: list[list[float]] = []
    y: list[float] = []
    names: list[str] | None = None
    for idx in range(len(values)):
        if idx < warmup:
            continue
        row, names_i = feature_row(values[: idx + 1], idx, arps_params, asset_metadata)
        X_rows.append(row)
        y.append(float(values[idx]))
        names = names_i
    if names is None or len(X_rows) < 8:
        raise ValueError(
            "insufficient history for supervised forecasting "
            "(need >= 8 engineered rows after warmup)"
        )
    return np.asarray(X_rows, dtype=float), np.asarray(y, dtype=float), list(names)


# ------------------------------------------------------------------- backend


def _make_boosted_model(random_state: int = 42) -> tuple[object, str]:
    """XGBoost when available, otherwise sklearn GradientBoosting fallback."""
    try:
        from xgboost import XGBRegressor

        model = XGBRegressor(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=4,
            subsample=0.9,
            colsample_bytree=0.9,
            reg_lambda=1.0,
            random_state=random_state,
            objective="reg:squarederror",
            n_jobs=-1,
        )
        return model, "xgboost"
    except ImportError:
        from sklearn.ensemble import GradientBoostingRegressor

        model = GradientBoostingRegressor(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=3,
            subsample=0.9,
            random_state=random_state,
        )
        return model, "sklearn-gradient-boosting"


# ---------------------------------------------------------------------- LSTM


class LSTMTorchUnavailable(RuntimeError):
    pass


@dataclass
class LSTMForecaster:
    """Optional single-layer LSTM for sequence learning on monthly rates."""

    seq_len: int = 12
    hidden_size: int = 32
    epochs: int = 80
    learning_rate: float = 5e-3
    min_history: int = 48
    _torch: object = field(default=None, init=False, repr=False)
    _model: object = field(default=None, init=False, repr=False)
    mean_: float = field(default=0.0, init=False, repr=False)
    std_: float = field(default=1.0, init=False, repr=False)
    fitted: bool = field(default=False, init=False, repr=False)

    @classmethod
    def torch_available(cls) -> bool:
        try:
            import torch  # noqa: F401

            return True
        except ImportError:
            return False

    def fit(self, values: list[float]) -> "LSTMForecaster":
        try:
            import torch
            import torch.nn as nn
        except ImportError as exc:  # pragma: no cover - torch optional
            raise LSTMTorchUnavailable("pytorch is not installed") from exc

        if len(values) < self.min_history:
            raise LSTMTorchUnavailable(
                f"insufficient data for LSTM ({len(values)} < {self.min_history} obs)"
            )

        arr = np.asarray(values, dtype=float)
        self.mean_, self.std_ = float(arr.mean()), max(float(arr.std()), 1e-9)
        z = (arr - self.mean_) / self.std_

        class _Net(nn.Module):
            def __init__(self_inner):
                super().__init__()
                self_inner.lstm = nn.LSTM(
                    input_size=1, hidden_size=self.hidden_size, num_layers=1, batch_first=True
                )
                self_inner.head = nn.Linear(self.hidden_size, 1)

            def forward(self_inner, x):
                out, _ = self_inner.lstm(x)
                return self_inner.head(out[:, -1, :]).squeeze(-1)

        torch.manual_seed(42)
        net = _Net()
        opt = torch.optim.Adam(net.parameters(), lr=self.learning_rate)
        loss_fn = nn.MSELoss()

        windows_x, windows_y = [], []
        for i in range(len(z) - self.seq_len):
            windows_x.append(z[i : i + self.seq_len])
            windows_y.append(z[i + self.seq_len])
        xt = torch.tensor(windows_x, dtype=torch.float32).unsqueeze(-1)
        yt = torch.tensor(windows_y, dtype=torch.float32)

        net.train()
        for _ in range(self.epochs):
            opt.zero_grad()
            loss = loss_fn(net(xt), yt)
            loss.backward()
            opt.step()
        net.eval()
        self._torch = torch
        self._model = net
        self.fitted = True
        return self

    def predict_future(self, history: list[float], steps: int) -> list[float]:
        if not self.fitted:
            raise LSTMTorchUnavailable("LSTM must be fitted before prediction")
        torch = self._torch
        z = list((np.asarray(history[-self.seq_len :], dtype=float) - self.mean_) / self.std_)
        preds: list[float] = []
        with torch.no_grad():
            window = torch.tensor([z], dtype=torch.float32).unsqueeze(-1)
            for _ in range(steps):
                nxt = float(self._model(window).item())
                preds.append(nxt)
                rolled = window.squeeze(0).squeeze(-1).tolist()[1:] + [nxt]
                window = torch.tensor([rolled], dtype=torch.float32).unsqueeze(-1)
        scale = np.asarray(preds) * self.std_ + self.mean_
        return [float(v) for v in scale]


# ------------------------------------------------------------------ ensemble


@dataclass
class ProductionForecaster:
    """Ensemble forecaster: Arps anchor + boosted trees (+ optional LSTM)."""

    random_state: int = 42
    enable_lstm: bool = False          # LSTM is opt-in, never automatic
    lstm_weight: float = 0.30
    arps_blend_weight: float = 0.35
    lstm_min_history: int = 48
    model_name: str = "Ensemble(Arps+ML)"  # refined after fit via produced_by

    model: object = field(default=None, init=False, repr=False)
    backend: str = field(default="unfitted", init=False, repr=False)
    feature_names: list[str] = field(default_factory=list, init=False, repr=False)
    models_used: list[str] = field(default_factory=list, init=False, repr=False)
    fallback_notes: list[str] = field(default_factory=list, init=False, repr=False)
    residual_std: float = field(default=0.0, init=False, repr=False)
    history_: list[float] = field(default_factory=list, init=False, repr=False)
    arps_params_: dict | None = field(default=None, init=False, repr=False)
    metadata_: dict | None = field(default=None, init=False, repr=False)
    _lstm: LSTMForecaster | None = field(default=None, init=False, repr=False)
    _fitted: bool = field(default=False, init=False, repr=False)

    # ------------------------------------------------------------- helpers
    @property
    def produced_by(self) -> str:
        return " + ".join(m.upper() for m in self.models_used) if self.models_used else "UNFITTED"

    def _vector(
        self,
        hist: list[float],
        month_index: int,
    ) -> np.ndarray:
        row, _ = feature_row(hist, month_index, self.arps_params_, self.metadata_)
        return np.asarray(row, dtype=float)

    # ------------------------------------------------------------------ fit
    def fit(
        self,
        values: list[float],
        arps_params: dict | None = None,
        asset_metadata: dict[str, float] | None = None,
        enable_lstm: bool | None = None,
    ) -> "ProductionForecaster":
        self.arps_params_ = dict(arps_params) if arps_params else None
        self.metadata_ = {
            k: v for k, v in (asset_metadata or {}).items() if isinstance(v, (int, float))
        }
        self.history_ = [float(v) for v in values]

        X, y, names = build_supervised_matrix(values, self.arps_params_, self.metadata_)
        self.feature_names = names

        self.model, self.backend = _make_boosted_model(self.random_state)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self.model.fit(X, y)
        preds = self.model.predict(X)
        self.residual_std = float(np.std(y - preds))

        self.models_used = ["arps"] if self.arps_params_ else ["ml"]
        self.models_used.append("xgboost" if self.backend == "xgboost" else self.backend)

        use_lstm = self.enable_lstm if enable_lstm is None else enable_lstm
        self._lstm = None
        if use_lstm:
            if not LSTMForecaster.torch_available():
                self.fallback_notes.append(
                    "LSTM requested but pytorch is unavailable - falling back to Arps+XGBoost"
                )
            elif len(values) < max(self.lstm_min_history, LSTMForecaster().min_history):
                self.fallback_notes.append(
                    f"LSTM skipped: {len(values)} observations < required "
                    f"{self.lstm_min_history} - falling back to Arps+XGBoost"
                )
            else:
                try:
                    self._lstm = LSTMForecaster(min_history=self.lstm_min_history).fit(values)
                    self.models_used.append("lstm")
                except LSTMTorchUnavailable as exc:
                    self.fallback_notes.append(f"LSTM unavailable: {exc}")

        self.model_name = f"Ensemble({'+'.join(self.models_used)})"
        self._fitted = True
        return self

    # ------------------------------------------------------------- forecast
    def forecast(
        self,
        horizon_days: int | None = None,
        arps_params: dict | None = None,
        horizon_months: int | None = None,
    ) -> dict:
        """Recursive rollout blended with the Arps anchor (and LSTM when active).

        Accepts either horizon_days or legacy horizon_months; days win when both
        are provided.
        """
        if not self._fitted:
            raise RuntimeError("forecaster must be fitted before forecasting")
        if arps_params and arps_params != self.arps_params_:
            self.arps_params_ = dict(arps_params)

        months = (
            int(horizon_months) if horizon_months is not None
            else max(int(round((horizon_days or 180) / DAYS_PER_MONTH)), 1)
        )
        months = max(months, 1)

        hist = list(self.history_)
        base_index = len(hist)
        gbm_path: list[float] = []

        lstm_path: list[float] | None = None
        if self._lstm is not None:
            lstm_path = self._lstm.predict_future(hist, months)

        for step in range(1, months + 1):
            x = self._vector(hist, base_index + step - 1).reshape(1, -1)
            pred = float(self.model.predict(x.reshape(1, -1))[0])

            if self.arps_params_:
                t_next = len(hist) - 1 + 1.0
                anchor = float(arps_rate(
                    self.arps_params_["qi"],
                    self.arps_params_["di"],
                    self.arps_params_["b"],
                    t_next,
                ))
                w = min(self.arps_blend_weight * min(step / max(months / 2, 1), 1.5), 0.7)
                pred = (1 - w) * pred + w * anchor

            if lstm_path is not None:
                lw = min(max(self.lstm_weight, 0.0), 0.5)
                pred = (1 - lw) * pred + lw * lstm_path[step - 1]

            pred = max(pred, 1e-2)
            hist.append(pred)
            gbm_path.append(pred)

        spread = self.residual_std * (1.0 + 0.15 * np.sqrt(np.arange(1, months + 1)))
        points = []
        for step, value in enumerate(gbm_path, start=1):
            sp = float(spread[step - 1])
            lower = round(max(value - 1.28 * sp, 0.0), 1)
            upper = round(value + 1.28 * sp, 1)
            points.append({
                "step": step,
                "day": int(round(step * DAYS_PER_MONTH)),
                "forecast": round(value, 1),
                "lower": lower,
                "upper": upper,
                "band_p10": lower,
                "band_p50": round(value, 1),
                "band_p90": upper,
            })

        def at(days: int) -> float:
            m = min(max(round(days / DAYS_PER_MONTH), 1), months) - 1
            return gbm_path[m]

        summary = {
            "forecast_30d": round(at(30), 1),
            "forecast_90d": round(at(90), 1),
            "forecast_180d": round(at(180), 1),
            "forecast_365d": round(at(365), 1),
            "residual_std": round(self.residual_std, 3),
        }

        return {
            "model_name": self.model_name,
            "produced_by": self.produced_by,
            "models_used": list(self.models_used),
            "backend": self.backend,
            "fallback_notes": list(self.fallback_notes),
            "horizon_days": months * 30,
            "horizon_months": months,
            "points": points,
            "summary": summary,
            "arps_anchor_used": bool(self.arps_params_),
        }

    # -------------------------------------------------------------- backtest
    def backtest(
        self,
        values: list[float],
        horizons_days=(30, 90, 180),
        arps_params: dict | None = None,
        asset_metadata: dict[str, float] | None = None,
    ) -> dict:
        """Rolling-origin chronological validation at standard horizons."""
        vals = list(values)
        n = len(vals)
        eval_start = max(14, int(n * 0.66))
        metrics_by_horizon: dict[str, dict] = {}
        errors_all: list[float] = []
        y_true_all: list[float] = []
        y_pred_all: list[float] = []

        for cut in range(eval_start, n):
            train = vals[:cut]
            fold = ProductionForecaster(
                random_state=self.random_state,
                enable_lstm=False,   # never backtest through the LSTM gate
            )
            try:
                fold.fit(train, arps_params=arps_params, asset_metadata=asset_metadata)
            except ValueError:
                continue
            remaining_months = n - cut
            fc = fold.forecast(horizon_months=min(max(remaining_months, 6), 12))

            for days in horizons_days:
                m = min(max(round(days / DAYS_PER_MONTH), 1), len(fc["points"])) - 1
                pred = fc["points"][m]["forecast"]
                actual_idx = min(cut + m, n - 1)
                actual = vals[actual_idx]
                key = f"{days}d"
                metrics_by_horizon.setdefault(key, {"true": [], "pred": []})
                metrics_by_horizon[key]["true"].append(actual)
                metrics_by_horizon[key]["pred"].append(pred)
                errors_all.append(pred - actual)
                y_true_all.append(actual)
                y_pred_all.append(pred)

        out: dict[str, dict] = {}
        for key, d in metrics_by_horizon.items():
            true_a = np.asarray(d["true"], dtype=float)
            pred_a = np.asarray(d["pred"], dtype=float)
            err = pred_a - true_a
            denom = float(np.sum((true_a - true_a.mean()) ** 2)) or 1.0
            out[key] = {
                "mae": round(float(np.mean(np.abs(err))), 2),
                "rmse": round(float(np.sqrt(np.mean(err**2))), 2),
                "r2": round(float(1 - np.sum(err**2) / denom), 3),
                "mape": round(PerformanceMetrics.mape(true_a, pred_a), 2),
                "folds": len(true_a),
            }
        if errors_all:
            true_a = np.asarray(y_true_all, dtype=float)
            pred_a = np.asarray(y_pred_all, dtype=float)
            denom = float(np.sum((true_a - true_a.mean()) ** 2)) or 1.0
            out["overall"] = {
                "mae": round(float(np.mean(np.abs(pred_a - true_a))), 2),
                "rmse": round(float(np.sqrt(np.mean((pred_a - true_a) ** 2))), 2),
                "r2": round(float(1 - float(np.sum((pred_a - true_a) ** 2)) / denom), 3),
                "mape": round(PerformanceMetrics.mape(true_a, pred_a), 2),
                "folds": int(len(errors_all)),
            }
        return out

    # ---------------------------------------------------- feature importance
    def feature_importance(self) -> list[dict]:
        if not self._fitted:
            return []
        try:
            importances = self.model.feature_importances_
        except AttributeError:
            return []
        ranked = sorted(zip(self.feature_names, importances), key=lambda kv: -kv[1])[:8]
        return [
            {
                "feature": name,
                "label": FEATURE_LABELS.get(name, name),
                "importance": round(float(v), 4),
            }
            for name, v in ranked
        ]
