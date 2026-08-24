"""WebSocket streaming for the real-time simulation center."""

import asyncio
import json
from dataclasses import dataclass, field

from fastapi import WebSocket

from app.core.config import settings
from app.simulation.engine import SimState, generate_observation


@dataclass
class StreamSession:
    session_id: str
    state: SimState
    clients: set[WebSocket] = field(default_factory=set)
    task: asyncio.Task | None = None
    ticks_sent: int = 0

    def snapshot(self) -> dict:
        return {
            "session_id": self.session_id,
            "asset_id": self.state.asset_id,
            "scenario": self.state.scenario,
            "clients": len(self.clients),
            "ticks_sent": self.ticks_sent,
        }


class SimulationHub:
    def __init__(self) -> None:
        self.sessions: dict[str, StreamSession] = {}
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self) -> None:
        self._loop = asyncio.get_running_loop()

    def _spawn(self, coro) -> asyncio.Task:
        if self._loop is None or self._loop.is_closed():
            raise RuntimeError("event loop not bound")
        return asyncio.run_coroutine_threadsafe(coro, self._loop)

    def create_session(self, session_id: str, asset_id: str, scenario: str) -> StreamSession:
        if session_id not in self.sessions and len(self.sessions) >= settings.simulation_max_sessions:
            raise RuntimeError("max concurrent simulation sessions reached")
        if session_id in self.sessions:
            return self.sessions[session_id]
        state = SimState(asset_id=asset_id, scenario=scenario)
        session = StreamSession(session_id=session_id, state=state)
        session.ticks_sent = 0

        async def runner() -> None:
            try:
                await self._run(session)
            finally:
                self.sessions.pop(session.session_id, None)
                await self._notify_stopped(session.session_id)

        self.sessions[session_id] = session
        session.task = self._spawn(runner())
        return session

    async def _notify_stopped(self, session_id: str) -> None:
        pass

    def get(self, session_id: str) -> StreamSession | None:
        return self.sessions.get(session_id)

    def set_scenario(self, session_id: str, scenario: str) -> dict | None:
        session = self.sessions.get(session_id)
        if not session:
            return None
        session.state.scenario = scenario
        return session.snapshot()

    async def remove_session(self, session_id: str) -> None:
        session = self.sessions.pop(session_id, None)
        if not session:
            return
        if session.task and not session.task.done():
            session.task.cancel()
        for ws in list(session.clients):
            try:
                await ws.close()
            except Exception:
                pass

    async def _run(self, session: StreamSession) -> None:
        interval = max(settings.simulation_tick_seconds, 0.5)
        try:
            while True:
                await asyncio.sleep(interval)
                obs = generate_observation(session.state)
                session.ticks_sent += 1
                dead: list[WebSocket] = []
                payload = json.dumps({"type": "telemetry", "data": obs})
                for ws in session.clients:
                    try:
                        await ws.send_text(payload)
                    except Exception:
                        dead.append(ws)
                for ws in dead:
                    session.clients.discard(ws)
                if not session.clients and session.ticks_sent > 600:
                    break
        except asyncio.CancelledError:
            pass
        finally:
            self.sessions.pop(session.session_id, None)


hub = SimulationHub()
