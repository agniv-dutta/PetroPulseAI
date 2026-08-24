"""DEPRECATED shim - canonical generator lives in app/utils/synthetic_generator.py.

Legacy names are re-exported so older import paths keep resolving.
"""

from app.utils.synthetic_generator import (  # noqa: F401
    SCENARIO_ALIASES,
    SCENARIOS,
    SYNTHETIC_DISCLAIMER,
    SUPPORTED_SPEED_MULTIPLIERS,
    ScenarioSpec,
    SyntheticGenerator,
    VALID_SCENARIO_LABELS,
    resolve_scenario,
)

# Legacy alias table shaped like the original ANOMALY_SCENARIOS registry.
ANOMALY_SCENARIOS: dict[str, ScenarioSpec] = {
    **SCENARIOS,
    **{alias: SCENARIOS[target] for alias, target in SCENARIO_ALIASES.items()},
}


def generate_observation(state_like) -> dict:  # pragma: no cover - legacy helper
    """Legacy one-shot generation via a throwaway generator."""
    baseline = getattr(state_like, "baseline", None) or {
        "qi": 5000.0, "di": 0.03, "b": 0.6,
    }
    asset_id = getattr(state_like, "asset_id", "UNKNOWN")
    scenario = getattr(state_like, "scenario", "NORMAL")
    gen = SyntheticGenerator(asset_id, baseline, scenario=scenario)
    return gen.next_observation()


class SimState:  # noqa: D101 - legacy placeholder
    def __init__(self, asset_id: str, scenario: str = "NORMAL", **_ignored):
        self.asset_id = asset_id
        self.scenario = scenario


severity_for_score = None  # canonical implementation lives in app.ml.anomaly
