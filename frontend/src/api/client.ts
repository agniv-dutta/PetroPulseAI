/**
 * Typed API client for the PetroPulse AI backend.
 * Falls back gracefully — every call returns null on failure so pages can
 * render their offline/mock data instead of breaking the demo.
 */

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1'

export type DataClass = 'REAL' | 'SYNTHETIC' | 'DERIVED'

export interface LeaderboardRow {
  id: string
  name: string
  field: string
  basin: string
  currentProd: number
  expectedProd: number
  deviation: number
  declineRate: number
  severity: 'CRITICAL' | 'ALERT' | 'WATCH' | 'NORMAL'
  anomalyScore: number
  aipsScore: number
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  recoveryPotential: number
  rank: number
  dataSource: string
}

export interface PortfolioSummary {
  totalAssets: number
  activeAssets: number
  atRiskAssets: number
  currentProductionKbblD: number
  expectedProductionKbblD: number
  portfolioDeviationPct: number
  topAnomalies: Array<{
    assetId: string
    assetName: string
    severity: string
    anomalyScore: number
    deviationPct: number
    period: string
  }>
  productionTrend: Array<{ period: string; actual: number; expected: number }>
  generatedAt: string
}

export interface AnomalyRow {
  id: string
  assetId: string
  severity: string
  anomalyScore: number
  deviationPct: number
  expectedBblD: number
  actualBblD: number
  windowStart: string
  windowEnd: string
  contributingFeatures: Array<{
    feature: string
    label: string
    z_score: number
  }>
  status: string
}

export interface TelemetryTick {
  asset_id: string
  tick: number
  timestamp: string
  production_bbl_d: number
  expected_bbl_d: number
  pressure_bar: number
  temperature_c: number
  flow_rate_bbl_d: number
  valve_open: boolean
  anomaly_score: number
  severity: 'NORMAL' | 'WATCH' | 'ALERT' | 'CRITICAL'
  deviation_pct: number
  scenario: string
  source: 'SYNTHETIC'
}

async function get<T>(path: string, timeoutMs = 15000): Promise<T | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function send<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export const api = {
  health: () => get<{ status: string; version: string }>('/../health'.replace('/api/v1/../', '/'), 4000),

  portfolioSummary: () => get<PortfolioSummary>('/portfolio/summary'),

  leaderboard: (refresh = false) =>
    get<{ rows: LeaderboardRow[]; count: number; generated_at?: string }>(
      `/assets/leaderboard${refresh ? '?refresh=true' : ''}`,
      60000,
    ),

  assetDetail: (assetId: string) =>
    get<Record<string, unknown>>(`/assets/${encodeURIComponent(assetId)}`, 60000),

  anomalies: () => get<{ rows: AnomalyRow[] }>('/anomalies'),

  acknowledgeAnomaly: (anomalyId: string, status: string) =>
    send<{ id: string; status: string }>(`/anomalies/${anomalyId}/status`, 'PATCH', { status }),

  priority: (assetId: string) =>
    get<Record<string, unknown>>(`/priority/${encodeURIComponent(assetId)}`, 60000),

  forecast: (assetId: string, horizonDays: number) =>
    get<Record<string, unknown>>(
      `/forecast/${encodeURIComponent(assetId)}?horizon_days=${horizonDays}`,
      60000,
    ),

  models: () =>
    get<{
      rows: Array<{
        id: string
        name: string
        task: string
        algorithm: string
        trainedAt: string
        metrics: Record<string, unknown>
        status: string
      }>
    }>('/models'),

  retrainModel: (modelId: string) =>
    send<{ model_id: string; status: string }>(`/models/${modelId}/retrain`, 'POST', {}),

  provenanceSources: () =>
    get<{
      rows: Array<{
        id: number
        datasetName: string
        publisher: string
        dataClass: string
        url?: string
        recordCount: number
        integrityScore: number
        notes?: string
      }>
    }>('/provenance/sources'),

  startSimulation: (assetId: string, scenario: string) =>
    send<{ session_id: string; asset_id: string; scenario: string }>(
      '/simulation/sessions',
      'POST',
      { asset_id: assetId, scenario },
    ),

  stopSimulation: (sessionId: string) =>
    send<{ stopped: string }>(`/simulation/sessions/${sessionId}`, 'DELETE'),
}

/** Build a simulation WebSocket URL that respects the Vite proxy. */
export function simulationSocketUrl(sessionId: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = import.meta.env.VITE_WS_HOST || window.location.host
  return `${proto}://${host}/ws/simulation/${sessionId}`
}
