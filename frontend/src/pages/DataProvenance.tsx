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
