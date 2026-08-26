/**
 * TypeScript types matching backend Pydantic schemas.
 * These types correspond to the schemas defined in backend/app/models/schemas.py
 */

// Common types
export type LiteralUnion<T extends string> = T | (string & {})

// Health Response
export interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  service: string
  version: string
  database_connected: boolean
  redis_connected: boolean
  timestamp: string
}

// Error Response
export interface ErrorResponse {
  error: string
  message: string
  status_code: number
  details?: Record<string, unknown>
}

// Asset Response
export interface AssetResponse {
  id: string
  name: string
  field: string
  basin: string
  latitude: number
  longitude: number
  onstream_year: number
  status: 'ACTIVE' | 'INACTIVE' | 'SHUT_IN'
  baseline_qi: number
  baseline_di: number
  baseline_b: number
  operating_cost_usd_m: number
  intervention_cost_usd_m: number
}

// Monthly Production
export interface MonthlyProduction {
  period: string
  oil_bbl_d: number
  expected_bbl_d: number
  gas_mmcf_d: number
  water_cut_pct: number
}

// Forecast Point
export interface ForecastPoint {
  step: number
  forecast: number
  lower: number
  upper: number
}

// Forecast Metrics
export interface ForecastMetrics {
  mae: number
  rmse: number
  r2: number
  mape: number
}

// Forecast Response
export interface ForecastResponse {
  asset_id: string
  horizon: number
  forecast: ForecastPoint[]
  model: string
  confidence: number
  metrics: ForecastMetrics
  historical_points: Array<{
    period: string
    oil_bbl_d: number
    expected_bbl_d: number
  }>
  forecast_points: ForecastPoint[]
}

// Anomaly Response
export interface AnomalyResponse {
  assetId: string
  assetName?: string
  field?: string
  basin?: string
  severity: 'NORMAL' | 'WATCH' | 'ALERT' | 'CRITICAL'
  anomalyScore: number
  deviationPct: number
  expectedBblD?: number
  actualBblD?: number
  contributingFeatures: Array<{
    label: string
    importance: number
    [key: string]: unknown
  }>
  detectedAt?: string
  aipsPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: string
}

// AIPS Score Response (GET /aips/{asset_id})
export interface AIPSScoreResponse {
  asset_id: string
  score: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  breakdown: Record<string, unknown>
  confidence_breakdown: Record<string, number>
  estimated_recovery_mmbbl?: number
  estimated_value_usd_m?: number
}

// Asset Ranking Response row (GET /aips/ranking -> { rows, generated_at })
export interface AssetRankingResponse {
  rank: number
  assetId: string
  name: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  field?: string
  basin?: string
  aipsScore: number
  breakdown?: Record<string, unknown>
  estimatedValueUsdM?: number
  estimatedRecoveryMmbbl?: number
  anomalyScore: number
  deviationPct: number
  currentProdBblD?: number
  expectedProdBblD?: number
  declineRatePctPerMonth?: number
  recoveryOpportunityPct?: number
}

// SHAP Explanation Response (GET /shap/{asset_id})
export interface SHAPExplanationResponse {
  asset_id: string
  terminology?: string
  caveat?: string
  base_value?: number
  explainer_method?: string
  contributions: Array<{
    feature: string
    label: string
    value?: number
    baseline?: number
    shap_value?: number
    direction?: 'UPWARD' | 'DOWNWARD'
    relative_contribution_pct?: number
    share_pct?: number
  }>
  feature_importance?: Array<{ feature: string; label: string; importance: number }>
  data_source?: string
}

// Simulation Response
export interface SimulationResponse {
  simulation_id: string
  asset_id: string
  scenario: string
  created_at: string
  status: 'RUNNING' | 'PAUSED' | 'STOPPED'
  ticks_sent: number
}

// Simulation Telemetry (WebSocket)
export interface SimulationTelemetry {
  type: 'telemetry'
  timestamp: string
  asset_id: string
  source_type: 'SYNTHETIC' | 'REAL'
  production: number
  pressure: number
  temperature: number
  flow_rate: number
  forecast: number
  anomaly_score: number
  severity: 'NORMAL' | 'WATCH' | 'ALERT' | 'CRITICAL'
  aips_score: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recovery_opportunity: number
  confidence: number
}

// Simulation Event (WebSocket)
export interface SimulationEvent {
  type: 'simulation_started' | 'anomaly_injected' | 'priority_changed' | 'simulation_stopped' | 'error'
  timestamp: string
  simulation_id: string
  message: string
  data?: Record<string, unknown>
}

// Forecast Metrics Response
export interface ForecastMetricsResponse {
  horizon: string
  mae: number
  rmse: number
  r2: number
  mape: number
}

// Anomaly Metrics Response
export interface AnomalyMetricsResponse {
  precision: number
  recall: number
  f1: number
  accuracy: number
  roc_auc: number
  true_positives: number
  false_positives: number
  false_negatives: number
  true_negatives: number
}

// Model Version Response
export interface ModelVersionInfo {
  id: string
  name: string
  modelType: string
  version: string
  task: string
  algorithm: string
  status: string
  features: string[]
  metrics: Record<string, number>
  limitations: string | null
  trainingDataset: string | null
  trainingDate: string | null
  registeredAt: string
  notes: string | null
}

export interface ModelVersionsResponse {
  rows: ModelVersionInfo[]
  count: number
}

export interface ModelDetailResponse extends ModelVersionInfo {
  validation: { valid: boolean; reason: string }
}

// Request types
export interface SimulationStartRequest {
  asset_id: string
  scenario?: string
}

export interface InjectAnomalyRequest {
  severity: string
  magnitude: number
}
