"""Idempotent seeding of the canonical PetroPulse AI schema.

DATA HONESTY
-------------
Everything written by this module is SYNTHETIC demonstration content:
deterministic reconstructions generated from Arps decline parameters. It is
never real operator telemetry and must never be presented as such. The
data_sources catalogue seeded alongside it documents where REAL public data
would come from (OGD / PPAC / DGH) versus what is SYNTHETIC or DERIVED here.
"""

import zlib
from datetime import date, datetime, timezone

import numpy as np
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ingestion.catalog import (
    CANONICAL_ASSETS,
    SEASONAL_FACTORS_DEFAULT,
    arps_rate,
    generate_full_portfolio_history,
)
from app.models import (
    AIPSScore,
    Anomaly,
    Asset,
    DataSource,
    Forecast,
    Intervention,
    ModelMetric,
    ModelVersion,
    ProductionHistory,
    Simulation,
    SimulationObservation,
)

SYNTHETIC_SOURCE_LABEL = "petropulse-synthetic-generator-v1"

_MODEL_VERSIONS = [
    ("MOD-01", "Forecasting Engine", "v1", "Production Forecast",
     "Gradient Boosting + Arps Hybrid"),
    ("MOD-02", "Anomaly Detector", "v1", "Anomaly Detection", "Isolation Forest"),
    ("MOD-03", "Loss Attribution", "v1", "Feature Attribution", "SHAP TreeExplainer"),
    ("ENG-01", "Prioritization Engine", "v1", "Asset Ranking", "AIPS Composite Scoring"),
]

_DATA_SOURCES = [
    ("OGD", "REAL", "India Petroleum Production (field-level monthly aggregates)",
     "Published open-government aggregates used only as reference context.",
     "India, field-level, monthly", "Monthly",
     "https://data.gov.in"),
    ("PPAC", "REAL", "PPAC Petroleum Planning & Analysis Monthly Data",
     "Published ministry-level monthly summaries; reference context only.",
     "India, national/state, monthly", "Monthly",
     "https://ppac.gov.in"),
    ("DGH", "REAL", "DGH Directorate General of Hydrocarbons Annual Reports",
     "Published annual upstream performance reports; reference context only.",
     "India, block/field, annual", "Annual",
     "https://dgh.gov.in"),
    ("PetroPulse Internal", "SYNTHETIC", "Synthetic Portfolio Telemetry Generator v1",
     "Deterministic Arps-seeded synthetic telemetry for demonstration. "
     "NOT real operator/SCADA telemetry.",
     "12 demo assets, monthly, 36 months", "On seed",
     None),
    ("PetroPulse Models", "DERIVED", "Model Outputs (forecasts/anomalies/AIPS)",
     "All rows produced by PetroPulse ML pipelines over SYNTHETIC inputs.",
     "Per analysed asset", "On analysis",
     None),
]

_DEMO_INTERVENTIONS = [
    ("MH-07", "GAS_LIFT_VALVE_REPLACEMENT", (2026, 9, 15), None, 0.42, None, None,
     "SYNTHETIC demo plan: replace failed gas-lift valve to arrest ~15% underperformance."),
    ("CB-12", "ACID_STIMULATION", (2026, 5, 10), (2026, 5, 12), 0.18, 0.21, True,
     "SYNTHETIC demo record: matrix acid stimulation executed ahead of schedule."),
]


def _telemetry_fields(spec: dict, row: dict) -> dict:
    """Deterministic pressure/temperature/flow around a history row."""
    month = int(row["period"][5:7])
    ratio = float(row["oil_bbl_d"]) / max(float(spec["baseline_qi"]), 1e-9)
    rng = np.random.default_rng(
        settings.seed_random_seed + zlib.crc32(spec["id"].encode("utf-8"))
    )
    pressure = float(np.clip(
        150.0 + 60.0 * ratio ** 0.8 + float(rng.normal(0.0, 2.5)), 120.0, 250.0
    ))
    temperature = float(np.clip(
        78.0 + 6.0 * np.sin(2 * np.pi * month / 12.0) + float(rng.normal(0.0, 1.2)), 55.0, 95.0
    ))
    flow_rate = float(row["oil_bbl_d"]) * float(np.clip(1.0 + float(rng.normal(0.0, 0.02)), 0.9, 1.1))
    return {
        "pressure": round(pressure, 1),
        "temperature": round(temperature, 1),
        "flow_rate": round(flow_rate, 1),
        "valve_status": "OPEN",
    }


