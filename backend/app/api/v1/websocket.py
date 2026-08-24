"""WebSocket endpoint for real-time simulation updates."""

from datetime import datetime, timezone
import random
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import SimulationTelemetry, SimulationEvent, ErrorResponse
from app.services.simulation_service import SimulationService

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Manager for WebSocket connections."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, simulation_id: str):
        """Accept a WebSocket connection."""
        await websocket.accept()
        self.active_connections[simulation_id] = websocket

    def disconnect(self, simulation_id: str):
        """Remove a WebSocket connection."""
        if simulation_id in self.active_connections:
            del self.active_connections[simulation_id]

    async def send_personal_message(self, message: dict, simulation_id: str):
        """Send a message to a specific simulation."""
        if simulation_id in self.active_connections:
            await self.active_connections[simulation_id].send_json(message)

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected simulations."""
        for connection in self.active_connections.values():
            await connection.send_json(message)


manager = ConnectionManager()


@router.websocket("/ws/simulation/{simulation_id}")
async def websocket_simulation_endpoint(websocket: WebSocket, simulation_id: str):
    """WebSocket endpoint for real-time simulation updates with telemetry and event messages."""
    await manager.connect(websocket, simulation_id)
    
    try:
        # Send connection established event
        await websocket.send_json(
            SimulationEvent(
                type="simulation_started",
                timestamp=datetime.now(timezone.utc),
                simulation_id=simulation_id,
                message="WebSocket connection established",
                data={"status": "connected"},
            ).model_dump()
        )

        # Simulate telemetry data stream
        tick_count = 0
        while True:
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif data.get("type") == "get_status":
                await websocket.send_json({
                    "type": "status",
                    "simulation_id": simulation_id,
                    "connected": True,
                })
            elif data.get("type") == "subscribe_telemetry":
                # Start sending telemetry data
                tick_count += 1
                await websocket.send_json(
                    SimulationTelemetry(
                        type="telemetry",
                        timestamp=datetime.now(timezone.utc),
                        asset_id=f"ASSET-{random.randint(1, 10)}",
                        source_type="SYNTHETIC",
                        production=random.uniform(1000, 5000),
                        pressure=random.uniform(1000, 3000),
                        temperature=random.uniform(50, 150),
                        flow_rate=random.uniform(100, 500),
                        forecast=random.uniform(1000, 5000),
                        anomaly_score=random.uniform(0, 1),
                        severity=random.choice(["NORMAL", "WATCH", "ALERT", "CRITICAL"]),
                        aips_score=random.uniform(0, 1),
                        priority=random.choice(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
                        recovery_opportunity=random.uniform(0, 100),
                        confidence=random.uniform(0.5, 1.0),
                    ).model_dump()
                )
            elif data.get("type") == "inject_anomaly":
                # Send anomaly injection event
                await websocket.send_json(
                    SimulationEvent(
                        type="anomaly_injected",
                        timestamp=datetime.now(timezone.utc),
                        simulation_id=simulation_id,
                        message="Anomaly injected into simulation",
                        data={"severity": data.get("severity", "ALERT")},
                    ).model_dump()
                )
            elif data.get("type") == "change_priority":
                # Send priority change event
                await websocket.send_json(
                    SimulationEvent(
                        type="priority_changed",
                        timestamp=datetime.now(timezone.utc),
                        simulation_id=simulation_id,
                        message="Priority changed",
                        data={"new_priority": data.get("priority", "HIGH")},
                    ).model_dump()
                )

    except WebSocketDisconnect:
        manager.disconnect(simulation_id)
        # Send simulation stopped event
        try:
            await websocket.send_json(
                SimulationEvent(
                    type="simulation_stopped",
                    timestamp=datetime.now(timezone.utc),
                    simulation_id=simulation_id,
                    message="Simulation stopped",
                ).model_dump()
            )
        except:
            pass  # Connection already closed
    except Exception as e:
        # Send error event
        try:
            await websocket.send_json(
                SimulationEvent(
                    type="error",
                    timestamp=datetime.now(timezone.utc),
                    simulation_id=simulation_id,
                    message=f"WebSocket error: {str(e)}",
                ).model_dump()
            )
        except:
            pass
        manager.disconnect(simulation_id)
