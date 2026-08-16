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

export const DataTransparencyBanner: React.FC<DataTransparencyBannerProps> = ({
  context = 'dashboard',
  isDismissible = true,
}) => {
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
};
