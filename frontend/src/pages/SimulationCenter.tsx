import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Zap,
  Loader2,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { useApiData, useSimulationSocket } from '../api/hooks';
import { api, type LeaderboardRow } from '../api/client';
import { mockAssets } from '../data/mockData';

interface StreamRow {
  timestamp: string;
  assetId: string;
  production: number;
  forecast: number;
  anomalyScore: number;
  status: 'NORMAL' | 'WATCH' | 'ALERT' | 'CRITICAL';
}

export const SimulationCenter: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<string>('MH-07');
  const [speed, setSpeed] = useState<number>(10);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [flashAlert, setFlashAlert] = useState<boolean>(false);

  // Backend-backed simulation session (REST + WebSocket)
  const sim = useSimulationSocket(selectedAsset);

  // Asset universe comes from the backend leaderboard (mock fallback offline)
  const leaderboard = useApiData<{ rows: LeaderboardRow[]; count: number }>(
    () => api.leaderboard(),
    { rows: [], count: 0 },
  );
  const assets = useMemo(() => {
    const rows = leaderboard.data.rows ?? [];
    if (rows.length === 0) {
      return mockAssets.map((a) => ({ id: a.id, field: a.field }));
    }
    return rows.map((r) => ({ id: r.id, field: r.field }));
  }, [leaderboard.data]);

  useEffect(() => {
    if (assets.length > 0 && !assets.some((a) => a.id === selectedAsset)) {
      setSelectedAsset(assets[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  // Chart/table rows are derived strictly from backend telemetry frames
  const stream = useMemo<StreamRow[]>(
    () =>
      sim.ticks.slice(-25).map((t) => ({
        timestamp: new Date(t.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        assetId: t.asset_id,
        production: Math.round(t.production_bbl_d),
        forecast: Math.round(t.expected_bbl_d),
        anomalyScore: parseFloat(t.anomaly_score.toFixed(2)),
        status: t.severity,
      })),
    [sim.ticks],
  );

  const latestDataPoint = stream[stream.length - 1];

  // Visual flash when the BACKEND model flags an alert/critical observation
  const tickCount = sim.ticks.length;
  const lastSeverity = tickCount > 0 ? sim.ticks[tickCount - 1].severity : null;
  useEffect(() => {
    if (lastSeverity === 'CRITICAL' || lastSeverity === 'ALERT') {
      setFlashAlert(true);
      const timer = setTimeout(() => setFlashAlert(false), 500);
      return () => clearTimeout(timer);
    }
  }, [tickCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start simulation (backend session + WebSocket stream)
  const startSimulation = async () => {
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
  };

  const handlePlay = async () => {
    if (isPlaying) return;
    if (sim.sessionId) {
      await sim.resume();
      setIsPlaying(true);
    } else {
      await startSimulation();
    }
  };

  const handlePause = async () => {
    await sim.pause();
    setIsPlaying(false);
  };

  const handleReset = async () => {
    setIsPlaying(false);
    if (sim.sessionId) {
      try {
        await api.stopSimulation(sim.sessionId);
      } catch (err) {
        console.error('Failed to stop simulation:', err);
      }
    }
  };

  const handleInject = async () => {
    const ok = await sim.inject('GRADUAL_CLOG');
    if (!ok) {
      setError('Could not inject anomaly — no active backend session.');
    }
  };

  const getDevPct = () => {
    if (!latestDataPoint) return '0.0';
    const diff = latestDataPoint.production - latestDataPoint.forecast;
    return ((diff / latestDataPoint.forecast) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6 relative">
      {/* Data Provenance Banner */}
      <ProvenanceBadge sourceType="SYNTHETIC" context="banner" disclaimer="\u26A0 SYNTHETIC DATA \u2014 NOT ACTUAL ONGC TELEMETRY" isDismissible />

      {/* ERROR STATE */}
      {error && (
        <div style={{
          backgroundColor: '#2D1A1A',
          border: '1px solid #FF4444',
          borderRadius: '8px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={20} style={{ color: '#FF4444' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#FF4444', marginBottom: '4px' }}>Simulation Error</div>
            <div style={{ fontSize: '13px', color: '#B8B3A8' }}>{error}</div>
          </div>
          <button
            onClick={() => setError(null)}
            style={{
              backgroundColor: '#FF4444',
              color: '#F3EFE4',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '100px 32px',
          gap: '16px'
        }}>
          <Loader2 size={48} style={{ color: '#FF9000' }} className="animate-spin" />
          <div style={{ color: '#B8B3A8', fontSize: '14px' }}>Starting simulation...</div>
        </div>
      )}

      {/* Visual Flash Alert overlay when threshold is breached */}
      {flashAlert && (
        <div className="absolute inset-0 bg-accent-red bg-opacity-[0.06] border-2 border-accent-red border-opacity-40 rounded pointer-events-none z-10 transition-all duration-100 animate-pulse"></div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent-lime text-xs font-mono mb-1">
            <Activity size={14} />
            <span>REAL-TIME SIMULATION & TELEMETRY HUB</span>
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-text-primary">
            Simulation Center
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Stream synthetic wellhead observations and trace model inference response curves in real-time.
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-dark-surface border border-dark-border rounded p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">

        {/* Play / Pause / Reset / Inject */}
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button
              onClick={handlePause}
              className="p-3 bg-dark-bg hover:bg-dark-elevated border border-dark-border text-accent-amber rounded transition"
              title="Pause Simulation"
              aria-label="Pause simulation"
            >
              <Pause size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handlePlay}
              className="p-3 bg-accent-amber text-dark-bg rounded transition hover:bg-opacity-95 shadow-md shadow-accent-amber shadow-opacity-10"
              title="Play Simulation"
              aria-label="Play simulation"
            >
              <Play size={16} fill="currentColor" />
            </button>
          )}

          <button
            onClick={handleReset}
            className="p-3 bg-dark-bg hover:bg-dark-elevated border border-dark-border text-text-secondary hover:text-text-primary rounded transition"
            title="Stop Session"
            aria-label="Stop simulation session"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={handleInject}
            disabled={!sim.sessionId || !isPlaying}
            className="p-3 bg-dark-bg hover:bg-dark-elevated border border-accent-red border-opacity-50 text-accent-red rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
            title="Inject GRADUAL_CLOG anomaly into live stream"
            aria-label="Inject anomaly"
          >
            <Zap size={16} />
          </button>

          <span className="text-xs font-mono text-text-secondary uppercase ml-2">
            Status: {isPlaying ? <span className="text-accent-green font-bold">STREAMING</span> : 'PAUSED'}
            {sim.connected && <span className="ml-2 text-[10px] text-accent-lime">[BACKEND WS]</span>}
          </span>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-text-secondary uppercase">Playback Speed:</span>
          <div className="flex bg-dark-bg border border-dark-border rounded p-1">
            {([1, 5, 10] as number[]).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                aria-label={`Set playback speed to ${s}x`}
                aria-pressed={speed === s}
                className={`px-3 py-1 text-xs font-mono font-bold rounded transition ${
                  speed === s
                    ? 'bg-dark-elevated text-accent-amber'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Asset Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[10px] font-mono text-text-secondary uppercase">Telemetry Target:</span>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            aria-label="Select telemetry target asset"
            className="bg-dark-bg border border-dark-border text-xs text-text-primary px-3 py-1.5 rounded outline-none font-mono focus:border-accent-amber cursor-pointer"
          >
            {assets.map(a => (
              <option key={a.id} value={a.id}>{a.id} ({a.field})</option>
            ))}
          </select>
        </div>

      </div>

      {/* Live Stream KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-dark-surface border border-dark-border rounded flex flex-col justify-between">
          <span className="text-[9px] text-text-secondary font-mono uppercase">Telemetry Production</span>
          <div className="text-2xl font-bold font-mono text-text-primary mt-1">
            {latestDataPoint ? latestDataPoint.production.toLocaleString() : '---'} <span className="text-xs">BBL/D</span>
          </div>
          <span className="text-[10px] text-text-secondary font-mono mt-1 uppercase">
            {sim.scenario} scenario · SYNTHETIC feed
          </span>
        </div>

        <div className="p-4 bg-dark-surface border border-dark-border rounded flex flex-col justify-between">
          <span className="text-[9px] text-text-secondary font-mono uppercase">Expected Forecast</span>
          <div className="text-2xl font-bold font-mono text-text-primary mt-1">
            {latestDataPoint ? latestDataPoint.forecast.toLocaleString() : '---'} <span className="text-xs">BBL/D</span>
          </div>
          <span className="text-[10px] text-text-secondary font-mono mt-1 uppercase">ARPS baseline per tick</span>
        </div>

        <div className="p-4 bg-dark-surface border border-dark-border rounded flex flex-col justify-between">
          <span className="text-[9px] text-text-secondary font-mono uppercase">Deviation Delta</span>
          <div className={`text-2xl font-bold font-mono mt-1 ${parseFloat(getDevPct()) < -4 ? 'text-accent-red' : 'text-accent-green'}`}>
            {latestDataPoint ? `${getDevPct()}%` : '---'}
          </div>
          <span className="text-[10px] text-text-secondary font-mono mt-1 uppercase">Critical Limit -5%</span>
        </div>

        <div className="p-4 bg-dark-surface border border-dark-border rounded flex flex-col justify-between">
          <span className="text-[9px] text-text-secondary font-mono uppercase">Anomaly Inference Score</span>
          <div className={`text-2xl font-bold font-mono mt-1 ${latestDataPoint && latestDataPoint.anomalyScore > 0.85 ? 'text-accent-red' : 'text-text-primary'}`}>
            {latestDataPoint ? latestDataPoint.anomalyScore : '---'}
          </div>
          <span className={`text-[10px] font-bold font-mono mt-1 uppercase ${
            latestDataPoint && latestDataPoint.status === 'CRITICAL' ? 'text-accent-red' : 'text-text-secondary'
          }`}>
            {latestDataPoint ? latestDataPoint.status : '---'}
          </span>
        </div>
      </div>

      {/* Streaming Sparkline Chart */}
      <div className="bg-dark-surface border border-dark-border rounded p-6">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
          Live Ingestion Trace Chart
        </h3>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stream}>
              <XAxis dataKey="timestamp" stroke="#B8B3A8" fontSize={9} tickLine={false} />
              <YAxis stroke="#B8B3A8" fontSize={9} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A1D1F', borderColor: '#2A2D30' }}
                labelStyle={{ color: '#F3EFE4' }}
              />
              <Line
                type="monotone"
                name="Actual Flow"
                dataKey="production"
                stroke="#FF9000"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                name="Forecast"
                dataKey="forecast"
                stroke="#B8B3A8"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stream Table */}
      <div className="bg-dark-surface border border-dark-border rounded p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            Incoming Telemetry Observations (Log)
          </h3>
          <span className="text-[10px] text-text-secondary font-mono">SHOWING LATEST 25 OBSERVATIONS</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-dark-border text-text-secondary uppercase text-[10px]">
                <th className="py-2.5">Ingestion Timestamp</th>
                <th className="py-2.5">Asset ID</th>
                <th className="py-2.5 text-right">Production (BBL/D)</th>
                <th className="py-2.5 text-right">Model Forecast (BBL/D)</th>
                <th className="py-2.5 text-right">Deviation Delta</th>
                <th className="py-2.5 text-right">Anomaly Score</th>
                <th className="py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border divide-opacity-35">
              {[...stream].reverse().map((row, idx) => {
                const dev = ((row.production - row.forecast) / row.forecast) * 100;

                return (
                  <tr
                    key={`${row.timestamp}-${idx}`}
                    className={`transition duration-150 ${
                      row.status === 'CRITICAL'
                        ? 'bg-accent-red bg-opacity-[0.04] text-accent-red hover:bg-opacity-[0.08]'
                        : 'hover:bg-dark-elevated text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <td className="py-3 font-semibold">{row.timestamp}</td>
                    <td className="py-3">{row.assetId}</td>
                    <td className="py-3 text-right font-bold text-text-primary">{row.production.toLocaleString()}</td>
                    <td className="py-3 text-right">{row.forecast.toLocaleString()}</td>
                    <td className={`py-3 text-right font-semibold ${dev < -4 ? 'text-accent-red' : 'text-accent-green'}`}>
                      {dev >= 0 ? '+' : ''}{dev.toFixed(1)}%
                    </td>
                    <td className="py-3 text-right">{row.anomalyScore}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                        row.status === 'CRITICAL'
                          ? 'bg-accent-red text-white'
                          : 'bg-dark-bg border border-dark-border text-text-secondary'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
