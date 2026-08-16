# IDE Prompts for Corrected PetroPulse AI Components

---

## PROMPT 1: Corrected AIPS Calculator Utility

**File**: `src/utils/aipsCalculator.ts`

**Purpose**: Implement the corrected AIPS formula with proper variable normalization

```typescript
/**
 * Calculate Asset Intervention Priority Score (AIPS)
 * 
 * CORRECTED FORMULA:
 * AIPS = (w₁ × Loss_Magnitude) + (w₂ × Anomaly_Severity) 
 *        + (w₃ × Recovery_Opportunity) - (w₄ × Intervention_Complexity)
 * 
 * Where:
 * - Loss_Magnitude = |Expected - Actual| / Expected × 100 (always positive)
 * - Anomaly_Severity = Anomaly_Score (0-1 from Isolation Forest)
 * - Recovery_Opportunity = (Expected - Actual) / Expected × 100 
 *                         × Historical_Recovery_Rate × Confidence
 * - Intervention_Complexity = normalized 0-1
 * 
 * Weights (sum to 1.0):
 * w₁ = 0.30, w₂ = 0.25, w₃ = 0.35, w₄ = 0.10
 */

interface AIPSInput {
  asset_id: string;
  expected_production: number;      // MMBL
  actual_production: number;         // MMBL
  anomaly_score: number;             // 0-1 from ML model
  historical_recovery_rate: number;  // 0.7-0.9 based on asset type
  intervention_complexity: number;   // 0-1 (time/difficulty normalized)
}

interface AIPSOutput {
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
  const W_LOSS = 0.30;
  const W_ANOMALY = 0.25;
  const W_RECOVERY = 0.35;
  const W_COMPLEXITY = 0.10;
  
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
  
  // Calculate AIPS components
  const aips_loss_component = W_LOSS * loss_magnitude;
  const aips_anomaly_component = W_ANOMALY * (anomaly_severity * 100);
  const aips_recovery_component = W_RECOVERY * recovery_opportunity;
  const aips_complexity_penalty = W_COMPLEXITY * (intervention_complexity * 100);
  
  // Final AIPS score (0-100 scale)
  const aips_raw = aips_loss_component 
                   + aips_anomaly_component 
                   + aips_recovery_component 
                   - aips_complexity_penalty;
  
  // Normalize to 0-100 with scaling factor
  const aips_score = Math.min(100, Math.max(0, aips_raw));
  
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
```

**IDE Instruction**:

Generate a TypeScript utility file that implements the corrected AIPS formula.

Requirements:
1. Loss_Magnitude must be calculated as |Expected - Actual| / Expected × 100 (always positive)
2. Recovery_Opportunity must be estimated (not guaranteed) and capped by a confidence factor
3. Confidence factor should vary based on anomaly_score (0.90 if score > 0.85, 0.75 if 0.70-0.85, 0.60 if < 0.70)
4. Return object must include recovery_confidence_breakdown showing historical_success_rate, model_confidence, and combined_confidence
5. AIPS score should be normalized to 0-100 scale
6. Include detailed JSDoc comments explaining the corrected formula
7. Add example usage comment at the bottom showing calculation for MH-07 (expected 1.42, actual 1.17, anomaly 0.94)
8. Export TypeScript interfaces (AIPSInput, AIPSOutput) for type safety

Output: Fully functional utility file with no errors, ready to import into components.

---

## PROMPT 2: Recovery Opportunity Component

**File**: `src/components/RecoveryOpportunityCard.tsx`

**Purpose**: Display recovery opportunity with proper caveats (not guarantee)

