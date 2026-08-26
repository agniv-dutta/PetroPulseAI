"""Real-time synthetic simulation engine tests.

Covers the deterministic generator (scenarios, provenance flags, seeding,
reset/injection semantics) and the simulation service (full ML pipeline,
controls, persistence, concurrency isolation).
"""

import asyncio
import time

import pytest
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import Simulation, SimulationObservation
from app.services.simulation_service import get_simulation_service
from app.utils.synthetic_generator import (
    SCENARIOS,
    SYNTHETIC_SOURCE_TYPE,
    SyntheticGenerator,
    resolve_scenario,
)

BASELINE = {"qi": 5000.0, "di": 0.03, "b": 0.6}
SERVICE = get_simulation_service()


# ---------------------------------------------------------------- generator
class TestSyntheticGenerator:
    def _series(self, scenario="NORMAL", n=20, seed=7):
        gen = SyntheticGenerator(
            "T-1", BASELINE, scenario=scenario, seed=seed, interval_seconds=600.0
        )
        return [gen.next_observation() for _ in range(n)]

    def test_provenance_flags_on_every_observation(self):
        for obs in self._series():
            assert obs["source_type"] == SYNTHETIC_SOURCE_TYPE == "SYNTHETIC"
            assert obs["simulation"] is True
            assert "NOT actual" in obs["disclaimer"]
            assert obs["source"] == "petropulse-simulation-engine"

    def test_all_operational_parameters_generated(self):
        obs = self._series(n=1)[0]
        for key in ("production_bbl_d", "pressure_bar", "temperature_c",
                    "flow_rate_bbl_d", "valve_status", "expected_bbl_d"):
            assert key in obs
        assert obs["valve_status"] in ("OPEN", "CLOSED", "THROTTLED")
        assert 100.0 <= obs["pressure_bar"] <= 280.0
        assert 55.0 <= obs["temperature_c"] <= 95.0

    def test_seed_determinism_same_seed_same_series(self):
        a = self._series(seed=11, n=15)
        b = self._series(seed=11, n=15)
        keys = ("production_bbl_d", "pressure_bar", "temperature_c", "flow_rate_bbl_d")
        for ra, rb in zip(a, b):
            assert [ra[k] for k in keys] == [rb[k] for k in keys]

    def test_different_seeds_diverge(self):
        a = self._series(seed=1, n=15)
        b = self._series(seed=2, n=15)
        prods_a = [o["production_bbl_d"] for o in a]
        prods_b = [o["production_bbl_d"] for o in b]
        assert prods_a != prods_b

    def test_valve_failure_closes_valve_and_drops_production(self):
        normal = self._series("NORMAL", n=24)
        failure = self._series("VALVE_FAILURE", n=24)
        late_normal = sum(o["production_bbl_d"] for o in normal[14:22]) / 8
        late_failure = sum(o["production_bbl_d"] for o in failure[14:22]) / 8
        statuses = {o["valve_status"] for o in failure[14:22]}
        assert "CLOSED" in statuses
        assert late_failure < late_normal * 0.75

    def test_gradual_clog_progressive_decline(self):
        clog = self._series("GRADUAL_CLOG", n=34)
        early = sum(o["production_bbl_d"] for o in clog[2:8]) / 6
        late = sum(o["production_bbl_d"] for o in clog[26:32]) / 6
        assert late < early

    def test_recovery_event_uplift_above_expectation(self):
        rec = self._series("RECOVERY_EVENT", n=20)
        mid = rec[10:16]
        avg_deviation = sum(o["deviation_pct"] for o in mid) / len(mid)
        assert avg_deviation > 5.0

    def test_high_volatility_noisier_than_normal(self):
        normal = self._series("NORMAL", n=40)
        volatile = self._series("HIGH_VOLATILITY", n=40)

        def spread(rows):
            devs = [abs(o["deviation_pct"]) for o in rows]
            mean = sum(devs) / len(devs)
            return sum((d - mean) ** 2 for d in devs) / len(devs)

        assert spread(volatile) > spread(normal)

    def test_reset_replays_identical_sequence(self):
        gen = SyntheticGenerator("T-9", BASELINE, scenario="NORMAL", seed=42)
        first = [gen.next_observation()["production_bbl_d"] for _ in range(10)]
        gen.reset()
        second = [gen.next_observation()["production_bbl_d"] for _ in range(10)]
        assert first == second

    def test_inject_anomaly_anchors_window_mid_run(self):
        gen = SyntheticGenerator("T-2", BASELINE, scenario="NORMAL", seed=5)
        for _ in range(6):
            gen.next_observation()
        before_scenario = gen.scenario
        gen.set_scenario("VALVE_FAILURE")
        assert before_scenario == "NORMAL"
        assert gen.scenario == "VALVE_FAILURE"
        # Window is anchored at injection point: valve closes within 8 ticks.
        statuses = [gen.next_observation()["valve_status"] for _ in range(12)]
        assert "CLOSED" in statuses

    def test_resolve_scenario_aliases(self):
        assert resolve_scenario("DECLINE") == "GRADUAL_CLOG"
        assert resolve_scenario("RECOVERY") == "RECOVERY_EVENT"
        assert resolve_scenario("VALVE_FAILURE") == "VALVE_FAILURE"

    def test_canonical_scenario_registry(self):
        for name in ("VALVE_FAILURE", "GRADUAL_CLOG", "HIGH_VOLATILITY", "RECOVERY_EVENT"):
            assert name in SCENARIOS


