"""Preprocessing utilities shared by ingestion and the ML engine."""

import numpy as np
import pandas as pd


def clean_monthly_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Validate + normalise a monthly production frame.

    Expects columns: asset_id, period, oil_bbl_d. Optional: expected_bbl_d,
    gas_mmcf_d, water_cut_pct.
    """
    required = {"asset_id", "period", "oil_bbl_d"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"monthly production frame missing columns: {sorted(missing)}")

    out = df.copy()
    out["period"] = pd.to_datetime(out["period"])
    out["oil_bbl_d"] = pd.to_numeric(out["oil_bbl_d"], errors="coerce")
    out = out.dropna(subset=["period", "oil_bbl_d"])
    out = out[out["oil_bbl_d"] >= 0]
    out["asset_id"] = out["asset_id"].astype(str).str.strip()
    out = out.sort_values(["asset_id", "period"]).drop_duplicates(
        subset=["asset_id", "period"], keep="last"
    )
    if "expected_bbl_d" not in out.columns:
        out["expected_bbl_d"] = out.groupby("asset_id")["oil_bbl_d"].transform(
            lambda s: s.rolling(6, min_periods=1).mean().shift(0)
        )
    return out.reset_index(drop=True)


def compute_seasonal_factors(monthly_values: np.ndarray) -> np.ndarray:
    """12 seasonal multipliers: month-of-year mean / overall mean."""
    arr = np.asarray(monthly_values, dtype=float)
    if arr.size < 12:
        return np.ones(12)
    months = np.arange(arr.size) % 12
    overall = float(arr.mean())
    if overall <= 0:
        return np.ones(12)
    factors = np.ones(12)
    for m in range(12):
        vals = arr[months == m]
        factors[m] = float(vals.mean()) / overall
    # smooth lightly to avoid over-fitting short histories
    kernel = np.array([0.25, 0.5, 0.25])
    padded = np.concatenate([[factors[-1]], factors, [factors[0]]])
    smoothed = np.convolve(padded, kernel, mode="valid")
    return smoothed


def deviation_pct(actual: float, expected: float) -> float:
    if expected == 0:
        return 0.0
    return (actual - expected) / expected * 100.0


def to_monthly_series(rows: list[dict]) -> pd.DataFrame:
    return clean_monthly_frame(pd.DataFrame(rows))
