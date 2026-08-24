"""DEPRECATED shim - canonical AIPS lives in app/services/aips_service.py.

Kept only so legacy imports keep resolving; all new code must import from
the service module (the backend's single source of truth).
"""

from app.services.aips_service import (  # noqa: F401
    AIPS_DISCLAIMER,
    AIPS_FORMULA,
    AIPS_WEIGHTS,
    AIPSInput,
    AIPSPriorityThresholds,
    AIPSResult,
    calculate_aips,
    priority_for_score,
)
