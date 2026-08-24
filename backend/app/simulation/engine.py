"""Synthetic telemetry simulation engine.

Port of frontend/src/utils/syntheticDataGenerator.ts. Produces high-frequency
observations that are explicitly SYNTHETIC — never labelled as real telemetry.
"""

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone

import numpy as np

from app.ingestion.catalog import CANONICAL_ASSETS, SEASONAL_FACTORS_DEFAULT, arps_rate


@dataclass
class AnomalyScenario:
    name: str
    description: str
    severity_scale: float = 0.0
    noise_multiplier: float = 1.0


ANOMALY_SCENARIOS: dict[str, AnomalyScenario] = {
    "NORMAL": AnomalyScenario("NORMAL", "Baseline operations", 0.0, 1.0),
    "DECLINE": AnomalyScenario("DECLINE", "Gradual production decline (simulated clog)", 0.03, 1.2),
    "VALVE_FAILURE": AnomalyScenario("VALVE_FAILURE", "Gas-lift valve failure signature", 0.40, 1.5),
    "HIGH_VOLATILITY": AnomalyScenario("HIGH_VOLATILITY", "Unstable flow regime", 0.15, 3.0),
    "RECOVERY": AnomalyScenario("RECOVERY", "Post-intervention uplift ramp", 0.18, 1.0),
}


@dataclass
class SimState:
    asset_id: str
    scenario: str = "NORMAL"
    tick_count: int = 0
    rng: np.random.Generator = field(default_factory=lambda: np.random.default_rng(7))
    start_ts: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    interval_seconds: float = 10.0

    def elapsed_months(self) -> float:
        return self.tick_count * self.interval_seconds / (30.44 * 86400.0)


def _box_muller(rng: np.random.Generator) -> float:
    u1 = min(max(rng.random(), 1e-9), 1.0)
    u2 = rng.random()
    return math.sqrt(-2.0 * math.log(u1)) * math.cos(2 * math.pi * u2)


def severity_for_score(score: float) -> str:
    if score >= 0.85:
        return "CRITICAL"
    if score >= 0.70:
        return "ALERT"
    if score >= 0.50:
        return "WATCH"
    return "NORMAL"


def generate_observation(state: SimState) -> dict:
    spec = next(a for a in CANONICAL_ASSETS if a["id"] == state.asset_id)
    scenario = ANOMALY_SCENARIOS.get(state.scenario, ANOMALY_SCENARIOS["NORMAL"])

    t = max(state.elapsed_months(), 0.05)
    month_index = datetime.now(timezone.utc).month - 1
    seasonal = float(SEASONAL_FACTORS_DEFAULT[month_index])

    base = arps_rate(spec["baseline_qi"], spec["baseline_di"], spec["baseline_b"], t)
    noise = _box_muller(state.rng) * 0.05 * scenario.noise_multiplier

    production = base * seasonal * (1.0 + noise)

    # scenario shaping over a scripted window (ticks 12-30 for demo pacing)
    if state.tick_count >= 12 and state.tick_count <= 30 and scenario.name != "NORMAL":
        progress = min(1.0, (state.tick_count - 11) / 6.0)
        fade = 1.0 if state.tick_count <= 26 else max(0.0, 1 - (state.tick_count - 26) / 4.0)
        effect = progress * fade
        if scenario.name in ("VALVE_FAILURE", "DECLINE"):
            production *= 1.0 - scenario.severity_scale * effect
        elif scenario.name == "RECOVERY":
            production *= 1.0 + scenario.severity_scale * effect
        elif scenario.name == "HIGH_VOLATILITY":
            production *= 1.0 + _box_muller(state.rng) * scenario.severity_scale * effect

    production = max(production, spec["baseline_qi"] * 0.05)

    pressure = float(np.clip(150 + 60 * (production / spec["baseline_qi"]) ** 0.8
                             + _box_muller(state.rng) * 2.5, 120.0, 250.0))
    temperature = float(np.clip(78 + 6 * math.sin(2 * math.pi * month_index / 12)
                                + _box_muller(state.rng) * 1.5, 55.0, 95.0))
    flow_rate = production * float(np.clip(1.0 + _box_muller(state.rng) * 0.02, 0.9, 1.1))

    deviation_pct = (production - base * seasonal) / max(base * seasonal, 1e-9) * 100.0
    anomaly_score = float(np.clip(0.35 + abs(deviation_pct) / 22.0
                                  + abs(_box_muller(state.rng)) * 0.03, 0.0, 0.99))

    valve_open = scenario.name != "VALVE_FAILURE" or not (14 <= state.tick_count <= 28)

    obs = {
        "asset_id": state.asset_id,
        "tick": state.tick_count,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "production_bbl_d": round(production, 1),
        "expected_bbl_d": round(base * seasonal, 1),
        "pressure_bar": round(pressure, 1),
        "temperature_c": round(temperature, 1),
        "flow_rate_bbl_d": round(flow_rate, 1),
        "valve_open": valve_open,
        "anomaly_score": round(anomaly_score, 3),
        "severity": severity_for_score(anomaly_score),
        "deviation_pct": round(deviation_pct, 2),
        "scenario": scenario.name,
        "source": "SYNTHETIC",
        "disclaimer": (
            "Synthetic high-frequency telemetry generated for demonstration — "
            "NOT actual ONGC/operator SCADA data."
        ),
    }
    state.tick_count += 1
    return obs
