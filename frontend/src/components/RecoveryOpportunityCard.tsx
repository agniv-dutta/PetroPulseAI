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

export const RecoveryOpportunityCard: React.FC<RecoveryOpportunityCardProps> = ({
  asset_id,
  expected_production,
  actual_production,
  historical_recovery_rate,
  model_confidence,
  combined_confidence,
  anomaly_score,
}) => {
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
          ⚠ Asset {asset_id} - This is an estimate, not a guarantee. Actual recovery depends on intervention success.
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
};
