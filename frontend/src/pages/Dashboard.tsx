import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ReferenceArea,
} from 'recharts';
import {
  Database,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  ArrowRight,
  Maximize2,
  RefreshCw,
  Search,
  ChevronRight,
  X,
  Loader2,
  Gauge,
  Activity,
  Crosshair,
} from 'lucide-react';
import { AssetMap } from '../components/AssetMap';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { TelemetryBar, StatusPill, ScanLine, MiniGauge } from '../components/ui/Industrial';
import { aipsApi } from '../api/aips';
import { anomalyApi } from '../api/anomaly';
import { healthApi } from '../api/health';

const fallbackPortfolio = {
  total_assets: 128,
  active_production: 98,
  at_risk: 11,
  portfolio_production: 2.48,
  expected_production: 2.89,
  deviation: -14.2,
  active_anomalies: 3,
  recovery_potential: 2.34,
  production_trend: [
    { date: '2025-09', actual: 2.10, expected: 2.05, anomaly: false },
    { date: '2025-10', actual: 2.15, expected: 2.10, anomaly: false },
    { date: '2025-11', actual: 2.22, expected: 2.20, anomaly: false },
    { date: '2025-12', actual: 2.30, expected: 2.35, anomaly: false },
    { date: '2026-01', actual: 2.45, expected: 2.50, anomaly: false },
    { date: '2026-02', actual: 2.55, expected: 2.60, anomaly: false },
    { date: '2026-03', actual: 2.40, expected: 2.70, anomaly: true },
    { date: '2026-04', actual: 2.35, expected: 2.75, anomaly: true },
    { date: '2026-05', actual: 2.42, expected: 2.80, anomaly: false },
    { date: '2026-06', actual: 2.46, expected: 2.85, anomaly: false },
    { date: '2026-07', actual: 2.48, expected: 2.89, anomaly: false },
    { date: '2026-08', actual: 2.48, expected: 2.89, anomaly: false },
  ],
  anomalies: [
    { id: 'MH-07', assetName: 'Wellhead RJ-42', severity: 'CRITICAL', deviation: -17.4, time: '2h ago', type: 'Pressure Drop (-450psi)', category: 'Pressure Spike' },
    { id: 'AS-09', assetName: 'Compressor St. AS-09', severity: 'HIGH', deviation: -12.1, time: '1h ago', type: 'Thermal Spike (+22°C)', category: 'Temp Anomaly' },
    { id: 'KG-01', assetName: 'Pipeline KG-Main', severity: 'WATCH', deviation: -8.5, time: '3h ago', type: 'Flow Rate Var (-12%)', category: 'Flow Variance' },
  ],
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAnomaly, setSelectedAnomaly] = useState<typeof fallbackPortfolio.anomalies[0] | null>(null);
  const [portfolio, setPortfolio] = useState(fallbackPortfolio);
  const [backendLive, setBackendLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const health = await healthApi.check();
      setBackendLive(health.status === 'healthy');

      const ranking = await aipsApi.getRanking(100);
      const anomalies = await anomalyApi.getActive(50);
      const rankRows = ranking?.rows ?? [];
      const anomalyRows = anomalies?.rows ?? [];

      const totalAssets = rankRows.length;
      const criticalAssets = rankRows.filter((r) => r.priority === 'CRITICAL').length;
      const highPriorityAssets = rankRows.filter((r) => r.priority === 'HIGH').length;

      const currentProduction = rankRows.reduce((sum, r) => sum + (r.currentProdBblD ?? 0), 0) / 1000;
      const expectedProduction = rankRows.reduce((sum, r) => sum + (r.expectedProdBblD ?? 0), 0) / 1000;
      const deviation = expectedProduction > 0 ? ((currentProduction - expectedProduction) / expectedProduction) * 100 : 0;

      setPortfolio({
        total_assets: totalAssets,
        active_production: totalAssets,
        at_risk: criticalAssets + highPriorityAssets,
        portfolio_production: currentProduction,
        expected_production: expectedProduction,
        deviation,
        active_anomalies: anomalyRows.length,
        recovery_potential: rankRows.reduce((sum, r) => sum + (r.estimatedRecoveryMmbbl ?? 0), 0),
        production_trend: fallbackPortfolio.production_trend,
        anomalies: anomalyRows.map((a, i) => ({
          id: `${a.assetId}-${i}`,
          assetName: a.assetId,
          severity: a.severity,
          deviation: a.deviationPct,
          time: new Date(a.detectedAt ?? Date.now()).toLocaleString(),
          type: 'Model-flagged underperformance',
          category: `Anomaly score ${a.anomalyScore.toFixed(2)}`,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      setBackendLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 size={32} className="text-accent-amber animate-spin" />
        <span className="font-mono text-xs text-text-dim tracking-wider">INITIALIZING TELEMETRY...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-4 mt-6 p-4 bg-accent-red/10 border border-accent-red/30 flex items-center gap-3">
        <AlertTriangle size={18} className="text-accent-red shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-accent-red uppercase tracking-wider">API Error</div>
          <div className="text-xs text-text-secondary mt-0.5 truncate">{error}</div>
        </div>
        <button onClick={loadDashboardData} className="btn-industrial bg-accent-red/20 text-accent-red border-accent-red/30 hover:bg-accent-red/30">
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Provenance */}
      <ProvenanceBadge sourceType="DERIVED" context="banner" disclaimer="Real historical production + derived analytics" isDismissible />

      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold text-text-primary tracking-tight leading-none">
            COMMAND CENTER
          </h1>
          <p className="text-[11px] text-text-dim font-mono mt-0.5 tracking-wider">
            PORTFOLIO HEALTH &mdash; GEOSPATIAL TELEMETRY &mdash; RISK INTEL
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill label={backendLive ? 'BACKEND LIVE' : 'SIMULATION'} color={backendLive ? 'green' : 'lime'} />
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="p-1.5 text-text-dim hover:text-accent-amber transition"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* PRODUCTION TELEMETRY STRIP */}
      <div className="card-panel p-3 relative overflow-hidden">
        <ScanLine />
        <div className="flex items-stretch gap-4 flex-wrap">
          {/* Health gauge */}
          <div className="flex items-center gap-3 pr-4 border-r border-dark-border">
            <MiniGauge value={94.8} size={44} color="#00D966" label="HEALTH" />
          </div>

          {/* Key metrics */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 min-w-0">
            <div>
              <div className="telemetry-label">Portfolio Output</div>
              <div className="telemetry-value text-sm mt-0.5">
                {portfolio.portfolio_production}{' '}
                <span className="text-text-dim text-[10px] font-normal">MMBL/mo</span>
              </div>
              <TelemetryBar value={portfolio.portfolio_production} max={portfolio.expected_production} color="amber" height={2} />
            </div>
            <div>
              <div className="telemetry-label">Target Baseline</div>
              <div className="telemetry-value text-sm mt-0.5">
                {portfolio.expected_production}{' '}
                <span className="text-text-dim text-[10px] font-normal">MMBL/mo</span>
              </div>
              <TelemetryBar value={100} max={100} color="green" height={2} />
            </div>
            <div>
              <div className="telemetry-label">Deviation</div>
              <div className="telemetry-value text-sm mt-0.5 text-accent-red">
                {portfolio.deviation}%
              </div>
              <TelemetryBar value={Math.abs(portfolio.deviation)} max={30} color="red" height={2} />
            </div>
            <div>
              <div className="telemetry-label">Recovery Potential</div>
              <div className="telemetry-value text-sm mt-0.5 text-accent-green">
                {portfolio.recovery_potential}{' '}
                <span className="text-text-dim text-[10px] font-normal">MMBL</span>
              </div>
              <TelemetryBar value={portfolio.recovery_potential} max={5} color="green" height={2} />
            </div>
          </div>

          {/* Right side: gauges */}
          <div className="flex items-center gap-3 pl-4 border-l border-dark-border">
            <MiniGauge value={portfolio.active_anomalies} max={10} size={44} color="#FF9000" label="ANOM" />
            <MiniGauge value={portfolio.at_risk} max={20} size={44} color="#FF3B3B" label="RISK" />
          </div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: 'ASSETS', value: portfolio.total_assets, icon: Database, color: 'text-text-primary' },
          { label: 'ACTIVE', value: portfolio.active_production, icon: CheckCircle2, color: 'text-accent-green', sub: 'Operational' },
          { label: 'AT RISK', value: portfolio.at_risk, icon: AlertOctagon, color: 'text-accent-red', sub: 'Action Req.' },
          { label: 'OUTPUT', value: `${portfolio.portfolio_production}`, icon: Zap, color: 'text-accent-amber', unit: 'MMBL' },
          { label: 'TARGET', value: `${portfolio.expected_production}`, icon: TrendingUp, color: 'text-text-secondary', unit: 'MMBL' },
          { label: 'DEVIATION', value: `${portfolio.deviation}%`, icon: TrendingDown, color: 'text-accent-red' },
          { label: 'ANOMALIES', value: `0${portfolio.active_anomalies}`, icon: AlertTriangle, color: 'text-accent-amber' },
          { label: 'RECOVERY', value: `${portfolio.recovery_potential}`, icon: Gauge, color: 'text-accent-green', unit: 'MMBL' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="card-panel p-2.5 flex flex-col gap-1 hover:border-dark-border/80 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="telemetry-label">{kpi.label}</span>
              <kpi.icon size={12} className="text-text-dim group-hover:text-accent-amber transition-colors" />
            </div>
            <div className={`font-mono text-base font-bold tabular-nums ${kpi.color}`}>
              {kpi.value}
              {kpi.unit && <span className="text-[9px] text-text-dim font-normal ml-0.5">{kpi.unit}</span>}
            </div>
            {kpi.sub && <span className="text-[9px] text-text-dim">{kpi.sub}</span>}
          </div>
        ))}
      </div>

      {/* MAIN GRID: Chart + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Production Trend */}
        <div className="lg:col-span-7 card-panel p-3 relative overflow-hidden flex flex-col">
          <ScanLine color="rgba(255,144,0,0.04)" speed={6} />
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-text-primary tracking-tight">Production vs Expected</h3>
              <span className="text-[10px] text-text-dim font-mono">12-Month Rolling (MMBL)</span>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-[2px] bg-accent-amber rounded-full" />
                <span className="text-text-secondary">Actual</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-[2px] border-t border-dashed border-text-dim" />
                <span className="text-text-dim">Expected</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-accent-red/20 border border-accent-red/40 rounded-[1px]" />
                <span className="text-accent-red">Anomaly</span>
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolio.production_trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF9000" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF9000" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#1A1D1F" />
                <XAxis dataKey="date" stroke="#6B6860" fontSize={10} tickLine={false} fontFamily="'IBM Plex Mono', monospace" />
                <YAxis stroke="#6B6860" fontSize={10} domain={[1.5, 3.2]} tickLine={false} fontFamily="'IBM Plex Mono', monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111313', borderColor: '#2A2D30', borderRadius: 2, color: '#F3EFE4', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                  formatter={(value: any, name: any) => [
                    `${value} MMBL`,
                    name === 'actual' ? 'Actual' : 'Expected',
                  ]}
                />
                <ReferenceArea x1="2026-03" x2="2026-04" fill="#FF3B3B" fillOpacity={0.12} stroke="#FF3B3B" strokeDasharray="2 2" strokeOpacity={0.4} />
                <Area type="monotone" dataKey="actual" stroke="#FF9000" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" dot={false} activeDot={{ r: 3, fill: '#FF9000', stroke: '#080909', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="expected" stroke="#6B6860" strokeDasharray="4 4" strokeWidth={1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-5 card-panel p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-text-primary tracking-tight">Asset Distribution</h3>
              <span className="text-[10px] text-text-dim font-mono">India Basin Telemetry</span>
            </div>
            <button
              onClick={() => navigate('/assets/leaderboard')}
              className="text-[10px] font-mono font-bold text-accent-amber hover:text-accent-amber/80 flex items-center gap-1 transition"
            >
              EXPAND <Maximize2 size={10} />
            </button>
          </div>
          <div className="flex-1 min-h-[260px]">
            <AssetMap onSelectAsset={() => navigate('/assets/leaderboard')} />
          </div>
        </div>
      </div>

      {/* BOTTOM: Anomalies + Quick Nav */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Active Anomalies */}
        <div className="lg:col-span-7 card-panel p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-accent-red" />
              <h3 className="text-xs font-bold text-text-primary tracking-tight">Active Anomalies</h3>
              <StatusPill label={`${portfolio.anomalies.length}`} color="red" />
            </div>
            <button
              onClick={() => navigate('/intelligence/anomaly-detection')}
              className="text-[10px] font-mono font-bold text-accent-amber flex items-center gap-1 hover:gap-2 transition-all"
            >
              VIEW ALL <ArrowRight size={10} />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            {portfolio.anomalies.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedAnomaly(item)}
                className="flex items-center justify-between px-3 py-2 bg-dark-surface border border-dark-border hover:border-accent-amber/40 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider border rounded-[1px] ${
                      item.severity === 'CRITICAL'
                        ? 'bg-accent-red/15 text-accent-red border-accent-red/30'
                        : item.severity === 'HIGH'
                        ? 'bg-accent-amber/15 text-accent-amber border-accent-amber/30'
                        : 'bg-dark-border/50 text-text-secondary border-dark-border'
                    }`}
                  >
                    {item.severity}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-text-primary truncate">
                      {item.assetName}
                      <span className="text-text-dim font-normal ml-1.5">{item.id}</span>
                    </div>
                    <div className="text-[10px] text-text-dim truncate">
                      {item.type}
                      <span className="mx-1">&middot;</span>
                      <span className="text-accent-red font-semibold">DEV {item.deviation}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-[10px] font-mono text-text-dim">{item.time}</span>
                  <ChevronRight size={12} className="text-text-dim group-hover:text-accent-amber transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Workflows */}
        <div className="lg:col-span-5 card-panel p-3 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-text-primary tracking-tight">Quick Workflows</h3>
            <p className="text-[10px] text-text-dim font-mono mt-0.5">Launch priority operations</p>
          </div>

          <div className="flex flex-col gap-2 my-3">
            <button
              onClick={() => navigate('/assets/leaderboard')}
              className="w-full bg-accent-amber text-dark-bg px-3 py-2.5 text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-accent-amber/90 transition"
            >
              Asset Leaderboard <ArrowRight size={14} />
            </button>
            <button
              onClick={() => navigate('/scenarios/simulation')}
              className="w-full border border-accent-amber text-accent-amber px-3 py-2.5 text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-accent-amber/10 transition"
            >
              Start Simulation <Zap size={14} />
            </button>
          </div>

          <div className="bg-dark-surface border-l-2 border-accent-lime p-2.5 text-[10px] text-text-secondary font-mono leading-relaxed">
            <span className="text-accent-lime font-bold">AI ADVISORY:</span>{' '}
            Run reservoir pressure optimization on MH-07 to mitigate -14.2% deviation.
          </div>
        </div>
      </div>

      {/* ANOMALY MODAL */}
      {selectedAnomaly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-bg/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-elevated border border-accent-red/30 w-[420px] p-4 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <StatusPill label={`${selectedAnomaly.severity} ANOMALY`} color="red" pulse />
              <button onClick={() => setSelectedAnomaly(null)} className="text-text-dim hover:text-accent-red transition">
                <X size={16} />
              </button>
            </div>
            <h2 className="text-sm font-bold text-text-primary mb-2">
              {selectedAnomaly.assetName}{' '}
              <span className="text-text-dim font-normal">({selectedAnomaly.id})</span>
            </h2>
            <div className="space-y-1.5 text-[11px] font-mono text-text-secondary mb-3">
              <div><span className="text-text-dim">TYPE:</span> {selectedAnomaly.category}</div>
              <div><span className="text-text-dim">SIGNAL:</span> {selectedAnomaly.type}</div>
              <div><span className="text-text-dim">DEV:</span> <span className="text-accent-red font-bold">{selectedAnomaly.deviation}%</span></div>
              <div><span className="text-text-dim">DETECTED:</span> {selectedAnomaly.time}</div>
            </div>

            {/* Decision support teaser */}
            <div className="bg-dark-surface border border-dark-border p-2.5 mb-3 text-[9px] font-mono text-text-dim leading-relaxed">
              <span className="text-accent-amber font-bold">DECISION SUPPORT:</span>{' '}
              Model-estimated root cause analysis and verification steps available in the full Decision Panel.
              This is not a confirmed diagnosis.
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedAnomaly(null); navigate(`/assets/detail/${selectedAnomaly.id.split('-')[0]}-${selectedAnomaly.id.split('-')[1]}`); }}
                className="flex-1 bg-accent-amber text-dark-bg py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-accent-amber/90 transition flex items-center justify-center gap-1.5"
              >
                Decision Panel <ArrowRight size={12} />
              </button>
              <button
                onClick={() => { setSelectedAnomaly(null); navigate('/intelligence/anomaly-detection'); }}
                className="flex-1 border border-accent-red/50 text-accent-red py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-accent-red/10 transition"
              >
                Full Analysis
              </button>
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="px-3 py-2 bg-dark-surface border border-dark-border text-text-secondary text-xs font-mono font-bold uppercase tracking-wider hover:border-accent-amber/30 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