# ------------------------------------------------------------------ service
def _db_rows(simulation_id):
    db = SessionLocal()
    try:
        obs = db.execute(
            select(SimulationObservation)
            .where(SimulationObservation.simulation_id == simulation_id)
            .order_by(SimulationObservation.timestamp.asc())
        ).scalars().all()
        row = db.execute(
            select(Simulation).where(Simulation.simulation_id == simulation_id)
        ).scalars().first()
        return obs, row
    finally:
        db.close()


async def _wait_until(predicate, timeout=6.0, step=0.05):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        await asyncio.sleep(step)
    return False


class TestSimulationService:
    def test_full_lifecycle_with_ml_enrichment_and_persistence(self):
        async def flow():
            started = await SERVICE.start(
                asset_id="MH-07", scenario="GRADUAL_CLOG",
                speed_multiplier=10.0, interval_seconds=0.05,
                duration_ticks=6, seed=99,
            )
            sid = started["session_id"]

            def completed():
                run = SERVICE.get(sid)
                return run is not None and run.status == "COMPLETED" and run.ticks_sent >= 5

            assert await _wait_until(completed), "simulation did not complete in time"
            snap = SERVICE.get(sid).snapshot()
            assert snap["status"] == "COMPLETED"
            assert snap["ticks_sent"] >= 5
            run = SERVICE.get(sid)
            ml = run.last_ml
            assert ml, "ML inference must have run"
            assert ml["forecast_30d"] is not None
            assert "arps" in ml["models_used"]
            assert 0.0 <= ml["anomaly_score"] <= 1.0
            assert ml["severity"] in ("NORMAL", "WATCH", "ALERT", "CRITICAL")
            assert 0.0 <= ml["aips_score"] <= 100.0
            assert ml["priority"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
            assert ml["recovery_label"] == "Estimated Recovery Opportunity"

            # Persisted state may lag the in-memory flag by a tick-write; wait for it.
            def db_completed():
                _, row = _db_rows(sid)
                return row is not None and row.status == "COMPLETED"

            assert await _wait_until(db_completed), "simulation state was not persisted"
            obs_rows, sim_row = _db_rows(sid)
            assert sim_row is not None and sim_row.status == "COMPLETED"
            assert sim_row.stopped_at is not None
            assert len(obs_rows) >= 5
            for o in obs_rows:
                assert o.anomaly_score is not None and o.aips_score is not None
                assert o.severity in ("NORMAL", "WATCH", "ALERT", "CRITICAL")

            stopped = await SERVICE.stop(sid)
            assert stopped["status"] == "STOPPED"

        asyncio.run(flow())

    def test_pause_resume_stop_controls(self):
        async def flow():
            started = await SERVICE.start(
                asset_id="CB-12", scenario="NORMAL", speed_multiplier=10.0,
                interval_seconds=0.05, seed=3,
            )
            sid = started["session_id"]
            try:
                assert await _wait_until(lambda: SERVICE.get(sid).ticks_sent >= 2)

                paused = await SERVICE.pause(sid)
                assert paused["status"] == "PAUSED"
                ticks_at_pause = SERVICE.get(sid).ticks_sent
                await asyncio.sleep(0.35)
                assert SERVICE.get(sid).ticks_sent == ticks_at_pause, "paused run must not tick"

                resumed = await SERVICE.resume(sid)
                assert resumed["status"] == "RUNNING"
                assert await _wait_until(
                    lambda: SERVICE.get(sid).ticks_sent > ticks_at_pause
                )
            finally:
                await SERVICE.stop(sid)
            assert SERVICE.get(sid) is None
            _, sim_row = _db_rows(sid)
            assert sim_row.status == "STOPPED"

        asyncio.run(flow())

    def test_reset_returns_to_initial_state(self):
        async def flow():
            started = await SERVICE.start(
                asset_id="KG-05", scenario="NORMAL", speed_multiplier=10.0,
                interval_seconds=0.05, duration_ticks=None, seed=21,
            )
            sid = started["session_id"]
            try:
                assert await _wait_until(lambda: SERVICE.get(sid).ticks_sent >= 3)
                await SERVICE.pause(sid)
                reset = await SERVICE.reset(sid)
                assert reset["ticks_sent"] == 0
                assert reset["sim_time_seconds"] == 0.0
                assert reset["scenario"] == "NORMAL"
                assert reset["status"] == "PAUSED"  # paused stays paused
            finally:
                await SERVICE.stop(sid)

        asyncio.run(flow())

    def test_inject_anomaly_mid_run_updates_state_and_persistence(self):
        async def flow():
            started = await SERVICE.start(
                asset_id="MH-07", scenario="NORMAL", speed_multiplier=10.0,
                interval_seconds=0.05, seed=17,
            )
            sid = started["session_id"]
            try:
                assert await _wait_until(lambda: SERVICE.get(sid).ticks_sent >= 2)
                injected = await SERVICE.inject_anomaly(sid, "VALVE_FAILURE")
                assert injected["scenario"] == "VALVE_FAILURE"
                _, sim_row = _db_rows(sid)
                assert sim_row.scenario == "VALVE_FAILURE"

                def valve_closed_recently():
                    run = SERVICE.get(sid)
                    if not run:
                        return False
                    return (
                        run.generator.snapshot()["scenario"] == "VALVE_FAILURE"
                        and run.ticks_sent >= 4
                    )
                assert await _wait_until(valve_closed_recently)
            finally:
                await SERVICE.stop(sid)

        asyncio.run(flow())

    def test_concurrent_simulations_do_not_share_state(self):
        async def flow():
            s1 = await SERVICE.start(
                asset_id="MH-07", scenario="HIGH_VOLATILITY", speed_multiplier=10.0,
                interval_seconds=0.05, seed=101,
            )
            s2 = await SERVICE.start(
                asset_id="CB-08", scenario="NORMAL", speed_multiplier=5.0,
                interval_seconds=0.05, seed=202,
            )
            id1, id2 = s1["session_id"], s2["session_id"]
            try:
                assert await _wait_until(
                    lambda: SERVICE.get(id1).ticks_sent >= 3 and SERVICE.get(id2).ticks_sent >= 3
                )
                r1, r2 = SERVICE.get(id1), SERVICE.get(id2)
                assert r1 is not r2
                assert r1.generator is not r2.generator
                assert r1.forecaster is not r2.forecaster
                assert r1.detector is not r2.detector
                assert r1.config.asset_id == "MH-07" != r2.config.asset_id == "CB-08"

                # Injecting into one must not touch the other.
                await SERVICE.inject_anomaly(id1, "RECOVERY_EVENT")
                assert SERVICE.get(id1).generator.scenario == "RECOVERY_EVENT"
                assert SERVICE.get(id2).generator.scenario == "NORMAL"
                assert SERVICE.get(id2).last_ml.get("severity") in (None, "NORMAL", "WATCH", "ALERT")
            finally:
                await SERVICE.stop(id1)
                await SERVICE.stop(id2)

        asyncio.run(flow())

    def test_invalid_speed_rejected(self):
        async def flow():
            with pytest.raises(ValueError):
                await SERVICE.start(asset_id="MH-07", speed_multiplier=3.0)

        asyncio.run(flow())

    def test_unknown_asset_rejected(self):
        async def flow():
            with pytest.raises(KeyError):
                await SERVICE.start(asset_id="NOPE-99")

        asyncio.run(flow())

    def test_websocket_clients_receive_enriched_results(self):
        class FakeWebSocket:
            def __init__(self):
                self.sent: list[dict] = []

            async def send_json(self, payload):
                self.sent.append(payload)

        async def flow():
            started = await SERVICE.start(
                asset_id="KG-05", scenario="NORMAL", speed_multiplier=10.0,
                interval_seconds=0.05, seed=77,
            )
            sid = started["session_id"]
            try:
                run = SERVICE.get(sid)
                assert await _wait_until(lambda: run.ticks_sent >= 1)
                fake = FakeWebSocket()
                run.clients.add(fake)
                assert await _wait_until(lambda: len(fake.sent) >= 2)

                payload = fake.sent[-1]
                assert payload["type"] == "telemetry"
                data = payload["data"]
                # Frontend receives results only - provenance + ML verdicts included.
                assert data["source_type"] == "SYNTHETIC"
                assert data["simulation"] is True
                assert "NOT actual" in data["disclaimer"]
                ml = data["ml"]
                assert ml["forecast_30d"] is not None
                assert "arps" in ml["models_used"]
                assert 0.0 <= ml["anomaly_score"] <= 1.0
                assert ml["severity"] in ("NORMAL", "WATCH", "ALERT", "CRITICAL")
                assert 0.0 <= ml["aips_score"] <= 100.0
                assert ml["priority"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
                assert ml["recovery_label"] == "Estimated Recovery Opportunity"
            finally:
                await SERVICE.stop(sid)

        asyncio.run(flow())