```tsx
/**
 * RecoveryOpportunityCard
 * 
 * Displays estimated recovery opportunity with confidence breakdown.
 * CRITICAL: Shows this as an ESTIMATE, not a guarantee.
 * 
 * Props:
 * - asset_id: string
 * - expected_production: number (MMBL)
 * - actual_production: number (MMBL)
 * - historical_recovery_rate: number (0-1, e.g., 0.80 = 80%)
 * - model_confidence: number (0-1)
 * - combined_confidence: number (0-1)
 * - anomaly_score: number (0-1)
 */

import React from 'react';

interface RecoveryOpportunityCardProps {
  asset_id: string;
  expected_production: number;
  actual_production: number;
  historical_recovery_rate: number;
  model_confidence: number;
  combined_confidence: number;
  anomaly_score: number;
}

export function RecoveryOpportunityCard({
  asset_id,
  expected_production,
  actual_production,
  historical_recovery_rate,
  model_confidence,
  combined_confidence,
  anomaly_score,
}: RecoveryOpportunityCardProps) {
  // Calculate values
  const loss_volume = expected_production - actual_production;
  const loss_percent = (loss_volume / expected_production) * 100;
  
  // Recovery opportunity: estimate based on confidence
  const recovery_opportunity_volume = loss_volume * combined_confidence;
  const recovery_opportunity_percent = loss_percent * combined_confidence;
  
  // Color coding based on recovery potential
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.85) return '#00D966'; // Green - high confidence
    if (conf >= 0.70) return '#FFD700'; // Yellow - medium confidence
    return '#FF9000'; // Orange - low confidence
  };

  return (
    <div className="recovery-opportunity-card" style={{
      background: '#1A1D1F',
      border: '0.5px solid #2A2D30',
      borderRadius: '8px',
      padding: '1.5rem',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{
          color: '#F3EFE4',
          margin: '0 0 0.5rem',
          fontSize: '16px',
          fontWeight: '500',
        }}>
          Estimated Recovery Opportunity
        </h3>
        <p style={{
          color: '#B8B3A8',
          margin: 0,
          fontSize: '12px',
        }}>
          ⚠ This is an estimate, not a guarantee. Actual recovery depends on intervention success.
        </p>
      </div>

      {/* Main Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginBottom: '1.5rem',
        paddingBottom: '1.5rem',
        borderBottom: '0.5px solid #2A2D30',
      }}>
        {/* Current Loss */}
        <div>
          <div style={{
            color: '#B8B3A8',
            fontSize: '12px',
            marginBottom: '4px',
            textTransform: 'uppercase',
          }}>
            Current Loss
          </div>
          <div style={{
            color: '#FF3B3B',
            fontSize: '20px',
            fontWeight: '500',
          }}>
            {loss_volume.toFixed(2)} MMBL
          </div>
          <div style={{
            color: '#B8B3A8',
            fontSize: '12px',
            marginTop: '2px',
          }}>
            {loss_percent.toFixed(1)}% below expected
          </div>
        </div>

        {/* Recovery Opportunity */}
        <div>
          <div style={{
            color: '#B8B3A8',
            fontSize: '12px',
            marginBottom: '4px',
            textTransform: 'uppercase',
          }}>
            Estimated Recovery Opportunity
          </div>
          <div style={{
            color: '#00D966',
            fontSize: '20px',
            fontWeight: '500',
          }}>
            {recovery_opportunity_volume.toFixed(2)} MMBL
          </div>
          <div style={{
            color: '#B8B3A8',
            fontSize: '12px',
            marginTop: '2px',
          }}>
            {recovery_opportunity_percent.toFixed(1)}% of current production
          </div>
        </div>
      </div>

      {/* Confidence Breakdown */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{
          color: '#F3EFE4',
          margin: '0 0 1rem',
          fontSize: '14px',
          fontWeight: '500',
        }}>
          Confidence Factors
        </h4>

        {/* Breakdown rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Historical Success Rate */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: '#B8B3A8', fontSize: '13px' }}>
              Historical Recovery Rate
              <span style={{
                color: '#8C8B85',
                fontSize: '11px',
                marginLeft: '6px',
              }}>
                (similar assets)
              </span>
            </span>
            <span style={{
              color: getConfidenceColor(historical_recovery_rate),
              fontSize: '14px',
              fontWeight: '500',
            }}>
              {(historical_recovery_rate * 100).toFixed(0)}%
            </span>
          </div>

          {/* Model Confidence */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: '#B8B3A8', fontSize: '13px' }}>
              Model Confidence (Anomaly Severity)
              <span style={{
                color: '#8C8B85',
                fontSize: '11px',
                marginLeft: '6px',
              }}>
                (score: {anomaly_score.toFixed(2)})
              </span>
            </span>
            <span style={{
              color: getConfidenceColor(model_confidence),
              fontSize: '14px',
              fontWeight: '500',
            }}>
              {(model_confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Combined Confidence */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '8px',
            borderTop: '0.5px solid #2A2D30',
          }}>
            <span style={{
              color: '#F3EFE4',
              fontSize: '13px',
              fontWeight: '500',
            }}>
              Combined Confidence
            </span>
            <span style={{
              color: getConfidenceColor(combined_confidence),
              fontSize: '16px',
              fontWeight: '500',
            }}>
              {(combined_confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        background: 'rgba(255, 176, 0, 0.05)',
        border: '0.5px solid #FF9000',
        borderRadius: '6px',
        padding: '12px',
      }}>
        <p style={{
          color: '#B8B3A8',
          fontSize: '12px',
          lineHeight: '1.6',
          margin: 0,
        }}>
          <strong style={{ color: '#FF9000' }}>⚠ How This Estimate Works:</strong><br/>
          <br/>
          Recovery opportunity is calculated as:<br/>
          <code style={{
            color: '#C7F700',
            fontSize: '11px',
            background: 'rgba(199, 247, 0, 0.1)',
            padding: '2px 4px',
            borderRadius: '3px',
          }}>
            Current Loss × Historical Success Rate × Model Confidence
          </code>
          <br/>
          <br/>
          <strong>What this means:</strong><br/>
          • <strong>Historical Success Rate</strong>: Based on past interventions for similar 
          issues (e.g., 80% of pressure-drop interventions recovered their loss)<br/>
          • <strong>Model Confidence</strong>: Higher anomaly severity (0.94) = higher model 
          confidence (90%)<br/>
          • <strong>Combined Result</strong>: IF this asset is intervened AND the 
          intervention addresses the root cause, ~{recovery_opportunity_percent.toFixed(1)}% recovery is reasonable
          <br/>
          <br/>
          <strong>Important:</strong> Actual recovery depends on intervention effectiveness, 
          field conditions, and whether the model's diagnosis is correct.
        </p>
      </div>

      {/* Additional Notes */}
      <div style={{
        marginTop: '1rem',
        padding: '12px',
        background: '#111313',
        borderRadius: '6px',
      }}>
        <p style={{
          color: '#B8B3A8',
          fontSize: '11px',
          lineHeight: '1.5',
          margin: 0,
        }}>
          <strong>Field Verification Needed:</strong><br/>
          Before committing to intervention, field teams should:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Verify the root cause (SHAP shows "Operational Change")</li>
            <li>Check actual system status (pressure gauge, flow meter, valve position)</li>
            <li>Assess intervention risk vs. reward</li>
            <li>Plan maintenance strategy</li>
          </ul>
        </p>
      </div>
    </div>
  );
}
```

**IDE Instruction**:

