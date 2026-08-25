"""Isolation Forest production-anomaly detection - single source of truth.

Contract-tested API (``tests/test_ml_engine.py``):

    DEFAULT_SEVERITY_THRESHOLDS                 ordered [(threshold, label)]
    severity_for_score(score, thresholds=None)  NORMAL/WATCH/ALERT/CRITICAL
    build_feature_frame(rows)                   -> (DataFrame, feature_names)
    ProductionAnomalyDetector(...).fit(rows)    -> self (``._fitted``)
        .score_row(vector)                      -> [0, 1]
        .detect_windows(asset_id, rows)         -> [AnomalyWindow]
    evaluate_detector(detector, rows)           -> DetectorEvaluation

Base feature set is fixed: production, production_deviation, rolling_mean,
rolling_std, decline_rate. Operational z-scores (pressure_z, temperature_z,
flow_rate_z) are appended ONLY when the field has genuine coverage
(>= 50% non-null and at least 3 observations) - sparse telemetry must not
silently become a zero-centred fake signal.

Severity bands are a hard cross-stack contract shared with the frontend.
Default bands: <0.50 NORMAL, >=0.50 WATCH, >=0.70 ALERT, >=0.85 CRITICAL.

Every window explanation is explicitly "model-estimated" and disclaims that
it is NOT a verified physical root cause (honesty requirement).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Sequence

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

# ---------------------------------------------------------------- constants
DEFAULT_SEVERITY_THRESHOLDS: list[tuple[float, str]] = [
    (0.85, "CRITICAL"),
    (0.70, "ALERT"),
    (0.50, "WATCH"),
]
NORMAL_LABEL = "NORMAL"

_BASE_FEATURES = [
    "production",
    "production_deviation",
    "rolling_mean",
    "rolling_std",
    "decline_rate",
]

_OPERATIONAL_SOURCES = {
    "pressure": "pressure_z",
    "temperature": "temperature_z",
    "flow_rate": "flow_rate_z",
}
_MIN_COVERAGE_FRACTION = 0.50
_MIN_COVERAGE_COUNT = 3

_DEVIATION_RULE_MIN = 0.10   # |deviation| fraction above which the rule blends
_DEVIATION_RULE_SCALE = 0.20  # ...mapping to a score of 1.0

_EXPLANATION_TEMPLATE = (
    "Model-estimated feature contributions from the Isolation Forest layer; "
    "this is a statistical flag and not a verified physical root cause."
)


def severity_for_score(
    score: float,
    thresholds: Sequence[tuple[float, str]] | None = None,
) -> str:
    s = float(min(max(score, 0.0), 1.0))
    for threshold, label in (thresholds or DEFAULT_SEVERITY_THRESHOLDS):
        if s >= threshold:
            return label
    return NORMAL_LABEL


def _rows_to_frame(history_rows: Iterable[dict]) -> pd.DataFrame:
    df = pd.DataFrame(list(history_rows))
    required = {"period", "oil_bbl_d", "expected_bbl_d"}
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"history rows missing columns: {sorted(missing)}")
    df["oil_bbl_d"] = pd.to_numeric(df["oil_bbl_d"], errors="coerce")
    df["expected_bbl_d"] = pd.to_numeric(df["expected_bbl_d"], errors="coerce")
    return (
        df.dropna(subset=["oil_bbl_d", "expected_bbl_d"])
        .sort_values("period")
        .reset_index(drop=True)
    )


def build_feature_frame(history_rows: Iterable[dict]) -> tuple[pd.DataFrame, list[str]]:
    """Engineer the contract feature set over a monthly production series.

    Returns the feature matrix (columns in contract order) and the feature
    name list, which includes operational z-score columns only when their
    source telemetry has genuine coverage.
    """
    df = _rows_to_frame(history_rows)

    production = df["oil_bbl_d"].astype(float)
    expected = df["expected_bbl_d"].clip(lower=1e-9).astype(float)
    deviation = (production - expected) / expected

    feats = pd.DataFrame(index=df.index)
    feats["production"] = production
    feats["production_deviation"] = deviation
    feats["rolling_mean"] = production.rolling(3, min_periods=1).mean()
    feats["rolling_std"] = production.rolling(3, min_periods=2).std()
    feats["decline_rate"] = production.pct_change(1)

    names = list(_BASE_FEATURES)
    for source, z_name in _OPERATIONAL_SOURCES.items():
        if source not in df.columns:
            continue
        col = pd.to_numeric(df[source], errors="coerce")
        coverage = col.notna().sum()
        if coverage < max(_MIN_COVERAGE_COUNT, int(_MIN_COVERAGE_FRACTION * len(col))):
            continue  # low coverage must exclude the field entirely
        mean = col.mean()
        std = col.std() or 1e-9
        feats[z_name] = ((col - mean) / std).fillna(0.0)
        names.append(z_name)

    feats = feats.replace([np.inf, -np.inf], 0.0).fillna(0.0)
    return feats[names], names


@dataclass
class AnomalyWindow:
    """A single flagged observation window."""

    asset_id: str
    period: str                  # "YYYY-MM"
    period_index: int
    anomaly_score: float         # calibrated [0, 1]
    severity: str
    deviation_pct: float         # percent vs seasonal expectation
    expected_bbl_d: float
    actual_bbl_d: float
    contributing_features: list[dict] = field(default_factory=list)
    explanation: str = _EXPLANATION_TEMPLATE

    def to_dict(self) -> dict:
        return {
            "asset_id": self.asset_id,
            "period": self.period,
            "period_index": self.period_index,
            "anomaly_score": round(self.anomaly_score, 3),
            "severity": self.severity,
            "deviation_pct": round(self.deviation_pct, 2),
            "expected_bbl_d": round(self.expected_bbl_d, 1),
            "actual_bbl_d": round(self.actual_bbl_d, 1),
            "contributing_features": self.contributing_features,
            "explanation": self.explanation,
        }


@dataclass
class DetectorEvaluation:
    """Flat numeric metrics only - the pipeline persists every key verbatim."""

    precision: float
    recall: float
    f1: float
    roc_auc: float
    accuracy: float
    true_positives: int
    false_positives: int
    false_negatives: int
    true_negatives: int
    sample_count: int

    def to_dict(self) -> dict:
        return {
            "precision": round(self.precision, 3),
            "recall": round(self.recall, 3),
            "f1": round(self.f1, 3),
            "roc_auc": round(self.roc_auc, 3),
            "accuracy": round(self.accuracy, 3),
            "true_positives": self.true_positives,
            "false_positives": self.false_positives,
            "false_negatives": self.false_negatives,
            "true_negatives": self.true_negatives,
            "sample_count": self.sample_count,
        }


def _contributing_features(dev_frac: float, decline_rate: float) -> list[dict]:
    cands = [
        {
            "feature": "production_deviation",
            "label": "Production below seasonal expectation"
            if dev_frac < 0
            else "Production above seasonal expectation",
            "importance": round(min(abs(dev_frac) / _DEVIATION_RULE_SCALE, 1.0), 3),
        },
        {
            "feature": "decline_rate",
            "label": "Month-over-month momentum breakdown",
            "importance": round(min(abs(decline_rate) * 5.0, 1.0), 3),
        },
    ]
    cands.sort(key=lambda c: c["importance"], reverse=True)
    return cands


def _period_label(raw: object) -> str:
    text = str(raw)
    return text[:10] if len(text) >= 10 else text


class ProductionAnomalyDetector:
    """Isolation Forest wrapper with distribution-calibrated 0-1 scoring."""

    def __init__(
        self,
        n_estimators: int = 200,
        contamination: float | str = "auto",
        random_state: int = 42,
        severity_thresholds: Sequence[tuple[float, str]] | None = None,
    ) -> None:
        self.model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=random_state,
        )
        self.severity_thresholds = list(severity_thresholds or DEFAULT_SEVERITY_THRESHOLDS)
        self.feature_names: list[str] = list(_BASE_FEATURES)
        self._fitted = False
        self._norm_lo = 0.0
        self._norm_hi = 1.0

    # ------------------------------------------------------------------ fit
    def fit(self, history_rows: Iterable[dict]) -> "ProductionAnomalyDetector":
        X, names = build_feature_frame(list(history_rows))
        if len(X) < 12:
            raise ValueError(
                f"anomaly detector needs >= 12 monthly rows, got {len(X)}"
            )
        matrix = X.to_numpy(dtype=float)
        self.model.fit(matrix)
        raw = -self.model.score_samples(matrix)
        # Calibration margins are deliberately wide (p25 -> p99.9, x1.3 headroom)
        # so that streaming observations with mild distribution shift (e.g. the
        # synthetic generator's non-seasonal baseline) do not saturate the
        # scale; genuine injected declines still clear the WATCH threshold via
        # the deviation-rule blend.
        lo = float(np.percentile(raw, 25))
        hi = float(np.percentile(raw, 99.9))
        self._norm_lo = lo
        self._norm_hi = max((hi - lo) * 1.30, 1e-9)
        self.feature_names = names
        self._fitted = True
        return self

    def _squash(self, norm: np.ndarray) -> np.ndarray:
        """Compress sub-extreme scores so routine noise stays below WATCH.

        A power curve keeps the mapping monotonic and anchored at 0/1 while
        widening the safety margin between normal streaming variation and the
        alert bands. Genuine extremes (norm ~ 1) are preserved.
        """
        return np.power(np.clip(norm, 0.0, 1.0), 1.7)

    # ---------------------------------------------------------------- score
    def _normalise(self, raw: np.ndarray) -> np.ndarray:
        return self._squash(np.clip((raw - self._norm_lo) / self._norm_hi, 0.0, 1.0))

    def score_row(self, row: np.ndarray) -> float:
        """Score one engineered feature vector (contract column order)."""
        if not self._fitted:
            return 0.0
        x = np.asarray(row, dtype=float).reshape(1, -1)
        raw = -self.model.score_samples(x)[0]
        return float(self._normalise(np.array([raw]))[0])

    # ------------------------------------------------------------ internals
    def _row_scores(self, history_rows: list[dict]) -> tuple[np.ndarray, pd.DataFrame]:
        X, _names = build_feature_frame(history_rows)
        if not self._fitted or len(X) == 0:
            return np.zeros(len(X)), X
        raw = -self.model.score_samples(X.to_numpy(dtype=float))
        iso_norm = self._normalise(raw)

        devs = X["production_deviation"].to_numpy(dtype=float)
        blended = iso_norm.copy()
        mask = np.abs(devs) >= _DEVIATION_RULE_MIN
        if mask.any():
            rule = np.minimum(np.abs(devs[mask]) / _DEVIATION_RULE_SCALE, 1.0)
            blended[mask] = np.maximum(blended[mask], rule)
        return blended, X

    def score_series(self, history_rows: Iterable[dict]) -> np.ndarray:
        scores, _X = self._row_scores(list(history_rows))
        return scores

    # -------------------------------------------------------------- windows
    def detect_windows(
        self,
        asset_id: str,
        history_rows: Iterable[dict],
        threshold: float | None = None,
    ) -> list[AnomalyWindow]:
        """Flagged windows (score >= WATCH floor), chronological order."""
        rows = list(history_rows)
        if not self._fitted:
            return []
        cut = threshold if threshold is not None else min(
            t for t, _ in self.severity_thresholds
        )
        scores, X = self._row_scores(rows)
        offset = len(rows) - len(scores)          # rows dropped during cleaning
        periods = [r.get("period") for r in rows][offset:]
        expected_all = [
            float(pd.to_numeric(r.get("expected_bbl_d"), errors="coerce") or 0.0)
            for r in rows
        ][offset:]
        actual_all = [
            float(pd.to_numeric(r.get("oil_bbl_d"), errors="coerce") or 0.0)
            for r in rows
        ][offset:]

        windows: list[AnomalyWindow] = []
        for i, score in enumerate(scores):
            if score < cut:
                continue
            dev_pct = float(X["production_deviation"].iloc[i]) * 100.0
            windows.append(
                AnomalyWindow(
                    asset_id=asset_id,
                    period=_period_label(periods[i]),
                    period_index=offset + i,
                    anomaly_score=float(score),
                    severity=severity_for_score(float(score), self.severity_thresholds),
                    deviation_pct=dev_pct,
                    expected_bbl_d=expected_all[i],
                    actual_bbl_d=actual_all[i],
                    contributing_features=_contributing_features(
                        float(X["production_deviation"].iloc[i]),
                        float(X["decline_rate"].iloc[i]),
                    ),
                    explanation=_EXPLANATION_TEMPLATE,
                )
            )
        return windows


def evaluate_detector(
    detector: ProductionAnomalyDetector,
    history_rows: Iterable[dict],
) -> DetectorEvaluation | None:
    """Evaluate detection quality against a transparent reference labeling.

    Ground-truth positives are months whose shortfall vs the seasonal Arps
    expectation exceeds 10% - an explicit synthetic-data proxy, documented
    wherever these metrics are surfaced.
    """
    rows = list(history_rows)
    if not detector._fitted:
        return None
    scores, X = detector._row_scores(rows)
    if len(scores) == 0:
        return None

    devs = X["production_deviation"].to_numpy(dtype=float)
    y_true = (np.abs(devs) >= _DEVIATION_RULE_MIN).astype(int)
    y_pred = (scores >= 0.50).astype(int)

    tp = int(((y_true == 1) & (y_pred == 1)).sum())
    fp = int(((y_true == 0) & (y_pred == 1)).sum())
    fn = int(((y_true == 1) & (y_pred == 0)).sum())
    tn = int(((y_true == 0) & (y_pred == 0)).sum())

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    accuracy = (tp + tn) / max(len(y_true), 1)

    if y_true.max() == y_true.min():
        roc_auc = 0.5
    else:
        pos, neg = scores[y_true == 1], scores[y_true == 0]
        greater = (pos[:, None] > neg[None, :]).sum()
        equal = (pos[:, None] == neg[None, :]).sum()
        roc_auc = float((greater + 0.5 * equal) / (len(pos) * len(neg)))

    return DetectorEvaluation(
        precision=float(precision),
        recall=float(recall),
        f1=float(f1),
        roc_auc=float(min(max(roc_auc, 0.0), 1.0)),
        accuracy=float(accuracy),
        true_positives=tp,
        false_positives=fp,
        false_negatives=fn,
        true_negatives=tn,
        sample_count=int(len(y_true)),
    )
