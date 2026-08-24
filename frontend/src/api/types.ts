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
  id: string
  asset_id: string
  detected_at: string
  window_start: string
  window_end: string
  severity: 'NORMAL' | 'WATCH' | 'ALERT' | 'CRITICAL'
  anomaly_score: number
  deviation_pct: number
  expected_bbl_d: number
  actual_bbl_d: number
  contributing_features: Array<{
    feature: string
    importance: number
  }>
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'
}

// AIPS Score Response
export interface AIPSScoreResponse {
  asset_id: string
  aips_score: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  breakdown: Record<string, unknown>
  created_at: string
}

// Asset Ranking Response
export interface AssetRankingResponse {
  rank: number
  asset_id: string
  asset_name: string
  aips_score: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  field: string
  basin: string
}

// SHAP Explanation Response
export interface SHAPExplanationResponse {
  asset_id: string
  forecast_run_id: number
  shap_values: Array<{
    feature: string
    value: number
    importance: number
  }>
  feature_names: string[]
  base_value: number
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

// Request types
export interface SimulationStartRequest {
  asset_id: string
  scenario?: string
}

export interface InjectAnomalyRequest {
  severity: string
  magnitude: number
}