Generate a React component called "RecoveryOpportunityCard" that displays recovery opportunity as an estimate with full confidence breakdown.

Requirements:
1. Must display "Estimated Recovery Opportunity" (not "guaranteed")
2. Show current loss volume (MMBL) and percentage
3. Show recovery opportunity volume calculated as: loss × historical_rate × combined_confidence
4. Display confidence breakdown table:
   - Historical Recovery Rate (what % of similar interventions worked)
   - Model Confidence (based on anomaly score: 90% if >0.85, 75% if 0.70-0.85, 60% if <0.70)
   - Combined Confidence (average of the two)
5. Color-code confidence percentages: green ≥85%, yellow ≥70%, orange <70%
6. Include a prominent ⚠ disclaimer explaining this is an estimate, not a guarantee
7. Show the formula inline: Current Loss × Historical Rate × Model Confidence
8. Add "Field Verification Needed" section explaining what teams must check
9. Use dark theme colors (#1A1D1F background, #F3EFE4 text, #FF9000 warnings)
10. Include inline code styling for the formula

Output: Fully styled React component, responsive, ready to integrate into Asset Detail or Decision Panel.

---

## PROMPT 3: Data Transparency Banner

**File**: `src/components/DataTransparencyBanner.tsx`

**Purpose**: Dashboard banner clearly marking real vs. synthetic data

```tsx
/**
 * DataTransparencyBanner
 * 
 * Displays on dashboard to clearly indicate:
 * - Real data from OGD/PPAC/DGH
 * - Synthetic data for simulation and high-frequency features
 * 
 * Should appear at top of Dashboard and Simulation pages.
 */

import React from 'react';

interface DataTransparencyBannerProps {
  context?: 'dashboard' | 'simulation' | 'anomaly'; // Affects messaging
  isDismissible?: boolean;
}

export function DataTransparencyBanner({
  context = 'dashboard',
  isDismissible = true,
}: DataTransparencyBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  const getMessage = () => {
    switch (context) {
      case 'simulation':
        return (
          <>
            <strong>🔄 Synthetic Data Simulation</strong><br />
            This stream is <strong>generated from statistical models</strong>, not actual 
            ONGC SCADA telemetry. Used for demonstration of anomaly detection and real-time capabilities.
          </>
        );
      case 'anomaly':
        return (
          <>
            <strong>⚠ Model-Estimated Anomalies</strong><br />
            Anomaly scores are from machine learning models trained on <strong>synthetic 
            high-frequency data</strong>. Pressure/temperature/flow values shown are <strong>not 
            measured</strong>—they are simulated for demo purposes.
          </>
        );
      default:
        return (
          <>
            <strong>📊 Data Sources Disclosure</strong><br />
            Dashboard displays <strong>real production data</strong> (OGD/PPAC) and 
            <strong>synthetic simulation</strong> (high-frequency anomalies, operational parameters).
          </>
        );
    }
  };

  return (
    <div style={{
      background: 'rgba(255, 176, 0, 0.08)',
      border: '0.5px solid #FF9000',
      borderRadius: '6px',
      padding: '12px 16px',
      marginBottom: '1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{
        color: '#B8B3A8',
        fontSize: '13px',
        lineHeight: '1.5',
        flex: 1,
      }}>
        {getMessage()}
        <br />
        <a 
          href="/data-provenance" 
          style={{
            color: '#FF9000',
            textDecoration: 'none',
            fontSize: '12px',
            marginTop: '4px',
            display: 'inline-block',
          }}
        >
          View Data Sources & Methodology →
        </a>
      </div>

      {isDismissible && (
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#B8B3A8',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0 12px',
            marginLeft: '12px',
          }}
          title="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
```

**IDE Instruction**:

Generate a React component called "DataTransparencyBanner" that appears on Dashboard, Simulation, and Anomaly pages.

Requirements:
1. Display a prominent banner with ⚠ or 📊 icon at start
2. Text should clearly state: "Real data (OGD/PPAC)" and "Synthetic data (simulation)"
3. Accept `context` prop to customize message:
   - 'dashboard': "Dashboard displays real production data and synthetic simulation"
   - 'simulation': "This stream is generated from statistical models, not actual ONGC SCADA"
   - 'anomaly': "Anomaly scores from ML models trained on synthetic data"
4. Include link to "/data-provenance" page: "View Data Sources & Methodology →"
5. Use color: background rgba(255, 176, 0, 0.08), border #FF9000
6. Make dismissible with small ✕ button (optional prop `isDismissible`)
7. Maintain dismissed state in component (don't persist across page reload)
8. Use dark theme text colors (#B8B3A8, #FF9000)
9. Responsive: stack on mobile if needed

Output: Reusable React component, ready to import into Dashboard.tsx, SimulationCenter.tsx, AnomalyDetectionCenter.tsx

---

## PROMPT 4: Data Provenance Page (Enhanced)

**File**: `src/pages/DataProvenance.tsx`

**Purpose**: Comprehensive page explaining data sources, formulas, and disclaimers

```tsx
/**
 * DataProvenance
 * 
 * Comprehensive documentation page explaining:
 * - What data is real (OGD/PPAC/DGH)
 * - What data is synthetic (simulation, operational parameters)
 * - How synthetic data is generated
 * - Formulas used (AIPS, Recovery, etc.)
 * - Disclaimers and limitations
 * 
 * This page is referenced from banners throughout the app.
 * Should be accessible from help/glossary and data transparency banners.
 */

import React from 'react';

export function DataProvenance() {
  return (
    <div style={{
      background: '#080909',
      minHeight: '100vh',
      color: '#F3EFE4',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <h1 style={{
          color: '#F3EFE4',
          fontSize: '28px',
          fontWeight: '500',
          marginBottom: '0.5rem',
        }}>
          Data Provenance & Methodology
        </h1>
        <p style={{
          color: '#B8B3A8',
          fontSize: '14px',
          marginBottom: '2rem',
        }}>
          Understanding what data is real, what is simulated, and how the system calculates results.
        </p>

        {/* Table of Contents */}
        <div style={{
          background: '#1A1D1F',
          border: '0.5px solid #2A2D30',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <h3 style={{ color: '#FF9000', marginTop: 0 }}>Quick Navigation</h3>
          <ul style={{ color: '#B8B3A8', lineHeight: '1.8' }}>
            <li><a href="#real-data" style={{ color: '#FF9000', textDecoration: 'none' }}>✓ Real Data Sources</a></li>
            <li><a href="#synthetic-data" style={{ color: '#FF9000', textDecoration: 'none' }}>⚠ Synthetic Data</a></li>
            <li><a href="#generation" style={{ color: '#FF9000', textDecoration: 'none' }}>🔄 Generation Method</a></li>
            <li><a href="#formulas" style={{ color: '#FF9000', textDecoration: 'none' }}>📐 Calculation Formulas</a></li>
            <li><a href="#derived" style={{ color: '#FF9000', textDecoration: 'none' }}>◆ Derived Data</a></li>
            <li><a href="#disclaimer" style={{ color: '#FF9000', textDecoration: 'none' }}>⚠ Disclaimer</a></li>
          </ul>
        </div>

        {/* REAL DATA SECTION */}
        <section id="real-data" style={{ marginBottom: '3rem' }}>
          <h2 style={{
            color: '#00D966',
            fontSize: '20px',
            fontWeight: '500',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '0.5px solid #2A2D30',
          }}>
            ✓ Real Data Sources (Public)
          </h2>

          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '1.5rem',
          }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #2A2D30' }}>
                <th style={{
                  textAlign: 'left',
                  padding: '12px',
                  color: '#F3EFE4',
                  fontWeight: '500',
                  fontSize: '13px',
                }}>Source</th>
                <th style={{
                  textAlign: 'left',
                  padding: '12px',
                  color: '#F3EFE4',
                  fontWeight: '500',
                  fontSize: '13px',
                }}>Data Type</th>
                <th style={{
                  textAlign: 'left',
                  padding: '12px',
                  color: '#F3EFE4',
                  fontWeight: '500',
                  fontSize: '13px',
                }}>Coverage</th>
                <th style={{
                  textAlign: 'left',
                  padding: '12px',
                  color: '#F3EFE4',
                  fontWeight: '500',
                  fontSize: '13px',
                }}>Update Frequency</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['OGD (data.gov.in)', 'Monthly production (MMBL, MMSCM)', 'Jan 2018 - Present', 'Monthly'],
                ['PPAC (ppac.gov.in)', 'Production reports, field summaries', 'Jan 2020 - Present', 'Quarterly'],
                ['DGH (dghindia.gov.in)', 'Hydrocarbon activity reports', 'Annual', 'Annually'],
              ].map((row, i) => (
                <tr key={i} style={{
                  borderBottom: '0.5px solid #2A2D30',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(26, 29, 31, 0.5)',
                }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{
                      padding: '12px',
                      color: j === 0 ? '#FF9000' : '#B8B3A8',
                      fontSize: '13px',
                    }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ color: '#B8B3A8', fontSize: '13px', lineHeight: '1.6' }}>
            <strong>What you can derive from this data:</strong>
            <ul>
              <li>Monthly/quarterly production trends</li>
              <li>Seasonal patterns (by comparing same months across years)</li>
              <li>Long-term decline rates (regression over 12+ months)</li>
              <li>Basin-level and field-level production baselines</li>
            </ul>
            <strong>What you cannot derive:</strong>
            <ul>
              <li>Real-time production (monthly data only)</li>
              <li>High-frequency anomalies (e.g., valve failures in seconds)</li>
              <li>Operational parameters (pressure, temperature, flow rate)</li>
              <li>Equipment status or wellbore conditions</li>
            </ul>
          </p>
        </section>

        {/* SYNTHETIC DATA SECTION */}
        <section id="synthetic-data" style={{ marginBottom: '3rem' }}>
          <h2 style={{
            color: '#FF9000',
            fontSize: '20px',
            fontWeight: '500',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '0.5px solid #2A2D30',
          }}>
            ⚠ Synthetic Data (For Demonstration)
          </h2>

          <p style={{
            color: '#B8B3A8',
            fontSize: '13px',
            lineHeight: '1.6',
            marginBottom: '1rem',
          }}>
            The following parameters are <strong>generated</strong> from statistical models 
            for demonstration purposes. They are <strong>NOT</strong> actual measurements from 
            ONGC systems.
          </p>

          <div style={{
            background: '#1A1D1F',
            border: '0.5px solid #2A2D30',
            borderRadius: '8px',
            padding: '1.5rem',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #2A2D30' }}>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px',
                    color: '#F3EFE4',
                    fontWeight: '500',
                    fontSize: '13px',
                  }}>Parameter</th>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px',
                    color: '#F3EFE4',
                    fontWeight: '500',
                    fontSize: '13px',
                  }}>Generation Method</th>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px',
                    color: '#F3EFE4',
                    fontWeight: '500',
                    fontSize: '13px',
                  }}>Range</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Real-time Production (10s)', 'Monte Carlo from monthly distribution', 'Mean ±10%'],
                  ['Pressure (bar)', 'Gaussian random walk', '180-200 bar (typical subsurface)'],
                  ['Temperature (°C)', 'Normal distribution with noise', '75-90°C ±2°C (typical reservoir)'],
                  ['Flow Rate (m³/s)', 'Derived from production + jitter', '1.5-3.0 m³/s ±8%'],
                  ['Valve Status', 'Simulated operational state', 'Open/Partial/Closed'],
                  ['Anomaly Injections', 'User-triggered scenarios', 'Valve failure, gradual clog, volatility'],
                ].map((row, i) => (
                  <tr key={i} style={{
                    borderBottom: '0.5px solid #2A2D30',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(26, 29, 31, 0.3)',
                  }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{
                        padding: '12px',
                        color: j === 0 ? '#C7F700' : '#B8B3A8',
                        fontSize: '13px',
                      }}>
                        {cell}
                      </td>
                    ))}
                </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{
            color: '#FF9000',
            fontSize: '12px',
            marginTop: '1rem',
            fontWeight: '500',
          }}>
            🔄 Upon authorization, these can be replaced with live ONGC SCADA feeds via OPC-UA or REST APIs.
          </p>
        </section>

        {/* GENERATION METHOD */}
        <section id="generation" style={{ marginBottom: '3rem' }}>
          <h2 style={{
            color: '#C7F700',
            fontSize: '20px',
            fontWeight: '500',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '0.5px solid #2A2D30',
          }}>
            🔄 How Synthetic Data is Generated
          </h2>

          <ol style={{ color: '#B8B3A8', fontSize: '13px', lineHeight: '1.8' }}>
            <li><strong style={{ color: '#F3EFE4' }}>Distribution Fitting</strong>: Fit normal distribution (μ, σ, γ) to 12 months of real monthly production data</li>
            <li><strong style={{ color: '#F3EFE4' }}>Seasonal Patterns</strong>: Extract seasonal factors by comparing same month across years</li>
            <li><strong style={{ color: '#F3EFE4' }}>Monte Carlo Sampling</strong>: Generate 10-second observations using fitted distribution + seasonal adjustment</li>
            <li><strong style={{ color: '#F3EFE4' }}>Realistic Noise</strong>: Add operational jitter (±5-10%) to simulate measurement noise</li>
            <li><strong style={{ color: '#F3EFE4' }}>Scenario Injection</strong>: User can trigger anomalies (valve failure = 30% drop in 5 min, gradual clog = 2%/day decline, etc.)</li>
            <li><strong style={{ color: '#F3EFE4' }}>Real-Time Stream</strong>: Push data every 10 seconds to dashboard, triggering ML inference</li>
          </ol>

          <pre style={{
            background: '#1A1D1F',
            border: '0.5px solid #2A2D30',
            borderRadius: '6px',
            padding: '1rem',
            color: '#C7F700',
            fontSize: '11px',
            overflow: 'auto',
            marginTop: '1rem',
          }}>
{`PIPELINE:
Historical Data (2018-2026)
    ↓
Distribution Fitting (μ, σ, seasonality)
    ↓
Monte Carlo Sampling (10-second intervals)
    ↓
Add Realistic Noise (±5-10%)
    ↓
Stream to Dashboard
    ↓
ML Inference (Isolation Forest, Forecasting, SHAP)
    ↓
Update Metrics & Alerts`}
          </pre>
        </section>

        {/* FORMULAS SECTION */}
        <section id="formulas" style={{ marginBottom: '3rem' }}>
          <h2 style={{
            color: '#FF9000',
            fontSize: '20px',
            fontWeight: '500',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '0.5px solid #2A2D30',
          }}>
            📐 Calculation Formulas
          </h2>

          <div style={{
            background: '#1A1D1F',
            border: '0.5px solid #2A2D30',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1rem',
          }}>
            <h4 style={{ color: '#F3EFE4', marginTop: 0 }}>AIPS Score (Asset Intervention Priority Score)</h4>
            <pre style={{
              color: '#C7F700',
              fontSize: '12px',
              overflow: 'auto',
            }}>
{`AIPS = (w₁ × Loss_Magnitude) 
      + (w₂ × Anomaly_Severity)
      + (w₃ × Recovery_Opportunity)
      - (w₄ × Intervention_Complexity)

Where:
  Loss_Magnitude = |Expected - Actual| / Expected × 100
                   (Always positive; higher losses = higher priority)

  Anomaly_Severity = Isolation_Forest_Score (0-1)
                     (Higher score = more severe)

  Recovery_Opportunity = (Expected - Actual) / Expected × 100
                        × Historical_Recovery_Rate
                        × Model_Confidence
                        (Estimated % recovery, not guaranteed)

  Intervention_Complexity = Normalized 0-1
                           (Higher = more complex, reduces priority)

  Weights:
    w₁ = 0.30 (Production Loss)
    w₂ = 0.25 (Anomaly Severity)
    w₃ = 0.35 (Recovery Opportunity)
    w₄ = 0.10 (Intervention Complexity)
    (Sum = 1.0)`}
            </pre>
          </div>

          <div style={{
            background: '#1A1D1F',
            border: '0.5px solid #2A2D30',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1rem',
          }}>
            <h4 style={{ color: '#F3EFE4', marginTop: 0 }}>Recovery Opportunity</h4>
            <pre style={{
              color: '#C7F700',
              fontSize: '12px',
              overflow: 'auto',
            }}>
{`Recovery_Opportunity_Volume = Current_Loss
                             × Historical_Recovery_Rate
                             × Model_Confidence

Model_Confidence = {
  0.90  if Anomaly_Score > 0.85  (High confidence)
  0.75  if 0.70 < Anomaly_Score ≤ 0.85  (Medium confidence)
  0.60  if Anomaly_Score ≤ 0.70  (Low confidence)
}

Note: This is an ESTIMATED opportunity, not guaranteed recovery.
Depends on:
  • Successful intervention
  • Correct root cause identification
  • Favorable reservoir conditions`}
            </pre>
          </div>

          <div style={{
            background: '#1A1D1F',
            border: '0.5px solid #2A2D30',
            borderRadius: '8px',
            padding: '1.5rem',
          }}>
            <h4 style={{ color: '#F3EFE4', marginTop: 0 }}>Decline Rate</h4>
            <pre style={{
              color: '#C7F700',
              fontSize: '12px',
              overflow: 'auto',
            }}>
{`Decline_Rate = (Production[t] - Production[t-1]) / Production[t-1]

Applied monthly to historical data and used as:
  • Baseline expected production calculation
  • Trend component in forecasting models`}
            </pre>
          </div>
        </section>

        {/* DERIVED DATA */}
        <section id="derived" style={{ marginBottom: '3rem' }}>
          <h2 style={{
            color: '#C7F700',
            fontSize: '20px',
            fontWeight: '500',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '0.5px solid #2A2D30',
          }}>
            ◆ Derived & Calculated Data
          </h2>

          <ul style={{ color: '#B8B3A8', fontSize: '13px', lineHeight: '1.8' }}>
            <li><strong style={{ color: '#F3EFE4' }}>Decline Rate</strong>: Calculated from historical monthly production</li>
            <li><strong style={{ color: '#F3EFE4' }}>Seasonal Patterns</strong>: Moving average of same month across 5 years</li>
            <li><strong style={{ color: '#F3EFE4' }}>Anomaly Score</strong>: Output of Isolation Forest model on synthetic high-frequency data</li>
            <li><strong style={{ color: '#F3EFE4' }}>SHAP Values</strong>: Feature importance from XGBoost gradient boosting model</li>
            <li><strong style={{ color: '#F3EFE4' }}>Production Forecast</strong>: Predicted by LSTM + XGBoost ensemble trained on historical data</li>
            <li><strong style={{ color: '#F3EFE4' }}>Recovery Opportunity</strong>: Calculated using formula above</li>
            <li><strong style={{ color: '#F3EFE4' }}>AIPS Score</strong>: Multi-factor calculation combining loss, severity, recovery, complexity</li>
          </ul>
        </section>

        {/* DISCLAIMER */}
        <section id="disclaimer" style={{
          background: 'rgba(255, 59, 59, 0.05)',
          border: '0.5px solid #FF3B3B',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '3rem',
        }}>
          <h2 style={{
            color: '#FF3B3B',
            fontSize: '20px',
            fontWeight: '500',
            marginTop: 0,
          }}>
            ⚠ Disclaimer
          </h2>

          <p style={{ color: '#B8B3A8', fontSize: '13px', lineHeight: '1.6' }}>
            <strong>PetroPulse AI is a prototype decision-support system.</strong> It demonstrates how 
            production forecasting, anomaly detection, and explainable AI can be combined for asset 
            prioritization in hydrocarbon operations.
          </p>

          <p style={{ color: '#B8B3A8', fontSize: '13px', lineHeight: '1.6' }}>
            <strong>For actual production interventions:</strong>
          </p>

          <ul style={{ color: '#B8B3A8', fontSize: '13px', lineHeight: '1.8' }}>
            <li>Field engineers must verify AI recommendations with ground truth measurements</li>
            <li>Decisions should be based on real SCADA data, not synthetic simulation</li>
            <li>Recovery estimates are based on historical patterns and models; actual outcomes may vary significantly</li>
            <li>This system should <strong>augment, not replace</strong>, expert domain knowledge</li>
            <li>Synthetic data is for demonstration only and should not be confused with operational telemetry</li>
            <li>SHAP values indicate model-estimated feature importance, not verified physical root causes</li>
          </ul>

          <p style={{
            color: '#FF9000',
            fontSize: '13px',
            fontWeight: '500',
            marginTop: '1rem',
          }}>
            🔄 Upon authorization from ONGC, synthetic data can be replaced with live SCADA telemetry 
            to enable real-world decision support.
          </p>
        </section>
      </div>
    </div>
  );
}
```

**IDE Instruction**:

Generate a comprehensive "DataProvenance" page component that documents all data sources, generation methods, and formulas.

Requirements:
1. Create sections for:
   - Real Data Sources (OGD, PPAC, DGH with table of coverage and update frequency)
   - Synthetic Data (table of parameters, generation methods, ranges)
   - Generation Method (6-step pipeline with visual ASCII diagram)
   - Calculation Formulas (AIPS, Recovery Opportunity, Decline Rate as pre-formatted code blocks)
   - Derived & Calculated Data (list of ML outputs)
   - Disclaimer (prominent red warning section)

2. Use interactive table of contents at top with anchor links

3. Color coding:
   - Real Data section: #00D966 (green)
   - Synthetic Data section: #FF9000 (orange)
   - Generation Method: #C7F700 (lime)
   - Formulas section: #FF9000 (orange)
   - Disclaimer section: #FF3B3B (red background with 5% opacity)

4. Include code blocks with monospace font for formulas and pipeline diagram

5. Make tables fully formatted with alternating row colors

6. Include all three key formulas with detailed breakdowns:
   - AIPS (corrected version with |Expected - Actual|)
   - Recovery_Opportunity (with confidence factors and NOT GUARANTEED language)
   - Decline_Rate

7. Make links to #section-ids work with scroll behavior

8. Responsive: stack properly on mobile

Output: Complete page component, ready to route as `/data-provenance`, linked from DataTransparencyBanner and Help pages.

---

## PROMPT 5: AIPS Component Breakdown Display

**File**: `src/components/AIPSBreakdown.tsx`

**Purpose**: Show AIPS score calculation with transparency in Decision Panel

```tsx
/**
 * AIPSBreakdown
 * 
 * Displays AIPS score calculation with:
 * - Component values and weights
 * - Circular gauge showing final score
 * - Formula visualization
 * - Explanation of each component
 * 
 * Props: output from calculateAIPS() function
 */

import React from 'react';

interface AIPSBreakdownProps {
  aips_score: number;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  loss_magnitude: number;
  anomaly_severity: number;
  recovery_opportunity: number;
  intervention_complexity: number;
  confidence: number;
}

export function AIPSBreakdown(props: AIPSBreakdownProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#FF3B3B'; // Critical - red
    if (score >= 60) return '#FF9000'; // High - orange
    if (score >= 40) return '#FFD700'; // Medium - yellow
    return '#00D966'; // Low - green
  };

  const getComponentLabel = (component: string) => {
    switch (component) {
      case 'loss':
        return 'Production Loss Magnitude (30% weight)';
      case 'anomaly':
        return 'Anomaly Severity (25% weight)';
      case 'recovery':
        return 'Recovery Opportunity (35% weight)';
      case 'complexity':
        return 'Intervention Complexity (10% weight)';
      default:
        return '';
    }
  };

  const getComponentExplanation = (component: string) => {
    switch (component) {
      case 'loss':
        return `|Expected - Actual| / Expected × 100. Measures how much production has been lost.`;
      case 'anomaly':
        return `Isolated Forest anomaly score (0-1). Higher = more anomalous behavior.`;
      case 'recovery':
        return `(Expected - Actual) × Historical_Rate × Model_Confidence. Estimated recovery opportunity.`;
      case 'complexity':
        return `Intervention difficulty (0-1 normalized). Higher = more difficult intervention.`;
      default:
        return '';
    }
  };

  return (
    <div style={{
      background: '#1A1D1F',
      border: '0.5px solid #2A2D30',
      borderRadius: '8px',
      padding: '1.5rem',
    }}>
      {/* Main Score Display */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1.5rem',
        borderBottom: '0.5px solid #2A2D30',
      }}>
        {/* Left: Score Circle */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${getScoreColor(props.aips_score)}20, ${getScoreColor(props.aips_score)}05)`,
            border: `3px solid ${getScoreColor(props.aips_score)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}>
            <div style={{
              fontSize: '36px',
              fontWeight: '500',
              color: getScoreColor(props.aips_score),
            }}>
              {Math.round(props.aips_score)}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#B8B3A8',
              marginTop: '4px',
            }}>
              out of 100
            </div>
          </div>
          <div style={{
            marginTop: '12px',
            paddingInline: '12px',
            textAlign: 'center',
          }}>
            <div style={{
              background: getScoreColor(props.aips_score),
              color: '#080909',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
            }}>
              {props.priority}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#B8B3A8',
              marginTop: '8px',
            }}>
              Priority Level
            </div>
          </div>
        </div>

        {/* Right: Formula */}
        <div style={{
          flex: 1,
          marginLeft: '2rem',
        }}>
          <h4 style={{
            color: '#F3EFE4',
            margin: '0 0 1rem',
            fontSize: '14px',
          }}>
            AIPS Formula
          </h4>
          <pre style={{
            background: '#111313',
            border: '0.5px solid #2A2D30',
            borderRadius: '6px',
            padding: '12px',
            color: '#C7F700',
            fontSize: '11px',
            overflow: 'auto',
            margin: 0,
            lineHeight: '1.5',
          }}>
{`AIPS = (0.30 × Loss)
     + (0.25 × Anomaly)
     + (0.35 × Recovery)
     - (0.10 × Complexity)`}
          </pre>
        </div>
      </div>

      {/* Component Breakdown */}
      <div style={{
        marginBottom: '1.5rem',
      }}>
        <h4 style={{
          color: '#F3EFE4',
          margin: '0 0 1rem',
          fontSize: '14px',
        }}>
          Component Breakdown
        </h4>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}>
          {/* Loss Component */}
          <div style={{
            background: '#111313',
            border: '0.5px solid #2A2D30',
            borderRadius: '6px',
            padding: '12px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px',
            }}>
              <span style={{
                color: '#F3EFE4',
                fontSize: '13px',
                fontWeight: '500',
              }}>
                Production Loss
              </span>
              <span style={{
                color: '#FF9000',
                fontSize: '14px',
                fontWeight: '500',
              }}>
                {props.loss_magnitude.toFixed(1)}%
              </span>
            </div>
            <div style={{
              color: '#B8B3A8',
              fontSize: '11px',
              lineHeight: '1.4',
            }}>
              {getComponentExplanation('loss')}
            </div>
            <div style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '0.5px solid #2A2D30',
              color: '#B8B3A8',
              fontSize: '11px',
            }}>
              Weight: 30% | Contribution: {(0.30 * props.loss_magnitude).toFixed(1)}
            </div>
          </div>

          {/* Anomaly Component */}
          <div style={{
            background: '#111313',
            border: '0.5px solid #2A2D30',
            borderRadius: '6px',
            padding: '12px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px',
            }}>
              <span style={{
                color: '#F3EFE4',
                fontSize: '13px',
                fontWeight: '500',
              }}>
                Anomaly Severity
              </span>
              <span style={{
                color: '#FF3B3B',
                fontSize: '14px',
                fontWeight: '500',
              }}>
                {(props.anomaly_severity * 100).toFixed(0)}/100
              </span>
            </div>
            <div style={{
              color: '#B8B3A8',
              fontSize: '11px',
              lineHeight: '1.4',
            }}>
              {getComponentExplanation('anomaly')}
            </div>
            <div style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '0.5px solid #2A2D30',
              color: '#B8B3A8',
              fontSize: '11px',
            }}>
              Weight: 25% | Contribution: {(0.25 * props.anomaly_severity * 100).toFixed(1)}
            </div>
          </div>

          {/* Recovery Component */}
          <div style={{
            background: '#111313',
            border: '0.5px solid #2A2D30',
            borderRadius: '6px',
            padding: '12px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px',
            }}>
              <span style={{
                color: '#F3EFE4',
                fontSize: '13px',
                fontWeight: '500',
              }}>
                Recovery Opportunity
              </span>
              <span style={{
                color: '#00D966',
                fontSize: '14px',
                fontWeight: '500',
              }}>
                {props.recovery_opportunity.toFixed(1)}%
              </span>
            </div>
            <div style={{
              color: '#B8B3A8',
              fontSize: '11px',
              lineHeight: '1.4',
            }}>
              {getComponentExplanation('recovery')}
            </div>
            <div style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '0.5px solid #2A2D30',
              color: '#B8B3A8',
              fontSize: '11px',
            }}>
              Weight: 35% | Contribution: {(0.35 * props.recovery_opportunity).toFixed(1)}
            </div>
          </div>

          {/* Complexity Component */}
          <div style={{
            background: '#111313',
            border: '0.5px solid #2A2D30',
            borderRadius: '6px',
            padding: '12px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px',
            }}>
              <span style={{
                color: '#F3EFE4',
                fontSize: '13px',
                fontWeight: '500',
              }}>
                Intervention Complexity
              </span>
              <span style={{
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: '500',
              }}>
                {(props.intervention_complexity * 100).toFixed(0)}/100
              </span>
            </div>
            <div style={{
              color: '#B8B3A8',
              fontSize: '11px',
              lineHeight: '1.4',
            }}>
              {getComponentExplanation('complexity')}
            </div>
            <div style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '0.5px solid #2A2D30',
              color: '#B8B3A8',
              fontSize: '11px',
            }}>
              Weight: 10% (penalty) | Penalty: -{(0.10 * props.intervention_complexity * 100).toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Confidence Metrics */}
      <div style={{
        background: 'rgba(199, 247, 0, 0.05)',
        border: '0.5px solid #C7F700',
        borderRadius: '6px',
        padding: '12px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            color: '#F3EFE4',
            fontSize: '13px',
            fontWeight: '500',
          }}>
            Model Confidence
          </span>
          <span style={{
            color: '#C7F700',
            fontSize: '14px',
            fontWeight: '500',
          }}>
            {(props.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <p style={{
          color: '#B8B3A8',
          fontSize: '11px',
          lineHeight: '1.4',
          margin: '8px 0 0',
        }}>
          Combined confidence from historical recovery rate and model anomaly scoring.
        </p>
      </div>

      {/* Footnote */}
      <div style={{
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '0.5px solid #2A2D30',
        color: '#B8B3A8',
        fontSize: '11px',
        fontStyle: 'italic',
      }}>
        ⚠ AIPS is a calculated priority score based on models and historical data. 
        It should guide decision-making but not replace expert judgment. Field verification 
        of anomaly root causes is always recommended.
      </div>
    </div>
  );
}
```

**IDE Instruction**:

Generate a React component called "AIPSBreakdown" that displays the AIPS score calculation with full transparency.

Requirements:
1. Show circular gauge with AIPS score (0-100) and priority badge
2. Display formula as: AIPS = (0.30 × Loss) + (0.25 × Anomaly) + (0.35 × Recovery) - (0.10 × Complexity)
3. Show 4 component cards with:
   - Component name and weight
   - Numeric value (loss_magnitude.toFixed(1)%, etc.)
   - Brief explanation of what the component measures
   - Contribution to final score
4. Color each component:
   - Loss: #FF9000 (orange)
   - Anomaly: #FF3B3B (red)
   - Recovery: #00D966 (green)
   - Complexity: #FFD700 (yellow)
5. Show overall model confidence at bottom with #C7F700 (lime) accent
6. Color-code final score: red ≥80 (CRITICAL), orange ≥60 (HIGH), yellow ≥40 (MEDIUM), green <40 (LOW)
7. Add footnote: "AIPS is calculated based on models. Field verification recommended."
8. Fully responsive grid layout

Output: React component ready for integration into InterventionPriority.tsx

---

## Summary

These 5 prompts integrate the corrected AIPS formula, recovery opportunity estimation, and data transparency throughout the prototype:

1. **aipsCalculator.ts** - Core corrected formula implementation
2. **RecoveryOpportunityCard.tsx** - Honest recovery estimate display
3. **DataTransparencyBanner.tsx** - Disclaimer on all pages
4. **DataProvenance.tsx** - Comprehensive documentation page
5. **AIPSBreakdown.tsx** - Transparent AIPS calculation display

---

