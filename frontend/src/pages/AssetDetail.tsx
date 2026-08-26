import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea
} from 'recharts';
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Clock,
  ChevronRight,
  BookmarkPlus,
  Play,
  Flame,
  Brain,
  X,
  Loader2
} from 'lucide-react';
import { RecoveryOpportunityCard } from '../components/RecoveryOpportunityCard';
import { AIPSBreakdown } from '../components/AIPSBreakdown';
import { SHAPExplanationCard } from '../components/SHAPExplanationCard';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { assetsApi } from '../api/assets';

// Shape of GET /assets/{id} - produced by app.intelligence.pipeline.analyze_asset
interface DetailBundle {
  asset: {
    id: string;
    name: string;
    field: string;
    basin: string;
    status: string;
    onstream_year?: number | null;
  };
  current_production_bbl_d: number;
  expected_production_bbl_d: number;
  deviation_pct: number;
  decline: {
    qi: number;
    di: number;
    b: number;
    r_squared: number;
    confidence: number;
    decline_rate_current_pct_per_month: number;
    forecast_30d: number;
    forecast_90d: number;
    n_observations: number;
  };
  anomaly_score: number;
  anomaly_windows: Array<{
    period: string;
    anomaly_score: number;
    severity: string;
    deviation_pct: number;
    expected_bbl_d: number;
    actual_bbl_d: number;
    contributing_features: Array<{ label: string; importance: number }>;
    explanation: string;
  }>;
  detector_metrics: Record<string, number> | null;
  forecast: {
    points: Array<{ day: number; forecast: number; lower: number; upper: number }>;
    summary: {
      forecast_30d: number;
      forecast_90d: number;
      forecast_180d: number;
      forecast_365d: number;
      residual_std: number;
    };
    models_used: string[];
  };
  attribution: {
    terminology: string;
    caveat: string;
    base_value: number;
    contributions: Array<{
      feature: string;
      label: string;
      shap_value: number;
      direction: 'UPWARD' | 'DOWNWARD';
      relative_contribution_pct: number;
    }>;
  };
  recovery: {
    gap_bbl_d: number;
    estimated_recovery_mmbbl: number;
    estimated_value_usd_m: number;
    historical_success_rate: number;
    model_confidence: number;
    combined_confidence: number;
  };
  aips: {
    score: number;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    breakdown: {
      loss_magnitude_pct: number;
      anomaly_severity: number;
      recovery_opportunity_pct: number;
      intervention_complexity: number;
    };
    confidence_breakdown: {
      historical_recovery_rate: number;
      model_confidence: number;
      combined_confidence: number;
    };
  };
  recommendations: {
    recommendations: Array<{
      code: string;
      action: string;
      rationale: string;
      priority: string;
    }>;
    summary: string;
  };
  data_source: string;
  analyzed_at: string;
  historical24m: Array<{
    period: string;
    actual: number;
    expected: number;
  }>;
}

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#FF3B3B',
  HIGH: '#FF9000',
  MEDIUM: '#FFD700',
  LOW: '#00D966',
};

