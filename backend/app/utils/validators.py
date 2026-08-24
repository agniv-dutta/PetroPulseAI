"""Input validation utilities for PetroPulse AI."""

from datetime import date, datetime
from typing import Any


def validate_asset_id(asset_id: str) -> bool:
    """Validate asset ID format."""
    if not asset_id or not isinstance(asset_id, str):
        return False
    if len(asset_id) > 32:
        return False
    return True


def validate_date_range(start_date: date, end_date: date) -> bool:
    """Validate date range."""
    if not isinstance(start_date, date) or not isinstance(end_date, date):
        return False
    if start_date > end_date:
        return False
    return True


def validate_coordinates(latitude: float, longitude: float) -> bool:
    """Validate geographic coordinates."""
    if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
        return False
    if not -90 <= latitude <= 90:
        return False
    if not -180 <= longitude <= 180:
        return False
    return True


def validate_production_rate(rate: float) -> bool:
    """Validate production rate (bbl/d)."""
    if not isinstance(rate, (int, float)):
        return False
    if rate < 0:
        return False
    if rate > 1000000:  # Practical upper limit
        return False
    return True


def validate_decline_rate(di: float) -> bool:
    """Validate decline rate."""
    if not isinstance(di, (int, float)):
        return False
    if di < 0 or di > 1:
        return False
    return True


def validate_arps_exponent(b: float) -> bool:
    """Validate Arps exponent b."""
    if not isinstance(b, (int, float)):
        return False
    if b < 0 or b > 2:
        return False
    return True


def sanitize_string(input_string: str, max_length: int = 120) -> str:
    """Sanitize string input."""
    if not isinstance(input_string, str):
        return ""
    return input_string[:max_length].strip()


def validate_json_structure(data: dict[str, Any], required_keys: list[str]) -> bool:
    """Validate JSON structure has required keys."""
    if not isinstance(data, dict):
        return False
    return all(key in data for key in required_keys)
