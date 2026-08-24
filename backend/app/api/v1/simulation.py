"""Simulation API endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import SimulationSession, SimulationResponse, ErrorResponse
from app.services.simulation_service import SimulationService

router = APIRouter(prefix="/simulation", tags=["simulation"])


class SimulationStartRequest(BaseModel):
    """Request to start a simulation."""
    asset_id: str
    scenario: str = "NORMAL"


class InjectAnomalyRequest(BaseModel):
    """Request to inject an anomaly into simulation."""
    severity: str = "ALERT"
    magnitude: float = 0.5


@router.post(
    "/start",
    response_model=SimulationResponse,
    summary="Start simulation",
    description="Start a new simulation session for an asset.",
    responses={
        200: {"description": "Simulation started successfully"},
        400: {"model": ErrorResponse, "description": "Invalid request"},
        404: {"model": ErrorResponse, "description": "Asset not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def start_simulation(
    request: SimulationStartRequest,
    db: Session = Depends(get_db),
) -> SimulationResponse:
    """Start a new simulation session."""
    try:
        from app.models import Asset
        
        asset = db.get(Asset, request.asset_id)
        if not asset:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="AssetNotFound",
                    message=f"Asset {request.asset_id} not found",
                    status_code=404,
                ).model_dump(),
            )
        
        simulation = SimulationService.start_simulation(db, request.asset_id, request.scenario)
        
        return SimulationResponse(
            simulation_id=simulation.id,
            asset_id=simulation.asset_id,
            scenario=simulation.scenario,
            created_at=simulation.created_at,
            status="RUNNING",
            ticks_sent=simulation.ticks_sent,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="SimulationStartError",
                message=f"Failed to start simulation: {str(e)}",
                status_code=500,
            ).model_dump(),
        )


@router.post(
    "/inject-anomaly",
    summary="Inject anomaly into simulation",
    description="Inject an anomaly event into an active simulation.",
    responses={
        200: {"description": "Anomaly injected successfully"},
        404: {"model": ErrorResponse, "description": "Simulation not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def inject_anomaly(
    simulation_id: str,
    request: InjectAnomalyRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Inject an anomaly into a simulation."""
    try:
        simulation = db.get(SimulationSession, simulation_id)
        if not simulation:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="SimulationNotFound",
                    message=f"Simulation {simulation_id} not found",
                    status_code=404,
                ).model_dump(),
            )
        
        # Update simulation with anomaly injection
        simulation.scenario = f"ANOMALY_{request.severity}"
        db.commit()
        
        return {
            "message": "Anomaly injected successfully",
            "simulation_id": simulation_id,
            "severity": request.severity,
            "magnitude": request.magnitude,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="AnomalyInjectionError",
                message=f"Failed to inject anomaly: {str(e)}",
                status_code=500,
            ).model_dump(),
        )


@router.post(
    "/pause",
    summary="Pause simulation",
    description="Pause an active simulation.",
    responses={
        200: {"description": "Simulation paused successfully"},
        404: {"model": ErrorResponse, "description": "Simulation not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def pause_simulation(
    simulation_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Pause a simulation."""
    try:
        simulation = db.get(SimulationSession, simulation_id)
        if not simulation:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="SimulationNotFound",
                    message=f"Simulation {simulation_id} not found",
                    status_code=404,
                ).model_dump(),
            )
        
        simulation.scenario = "PAUSED"
        db.commit()
        
        return {
            "message": "Simulation paused successfully",
            "simulation_id": simulation_id,
            "status": "PAUSED",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="SimulationPauseError",
                message=f"Failed to pause simulation: {str(e)}",
                status_code=500,
            ).model_dump(),
        )


@router.post(
    "/resume",
    summary="Resume simulation",
    description="Resume a paused simulation.",
    responses={
        200: {"description": "Simulation resumed successfully"},
        404: {"model": ErrorResponse, "description": "Simulation not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def resume_simulation(
    simulation_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Resume a paused simulation."""
    try:
        simulation = db.get(SimulationSession, simulation_id)
        if not simulation:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="SimulationNotFound",
                    message=f"Simulation {simulation_id} not found",
                    status_code=404,
                ).model_dump(),
            )
        
        simulation.scenario = "NORMAL"
        db.commit()
        
        return {
            "message": "Simulation resumed successfully",
            "simulation_id": simulation_id,
            "status": "RUNNING",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="SimulationResumeError",
                message=f"Failed to resume simulation: {str(e)}",
                status_code=500,
            ).model_dump(),
        )


@router.post(
    "/stop",
    summary="Stop simulation",
    description="Stop an active simulation.",
    responses={
        200: {"description": "Simulation stopped successfully"},
        404: {"model": ErrorResponse, "description": "Simulation not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def stop_simulation(
    simulation_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Stop a simulation."""
    try:
        success = SimulationService.stop_simulation(db, simulation_id)
        if not success:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="SimulationNotFound",
                    message=f"Simulation {simulation_id} not found",
                    status_code=404,
                ).model_dump(),
            )
        
        return {
            "message": "Simulation stopped successfully",
            "simulation_id": simulation_id,
            "status": "STOPPED",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="SimulationStopError",
                message=f"Failed to stop simulation: {str(e)}",
                status_code=500,
            ).model_dump(),
        )


@router.get(
    "/{simulation_id}",
    response_model=SimulationResponse,
    summary="Get simulation details",
    description="Retrieve details of a simulation session.",
    responses={
        200: {"description": "Simulation details retrieved successfully"},
        404: {"model": ErrorResponse, "description": "Simulation not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def get_simulation(
    simulation_id: str,
    db: Session = Depends(get_db),
) -> SimulationResponse:
    """Get simulation session details."""
    try:
        simulation = db.get(SimulationSession, simulation_id)
        if not simulation:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="SimulationNotFound",
                    message=f"Simulation {simulation_id} not found",
                    status_code=404,
                ).model_dump(),
            )
        
        return SimulationResponse(
            simulation_id=simulation.id,
            asset_id=simulation.asset_id,
            scenario=simulation.scenario,
            created_at=simulation.created_at,
            status="RUNNING" if simulation.scenario != "PAUSED" else "PAUSED",
            ticks_sent=simulation.ticks_sent,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="SimulationRetrievalError",
                message=f"Failed to retrieve simulation: {str(e)}",
                status_code=500,
            ).model_dump(),
        )
