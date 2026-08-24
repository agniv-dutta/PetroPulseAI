"""Arps decline-curve fitting (hyperbolic with exponential limit).

Mirrors frontend/src/utils/arpsDeclineCurve.ts but uses continuous
optimisation (scipy) instead of grid search.
"""

from dataclasses import dataclass

import numpy as np
from scipy.optimize import curve_fit


def arps_rate(qi: float, di: float, b: float, t_months: np.ndarray) -> np.ndarray:
    t = np.asarray(t_months, dtype=float)
    if abs(b) < 1e-3:
        return qi * np.exp(-di * t)
    return qi / ((1.0 + b * di * t) ** (1.0 / b))


@dataclass
class ArpsFitResult:
    qi: float
    di: float
    b: float
    r_squared: float
    mean_absolute_error: float
    std_error: float
    decline_rate_current_pct_per_month: float
    fitted_curve: list[float]
    forecast_30d: float
    forecast_90d: float
    forecast_180d: float
    eur_remaining_mmbbl: float | None = None

    def to_dict(self) -> dict:
        return {
            "qi": round(self.qi, 2),
            "di": round(self.di, 5),
            "b": round(self.b, 4),
            "r_squared": round(self.r_squared, 4),
            "mean_absolute_error": round(self.mean_absolute_error, 2),
            "std_error": round(self.std_error, 3),
            "decline_rate_current_pct_per_month": round(self.decline_rate_current_pct_per_month, 3),
            "fitted_curve": [round(v, 2) for v in self.fitted_curve],
            "forecast_30d": round(self.forecast_30d, 1),
            "forecast_90d": round(self.forecast_90d, 1),
            "forecast_180d": round(self.forecast_180d, 1),
            "eur_remaining_mmbbl": (
                round(self.eur_remaining_mmbbl, 3) if self.eur_remaining_mmbbl is not None else None
            ),
        }


def fit_arps(
    monthly_production: list[float],
    forecast_months: int = 6,
    q_min_fraction: float = 0.05,
    horizon_cap_years: float = 30.0,
) -> ArpsFitResult:
    """Fit hyperbolic Arps to monthly average rates (bbl/d).

    monthly_production must contain >= 8 positive values ordered oldest-first.
    """
    rates = np.asarray(monthly_production, dtype=float)
    rates = rates[rates > 0] if len(rates) >= 8 else rates
    if len(rates) < 8:
        raise ValueError("need at least 8 months of positive production for Arps fit")

    t = np.arange(len(rates), dtype=float)

    def model(t_arr, qi, di, b):
        return arps_rate(qi, di, max(b, 1e-4), t_arr)

    qi0 = float(np.percentile(rates[:3], 75))
    bounds = (
        [rates.min() * 0.5, 0.002, 0.05],
        [rates.max() * 1.5, 0.20, 1.50],
    )
    popt, _ = curve_fit(model, t, rates, p0=[qi0, 0.03, 0.6], bounds=bounds, maxfev=20000)
    qi, di, b = (float(v) for v in popt)

    fitted = arps_rate(qi, di, b, t)
    residuals = rates - fitted
    ss_res = float(np.sum(residuals**2))
    ss_tot = float(np.sum((rates - rates.mean()) ** 2)) or 1.0
    r_squared = 1.0 - ss_res / ss_tot
    mae = float(np.mean(np.abs(residuals)))

    f30 = arps_rate(qi, di, b, len(rates) - 1 + 1.0)
    f90 = arps_rate(qi, di, b, len(rates) - 1 + 3.0)
    f180 = arps_rate(qi, di, b, len(rates) - 1 + 6.0)
    d_now = di / (1.0 + b * di * (len(rates) - 1))

    # Remaining EUR at economic limit, capped horizon
    q_limit = max(qi * q_min_fraction, 1.0)
    if abs(b) < 1e-3:
        t_limit = min(np.log((qi * 1e-9 + q_limit) / qi) / (-di), horizon_cap_years * 12)
    else:
        t_limit = min(((qi / q_limit) ** b - 1.0) / (b * di), horizon_cap_years * 12)
    n_future = max(int(t_limit - t[-1]), 0)
    ts_future = t[-1] + np.arange(1, n_future + 1)
    days_per_month = 30.44
    eur = float(np.sum(arps_rate(qi, di, b, ts_future) * days_per_month)) / 1e6 if n_future else 0.0

    return ArpsFitResult(
        qi=qi,
        di=di,
        b=b,
        r_squared=r_squared,
        mean_absolute_error=mae,
        std_error=float(np.std(residuals)),
        decline_rate_current_pct_per_month=d_now * 100.0,
        fitted_curve=[float(v) for v in fitted],
        forecast_30d=f30,
        forecast_90d=f90,
        forecast_180d=f180,
        eur_remaining_mmbbl=eur,
    )
