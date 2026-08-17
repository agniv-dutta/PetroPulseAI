export interface SHAPExplanationCardProps {
  asset_id: string;
  production_deviation_percent: number;
  top_features: Array<{
    feature_name: string;
    contribution_percent: number;
    value: number;
    baseline_value: number;
  }>;
  model_type: string;
  model_confidence: number;
}

export function SHAPExplanationCard(props: SHAPExplanationCardProps) {
  const { asset_id, production_deviation_percent, top_features, model_type, model_confidence } = props;

  const maxContrib = top_features.reduce(
    (max, f) => Math.max(max, Math.abs(f.contribution_percent)),
    1
  );

  const interpretationBullets: string[] = [
    'These values show feature importance, not root causes',
    'Pressure/temperature/flow are synthetic in this demo',
    'In production: Actual SCADA data would replace synthetic',
    'Field teams should verify with physical measurements',
    `Model confidence: ${Math.round(model_confidence * 100)}% (not 100%)`,
  ];

  const nextSteps: string[] = [
    'Review top contributing factors',
    'Cross-check with actual field measurements',
    'Consult domain experts',
    'Plan targeted investigation',
    'Execute intervention with safety checks',
  ];

  return (
    <div
      style={{
        background: '#1A1D1F',
        border: '1px solid #2A2D30',
        borderRadius: '8px',
        padding: '24px',
        fontFamily: "'Inter', sans-serif",
        color: '#F3EFE4',
      }}
    >
      <div style={{ marginBottom: '4px' }}>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#F3EFE4' }}>
          Production Deviation: Model-Estimated Feature Contributions
        </span>
      </div>
      <div
        style={{
          fontSize: '13px',
          color: production_deviation_percent >= 0 ? '#FF3B3B' : '#00D966',
          fontWeight: 500,
          marginTop: '2px',
          marginBottom: '4px',
        }}
      >
        {asset_id} &mdash; Deviation: {production_deviation_percent > 0 ? '+' : ''}
        {production_deviation_percent.toFixed(1)}% (Model: {model_type})
      </div>
      <div style={{ fontSize: '12px', color: '#B8B3A8', marginTop: '4px', marginBottom: '24px' }}>
        The model identifies these factors as strongly correlated with the production deviation.
        This shows WHAT the model learned, not necessarily WHY production declined.
      </div>

      <div style={{ marginBottom: '24px' }}>
        {top_features.map((feature, index) => {
          const barWidth = Math.max(
            4,
            (Math.abs(feature.contribution_percent) / maxContrib) * 100
          );

          return (
            <div key={`${asset_id}-${feature.feature_name}-${index}`} style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <span style={{ fontSize: '13px', color: '#B8B3A8' }}>{feature.feature_name}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#F3EFE4' }}>
                  {feature.contribution_percent > 0 ? '+' : ''}
                  {feature.contribution_percent.toFixed(1)}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: '#2A2D30',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '4px',
                }}
              >
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    background: '#FF9000',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: '#B8B3A8' }}>
                Current: {feature.value} | Baseline: {feature.baseline_value}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: 'rgba(255, 144, 0, 0.08)',
          border: '1px solid rgba(255, 144, 0, 0.2)',
          borderRadius: '6px',
          padding: '16px',
          marginTop: '24px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#FF9000', marginBottom: '12px' }}>
          INTERPRETATION GUIDANCE
        </div>
        {interpretationBullets.map((bullet, index) => (
          <div
            key={`bullet-${index}`}
            style={{ fontSize: '11px', color: '#B8B3A8', lineHeight: 1.6, marginBottom: '4px' }}
          >
            {bullet}
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#111313',
          border: '1px solid #2A2D30',
          borderRadius: '6px',
          padding: '16px',
          marginTop: '12px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#F3EFE4', marginBottom: '12px' }}>
          Recommended Next Steps
        </div>
        {nextSteps.map((step, index) => (
          <div
            key={`step-${index}`}
            style={{ fontSize: '11px', color: '#B8B3A8', lineHeight: 1.6, marginBottom: '4px' }}
          >
            {index + 1}. {step}
          </div>
        ))}
      </div>
    </div>
  );
}
