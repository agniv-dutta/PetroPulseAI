"""PetroPulse AI backend entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.api.v1 import (
    aips,
    anomaly,
    assets,
    data,
    forecast,
    health,
    intel,
    metrics,
    shap,
    simulation,
    system,
)
from app.core.config import settings
from app.core.database import SessionLocal, init_db
from app.ingestion.seed import seed_database
from app.intelligence.pipeline import warm_cache
from app.services.simulation_service import get_simulation_service
from app.utils.logger import logger, setup_logger

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

# Prometheus metrics (gracefully skipped if package not installed)
try:
    from prometheus_fastapi_instrumentator import Instrumentator

    Instrumentator().instrument(app).expose(app, endpoint="/metrics")
except ImportError:
    pass

# --------------------------------------------------------------------------
# Routers
# --------------------------------------------------------------------------
for router in (
    assets.router,
    forecast.router,
    anomaly.router,
    aips.router,
    shap.router,
    intel.router,
    metrics.router,
    simulation.router,
    system.router,
    data.router,
    health.router,
):
    app.include_router(router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["system"])
def root_health() -> dict:
    """Root-level liveness probe (the spec'd /api/v1/health reports deps)."""
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.version,
        "active_simulations": get_simulation_service().active_count,
    }


# --------------------------------------------------------------------------
# Error envelopes (400 / 404 / 422 / 500 / 503 share one shape)
# --------------------------------------------------------------------------
def _error(error: str, message: str, status_code: int, details=None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": error,
            "message": message,
            "status_code": status_code,
            "details": details,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return _error(
        "validation_error",
        "request payload failed validation",
        422,
        details=[
            {"loc": [str(p) for p in err.get("loc", [])],
             "msg": err.get("msg"),
             "type": err.get("type")}
            for err in exc.errors()
        ],
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    names = {400: "bad_request", 404: "not_found", 409: "conflict", 422: "validation_error"}
    return _error(names.get(exc.status_code, "http_error"), str(exc.detail), exc.status_code)


@app.exception_handler(OperationalError)
async def database_unavailable_handler(request: Request, exc: OperationalError):
    logger.error("database unavailable: %s", exc)
    return _error("database_unavailable", "the database is not reachable", 503)


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    logger.exception("unhandled error on %s %s", request.method, request.url.path)
    return _error("internal_error", "an unexpected server error occurred", 500)


# --------------------------------------------------------------------------
# Simulation WebSocket
# --------------------------------------------------------------------------
@app.websocket("/ws/simulation/{session_id}")
async def simulation_ws(websocket: WebSocket, session_id: str) -> None:
    service = get_simulation_service()
    await websocket.accept()
    if not service.get(session_id):
        await websocket.send_json({
            "type": "error",
            "simulation_id": session_id,
            "message": f"unknown session {session_id}",
        })
        await websocket.close(code=4404)
        return

    await service.attach(websocket, session_id)   # emits simulation_started
    try:
        while True:
            message = await websocket.receive_text()
            if message.startswith("SET_SCENARIO:"):
                scenario = message.split(":", 1)[1]
                snap = await service.inject_anomaly(session_id, scenario)
                if snap:
                    await websocket.send_json({
                        "type": "scenario_changed",
                        "simulation_id": session_id,
                        "data": {"scenario": scenario},
                    })
                else:
                    await websocket.send_json({
                        "type": "error",
                        "simulation_id": session_id,
                        "message": "unknown session",
                    })
            elif message == "PING":
                await websocket.send_json({"type": "pong", "simulation_id": session_id})
    except WebSocketDisconnect:
        pass
    finally:
        service.detach(websocket, session_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
