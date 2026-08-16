/**
 * Calculate Asset Intervention Priority Score (AIPS)
 *
 * CORRECTED FORMULA:
 * AIPS = (w₁ × Loss_Norm) + (w₂ × Anomaly_Norm)
 *        + (w₃ × Recovery_Norm) - (w₄ × Complexity_Norm)
 *
 * Each component is normalized onto a 0-100 scale before weighting so the
 * final score is a true 0-100 priority score:
 * - Loss_Magnitude = |Expected - Actual| / Expected × 100 (always positive)
 *   normalized against a documented reference (18% loss = 100)
 * - Anomaly_Severity = Anomaly_Score (0-1 from Isolation Forest) × 100
 * - Recovery_Opportunity = (Expected - Actual) / Expected × 100
 *                         × Historical_Recovery_Rate × Confidence
 *   normalized against a documented reference (15% opportunity = 100)
 * - Intervention_Complexity = normalized 0-1, applied as a penalty
 *
 * Weights (positive weights sum to 1.0; complexity is a penalty):
 * w₁ = 0.35, w₂ = 0.25, w₃ = 0.40, w₄ = 0.10
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

export function calculateAIPS(input: AIPSInput): AIPSOutput {
  // Constants
  const W_LOSS = 0.35;
  const W_ANOMALY = 0.25;
  const W_RECOVERY = 0.40;
  const W_COMPLEXITY = 0.10;

  // Normalization references (a loss/opportunity at this level = 100 on 0-100 scale)
  const LOSS_NORM_REFERENCE = 18;      // 18% production loss
  const RECOVERY_NORM_REFERENCE = 15;  // 15% recovery opportunity

  // CORRECTED: Loss Magnitude is always positive
  const loss_magnitude = Math.abs(input.expected_production - input.actual_production)
                         / input.expected_production * 100;

  const anomaly_severity = input.anomaly_score; // Already 0-1

  // Recovery Opportunity (capped by confidence)
  const raw_recovery_percent = Math.max(
    0,
    (input.expected_production - input.actual_production)
      / input.expected_production * 100
  );

  // Confidence scoring based on anomaly severity
  let model_confidence: number;
  if (input.anomaly_score > 0.85) {
    model_confidence = 0.90; // High confidence
  } else if (input.anomaly_score > 0.70) {
    model_confidence = 0.75; // Medium confidence
  } else {
    model_confidence = 0.60; // Low confidence
  }

  const combined_confidence =
    (input.historical_recovery_rate + model_confidence) / 2;

  // Recovery opportunity is capped by combined confidence
  const recovery_opportunity = raw_recovery_percent * combined_confidence;

  // Intervention complexity is already normalized 0-1
  const intervention_complexity = Math.min(1, Math.max(0, input.intervention_complexity));

  // Normalize each component onto a 0-100 scale before weighting
  const loss_norm = Math.min(100, loss_magnitude / LOSS_NORM_REFERENCE * 100);
  const anomaly_norm = anomaly_severity * 100;
  const recovery_norm = Math.min(100, recovery_opportunity / RECOVERY_NORM_REFERENCE * 100);
  const complexity_norm = intervention_complexity * 100;

  // Final AIPS score (0-100 scale)
  const aips_score = Math.min(100, Math.max(0,
    W_LOSS * loss_norm
    + W_ANOMALY * anomaly_norm
    + W_RECOVERY * recovery_norm
    - W_COMPLEXITY * complexity_norm
  ));

  // Priority classification
  let priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  if (aips_score >= 80) priority = "CRITICAL";
  else if (aips_score >= 60) priority = "HIGH";
  else if (aips_score >= 40) priority = "MEDIUM";
  else priority = "LOW";

  return {
    aips_score,
    priority,
    loss_magnitude,
    loss_magnitude_weight: W_LOSS,
    anomaly_severity,
    anomaly_severity_weight: W_ANOMALY,
    recovery_opportunity: Math.min(raw_recovery_percent, recovery_opportunity),
    recovery_opportunity_weight: W_RECOVERY,
    intervention_complexity,
    intervention_complexity_weight: W_COMPLEXITY,
    confidence: combined_confidence,
    recovery_confidence_breakdown: {
      historical_success_rate: input.historical_recovery_rate,
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
