"""Real-time synthetic simulation service.

Orchestrates the full per-observation pipeline:

    Synthetic Generator -> Feature Engineering -> Forecast
      -> Anomaly Detection -> Recovery Calculation -> AIPS
      -> Database -> WebSocket

The FRONTEND ONLY RECEIVES RESULTS - all ML inference happens here.

Honesty: every observation is SYNTHETIC (source_type="SYNTHETIC",
simulation=true). This is a demonstration streaming engine, not operator
SCADA feeds.

Controls: start / pause / resume / stop / reset / inject anomaly.
State (status, scenario, speed) is persisted to the `simulations` table;
observations (with anomaly + AIPS scores) persist to `simulation_observations`.

Concurrency: each run owns its private generator, fitted models, feature
buffer and WebSocket client set. Runs share nothing mutable, so any number of
simulations can stream concurrently without state bleed.
"""

from __future__ import annotations

import asyncio
import uuid
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.intelligence.pipeline import _CATALOG_BY_CODE, _expected_values
from app.ml.anomaly import ProductionAnomalyDetector, build_feature_frame, severity_for_score
from app.ml.arps import fit_arps
from app.ml.forecast import ProductionForecaster
from app.models import Asset, ProductionHistory, Simulation, SimulationObservation, SimulationStatus
from app.services.aips_service import AIPSInput, calculate_aips
from app.services.recovery_service import estimate_recovery_opportunity
from app.utils.logger import logger
from app.utils.synthetic_generator import (
    SCENARIOS,
    SUPPORTED_SPEED_MULTIPLIERS,
    VALID_SCENARIO_LABELS,
    SyntheticGenerator,
    resolve_scenario,
)

_MAX_TICK = 10_000  # absolute safety cap per run


@dataclass
class RunConfig:
    asset_id: str
    scenario_label: str          # raw label as supplied (aliases preserved)
    canonical_scenario: str
    speed_multiplier: float
    interval_seconds: float      # simulated seconds between observations
    wall_interval_seconds: float # real seconds between ticks (interval/speed)
    duration_ticks: int | None
    seed: int | None


@dataclass
class SimulationRun:
    simulation_id: str
    config: RunConfig
    generator: SyntheticGenerator
    clients: set[WebSocket] = field(default_factory=set)
    ticks_sent: int = 0
    task: asyncio.Task | None = None
    status: str = SimulationStatus.RUNNING.value
    # ML assets (private per run - never shared across simulations)
    forecaster: ProductionForecaster | None = None
    detector: ProductionAnomalyDetector | None = None
    buffer: deque = field(default_factory=deque)
    complexity: float = 0.5
    last_ml: dict = field(default_factory=dict)
    last_priority: str | None = None

    def snapshot(self) -> dict:
        return {
            "session_id": self.simulation_id,
            "asset_id": self.config.asset_id,
            "scenario": self.config.scenario_label,
            "status": self.status,
            "speed_multiplier": self.config.speed_multiplier,
            "interval_seconds": self.config.interval_seconds,
            "duration_ticks": self.config.duration_ticks,
            "seed": self.config.seed,
            "ticks_sent": self.ticks_sent,
            "clients": len(self.clients),
            "sim_time_seconds": self.generator.snapshot()["sim_time_seconds"],
        }


