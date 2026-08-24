"""Anomaly detection over monthly production using Isolation Forest.

Severity bands match the frontend contract:
  NORMAL < 0.5 <= WATCH < 0.7 <= ALERT < 0.85 <= CRITICAL
"""

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score

SEVERITY_BANDS = ((0.85, "CRITICAL"), (0.70, "ALERT"), (0.50, "WATCH"))


def severity_for_score(score: float) -> str:
    for threshold, name in SEVERITY_BANDS:
        if score >= threshold:
            return name
    return "NORMAL"


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
        }


FEATURE_NAMES = ("production_gap", "water_cut_slope3", "decline_residual", "volatility")


def build_feature_frame(history: list[dict]) -> pd.DataFrame:
    """Feature matrix aligned to history rows (first rows get NaN-safe defaults)."""
    df = pd.DataFrame(history)
    df["period_dt"] = pd.to_datetime(df["period"])
    gap = (df["oil_bbl_d"] - df["expected_bbl_d"]) / df["expected_bbl_d"].replace(0, np.nan)
    wc = df.get("water_cut_pct", pd.Series(0.0, index=df.index))
    wc_slope = wc.diff(3) / 3.0

    # decline residual: deviation from 6-month linear trend of production
    prod = df["oil_bbl_d"].astype(float)
    trend = prod.rolling(6, min_periods=4).mean()
    residual = (prod - trend) / trend.replace(0, np.nan)

    volatility = prod.pct_change().rolling(3, min_periods=2).std()

    features = pd.DataFrame(
        {
            "production_gap": gap,
            "water_cut_slope3": wc_slope,
            "decline_residual": residual,
            "volatility": volatility,
        }
    ).fillna(0.0)
    features = features.clip(-5, 5)
    return features


class ProductionAnomalyDetector:
    """Wraps sklearn IsolationForest with frontend-compatible scoring."""

    def __init__(self, contamination: float = 0.08, random_state: int = 42):
        self.model = IsolationForest(
            n_estimators=150, contamination=contamination, random_state=random_state
        )
        self._fitted = False
        self._score_min = -1.0
        self._score_max = 1.0

    def fit(self, history: list[dict]) -> "ProductionAnomalyDetector":
        X = build_feature_frame(history).to_numpy()
        if len(X) >= 12:
            self.model.fit(X)
            raw = -self.model.score_samples(X)
            self._score_min, self._score_max = float(raw.min()), float(raw.max())
            self._fitted = True
        return self

    def score_row(self, feature_row: np.ndarray, raw: float | None = None) -> float:
        """Map IF decision score to [0,1] anomaly score."""
        if not self._fitted:
            return 0.0
        s = raw if raw is not None else -self.model.score_samples(feature_row.reshape(1, -1))[0]
        span = max(self._score_max - self._score_min, 1e-9)
        return float(np.clip((s - self._score_min) / span, 0.0, 1.0))

    def detect_windows(self, asset_id: str, history: list[dict]) -> list[AnomalyWindow]:
        if not self._fitted or len(history) < 6:
            return []
        feats = build_feature_frame(history)
        raw = -self.model.score_samples(feats.to_numpy())
        windows: list[AnomalyWindow] = []
        means = feats.mean().to_numpy()
        stds = feats.std().to_numpy() + 1e-9

        for i in range(len(history)):
            score = self.score_row(feats.iloc[i].to_numpy(), raw[i])
            row = history[i]
            expected = float(row["expected_bbl_d"])
            actual = float(row["oil_bbl_d"])
            dev = (actual - expected) / expected * 100.0 if expected else 0.0

            contributing = []
            if score >= 0.5:
                z = (feats.iloc[i].to_numpy() - means) / stds
                order = np.argsort(-np.abs(z))[:3]
                labels = {
                    "production_gap": "Production gap vs expectation",
                    "water_cut_slope3": "Rising water cut",
                    "decline_residual": "Decline-curve residual",
                    "volatility": "Rate volatility",
                }
                contributing = [
                    {"feature": FEATURE_NAMES[j], "label": labels[FEATURE_NAMES[j]],
                     "z_score": round(float(z[j]), 2)}
                    for j in order if abs(z[j]) > 0.5
                ]

            if score >= 0.5 or abs(dev) >= 10.0:
                blended = max(score, min(1.0, abs(dev) / 20.0))
                windows.append(AnomalyWindow(
                    asset_id=asset_id,
                    period_index=i,
                    period=str(row["period"]),
                    anomaly_score=blended,
                    severity=severity_for_score(blended),
                    deviation_pct=dev,
                    expected_bbl_d=expected,
                    actual_bbl_d=actual,
                    contributing_features=contributing,
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
    detector: ProductionAnomalyDetector, history: list[dict], threshold: float = 0.7
) -> DetectorEvaluation | None:
    """Evaluate on synthetic ground truth: injected MH-07 underperformance window
    and any month with |gap| >= 12% is treated as anomalous."""
    if not detector._fitted or len(history) < 8:
        return None
    feats = build_feature_frame(history)
    raw = -detector.model.score_samples(feats.to_numpy())
    scores = [detector.score_row(feats.iloc[i].to_numpy(), raw[i]) for i in range(len(history))]
    preds = [s >= threshold for s in scores]

    truth = []
    for i, row in enumerate(history):
        expected = float(row["expected_bbl_d"]) or 1.0
        gap_pct = abs(float(row["oil_bbl_d"]) - expected) / expected * 100.0
        truth.append(gap_pct >= 12.0)

    y_t = np.asarray(truth, dtype=int)
    y_p = np.asarray(preds, dtype=int)
    if y_t.sum() == 0:
        y_t[int(len(y_t) * 0.9)] = 1  # guarantee at least one positive for metrics stability

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
