"""DEPRECATED shim - live sessions are owned by app.services.simulation_service.

`hub` remains so legacy import paths resolve; all methods delegate to the
simulation service singleton.
"""

from dataclasses import dataclass, field

from app.services.simulation_service import SimulationRun, get_simulation_service


@dataclass
class HubCompat:
    _service: object = field(default_factory=get_simulation_service, repr=False)

    @property
    def sessions(self) -> dict[str, SimulationRun]:
        return self._service._runs

    def bind_loop(self) -> None:  # legacy no-op
        return None

    def get(self, session_id: str):
        return self._service.get(session_id)

    async def create_session(self, session_id: str, asset_id: str, scenario: str) -> dict:
        return await self._service.start(
            asset_id=asset_id, scenario=scenario, simulation_id=session_id
        )

    async def set_scenario(self, session_id: str, scenario: str):
        return await self._service.set_scenario(session_id, scenario)

    async def remove_session(self, session_id: str):
        await self._service.stop(session_id)


hub = HubCompat()
