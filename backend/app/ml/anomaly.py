"""Model 3 - Isolation Forest anomaly detection over production history.

Feature contract (per the platform spec):
    production, production_deviation, rolling_mean, rolling_std, decline_rate

Operational signals (pressure / temperature / flow rate) are appended ONLY
when they genuinely exist in the input rows with sufficient coverage - e.g.
synthetic simulation telemetry. They are never fabricated here.

Severity bands (configurable per detector instance):
    NORMAL < threshold(WATCH)=0.50 <= WATCH < ALERT=0.70 <= ALERT < CRITICAL=0.85

Language policy: outputs are statistical flags from a learned model. They are
"model-estimated unusual patterns", NEVER physical root causes.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score

# Default severity ladder - override via ProductionAnomalyDetector(
#   severity_thresholds=[...]) for configurable bands.
DEFAULT_SEVERITY_THRESHOLDS: tuple[tuple[float, str], ...] = (
    (0.85, "CRITICAL"),
    (0.70, "ALERT"),
    (0.50, "WATCH"),
)

OPERATIONAL_FIELDS = ("pressure", "temperature", "flow_rate")
MIN_OPERATIONAL_COVERAGE = 0.60  # fraction of rows required to use a field


def severity_for_score(
    score: float,
    thresholds: tuple[tuple[float, str], ...] | list[tuple[float, str]] | None = None,
) -> str:
    """Map an anomaly score to the configured NORMAL/WATCH/ALERT/CRITICAL band."""
    bands = tuple(thresholds) if thresholds is not None else DEFAULT_SEVERITY_THRESHOLDS
    for threshold, name in sorted(bands, key=lambda b: -b[0]):
        if score >= threshold:
            return name
    return "NORMAL"


def _field(row: dict, *names: str, default=None):
    for name in names:
        if name in row and row[name] is not None:
            return row[name]
    return default


def build_feature_frame(history: list[dict]) -> tuple[pd.DataFrame, list[str]]:
    """Assemble the anomaly feature matrix aligned to history rows.

    Accepts either canonical telemetry rows (production/timestamp/...) or the
    legacy analysis dicts (period/oil_bbl_d/expected_bbl_d/...). Returns the
    frame plus the ordered feature-name list actually used.
    """
    prod = np.asarray(
        [float(_field(r, "production", "oil_bbl_d", default=0.0)) for r in history],
        dtype=float,
    )
    s = pd.Series(prod)

    # Expectation: explicit expected values when provided, otherwise a trailing
    # mean excluding the current point (so deviation is never trivially zero).
    explicit_expected = [
        _field(r, "expected_bbl_d", "expected") for r in history
    ]
    if all(v is not None for v in explicit_expected) and len(explicit_expected) == len(prod):
        expected = np.asarray([float(v) for v in explicit_expected])
    else:
        expected = s.shift(1).rolling(3, min_periods=1).mean().fillna(s.iloc[0]).to_numpy()

    deviation = (s - expected) / np.where(np.abs(expected) > 1e-9, expected, np.nan)
    rolling_mean = s.rolling(3, min_periods=1).mean()
    rolling_std = s.rolling(3, min_periods=1).std(ddof=0).fillna(0.0)
    decline_rate = (-s.pct_change(fill_method=None)).fillna(0.0)

    features = pd.DataFrame({
        "production": s,
        "production_deviation": deviation,
        "rolling_mean": rolling_mean,
        "rolling_std": rolling_std,
        "decline_rate": decline_rate,
    })

    used = ["production", "production_deviation", "rolling_mean", "rolling_std", "decline_rate"]

    # Operational fields only when genuinely present and well covered.
    for col in OPERATIONAL_FIELDS:
        vals = pd.Series([
            float(v) if (v := _field(r, col)) is not None else np.nan for r in history
        ])
        coverage = float(vals.notna().mean()) if len(vals) else 0.0
        if coverage >= MIN_OPERATIONAL_COVERAGE and len(vals) >= 10:
            mu, sd = float(vals.mean()), float(vals.std(ddof=0))
            z = (vals - mu) / (sd if sd > 1e-9 else 1.0)
            features[f"{col}_z"] = z
            used.append(f"{col}_z")

    return features.fillna(0.0).clip(-5.0, 5.0), used


FEATURE_LABELS = {
    "production": "Production level",
    "production_deviation": "Production deviation vs expectation",
    "rolling_mean": "Rolling average shift",
    "rolling_std": "Rate volatility",
    "decline_rate": "Decline-rate anomaly",
    "pressure_z": "Unusual pressure regime",
    "temperature_z": "Unusual temperature regime",
    "flow_rate_z": "Unusual flow-rate regime",
}


@dataclass
class AnomalyWindow:
    asset_id: str
    period_index: int
    period: str
    anomaly_score: float
    severity: str
    deviation_pct: float
    expected_bbl_d: float
    actual_bbl_d: float
    contributing_features: list[dict] = field(default_factory=list)
    explanation: str = ""

    def to_dict(self) -> dict:
        return {
            "asset_id": self.asset_id,
            "period": self.period,
            "anomaly_score": round(self.anomaly_score, 3),
            "severity": self.severity,
            "deviation_pct": round(self.deviation_pct, 2),
            "expected_bbl_d": round(self.expected_bbl_d, 1),
            "actual_bbl_d": round(self.actual_bbl_d, 1),
            "contributing_features": self.contributing_features,
            "explanation": self.explanation,
        }


class ProductionAnomalyDetector:
    """Isolation Forest wrapper producing frontend-compatible scores."""

    def __init__(
        self,
        contamination: float = 0.08,
        random_state: int = 42,
        severity_thresholds: list[tuple[float, str]] | tuple[tuple[float, str], ...] | None = None,
        include_operational: bool = True,
    ):
        self.model = IsolationForest(
            n_estimators=150, contamination=contamination, random_state=random_state
        )
        self.severity_thresholds = tuple(severity_thresholds) if severity_thresholds else None
        self.include_operational = include_operational
        self._fitted = False
        self._score_min = -1.0
        self._score_max = 1.0
        self.feature_names_: list[str] = []

    def fit(self, history: list[dict]) -> "ProductionAnomalyDetector":
        feats, names = build_feature_frame(history)
        if not self.include_operational:
            feats = feats[[c for c in feats.columns if not c.endswith("_z")]]
            names = [n for n in names if n in feats.columns]
        self.feature_names_ = list(feats.columns)
        X = feats.to_numpy()
        if len(X) >= 12:
            self.model.fit(X)
            raw = -self.model.score_samples(X)
            self._score_min, self._score_max = float(raw.min()), float(raw.max())
            self._fitted = True
        return self

    def score_row(self, feature_row_values: np.ndarray, raw: float | None = None) -> float:
        """Map IF decision score to [0,1]."""
        if not self._fitted:
            return 0.0
        s = (
            raw
            if raw is not None
            else -self.model.score_samples(feature_row_values.reshape(1, -1))[0]
        )
        span = max(self._score_max - self._score_min, 1e-9)
        return float(np.clip((s - self._score_min) / span, 0.0, 1.0))

    def detect_windows(self, asset_id: str, history: list[dict]) -> list[AnomalyWindow]:
        """Flag windows that are statistically unusual under the fitted model."""
        if not self._fitted or len(history) < 6:
            return []
        feats, _ = build_feature_frame(history)
        feats = feats[self.feature_names_]
        raw = -self.model.score_samples(feats.to_numpy())
        windows: list[AnomalyWindow] = []
        means = feats.mean().to_numpy()
        stds = feats.std().to_numpy() + 1e-9

        for i in range(len(history)):
            score = self.score_row(feats.iloc[i].to_numpy(), raw[i])
            row = history[i]
            expected = float(
                _field(row, "expected_bbl_d", "expected", default=0.0)
            )
            actual = float(_field(row, "production", "oil_bbl_d", default=0.0))
            dev = (actual - expected) / expected * 100.0 if expected else 0.0

            contributing = []
            if score >= 0.5:
                z = (feats.iloc[i].to_numpy() - means) / stds
                order = np.argsort(-np.abs(z))[:3]
                contributing = [
                    {
                        "feature": self.feature_names_[j],
                        "label": FEATURE_LABELS.get(self.feature_names_[j], self.feature_names_[j]),
                        "z_score": round(float(z[j]), 2),
                    }
                    for j in order if abs(z[j]) > 0.5
                ]

            if score >= 0.5 or abs(dev) >= 10.0:
                blended = max(score, min(1.0, abs(dev) / 20.0))
                driver = (
                    f"primarily {contributing[0]['label'].lower()}"
                    if contributing else "without a single dominant feature"
                )
                windows.append(AnomalyWindow(
                    asset_id=asset_id,
                    period_index=i,
                    period=str(_field(row, "period", "timestamp", default=f"idx-{i}")),
                    anomaly_score=blended,
                    severity=severity_for_score(blended, self.severity_thresholds),
                    deviation_pct=dev,
                    expected_bbl_d=expected,
                    actual_bbl_d=actual,
                    contributing_features=contributing,
                    explanation=(
                        f"Model-estimated unusual pattern {driver}; statistical flag "
                        "only - NOT a verified physical root cause."
                    ),
                ))
        return windows


@dataclass
class DetectorEvaluation:
    precision: float
    recall: float
    f1: float
    false_positive_rate: float
    roc_auc: float

    def to_dict(self) -> dict:
        return {
            "precision": round(self.precision, 3),
            "recall": round(self.recall, 3),
            "f1": round(self.f1, 3),
            "false_positive_rate": round(self.false_positive_rate, 3),
            "roc_auc": round(self.roc_auc, 3),
        }


def evaluate_detector(
    detector: ProductionAnomalyDetector,
    history: list[dict],
    threshold: float = 0.7,
) -> DetectorEvaluation | None:
    """Evaluate on synthetic ground truth: any month whose deviation from
    expectation is >= 12% is treated as anomalous (injected-window aware)."""
    if not detector._fitted or len(history) < 8:
        return None
    feats, _ = build_feature_frame(history)
    feats = feats[detector.feature_names_]
    raw = -detector.model.score_samples(feats.to_numpy())
    scores = [detector.score_row(feats.iloc[i].to_numpy(), raw[i]) for i in range(len(history))]
    preds = [s >= threshold for s in scores]

    truth = []
    for i, row in enumerate(history):
        expected = float(_field(row, "expected_bbl_d", "expected", default=0.0)) or 1.0
        actual = float(_field(row, "production", "oil_bbl_d", default=0.0))
        gap_pct = abs(actual - expected) / expected * 100.0
        truth.append(gap_pct >= 12.0)

    y_t = np.asarray(truth, dtype=int)
    y_p = np.asarray(preds, dtype=int)
    if y_t.sum() == 0:
        y_t[int(len(y_t) * 0.9)] = 1  # guarantee at least one positive for metric stability

    fp = int(((y_p == 1) & (y_t == 0)).sum())
    tn = int(((y_p == 0) & (y_t == 0)).sum())
    try:
        auc = float(roc_auc_score(y_t, scores))
    except ValueError:
        auc = 0.5
    return DetectorEvaluation(
        precision=float(precision_score(y_t, y_p, zero_division=0)),
        recall=float(recall_score(y_t, y_p, zero_division=0)),
        f1=float(f1_score(y_t, y_p, zero_division=0)),
        false_positive_rate=fp / (fp + tn) if (fp + tn) else 0.0,
        roc_auc=auc,
    )
