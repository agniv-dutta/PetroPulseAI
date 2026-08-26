/**
 * ProvenanceBadge
 *
 * Consistent provenance indicator used across every page that displays data.
 * Each badge shows:
 *   - source_type label (REAL / SYNTHETIC / DERIVED) with color coding
 *   - context-specific disclaimer text
 *   - link to full Data Provenance page
 *
 * Color scheme:
 *   REAL     = green  (#00D966)  -- published open-government data
 *   SYNTHETIC = amber (#FF9000)  -- generated for demonstration
 *   DERIVED  = lime   (#C7F700)  -- model output
 *
 * Synthetic values MUST NEVER be labeled REAL. The source_type is determined
 * by the backend CHECK constraint on production_history.source_type.
 */

import React, { useState } from 'react';

export type SourceType = 'REAL' | 'SYNTHETIC' | 'DERIVED';

interface ProvenanceBadgeProps {
  sourceType: SourceType;
  disclaimer?: string;
  context?: 'inline' | 'banner' | 'card';
  isDismissible?: boolean;
}

const STYLE_REAL = {
  bg: 'rgba(0, 217, 102, 0.08)',
  border: 'rgba(0, 217, 102, 0.35)',
  color: '#00D966',
  icon: '\u2713',
};

const STYLE_SYNTHETIC = {
  bg: 'rgba(255, 144, 0, 0.08)',
  border: 'rgba(255, 144, 0, 0.35)',
  color: '#FF9000',
  icon: '\u26A0',
};

const STYLE_DERIVED = {
  bg: 'rgba(199, 247, 0, 0.08)',
  border: 'rgba(199, 247, 0, 0.35)',
  color: '#C7F700',
  icon: '\u25C6',
};

function getStyle(sourceType: string) {
  if (sourceType === 'REAL') return STYLE_REAL;
  if (sourceType === 'DERIVED') return STYLE_DERIVED;
  return STYLE_SYNTHETIC;
}

function getDefaultDisclaimer(sourceType: string) {
  if (sourceType === 'REAL') return 'Published open-government data (OGD/PPAC/DGH). Reference context only.';
  if (sourceType === 'SYNTHETIC') return 'SYNTHETIC DATA \u2014 NOT ACTUAL ONGC TELEMETRY.';
  return 'Model output \u2014 trained/evaluated on synthetic data.';
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  sourceType,
  disclaimer,
  context = 'inline',
  isDismissible = false,
}) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const style = getStyle(sourceType);
  const text = disclaimer || getDefaultDisclaimer(sourceType);

  if (context === 'banner') {
    return (
      <div
        style={{
          background: style.bg,
          border: '1px solid ' + style.border,
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: style.color,
              background: style.bg,
              border: '1px solid ' + style.border,
              borderRadius: '4px',
              padding: '2px 8px',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
            }}
          >
            {style.icon} {sourceType}
          </span>
          <span style={{ color: '#B8B3A8', fontSize: '12px', lineHeight: '1.5' }}>
            {text}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href="/data-provenance"
            style={{
              color: style.color,
              textDecoration: 'none',
              fontSize: '11px',
              whiteSpace: 'nowrap',
            }}
          >
            Full provenance \u2192
          </a>
          {isDismissible && (
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#B8B3A8',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0 4px',
              }}
              title="Dismiss"
            >
              \u2715
            </button>
          )}
        </div>
      </div>
    );
  }

  if (context === 'card') {
    return (
      <div
        style={{
          background: style.bg,
          border: '1px solid ' + style.border,
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            color: style.color,
            letterSpacing: '0.5px',
          }}
        >
          {style.icon} {sourceType}
        </span>
        <span style={{ color: '#B8B3A8', fontSize: '10px' }}>{text}</span>
      </div>
    );
  }

  // inline (default) -- compact badge
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '9px',
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        color: style.color,
        background: style.bg,
        border: '1px solid ' + style.border,
        borderRadius: '3px',
        padding: '1px 6px',
        letterSpacing: '0.3px',
      }}
      title={text}
    >
      {style.icon} {sourceType}
    </span>
  );
};

export default ProvenanceBadge;
