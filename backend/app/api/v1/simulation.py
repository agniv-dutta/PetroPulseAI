"""Real-time simulation control endpoints.

Controls: start / pause / resume / stop / reset / inject anomaly.
All ML inference happens server-side; clients receive enriched results only.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.simulation_service import (
    SUPPORTED_SPEED_MULTIPLIERS,
    VALID_SCENARIO_LABELS,
    get_simulation_service,
)

router = APIRouter(prefix="/simulation", tags=["simulation"])

SERVICE = get_simulation_service()


class SimulationStartRequest(BaseModel):
    asset_id: str = Field(examples=["MH-07"])
    scenario: str = "NORMAL"
    speed_multiplier: float = 1.0
    duration_ticks: int | None = None
    interval_seconds: float | None = None
    seed: int | None = None


class InjectAnomalyRequest(BaseModel):
    scenario: str


@router.get("/scenarios")
async def list_scenarios() -> list[dict]:
    from app.utils.synthetic_generator import SCENARIOS

    return [
        {"id": s.name, "description": s.description, "window_ticks": s.window_ticks}
        for s in SCENARIOS.values()
    ]


@router.post("/start")
async def start_simulation(payload: SimulationStartRequest) -> dict:
    if payload.speed_multiplier not in SUPPORTED_SPEED_MULTIPLIERS:
        raise HTTPException(422, f"speed_multiplier must be one of {SUPPORTED_SPEED_MULTIPLIERS}")
    if payload.scenario.upper() not in [v.upper() for v in VALID_SCENARIO_LABELS]:
        raise HTTPException(422, f"scenario must be one of {sorted(set(VALID_SCENARIO_LABELS))}")
    try:
        return await SERVICE.start(
            asset_id=payload.asset_id,
            scenario=payload.scenario,
            speed_multiplier=payload.speed_multiplier,
            duration_ticks=payload.duration_ticks,
            interval_seconds=payload.interval_seconds,
            seed=payload.seed,
        )
    except KeyError as exc:
        raise HTTPException(404, str(exc))
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except RuntimeError as exc:
        raise HTTPException(429, str(exc))


@router.post("/sessions")
async def create_legacy_session(payload: SimulationStartRequest) -> dict:
    """Compatibility alias for clients using the original session API."""
    return await start_simulation(payload)


def _snapshot_or_404(result: dict | None) -> dict:
    if result is None:
        raise HTTPException(404, "unknown simulation session")
    return result


@router.post("/{simulation_id}/pause")
async def pause_simulation(simulation_id: str) -> dict:
    return _snapshot_or_404(await SERVICE.pause(simulation_id))


@router.post("/{simulation_id}/resume")
async def resume_simulation(simulation_id: str) -> dict:
    return _snapshot_or_404(await SERVICE.resume(simulation_id))


@router.post("/{simulation_id}/reset")
async def reset_simulation(simulation_id: str) -> dict:
    try:
        return _snapshot_or_404(await SERVICE.reset(simulation_id))
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(500, f"reset failed: {exc}")


@router.post("/{simulation_id}/inject-anomaly")
async def inject_anomaly(simulation_id: str, payload: InjectAnomalyRequest) -> dict:
    if payload.scenario.upper() not in [v.upper() for v in VALID_SCENARIO_LABELS]:
        raise HTTPException(422, f"scenario must be one of {sorted(set(VALID_SCENARIO_LABELS))}")
    try:
        return _snapshot_or_404(await SERVICE.inject_anomaly(simulation_id, payload.scenario))
    except ValueError as exc:
        raise HTTPException(422, str(exc))


@router.delete("/{simulation_id}")
async def stop_simulation(simulation_id: str) -> dict:
    await SERVICE.stop(simulation_id)
    return {"stopped": simulation_id}


@router.patch("/sessions/{simulation_id}")
async def update_legacy_session(simulation_id: str, scenario: str) -> dict:
    try:
        return _snapshot_or_404(await SERVICE.set_scenario(simulation_id, scenario))
    except ValueError as exc:
        raise HTTPException(422, str(exc))


@router.delete("/sessions/{simulation_id}")
async def stop_legacy_session(simulation_id: str) -> dict:
    return _snapshot_or_404(await SERVICE.stop(simulation_id))


@router.get("/{simulation_id}")
async def simulation_state(simulation_id: str) -> dict:
    run = SERVICE.get(simulation_id)
    if not run:
        raise HTTPException(404, "unknown simulation session")
    snap = run.snapshot()
    snap["last_ml"] = run.last_ml
    snap["scenario_canonical"] = run.generator.snapshot()["scenario"]
    return snap
