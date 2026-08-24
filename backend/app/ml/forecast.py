"""Production forecasting: gradient-boosted regressor with lag/calendar features,
recursive multi-step rollout, confidence bands, backtest metrics and Arps blend.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.ml.arps import arps_rate


def build_supervised(series: pd.Series) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Lag + calendar feature matrix from a monthly series (index = month number)."""
    df = pd.DataFrame({"value": series.values})
    df["month_idx"] = np.arange(len(df))
    for lag in (1, 2, 3, 6, 12):
        df[f"lag_{lag}"] = df["value"].shift(lag)
    df["roll3_mean"] = df["value"].shift(1).rolling(3).mean()
    df["roll6_mean"] = df["value"].shift(1).rolling(6).mean()
    df["pct_change_1"] = df["value"].pct_change(1)
    df["sin12"] = np.sin(2 * np.pi * (df["month_idx"] % 12) / 12.0)
    df["cos12"] = np.cos(2 * np.pi * (df["month_idx"] % 12) / 12.0)
    df = df.dropna()
    features = [c for c in df.columns if c not in ("value", "month_idx")]
    return df[features].to_numpy(), df["value"].to_numpy(), features


class ProductionForecaster:
    model_name = "GradientBoosting+ArpsHybrid"

    def __init__(self, random_state: int = 42):
        self.model = GradientBoostingRegressor(
            n_estimators=300, learning_rate=0.05, max_depth=3,
            subsample=0.9, random_state=random_state,
        )
        self.feature_names: list[str] = []
        self.residual_std = 0.0
        self._fitted = False
        self.history_: list[float] = []
        self.start_month_index = 0

    def fit(self, values: list[float]) -> "ProductionForecaster":
        s = pd.Series(values, dtype=float)
        X, y, names = build_supervised(s)
        if len(X) < 8:
            raise ValueError("insufficient history for supervised forecasting")
        self.model.fit(X, y)
        self.feature_names = names
        preds = self.model.predict(X)
        self.residual_std = float(np.std(y - preds))
        self._fitted = True
        self.history_ = [float(v) for v in values]
        self.start_month_index = 0
        return self

    # ------------------------------------------------------------------ predict
    def _feature_vector(self, hist: list[float], month_idx: int) -> np.ndarray:
        v = hist[-1]
        lags = {lag: hist[-lag] if len(hist) >= lag else hist[0] for lag in (1, 2, 3, 6, 12)}
        roll3 = float(np.mean(hist[-3:]))
        roll6 = float(np.mean(hist[-6:]))
        pct1 = (hist[-1] - hist[-2]) / max(abs(hist[-2]), 1e-9) if len(hist) >= 2 else 0.0
        row = [
            lags[1], lags[2], lags[3], lags[6], lags[12],
            roll3, roll6, pct1,
            np.sin(2 * np.pi * (month_idx % 12) / 12.0),
            np.cos(2 * np.pi * (month_idx % 12) / 12.0),
        ]
        _ = v
        return np.asarray(row, dtype=float)

    def forecast(
        self,
        horizon_months: int,
        arps_params: dict | None = None,
        arps_blend_weight: float = 0.35,
    ) -> dict:
        """Recursive GBM rollout blended with an Arps anchor for stability.

        Returns points with p10/p50/p90 bands plus per-horizon summaries.
        """
        if not self._fitted:
            raise RuntimeError("forecaster must be fitted before forecasting")

        hist = list(self.history_)
        base_index = len(hist)  # next month index
        points: list[dict] = []
        gbm_path: list[float] = []

        for step in range(1, horizon_months + 1):
            x = self._feature_vector(hist, base_index + step - 1)
            pred = float(self.model.predict(x.reshape(1, -1))[0])
            if arps_params:
                t_next = len(hist) - 1 + 1.0
                anchor = arps_rate(
                    arps_params["qi"], arps_params["di"], arps_params["b"], t_next
                )
                w = arps_blend_weight * min(step / max(horizon_months / 2, 1), 1.5)
                pred = (1 - min(w, 0.7)) * pred + min(w, 0.7) * anchor
            pred = max(pred, 1e-2)
            hist.append(pred)
            gbm_path.append(pred)

        spread = self.residual_std * (1.0 + 0.15 * np.sqrt(np.arange(1, horizon_months + 1)))
        for step, value in enumerate(gbm_path):
            sp = float(spread[step])
            points.append({
                "step": step + 1,
                "forecast": round(value, 1),
                "lower": round(max(value - 1.28 * sp, 0.0), 1),
                "upper": round(value + 1.28 * sp, 1),
                "band_p10": round(max(value - 1.28 * sp, 0.0), 1),
                "band_p50": round(value, 1),
                "band_p90": round(value + 1.28 * sp, 1),
            })

        def at(days: int) -> float:
            m = min(max(round(days / 30.44), 1), horizon_months) - 1
            return gbm_path[m]

        return {
            "model_name": self.model_name,
            "horizon_months": horizon_months,
            "points": points,
            "summary": {
                "forecast_30d": round(at(30), 1),
                "forecast_90d": round(at(90), 1),
                "forecast_180d": round(at(180), 1),
                "residual_std": round(self.residual_std, 3),
            },
            "arps_anchor_used": bool(arps_params),
        }

    # ----------------------------------------------------------------- evaluate
    def backtest(self, values: list[float], horizons_days=(30, 90, 180)) -> dict:
        """Rolling-origin evaluation over the last third of the series."""
        vals = list(values)
        n = len(vals)
        eval_start = max(14, int(n * 0.66))
        metrics_by_horizon: dict[str, dict] = {}
        errors_all: list[float] = []
        y_true_all: list[float] = []
        y_pred_all: list[float] = []

        for cut in range(eval_start, n):
            train = vals[:cut]
            try:
                fold_model = ProductionForecaster(random_state=42).fit(train)
            except ValueError:
                continue
            remaining_months = n - cut
            fc = fold_model.forecast(min(max(remaining_months, 6), 12))
            for days in horizons_days:
                m = min(max(round(days / 30.44), 1), len(fc["points"])) - 1
                pred = fc["points"][m]["forecast"]
                actual_idx = min(cut + m, n - 1)
                actual = vals[actual_idx]
                key = f"{days}d"
                metrics_by_horizon.setdefault(key, {"err": [], "true": [], "pred": []})
                metrics_by_horizon[key]["err"].append(pred - actual)
                metrics_by_horizon[key]["true"].append(actual)
                metrics_by_horizon[key]["pred"].append(pred)
                errors_all.append(pred - actual)
                y_true_all.append(actual)
                y_pred_all.append(pred)

        out: dict[str, dict] = {}
        for key, d in metrics_by_horizon.items():
            err = np.asarray(d["err"])
            true = np.asarray(d["true"])
            pred = np.asarray(d["pred"])
            denom = float(np.sum((true - true.mean()) ** 2)) or 1.0
            out[key] = {
                "mae": round(float(np.mean(np.abs(err))), 2),
                "rmse": round(float(np.sqrt(np.mean(err**2))), 2),
                "r2": round(float(1 - np.sum((pred - true) ** 2) / denom), 3),
                "mape": round(float(np.mean(np.abs(err / np.maximum(true, 1.0))) * 100), 2),
            }
        if errors_all:
            err = np.asarray(errors_all)
            true = np.asarray(y_true_all)
            pred = np.asarray(y_pred_all)
            denom = float(np.sum((true - true.mean()) ** 2)) or 1.0
            out["overall"] = {
                "mae": round(float(mean_absolute_error(true, pred)), 2),
                "rmse": round(float(np.sqrt(mean_squared_error(true, pred))), 2),
                "r2": round(float(r2_score(true, pred)), 3),
                "mape": round(float(np.mean(np.abs(err / np.maximum(true, 1.0))) * 100), 2),
                "folds": int(len(errors_all)),
            }
        return out

    def feature_importance(self) -> list[dict]:
        if not self._fitted:
            return []
        imp = self.model.feature_importances_
        labels = {
            "lag_1": "Previous month production",
            "lag_2": "Production two months ago",
            "lag_3": "Quarter-lag production",
            "lag_6": "Half-year-lag production",
            "lag_12": "Year-lag production",
            "roll3_mean": "3-month rolling average",
            "roll6_mean": "6-month rolling average",
            "pct_change_1": "Month-over-month change",
            "sin12": "Seasonal cycle (sin)",
            "cos12": "Seasonal cycle (cos)",
        }
        ranked = sorted(zip(self.feature_names, imp), key=lambda kv: -kv[1])[:6]
        return [
            {"feature": name, "label": labels.get(name, name), "importance": round(float(v), 4)}
            for name, v in ranked
        ]
