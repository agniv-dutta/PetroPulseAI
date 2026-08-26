import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Zap,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Radio,
  Target,
  TrendingDown,
  Activity,
  Gauge,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { SignalIndicator, StatusPill, TelemetryBar } from '../components/ui/Industrial';
import { useSimulationSocket, type TimelineEvent } from '../api/hooks';
import { api, type LeaderboardRow } from '../api/client';
import { useApiData } from '../api/hooks';
import { mockAssets } from '../data/mockData';

// ─── Scenario Definitions ────────────────────────────────────────
const SCENARIOS = [
  { key: 'VALVE_FAILURE', label: 'Valve Failure', color: '#FF3B3B', icon: '⊘', desc: 'Abrupt pressure loss from mechanical failure' },
  { key: 'GRADUAL_CLOG', label: 'Gradual Clog', color: '#FF9000', icon: '◆', desc: 'Progressive flow restriction buildup' },
  { key: 'HIGH_VOLATILITY', label: 'High Volatility', color: '#C7F700', icon: '≋', desc: 'Erratic production oscillations' },
  { key: 'RECOVERY_EVENT', label: 'Recovery Event', color: '#00D966', icon: '▲', desc: 'Post-intervention production uplift' },
] as const;

// ─── Metric Row ──────────────────────────────────────────────────
interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  bar?: number;
  barMax?: number;
  barColor?: 'amber' | 'lime' | 'red' | 'green';
}

const MetricRow: React.FC<MetricRowProps> = ({ icon, label, value, unit, color = '#F3EFE4', bar, barMax, barColor = 'amber' }) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-text-dim">
        {icon}
        <span className="text-[9px] font-mono font-semibold tracking-wider uppercase">{label}</span>
      </div>
    </div>
    <div className="font-mono text-base font-bold tabular-nums" style={{ color }}>
      {value}
      {unit && <span className="text-[9px] text-text-dim font-normal ml-0.5">{unit}</span>}
    </div>
    {bar !== undefined && (
      <TelemetryBar value={bar} max={barMax ?? 100} color={barColor} height={2} />
    )}
  </div>
);

// ─── Timeline Event Row ──────────────────────────────────────────
const severityColor = (s: string) => {
  if (s === 'CRITICAL') return '#FF3B3B';
  if (s === 'ALERT') return '#FF9000';
  if (s === 'WATCH') return '#C7F700';
  return '#6B6860';
};

