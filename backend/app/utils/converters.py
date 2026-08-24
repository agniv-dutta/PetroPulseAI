"""Data conversion utilities for PetroPulse AI."""

from datetime import date, datetime
from typing import Any

import numpy as np
import pandas as pd


def datetime_to_iso(dt: datetime) -> str:
    """Convert datetime to ISO format string."""
    if dt is None:
        return ""
    return dt.isoformat()


def date_to_iso(d: date) -> str:
    """Convert date to ISO format string."""
    if d is None:
        return ""
    return d.isoformat()


def iso_to_datetime(iso_string: str) -> datetime:
    """Convert ISO string to datetime."""
    if not iso_string:
        return None
    return datetime.fromisoformat(iso_string)


def iso_to_date(iso_string: str) -> date:
    """Convert ISO string to date."""
    if not iso_string:
        return None
    dt = datetime.fromisoformat(iso_string)
    return dt.date()


def dataframe_to_dict(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Convert DataFrame to list of dictionaries."""
    if df is None or df.empty:
        return []
    return df.to_dict(orient="records")


def dict_to_dataframe(data: list[dict[str, Any]]) -> pd.DataFrame:
    """Convert list of dictionaries to DataFrame."""
    if not data:
        return pd.DataFrame()
    return pd.DataFrame(data)


def numpy_to_python(value: Any) -> Any:
    """Convert numpy types to native Python types."""
    if isinstance(value, (np.integer, np.int64, np.int32)):
        return int(value)
    if isinstance(value, (np.floating, np.float64, np.float32)):
        return float(value)
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.bool_):
        return bool(value)
    return value


def safe_float(value: Any, default: float = 0.0) -> float:
    """Safely convert value to float."""
    try:
        return float(value) if value is not None else default
    except (ValueError, TypeError):
        return default


def safe_int(value: Any, default: int = 0) -> int:
    """Safely convert value to int."""
    try:
        return int(value) if value is not None else default
    except (ValueError, TypeError):
        return default


def format_number(value: float, decimals: int = 2) -> float:
    """Format number to specified decimal places."""
    return round(value, decimals)


def bbl_to_kbbl(bbl: float) -> float:
    """Convert barrels to thousand barrels."""
    return bbl / 1000.0


def kbbl_to_bbl(kbbl: float) -> float:
    """Convert thousand barrels to barrels."""
    return kbbl * 1000.0


def calculate_percentage(actual: float, expected: float) -> float:
    """Calculate percentage deviation."""
    if expected == 0:
        return 0.0
    return ((actual - expected) / expected) * 100.0
