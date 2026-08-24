"""PetroPulse AI backend entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import assets, data, forecast, intel, simulation, system
from app.core.config import settings
from app.core.database import SessionLocal, init_db
from app.ingestion.seed import seed_database
from app.intelligence.pipeline import warm_cache
from app.services.simulation_service import get_simulation_service
from app.utils.logger import setup_logger

logger = setup_logger("petropulse")


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_simulation_service()
    init_db()
    db = SessionLocal()
    try:
        result = seed_database(db)
        logger.info("seed: %s", result)
        if settings.warm_cache_on_startup:
            warmed = warm_cache(db)
            logger.info("portfolio cache warmed for %d assets", warmed)
    finally:
        db.close()
    yield
    await get_simulation_service().shutdown_all()


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assets.router, prefix=settings.api_v1_prefix)
app.include_router(data.router, prefix=settings.api_v1_prefix)
app.include_router(forecast.router, prefix=settings.api_v1_prefix)
app.include_router(intel.router, prefix=settings.api_v1_prefix)
app.include_router(system.router, prefix=settings.api_v1_prefix)
app.include_router(simulation.router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["system"])
def health() -> dict:
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.version,
        "active_simulations": get_simulation_service().active_count,
    }


@app.websocket("/ws/simulation/{session_id}")
async def simulation_ws(websocket: WebSocket, session_id: str) -> None:
    service = get_simulation_service()
    await websocket.accept()
    if not service.get(session_id):
        await websocket.send_json({"type": "error", "message": f"unknown session {session_id}"})
        await websocket.close(code=4404)
        return

    await service.attach(websocket, session_id)
    try:
        while True:
            message = await websocket.receive_text()
            if message.startswith("SET_SCENARIO:"):
                scenario = message.split(":", 1)[1]
                snap = await service.set_scenario(session_id, scenario)
                if snap:
                    await websocket.send_json({
                        "type": "scenario_changed", "data": {"scenario": scenario},
                    })
                else:
                    await websocket.send_json({"type": "error", "message": "unknown session"})
            elif message == "PING":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        service.detach(websocket, session_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
