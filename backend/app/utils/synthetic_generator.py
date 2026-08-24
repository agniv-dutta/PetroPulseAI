"""Synthetic telemetry generator - the "real-time" demonstration backbone.

IMPORTANT HONESTY CONTRACT
--------------------------
This module generates SIMULATED operational parameters. It is NOT real ONGC
(or any operator) SCADA telemetry. Every observation produced here carries:

    source_type = "SYNTHETIC"
    simulation  = True
    disclaimer  = <explicit synthetic-data notice>

Pipeline position: historical data -> distribution fitting (Arps baseline +
seasonal factors + seeded noise) -> Monte Carlo-style scenario injection ->
streaming observations.

Scenarios (deterministic when a seed is supplied):
    NORMAL          baseline operations (reference only)
    VALVE_FAILURE   gas-lift valve closes mid-window, sharp production drop
    GRADUAL_CLOG    slow flowline clog, progressive decline + pressure creep
    HIGH_VOLATILITY unstable flow regime, amplified noise and spikes
    RECOVERY_EVENT  post-intervention uplift ramp

Controls: asset_id, scenario, duration (ticks), speed multiplier (1x/5x/10x),
interval_seconds, random seed. The same seed + control set reproduces the
same observation sequence exactly.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone

import numpy as np

from app.ml.arps import arps_rate

SYNTHETIC_SOURCE_TYPE = "SYNTHETIC"
SIMULATION_FLAG = True
SYNTHETIC_DISCLAIMER = (
    "Synthetic high-frequency telemetry generated for demonstration. "
    "NOT actual ONGC/operator SCADA data."
)

DEFAULT_INTERVAL_SECONDS = 600.0  # simulated seconds between observations


def _box_muller(rng: np.random.Generator) -> float:
    u1 = min(max(rng.random(), 1e-9), 1.0)
    u2 = rng.random()
    return math.sqrt(-2.0 * math.log(u1)) * math.cos(2 * math.pi * u2)


def _ramp(value_at: float, length: float) -> float:
    """Linear 0->1 ramp over `length` ticks."""
    if length <= 0:
        return 1.0
    return min(max(value_at / length, 0.0), 1.0)


@dataclass(frozen=True)
class ScenarioSpec:
    name: str
    description: str
    noise_multiplier: float = 1.0
    window_ticks: int = 24          # effect length once activated
    affects_valve: bool = False
    kind: str = "NONE"


SCENARIOS: dict[str, ScenarioSpec] = {
    "NORMAL": ScenarioSpec(
        "NORMAL", "Baseline operations (reference signature)", 1.0, 0, False, "NONE"
    ),
    "VALVE_FAILURE": ScenarioSpec(
        "VALVE_FAILURE", "Gas-lift valve failure signature", 1.5, 24, True, "VALVE_FAILURE"
    ),
    "GRADUAL_CLOG": ScenarioSpec(
        "GRADUAL_CLOG", "Gradual flowline clogging, progressive decline", 1.2, 32, False, "GRADUAL_CLOG"
    ),
    "HIGH_VOLATILITY": ScenarioSpec(
        "HIGH_VOLATILITY", "Unstable flow regime with intermittent spikes", 3.5, 20, False, "HIGH_VOLATILITY"
    ),
    "RECOVERY_EVENT": ScenarioSpec(
        "RECOVERY_EVENT", "Post-intervention uplift ramp", 1.0, 22, False, "RECOVERY_EVENT"
    ),
}

# Legacy aliases kept so earlier API callers keep working.
SCENARIO_ALIASES: dict[str, str] = {
    "DECLINE": "GRADUAL_CLOG",
    "RECOVERY": "RECOVERY_EVENT",
    "EQUIPMENT_FAILURE": "VALVE_FAILURE",
}

SUPPORTED_SPEED_MULTIPLIERS = (1.0, 5.0, 10.0)

VALID_SCENARIO_LABELS = tuple(SCENARIOS.keys()) + tuple(SCENARIO_ALIASES.keys())


def resolve_scenario(label: str) -> str:
    """Map legacy labels to canonical scenario names (value preserved upstream)."""
    return SCENARIO_ALIASES.get(str(label).upper(), str(label).upper())


def _scenario_effect(kind: str, u: float, rng: np.random.Generator) -> dict:
    """Deterministic multiplicative effect at tick-offset u since activation."""
    if kind == "VALVE_FAILURE":
        ramp_in = _ramp(u, 6.0)
        fade = 1.0 if u <= 18 else max(0.0, 1.0 - _ramp(u - 18, 4.0))
        effect = ramp_in * fade
        return {
            "production_mult": 1.0 - 0.40 * effect,
            "pressure_mult": 1.0 - 0.25 * effect,
            "valve_closed": 8.0 <= u <= 22.0,
        }
    if kind == "GRADUAL_CLOG":
        progress = _ramp(u, 28.0)
        recovery_tail = max(0.0, 1.0 - _ramp(max(u - 26.0, 0.0), 6.0))
        effect = progress * (0.35 + 0.65 * recovery_tail)
        return {
            "production_mult": 1.0 - 0.25 * effect,
            "pressure_mult": 1.0 + 0.12 * effect - 0.20 * max(effect - 0.8, 0.0),
            "valve_closed": False,
        }
    if kind == "HIGH_VOLATILITY":
        spike = 1.0 + (_box_muller(rng) * 0.06 if rng.random() > 0.7 else 0.0)
        return {
            "production_mult": spike,
            "pressure_mult": 1.0 + _box_muller(rng) * 0.04,
            "valve_closed": False,
            "extra_noise": 1.0,
        }
    if kind == "RECOVERY_EVENT":
        uplift = _ramp(u, 10.0) * (1.0 if u <= 16 else max(0.6, 1.0 - _ramp(u - 16, 6.0)))
        return {
            "production_mult": 1.0 + 0.18 * uplift,
            "pressure_mult": 1.0 + 0.08 * uplift,
            "valve_closed": False,
        }
    return {"production_mult": 1.0, "pressure_mult": 1.0, "valve_closed": False}


@dataclass
class GeneratorState:
    tick: int = 0
    scenario: str = "NORMAL"           # canonical name
    activation_tick: int = 0           # where the current scenario window started
    sim_time_seconds: float = 0.0


class SyntheticGenerator:
    """Deterministic per-asset observation generator (no shared state)."""

    def __init__(
        self,
        asset_id: str,
        baseline: dict,
        *,
        scenario: str = "NORMAL",
        interval_seconds: float = DEFAULT_INTERVAL_SECONDS,
        seed: int | None = None,
        start_time: datetime | None = None,
    ):
        self.asset_id = asset_id
        self.baseline = baseline  # {qi, di, b, historical_monthly_mean?}
        self.interval_seconds = float(interval_seconds)
        self.state = GeneratorState(scenario=resolve_scenario(scenario))
        self.start_time = start_time or datetime.now(timezone.utc)
        self._seed = seed
        self._rng = np.random.default_rng(seed)

    # ------------------------------------------------------------- controls
    def reset(self, *, new_seed: bool = False) -> None:
        """Restart from tick 0; identical seed replays the identical series."""
        self.state = GeneratorState(
            scenario=self.state.scenario,
            activation_tick=0,
        )
        self.start_time = datetime.now(timezone.utc)
        seed = (self._seed or 42) + (1 if new_seed else 0)
        self._rng = np.random.default_rng(seed)

    def set_scenario(self, label: str) -> str:
        canonical = resolve_scenario(label)
        self.state.scenario = canonical
        self.state.activation_tick = self.state.tick  # window anchored now
        return canonical

    @property
    def scenario(self) -> str:
        return self.state.scenario

    def snapshot(self) -> dict:
        return {
            "tick": self.state.tick,
            "scenario": self.state.scenario,
            "sim_time_seconds": self.state.sim_time_seconds,
            "seed": self._seed,
        }

    # ------------------------------------------------------------ generation
    def next_observation(self) -> dict:
        """Produce the next deterministic SYNTHETIC observation."""
        spec = SCENARIOS[self.state.scenario]
        base_qi = float(self.baseline["qi"])
        qi, di, b = base_qi, float(self.baseline["di"]), float(self.baseline["b"])

        t_months = max(self.state.tick * self.interval_seconds / (30.44 * 86400.0), 0.05)
        month_index = self.start_time.month - 1
        seasonal = 1.0 + 0.05 * math.sin(2 * math.pi * month_index / 12.0)

        expected = arps_rate(qi, di, b, t_months) * seasonal
        noise_scale = 0.05 * spec.noise_multiplier
        noise = _box_muller(self._rng) * noise_scale
        production = expected * (1.0 + noise)

        u = float(self.state.tick - self.state.activation_tick)
        in_window = (
            spec.window_ticks > 0
            and 0.0 <= u <= spec.window_ticks
        )
        effect = (
            _scenario_effect(spec.kind, u, self._rng)
            if in_window else
            {"production_mult": 1.0, "pressure_mult": 1.0, "valve_closed": False}
        )
        extra_noise = effect.pop("extra_noise", 0.0)
        if extra_noise:
            production *= 1.0 + _box_muller(self._rng) * 0.04

        production *= effect["production_mult"]
        production = max(production, base_qi * 0.05)

        pressure_ratio = production / max(expected, 1e-9)
        pressure = float(np.clip(
            150.0 + 60.0 * pressure_ratio ** 0.8 + _box_muller(self._rng) * 2.5,
            100.0, 280.0,
        )) * effect["pressure_mult"]
        temperature = float(np.clip(
            78.0 + 6.0 * math.sin(2 * math.pi * month_index / 12.0)
            + _box_muller(self._rng) * 1.5, 55.0, 95.0,
        ))
        flow_rate = production * float(np.clip(1.0 + _box_muller(self._rng) * 0.02, 0.9, 1.1))
        deviation_pct = (production - expected) / max(expected, 1e-9) * 100.0

        obs = {
            "asset_id": self.asset_id,
            "tick": self.state.tick,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sim_time_seconds": round(self.state.sim_time_seconds, 1),
            "scenario": spec.name,
            "production_bbl_d": round(production, 1),
            "expected_bbl_d": round(expected, 1),
            "deviation_pct": round(deviation_pct, 2),
            "pressure_bar": round(pressure, 1),
            "temperature_c": round(temperature, 1),
            "flow_rate_bbl_d": round(flow_rate, 1),
            "valve_status": "CLOSED" if effect["valve_closed"] else "OPEN",
            # Provenance flags - mandatory on every observation.
            "source_type": SYNTHETIC_SOURCE_TYPE,
            "simulation": SIMULATION_FLAG,
            "source": "petropulse-simulation-engine",
            "disclaimer": SYNTHETIC_DISCLAIMER,
        }

        self.state.tick += 1
        self.state.sim_time_seconds += self.interval_seconds
        return obs
