import React, { useState } from 'react';
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
  X
} from 'lucide-react';

// Mock Data for Asset MH-07
const mockAssetData = {
  id: 'MH-07',
  field: 'Mumbai High North',
  basin: 'Arabian Sea (Western Offshore)',
  lastUpdate: '2026-08-16 16:42:07',
  severity: 'CRITICAL',
  healthScore: 68,
  aipsScore: 92,
  currentProd: 1.17,
  expectedProd: 1.42,
  deviation: -17.4,
  declineRate: 2.3,
  recoveryPotential: 1.24,
  potentialProd: 1.35,
  upliftPct: 15.4,

  // 24 Months Historical Production
  historical24M: [
    { date: '2024-09', actual: 1.85 }, { date: '2024-10', actual: 1.82 },
    { date: '2024-11', actual: 1.80 }, { date: '2024-12', actual: 1.78 },
    { date: '2025-01', actual: 1.75 }, { date: '2025-02', actual: 1.72 },
    { date: '2025-03', actual: 1.70 }, { date: '2025-04', actual: 1.68 },
    { date: '2025-05', actual: 1.65 }, { date: '2025-06', actual: 1.62 },
    { date: '2025-07', actual: 1.58 }, { date: '2025-08', actual: 1.55 },
    { date: '2025-09', actual: 1.52 }, { date: '2025-10', actual: 1.48 },
    { date: '2025-11', actual: 1.45 }, { date: '2025-12', actual: 1.42 },
    { date: '2026-01', actual: 1.38 }, { date: '2026-02', actual: 1.35 },
    { date: '2026-03', actual: 1.28 }, { date: '2026-04', actual: 1.22 },
    { date: '2026-05', actual: 1.20 }, { date: '2026-06', actual: 1.19 },
    { date: '2026-07', actual: 1.18 }, { date: '2026-08', actual: 1.17 },
  ],

  // 12 Months Actual vs Expected (with Anomaly region)
  actualVsExpected12M: [
    { date: '2025-09', actual: 1.52, expected: 1.50 },
    { date: '2025-10', actual: 1.48, expected: 1.49 },
    { date: '2025-11', actual: 1.45, expected: 1.47 },
    { date: '2025-12', actual: 1.42, expected: 1.46 },
    { date: '2026-01', actual: 1.38, expected: 1.45 },
    { date: '2026-02', actual: 1.35, expected: 1.44 },
    { date: '2026-03', actual: 1.28, expected: 1.44 }, // Anomaly starts
    { date: '2026-04', actual: 1.22, expected: 1.43 },
    { date: '2026-05', actual: 1.20, expected: 1.43 },
    { date: '2026-06', actual: 1.19, expected: 1.42 },
    { date: '2026-07', actual: 1.18, expected: 1.42 },
    { date: '2026-08', actual: 1.17, expected: 1.42 },
  ],

  // 12M Back to 90D Forward Forecast
  forecastData: [
    { date: '2025-08', actual: 1.55, forecast: null, upper: null, lower: null },
    { date: '2025-11', actual: 1.45, forecast: null, upper: null, lower: null },
    { date: '2026-02', actual: 1.35, forecast: null, upper: null, lower: null },
    { date: '2026-05', actual: 1.20, forecast: null, upper: null, lower: null },
    { date: '2026-08 (NOW)', actual: 1.17, forecast: 1.17, upper: 1.17, lower: 1.17 },
    { date: '+30D', actual: null, forecast: 1.21, upper: 1.31, lower: 1.11 },
    { date: '+60D', actual: null, forecast: 1.23, upper: 1.35, lower: 1.12 },
    { date: '+90D', actual: null, forecast: 1.24, upper: 1.38, lower: 1.10 },
  ],

  // Health Score Trend (6 Months)
  healthTrend: [
    { month: 'Mar', score: 88 },
    { month: 'Apr', score: 82 },
    { month: 'May', score: 76 },
    { month: 'Jun', score: 74 },
    { month: 'Jul', score: 70 },
    { month: 'Aug', score: 68 },
  ],

  // SHAP Attribution Factors
  shapFactors: [
    { factor: 'Historical Decline Rate', pct: 43, impact: '-7.4%' },
    { factor: 'Operational Change (PT-104)', pct: 28, impact: '-4.8%' },
    { factor: 'Production Volatility', pct: 17, impact: '-2.9%' },
    { factor: 'Environmental & Other', pct: 12, impact: '-2.3%' },
  ],

  // Timeline Events
  events: [
    { date: '01-JAN-2024', status: 'NORMAL', label: 'Baseline Reservoir Inspection Completed', color: '#00D966' },
    { date: '15-FEB-2024', status: 'NORMAL', label: 'Routine Pressure Valve Calibration', color: '#00D966' },
    { date: '12-MAR-2024', status: 'DECLINE DETECTED', label: 'Decline Rate Exceeded 1.8%/mo Threshold', color: '#FF9000' },
    { date: '18-APR-2024', status: 'ANOMALY DETECTED', label: 'Pressure Sensor PT-104 Variance (-2.1 bar)', color: '#FF3B3B' },
    { date: '25-MAY-2024', status: 'HIGH DEVIATION', label: 'Production Deviation Crossed -15%', color: '#FF3B3B' },
    { date: '02-JUN-2024', status: 'PRIORITY RAISED', label: 'AIPS Score Escalated to 92 (CRITICAL)', color: '#FF3B3B' },
    { date: '14-JUL-2024', status: 'AI RECOMMENDATION', label: 'AI Generated Gas-Lift Optimization Plan', color: '#C7F700' },
    { date: '16-AUG-2026', status: 'ACTIVE INVESTIGATION', label: 'Field Ops Assigned to Intervention Schedule', color: '#FF9000' }
  ]
};

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const asset = {
    ...mockAssetData,
    id: id || mockAssetData.id
  };

  const [activeTab, setActiveTab] = useState<'production' | 'health' | 'ai'>('production');
  const [modalAction, setModalAction] = useState<string | null>(null);

  return (
    <div style={{ backgroundColor: '#080909', minHeight: '100vh', color: '#F3EFE4', padding: '24px 32px', paddingBottom: '90px' }}>
      
      {/* BREADCRUMB & BACK BUTTON */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#B8B3A8' }}>
          <Link to="/leaderboard" style={{ color: '#FF9000', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to Leaderboard
          </Link>
          <span>/</span>
          <span>Assets</span>
          <span>/</span>
          <span style={{ color: '#F3EFE4', fontWeight: 700 }}>{asset.id}</span>
        </div>

        <div style={{ fontSize: '11px', color: '#B8B3A8' }}>
          Asset ID: <strong style={{ color: '#FF9000' }}>{asset.id}</strong> | Field Ops Assigned
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
      <div style={{
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Charts Grid */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
            
            {/* a) SHAP Contribution Horizontal Bar Chart */}
            <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3EFE4', margin: 0 }}>Production Deviation Attribution (SHAP Values)</h3>
                  <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Feature Contributions to -17.4% Loss</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {asset.shapFactors.map((item, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: '#F3EFE4', fontWeight: 600 }}>{item.factor}</span>
                      <span style={{ color: '#FF9000', fontWeight: 800 }}>{item.impact} ({item.pct}%)</span>
                    </div>
                    <div style={{ backgroundColor: '#111313', borderRadius: '4px', height: '10px', width: '100%', overflow: 'hidden' }}>
                      <div style={{ width: `${item.pct}%`, backgroundColor: '#FF9000', height: '100%', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* b) Recovery Potential Card */}
            <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #00D96644', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3EFE4', margin: 0 }}>Estimated Recovery Potential</h3>
                  <span style={{ backgroundColor: '#00D96622', color: '#00D966', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                    AI CONFIDENCE: 87%
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '24px', margin: '20px 0' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#B8B3A8' }}>CURRENT PROD</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#FF3B3B' }}>{asset.currentProd} MMBL</div>
                  </div>
                  <div style={{ fontSize: '24px', color: '#B8B3A8', display: 'flex', alignItems: 'center' }}>→</div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#B8B3A8' }}>POTENTIAL PROD</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#00D966' }}>{asset.potentialProd} MMBL</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#B8B3A8' }}>NET UPLIFT</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#C7F700' }}>+{asset.recoveryPotential} MMBL</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ fontSize: '11px', color: '#B8B3A8', marginBottom: '4px' }}>Optimization Gap: +15.4% Production Uplift</div>
                  <div style={{ backgroundColor: '#111313', borderRadius: '6px', height: '14px', width: '100%', display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: '85%', backgroundColor: '#FF9000', height: '100%' }}></div>
                    <div style={{ width: '15%', backgroundColor: '#00D966', height: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* c) AIPS Breakdown Card with Equation */}
          <div style={{ backgroundColor: '#1A1D1F', border: '1px solid #FF3B3B44', borderRadius: '8px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F3EFE4', margin: 0 }}>AIPS Score Component Breakdown</h3>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Mathematical Equation & Weighting Formula</span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#FF3B3B' }}>
                AIPS = 92
              </div>
            </div>

            <div style={{ backgroundColor: '#111313', padding: '12px 16px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', color: '#C7F700', marginBottom: '20px' }}>
              AIPS = (0.30 × LossWeight) + (0.25 × AnomalySev) + (0.35 × RecoveryPot) + (0.10 × Complexity)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '12px' }}>
              <div style={{ backgroundColor: '#111313', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #FF3B3B' }}>
                <div style={{ color: '#B8B3A8' }}>Production Loss Weight (30%)</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#F3EFE4', marginTop: '4px' }}>-17.4% → 5.2 pts</div>
              </div>

              <div style={{ backgroundColor: '#111313', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #FF9000' }}>
                <div style={{ color: '#B8B3A8' }}>Anomaly Severity (25%)</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#F3EFE4', marginTop: '4px' }}>Score 0.94 → 4.7 pts</div>
              </div>

              <div style={{ backgroundColor: '#111313', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #C7F700' }}>
                <div style={{ color: '#B8B3A8' }}>Recovery Potential (35%)</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#F3EFE4', marginTop: '4px' }}>1.24 MMBL → 4.3 pts</div>
              </div>

              <div style={{ backgroundColor: '#111313', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #00D966' }}>
                <div style={{ color: '#B8B3A8' }}>Complexity Weight (10%)</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#F3EFE4', marginTop: '4px' }}>Score 0.60 → 0.6 pts</div>
              </div>
            </div>
          </div>

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
          {asset.events.map((ev, idx) => (
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
                  {ev.status}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#F3EFE4' }}>{ev.label}</span>
              </div>
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
                ? `Dispatch telemetry diagnostic task force for asset ${asset.id} (Pressure sensor PT-104 inspection).`
                : (modalAction === 'simulate' ? `Initiate reservoir gas-lift simulation model targeting +0.18 MMBL recovery.` : `Asset ${asset.id} will be pinned to high-priority alert stream.`)}
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

    </div>
  );
};
