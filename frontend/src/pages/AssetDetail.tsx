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
import { calculateAIPS } from '../utils/aipsCalculator';
import { assetsApi } from '../api/assets';
import { forecastApi } from '../api/forecast';
import { aipsApi } from '../api/aips';
import { shapApi } from '../api/shap';
import type { AssetResponse, ForecastResponse, AIPSScoreResponse, SHAPExplanationResponse } from '../api/types';

// Mock asset data for fallback
const mockAssetData = {
  id: 'MH-07',
  name: 'Mumbai High North-7',
  field: 'Mumbai High',
  basin: 'Mumbai Offshore',
  currentProd: 1.17,
  expectedProd: 1.42,
  deviation: -17.4,
  declineRate: 2.3,
  recoveryPotential: 1.24,
  anomalyScore: 0.94,
  status: 'ACTIVE',
  onstreamYear: 1987,
  baselineQI: 12500,
  baselineDI: 0.032,
  baselineB: 1.2,
  operatingCostUsdM: 1.2,
  interventionCostUsdM: 2.1,
};

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const [asset, setAsset] = useState<AssetResponse | null>(null);
  const [forecast30, setForecast30] = useState<ForecastResponse | null>(null);
  const [forecast90, setForecast90] = useState<ForecastResponse | null>(null);
  const [forecast180, setForecast180] = useState<ForecastResponse | null>(null);
  const [aipsScore, setAipsScore] = useState<AIPSScoreResponse | null>(null);
  const [shapExplanation, setShapExplanation] = useState<SHAPExplanationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'production' | 'health' | 'ai'>('production');
  const [modalAction, setModalAction] = useState<string | null>(null);

  const loadAssetData = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    try {
      // Load asset details
      const assetData = await assetsApi.get(id);
      setAsset(assetData);

      // Load forecasts for different horizons
      const [f30, f90, f180] = await Promise.all([
        forecastApi.get(id, 30),
        forecastApi.get(id, 90),
        forecastApi.get(id, 180),
      ]);
      setForecast30(f30);
      setForecast90(f90);
      setForecast180(f180);

      // Load AIPS score
      const aipsData = await aipsApi.getScore(id);
      setAipsScore(aipsData);

      // Load SHAP explanation
      const shapData = await shapApi.getExplanation(id);
      setShapExplanation(shapData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load asset data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssetData();
  }, [id]);

  // Fallback to mock data if API fails
  const displayAsset = asset ? {
    id: asset.id,
    name: asset.name,
    field: asset.field,
    basin: asset.basin,
    currentProd: asset.baseline_qi / 10000,
    expectedProd: asset.baseline_qi * 1.1 / 10000,
    deviation: -10,
    declineRate: asset.baseline_di * 100,
    recoveryPotential: asset.baseline_qi * 0.1 / 10000,
    anomalyScore: 0.5,
    status: asset.status,
    onstreamYear: asset.onstream_year,
    baselineQI: asset.baseline_qi,
    baselineDI: asset.baseline_di,
    baselineB: asset.baseline_b,
    operatingCostUsdM: asset.operating_cost_usd_m,
    interventionCostUsdM: asset.intervention_cost_usd_m,
  } : mockAssetData;

  // Corrected AIPS calculation (single source of truth)
  const aipsResult = calculateAIPS({
    asset_id: displayAsset.id,
    expected_production: displayAsset.expectedProd,
    actual_production: displayAsset.currentProd,
    anomaly_score: 0.94,
    historical_recovery_rate: 0.80,
    intervention_complexity: 0.60,
  });

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
      {!loading && !error && (
      <>
      {/* BREADCRUMB & BACK BUTTON */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#B8B3A8' }}>
          <Link to="/leaderboard" style={{ color: '#FF9000', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to Leaderboard
          </Link>
          <span>/</span>
          <span>Assets</span>
          <span>/</span>
          <span style={{ color: '#F3EFE4', fontWeight: 700 }}>{displayAsset.id}</span>
        </div>

        <div style={{ fontSize: '11px', color: '#B8B3A8' }}>
          Asset ID: <strong style={{ color: '#FF9000' }}>{displayAsset.id}</strong> | Field Ops Assigned
        </div>
      </div>

      {/* 1. ASSET HEADER CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #1A1D1F 0%, #111313 100%)',
        border: '1px solid #FF3B3B44',
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
            backgroundColor: '#FF3B3B22',
            border: '2px solid #FF3B3B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FF3B3B',
            fontWeight: 900,
            fontSize: '20px'
          }}>
            {asset.id.split('-')[0]}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#F3EFE4', margin: 0, letterSpacing: '-1px' }}>
                {asset.id}
              </h1>
              <span style={{
                backgroundColor: '#FF3B3B22',
                color: '#FF3B3B',
                border: '1px solid #FF3B3B',
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '12px',
                letterSpacing: '0.05em'
              }}>
                ● {asset.severity} PRIORITY
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#B8B3A8', marginTop: '4px' }}>
              {asset.field} • <span style={{ color: '#F3EFE4' }}>{asset.basin}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#B8B3A8', fontWeight: 700, textTransform: 'uppercase' }}>LAST TELEMETRY UPDATE</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#F3EFE4', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="#00D966" /> {asset.lastUpdate}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#B8B3A8', fontWeight: 700, textTransform: 'uppercase' }}>AIPS PRIORITY SCORE</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#FF3B3B', lineHeight: 1 }}>
              {asset.aipsScore} <span style={{ fontSize: '12px', color: '#B8B3A8' }}>/ 100</span>
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
                  <span style={{ fontSize: '11px', color: '#B8B3A8' }}>24-Month Trajectory (MMBL)</span>
                </div>
                <span style={{ fontSize: '11px', color: '#FF9000', fontWeight: 700 }}>● Actual Prod</span>
              </div>
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={asset.historical24M} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF9000" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FF9000" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" />
                    <XAxis dataKey="date" stroke="#B8B3A8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#B8B3A8" fontSize={10} domain={[1.0, 2.0]} tickLine={false} />
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
                  <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Last 12 Months with Anomaly Region</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                  <span style={{ color: '#FF9000', fontWeight: 700 }}>● Actual</span>
                  <span style={{ color: '#B8B3A8', fontWeight: 700 }}>-- Expected</span>
                </div>
              </div>
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={asset.actualVsExpected12M} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" />
                    <XAxis dataKey="date" stroke="#B8B3A8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#B8B3A8" fontSize={10} domain={[1.0, 1.6]} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111313', borderColor: '#2A2D30', color: '#F3EFE4' }} />
                    {/* Anomaly highlight window */}
                    <ReferenceArea x1="2026-03" x2="2026-08" fill="#FF3B3B" fillOpacity={0.2} stroke="#FF3B3B" strokeDasharray="3 3" />
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
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3EFE4', margin: 0 }}>Production Forecast (90D Horizon)</h3>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>AI Predictive Model with 90% Confidence Interval</span>
              </div>
              <span style={{ backgroundColor: '#C7F70022', color: '#C7F700', border: '1px solid #C7F700', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                AI MODEL ACCURACY: 94.2%
              </span>
            </div>
            <div style={{ width: '100%', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={asset.forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" />
                  <XAxis dataKey="date" stroke="#B8B3A8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#B8B3A8" fontSize={10} domain={[0.9, 1.6]} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111313', borderColor: '#2A2D30', color: '#F3EFE4' }} />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="#C7F700" fillOpacity={0.25} />
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
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#F3EFE4', marginTop: '4px' }}>1.17 MMBL</div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '12px 16px', borderRadius: '6px', border: '1px solid #2A2D30' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Expected Production</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#B8B3A8', marginTop: '4px' }}>1.42 MMBL</div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '12px 16px', borderRadius: '6px', border: '1px solid #FF3B3B44' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Deviation</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#FF3B3B', marginTop: '4px' }}>-0.25 MMBL (-17.4%)</div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '12px 16px', borderRadius: '6px', border: '1px solid #2A2D30' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Forecast (30D)</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#C7F700', marginTop: '4px' }}>1.21 MMBL</div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '12px 16px', borderRadius: '6px', border: '1px solid #2A2D30' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Forecast (90D)</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#C7F700', marginTop: '4px' }}>1.24 MMBL</div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '12px 16px', borderRadius: '6px', border: '1px solid #2A2D30' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Decline Rate</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#FF9000', marginTop: '4px' }}>2.3% / month</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: ASSET HEALTH & STATUS */}
      {activeTab === 'health' && (
        <div id="panel-health" role="tabpanel" aria-label="Asset Health & Status" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            {/* a) Health Score Gauge */}
            <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3EFE4', marginBottom: '16px' }}>Asset Health Score</h3>
              
              <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="160" height="160" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="#2A2D30" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#FF9000"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="264"
                    strokeDashoffset={264 * (1 - asset.healthScore / 100)}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 900, color: '#FF9000', lineHeight: 1 }}>{asset.healthScore}%</div>
                  <div style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '4px' }}>MODERATE RISK</div>
                </div>
              </div>
            </div>

            {/* b) 2x2 Status Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #FF3B3B44', borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>ANOMALY STATUS</span>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ backgroundColor: '#FF3B3B22', color: '#FF3B3B', border: '1px solid #FF3B3B', padding: '4px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '12px' }}>
                    CRITICAL
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>PRODUCTION STATUS</span>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ backgroundColor: '#FF900022', color: '#FF9000', border: '1px solid #FF9000', padding: '4px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '12px' }}>
                    DECLINING
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>OPERATIONAL STATUS</span>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ backgroundColor: '#00D96622', color: '#00D966', border: '1px solid #00D966', padding: '4px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '12px' }}>
                    ACTIVE
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>LAST ALERT</span>
                <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: 800, color: '#FF9000' }}>
                  2h ago
                </div>
              </div>
            </div>

            {/* c) Health Trend Chart */}
            <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3EFE4', marginBottom: '12px' }}>Health Score Trend (6M)</h3>
              <div style={{ width: '100%', height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={asset.healthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" />
                    <XAxis dataKey="month" stroke="#B8B3A8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#B8B3A8" fontSize={10} domain={[50, 100]} tickLine={false} />
                    <Area type="monotone" dataKey="score" stroke="#FF9000" fill="#FF9000" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* d) Active Issues */}
          <div style={{ backgroundColor: '#111313', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3EFE4', marginBottom: '14px' }}>Active Issues & Anomalies</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                onClick={() => setActiveTab('ai')}
                style={{ backgroundColor: '#1A1D1F', border: '1px solid #FF3B3B44', borderRadius: '6px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ backgroundColor: '#FF3B3B22', color: '#FF3B3B', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>HIGH</span>
                  <span style={{ fontWeight: 700, color: '#F3EFE4' }}>Production Deviation (-17.4% below target baseline)</span>
                </div>
                <ChevronRight size={16} color="#B8B3A8" />
              </div>

              <div
                onClick={() => setActiveTab('ai')}
                style={{ backgroundColor: '#1A1D1F', border: '1px solid #FF900044', borderRadius: '6px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ backgroundColor: '#FF900022', color: '#FF9000', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>HIGH</span>
                  <span style={{ fontWeight: 700, color: '#F3EFE4' }}>Pressure Drop Detected (PT-104 sensor variance -2.1 bar)</span>
                </div>
                <ChevronRight size={16} color="#B8B3A8" />
              </div>

              <div
                onClick={() => setActiveTab('ai')}
                style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '6px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ backgroundColor: '#FFD70022', color: '#FFD700', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>MEDIUM</span>
                  <span style={{ fontWeight: 700, color: '#F3EFE4' }}>Decline Rate Accelerating (2.3%/mo vs 1.8%/mo field average)</span>
                </div>
                <ChevronRight size={16} color="#B8B3A8" />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: EXPLAINABLE AI INSIGHTS */}
      {activeTab === 'ai' && (
        <div id="panel-ai" role="tabpanel" aria-label="Explainable AI Insights" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
            
            <SHAPExplanationCard
              asset_id={asset.id}
              production_deviation_percent={asset.deviation}
              top_features={asset.shapFactors.map(f => ({
                feature_name: f.factor,
                contribution_percent: f.pct,
                value: f.pct,
                baseline_value: 0,
              }))}
              model_type="Isolation Forest"
              model_confidence={0.87}
            />

            {/* b) Recovery Opportunity Card (Estimated, with confidence breakdown) */}
            <RecoveryOpportunityCard
              asset_id={asset.id}
              expected_production={asset.expectedProd}
              actual_production={asset.currentProd}
              historical_recovery_rate={0.80}
              model_confidence={0.90}
              combined_confidence={0.85}
              anomaly_score={0.94}
            />
          </div>

          {/* c) Corrected AIPS Breakdown (formula, components, confidence) */}
          <AIPSBreakdown
            aips_score={aipsResult.aips_score}
            priority={aipsResult.priority}
            loss_magnitude={aipsResult.loss_magnitude}
            anomaly_severity={aipsResult.anomaly_severity}
            recovery_opportunity={aipsResult.recovery_opportunity}
            intervention_complexity={aipsResult.intervention_complexity}
            confidence={aipsResult.confidence}
          />

          {/* d) Model Confidence Grid */}
          <div style={{ backgroundColor: '#111313', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#F3EFE4', marginBottom: '14px' }}>Model Confidence & Validation Scores</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: '#1A1D1F', padding: '14px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#B8B3A8' }}>Forecast Confidence</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#C7F700', marginTop: '4px' }}>87%</div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '14px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#B8B3A8' }}>Anomaly Detection Confidence</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#C7F700', marginTop: '4px' }}>94%</div>
              </div>
              <div style={{ backgroundColor: '#1A1D1F', padding: '14px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#B8B3A8' }}>Attribution Confidence</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#C7F700', marginTop: '4px' }}>82%</div>
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
          {[
            { date: '2026-08-15', title: 'Anomaly Detected', description: 'Production deviation of -17.4% detected', color: '#FF3B3B' },
            { date: '2026-08-10', title: 'Pressure Alert', description: 'Pressure sensor PT-104 reading below threshold', color: '#FF9000' },
            { date: '2026-08-05', title: 'Routine Maintenance', description: 'Scheduled maintenance completed successfully', color: '#00D966' },
          ].map((ev: { date: string; title: string; description: string; color: string }, idx: number) => (
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
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#B8B3A8', fontFamily: 'monospace' }}>{ev.date}</span>
                <span style={{
                  backgroundColor: `${ev.color}22`,
                  color: ev.color,
                  border: `1px solid ${ev.color}44`,
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {ev.date}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#F3EFE4' }}>{ev.title}</span>
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
          Asset <strong style={{ color: '#F3EFE4' }}>{asset.id}</strong> Intervention Workflow
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
                ? `Dispatch telemetry diagnostic task force for asset ${displayAsset.id} (Pressure sensor PT-104 inspection).`
                : (modalAction === 'simulate' ? `Initiate reservoir gas-lift simulation model targeting +0.18 MMBL recovery.` : `Asset ${displayAsset.id} will be pinned to high-priority alert stream.`)}
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
