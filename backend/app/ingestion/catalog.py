"""Canonical asset catalogue + deterministic history generation for the demo.

Data honesty:
- Asset identities, basins and locations are illustrative composites inspired by
  public Indian basins (OGD/PPAC/DGH publish field-level MONTHLY/ANNUAL data).
- The monthly histories generated here are SYNTHETIC reconstructions seeded from
  Arps parameters; they are never labelled as real operator telemetry.
- Real CSV drops (data/*.csv) are ingested verbatim by load_public_csv() and
  tagged REAL with provenance records.
"""

import math
from datetime import date, timedelta

import numpy as np

from app.core.config import settings

# Canonical portfolio. qi in bbl/d at reference start, Di nominal monthly decline,
# b = Arps exponent.
CANONICAL_ASSETS: list[dict] = [
    dict(id="MH-07", name="Mumbai High North-7", field="Mumbai High", basin="Mumbai Offshore",
         latitude=19.35, longitude=71.85, onstream_year=1987, status="ACTIVE",
         baseline_qi=12500.0, baseline_di=0.032, baseline_b=0.62,
         operating_cost_usd_m=8.5, intervention_cost_usd_m=1.2),
    dict(id="CB-12", name="Cambay Block-12", field="Cambay", basin="Cambay",
         latitude=23.05, longitude=72.65, onstream_year=1996, status="ACTIVE",
         baseline_qi=4800.0, baseline_di=0.041, baseline_b=0.55,
         operating_cost_usd_m=3.2, intervention_cost_usd_m=0.9),
    dict(id="KG-05", name="KG-PG Block-05", field="Krishna-Godavari", basin="Krishna-Godavari",
         latitude=16.15, longitude=82.30, onstream_year=2009, status="ACTIVE",
         baseline_qi=7200.0, baseline_di=0.028, baseline_b=0.70,
         operating_cost_usd_m=5.1, intervention_cost_usd_m=1.4),
    dict(id="AS-09", name="Assam Shelf-09", field="Digboi Region", basin="Assam Shelf",
         latitude=27.30, longitude=95.10, onstream_year=1991, status="ACTIVE",
         baseline_qi=3100.0, baseline_di=0.036, baseline_b=0.58,
         operating_cost_usd_m=2.4, intervention_cost_usd_m=0.8),
    dict(id="CB-08", name="Cambay Block-08", field="Ankleshwar", basin="Cambay",
         latitude=21.60, longitude=73.00, onstream_year=1999, status="ACTIVE",
         baseline_qi=2600.0, baseline_di=0.045, baseline_b=0.50,
         operating_cost_usd_m=2.0, intervention_cost_usd_m=0.7),
    dict(id="MH-04", name="Mumbai High-4", field="Mumbai High South", basin="Mumbai Offshore",
         latitude=18.95, longitude=72.10, onstream_year=1994, status="ACTIVE",
         baseline_qi=5400.0, baseline_di=0.025, baseline_b=0.68,
         operating_cost_usd_m=4.4, intervention_cost_usd_m=1.1),
    dict(id="RJ-04", name="Rajasthan RJ-04", field="Mangala Area", basin="Rajasthan",
         latitude=26.90, longitude=71.60, onstream_year=2010, status="ACTIVE",
         baseline_qi=6800.0, baseline_di=0.030, baseline_b=0.66,
         operating_cost_usd_m=4.8, intervention_cost_usd_m=1.3),
    dict(id="CAU-05", name="Cauvery CAU-05", field="Kaveri Delta", basin="Cauvery",
         latitude=10.80, longitude=79.50, onstream_year=1998, status="ACTIVE",
         baseline_qi=2200.0, baseline_di=0.048, baseline_b=0.48,
         operating_cost_usd_m=1.9, intervention_cost_usd_m=0.6),
    dict(id="KG-102A", name="KG-DWN-102A", field="Krishna-Godavari Deepwater", basin="Krishna-Godavari",
         latitude=15.40, longitude=82.70, onstream_year=2014, status="ACTIVE",
         baseline_qi=8900.0, baseline_di=0.038, baseline_b=0.74,
         operating_cost_usd_m=6.3, intervention_cost_usd_m=1.8),
    dict(id="AS-03", name="Assam Fold Belt-03", field="Margherita", basin="Assam-Arakan Fold Belt",
         latitude=27.75, longitude=95.65, onstream_year=1988, status="ACTIVE",
         baseline_qi=1900.0, baseline_di=0.040, baseline_b=0.52,
         operating_cost_usd_m=1.7, intervention_cost_usd_m=0.55),
    dict(id="WB-01", name="Bengal WB-01", field="Bengal Basin Onshore", basin="Bengal",
         latitude=23.80, longitude=88.20, onstream_year=2003, status="DORMANT",
         baseline_qi=1400.0, baseline_di=0.050, baseline_b=0.45,
         operating_cost_usd_m=1.2, intervention_cost_usd_m=0.5),
    dict(id="MH-12", name="Mumbai High B-12", field="Mumbai High", basin="Mumbai Offshore",
         latitude=19.10, longitude=71.95, onstream_year=1990, status="ACTIVE",
         baseline_qi=4300.0, baseline_di=0.027, baseline_b=0.64,
         operating_cost_usd_m=3.8, intervention_cost_usd_m=1.0),
]

