import { useCallback, useEffect, useRef, useState } from 'react'

import { api, simulationSocketUrl, type TelemetryTick } from './client'
import type { SimulationTelemetry, SimulationEvent } from './types'

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

export interface TimelineEvent {
  tick: number
  timestamp: string
  label: string
  severity: 'NORMAL' | 'WATCH' | 'ALERT' | 'CRITICAL'
  category: 'STATUS' | 'DEVIATION' | 'ANOMALY' | 'PRIORITY' | 'SCENARIO'
}

export interface SimulationConnectionState {
  connected: boolean
  sessionId: string | null
  scenario: string
  ticks: TelemetryTick[]
  events: TimelineEvent[]
  latest: SimulationTelemetry | null
  error: string | null
}

/**
 * Manages a backend-backed simulation session over WebSocket.
 * Consumes flat telemetry payloads and event frames from the backend
 * intelligence pipeline. ALL state changes originate from backend results.
 */
export function useSimulationSocket(assetId: string) {
  const [state, setState] = useState<SimulationConnectionState>({
    connected: false,
    sessionId: null,
    scenario: 'NORMAL',
    ticks: [],
    events: [],
    latest: null,
    error: null,
  })
  const wsRef = useRef<WebSocket | null>(null)
  const tickCountRef = useRef(0)
  const prevSeverityRef = useRef<string>('NORMAL')
  const prevPriorityRef = useRef<string>('LOW')
  const prevScenarioRef = useRef<string>('NORMAL')

  const start = useCallback(
    async (scenario: string, opts?: { speed_multiplier?: number }) => {
      setState((s) => ({ ...s, error: null, ticks: [], events: [] }))
      tickCountRef.current = 0
      prevSeverityRef.current = 'NORMAL'
      prevPriorityRef.current = 'LOW'
      prevScenarioRef.current = scenario

      const session = await api.startSimulation(assetId, scenario, opts)
      if (!session) {
        setState((s) => ({
          ...s,
          connected: false,
          error: 'Backend unavailable — simulation requires the API server.',
          scenario,
        }))
        return false
      }

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
            const tel = msg as SimulationTelemetry
            tickCountRef.current += 1
            const tickNum = tickCountRef.current
            const ts = tel.timestamp

            // Map flat telemetry to TelemetryTick for chart compatibility
            const tick: TelemetryTick = {
              asset_id: tel.asset_id,
              tick: tickNum,
              timestamp: ts,
              production_bbl_d: tel.production,
              expected_bbl_d: tel.forecast ?? 0,
              pressure_bar: tel.pressure,
              temperature_c: tel.temperature,
              flow_rate_bbl_d: tel.flow_rate,
              valve_open: true,
              anomaly_score: tel.anomaly_score,
              severity: tel.severity,
              deviation_pct: tel.forecast > 0
                ? ((tel.production - tel.forecast) / tel.forecast) * 100
                : 0,
              scenario: prevScenarioRef.current,
              source: 'SYNTHETIC',
            }

            // Derive timeline events from backend state changes
            const newEvents: TimelineEvent[] = []
            const prevSev = prevSeverityRef.current
            const curSev = tel.severity
            const prevPri = prevPriorityRef.current
            const curPri = tel.priority ?? 'LOW'

            // Severity escalation events
            if (curSev !== prevSev) {
              const label =
                curSev === 'CRITICAL' ? 'CRITICAL' :
                curSev === 'ALERT' ? 'ALERT' :
                curSev === 'WATCH' ? 'ANOMALY WATCH' :
                'NORMAL'
              newEvents.push({
                tick: tickNum,
                timestamp: ts,
                label,
                severity: curSev,
                category: 'ANOMALY',
              })
            }

            // Deviation detection
            if (tick.deviation_pct < -5 && (prevSeverityRef.current === 'NORMAL' || newEvents.length === 0)) {
              // Only emit if we haven't already emitted an anomaly event
              if (curSev !== prevSev) {
                // Already covered above
              } else if (tick.deviation_pct < -10 && curSev === 'NORMAL') {
                newEvents.push({
                  tick: tickNum,
                  timestamp: ts,
                  label: 'DEVIATION DETECTED',
                  severity: 'WATCH',
                  category: 'DEVIATION',
                })
              }
            }

            // Priority change events
            if (curPri !== prevPri) {
              newEvents.push({
                tick: tickNum,
                timestamp: ts,
                label: `PRIORITY ${curPri}`,
                severity: curSev,
                category: 'PRIORITY',
              })
            }

            prevSeverityRef.current = curSev
            prevPriorityRef.current = curPri

            setState((s) => ({
              ...s,
              ticks: [...s.ticks.slice(-199), tick],
              latest: tel,
              events: [...s.events.slice(-49), ...newEvents],
            }))

          } else if (msg.type === 'anomaly_injected') {
            const evt = msg as SimulationEvent
            prevScenarioRef.current = msg.data?.current ?? msg.scenario ?? state.scenario
            setState((s) => ({
              ...s,
              scenario: prevScenarioRef.current,
              events: [
                ...s.events.slice(-49),
                {
                  tick: tickCountRef.current,
                  timestamp: evt.timestamp,
                  label: `SCENARIO: ${msg.data?.current ?? 'UNKNOWN'}`,
                  severity: 'WATCH',
                  category: 'SCENARIO',
                },
              ],
            }))

          } else if (msg.type === 'priority_changed') {
            const evt = msg as SimulationEvent
            prevPriorityRef.current = msg.data?.current ?? prevPriorityRef.current
            setState((s) => ({
              ...s,
              events: [
                ...s.events.slice(-49),
                {
                  tick: tickCountRef.current,
                  timestamp: evt.timestamp,
                  label: `PRIORITY ${msg.data?.current ?? 'UNKNOWN'}`,
                  severity: s.latest?.severity ?? 'NORMAL',
                  category: 'PRIORITY',
                },
              ],
            }))

          } else if (msg.type === 'simulation_started' || msg.type === 'simulation_stopped') {
            setState((s) => ({
              ...s,
              events: [
                ...s.events.slice(-49),
                {
                  tick: tickCountRef.current,
                  timestamp: msg.timestamp ?? new Date().toISOString(),
                  label: msg.type === 'simulation_started' ? 'STREAM OPENED' : 'STREAM CLOSED',
                  severity: 'NORMAL',
                  category: 'STATUS',
                },
              ],
            }))
          }
        } catch {
          /* ignore malformed frames */
        }
      }

      ws.onclose = () => setState((s) => ({ ...s, connected: false }))
      ws.onerror = () => setState((s) => ({ ...s, connected: false }))
      return true
    },
    [assetId], // removed state.scenario dependency to avoid stale closure
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
    return (await api.injectAnomaly(state.sessionId, scenario)) !== null
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
