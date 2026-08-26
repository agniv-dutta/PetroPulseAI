/**
 * Calculate Asset Intervention Priority Score (AIPS)
 *
 * Canonical formula (backend is single source of truth — see backend/app/services/aips_service.py):
 * AIPS = (w1 × Loss_Magnitude) + (w2 × Anomaly_Severity)
 *        + (w3 × Recovery_Opportunity) - (w4 × Intervention_Complexity)
 *
 * where
 * - Loss_Magnitude          = |Expected - Actual| / Expected × 100  (always positive)
 * - Anomaly_Severity        = Anomaly_Score (0-1) × 100
 * - Recovery_Opportunity    = max(Expected-Actual,0)/Expected ×100 × Historical_Rate × Model_Confidence
 * - Intervention_Complexity = normalized 0-1 ×100
 *
 * The weighted sum is presented on 0-100 via scale_reference (default 30):
 *   score = clip( raw / 30 ×100, 0, 100 )
 * so the MH-07 reference scenario reproduces ~92 → CRITICAL.
 * Weights: w1=0.30, w2=0.25, w3=0.35, w4=0.10
 *
 * NOTE: This module is intentionally kept convergent with the backend for
 * offline/preview use only. Runtime pages MUST render the backend breakdown
 * and must not present a competing score in production paths (see audit §4).
 */

export interface AIPSInput {
  asset_id: string;
  expected_production: number;      // MMBL
  actual_production: number;         // MMBL
  anomaly_score: number;             // 0-1 from ML model
  historical_recovery_rate: number;  // 0.7-0.9 based on asset type
  intervention_complexity: number;   // 0-1 (time/difficulty normalized)
}

export interface AIPSOutput {
  aips_score: number;                // 0-100 scale
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

  // Component breakdown for transparency
  loss_magnitude: number;
  loss_magnitude_weight: number;

  anomaly_severity: number;
  anomaly_severity_weight: number;

  recovery_opportunity: number;      // Percentage %, capped at confidence
  recovery_opportunity_weight: number;

  intervention_complexity: number;
  intervention_complexity_weight: number;

  // Transparency metrics
  confidence: number;                // 0-1 based on anomaly score
  recovery_confidence_breakdown: {
    historical_success_rate: number;
    model_confidence: number;
    combined_confidence: number;
  };
}

const AIPS_WEIGHTS = { loss: 0.30, anomaly: 0.25, recovery: 0.35, complexity: -0.10 } as const;
const AIPS_SCALE_REFERENCE = 30.0;

function modelConfidenceForAnomaly(anomalyScore: number): number {
  if (anomalyScore > 0.85) return 0.90;
  if (anomalyScore >= 0.70) return 0.75;
  return 0.60;
}

export function calculateAIPS(input: AIPSInput): AIPSOutput {
  const expected = Math.max(Number(input.expected_production), 1e-9);
  const actual = Number(input.actual_production);
  const anomalyScore = Math.min(Math.max(Number(input.anomaly_score), 0), 1);
  const complexity = Math.min(Math.max(Number(input.intervention_complexity), 0), 1);
  const histRate = Math.min(Math.max(Number(input.historical_recovery_rate), 0), 1);

  const loss_magnitude = Math.abs(expected - actual) / expected * 100.0;
  const anomaly_severity = anomalyScore; // 0-1
  const raw_gap_pct = Math.max(expected - actual, 0) / expected * 100.0;
  const model_confidence = modelConfidenceForAnomaly(anomalyScore);
  const combined_confidence = (histRate + model_confidence) / 2.0;
  // Canonical recovery: gap% × hist_rate × model_conf (not combined)
  const recovery_opportunity = raw_gap_pct * histRate * model_confidence;

  const lossContribution = AIPS_WEIGHTS.loss * loss_magnitude;
  const anomalyContribution = AIPS_WEIGHTS.anomaly * anomaly_severity * 100.0;
  const recoveryContribution = AIPS_WEIGHTS.recovery * recovery_opportunity;
  const complexityPenalty = AIPS_WEIGHTS.complexity * complexity * 100.0; // negative
  const rawScore = lossContribution + anomalyContribution + recoveryContribution + complexityPenalty;
  const aips_score = Math.min(Math.max(rawScore / AIPS_SCALE_REFERENCE * 100.0, 0), 100);

  let priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  if (aips_score >= 80) priority = "CRITICAL";
  else if (aips_score >= 60) priority = "HIGH";
  else if (aips_score >= 40) priority = "MEDIUM";
  else priority = "LOW";

  return {
    aips_score,
    priority,
    loss_magnitude,
    loss_magnitude_weight: AIPS_WEIGHTS.loss,
    anomaly_severity,
    anomaly_severity_weight: AIPS_WEIGHTS.anomaly,
    recovery_opportunity,
    recovery_opportunity_weight: AIPS_WEIGHTS.recovery,
    intervention_complexity: complexity,
    intervention_complexity_weight: Math.abs(AIPS_WEIGHTS.complexity),
    confidence: combined_confidence,
    recovery_confidence_breakdown: {
      historical_success_rate: histRate,
      model_confidence,
      combined_confidence,
    },
  };
}

/**
 * Example usage:
 * const result = calculateAIPS({
 *   asset_id: "MH-07",
 *   expected_production: 1.42,
 *   actual_production: 1.17,
 *   anomaly_score: 0.94,
 *   historical_recovery_rate: 0.80,
 *   intervention_complexity: 0.60
 * });
 *
 * Result:
 * {
 *   aips_score: 92,
 *   priority: "CRITICAL",
 *   confidence: 0.85,
 *   ...
 * }
 */
