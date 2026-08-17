import React from 'react';

export interface AnomalyMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  roc_auc: number;
}

export interface AnomalyMetricsPanelProps {
  model_name: string;
  metrics: AnomalyMetrics;
  threshold: number;
  tested_on_samples: number;
}

const containerStyle: React.CSSProperties = {
  background: '#1A1D1F',
  border: '1px solid #2A2D30',
  borderRadius: '8px',
  padding: '24px',
  fontFamily: "'Inter', sans-serif",
};

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#F3EFE4',
  margin: 0,
};

const modelNameStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#B8B3A8',
  marginTop: '4px',
};

const thresholdStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#B8B3A8',
  marginTop: '4px',
};

const metricRowStyle: React.CSSProperties = {
  background: '#111313',
  border: '1px solid #2A2D30',
  borderRadius: '6px',
  padding: '12px',
  marginBottom: '8px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#F3EFE4',
};

const targetStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#B8B3A8',
};

const valueStyle = (color: string): React.CSSProperties => ({
  fontSize: '16px',
  fontWeight: 600,
  color,
});

const interpretationBoxStyle: React.CSSProperties = {
  background: '#111313',
  border: '1px solid #2A2D30',
  borderRadius: '6px',
  padding: '12px',
  marginTop: '12px',
  fontSize: '11px',
  color: '#B8B3A8',
};

const testedOnStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#B8B3A8',
  marginTop: '12px',
};

const caveatStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#B8B3A8',
  marginTop: '8px',
};

export function AnomalyMetricsPanel(props: AnomalyMetricsPanelProps) {
  const {
    model_name,
    metrics: { precision, recall, f1_score, false_positive_rate, roc_auc },
    threshold,
    tested_on_samples,
  } = props;

  const precisionColor = precision >= 0.82 ? '#00D966' : '#FF3B3B';
  const recallColor = recall >= 0.78 ? '#00D966' : '#FF3B3B';
  const f1Color = f1_score >= 0.80 ? '#00D966' : '#FF9000';
  const fprColor = false_positive_rate < 0.12 ? '#00D966' : '#FF3B3B';
  const rocColor = roc_auc >= 0.88 ? '#00D966' : '#FF9000';

  const precisionPct = (precision * 100).toFixed(1);
  const recallPct = (recall * 100).toFixed(1);
  const f1Pct = (f1_score * 100).toFixed(1);
  const fprPct = (false_positive_rate * 100).toFixed(1);

  const realAlerts = Math.round(precision * tested_on_samples);
  const detectedAnomalies = Math.round(recall * tested_on_samples);

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>Anomaly Detection Model Performance</div>
      <div style={modelNameStyle}>{model_name}</div>
      <div style={thresholdStyle}>
        {'Anomaly Score > '}{threshold.toFixed(2)}{' triggers alert'}
      </div>

      <div style={{ marginTop: '16px' }}>
        <div style={metricRowStyle}>
          <div>
            <div style={labelStyle}>{'Precision (% of alerts that are real problems)'}</div>
            <div style={targetStyle}>{'Target: > 82%'}</div>
          </div>
          <div style={valueStyle(precisionColor)}>{precisionPct}%</div>
        </div>

        <div style={metricRowStyle}>
          <div>
            <div style={labelStyle}>{'Recall (% of real problems we catch)'}</div>
            <div style={targetStyle}>{'Target: > 78%'}</div>
          </div>
          <div style={valueStyle(recallColor)}>{recallPct}%</div>
        </div>

        <div style={metricRowStyle}>
          <div>
            <div style={labelStyle}>{'F1-Score (balanced metric)'}</div>
            <div style={targetStyle}>{'Target: > 80%'}</div>
          </div>
          <div style={valueStyle(f1Color)}>{f1Pct}%</div>
        </div>

        <div style={metricRowStyle}>
          <div>
            <div style={labelStyle}>{'False Positive Rate (unnecessary alerts)'}</div>
            <div style={targetStyle}>{'Target: < 12%'}</div>
          </div>
          <div style={valueStyle(fprColor)}>{fprPct}%</div>
        </div>

        <div style={metricRowStyle}>
          <div>
            <div style={labelStyle}>{'ROC-AUC (discrimination ability)'}</div>
            <div style={targetStyle}>{'Target: > 0.88'}</div>
          </div>
          <div style={valueStyle(rocColor)}>{roc_auc.toFixed(3)}</div>
        </div>
      </div>

      <div style={interpretationBoxStyle}>
        {`Precision ${precisionPct}% = Of ${tested_on_samples} alerts, ${realAlerts} were real problems`}
      </div>
      <div style={interpretationBoxStyle}>
        {`Recall ${recallPct}% = Of ${tested_on_samples} real anomalies, we detected ${detectedAnomalies}`}
      </div>

      <div style={testedOnStyle}>
        {'Tested on '}{tested_on_samples}{' observations during testing'}
      </div>

      <div style={caveatStyle}>
        {'Metrics from synthetic anomaly injection. Real-world performance may differ.'}
      </div>
    </div>
  );
}
