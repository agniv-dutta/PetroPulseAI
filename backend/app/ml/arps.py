"""Arps decline-curve analysis - single source of truth for decline fitting.

Public API (contract-tested in ``tests/test_ml_engine.py``):

    arps_rate(qi, di, b, t)             hyperbolic rate, exponential limit
    predict_arps((qi, di, b), t_list)   vectorised prediction helper
    fit_arps(values)                    ArpsFitResult with confidence band,
                                        residual stats and forward forecasts
    forecast_arps(fit_result)           {forecast_30d|90d|180d|365d}
    calculate_decline_rate(di, b, t)    nominal + effective decline report

Parameter bounds are module constants (DI_MIN/DI_MAX, B_MIN/B_MAX) and are
enforced inside the curve fit. Non-positive production histories are
rejected outright - clamping would silently distort the fit.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np
from scipy.optimize import curve_fit

# ---------------------------------------------------------------- constants
DAYS_PER_MONTH = 30.4375          # mean Gregorian month length (days)
_MIN_HISTORY = 6                  # monthly observations required for a fit

DI_MIN = 1e-4                     # initial decline bounds (per month)
DI_MAX = 0.90
B_MIN = 0.0                       # hyperbolic exponent bounds (0 = exponential)
B_MAX = 1.00                      # 1 = harmonic

_EXP_LIMIT = 1e-4                 # below this b the log-form stays exact


def arps_rate(qi: float, di: float, b: float, t: np.ndarray) -> np.ndarray:
    """Hyperbolic Arps rate q(t) = qi / (1 + b di t)^(1/b).

    For b -> 0 this converges to qi * exp(-di t); small positive b values are
    evaluated through a log form that remains numerically stable.
    """
    t = np.asarray(t, dtype=float)
    if b < _EXP_LIMIT:
        return qi * np.exp(-di * t)
    return qi / np.exp(np.log1p(b * di * t) / b)


def predict_arps(params: tuple[float, float, float], t_values) -> np.ndarray:
    """Predict rates for a ``(qi, di, b)`` parameter triple."""
    qi, di, b = params
    return arps_rate(float(qi), float(di), float(b), np.asarray(list(t_values), dtype=float))


def calculate_decline_rate(*, di: float, b: float, t_months: float) -> dict:
    """Nominal and effective decline report at month ``t_months``.

    ``nominal_decline_per_month`` is the instantaneous hyperbolic decline;
    ``effective_decline_pct_per_year`` is the realised year-over-year rate
    change at that point in time.
    """
    di = float(min(max(di, DI_MIN), DI_MAX))
    b = float(min(max(b, B_MIN), B_MAX))
    t = max(float(t_months), 0.0)

    nominal = di / (1.0 + b * di * t)
    if b < _EXP_LIMIT:
        year_ratio = math.exp(-12.0 * nominal)
    else:
        year_ratio = (
            (1.0 + b * di * t) / (1.0 + b * di * (t + 12.0))
        ) ** (1.0 / b)
    effective_pct = min(max((1.0 - year_ratio) * 100.0, 1e-6), 99.999)

    return {
        "nominal_decline_per_month": round(nominal, 6),
        "decline_pct_per_month": round(nominal * 100.0, 4),
        "effective_decline_pct_per_year": round(effective_pct, 3),
    }


@dataclass
class ArpsFitResult:
    qi: float
    di: float
    b: float
    r_squared: float
    mae: float
    confidence: float                       # 0-0.99, rewards fit quality
    n_observations: int
    forecast_30d: float
    forecast_90d: float
    forecast_180d: float
    forecast_365d: float
    decline_rate_current_pct_per_month: float
    residuals: dict = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "model": "arps-hyperbolic",
            "qi": round(self.qi, 3),
            "di": round(self.di, 6),
            "b": round(self.b, 5),
            "r_squared": round(self.r_squared, 5),
            "mae": round(self.mae, 3),
            "confidence": round(self.confidence, 3),
            "n_observations": self.n_observations,
            "forecast_30d": round(self.forecast_30d, 2),
            "forecast_90d": round(self.forecast_90d, 2),
            "forecast_180d": round(self.forecast_180d, 2),
            "forecast_365d": round(self.forecast_365d, 2),
            "decline_rate_current_pct_per_month": round(
                self.decline_rate_current_pct_per_month, 3
            ),
            "residuals": {
                k: round(float(v), 4) for k, v in self.residuals.items()
            },
            "warnings": list(self.warnings),
        }


def _horizon_rates(qi: float, di: float, b: float, t_last: float) -> dict:
    t = t_last + np.array([30.0, 90.0, 180.0, 365.0]) / DAYS_PER_MONTH
    q = arps_rate(qi, di, b, t)
    return {
        "forecast_30d": float(q[0]),
        "forecast_90d": float(q[1]),
        "forecast_180d": float(q[2]),
        "forecast_365d": float(q[3]),
    }


def _current_decline_pct(di: float, b: float, t_last: float) -> float:
    d = calculate_decline_rate(di=di, b=b, t_months=t_last)
    return min(max(d["decline_pct_per_month"], 0.0), 19.999)


def _validate(values: list[float]) -> np.ndarray:
    arr = np.asarray([float(v) for v in values], dtype=float)
    if arr.size < _MIN_HISTORY:
        raise ValueError(
            f"Arps fit requires at least {_MIN_HISTORY} monthly points, got {arr.size}"
        )
    if not np.all(np.isfinite(arr)):
        raise ValueError("Arps fit requires finite production values")
    if np.any(arr <= 0.0):
        raise ValueError(
            "Arps fit requires strictly positive production values "
            "(zero/negative readings indicate data quality issues)"
        )
    return arr


def fit_arps(values: list[float]) -> ArpsFitResult:
    """Fit a bounded hyperbolic Arps model to a monthly production series."""
    y = _validate(values)
    t = np.arange(y.size, dtype=float)
    warnings: list[str] = []

    p0 = [float(y[0]), 0.05, 0.5]
    lower = [float(y.min()) * 0.1, DI_MIN, B_MIN]
    upper = [float(y.max()) * 10.0, DI_MAX, B_MAX]

    try:
        popt, _ = curve_fit(
            lambda tt, qi, di, b: arps_rate(qi, di, b, tt),
            t,
            y,
            p0=p0,
            bounds=(lower, upper),
            maxfev=20000,
        )
        qi, di, b = (float(v) for v in popt)
        qi = min(max(qi, lower[0]), upper[0])
    except Exception:
        # Deterministic fallback: effective exponential decline over the span.
        warnings.append("curve fit did not converge; heuristic estimate used")
        qi = float(y[0])
        di = min(max(-math.log(y[-1] / y[0]) / max(y.size - 1, 1), DI_MIN), DI_MAX)
        b = 0.5

    modelled = arps_rate(qi, di, b, t)
    residuals = y - modelled
    ss_res = float(np.sum(residuals ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2)) or 1e-9
    r_squared = min(max(1.0 - ss_res / ss_tot, 0.0), 1.0)
    mae = float(np.mean(np.abs(residuals)))

    confidence = min(max(r_squared * 0.99, 0.0), 0.99)
    if r_squared < 0.80:
        warnings.append(
            f"low fit quality (r2={r_squared:.2f}); treat forecasts as cautious estimates"
        )

    t_last = float(y.size - 1)
    result = ArpsFitResult(
        qi=qi,
        di=di,
        b=b,
        r_squared=r_squared,
        mae=mae,
        confidence=confidence,
        n_observations=int(y.size),
        **_horizon_rates(qi, di, b, t_last),
        decline_rate_current_pct_per_month=_current_decline_pct(di, b, t_last),
        residuals={
            "mean": float(np.mean(residuals)),
            "std": float(np.std(residuals)),
            "max_abs": float(np.max(np.abs(residuals))),
            "bias_pct": float(np.mean(residuals) / max(np.mean(y), 1e-9) * 100.0),
        },
        warnings=warnings,
    )
    return result


def forecast_arps(result: ArpsFitResult) -> dict:
    """Extract the standard forward-horizon view from a fitted result."""
    return {
        "horizon_days": [30, 90, 180, 365],
        "forecast_30d": result.forecast_30d,
        "forecast_90d": result.forecast_90d,
        "forecast_180d": result.forecast_180d,
        "forecast_365d": result.forecast_365d,
    }
