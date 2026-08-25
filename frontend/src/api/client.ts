/**
 * Centralized HTTP client for the PetroPulse AI backend.
 * Provides typed API calls with proper error handling and timeout support.
 */

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api/v1'

export type DataClass = 'REAL' | 'SYNTHETIC' | 'DERIVED'

export interface ApiError {
  error: string
  message: string
  status_code: number
  details?: Record<string, unknown>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    timeoutMs = 15000,
  ): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      clearTimeout(timer)

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          error: 'NetworkError',
          message: `HTTP ${response.status}: ${response.statusText}`,
          status_code: response.status,
        }))
        throw new Error(error.message)
      }

      return (await response.json()) as T
    } catch (error) {
      clearTimeout(timer)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown API error')
    }
  }

  async get<T>(path: string, timeoutMs = 15000): Promise<T> {
    return this.request<T>(path, { method: 'GET' }, timeoutMs)
  }

  async post<T>(path: string, body?: unknown, timeoutMs = 15000): Promise<T> {
    return this.request<T>(
      path,
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      timeoutMs,
    )
  }

  async patch<T>(path: string, body?: unknown, timeoutMs = 15000): Promise<T> {
    return this.request<T>(
      path,
      {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      },
      timeoutMs,
    )
  }

  async delete<T>(path: string, timeoutMs = 15000): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' }, timeoutMs)
  }
}

export const client = new ApiClient(API_BASE_URL)

// Legacy types for backward compatibility
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

// Legacy API object for backward compatibility
async function get<T>(path: string, timeoutMs = 15000): Promise<T | null> {
  try {
    return await client.get<T>(path, timeoutMs)
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
    switch (method) {
      case 'POST':
        return await client.post<T>(path, body)
      case 'PATCH':
        return await client.patch<T>(path, body)
      case 'DELETE':
        return await client.delete<T>(path)
      default:
        return null
    }
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

  startSimulation: (assetId: string, scenario: string, opts?: { speed_multiplier?: number }) =>
    send<{ session_id: string; asset_id: string; scenario: string }>(
      '/simulation/sessions',
      'POST',
      { asset_id: assetId, scenario, ...(opts ?? {}) },
    ),

  pauseSimulation: (sessionId: string) =>
    send<{ session_id: string }>(`/simulation/${encodeURIComponent(sessionId)}/pause`, 'POST'),

  resumeSimulation: (sessionId: string) =>
    send<{ session_id: string }>(`/simulation/${encodeURIComponent(sessionId)}/resume`, 'POST'),

  injectAnomaly: (sessionId: string, scenario: string) =>
    send<{ status: string }>(
      `/simulation/${encodeURIComponent(sessionId)}/inject-anomaly`,
      'POST',
      { scenario },
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
