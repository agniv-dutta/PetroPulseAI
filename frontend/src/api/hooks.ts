import { useCallback, useEffect, useRef, useState } from 'react'

import { api, simulationSocketUrl, type TelemetryTick } from './client'

/**
 * Minimal data-fetching hook with graceful fallback.
 * `fallback` keeps pages rendering their mock data if the backend is down.
 */
export function useApiData<T>(fetcher: () => Promise<T | null>, fallback: T) {
  const [data, setData] = useState<T>(fallback)
  const [live, setLive] = useState(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    const result = await fetcherRef.current()
    if (result !== null) {
      setData(result)
      setLive(true)
    } else {
      setLive(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await fetcherRef.current()
      if (cancelled) return
      if (result !== null) {
        setData(result)
        setLive(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, live, refresh }
}

export interface SimulationConnectionState {
  connected: boolean
  sessionId: string | null
  scenario: string
  ticks: TelemetryTick[]
  error: string | null
}

/**
 * Manages a backend-backed simulation session over WebSocket.
 * Falls back to local generation when the backend is unreachable
 * (handled by the caller).
 */
export function useSimulationSocket(assetId: string) {
  const [state, setState] = useState<SimulationConnectionState>({
    connected: false,
    sessionId: null,
    scenario: 'NORMAL',
    ticks: [],
    error: null,
  })
  const wsRef = useRef<WebSocket | null>(null)

  const start = useCallback(
    async (scenario: string, opts?: { speed_multiplier?: number }) => {
      setState((s) => ({ ...s, error: null, ticks: [] }))
      const session = await api.startSimulation(assetId, scenario, opts)
      if (!session) {
        setState((s) => ({
          ...s,
          connected: false,
          error: 'Backend unavailable — running local simulator.',
          scenario,
        }))
        return false
      }

      // Close any previous socket
      wsRef.current?.close()

      const ws = new WebSocket(simulationSocketUrl(session.session_id))
      wsRef.current = ws

      ws.onopen = () =>
        setState((s) => ({
          ...s,
          connected: true,
          sessionId: session.session_id,
          scenario,
        }))

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string)
          if (msg.type === 'telemetry') {
            setState((s) => ({ ...s, ticks: [...s.ticks.slice(-119), msg.data] }))
            if (msg.data.scenario && msg.data.scenario !== state.scenario) {
              setState((s) => ({ ...s, scenario: msg.data.scenario }))
            }
          } else if (msg.type === 'scenario_changed') {
            setState((s) => ({ ...s, scenario: msg.data.scenario }))
          }
        } catch {
          /* ignore malformed frames */
        }
      }

      ws.onclose = () => setState((s) => ({ ...s, connected: false }))
      ws.onerror = () => setState((s) => ({ ...s, connected: false }))
      return true
    },
    [assetId, state.scenario],
  )

  const setScenario = useCallback((scenario: string) => {
    setState((s) => ({ ...s, scenario }))
    wsRef.current?.send(`SET_SCENARIO:${scenario}`)
  }, [])

  const pause = useCallback(async () => {
    if (state.sessionId) await api.pauseSimulation(state.sessionId)
  }, [state.sessionId])

  const resume = useCallback(async () => {
    if (state.sessionId) await api.resumeSimulation(state.sessionId)
  }, [state.sessionId])

  const inject = useCallback(async (scenario: string) => {
    if (!state.sessionId) return false
    return (
      (await api.injectAnomaly(state.sessionId, scenario)) !== null
    )
  }, [state.sessionId])

  useEffect(
    () => () => {
      const session = state.sessionId
      wsRef.current?.close()
      if (session) void api.stopSimulation(session)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return { ...state, start, setScenario, pause, resume, inject }
}
