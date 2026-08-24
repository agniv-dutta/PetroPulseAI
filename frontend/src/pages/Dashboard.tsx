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
  ReferenceArea
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
  UserCheck,
  ChevronRight,
  X,
  Loader2
} from 'lucide-react';
import { AssetMap } from '../components/AssetMap';
import { DataTransparencyBanner } from '../components/DataTransparencyBanner';
import { assetsApi } from '../api/assets';
import { aipsApi } from '../api/aips';
import { anomalyApi } from '../api/anomaly';
import { healthApi } from '../api/health';

// Mock Data structure based on specifications
const fallbackPortfolio = {
  total_assets: 128,
  active_production: 98,
  at_risk: 11,
  portfolio_production: 2.48, // MMT
  expected_production: 2.89, // MMT
  deviation: -14.2, // %
  active_anomalies: 3,
  recovery_potential: 2.34, // MMBL
  production_trend: [
    { date: '2025-09', actual: 2.10, expected: 2.05, anomaly: false },
    { date: '2025-10', actual: 2.15, expected: 2.10, anomaly: false },
    { date: '2025-11', actual: 2.22, expected: 2.20, anomaly: false },
    { date: '2025-12', actual: 2.30, expected: 2.35, anomaly: false },
    { date: '2026-01', actual: 2.45, expected: 2.50, anomaly: false },
    { date: '2026-02', actual: 2.55, expected: 2.60, anomaly: false },
    { date: '2026-03', actual: 2.40, expected: 2.70, anomaly: true },  // Anomaly point
    { date: '2026-04', actual: 2.35, expected: 2.75, anomaly: true },  // Anomaly point
    { date: '2026-05', actual: 2.42, expected: 2.80, anomaly: false },
    { date: '2026-06', actual: 2.46, expected: 2.85, anomaly: false },
    { date: '2026-07', actual: 2.48, expected: 2.89, anomaly: false },
    { date: '2026-08', actual: 2.48, expected: 2.89, anomaly: false },
  ],
  anomalies: [
    { id: 'MH-07', assetName: 'Wellhead RJ-42', severity: 'CRITICAL', deviation: -17.4, time: '2h ago', type: 'Pressure Drop (-450psi)', category: 'Pressure Spike' },
    { id: 'AS-09', assetName: 'Compressor St. AS-09', severity: 'HIGH', deviation: -12.1, time: '1h ago', type: 'Thermal Spike (+22°C)', category: 'Temp Anomaly' },
    { id: 'KG-01', assetName: 'Pipeline KG-Main', severity: 'WATCH', deviation: -8.5, time: '3h ago', type: 'Flow Rate Var (-12%)', category: 'Flow Variance' },
  ]
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<typeof fallbackPortfolio.anomalies[0] | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [portfolio, setPortfolio] = useState(fallbackPortfolio);
  const [backendLive, setBackendLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check backend health
      const health = await healthApi.check();
      setBackendLive(health.status === 'healthy');

      // Load assets
      const assets = await assetsApi.list({ limit: 1000 });
      
      // Load AIPS ranking
      const ranking = await aipsApi.getRanking(100);
      
      // Load active anomalies
      const anomalies = await anomalyApi.getActive(50);

      // Calculate portfolio metrics from real data
      const totalAssets = assets.length;
      const activeAssets = assets.filter(a => a.status === 'ACTIVE').length;
      const criticalAssets = ranking.filter(r => r.priority === 'CRITICAL').length;
      const highPriorityAssets = ranking.filter(r => r.priority === 'HIGH').length;
      
      // Calculate production metrics
      const currentProduction = assets.reduce((sum, a) => sum + a.baseline_qi, 0) / 1000;
      const expectedProduction = currentProduction * 1.1; // Simplified calculation
      const deviation = ((currentProduction - expectedProduction) / expectedProduction) * 100;

      setPortfolio({
        total_assets: totalAssets,
        active_production: activeAssets,
        at_risk: criticalAssets + highPriorityAssets,
        portfolio_production: currentProduction,
        expected_production: expectedProduction,
        deviation: deviation,
        active_anomalies: anomalies.length,
        recovery_potential: ranking.reduce((sum, r) => sum + r.aips_score * 100, 0) / 1000,
        production_trend: fallbackPortfolio.production_trend, // Keep mock trend for now
        anomalies: anomalies.map(a => ({
          id: a.id,
          assetName: a.asset_id,
          severity: a.severity,
          deviation: a.deviation_pct,
          time: new Date(a.detected_at).toLocaleString(),
          type: 'Model-flagged underperformance',
          category: `Anomaly score ${a.anomaly_score.toFixed(2)}`,
        })),
      });

      const now = new Date();
      setLastUpdatedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
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

  return (
    <div style={{
      backgroundColor: '#080909',
      minHeight: '100vh',
      color: '#F3EFE4',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* 1. PERSISTENT SYSTEM STATUS BAR */}
      <div style={{
        backgroundColor: '#111313',
        borderBottom: '1px solid #2A2D30',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        color: '#F3EFE4',
        position: 'sticky',
        top: 0,
        zIndex: 90
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 800, color: '#F3EFE4' }}>PETROPULSE AI</span>
          <span style={{ color: '#2A2D30' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#FF9000',
              boxShadow: '0 0 8px #FF9000'
            }}></span>
            <span style={{ color: '#FF9000', fontWeight: 700 }}>OPERATIONAL</span>
          </div>
          <span style={{ color: '#2A2D30' }}>|</span>
          <span style={{ color: '#B8B3A8' }}>
            DATA STREAM:{' '}
            <span style={{ color: backendLive ? '#00D966' : '#C7F700' }}>
              {backendLive ? 'BACKEND LIVE' : 'SIMULATION ACTIVE'}
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#B8B3A8' }}>
          <span>Last Updated: <strong style={{ color: '#F3EFE4' }}>{lastUpdatedTime || '17:24'}</strong></span>
          <button 
            onClick={loadDashboardData}
            disabled={loading}
            style={{ background: 'none', border: 'none', color: '#B8B3A8', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: loading ? 0.5 : 1 }}
            title="Refresh Stream"
            aria-label="Refresh stream"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div style={{
          backgroundColor: '#2D1A1A',
          border: '1px solid #FF4444',
          borderRadius: '8px',
          padding: '16px 24px',
          margin: '24px 32px',
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
            onClick={loadDashboardData}
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
          <div style={{ color: '#B8B3A8', fontSize: '14px' }}>Loading dashboard data...</div>
        </div>
      )}

      {/* MAIN CONTENT */}
      {!loading && !error && (
      <>
      {/* MAIN CONTAINER */}
      <div style={{ padding: '24px 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* DATA TRANSPARENCY BANNER */}
        <DataTransparencyBanner context="dashboard" isDismissible />

        {/* TOP HEADER & SEARCH */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            {/* 2. PAGE TITLE */}
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F3EFE4', margin: 0, letterSpacing: '-0.5px' }}>
              Command Center
            </h1>
            <p style={{ fontSize: '13px', color: '#B8B3A8', marginTop: '4px' }}>
              Real-time portfolio health, geospatial telemetry & risk intelligence
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#111313',
              border: '1px solid #2A2D30',
              borderRadius: '6px',
              padding: '8px 14px',
              gap: '10px',
              width: '300px'
            }}>
              <Search size={16} color="#B8B3A8" />
              <input
                type="text"
                placeholder="Search telemetry, assets, or reports..."
                aria-label="Search telemetry, assets, or reports"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#F3EFE4',
                  fontSize: '13px',
                  width: '100%'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#1A1D1F',
              border: '1px solid #2A2D30',
              padding: '6px 12px',
              borderRadius: '6px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#FF9000',
                color: '#080909',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}>
                <UserCheck size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#F3EFE4' }}>Lead Engineer</span>
                <span style={{ fontSize: '10px', color: '#B8B3A8' }}>FIELD OPS #042</span>
              </div>
            </div>
          </div>
        </div>

        {/* HERO BANNER CARD (OPTIONAL OPTIMAL SUMMARY) */}
        <div style={{
          backgroundColor: '#111313',
          border: '1px solid #2A2D30',
          borderRadius: '10px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #111313 0%, #1A1D1F 100%)'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#B8B3A8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              PORTFOLIO HEALTH
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#F3EFE4', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#00D966', boxShadow: '0 0 12px #00D966' }}></span>
              OPTIMAL
              <span style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#00D96622', color: '#00D966', borderRadius: '20px', border: '1px solid #00D96644', fontWeight: 700 }}>
                SYS_STATUS: NOMINAL_OP
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#B8B3A8' }}>AI CONFIDENCE SCORE</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#C7F700' }}>94.8%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#B8B3A8' }}>LAST SYNC</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#F3EFE4' }}>Just Now</div>
            </div>
          </div>
        </div>

        {/* 3. KPI CARDS GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          {/* Card 1: Total Assets */}
          <div
            onMouseEnter={() => setHoveredCard('assets')}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: '#1A1D1F',
              border: hoveredCard === 'assets' ? '1px solid #FF9000' : '1px solid #2A2D30',
              borderRadius: '8px',
              padding: '16px 20px',
              position: 'relative',
              transition: 'all 0.2s ease',
              transform: hoveredCard === 'assets' ? 'translateY(-2px)' : 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#B8B3A8', textTransform: 'uppercase' }}>Total Assets</span>
              <Database size={18} color="#B8B3A8" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#F3EFE4', marginTop: '8px' }}>
              {portfolio.total_assets}
            </div>
            <div style={{ fontSize: '11px', color: '#00D966', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={12} />
              <span>+12 THIS MONTH</span>
            </div>
          </div>

          {/* Card 2: Active Production */}
          <div
            onMouseEnter={() => setHoveredCard('active')}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: '#1A1D1F',
              border: hoveredCard === 'active' ? '1px solid #00D966' : '1px solid #2A2D30',
              borderRadius: '8px',
              padding: '16px 20px',
              position: 'relative',
              transition: 'all 0.2s ease',
              transform: hoveredCard === 'active' ? 'translateY(-2px)' : 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#B8B3A8', textTransform: 'uppercase' }}>Active Production</span>
              <CheckCircle2 size={18} color="#00D966" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#00D966', marginTop: '8px' }}>
              {portfolio.active_production}
            </div>
            <div style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '4px' }}>
              76.5% Operational Rate
            </div>
          </div>

          {/* Card 3: Assets at Risk */}
          <div
            onMouseEnter={() => setHoveredCard('risk')}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: '#1A1D1F',
              border: hoveredCard === 'risk' ? '1px solid #FF3B3B' : '1px solid #2A2D30',
              borderRadius: '8px',
              padding: '16px 20px',
              position: 'relative',
              transition: 'all 0.2s ease',
              transform: hoveredCard === 'risk' ? 'translateY(-2px)' : 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#B8B3A8', textTransform: 'uppercase' }}>Assets at Risk</span>
              <AlertOctagon size={18} color="#FF3B3B" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#FF3B3B', marginTop: '8px' }}>
              {portfolio.at_risk}
            </div>
            <div style={{ fontSize: '11px', color: '#FF3B3B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingDown size={12} />
              <span>REQUIRES ACTION</span>
            </div>
          </div>

          {/* Card 4: Portfolio Production */}
          <div
            onMouseEnter={() => setHoveredCard('portfolio_prod')}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: '#1A1D1F',
              border: hoveredCard === 'portfolio_prod' ? '1px solid #FF9000' : '1px solid #2A2D30',
              borderRadius: '8px',
              padding: '16px 20px',
              position: 'relative',
              transition: 'all 0.2s ease',
              transform: hoveredCard === 'portfolio_prod' ? 'translateY(-2px)' : 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#B8B3A8', textTransform: 'uppercase' }}>Portfolio Prod.</span>
              <Zap size={18} color="#FF9000" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#FF9000', marginTop: '8px' }}>
              {portfolio.portfolio_production} <span style={{ fontSize: '14px', fontWeight: 500, color: '#B8B3A8' }}>MMBL/mo</span>
            </div>
            <div style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '4px' }}>
              Current Annual Rate
            </div>
          </div>

          {/* Card 5: Expected Production */}
          <div
            onMouseEnter={() => setHoveredCard('expected_prod')}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: '#1A1D1F',
              border: hoveredCard === 'expected_prod' ? '1px solid #B8B3A8' : '1px solid #2A2D30',
              borderRadius: '8px',
              padding: '16px 20px',
              position: 'relative',
              transition: 'all 0.2s ease',
              transform: hoveredCard === 'expected_prod' ? 'translateY(-2px)' : 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#B8B3A8', textTransform: 'uppercase' }}>Expected Prod.</span>
              <TrendingUp size={18} color="#B8B3A8" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#F3EFE4', marginTop: '8px' }}>
              {portfolio.expected_production} <span style={{ fontSize: '14px', fontWeight: 500, color: '#B8B3A8' }}>MMBL/mo</span>
            </div>
            <div style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '4px' }}>
              Baseline Target
            </div>
          </div>

          {/* Card 6: Production Deviation */}
          <div
            onMouseEnter={() => setHoveredCard('deviation')}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: '#1A1D1F',
              border: hoveredCard === 'deviation' ? '1px solid #FF3B3B' : '1px solid #2A2D30',
              borderRadius: '8px',
              padding: '16px 20px',
              position: 'relative',
              transition: 'all 0.2s ease',
              transform: hoveredCard === 'deviation' ? 'translateY(-2px)' : 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#B8B3A8', textTransform: 'uppercase' }}>Prod. Deviation</span>
              <TrendingDown size={18} color="#FF3B3B" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#FF3B3B', marginTop: '8px' }}>
              {portfolio.deviation}%
            </div>
            <div style={{ fontSize: '11px', color: '#FF3B3B', marginTop: '4px' }}>
              Below Target Baseline
            </div>
          </div>

          {/* Card 7: Active Anomalies */}
          <div
            onMouseEnter={() => setHoveredCard('anomalies')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => navigate('/intelligence/anomaly-detection')}
            style={{
              backgroundColor: '#1A1D1F',
              border: hoveredCard === 'anomalies' ? '1px solid #FF9000' : '1px solid #2A2D30',
              borderRadius: '8px',
              padding: '16px 20px',
              position: 'relative',
              transition: 'all 0.2s ease',
              transform: hoveredCard === 'anomalies' ? 'translateY(-2px)' : 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#B8B3A8', textTransform: 'uppercase' }}>Active Anomalies</span>
              <AlertTriangle size={18} color="#FF9000" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#F3EFE4', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              0{portfolio.active_anomalies}
              <span style={{
                backgroundColor: '#FF900022',
                color: '#FF9000',
                border: '1px solid #FF9000',
                borderRadius: '12px',
                fontSize: '11px',
                padding: '2px 8px',
                fontWeight: 700
              }}>
                CRITICAL
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '4px' }}>
              Click to view details
            </div>
          </div>

          {/* Card 8: Estimated Recovery Potential */}
          <div
            onMouseEnter={() => setHoveredCard('recovery')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => navigate('/scenarios/recovery-what-if')}
            style={{
              backgroundColor: '#1A1D1F',
              border: hoveredCard === 'recovery' ? '1px solid #00D966' : '1px solid #2A2D30',
              borderRadius: '8px',
              padding: '16px 20px',
              position: 'relative',
              transition: 'all 0.2s ease',
              transform: hoveredCard === 'recovery' ? 'translateY(-2px)' : 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#B8B3A8', textTransform: 'uppercase' }}>Recovery Potential</span>
              <Zap size={18} color="#00D966" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#00D966', marginTop: '8px' }}>
              {portfolio.recovery_potential} <span style={{ fontSize: '14px', fontWeight: 500, color: '#B8B3A8' }}>MMBL</span>
            </div>
            <div style={{ fontSize: '11px', color: '#00D966', marginTop: '4px' }}>
              Identified AI Uplift
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: CHART (50% / FULL) & MAP (40%) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '24px',
          marginTop: '8px'
        }}>
          {/* 4. PRODUCTION TREND CHART (7 Cols on desktop = ~58%) */}
          <div style={{
            gridColumn: 'span 7',
            backgroundColor: '#1A1D1F',
            border: '1px solid #2A2D30',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F3EFE4', margin: 0 }}>
                  Production vs. Expected Trend
                </h3>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>12-Month Rolling Trajectory (MMBL)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '3px', backgroundColor: '#FF9000', borderRadius: '2px' }}></span>
                  <span style={{ color: '#F3EFE4' }}>Actual</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '2px', borderTop: '2px dashed #B8B3A8' }}></span>
                  <span style={{ color: '#B8B3A8' }}>Expected</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#FF3B3B33', border: '1px solid #FF3B3B' }}></span>
                  <span style={{ color: '#FF3B3B', fontSize: '11px' }}>Anomaly Zone</span>
                </div>
              </div>
            </div>

            <div style={{ width: '100%', height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolio.production_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9000" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FF9000" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" />
                  <XAxis dataKey="date" stroke="#B8B3A8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#B8B3A8" fontSize={11} domain={[1.5, 3.2]} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111313', borderColor: '#2A2D30', borderRadius: '6px', color: '#F3EFE4' }}
                    formatter={(value: any, name: any) => [
                      `${value} MMBL`,
                      name === 'actual' ? 'Actual Production' : 'Expected Target'
                    ]}
                  />
                  {/* Highlight Anomaly region */}
                  <ReferenceArea x1="2026-03" x2="2026-04" fill="#FF3B3B" fillOpacity={0.2} stroke="#FF3B3B" strokeDasharray="3 3" />
                  
                  <Area type="monotone" dataKey="actual" stroke="#FF9000" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                  <Line type="monotone" dataKey="expected" stroke="#B8B3A8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 5. ASSET DISTRIBUTION MAP (5 Cols on desktop = ~42%) */}
          <div style={{
            gridColumn: 'span 5',
            backgroundColor: '#1A1D1F',
            border: '1px solid #2A2D30',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F3EFE4', margin: 0 }}>
                  Asset Geospatial Distribution
                </h3>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>India Basin Telemetry & Heatmap</span>
              </div>
              <button
                onClick={() => navigate('/assets/leaderboard')}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#FF9000',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Full Map <Maximize2 size={12} />
              </button>
            </div>

            {/* Interactive Leaflet India Map Component */}
            <div style={{ flex: 1, minHeight: '300px' }}>
              <AssetMap onSelectAsset={() => navigate('/assets/leaderboard')} />
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: ACTIVE ANOMALIES & QUICK NAV */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '24px',
          marginTop: '8px'
        }}>
          {/* 6. ACTIVE ANOMALIES WIDGET (7 Cols) */}
          <div style={{
            gridColumn: 'span 7',
            backgroundColor: '#1A1D1F',
            border: '1px solid #2A2D30',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#FF3B3B" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F3EFE4', margin: 0 }}>
                  Active Anomalies
                </h3>
              </div>
              <button
                onClick={() => navigate('/intelligence/anomaly-detection')}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#FF9000',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {portfolio.anomalies.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedAnomaly(item)}
                  style={{
                    backgroundColor: '#111313',
                    border: '1px solid #2A2D30',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#FF9000')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2A2D30')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{
                      backgroundColor: item.severity === 'CRITICAL' ? '#FF3B3B22' : (item.severity === 'HIGH' ? '#FF900022' : '#FFD70022'),
                      color: item.severity === 'CRITICAL' ? '#FF3B3B' : (item.severity === 'HIGH' ? '#FF9000' : '#FFD700'),
                      border: `1px solid ${item.severity === 'CRITICAL' ? '#FF3B3B' : (item.severity === 'HIGH' ? '#FF9000' : '#FFD700')}`,
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {item.severity}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#F3EFE4' }}>
                        {item.assetName} <span style={{ color: '#B8B3A8', fontWeight: 400 }}>({item.id})</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '2px' }}>
                        {item.type} • Dev: <span style={{ color: '#FF3B3B', fontWeight: 600 }}>{item.deviation}%</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#B8B3A8' }}>{item.time}</span>
                    <ChevronRight size={16} color="#B8B3A8" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. QUICK NAVIGATION SECTION (5 Cols) */}
          <div style={{
            gridColumn: 'span 5',
            backgroundColor: '#1A1D1F',
            border: '1px solid #2A2D30',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F3EFE4', margin: 0 }}>
                Quick Workflows
              </h3>
              <p style={{ fontSize: '12px', color: '#B8B3A8', marginTop: '4px' }}>
                Launch high-priority operations & analytics
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => navigate('/assets/leaderboard')}
                style={{
                  backgroundColor: '#FF9000',
                  color: '#080909',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '14px 20px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 12px rgba(255, 144, 0, 0.2)',
                  transition: 'transform 0.15s ease'
                }}
              >
                View Asset Leaderboard <ArrowRight size={18} />
              </button>

              <button
                onClick={() => navigate('/scenarios/simulation')}
                style={{
                  backgroundColor: 'transparent',
                  color: '#FF9000',
                  border: '2px solid #FF9000',
                  borderRadius: '6px',
                  padding: '14px 20px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'background-color 0.15s ease'
                }}
              >
                Start Simulation <Zap size={18} />
              </button>
            </div>

            <div style={{
              backgroundColor: '#111313',
              padding: '12px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#B8B3A8',
              borderLeft: '3px solid #C7F700'
            }}>
              <span style={{ color: '#C7F700', fontWeight: 700 }}>AI RECOMMENDATION:</span> Run reservoir pressure optimization simulation on MH-07 to mitigate -14.2% deviation.
            </div>
          </div>
        </div>

      </div>
      </>
      )}

      {/* ANOMALY DETAIL MODAL */}
      {selectedAnomaly && (
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
          <div style={{
            backgroundColor: '#1A1D1F',
            border: '1px solid #FF3B3B',
            borderRadius: '10px',
            width: '450px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                backgroundColor: '#FF3B3B22',
                color: '#FF3B3B',
                padding: '4px 8px',
                borderRadius: '4px',
                fontWeight: 800,
                fontSize: '12px'
              }}>
                {selectedAnomaly.severity} ANOMALY
              </span>
              <button
                onClick={() => setSelectedAnomaly(null)}
                style={{ background: 'none', border: 'none', color: '#B8B3A8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#F3EFE4', marginTop: '12px' }}>
              {selectedAnomaly.assetName} ({selectedAnomaly.id})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '16px 0', fontSize: '13px', color: '#B8B3A8' }}>
              <div><strong>Category:</strong> {selectedAnomaly.category}</div>
              <div><strong>Telemetry Exception:</strong> {selectedAnomaly.type}</div>
              <div><strong>Deviation:</strong> <span style={{ color: '#FF3B3B', fontWeight: 700 }}>{selectedAnomaly.deviation}%</span></div>
              <div><strong>Detected:</strong> {selectedAnomaly.time}</div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setSelectedAnomaly(null);
                  navigate('/intelligence/anomaly-detection');
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#FF3B3B',
                  color: '#F3EFE4',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Investigate Anomaly
              </button>
              <button
                onClick={() => setSelectedAnomaly(null)}
                style={{
                  backgroundColor: '#2A2D30',
                  color: '#F3EFE4',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
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
