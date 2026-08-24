"""Unified data ingestion interface for PetroPulse AI.

Accepts REAL historical data, SYNTHETIC simulation output and DERIVED feature
sets from CSV files, JSON payloads or in-memory Pandas DataFrames, and
normalises everything into the canonical standard schema:

    required : asset_id, timestamp, production, source, source_type
    optional : pressure, temperature, flow_rate, valve_status

Design rules
------------
- Source-agnostic: public Indian datasets (OGD / PPAC / DGH / state portals /
  operator disclosures) are ingested through a configurable column map plus a
  generic alias table. No single source is hardcoded.
- Provenance is never guessed: `source_type` must either be present as a
  column or be declared explicitly by the caller (`default_source_type`).
  Anything outside REAL | SYNTHETIC | DERIVED is rejected.
- REAL DATA RULE: operational fields absent from the source dataset remain
  NULL. This layer NEVER fabricates pressure/temperature/flow values —
  synthetic telemetry is generated exclusively by the simulation pipeline
  (app/simulation/engine.py) and tagged SYNTHETIC at the point of creation.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

import pandas as pd

from app.utils.logger import logger

REQUIRED_COLUMNS = ("asset_id", "timestamp", "production", "source", "source_type")
OPTIONAL_COLUMNS = ("pressure", "temperature", "flow_rate", "valve_status")
STANDARD_COLUMNS = REQUIRED_COLUMNS + OPTIONAL_COLUMNS
SOURCE_TYPES = ("REAL", "SYNTHETIC", "DERIVED")

# Generic aliases so heterogeneous public datasets can be mapped without
# hardcoding any single publisher. Unit-bearing variants listed here match our
# canonical units only (bbl/d, bar, degC); other units must be converted via
# DataPreprocessor(unit_conversions=...) or mapped explicitly. Explicit
# `column_map` always wins over this table.
COLUMN_ALIASES: dict[str, tuple[str, ...]] = {
    "asset_id": (
        "asset_id", "asset", "asset_code", "assetcode", "code", "well",
        "well_id", "wellcode", "well_code", "field_asset_id", "block_id",
    ),
    "timestamp": (
        "timestamp", "date", "period", "time", "observation_date",
        "observation_time", "month", "reporting_date", "prod_date",
        "production_date",
    ),
    "production": (
        "production", "production_bbl_d", "oil_bbl_d", "oil_production",
        "oil_rate", "oil_bopd", "bbl_d", "net_production",
        "crude_oil_production", "oil_rate_bbl_d",
    ),
    "source": ("source", "dataset", "origin", "publisher"),
    "source_type": ("source_type", "data_class", "provenance", "provenance_class"),
    "pressure": ("pressure", "pressure_bar", "casing_pressure", "tubing_pressure"),
    "temperature": ("temperature", "temperature_c", "temp", "temp_c"),
    "flow_rate": ("flow_rate", "flow_rate_bbl_d", "liquid_rate", "total_liquid", "gross_fluid"),
    "valve_status": ("valve_status", "valve", "valve_state", "valve_position"),
}


class IngestionError(ValueError):
    """Raised when input data cannot be unambiguously normalised."""


@dataclass
class LoadedDataset:
    """A normalised dataset ready for preprocessing / persistence."""

    frame: pd.DataFrame
    source_name: str = "EXTERNAL"
    dataset_name: str = "unnamed-dataset"
    source_type: str = ""
    column_map: dict[str, str] = field(default_factory=dict)
    unmapped_columns: list[str] = field(default_factory=list)

    @property
    def row_count(self) -> int:
        return int(len(self.frame))


def _normalise_header(name: Any) -> str:
    """Lowercase, snake-case and unit-annotate: 'Oil Rate (bbl/d)' -> 'oil_rate_bbl_d'."""
    import re

    cleaned = str(name).strip().lower()
    cleaned = cleaned.replace(" ", "_").replace("-", "_")
    cleaned = re.sub(r"[^a-z0-9_]", "_", cleaned)
    cleaned = re.sub(r"_+", "_", cleaned)
    return cleaned.strip("_")


def resolve_column_map(
    columns: Sequence[str],
    column_map: Mapping[str, str] | None = None,
) -> dict[str, str]:
    """Build {standard_column -> raw_column} from explicit map + alias table.

    Raises IngestionError when a required standard column cannot be resolved.
    """
    normalised = {_normalise_header(c): c for c in columns}
    resolved: dict[str, str] = {}

    if column_map:
        for std, raw in column_map.items():
            key = _normalise_header(std)
            if key not in STANDARD_COLUMNS:
                raise IngestionError(f"unknown standard column '{std}' in column_map")
            if raw not in columns:
                raise IngestionError(f"column_map target '{raw}' not found in input columns")
            resolved[key] = raw

    for std in STANDARD_COLUMNS:
        if std in resolved:
            continue
        for alias in COLUMN_ALIASES.get(std, ()):  # alias tables are lowercase
            if alias in normalised:
                resolved[std] = normalised[alias]
                break

    missing = [c for c in ("asset_id", "timestamp", "production") if c not in resolved]
    if missing:
        raise IngestionError(
            f"cannot resolve required column(s) {missing}; "
            f"provide an explicit column_map. Available: {sorted(map(str, columns))}"
        )
    return resolved


def _validate_declared_source_type(declared: str | None) -> str | None:
    """Provenance must be declared explicitly - it is never inferred."""
    if declared is None:
        return None
    st = declared.strip().upper()
    if st not in SOURCE_TYPES:
        raise IngestionError(
            f"default_source_type must be one of {SOURCE_TYPES}, got '{declared}'"
        )
    return st


def _build_frame(
    df: pd.DataFrame,
    *,
    column_map: Mapping[str, str] | None = None,
    default_source_type: str | None = None,
    source_name: str | None = None,
    dataset_name: str | None = None,
) -> LoadedDataset:
    if df.empty:
        raise IngestionError("input contains no rows")

    resolved = resolve_column_map(df.columns, column_map)
    out = pd.DataFrame(index=df.index)
    for std in STANDARD_COLUMNS:
        raw = resolved.get(std)
        out[std] = df[raw] if raw is not None else None

    # Required field coercion
    out["asset_id"] = out["asset_id"].astype(str).str.strip()
    out["timestamp"] = pd.to_datetime(out["timestamp"], errors="coerce", utc=True)
    out["production"] = pd.to_numeric(out["production"], errors="coerce")

    # Optional operational fields stay numeric-or-NULL. NEVER fabricated here.
    for col in ("pressure", "temperature", "flow_rate"):
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce")
    if "valve_status" in resolved:
        vs = out["valve_status"].astype("object")
        out["valve_status"] = vs.where(
            vs.notna() & (vs.astype(str).str.strip() != "") & (vs.astype(str).str.lower() != "nan"),
            None,
        )

    # Provenance: explicit column wins over a declared default; ambiguity fails.
    declared_source_type = _validate_declared_source_type(default_source_type)
    if "source_type" in resolved:
        raw_st = out["source_type"].astype("object")
        raw_st = raw_st.where(raw_st.notna(), None)
        normalised = raw_st.map(
            lambda v: v.strip().upper() if isinstance(v, str) and v.strip() else None
        )
        present = {v for v in normalised if v is not None}
        invalid = sorted(present - set(SOURCE_TYPES))
        if invalid:
            raise IngestionError(
                f"invalid source_type value(s) {invalid}; must be one of {SOURCE_TYPES}"
            )
        if len(present) > 1:
            raise IngestionError(
                f"mixed source_type values {sorted(present)} are ambiguous; "
                "split the dataset by provenance before ingesting"
            )
        if present:
            out["source_type"] = next(iter(present))
        elif declared_source_type is None:
            raise IngestionError(
                "source_type column present but empty; pass default_source_type"
            )
        else:
            out["source_type"] = declared_source_type
    else:
        if declared_source_type is None:
            raise IngestionError(
                "no source_type column and no default_source_type given; "
                "data provenance would be ambiguous"
            )
        out["source_type"] = declared_source_type

    if "source" in resolved:
        src = out["source"].astype("object")
        out["source"] = src.where(src.notna() & (src.astype(str).str.strip() != ""), None)
    else:
        out["source"] = None

    loaded = LoadedDataset(
        frame=out[list(STANDARD_COLUMNS)],
        source_name=source_name or "EXTERNAL",
        dataset_name=dataset_name or "unnamed-dataset",
        source_type=str(out["source_type"].iloc[0]),
        column_map={k: v for k, v in resolved.items()},
        unmapped_columns=[
            str(c) for c in df.columns if c not in set(resolved.values())
        ],
    )
    logger.info(
        "loaded %d rows (%s) from '%s'; optional columns present: %s",
        loaded.row_count,
        loaded.source_type,
        loaded.dataset_name,
        [c for c in OPTIONAL_COLUMNS if resolved.get(c)],
    )
    return loaded


def _read_csv(source: str | Path, **kwargs: Any) -> pd.DataFrame:
    return pd.read_csv(source, **kwargs)


def load_any(
    source: "pd.DataFrame | Sequence[dict] | str | Path",
    *,
    column_map: Mapping[str, str] | None = None,
    default_source_type: str | None = None,
    source_name: str | None = None,
    dataset_name: str | None = None,
    csv_kwargs: Mapping[str, Any] | None = None,
) -> LoadedDataset:
    """Dispatch on input kind: DataFrame, record list/dict, CSV path or JSON."""
    if isinstance(source, pd.DataFrame):
        return _build_frame(
            source,
            column_map=column_map,
            default_source_type=default_source_type,
            source_name=source_name,
            dataset_name=dataset_name,
        )

    if isinstance(source, Mapping):
        return _build_frame(
            pd.DataFrame([dict(source)]),
            column_map=column_map,
            default_source_type=default_source_type,
            source_name=source_name,
            dataset_name=dataset_name,
        )

    if isinstance(source, Sequence):
        if all(isinstance(r, Mapping) for r in source):
            return _build_frame(
                pd.DataFrame(list(source)),
                column_map=column_map,
                default_source_type=default_source_type,
                source_name=source_name,
                dataset_name=dataset_name,
            )
        raise IngestionError("record sequence items must be mappings (dicts)")

    path = Path(str(source))
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return _build_frame(
            _read_csv(path, **(csv_kwargs or {})),
            column_map=column_map,
            default_source_type=default_source_type,
            source_name=source_name,
            dataset_name=dataset_name or path.name,
        )
    if suffix == ".json":
        with open(path, encoding="utf-8") as fh:
            payload = json.load(fh)
        return _build_frame(
            pd.DataFrame(_unwrap_json(payload)),
            column_map=column_map,
            default_source_type=default_source_type,
            source_name=source_name,
            dataset_name=dataset_name or path.name,
        )
    raise IngestionError(f"unsupported file type '{suffix}'; use CSV or JSON")


def _unwrap_json(payload: Any) -> list[dict]:
    """Accept bare lists, {"records": [...]}, {"data": [...]} or NDJSON text."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, Mapping):
        for key in ("records", "data", "rows", "items"):
            if isinstance(payload.get(key), list):
                return payload[key]
    raise IngestionError("JSON payload must be a list of objects or contain records/data/rows/items")


def from_csv(path: str | Path, **kwargs: Any) -> LoadedDataset:
    """Load a REAL historical CSV drop (e.g. a published public dataset)."""
    return load_any(path, **kwargs)


def from_records(records: Sequence[dict], **kwargs: Any) -> LoadedDataset:
    """Load JSON-style records (list of dicts)."""
    return load_any(records, **kwargs)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# Backwards-compatible aliases used elsewhere in the codebase.
UnifiedLoader = load_any