const EventRow: React.FC<{ event: TimelineEvent; isLatest: boolean }> = ({ event, isLatest }) => {
  const time = new Date(event.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const color = severityColor(event.severity);

  return (
    <div className={`flex items-center gap-3 px-2.5 py-1.5 border-l-2 transition-colors ${isLatest ? 'bg-dark-elevated' : ''}`} style={{ borderLeftColor: color }}>
      <span className="font-mono text-[10px] tabular-nums text-text-dim w-16 shrink-0">{time}</span>
      <span className="font-mono text-[10px] font-bold tracking-wider uppercase" style={{ color }}>
        {event.label}
      </span>
      <span className="text-[9px] font-mono text-text-dim ml-auto">T{event.tick}</span>
    </div>
  );
};

// ─── Custom Tooltip ──────────────────────────────────────────────
const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-surface border border-dark-border px-2.5 py-1.5 text-[10px] font-mono">
      <div className="text-text-dim mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-text-secondary">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{typeof p.value === 'number' ? p.value.toFixed(0) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────
export const SimulationCenter: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<string>('MH-07');
  const [speed, setSpeed] = useState<number>(10);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [flashAlert, setFlashAlert] = useState<boolean>(false);
  const [timelineExpanded, setTimelineExpanded] = useState<boolean>(true);

  const sim = useSimulationSocket(selectedAsset);

  const leaderboard = useApiData<{ rows: LeaderboardRow[]; count: number }>(
    () => api.leaderboard(),
    { rows: [], count: 0 },
  );
  const assets = useMemo(() => {
    const rows = leaderboard.data.rows ?? [];
    if (rows.length === 0) return mockAssets.map((a) => ({ id: a.id, field: a.field }));
    return rows.map((r) => ({ id: r.id, field: r.field }));
  }, [leaderboard.data]);

  useEffect(() => {
    if (assets.length > 0 && !assets.some((a) => a.id === selectedAsset)) {
      setSelectedAsset(assets[0].id);
    }
  }, [assets, selectedAsset]);

  // ─── Chart data: all ticks as chart points ─────────────────
  const chartData = useMemo(() => {
    return sim.ticks.map((t) => ({
      tick: t.tick,
      label: `T${t.tick}`,
      actual: Math.round(t.production_bbl_d),
      expected: Math.round(t.expected_bbl_d),
      anomaly: t.anomaly_score > 0.6 ? Math.round(t.production_bbl_d) : null,
    }));
  }, [sim.ticks]);

  // ─── Latest telemetry values ───────────────────────────────
  const latest = sim.latest;
  const production = latest?.production ?? 0;
  const forecast = latest?.forecast ?? 0;
  const deviation = forecast > 0 ? ((production - forecast) / forecast) * 100 : 0;
  const anomalyScore = latest?.anomaly_score ?? 0;
  const aipsScore = latest?.aips_score ?? 0;
  const priority = latest?.priority ?? 'LOW';
  const recovery = latest?.recovery_opportunity ?? 0;
  const confidence = latest?.confidence ?? 0;
  const severity = latest?.severity ?? 'NORMAL';

  // ─── Flash on critical ─────────────────────────────────────
  useEffect(() => {
    if (severity === 'CRITICAL' || severity === 'ALERT') {
      setFlashAlert(true);
      const t = setTimeout(() => setFlashAlert(false), 400);
      return () => clearTimeout(t);
    }
  }, [sim.ticks.length, severity]);

  // ─── Anomaly onset markers (tick where severity first escalates) ──
  const anomalyOnsetTicks = useMemo(() => {
    const onsets: number[] = [];
    let prevSev = 'NORMAL';
    for (const t of sim.ticks) {
      if (t.severity !== 'NORMAL' && prevSev === 'NORMAL') {
        onsets.push(t.tick);
      }
      prevSev = t.severity;
    }
    return onsets;
  }, [sim.ticks]);

  // ─── Controls ──────────────────────────────────────────────
  const startSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const started = await sim.start('NORMAL', { speed_multiplier: speed });
      if (!started) {
        setError('Backend unavailable — simulation requires the API server.');
        return;
      }
      setIsPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start simulation');
    } finally {
      setLoading(false);
    }
  }, [sim, speed]);

  const handlePlay = useCallback(async () => {
    if (isPlaying) return;
    if (sim.sessionId) {
      await sim.resume();
      setIsPlaying(true);
    } else {
      await startSimulation();
    }
  }, [isPlaying, sim, startSimulation]);

  const handlePause = useCallback(async () => {
    await sim.pause();
    setIsPlaying(false);
  }, [sim]);

  const handleStop = useCallback(async () => {
    setIsPlaying(false);
    if (sim.sessionId) {
      try { await api.stopSimulation(sim.sessionId); } catch { /* ok */ }
    }
  }, [sim]);

  const handleScenario = useCallback(async (scenarioKey: string) => {
    if (!sim.sessionId || !isPlaying) {
      setError('Start a simulation first, then inject a scenario.');
      return;
    }
    const ok = await sim.inject(scenarioKey);
    if (!ok) setError('Could not inject scenario — no active session.');
  }, [sim, isPlaying]);

  // ─── Priority color ────────────────────────────────────────
  const priorityColor = priority === 'CRITICAL' ? '#FF3B3B' : priority === 'HIGH' ? '#FF9000' : priority === 'MEDIUM' ? '#C7F700' : '#6B6860';

  return (
    <div className="flex flex-col gap-2 animate-fade-in h-[calc(100vh-64px)]">
      {/* Provenance */}
      <ProvenanceBadge sourceType="SYNTHETIC" context="banner" disclaimer="SYNTHETIC DATA — NOT ACTUAL FIELD TELEMETRY" isDismissible />

      {/* Error */}
      {error && (
        <div className="p-2.5 bg-accent-red/10 border border-accent-red/30 flex items-center gap-2 text-xs">
          <AlertTriangle size={14} className="text-accent-red shrink-0" />
          <span className="text-accent-red font-mono font-bold">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-text-dim hover:text-accent-red">×</button>
        </div>
      )}

      {/* Flash overlay */}
      {flashAlert && <div className="fixed inset-0 z-50 bg-accent-red/5 border-2 border-accent-red/20 pointer-events-none animate-pulse" />}

      {/* ═══ 3-PANEL LAYOUT ═══ */}
      <div className="flex-1 flex gap-2 min-h-0">

        {/* ─── LEFT PANEL: Controls ─── */}
        <div className="w-56 shrink-0 flex flex-col gap-2 overflow-y-auto">
          {/* Asset Selector */}
          <div className="card-panel p-2.5">
            <div className="telemetry-label mb-1.5">Target Asset</div>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border text-[11px] font-mono text-text-primary px-2 py-1.5 focus:border-accent-amber outline-none"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.id} — {a.field}</option>
              ))}
            </select>
          </div>

          {/* Sim Controls */}
          <div className="card-panel p-2.5">
            <div className="telemetry-label mb-2">Simulation</div>
            <div className="flex items-center gap-1.5 mb-2">
              {isPlaying ? (
                <button onClick={handlePause} className="flex-1 flex items-center justify-center gap-1.5 bg-dark-bg border border-dark-border py-1.5 text-[10px] font-mono font-bold text-accent-amber hover:border-accent-amber/50 transition">
                  <Pause size={12} /> PAUSE
                </button>
              ) : (
                <button onClick={handlePlay} className="flex-1 flex items-center justify-center gap-1.5 bg-accent-amber text-dark-bg py-1.5 text-[10px] font-mono font-bold hover:bg-accent-amber/90 transition">
                  <Play size={12} fill="currentColor" /> PLAY
                </button>
              )}
              <button onClick={handleStop} className="flex items-center justify-center gap-1 bg-dark-bg border border-dark-border px-2.5 py-1.5 text-[10px] font-mono font-bold text-text-dim hover:text-accent-red hover:border-accent-red/30 transition">
                <Square size={10} /> STOP
              </button>
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              <SignalIndicator status={sim.connected ? 'online' : 'offline'} size="sm" />
              <span className="text-[9px] font-mono text-text-dim">
                {isPlaying ? 'STREAMING' : 'IDLE'}
                {sim.sessionId && <span className="ml-1 text-accent-lime">#{sim.sessionId.slice(0, 6)}</span>}
              </span>
            </div>

            {/* Speed */}
            <div className="telemetry-label mb-1">Speed</div>
            <div className="flex gap-1">
              {([1, 5, 10] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`flex-1 py-1 text-[10px] font-mono font-bold border transition ${
                    speed === s ? 'bg-accent-amber/15 text-accent-amber border-accent-amber/30' : 'border-dark-border text-text-dim hover:text-text-secondary'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Scenario Buttons */}
          <div className="card-panel p-2.5">
            <div className="telemetry-label mb-2">Inject Scenario</div>
            <div className="flex flex-col gap-1.5">
              {SCENARIOS.map((sc) => (
                <button
                  key={sc.key}
                  onClick={() => handleScenario(sc.key)}
                  disabled={!isPlaying || !sim.sessionId}
                  className="flex items-center gap-2 px-2 py-2 text-left border border-dark-border hover:border-opacity-60 transition disabled:opacity-30 disabled:cursor-not-allowed group"
                  style={{ borderLeftColor: sc.color, borderLeftWidth: 2 }}
                >
                  <span className="text-sm" style={{ color: sc.color }}>{sc.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-bold text-text-primary group-hover:text-text-primary truncate">{sc.label}</div>
                    <div className="text-[8px] font-mono text-text-dim truncate">{sc.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            {sim.scenario !== 'NORMAL' && (
              <div className="mt-2 px-2 py-1 bg-accent-amber/10 border border-accent-amber/20 text-[9px] font-mono text-accent-amber">
                ACTIVE: {sim.scenario}
              </div>
            )}
          </div>

          {/* Tick counter */}
          <div className="card-panel p-2.5">
            <div className="telemetry-label mb-1">Stream</div>
            <div className="font-mono text-lg font-bold text-text-primary tabular-nums">
              T{sim.ticks.length}
              <span className="text-[9px] text-text-dim font-normal ml-1">ticks</span>
            </div>
            <div className="text-[9px] font-mono text-text-dim mt-0.5">
              {sim.events.length} events recorded
            </div>
          </div>
        </div>

        {/* ─── CENTER PANEL: Live Chart ─── */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex-1 card-panel p-3 relative overflow-hidden flex flex-col min-h-0">
            {/* Scan line */}
            {isPlaying && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-amber/10 to-transparent animate-scan-line" style={{ animationDuration: '4s' }} />
              </div>
            )}

            {/* Chart header */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold text-text-primary tracking-tight">Live Production Trace</h3>
                <div className="flex items-center gap-3 text-[9px] font-mono">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-[2px] bg-accent-amber rounded-full" />
                    <span className="text-text-secondary">Actual</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-[2px] border-t border-dashed border-text-dim" />
                    <span className="text-text-dim">Expected</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-accent-red rounded-full" />
                    <span className="text-accent-red">Anomaly Onset</span>
                  </span>
                </div>
              </div>
              <StatusPill label={severity} color={severity === 'CRITICAL' ? 'red' : severity === 'ALERT' ? 'amber' : severity === 'WATCH' ? 'lime' : 'neutral'} pulse={severity === 'CRITICAL'} />
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#1A1D1F" />
                    <XAxis dataKey="label" stroke="#6B6860" fontSize={9} tickLine={false} fontFamily="'IBM Plex Mono', monospace" interval="preserveStartEnd" />
                    <YAxis stroke="#6B6860" fontSize={9} tickLine={false} fontFamily="'IBM Plex Mono', monospace" domain={['auto', 'auto']} />
                    <Tooltip content={<ChartTooltip />} />

                    {/* Anomaly onset reference lines */}
                    {anomalyOnsetTicks.map((tick) => (
                      <ReferenceLine key={tick} x={`T${tick}`} stroke="#FF3B3B" strokeDasharray="3 3" strokeOpacity={0.5} />
                    ))}

                    {/* Deviation zone shading */}
                    {chartData.length > 2 && (
                      <ReferenceArea
                        y1={Math.min(...chartData.map((d) => d.actual))}
                        y2={Math.min(...chartData.map((d) => d.expected))}
                        fill="#FF3B3B"
                        fillOpacity={0.04}
                      />
                    )}

                    <Line type="monotone" name="Actual" dataKey="actual" stroke="#FF9000" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#FF9000', stroke: '#080909', strokeWidth: 2 }} />
                    <Line type="monotone" name="Expected" dataKey="expected" stroke="#6B6860" strokeDasharray="4 4" strokeWidth={1} dot={false} />
                    <Line type="monotone" name="Anomaly" dataKey="anomaly" stroke="#FF3B3B" strokeWidth={0} dot={{ r: 4, fill: '#FF3B3B', stroke: '#080909', strokeWidth: 2 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-text-dim text-xs font-mono">
                  {isPlaying ? 'Awaiting telemetry stream...' : 'Press PLAY to start simulation'}
                </div>
              )}
            </div>
          </div>

          {/* ─── BOTTOM: Event Timeline ─── */}
          <div className="card-panel shrink-0">
            <button
              onClick={() => setTimelineExpanded(!timelineExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-dark-elevated/50 transition"
            >
              <div className="flex items-center gap-2">
                <Radio size={12} className={isPlaying ? 'text-accent-green animate-pulse-green' : 'text-text-dim'} />
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-text-primary">Event Timeline</span>
                <span className="text-[9px] font-mono text-text-dim">({sim.events.length})</span>
              </div>
              {timelineExpanded ? <ChevronUp size={12} className="text-text-dim" /> : <ChevronDown size={12} className="text-text-dim" />}
            </button>
            {timelineExpanded && (
              <div className="max-h-36 overflow-y-auto border-t border-dark-border">
                {sim.events.length > 0 ? (
                  sim.events.map((evt, i) => (
                    <EventRow key={`${evt.tick}-${i}`} event={evt} isLatest={i === sim.events.length - 1} />
                  ))
                ) : (
                  <div className="px-3 py-3 text-[10px] font-mono text-text-dim text-center">
                    No events yet. Start a simulation to see the intelligence pipeline respond.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL: Metrics ─── */}
        <div className="w-56 shrink-0 flex flex-col gap-2 overflow-y-auto">
          <div className="card-panel p-2.5 flex flex-col gap-3">
            <div className="telemetry-label">Pipeline Output</div>

            <MetricRow
              icon={<BarChart3 size={10} />}
              label="Production"
              value={production > 0 ? production.toFixed(0) : '---'}
              unit="BBL/D"
              color="#FF9000"
              bar={production}
              barMax={forecast * 1.2 || 100}
              barColor="amber"
            />

            <MetricRow
              icon={<Target size={10} />}
              label="Forecast"
              value={forecast > 0 ? forecast.toFixed(0) : '---'}
              unit="BBL/D"
              color="#6B6860"
            />

            <MetricRow
              icon={<TrendingDown size={10} />}
              label="Deviation"
              value={`${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%`}
              color={deviation < -5 ? '#FF3B3B' : deviation < -2 ? '#FF9000' : '#00D966'}
              bar={Math.abs(deviation)}
              barMax={30}
              barColor={deviation < -5 ? 'red' : 'amber'}
            />

            <div className="h-px bg-dark-border" />

            <MetricRow
              icon={<AlertTriangle size={10} />}
              label="Anomaly Score"
              value={anomalyScore.toFixed(3)}
              color={anomalyScore > 0.7 ? '#FF3B3B' : anomalyScore > 0.4 ? '#FF9000' : '#F3EFE4'}
              bar={anomalyScore * 100}
              barMax={100}
              barColor={anomalyScore > 0.7 ? 'red' : 'amber'}
            />

            <MetricRow
              icon={<Gauge size={10} />}
              label="AIPS Score"
              value={aipsScore.toFixed(1)}
              color={aipsScore > 70 ? '#FF3B3B' : aipsScore > 40 ? '#FF9000' : '#00D966'}
            />

            <MetricRow
              icon={<ShieldCheck size={10} />}
              label="Priority"
              value={priority}
              color={priorityColor}
            />

            <div className="h-px bg-dark-border" />

            <MetricRow
              icon={<Activity size={10} />}
              label="Recovery Opportunity"
              value={recovery > 0 ? recovery.toFixed(4) : '---'}
              unit="MMBL"
              color="#00D966"
            />

            <MetricRow
              icon={<Radio size={10} />}
              label="Confidence"
              value={`${(confidence * 100).toFixed(1)}%`}
              color="#C7F700"
              bar={confidence * 100}
              barMax={100}
              barColor="lime"
            />
          </div>

          {/* Legend */}
          <div className="card-panel p-2.5">
            <div className="telemetry-label mb-1.5">Pipeline Flow</div>
            <div className="space-y-1 text-[8px] font-mono text-text-dim">
              <div className="flex items-center gap-1.5"><span className="w-1 h-1 bg-accent-amber rounded-full" /> Synthetic telemetry</div>
              <div className="flex items-center gap-1.5"><span className="w-1 h-1 bg-accent-lime rounded-full" /> ML inference</div>
              <div className="flex items-center gap-1.5"><span className="w-1 h-1 bg-accent-red rounded-full" /> Anomaly detection</div>
              <div className="flex items-center gap-1.5"><span className="w-1 h-1 bg-accent-green rounded-full" /> Recovery calc</div>
              <div className="flex items-center gap-1.5"><span className="w-1 h-1 bg-text-dim rounded-full" /> AIPS scoring</div>
            </div>
          </div>

          {/* Source badge */}
          <div className="card-panel p-2.5">
            <StatusPill label="SOURCE: SYNTHETIC" color="lime" />
            <div className="text-[8px] font-mono text-text-dim mt-1.5 leading-relaxed">
              All outputs are ML-estimated decision support over synthetic data, not physical root causes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
