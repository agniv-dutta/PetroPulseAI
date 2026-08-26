import React from 'react';

interface TelemetryBarProps {
  value: number;
  max?: number;
  color?: 'amber' | 'lime' | 'red' | 'green';
  height?: number;
  showLabel?: boolean;
  label?: string;
  animate?: boolean;
}

const colorMap = {
  amber: { bar: 'bg-accent-amber', track: 'bg-accent-amber/15' },
  lime: { bar: 'bg-accent-lime', track: 'bg-accent-lime/15' },
  red: { bar: 'bg-accent-red', track: 'bg-accent-red/15' },
  green: { bar: 'bg-accent-green', track: 'bg-accent-green/15' },
};

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  value,
  max = 100,
  color = 'amber',
  height = 3,
  showLabel = false,
  label,
  animate = true,
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const c = colorMap[color];

  return (
    <div className="w-full">
      {showLabel && label && (
        <div className="flex justify-between items-center mb-1">
          <span className="telemetry-label">{label}</span>
          <span className="telemetry-value text-[10px]">{value.toFixed(1)}%</span>
        </div>
      )}
      <div
        className={`w-full rounded-sm overflow-hidden ${c.track}`}
        style={{ height: `${height}px` }}
      >
        <div
          className={`h-full rounded-sm ${c.bar} ${animate ? 'animate-telemetry-fill' : ''}`}
          style={{
            width: `${pct}%`,
            '--fill-width': `${pct}%`,
            boxShadow: pct > 0 ? `0 0 6px ${color === 'amber' ? 'rgba(255,144,0,0.3)' : color === 'red' ? 'rgba(255,59,59,0.3)' : 'rgba(0,217,102,0.3)'}` : 'none',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

interface SignalIndicatorProps {
  status: 'online' | 'degraded' | 'offline';
  size?: 'sm' | 'md';
  label?: string;
}

const statusStyles = {
  online: { dot: 'bg-accent-green animate-pulse-green', text: 'text-accent-green', label: 'ONLINE' },
  degraded: { dot: 'bg-accent-amber animate-pulse-amber', text: 'text-accent-amber', label: 'DEGRADED' },
  offline: { dot: 'bg-accent-red', text: 'text-accent-red', label: 'OFFLINE' },
};

export const SignalIndicator: React.FC<SignalIndicatorProps> = ({ status, size = 'sm', label }) => {
  const s = statusStyles[status];
  const dotSize = size === 'sm' ? 'w-[5px] h-[5px]' : 'w-[7px] h-[7px]';

  return (
    <div className="flex items-center gap-1.5">
      <span className={`relative flex ${dotSize}`}>
        <span className={`absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-75`} />
        <span className={`relative inline-flex rounded-full ${dotSize} ${s.dot}`} />
      </span>
      <span className={`font-mono text-[10px] font-semibold tracking-wider uppercase ${s.text}`}>
        {label ?? s.label}
      </span>
    </div>
  );
};

interface StatusPillProps {
  label: string;
  color?: 'amber' | 'lime' | 'red' | 'green' | 'neutral';
  pulse?: boolean;
}

const pillColors = {
  amber: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
  lime: 'bg-accent-lime/15 text-accent-lime border-accent-lime/30',
  red: 'bg-accent-red/15 text-accent-red border-accent-red/30',
  green: 'bg-accent-green/15 text-accent-green border-accent-green/30',
  neutral: 'bg-dark-border/50 text-text-secondary border-dark-border',
};

export const StatusPill: React.FC<StatusPillProps> = ({ label, color = 'neutral', pulse = false }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border rounded-sm ${pillColors[color]} ${pulse ? 'animate-pulse-amber' : ''}`}
  >
    {label}
  </span>
);

interface ScanLineProps {
  color?: string;
  speed?: number;
}

export const ScanLine: React.FC<ScanLineProps> = ({ color = 'rgba(255,144,0,0.06)', speed = 4 }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      className="absolute inset-x-0 h-px animate-scan-line"
      style={{
        background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
        animationDuration: `${speed}s`,
      }}
    />
  </div>
);

interface TimestampProps {
  date?: Date | string | number;
  format?: 'time' | 'datetime' | 'date';
  className?: string;
}

export const Timestamp: React.FC<TimestampProps> = ({ date, format = 'time', className = '' }) => {
  const d = date ? new Date(date) : new Date();
  let formatted: string;
  if (format === 'datetime') {
    formatted = d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } else if (format === 'date') {
    formatted = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  } else {
    formatted = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  return (
    <span className={`font-mono text-[11px] tabular-nums text-text-secondary ${className}`}>
      {formatted}
    </span>
  );
};

interface MiniGaugeProps {
  value: number;
  max?: number;
  size?: number;
  color?: string;
  label?: string;
}

export const MiniGauge: React.FC<MiniGaugeProps> = ({
  value,
  max = 100,
  size = 36,
  color = '#FF9000',
  label,
}) => {
  const pct = Math.min(1, Math.max(0, value / max));
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#2A2D30"
          strokeWidth={2}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={size * 0.25}
          fontFamily="'IBM Plex Mono', monospace"
          fontWeight={700}
        >
          {Math.round(pct * 100)}
        </text>
      </svg>
      {label && <span className="telemetry-label text-[9px]">{label}</span>}
    </div>
  );
};
