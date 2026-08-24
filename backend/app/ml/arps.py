"""Model 1 - Arps decline-curve analysis (interpretable baseline).

Hyperbolic form with exponential limit:

    q(t) = qi / (1 + b * Di * t)^(1/b),   q(t) -> qi * exp(-Di * t) as b -> 0

Mirrors frontend/src/utils/arpsDeclineCurve.ts but uses continuous bounded
optimisation (scipy) instead of grid search.

Validation performed on every fit:
  - minimum historical observations (default 8 monthly points)
  - strictly positive production values
  - parameter bounds: Di in [DI_MIN, DI_MAX], b in [B_MIN, B_MAX]
  - goodness of fit reported via R2 / MAE / residual statistics
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy.optimize import curve_fit

DAYS_PER_MONTH = 30.44

# Parameter bounds enforced during fitting.
QI_FRACTION_BOUNDS = (0.5, 1.5)   # qi relative to observed min/max
DI_MIN, DI_MAX = 0.002, 0.20      # nominal decline per month
B_MIN, B_MAX = 0.05, 1.50         # Arps exponent

MIN_OBSERVATIONS = 8

STANDARD_HORIZON_DAYS = (30, 90, 180, 365)


def arps_rate(qi: float, di: float, b: float, t_months) -> np.ndarray:
    """Hyperbolic Arps rate; converges to exponential decay as b -> 0."""
    t = np.asarray(t_months, dtype=float)
    if abs(b) < 1e-3:
        return qi * np.exp(-di * t)
    return qi / ((1.0 + b * di * t) ** (1.0 / b))


def calculate_decline_rate(di: float, b: float, t_months: float = 0.0) -> dict:
    """Instantaneous (nominal) decline at time t.

    D(t) = Di / (1 + b*Di*t). Returned as fraction and percentage per month,
    plus the annualised effective percentage for convenience.
    """
    d_t = di / (1.0 + b * di * max(t_months, 0.0))
    return {
        "t_months": float(t_months),
        "nominal_decline_per_month": round(float(d_t), 6),
        "decline_pct_per_month": round(float(d_t) * 100.0, 4),
        "effective_decline_pct_per_year": round(
            (1.0 - float(np.exp(-d_t * 12.0))) * 100.0, 3
        ),
    }


def predict_arps(fit: "ArpsFitResult | tuple[float, float, float]", t_months):
    """Predict rates at arbitrary month offsets from a fit result or params."""
    if isinstance(fit, ArpsFitResult):
        qi, di, b = fit.qi, fit.di, fit.b
    else:
        qi, di, b = (float(v) for v in fit)
    return arps_rate(qi, di, b, t_months)


def forecast_arps(
    fit: "ArpsFitResult | tuple[float, float, float]",
    horizon_days: tuple[int, ...] = STANDARD_HORIZON_DAYS,
    last_observed_month: float | None = None,
) -> dict[str, float]:
    """Deterministic Arps forecasts at standard horizons.

    Horizon h days is evaluated at month offset (last observed index) + h/30.44;
    when called with bare parameters the offset starts one month after t=0.
    """
    if isinstance(fit, ArpsFitResult):
        qi, di, b = fit.qi, fit.di, fit.b
        base = fit.n_observations - 1
    else:
        qi, di, b = (float(v) for v in fit)
        base = 0
    start = base if last_observed_month is None else float(last_observed_month)
    out: dict[str, float] = {}
    for days in horizon_days:
        months_ahead = max(days / DAYS_PER_MONTH, 1e-9)
        value = float(arps_rate(qi, di, b, start + months_ahead))
        out[f"forecast_{days}d"] = round(value, 2)
    return out


@dataclass
class ResidualStats:
    mean: float
    std: float
    min_abs: float
    max_abs: float
    bias_pct: float  # mean(residual)/mean(production)*100


@dataclass
class ArpsFitResult:
    qi: float
    di: float
    b: float
    r_squared: float
    mean_absolute_error: float
    std_error: float
    residuals: ResidualStats
    n_observations: int
    decline_rate_current_pct_per_month: float
    fitted_curve: list[float]
    forecast_30d: float
    forecast_90d: float
    forecast_180d: float
    forecast_365d: float
    confidence: float
    eur_remaining_mmbbl: float | None = None
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "model": "arps",
            "qi": round(self.qi, 2),
            "di": round(self.di, 5),
            "b": round(self.b, 4),
            "r_squared": round(self.r_squared, 4),
            "mae": round(self.mean_absolute_error, 2),
            "mean_absolute_error": round(self.mean_absolute_error, 2),
            "std_error": round(self.std_error, 3),
            "residuals": {
                "mean": round(self.residuals.mean, 2),
                "std": round(self.residuals.std, 3),
                "max_abs": round(self.residuals.max_abs, 2),
                "bias_pct": round(self.residuals.bias_pct, 2),
            },
            "n_observations": self.n_observations,
            "decline_rate_current_pct_per_month": round(
                self.decline_rate_current_pct_per_month, 3
            ),
            "fitted_curve": [round(v, 2) for v in self.fitted_curve],
            "forecast_30d": round(self.forecast_30d, 1),
            "forecast_90d": round(self.forecast_90d, 1),
            "forecast_180d": round(self.forecast_180d, 1),
            "forecast_365d": round(self.forecast_365d, 1),
            "confidence": round(self.confidence, 3),
            "eur_remaining_mmbbl": (
                round(self.eur_remaining_mmbbl, 3)
                if self.eur_remaining_mmbbl is not None else None
            ),
            "warnings": list(self.warnings),
        }


def _validate_series(monthly_production: list[float], min_observations: int) -> np.ndarray:
    rates = np.asarray(monthly_production, dtype=float)
    if rates.size < min_observations:
        raise ValueError(
            f"need at least {min_observations} observations for an Arps fit "
            f"(got {rates.size})"
        )
    if not np.all(np.isfinite(rates)):
        raise ValueError("production series contains non-finite values")
    non_positive = int((rates <= 0).sum())
    if non_positive:
        raise ValueError(
            f"Arps requires strictly positive production; {non_positive} "
            "non-positive value(s) found"
        )
    return rates


def fit_arps(
    monthly_production: list[float],
    forecast_months: int = 12,
    q_min_fraction: float = 0.05,
    horizon_cap_years: float = 30.0,
    min_observations: int = MIN_OBSERVATIONS,
) -> ArpsFitResult:
    """Fit the hyperbolic Arps model to monthly average rates (bbl/d).

    Values must be ordered oldest-first and strictly positive.
    """
    rates = _validate_series(monthly_production, min_observations)
    warnings: list[str] = []
    t = np.arange(len(rates), dtype=float)

    def model(t_arr, qi, di, b):
        return arps_rate(qi, di, max(b, 1e-4), t_arr)

    qi0 = float(np.percentile(rates[:3], 75))
    bounds = (
        [rates.min() * QI_FRACTION_BOUNDS[0], DI_MIN, B_MIN],
        [rates.max() * QI_FRACTION_BOUNDS[1], DI_MAX, B_MAX],
    )

    try:
        popt, _ = curve_fit(model, t, rates, p0=[qi0, 0.03, 0.6], bounds=bounds, maxfev=20000)
    except RuntimeError as exc:
        raise ValueError(f"Arps fit failed to converge within parameter bounds: {exc}") from exc
    qi, di, b = (float(v) for v in popt)

    if abs(di - DI_MIN) < 1e-9 or abs(di - DI_MAX) < 1e-9:
        warnings.append("decline parameter Di hit its bound; fit may be unreliable")
    if abs(b - B_MIN) < 1e-9 or abs(b - B_MAX) < 1e-9:
        warnings.append("Arps exponent b hit its bound; fit may be unreliable")

    fitted = arps_rate(qi, di, b, t)
    residuals = rates - fitted
    ss_res = float(np.sum(residuals**2))
    ss_tot = float(np.sum((rates - rates.mean()) ** 2)) or 1.0
    r_squared = 1.0 - ss_res / ss_tot
    mae = float(np.mean(np.abs(residuals)))

    horizon_values = forecast_arps((qi, di, b), STANDARD_HORIZON_DAYS, last_observed_month=t[-1])
    d_now = di / (1.0 + b * di * (len(rates) - 1))

    # Confidence: goodness-of-fit weighted by sample size, penalised by
    # relative error level. Purely a heuristic decision-support number.
    coverage = min(len(rates) / 24.0, 1.0)
    relative_mae = mae / max(float(rates.mean()), 1e-9)
    confidence = float(np.clip(0.55 * max(r_squared, 0.0) + 0.25 * coverage + 0.20 * (1 - min(relative_mae, 1.0)), 0.0, 0.99))

    # Remaining EUR at economic limit, capped horizon
    q_limit = max(qi * q_min_fraction, 1.0)
    if abs(b) < 1e-3:
        t_limit = min(np.log((qi * 1e-9 + q_limit) / qi) / (-di), horizon_cap_years * 12)
    else:
        t_limit = min(((qi / q_limit) ** b - 1.0) / (b * di), horizon_cap_years * 12)
    n_future = max(int(t_limit - t[-1]), 0)
    ts_future = t[-1] + np.arange(1, n_future + 1)
    eur = (
        float(np.sum(arps_rate(qi, di, b, ts_future) * DAYS_PER_MONTH)) / 1e6
        if n_future else 0.0
    )
    if r_squared < 0.7:
        warnings.append(f"low R2 ({r_squared:.2f}); Arps baseline should be treated cautiously")

    return ArpsFitResult(
        qi=qi,
        di=di,
        b=b,
        r_squared=r_squared,
        mean_absolute_error=mae,
        std_error=float(np.std(residuals)),
        residuals=ResidualStats(
            mean=float(np.mean(residuals)),
            std=float(np.std(residuals)),
            min_abs=float(np.min(np.abs(residuals))),
            max_abs=float(np.max(np.abs(residuals))),
            bias_pct=float(np.mean(residuals) / max(float(rates.mean()), 1e-9) * 100.0),
        ),
        n_observations=len(rates),
        decline_rate_current_pct_per_month=d_now * 100.0,
        fitted_curve=[float(v) for v in fitted],
        forecast_30d=horizon_values["forecast_30d"],
        forecast_90d=horizon_values["forecast_90d"],
        forecast_180d=horizon_values["forecast_180d"],
        forecast_365d=horizon_values["forecast_365d"],
        confidence=confidence,
        eur_remaining_mmbbl=eur,
        warnings=warnings,
    )