SEASONAL_FACTORS_DEFAULT = np.array(
    [1.02, 1.01, 0.99, 0.98, 0.97, 0.96, 0.98, 1.00, 1.03, 1.05, 1.04, 1.02]
)


def arps_rate(qi: float, di: float, b: float, t_months: float) -> float:
    if t_months <= 0:
        return qi
    if abs(b) < 1e-3:
        return qi * math.exp(-di * t_months)
    return qi / ((1.0 + b * di * t_months) ** (1.0 / b))


def generate_asset_history(
    asset_id: str,
    months: int | None = None,
    end_date: date | None = None,
    seed_offset: int = 0,
) -> list[dict]:
    """Deterministic synthetic monthly history ending at `end_date`.

    MH-07 gets an injected underperformance window over the last 8 months
    (the canonical demo anomaly). All rows are tagged source=SYNTHETIC.
    """
    months = months or settings.seed_history_months
    end_date = end_date or date.today().replace(day=1)
    catalog = next(a for a in CANONICAL_ASSETS if a["id"] == asset_id)
    rng = np.random.default_rng(settings.seed_random_seed + seed_offset)

    rows: list[dict] = []
    n = months
    # Absolute month index so dates step back correctly across years
    end_abs = end_date.year * 12 + (end_date.month - 1)
    for i in range(n):
        abs_month = end_abs - (n - 1 - i)
        period_year, period_month0 = divmod(abs_month, 12)
        month_index = period_month0
        period = date(period_year, period_month0 + 1, 1)
        t = float(i)

        expected = arps_rate(catalog["baseline_qi"], catalog["baseline_di"], catalog["baseline_b"], t)
        seasonal = SEASONAL_FACTORS_DEFAULT[month_index]
        noise = float(rng.normal(0.0, 0.035))

        actual = expected * seasonal * (1.0 + noise)

        # Canonical injected anomaly: MH-07 declines ~14% below expectation
        # across the final 8 months (ramping in), matching frontend narrative.
        months_from_end = n - 1 - i
        if asset_id == "MH-07" and months_from_end < 8:
            ramp = min(1.0, (8 - months_from_end) / 4.0)
            actual *= 1.0 - 0.155 * ramp

        actual = max(actual, catalog["baseline_qi"] * 0.08)
        gas = actual * float(rng.uniform(0.9, 1.2)) / 1000.0  # GOR-ish ratio, mmcf/d scale
        water_cut = float(np.clip(15.0 + t * 0.35 + rng.normal(0, 2.0), 0.0, 92.0))

        rows.append(dict(
            asset_id=asset_id,
            period=period.isoformat(),
            oil_bbl_d=round(actual, 1),
            expected_bbl_d=round(expected * seasonal, 1),
            gas_mmcf_d=round(gas, 2),
            water_cut_pct=round(water_cut, 1),
            source="SYNTHETIC",
        ))
    return rows


def generate_full_portfolio_history(months: int | None = None) -> list[dict]:
    all_rows: list[dict] = []
    for idx, asset in enumerate(CANONICAL_ASSETS):
        all_rows.extend(generate_asset_history(asset["id"], months=months, seed_offset=idx * 13))
    return all_rows


def load_public_csv(path: str) -> tuple[list[dict], dict]:
    """Load a real public-dataset CSV drop.

    Expected columns (case-insensitive): asset_id, period, oil_bbl_d;
    optional expected_bbl_d, gas_mmcf_d, water_cut_pct.

    Returns (rows, provenance_metadata). Rows are tagged source=REAL — callers
    must only feed genuine published data through this path.
    """
    import pandas as pd

    df = pd.read_csv(path)
    df.columns = [c.strip().lower() for c in df.columns]
    df["source"] = "REAL"
    rows = df.to_dict(orient="records")
    provenance = {
        "dataset_name": path.split("/")[-1].split("\\")[-1],
        "publisher": "OGD",
        "data_class": "REAL",
        "record_count": len(rows),
        "notes": f"Ingested from {path}",
    }
    return rows, provenance
