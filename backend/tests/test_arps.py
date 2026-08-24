"""Arps decline-curve tests: analytic limits + parameter recovery."""

import numpy as np
import pytest

from app.ml.arps import arps_rate, fit_arps


def test_exponential_limit():
    """b -> 0 must converge to exponential decay q = qi * exp(-di t)."""
    qi, di, b = 1000.0, 0.05, 1e-6
    rates = arps_rate(qi, di, b, np.array([0.0, 12.0, 24.0]))
    expected = qi * np.exp(-di * np.array([0.0, 12.0, 24.0]))
    assert np.allclose(rates, expected, rtol=1e-3)


def test_hyperbolic_analytic_value():
    """q(t) = qi / (1 + b di t)^(1/b) at t=12 for known params."""
    qi, di, b = 2000.0, 0.04, 0.5
    t = 12.0
    expected = qi / ((1.0 + b * di * t) ** (1.0 / b))
    assert abs(arps_rate(qi, di, b, np.array([t]))[0] - expected) < 1e-6


def test_fit_recovers_synthetic_params():
    rng = np.random.default_rng(3)
    qi_true, di_true, b_true = 5000.0, 0.05, 0.6
    t = np.arange(36, dtype=float)
    clean = arps_rate(qi_true, di_true, b_true, t)
    noisy = clean * (1 + rng.normal(0, 0.01, size=t.size))

    result = fit_arps(noisy.tolist())

    assert result.r_squared > 0.98
    assert abs(result.qi - qi_true) / qi_true < 0.05
    assert abs(result.di - di_true) / di_true < 0.25
    assert abs(result.b - b_true) < 0.15


def test_fit_forecasts_decline_monotonically():
    rng = np.random.default_rng(5)
    values = (arps_rate(8000.0, 0.03, 0.65, np.arange(30.0)) * (1 + rng.normal(0, 0.02, 30)))
    result = fit_arps(values.tolist())
    assert result.forecast_30d >= result.forecast_90d >= result.forecast_180d
    assert 0 <= result.decline_rate_current_pct_per_month < 20


def test_fit_requires_history():
    with pytest.raises(ValueError):
        fit_arps([100.0] * 4)
