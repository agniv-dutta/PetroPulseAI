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

export const AIPSBreakdown: React.FC<AIPSBreakdownProps> = (props) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#FF3B3B'; // Critical - red
    if (score >= 60) return '#FF9000'; // High - orange
    if (score >= 40) return '#FFD700'; // Medium - yellow
    return '#00D966'; // Low - green
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
{`AIPS = (0.35 × Loss)
     + (0.25 × Anomaly)
     + (0.40 × Recovery)
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
              Weight: 35% | Contribution: {(0.35 * Math.min(100, props.loss_magnitude / 18 * 100)).toFixed(1)}
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
              Weight: 40% | Contribution: {(0.40 * Math.min(100, props.recovery_opportunity / 15 * 100)).toFixed(1)}
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
};