class SimulationService:
    """Owns every live simulation run and the full inference pipeline."""

    def __init__(self) -> None:
        self._runs: dict[str, SimulationRun] = {}
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------- registry
    @property
    def active_count(self) -> int:
        return sum(1 for r in self._runs.values() if r.status == SimulationStatus.RUNNING.value)

    def get(self, simulation_id: str) -> SimulationRun | None:
        return self._runs.get(simulation_id)

    async def shutdown_all(self) -> None:
        for sid in list(self._runs):
            await self.stop(sid)

    # ------------------------------------------------------------ ML set-up
    def _prepare_models(self, run: SimulationRun) -> None:
        code = run.config.asset_id
        db = SessionLocal()
        try:
            history = (
                db.execute(
                    select(ProductionHistory)
                    .where(ProductionHistory.asset_id == code)
                    .order_by(ProductionHistory.timestamp.asc())
                )
                .scalars()
                .all()
            )
        finally:
            db.close()

        timestamps = [h.timestamp for h in history]
        values = [float(h.production) for h in history]
        expected_values = _expected_values(code, timestamps, values)

        arps_result = fit_arps(values)
        spec = _CATALOG_BY_CODE.get(code)
        metadata = (
            {
                "onstream_year": spec["onstream_year"],
                "intervention_cost_usd_m": spec["intervention_cost_usd_m"],
            }
            if spec else None
        )

        run.forecaster = ProductionForecaster(random_state=42)
        run.forecaster.fit(
            values,
            arps_params={"qi": arps_result.qi, "di": arps_result.di, "b": arps_result.b},
            asset_metadata=metadata,
        )
        run.complexity = min(
            max(0.3 + (spec["intervention_cost_usd_m"] if spec else 1.0) / 4.0, 0.0), 1.0
        )

        hist_dicts = [
            {
                "period": ts.date().isoformat(),
                "oil_bbl_d": value,
                "expected_bbl_d": exp,
            }
            for ts, value, exp in zip(timestamps, values, expected_values)
        ]
        run.detector = ProductionAnomalyDetector().fit(hist_dicts)
        run.buffer = deque(hist_dicts[-14:], maxlen=64)

    # ------------------------------------------------------------- controls
    async def start(
        self,
        *,
        asset_id: str,
        scenario: str = "NORMAL",
        speed_multiplier: float = 1.0,
        interval_seconds: float | None = None,
        duration_ticks: int | None = None,
        seed: int | None = None,
        simulation_id: str | None = None,
    ) -> dict:
        if speed_multiplier not in SUPPORTED_SPEED_MULTIPLIERS:
            raise ValueError(f"speed_multiplier must be one of {SUPPORTED_SPEED_MULTIPLIERS}")
        if resolve_scenario(scenario) not in SCENARIOS:
            raise ValueError(f"scenario must be one of {sorted(SCENARIOS)}")

        asset_ok = False
        db = SessionLocal()
        try:
            asset_ok = (
                db.execute(select(Asset.asset_id).where(Asset.asset_id == asset_id).limit(1))
                .scalar()
                is not None
            )
        finally:
            db.close()
        if not asset_ok:
            raise KeyError(f"unknown asset {asset_id}")

        async with self._lock:
            if len([r for r in self._runs.values() if r.status == "RUNNING"]) >= settings.simulation_max_sessions:
                raise RuntimeError("max concurrent simulation sessions reached")

            interval = float(interval_seconds or settings.simulation_tick_seconds * 30.44 * 60)
            sim_id = simulation_id or uuid.uuid4().hex[:12]
            config = RunConfig(
                asset_id=asset_id,
                scenario_label=scenario,
                canonical_scenario=resolve_scenario(scenario),
                speed_multiplier=float(speed_multiplier),
                interval_seconds=interval,
                wall_interval_seconds=max(interval / float(speed_multiplier), 0.05),
                duration_ticks=min(duration_ticks or settings.simulation_duration_default_ticks, _MAX_TICK),
                seed=seed,
            )
            baseline = self._load_baseline(asset_id)
            generator = SyntheticGenerator(
                asset_id,
                baseline,
                scenario=config.canonical_scenario,
                interval_seconds=config.interval_seconds,
                seed=seed,
            )
            run = SimulationRun(simulation_id=sim_id, config=config, generator=generator)

        loop = asyncio.get_running_loop()
        # Fit per-run ML assets outside the registry lock (private state).
        self._prepare_models(run)
        self._runs[sim_id] = run
        run.task = loop.create_task(self._run_loop(run))
        await self._persist_state(run)
        logger.info("simulation %s started (%s/%s x%s)",
                    sim_id, asset_id, scenario, speed_multiplier)
        return {"session_id": sim_id, **run.snapshot()}

    def _load_baseline(self, asset_id: str) -> dict:
        spec = _CATALOG_BY_CODE.get(asset_id)
        if spec:
            return {
                "qi": spec["baseline_qi"],
                "di": spec["baseline_di"],
                "b": spec["baseline_b"],
            }
        db = SessionLocal()
        try:
            rows = (
                db.execute(
                    select(ProductionHistory.timestamp, ProductionHistory.production)
                    .where(ProductionHistory.asset_id == asset_id)
                    .order_by(ProductionHistory.timestamp.asc())
                )
                .all()
            )
        finally:
            db.close()
        if not rows:
            raise KeyError(f"no baseline parameters available for asset {asset_id}")
        values = [float(p) for _, p in rows]
        fit = fit_arps(values)
        return {"qi": fit.qi, "di": fit.di, "b": fit.b}

    async def pause(self, simulation_id: str) -> dict | None:
        run = self._runs.get(simulation_id)
        if not run:
            return None
        if run.task and not run.task.done():
            run.task.cancel()
            run.task = None
        run.status = SimulationStatus.PAUSED.value
        await self._persist_state(run)
        return {"session_id": simulation_id, **run.snapshot()}

    async def resume(self, simulation_id: str) -> dict | None:
        run = self._runs.get(simulation_id)
        if not run:
            return None
        if run.task is None or run.task.done():
            loop = asyncio.get_running_loop()
            run.task = loop.create_task(self._run_loop(run))
        run.status = SimulationStatus.RUNNING.value
        await self._persist_state(run)
        return {"session_id": simulation_id, **run.snapshot()}

    async def stop(self, simulation_id: str) -> dict | None:
        run = self._runs.pop(simulation_id, None)
        if not run:
            return None
        if run.task and not run.task.done():
            run.task.cancel()
        await self._broadcast(run, {
            "type": "simulation_stopped",
            "simulation_id": simulation_id,
            "message": f"simulation stopped after {run.ticks_sent} ticks",
            "data": {
                **run.snapshot(),
                "last_ml": run.last_ml,
                "observations_persisted": run.ticks_sent,
            },
        })
        for ws in list(run.clients):
            try:
                await ws.close()
            except Exception:
                pass
        run.clients.clear()
        run.status = SimulationStatus.STOPPED.value
        await self._persist_state(run, stopped=True)
        logger.info("simulation %s stopped after %d ticks", simulation_id, run.ticks_sent)
        return {
            "session_id": simulation_id,
            **run.snapshot(),
            "summary": {
                "ticks_streamed": run.ticks_sent,
                "asset_id": run.config.asset_id,
                "final_scenario": run.config.scenario_label,
                "observations_persisted": run.ticks_sent,
                "last_ml": run.last_ml,
            },
        }

    async def reset(self, simulation_id: str) -> dict | None:
        run = self._runs.get(simulation_id)
        if not run:
            return None
        was_running = run.status == SimulationStatus.RUNNING.value
        if run.task and not run.task.done():
            run.task.cancel()
            run.task = None
        run.generator.reset(new_seed=False)
        self._prepare_models(run)  # fresh buffers/expectations from tick 0
        run.ticks_sent = 0
        run.status = SimulationStatus.RUNNING.value if was_running else SimulationStatus.PAUSED.value
        if run.status == SimulationStatus.RUNNING.value:
            loop = asyncio.get_running_loop()
            run.task = loop.create_task(self._run_loop(run))
        await self._persist_state(run)
        return {"session_id": simulation_id, **run.snapshot()}

    async def inject_anomaly(self, simulation_id: str, scenario: str) -> dict | None:
        run = self._runs.get(simulation_id)
        if not run:
            return None
        if resolve_scenario(scenario) not in SCENARIOS:
            raise ValueError(f"scenario must be one of {sorted(SCENARIOS)}")
        previous = run.config.scenario_label
        run.generator.set_scenario(scenario)
        run.config.scenario_label = scenario  # preserve caller's label verbatim
        await self._broadcast(run, {
            "type": "anomaly_injected",
            "simulation_id": simulation_id,
            "message": f"scenario '{scenario}' injected (was '{previous}')",
            "data": {"previous": previous, "current": scenario},
        })
        await self._persist_state(run)
        return {"session_id": simulation_id, **run.snapshot()}

    # Legacy PATCH semantics: change scenario on a live session.
    async def set_scenario(self, simulation_id: str, scenario: str) -> dict | None:
        return await self.inject_anomaly(simulation_id, scenario)

    # ------------------------------------------------------------ websocket
    async def attach(self, websocket: WebSocket, simulation_id: str) -> bool:
        run = self._runs.get(simulation_id)
        if not run:
            return False
        run.clients.add(websocket)
        await self._broadcast(run, {
            "type": "simulation_started",
            "simulation_id": simulation_id,
            "message": f"streaming {run.config.asset_id} ({run.config.scenario_label})",
            "data": run.snapshot(),
        })
        return True

    def detach(self, websocket: WebSocket, simulation_id: str) -> None:
        run = self._runs.get(simulation_id)
        if run:
            run.clients.discard(websocket)

    async def _broadcast(self, run: SimulationRun, payload: dict) -> None:
        """Fan out a JSON message to every client attached to this run."""
        for ws in list(run.clients):
            try:
                await ws.send_json(payload)
            except Exception:
                run.clients.discard(ws)

    # ----------------------------------------------------------- run loop
    @staticmethod
    def _telemetry_message(run: SimulationRun, obs: dict, ml: dict) -> dict:
        """Spec-compliant flat telemetry payload.

        Top-level fields follow the published WebSocket contract; the nested
        ``data`` object is retained for backward compatibility with the
        original frontend consumer.
        """
        return {
            "type": "telemetry",
            "timestamp": str(obs.get("timestamp")),
            "asset_id": run.config.asset_id,
            "source_type": "SYNTHETIC",
            "production": float(obs["production_bbl_d"]),
            "pressure": float(obs["pressure_bar"]),
            "temperature": float(obs["temperature_c"]),
            "flow_rate": float(obs["flow_rate_bbl_d"]),
            "forecast": ml.get("forecast_30d"),
            "anomaly_score": ml.get("anomaly_score"),
            "severity": ml.get("severity"),
            "aips_score": ml.get("aips_score"),
            "priority": ml.get("priority"),
            "recovery_opportunity": ml.get("estimated_recovery_mmbbl"),
            "confidence": ml.get("combined_confidence"),
            "data": {**obs, "ml": ml},   # legacy nested payload
        }

    async def _run_loop(self, run: SimulationRun) -> None:
        try:
            while True:
                await asyncio.sleep(run.config.wall_interval_seconds)
                obs = run.generator.next_observation()
                ml = self._infer(run, obs)
                enriched = self._telemetry_message(run, obs, ml)
                self._persist_observation(run, obs, ml)
                run.ticks_sent += 1

                priority = ml.get("priority")
                if priority is not None and run.last_priority is not None \
                        and priority != run.last_priority:
                    await self._broadcast(run, {
                        "type": "priority_changed",
                        "simulation_id": run.simulation_id,
                        "message": f"priority changed {run.last_priority} -> {priority}",
                        "data": {"previous": run.last_priority, "current": priority,
                                 "aips_score": ml.get("aips_score")},
                    })
                if priority is not None:
                    run.last_priority = priority

                for ws in list(run.clients):
                    try:
                        await ws.send_json(enriched)
                    except Exception:
                        run.clients.discard(ws)

                if (
                    run.config.duration_ticks is not None
                    and run.generator.state.tick >= run.config.duration_ticks
                ):
                    run.status = SimulationStatus.COMPLETED.value
                    await self._persist_state(run, stopped=True)
                    logger.info("simulation %s completed at %d ticks", run.simulation_id, run.ticks_sent)
                    break
        except asyncio.CancelledError:
            pass
        finally:
            if run.status != SimulationStatus.COMPLETED.value and self._runs.get(run.simulation_id):
                # cancelled without explicit stop/pause bookkeeping
                pass

    # ------------------------------------------------------- inference step
    def _infer(self, run: SimulationRun, obs: dict) -> dict:
        """Feature engineering -> forecast -> anomaly -> recovery -> AIPS."""
        actual = float(obs["production_bbl_d"])
        expected = float(obs["expected_bbl_d"])
        dev_pct = (actual - expected) / max(expected, 1e-9) * 100.0

        # Feature engineering over the rolling window, then anomaly scoring.
        run.buffer.append({
            "period": str(obs["timestamp"])[:10],
            "oil_bbl_d": actual,
            "expected_bbl_d": expected,
        })
        window = list(run.buffer)[-16:]
        anomaly_score = 0.0
        if run.detector and run.detector._fitted and len(window) >= 6:
            feats, _ = build_feature_frame(window)
            row = feats.iloc[-1].to_numpy()
            raw_score = run.detector.score_row(row)
            deviation_rule = min(abs(dev_pct) / 20.0, 1.0)
            anomaly_score = max(raw_score, deviation_rule) if deviation_rule >= 0.5 else raw_score
            anomaly_score = min(max(anomaly_score, 0.0), 1.0)
        severity = severity_for_score(anomaly_score)

        forecast_30d = None
        models_used: list[str] = []
        if run.forecaster:
            fc = run.forecaster.forecast(horizon_days=30)
            forecast_30d = fc["summary"]["forecast_30d"]
            models_used = fc["models_used"]

        recovery = estimate_recovery_opportunity(expected, actual, anomaly_score)
        aips = calculate_aips(AIPSInput(
            expected_bbl_d=expected,
            actual_bbl_d=actual,
            anomaly_score=anomaly_score,
            intervention_complexity=run.complexity,
            recovery=recovery,
        ))

        run.last_ml = {
            "forecast_30d": forecast_30d,
            "models_used": models_used,
            "anomaly_score": round(anomaly_score, 3),
            "severity": severity,
            "deviation_pct": round(dev_pct, 2),
            "estimated_recovery_mmbbl": round(recovery.estimated_volume_mmbbl, 4),
            "recovery_label": recovery.label,
            "combined_confidence": round(recovery.combined_confidence, 3),
            "aips_score": round(aips.score, 1),
            "priority": aips.priority,
            "disclaimer": (
                "ML outputs are model-estimated decision support over SYNTHETIC "
                "telemetry; not physical root causes and not guarantees."
            ),
        }
        return run.last_ml

    # ---------------------------------------------------------- persistence
    def _persist_observation(self, run: SimulationRun, obs: dict, ml: dict) -> None:
        db = SessionLocal()
        try:
            ts = datetime.fromisoformat(obs["timestamp"])
            db.add(SimulationObservation(
                simulation_id=run.simulation_id,
                timestamp=ts,
                production=float(obs["production_bbl_d"]),
                pressure=float(obs["pressure_bar"]),
                temperature=float(obs["temperature_c"]),
                flow_rate=float(obs["flow_rate_bbl_d"]),
                anomaly_score=float(ml["anomaly_score"]),
                aips_score=float(ml["aips_score"]),
                severity=str(ml["severity"]),
            ))
            db.commit()
        except Exception as exc:  # persistence must never break streaming
            db.rollback()
            logger.warning("observation persistence failed for %s: %s", run.simulation_id, exc)
        finally:
            db.close()

    async def _persist_state(self, run: SimulationRun, *, stopped: bool = False) -> None:
        def _write() -> None:
            db = SessionLocal()
            try:
                row = db.execute(
                    select(Simulation).where(Simulation.simulation_id == run.simulation_id)
                ).scalars().first()
                if row is None:
                    row = Simulation(simulation_id=run.simulation_id)
                    db.add(row)
                row.asset_id = run.config.asset_id
                row.scenario = run.config.scenario_label
                row.speed_multiplier = run.config.speed_multiplier
                row.status = run.status
                if run.status == SimulationStatus.RUNNING.value and row.started_at is None:
                    row.started_at = datetime.now(timezone.utc)
                if stopped or run.status in (
                    SimulationStatus.STOPPED.value, SimulationStatus.COMPLETED.value
                ):
                    row.stopped_at = datetime.now(timezone.utc)
                db.commit()
            finally:
                db.close()

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _write)


# Module-level singleton (one registry per process).
simulation_service = SimulationService()


def get_simulation_service() -> SimulationService:
    return simulation_service
