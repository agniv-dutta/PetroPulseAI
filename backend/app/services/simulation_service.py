"""Simulation service for business logic."""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
import uuid

from app.models import SimulationSession


class SimulationService:
    """Service for simulation business logic."""

    @staticmethod
    def start_simulation(db: Session, asset_id: str, scenario: str) -> SimulationSession:
        """Start a new simulation session."""
        simulation = SimulationSession(
            id=str(uuid.uuid4()),
            asset_id=asset_id,
            scenario=scenario,
            created_at=datetime.now(timezone.utc),
            ticks_sent=0,
        )
        db.add(simulation)
        db.commit()
        db.refresh(simulation)
        return simulation

    @staticmethod
    def update_simulation(db: Session, session_id: str, scenario: str) -> SimulationSession | None:
        """Update simulation scenario."""
        simulation = db.get(SimulationSession, session_id)
        if simulation:
            simulation.scenario = scenario
            db.commit()
            db.refresh(simulation)
        return simulation

    @staticmethod
    def stop_simulation(db: Session, session_id: str) -> bool:
        """Stop a simulation session."""
        simulation = db.get(SimulationSession, session_id)
        if simulation:
            db.delete(simulation)
            db.commit()
            return True
        return False

    @staticmethod
    def get_simulation(db: Session, session_id: str) -> SimulationSession | None:
        """Get simulation session details."""
        return db.get(SimulationSession, session_id)

    @staticmethod
    def increment_tick(db: Session, session_id: str) -> bool:
        """Increment tick count for a simulation."""
        simulation = db.get(SimulationSession, session_id)
        if simulation:
            simulation.ticks_sent += 1
            db.commit()
            return True
        return False