const fmt = (v: number | undefined | null) =>
  v === undefined || v === null ? '---' : Math.round(v).toLocaleString();

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [bundle, setBundle] = useState<DetailBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'production' | 'health' | 'ai'>('production');
  const [modalAction, setModalAction] = useState<string | null>(null);

  const loadAssetData = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      // Canonical pipeline bundle - single backend source of truth
      const detail = await assetsApi.get<DetailBundle>(id);
      setBundle(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load asset data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const d = bundle;

  // ---- chart series derived from backend rows (presentation formatting only)
  const history24M =
    d?.historical24m.map((r) => ({
      date: r.period.slice(0, 7),
      actual: +(r.actual / 1e6).toFixed(3),
      expected: +(r.expected / 1e6).toFixed(3),
    })) ?? [];

  const actualVsExpected12M = history24M.slice(-12);

  const latestWindow = d?.anomaly_windows[d.anomaly_windows.length - 1];
  const anomalyMonth = latestWindow?.period.slice(0, 7);

  const forecastData = (() => {
    if (!d) return [];
    const anchor = d.historical24m[d.historical24m.length - 1];
    const rows: Array<{ date: string; actual?: number; forecast?: number; lower?: number; upper?: number }> = [];
    if (anchor) {
      rows.push({
        date: anchor.period.slice(0, 7),
        actual: +(anchor.actual / 1e6).toFixed(3),
        forecast: +(anchor.expected / 1e6).toFixed(3),
      });
    }
    for (const p of d.forecast.points) {
      rows.push({
        date: new Date(Date.now() + p.day * 86400000).toISOString().slice(0, 7),
        forecast: +(p.forecast / 1e6).toFixed(3),
        lower: +(p.lower / 1e6).toFixed(3),
        upper: +(p.upper / 1e6).toFixed(3),
      });
    }
    return rows;
  })();

  return (
    <div style={{ backgroundColor: '#080909', minHeight: '100vh', color: '#F3EFE4', padding: '24px 32px', paddingBottom: '90px' }}>
      
      {/* ERROR STATE */}
      {error && (
        <div style={{
          backgroundColor: '#2D1A1A',
          border: '1px solid #FF4444',
          borderRadius: '8px',
          padding: '16px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={20} style={{ color: '#FF4444' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#FF4444', marginBottom: '4px' }}>API Connection Error</div>
            <div style={{ fontSize: '13px', color: '#B8B3A8' }}>{error}</div>
          </div>
          <button
            onClick={loadAssetData}
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
            Retry
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && !error && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '100px 32px',
          gap: '16px'
        }}>
          <Loader2 size={48} style={{ color: '#FF9000' }} className="animate-spin" />
          <div style={{ color: '#B8B3A8', fontSize: '14px' }}>Loading asset details...</div>
        </div>
      )}

      {/* MAIN CONTENT */}
      {!loading && !error && d && (
      <>
      {/* PROVENANCE BANNER */}
      <ProvenanceBadge
        sourceType={(d.data_source as 'REAL' | 'SYNTHETIC' | 'DERIVED') || 'SYNTHETIC'}
        context="banner"
        disclaimer={d.provenance?.disclaimer || 'Model-estimated values \u2014 trained/evaluated on synthetic data'}
      />

      {/* BREADCRUMB & BACK BUTTON */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#B8B3A8' }}>
          <Link to="/leaderboard" style={{ color: '#FF9000', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to Leaderboard
          </Link>
          <span>/</span>
          <span>Assets</span>
          <span>/</span>
          <span style={{ color: '#F3EFE4', fontWeight: 700 }}>{d.asset.id}</span>
        </div>

        <div style={{ fontSize: '11px', color: '#B8B3A8' }}>
          Asset ID: <strong style={{ color: '#FF9000' }}>{d.asset.id}</strong> | Source: {d.data_source}
        </div>
      </div>

      {/* 1. ASSET HEADER CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #1A1D1F 0%, #111313 100%)',
        border: `1px solid ${PRIORITY_COLOR[d.aips.priority]}44`,
        borderRadius: '10px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '12px',
            backgroundColor: `${PRIORITY_COLOR[d.aips.priority]}22`,
            border: `2px solid ${PRIORITY_COLOR[d.aips.priority]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: PRIORITY_COLOR[d.aips.priority],
            fontWeight: 900,
            fontSize: '20px'
          }}>
            {d.asset.id.split('-')[0]}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#F3EFE4', margin: 0, letterSpacing: '-1px' }}>
                {d.asset.id}
              </h1>
              <span style={{
                backgroundColor: `${PRIORITY_COLOR[d.aips.priority]}22`,
                color: PRIORITY_COLOR[d.aips.priority],
                border: `1px solid ${PRIORITY_COLOR[d.aips.priority]}`,
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '12px',
                letterSpacing: '0.05em'
              }}>
                ● {d.aips.priority} PRIORITY
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#B8B3A8', marginTop: '4px' }}>
              {d.asset.name} • {d.asset.field} • <span style={{ color: '#F3EFE4' }}>{d.asset.basin}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#B8B3A8', fontWeight: 700, textTransform: 'uppercase' }}>LAST ANALYSIS</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#F3EFE4', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="#00D966" /> {new Date(d.analyzed_at).toLocaleString()}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#B8B3A8', fontWeight: 700, textTransform: 'uppercase' }}>AIPS PRIORITY SCORE</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: PRIORITY_COLOR[d.aips.priority], lineHeight: 1 }}>
              {d.aips.score.toFixed(1)} <span style={{ fontSize: '12px', color: '#B8B3A8' }}>/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TAB NAVIGATION */}
      <div
        role="tablist"
        aria-label="Asset detail views"
        style={{
        display: 'flex',
        borderBottom: '1px solid #2A2D30',
        marginBottom: '24px',
        gap: '8px'
      }}>
        {[
          { id: 'production', label: 'Production Intelligence', icon: Activity },
          { id: 'health', label: 'Asset Health & Status', icon: Flame },
          { id: 'ai', label: 'Explainable AI Insights', icon: Brain },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #FF9000' : '3px solid transparent',
                color: isActive ? '#FF9000' : '#B8B3A8',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} color={isActive ? '#FF9000' : '#B8B3A8'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: PRODUCTION INTELLIGENCE */}
      {activeTab === 'production' && (
        <div id="panel-production" role="tabpanel" aria-label="Production Intelligence" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
            
            {/* a) Historical Production Chart (24M) */}
            <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3EFE4', margin: 0 }}>Historical Production Trend</h3>
                  <span style={{ fontSize: '11px', color: '#B8B3A8' }}>24-Month Trajectory (MMbbl/month)</span>
                </div>
                <span style={{ fontSize: '11px', color: '#FF9000', fontWeight: 700 }}>● Actual Prod</span>
              </div>
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history24M} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF9000" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FF9000" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" />
                    <XAxis dataKey="date" stroke="#B8B3A8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#B8B3A8" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111313', borderColor: '#2A2D30', color: '#F3EFE4' }} />
                    <Area type="monotone" dataKey="actual" stroke="#FF9000" strokeWidth={2} fill="url(#colorHist)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* b) Actual vs Expected Chart (12M) */}
            <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3EFE4', margin: 0 }}>Actual vs Expected Production</h3>
                  <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Last 12 Months{anomalyMonth ? ' with Anomaly Region' : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                  <span style={{ color: '#FF9000', fontWeight: 700 }}>● Actual</span>
                  <span style={{ color: '#B8B3A8', fontWeight: 700 }}>-- Expected</span>
                </div>
              </div>
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={actualVsExpected12M} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" />
                    <XAxis dataKey="date" stroke="#B8B3A8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#B8B3A8" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111313', borderColor: '#2A2D30', color: '#F3EFE4' }} />
                    {anomalyMonth && (
                      <ReferenceArea x1={anomalyMonth} x2={actualVsExpected12M[actualVsExpected12M.length - 1]?.date ?? anomalyMonth} fill="#FF3B3B" fillOpacity={0.15} stroke="#FF3B3B" strokeDasharray="3 3" />
                    )}
                    <Line type="monotone" dataKey="actual" stroke="#FF9000" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="expected" stroke="#B8B3A8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* c) Production Forecast Chart (90D Horizon) */}
          <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3EFE4', margin: 0 }}>Production Forecast (12M Horizon)</h3>
                  <span style={{ fontSize: '11px', color: '#B8B3A8' }}>
                    {d.forecast.models_used.join(' + ') || 'Forecasting ensemble'} · 80% confidence band
                  </span>
                </div>
                <span style={{ backgroundColor: '#C7F70022', color: '#C7F700', border: '1px solid #C7F700', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                  ARPS FIT R²: {d.decline.r_squared.toFixed(3)}
                </span>
              </div>
              <div style={{ width: '100%', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" />
                    <XAxis dataKey="date" stroke="#B8B3A8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#B8B3A8" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111313', borderColor: '#2A2D30', color: '#F3EFE4' }} />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="#C7F700" fillOpacity={0.18} />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="#080909" fillOpacity={0.9} />
                    <Line type="monotone" dataKey="actual" stroke="#FF9000" strokeWidth={3} dot={true} />
                    <Line type="monotone" dataKey="forecast" stroke="#C7F700" strokeDasharray="4 4" strokeWidth={3} dot={true} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* d) Production Metrics Table */}
          <div style={{ backgroundColor: '#111313', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#F3EFE4', marginBottom: '14px' }}>Detailed Production Metrics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '13px' }}>
              <div style={{ backgroundColor: '#1A1D1F', padding: '12px 16px', borderRadius: '6px', border: '1px solid #2A2D30' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Current Production</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#F3EFE4', marginTop: '4px' }}>{fmt(d.current_production_bbl_d)} <span style={{ fontSize: '11px' }}>BBL/D</span></div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '12px 16px', borderRadius: '6px', border: '1px solid #2A2D30' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Expected Production (Arps)</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#B8B3A8', marginTop: '4px' }}>{fmt(d.expected_production_bbl_d)} <span style={{ fontSize: '11px' }}>BBL/D</span></div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '12px 16px', borderRadius: '6px', border: `1px solid ${d.deviation_pct < -5 ? '#FF3B3B44' : '#2A2D30'}` }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Deviation</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: d.deviation_pct < -5 ? '#FF3B3B' : '#00D966', marginTop: '4px' }}>
                  {d.deviation_pct >= 0 ? '+' : ''}{d.deviation_pct.toFixed(1)}%
                </div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '12px 16px', borderRadius: '6px', border: '1px solid #2A2D30' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Forecast (30D)</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#C7F700', marginTop: '4px' }}>{fmt(d.forecast.summary.forecast_30d)} <span style={{ fontSize: '11px' }}>BBL/D</span></div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '12px 16px', borderRadius: '6px', border: '1px solid #2A2D30' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Forecast (90D)</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#C7F700', marginTop: '4px' }}>{fmt(d.forecast.summary.forecast_90d)} <span style={{ fontSize: '11px' }}>BBL/D</span></div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '12px 16px', borderRadius: '6px', border: '1px solid #FF900044' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Decline Rate (fitted Arps)</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#FF9000', marginTop: '4px' }}>{d.decline.decline_rate_current_pct_per_month.toFixed(2)}% / month</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: ASSET HEALTH & STATUS */}
      {activeTab === 'health' && (
        <div id="panel-health" role="tabpanel" aria-label="Asset Health & Status" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            {/* a) AIPS Score Gauge (backend score) */}
            <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3EFE4', marginBottom: '16px' }}>AIPS Priority Score</h3>

              <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="160" height="160" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="#2A2D30" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke={PRIORITY_COLOR[d.aips.priority]}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="264"
                    strokeDashoffset={264 * (1 - Math.min(d.aips.score, 100) / 100)}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 900, color: PRIORITY_COLOR[d.aips.priority], lineHeight: 1 }}>{d.aips.score.toFixed(0)}</div>
                  <div style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '4px' }}>{d.aips.priority} PRIORITY</div>
                </div>
              </div>
            </div>

            {/* b) 2x2 Status Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ backgroundColor: '#1A1D1F', border: `1px solid ${latestWindow && latestWindow.severity !== 'NORMAL' ? '#FF3B3B44' : '#2A2D30'}`, borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>ANOMALY STATUS</span>
                <div style={{ marginTop: '8px' }}>
                  <span style={{
                    backgroundColor: `${latestWindow && latestWindow.severity !== 'NORMAL' ? '#FF3B3B' : '#00D966'}22`,
                    color: latestWindow && latestWindow.severity !== 'NORMAL' ? '#FF3B3B' : '#00D966',
                    border: `1px solid ${latestWindow && latestWindow.severity !== 'NORMAL' ? '#FF3B3B' : '#00D966'}`,
                    padding: '4px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '12px'
                  }}>
                    {latestWindow ? latestWindow.severity : 'NORMAL'}
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>PRODUCTION STATUS</span>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ backgroundColor: d.deviation_pct < -5 ? '#FF900022' : '#00D96622', color: d.deviation_pct < -5 ? '#FF9000' : '#00D966', border: `1px solid ${d.deviation_pct < -5 ? '#FF9000' : '#00D966'}`, padding: '4px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '12px' }}>
                    {d.deviation_pct < -10 ? 'SHARP DECLINE' : d.deviation_pct < -5 ? 'DECLINING' : d.deviation_pct < 0 ? 'BELOW TARGET' : 'ON TARGET'}
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>OPERATIONAL STATUS</span>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ backgroundColor: '#00D96622', color: '#00D966', border: '1px solid #00D966', padding: '4px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '12px' }}>
                    {d.asset.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>LATEST FLAGGED PERIOD</span>
                <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: 800, color: '#FF9000' }}>
                  {latestWindow ? latestWindow.period.slice(0, 7) : 'None'}
                </div>
              </div>
            </div>

            {/* c) Detector Validation Metrics (backend backtest) */}
            <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3EFE4', marginBottom: '12px' }}>Detector Validation Metrics</h3>
              {d.detector_metrics ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '10px' }}>
                  {Object.entries(d.detector_metrics).slice(0, 6).map(([k, v]) => (
                    <div key={k} style={{ backgroundColor: '#111313', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#C7F700' }}>{typeof v === 'number' ? v.toFixed(2) : String(v)}</div>
                      <div style={{ fontSize: '9px', color: '#B8B3A8', textTransform: 'uppercase', marginTop: '2px' }}>{k.replace(/_/g, ' ')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#B8B3A8' }}>Detector metrics unavailable for this asset.</div>
              )}
            </div>
          </div>

          {/* d) Active Issues (backend recommendations) */}
          <div style={{ backgroundColor: '#111313', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3EFE4', marginBottom: '14px' }}>Active Issues & Recommended Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {d.recommendations.recommendations.map((rec, idx) => {
                const color = rec.priority === 'CRITICAL' || rec.priority === 'HIGH' ? '#FF3B3B' : rec.priority === 'MEDIUM' ? '#FF9000' : '#FFD700';
                return (
                  <div
                    key={rec.code + idx}
                    onClick={() => setActiveTab('ai')}
                    style={{ backgroundColor: '#1A1D1F', border: `1px solid ${color}44`, borderRadius: '6px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ backgroundColor: `${color}22`, color, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>{rec.priority}</span>
                      <span style={{ fontWeight: 700, color: '#F3EFE4' }}>{rec.action} — <span style={{ fontWeight: 400, color: '#B8B3A8' }}>{rec.rationale}</span></span>
                    </div>
                    <ChevronRight size={16} color="#B8B3A8" />
                  </div>
                );
              })}
              {d.recommendations.recommendations.length === 0 && (
                <div style={{ fontSize: '13px', color: '#00D966' }}>No recommended actions — asset performing within expected bounds.</div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: EXPLAINABLE AI INSIGHTS */}
      {activeTab === 'ai' && (
        <div id="panel-ai" role="tabpanel" aria-label="Explainable AI Insights" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
            
            <SHAPExplanationCard
              asset_id={d.asset.id}
              production_deviation_percent={d.deviation_pct}
              top_features={d.attribution.contributions.map(c => ({
                feature_name: c.label,
                contribution_percent: c.relative_contribution_pct,
                value: c.shap_value,
                baseline_value: d.attribution.base_value,
              }))}
              model_type={d.attribution.terminology}
              model_confidence={d.aips.confidence_breakdown.model_confidence}
            />

            {/* b) Recovery Opportunity Card (backend estimate, with confidence breakdown) */}
            <RecoveryOpportunityCard
              asset_id={d.asset.id}
              expected_production={d.expected_production_bbl_d}
              actual_production={d.current_production_bbl_d}
              historical_recovery_rate={d.recovery.historical_success_rate}
              model_confidence={d.recovery.model_confidence}
              combined_confidence={d.recovery.combined_confidence}
              anomaly_score={d.anomaly_score}
            />
          </div>

          {/* c) Backend AIPS Breakdown (formula, components, confidence) */}
          <AIPSBreakdown
            aips_score={d.aips.score}
            priority={d.aips.priority}
            loss_magnitude={d.aips.breakdown.loss_magnitude_pct}
            anomaly_severity={d.aips.breakdown.anomaly_severity / 100}
            recovery_opportunity={d.aips.breakdown.recovery_opportunity_pct}
            intervention_complexity={d.aips.breakdown.intervention_complexity}
            confidence={d.aips.confidence_breakdown.combined_confidence}
          />

          {/* d) Model Confidence Grid (backend validation numbers) */}
          <div style={{ backgroundColor: '#111313', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#F3EFE4', marginBottom: '14px' }}>Model Confidence & Validation Scores</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: '#1A1D1F', padding: '14px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#B8B3A8' }}>Arps Fit R²</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#C7F700', marginTop: '4px' }}>{d.decline.r_squared.toFixed(3)}</div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '14px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#B8B3A8' }}>Detector ROC-AUC</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#C7F700', marginTop: '4px' }}>{d.detector_metrics?.roc_auc?.toFixed(2) ?? '---'}</div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '14px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#B8B3A8' }}>Combined Recovery Confidence</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#C7F700', marginTop: '4px' }}>{(d.recovery.combined_confidence * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 6. TIMELINE (BELOW ALL TABS) */}
      <div style={{ backgroundColor: '#111313', border: '1px solid #2A2D30', borderRadius: '8px', padding: '24px', marginTop: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F3EFE4', marginBottom: '20px' }}>
          Important Events & Telemetry Milestones
        </h3>

        <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid #2A2D30', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {(d.anomaly_windows.length > 0
            ? d.anomaly_windows.slice(-3).reverse().map((w) => ({
                period: w.period.slice(0, 10),
                title: `${w.severity} anomaly window`,
                description: w.explanation,
                color: w.severity === 'CRITICAL' ? '#FF3B3B' : w.severity === 'ALERT' ? '#FF9000' : '#FFD700',
              }))
            : [{ period: d.analyzed_at.slice(0, 10), title: 'No anomalies flagged', description: 'All monitored windows within expected bands.', color: '#00D966' }]
          ).map((ev: { period: string; title: string; description: string; color: string }, idx: number) => (
            <div key={idx} style={{ position: 'relative' }}>
              {/* Timeline Marker Dot */}
              <div style={{
                position: 'absolute',
                left: '-31px',
                top: '2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: ev.color,
                boxShadow: `0 0 8px ${ev.color}`
              }}></div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#B8B3A8', fontFamily: 'monospace' }}>{ev.period}</span>
                <span style={{
                  backgroundColor: `${ev.color}22`,
                  color: ev.color,
                  border: `1px solid ${ev.color}44`,
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {ev.title}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#B8B3A8', marginTop: '4px' }}>{ev.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. ACTION PANEL (STICKY BOTTOM) */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '260px',
        right: 0,
        backgroundColor: '#111313',
        borderTop: '1px solid #2A2D30',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100
      }}>
        <div style={{ fontSize: '13px', color: '#B8B3A8' }}>
          Asset <strong style={{ color: '#F3EFE4' }}>{d.asset.id}</strong> Intervention Workflow
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setModalAction('investigate')}
            style={{
              backgroundColor: '#FF9000',
              color: '#080909',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <AlertTriangle size={16} /> Investigate Asset
          </button>

          <button
            onClick={() => setModalAction('simulate')}
            style={{
              backgroundColor: 'transparent',
              color: '#FF9000',
              border: '1px solid #FF9000',
              borderRadius: '6px',
              padding: '10px 20px',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Play size={16} /> Simulate Recovery Scenario
          </button>

          <button
            onClick={() => setModalAction('watchlist')}
            style={{
              backgroundColor: 'transparent',
              color: '#F3EFE4',
              border: '1px solid #2A2D30',
              borderRadius: '6px',
              padding: '10px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <BookmarkPlus size={16} /> Add to Watchlist
          </button>
        </div>
      </div>

      {/* ACTION MODAL DIALOG */}
      {modalAction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(8, 9, 9, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #FF9000', borderRadius: '10px', width: '420px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F3EFE4', margin: 0 }}>
                {modalAction === 'investigate' ? 'Initiate Field Investigation' : (modalAction === 'simulate' ? 'Launch Recovery Simulation' : 'Add to Watchlist')}
              </h2>
              <button onClick={() => setModalAction(null)} style={{ background: 'none', border: 'none', color: '#B8B3A8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#B8B3A8', margin: '14px 0' }}>
              {modalAction === 'investigate'
              ? `Dispatch telemetry diagnostic task force for asset ${d.asset.id} (Pressure sensor PT-104 inspection).`
              : (modalAction === 'simulate' ? `Initiate reservoir gas-lift simulation model targeting +${d.recovery.estimated_recovery_mmbbl.toFixed(2)} MMbbl estimated recovery.` : `Asset ${d.asset.id} will be pinned to high-priority alert stream.`)}
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setModalAction(null)}
                style={{ flex: 1, backgroundColor: '#FF9000', color: '#080909', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

    </div>
  );
};
