"""Enum definitions for PetroPulse AI."""

from enum import Enum


class AssetStatus(str, Enum):
    """Asset operational status."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SHUT_IN = "SHUT_IN"
    DEPLETED = "DEPLETED"


class DataSource(str, Enum):
    """Data source classification."""
    REAL = "REAL"
    SYNTHETIC = "SYNTHETIC"
    DERIVED = "DERIVED"


class AnomalySeverity(str, Enum):
    """Anomaly severity levels."""
    NORMAL = "NORMAL"
    WATCH = "WATCH"
    ALERT = "ALERT"
    CRITICAL = "CRITICAL"


class AnomalyStatus(str, Enum):
    """Anomaly acknowledgment status."""
    UNACKNOWLEDGED = "UNACKNOWLEDGED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


class AIPSPriority(str, Enum):
    """AIPS priority levels."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ModelStatus(str, Enum):
    """ML model status."""
    TRAINING = "TRAINING"
    READY = "READY"
    DEPRECATED = "DEPRECATED"
    FAILED = "FAILED"


class ScenarioType(str, Enum):
    """Simulation scenario types."""
    NORMAL = "NORMAL"
    EQUIPMENT_FAILURE = "EQUIPMENT_FAILURE"
    DECLINE_ACCELERATION = "DECLINE_ACCELERATION"
    MARKET_DISRUPTION = "MARKET_DISRUPTION"
    REGULATORY_CHANGE = "REGULATORY_CHANGE"
