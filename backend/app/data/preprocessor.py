"""PetroPulse AI preprocessing pipeline.

Deterministic, time-series-safe cleaning and feature engineering over the
canonical standard schema (asset_id, timestamp, production, source,
source_type + optional operational fields):

    duplicate removal -> timestamp normalisation -> missing-value handling
    -> unit validation -> outlier detection -> chronological sorting
    -> production positivity validation -> asset-level grouping
    -> monthly aggregation (optional) -> feature generation

Time-series rules
-----------------
- Rows are NEVER shuffled. Train/test splitting is strictly chronological,
  per asset, preserving temporal order.
- Operational values are never invented here for REAL data. Interpolation is
  only permitted for SYNTHETIC/DERIVED frames when explicitly enabled.

Canonical units: production=bbl/d, pressure=bar, temperature=degC,
flow_rate=bbl/d. Datasets published in other units must declare conversions;
implausible magnitudes are treated as unit/corruption errors and rejected.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping

import numpy as np
import pandas as pd

from app.utils.logger import logger

STANDARD_COLUMNS = (
    "asset_id", "timestamp", "production", "source", "source_type",
    "pressure", "temperature", "flow_rate", "valve_status",
)

# Physically plausible ranges in CANONICAL units. Values outside these bounds
# almost certainly indicate a unit mismatch or corrupted record.
UNIT_BOUNDS: dict[str, tuple[float, float]] = {
    "production": (0.0, 2_000_000.0),   # bbl/d
    "pressure": (0.0, 1500.0),          # bar
    "temperature": (-50.0, 300.0),      # degC
    "flow_rate": (0.0, 5_000_000.0),    # bbl/d
}

FEATURE_COLUMNS = (
    "production_lag_1",
    "production_lag_3",
    "production_lag_6",
    "rolling_mean",
    "rolling_std",
    "decline_rate",
    "trend_slope",
    "seasonal_factor",
    "production_deviation",
)


@dataclass
class PreprocessConfig:
    remove_duplicates: bool = True
    duplicate_keep: str = "last"          # 'first' or 'last' wins per (asset, timestamp)
    remove_outliers: bool = True          # statistical outliers on production
    outlier_method: str = "mad_z"         # 'mad_z' or 'iqr'
    outlier_threshold: float = 3.5        # MAD z-score threshold
    iqr_k: float = 3.0                    # IQR multiplier when method='iqr'
    enforce_positive_production: bool = True
    aggregate_monthly: bool = False       # collapse sub-monthly data to monthly means
    impute_optional_fields: bool = False  # only ever applied to NON-REAL frames
    rolling_window: int = 3
    trend_window: int = 6
    # column -> (declared source unit label, multiplier to canonical unit)
    unit_conversions: Mapping[str, tuple[str, float]] = field(default_factory=dict)


@dataclass
class PreprocessResult:
    frame: pd.DataFrame
    report: dict[str, Any]
    issues: list[str] = field(default_factory=list)


def _iso(ts: pd.Timestamp | None) -> str | None:
    if ts is None or pd.isna(ts):
        return None
    return pd.Timestamp(ts).isoformat()


class DataPreprocessor:
    """Configurable cleaning + feature pipeline for production telemetry."""

    def __init__(self, config: PreprocessConfig | None = None):
        self.config = config or PreprocessConfig()

    # ------------------------------------------------------------- steps
    def normalize_timestamps(self, df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()
        out["timestamp"] = pd.to_datetime(out["timestamp"], errors="coerce", utc=True)
        return out

    def drop_missing_required(self, df: pd.DataFrame, report: dict) -> pd.DataFrame:
        before = len(df)
        mask = (
            df["asset_id"].notna()
            & (df["asset_id"].astype(str).str.strip() != "")
            & df["timestamp"].notna()
            & df["production"].notna()
        )
        out = df[mask].copy()
        report["missing_required_dropped"] = before - len(out)
        return out

    def apply_unit_conversions(self, df: pd.DataFrame, report: dict) -> pd.DataFrame:
        out = df.copy()
        applied = {}
        for col, spec in self.config.unit_conversions.items():
            if col not in out.columns:
                continue
            _, factor = spec
            out[col] = pd.to_numeric(out[col], errors="coerce") * float(factor)
            applied[col] = {"multiplier": float(factor)}
        if applied:
            report["unit_conversions_applied"] = applied
        return out

    def validate_units(self, df: pd.DataFrame, report: dict, issues: list[str]) -> pd.DataFrame:
        out = df.copy()
        violations = pd.Series(False, index=out.index)
        for col, (lo, hi) in UNIT_BOUNDS.items():
            if col not in out.columns:
                continue
            vals = pd.to_numeric(out[col], errors="coerce")
            bad = vals.notna() & ((vals < lo) | (vals > hi))
            if bad.any():
                issues.append(
                    f"{col}: {int(bad.sum())} value(s) outside plausible range "
                    f"[{lo}, {hi}] - possible unit mismatch"
                )
                violations |= bad
        report["unit_validation_failures"] = int(violations.sum())
        return out[~violations]

    def validate_positivity(self, df: pd.DataFrame, report: dict) -> pd.DataFrame:
        out = df.copy()
        prod = pd.to_numeric(out["production"], errors="coerce")
        if self.config.enforce_positive_production:
            bad = prod.isna() | (prod < 0)
            report["negative_or_null_production_dropped"] = int(bad.sum())
            return out[~bad]
        out["production"] = prod.clip(lower=0.0)
        return out

    def remove_duplicates(self, df: pd.DataFrame, report: dict) -> pd.DataFrame:
        if not self.config.remove_duplicates:
            report["duplicates_removed"] = 0
            return df
        out = df.copy()
        out["_ord"] = np.arange(len(out))
        out = out.sort_values(["asset_id", "timestamp", "_ord"], kind="mergesort")
        keep = self.config.duplicate_keep
        deduped = out.drop_duplicates(subset=["asset_id", "timestamp"], keep=keep)
        report["duplicates_removed"] = len(out) - len(deduped)
        return deduped.drop(columns="_ord")

    def sort_chronologically(self, df: pd.DataFrame) -> pd.DataFrame:
        return df.sort_values(["asset_id", "timestamp"], kind="mergesort").reset_index(drop=True)

    def detect_outliers(self, group: pd.DataFrame) -> pd.Series:
        """Per-asset robust outlier flags on production."""
        x = group["production"].astype(float)
        if self.config.outlier_method == "iqr":
            q1, q3 = x.quantile(0.25), x.quantile(0.75)
            iqr = q3 - q1
            lo, hi = q1 - self.config.iqr_k * iqr, q3 + self.config.iqr_k * iqr
            return (x < lo) | (x > hi)
        med = float(x.median())
        mad = float((x - med).abs().median())
        if mad > 0:
            z = 0.6745 * (x - med).abs() / mad
            return z > self.config.outlier_threshold
        if x.nunique() > 1:  # zero MAD with variance: fall back to mean/std
            std = float(x.std(ddof=0))
            if std > 0:
                z = (x - x.mean()).abs() / std
                return z > self.config.outlier_threshold
        return pd.Series(False, index=x.index)

    def _production_outlier_mask(self, df: pd.DataFrame) -> pd.Series:
        """Vectorised per-asset robust outlier flags on production."""
        x = df["production"].astype(float)
        grp = df.groupby("asset_id")["production"]
        if self.config.outlier_method == "iqr":
            q1 = grp.transform(lambda s: s.quantile(0.25))
            q3 = grp.transform(lambda s: s.quantile(0.75))
            spread = q3 - q1
            lo = q1 - self.config.iqr_k * spread
            hi = q3 + self.config.iqr_k * spread
            return (x < lo) | (x > hi)

        med = grp.transform("median")
        deviation = (x - med).abs()
        mad = deviation.groupby(df["asset_id"]).transform("median")

        # MAD z-score where MAD is usable; fall back to std z-score for
        # degenerate constant-MAD groups (e.g. mostly-constant production).
        z_mad = 0.6745 * deviation / mad.replace(0, np.nan)
        mean0 = grp.transform("mean")
        std0 = grp.transform(lambda s: s.std(ddof=0))
        n_unique = grp.transform("nunique")
        z_std = deviation / std0.replace(0, np.nan)
        z = z_mad.where(
            mad > 0,
            pd.Series(np.where((n_unique > 1) & (std0 > 0), z_std, np.nan), index=df.index),
        )
        return (z > self.config.outlier_threshold).fillna(False)

    def handle_missing_values(self, df: pd.DataFrame, report: dict) -> pd.DataFrame:
        """Report missingness; optionally interpolate ONLY synthetic/derived frames."""
        report["missingness"] = {
            col: int(df[col].isna().sum()) if col in df.columns else len(df)
            for col in STANDARD_COLUMNS
        }
        out = df.copy()
        if not self.config.impute_optional_fields:
            return out

        optional_numeric = ("pressure", "temperature", "flow_rate")
        for _asset_id, idx in out.groupby("asset_id").groups.items():
            block = out.loc[idx].sort_values("timestamp", kind="mergesort")
            stypes = set(block["source_type"].dropna().unique())
            if "REAL" in stypes:
                continue  # hard rule: never fabricate real telemetry
            for col in optional_numeric:
                if col in block.columns and block[col].notna().any():
                    series = pd.Series(block[col].to_numpy(), index=block["timestamp"])
                    series = series.interpolate(method="time", limit_direction="both")
                    block[col] = series.to_numpy()
            out.loc[idx, list(optional_numeric)] = block[list(optional_numeric)].to_numpy()
        return out.sort_values(["asset_id", "timestamp"], kind="mergesort").reset_index(drop=True)

    @staticmethod
    def aggregate_monthly(df: pd.DataFrame) -> pd.DataFrame:
        """Collapse any cadence to monthly aggregates per asset (month start UTC)."""
        if df.empty:
            return df.copy()
        work = df.copy()
        naive_month_start = (
            work["timestamp"].dt.tz_convert("UTC").dt.tz_localize(None).dt.to_period("M").dt.start_time
        )
        work["_month"] = naive_month_start.dt.tz_localize("UTC")
        numeric_optional = [
            c for c in ("pressure", "temperature", "flow_rate") if c in work.columns
        ]

        monthly = work.groupby(["asset_id", "_month"]).agg(
            production=("production", "mean"),
            sample_count=("production", "size"),
            production_min=("production", "min"),
            production_max=("production", "max"),
            **{col: (col, "mean") for col in numeric_optional},
        ).reset_index()

        if "valve_status" in work.columns:
            modes = (
                work.dropna(subset=["valve_status"])
                .groupby(["asset_id", "_month"])["valve_status"].first()
            )
            monthly = monthly.merge(
                modes.rename("valve_status"), on=["asset_id", "_month"], how="left"
            )
        for col in ("source", "source_type"):
            if col in work.columns:
                first = work.groupby(["asset_id", "_month"])[col].first()
                monthly = monthly.merge(first.rename(col), on=["asset_id", "_month"], how="left")

        monthly = monthly.rename(columns={"_month": "timestamp"}).sort_values(
            ["asset_id", "timestamp"], kind="mergesort"
        ).reset_index(drop=True)
        return monthly

    # ------------------------------------------------------------ features
    def add_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Generate lag / rolling / trend / seasonal features per asset.

        Input must be chronologically sorted per asset (run() guarantees it);
        features never require a global shuffle-free reordering of history.
        """
        out = df.copy()
        w = max(int(self.config.rolling_window), 1)
        tw = max(int(self.config.trend_window), 2)

        parts: list[pd.DataFrame] = []
        for _asset, block in out.groupby("asset_id", sort=False):
            g = block.sort_values("timestamp", kind="mergesort").copy()
            prod = g["production"].astype(float)

            g["production_lag_1"] = prod.shift(1)
            g["production_lag_3"] = prod.shift(3)
            g["production_lag_6"] = prod.shift(6)
            g["rolling_mean"] = prod.rolling(w, min_periods=1).mean()
            g["rolling_std"] = prod.rolling(w, min_periods=1).std(ddof=0).fillna(0.0)
            g["decline_rate"] = (-prod.pct_change(fill_method=None)).fillna(0.0)
            g["trend_slope"] = prod.rolling(tw, min_periods=min(3, tw)).apply(
                lambda s: float(np.polyfit(np.arange(s.size), s, 1)[0]),
                raw=True,
            )

            month = g["timestamp"].dt.month
            overall = float(prod.mean())
            if overall > 0:
                mom = prod.groupby(month).transform("mean") / overall
            else:
                mom = pd.Series(1.0, index=g.index)
            g["seasonal_factor"] = mom

            trailing_mean = prod.shift(1).rolling(w, min_periods=1).mean()
            g["production_deviation"] = ((prod - trailing_mean) / trailing_mean.replace(0, np.nan))
            g["production_deviation"] = g["production_deviation"].fillna(0.0)

            parts.append(g)

        return pd.concat(parts, ignore_index=True) if parts else out

    # ---------------------------------------------------------------- run
    def run(self, df: pd.DataFrame, *, compute_features: bool = False) -> PreprocessResult:
        cfg = self.config
        report: dict[str, Any] = {}
        issues: list[str] = []

        report["input_rows"] = len(df)
        out = self.normalize_timestamps(df)
        out = self.drop_missing_required(out, report)
        out = self.apply_unit_conversions(out, report)
        out = self.validate_positivity(out, report)
        out = self.validate_units(out, report, issues)
        out = self.remove_duplicates(out, report)
        out = self.handle_missing_values(out, report)
        out = self.sort_chronologically(out)

        flags = (
            self._production_outlier_mask(out).astype(bool)
            if not out.empty else pd.Series(dtype=bool)
        )
        flagged = int(flags.sum())
        report["outliers_flagged"] = flagged
        before_outlier_removal = len(out)
        if flagged and cfg.remove_outliers:
            out = out[~flags]
            issues.append(f"{flagged} statistical outlier(s) removed from production series")
        report["outliers_removed"] = before_outlier_removal - len(out)

        if cfg.aggregate_monthly and not out.empty:
            before = len(out)
            out = self.aggregate_monthly(out)
            report["monthly_aggregation"] = {
                "applied": True, "input_rows": before, "output_rows": len(out),
            }
        else:
            report["monthly_aggregation"] = {"applied": False}

        if compute_features and not out.empty:
            out = self.add_features(out)

        report.update(self.quality_report(out))
        report["output_rows"] = len(out)
        logger.info("preprocess: %s", {k: report[k] for k in (
            "input_rows", "output_rows", "duplicates_removed", "outliers_flagged",
            "unit_validation_failures",
        )})
        return PreprocessResult(frame=out.reset_index(drop=True), report=report, issues=issues)

    # ------------------------------------------------------------- splits
    @staticmethod
    def chronological_split(
        df: pd.DataFrame, train_fraction: float = 0.8
    ) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Per-asset ordered split. The past trains, the future tests - never shuffled."""
        if not 0.0 < train_fraction < 1.0:
            raise ValueError("train_fraction must be in (0, 1)")
        train_parts, test_parts = [], []
        for _asset, block in df.sort_values(
            ["asset_id", "timestamp"], kind="mergesort"
        ).groupby("asset_id", sort=False):
            n = len(block)
            n_train = int(n * train_fraction)
            n_train = max(1, min(n_train, n - 1)) if n > 1 else n
            train_parts.append(block.iloc[:n_train])
            test_parts.append(block.iloc[n_train:])
        train = pd.concat(train_parts, ignore_index=True) if train_parts else df.iloc[:0]
        test = pd.concat(test_parts, ignore_index=True) if test_parts else df.iloc[:0]
        return train, test

    # ------------------------------------------------------------- quality
    @staticmethod
    def quality_report(df: pd.DataFrame) -> dict[str, Any]:
        timestamps = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
        duplicates = int(df.duplicated(subset=["asset_id", "timestamp"]).sum())
        return {
            "number_of_rows": int(len(df)),
            "assets": int(df["asset_id"].nunique()) if not df.empty else 0,
            "date_range": {
                "start": _iso(timestamps.min() if len(timestamps) else None),
                "end": _iso(timestamps.max() if len(timestamps) else None),
            },
            "missingness": {
                col: int(df[col].isna().sum()) if col in df.columns else len(df)
                for col in STANDARD_COLUMNS
            },
            "duplicate_count": duplicates,
            "source_distribution": (
                df["source"].value_counts(dropna=False)
                .rename(index=lambda v: "(none)" if pd.isna(v) else str(v))
                .astype(int).to_dict()
            ),
            "source_type_distribution": (
                df["source_type"].value_counts().astype(int).to_dict()
                if "source_type" in df.columns else {}
            ),
        }


# Backwards-compatible convenience functions -------------------------------
def clean_frame(df: pd.DataFrame, config: PreprocessConfig | None = None) -> PreprocessResult:
    return DataPreprocessor(config).run(df)


def build_features(df: pd.DataFrame, config: PreprocessConfig | None = None) -> pd.DataFrame:
    return DataPreprocessor(config).add_features(DataPreprocessor(config).sort_chronologically(df))