def _wipe(db: Session) -> None:
    """Delete all application rows (children before parents)."""
    for model in (
        SimulationObservation, Simulation, Intervention, ModelMetric,
        AIPSScore, Anomaly, Forecast, ProductionHistory, DataSource,
        ModelVersion, Asset,
    ):
        db.execute(delete(model))
    db.flush()


def seed_database(db: Session, force: bool = False) -> dict:
    counts: dict[str, int] = {}

    existing_assets = db.scalar(select(func.count()).select_from(Asset)) or 0
    if existing_assets and not force:
        return {"seeded": False, "reason": "database already contains assets", **counts}

    if force:
        _wipe(db)

    # --- assets -------------------------------------------------------------
    for spec in CANONICAL_ASSETS:
        db.add(Asset(
            asset_id=spec["id"],
            field_name=spec["field"],
            basin=spec["basin"],
            status="ACTIVE" if spec["status"] == "ACTIVE" else spec["status"],
            latitude=spec["latitude"],
            longitude=spec["longitude"],
        ))
    counts["assets"] = len(CANONICAL_ASSETS)

    # --- production history (explicitly SYNTHETIC) --------------------------
    specs_by_code = {a["id"]: a for a in CANONICAL_ASSETS}
    history_rows = generate_full_portfolio_history(settings.seed_history_months)
    for row in history_rows:
        spec = specs_by_code[row["asset_id"]]
        db.add(ProductionHistory(
            asset_id=row["asset_id"],
            timestamp=datetime.fromisoformat(row["period"]).replace(tzinfo=timezone.utc),
            production=float(row["oil_bbl_d"]),
            **_telemetry_fields(spec, row),
            source=SYNTHETIC_SOURCE_LABEL,
            source_type="SYNTHETIC",
        ))
    counts["production_rows"] = len(history_rows)

    # --- data source catalogue ----------------------------------------------
    for source_name, stype, dataset, desc, coverage, freq, url in _DATA_SOURCES:
        db.add(DataSource(
            source_name=source_name,
            source_type=stype,
            dataset_name=dataset,
            description=desc,
            coverage=coverage,
            update_frequency=freq,
            url=url,
        ))
    counts["data_sources"] = len(_DATA_SOURCES)

    # --- model registry -------------------------------------------------------
    for code, name, version, task, algorithm in _MODEL_VERSIONS:
        db.add(ModelVersion(
            code=code, model_name=name, version=version, task=task,
            algorithm=algorithm, status="READY",
            notes="Demo registry entry; metrics are produced over SYNTHETIC data.",
        ))
    counts["model_versions"] = len(_MODEL_VERSIONS)

    # --- interventions --------------------------------------------------------
    today = date.today()
    for code, itype, planned, executed, pred, actual, success, notes in _DEMO_INTERVENTIONS:
        planned_date = date(*planned) if planned else today
        executed_date = date(*executed) if executed else None
        if executed_date is not None and executed_date > today:
            executed_date, success, actual = None, None, None
        db.add(Intervention(
            asset_id=code,
            intervention_type=itype,
            planned_date=min(planned_date, today),
            executed_date=executed_date,
            predicted_recovery=pred,
            actual_recovery=actual,
            success=success,
            notes=notes + " Synthetic demonstration values only.",
        ))
    counts["interventions"] = len(_DEMO_INTERVENTIONS)

    db.commit()
    return {"seeded": True, **counts}


def expected_series(code: str, timestamps: list[datetime]) -> list[float]:
    """Reconstruct the seasonal Arps expectation for stored history rows.

    The expectation is a DERIVED quantity computed from the canonical demo
    parameters; it is intentionally not stored in production_history so that
    measured vs expected can never be confused in provenance terms.
    """
    from app.ingestion.catalog import CANONICAL_ASSETS

    spec = next((a for a in CANONICAL_ASSETS if a["id"] == code), None)
    out: list[float] = []
    for i, ts in enumerate(timestamps):
        if spec is None:
            out.append(0.0)
            continue
        expected = arps_rate(spec["baseline_qi"], spec["baseline_di"], spec["baseline_b"], float(i))
        seasonal = float(SEASONAL_FACTORS_DEFAULT[ts.month - 1])
        out.append(expected * seasonal)
    return out


def ensure_seeded(db: Session) -> dict:
    from app.core.database import Base, engine

    Base.metadata.create_all(bind=engine)
    return seed_database(db)
