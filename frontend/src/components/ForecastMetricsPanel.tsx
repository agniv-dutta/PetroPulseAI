import { useState } from 'react';

export interface ForecastMetrics {
  mae: number;
  rmse: number;
  r_squared: number;
  mape: number;
  samples_used: number;
  horizon_days: number;
}

export interface ForecastMetricsPanelProps {
  model_name: string;
  model_version?: string;
  metrics_30d: ForecastMetrics;
  metrics_90d: ForecastMetrics;
  metrics_180d: ForecastMetrics;
  validation_method: string;
  last_update: string;
  target_mae: number;
  target_rmse: number;
}

type HorizonKey = '30d' | '90d' | '180d';

const tabs: { key: HorizonKey; label: string }[] = [
  { key: '30d', label: '30-Day' },
  { key: '90d', label: '90-Day' },
  { key: '180d', label: '180-Day' },
];

export function ForecastMetricsPanel(props: ForecastMetricsPanelProps) {
  const [activeTab, setActiveTab] = useState<HorizonKey>('30d');

  const metricsMap: Record<HorizonKey, ForecastMetrics> = {
    '30d': props.metrics_30d,
    '90d': props.metrics_90d,
    '180d': props.metrics_180d,
  };

  const metrics = metricsMap[activeTab];

  const maeColor = metrics.mae < props.target_mae ? '#00D966' : '#FF3B3B';
  const rmseColor = metrics.rmse < props.target_rmse ? '#00D966' : '#FF3B3B';
  const r2Color = metrics.r_squared >= 0.90 ? '#00D966' : '#FF9000';
  const mapeColor = metrics.mape < 6 ? '#00D966' : '#FF9000';

  return (
    <div
      style={{
        background: '#1A1D1F',
        border: '1px solid #2A2D30',
        borderRadius: '8px',
        padding: '24px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#F3EFE4' }}>
        Production Forecasting Model Performance
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <div style={{ fontSize: '12px', color: '#B8B3A8' }}>
          {props.model_name}
        </div>
        {props.model_version && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#FF9000',
              background: 'rgba(255,144,0,0.12)',
              border: '1px solid rgba(255,144,0,0.3)',
              borderRadius: '4px',
              padding: '1px 6px',
              letterSpacing: '0.3px',
            }}
          >
            {props.model_version}
          </span>
        )}
      </div>
      <div style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '4px' }}>
        {props.validation_method}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 0,
          background: '#111313',
          borderRadius: '6px',
          padding: '3px',
          marginBottom: '16px',
          marginTop: '16px',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '8px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              background: activeTab === tab.key ? '#FF9000' : 'transparent',
              color: activeTab === tab.key ? '#080909' : '#B8B3A8',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
        }}
      >
        <div
          style={{
            background: '#111313',
            border: '1px solid #2A2D30',
            borderRadius: '6px',
            padding: '12px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#B8B3A8',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Mean Absolute Error
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: maeColor,
              marginTop: '4px',
            }}
          >
            {metrics.mae.toFixed(2)} MMBL
          </div>
          <div style={{ fontSize: '10px', color: '#B8B3A8', marginTop: '4px' }}>
            Target: &lt; {props.target_mae}
          </div>
        </div>

        <div
          style={{
            background: '#111313',
            border: '1px solid #2A2D30',
            borderRadius: '6px',
            padding: '12px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#B8B3A8',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Root Mean Squared Error
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: rmseColor,
              marginTop: '4px',
            }}
          >
            {metrics.rmse.toFixed(2)} MMBL
          </div>
          <div style={{ fontSize: '10px', color: '#B8B3A8', marginTop: '4px' }}>
            Target: &lt; {props.target_rmse}
          </div>
        </div>

        <div
          style={{
            background: '#111313',
            border: '1px solid #2A2D30',
            borderRadius: '6px',
            padding: '12px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#B8B3A8',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Coefficient of Determination
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: r2Color,
              marginTop: '4px',
            }}
          >
            {metrics.r_squared.toFixed(3)}
          </div>
          <div style={{ fontSize: '10px', color: '#B8B3A8', marginTop: '4px' }}>
            Target: &gt; 0.90
          </div>
        </div>

        <div
          style={{
            background: '#111313',
            border: '1px solid #2A2D30',
            borderRadius: '6px',
            padding: '12px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#B8B3A8',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Mean Absolute % Error
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: mapeColor,
              marginTop: '4px',
            }}
          >
            {metrics.mape.toFixed(1)}%
          </div>
          <div style={{ fontSize: '10px', color: '#B8B3A8', marginTop: '4px' }}>
            Target: &lt; 6%
          </div>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '12px' }}>
        Validated on {metrics.samples_used} observations
      </div>

      <div
        style={{
          background: '#111313',
          border: '1px solid #2A2D30',
          borderRadius: '6px',
          padding: '12px',
          marginTop: '12px',
          fontSize: '11px',
          color: '#B8B3A8',
        }}
      >
        Model explains {(metrics.r_squared * 100).toFixed(0)}% of production variance. Typical error: ± {metrics.mae} MMBL
      </div>

      <div style={{ fontSize: '10px', color: '#B8B3A8', marginTop: '8px' }}>
        Metrics calculated on historical data. Real-time performance may vary.
      </div>

      <div style={{ fontSize: '10px', color: '#B8B3A8', marginTop: '4px' }}>
        Last updated: {props.last_update}
      </div>
    </div>
  );
}
