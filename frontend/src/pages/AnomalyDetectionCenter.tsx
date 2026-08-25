import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea
} from 'recharts';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  AlertTriangle,
  ChevronRight,
  X,
  Loader2
} from 'lucide-react';
import { DataTransparencyBanner } from '../components/DataTransparencyBanner';
import { anomalyApi } from '../api/anomaly';

export interface AnomalyItem {
  id: string;
  assetId: string;
  field: string;
  basin: string;
  severity: 'CRITICAL' | 'HIGH' | 'WATCH' | 'NORMAL';
  status: 'UNACKNOWLEDGED' | 'INVESTIGATING' | 'ACKNOWLEDGED' | 'MONITORING' | 'RESOLVED';
  deviation: number;
  absDeviation: string;
  expected: number;
  actual: number;
  aiScore: number;
  detectionMethod: string;
  detectedAt: string;
  detectedRelative: string;
  duration: string;
  description: string;
  rootCauses: { title: string; desc: string; impact: string }[];
  recoveryPotential: string;
  recommendedAction: string;
  historyChart: { time: string; actual: number; expected: number }[];
  timeline: { time: string; text: string; active?: boolean }[];
  correlatedAssets: { id: string; x: number; y: number; active?: boolean }[];
}

const mockAnomaliesList: AnomalyItem[] = [
  {
    id: 'AN-8842',
    assetId: 'AD-8842',
    field: 'Bombay High North',
    basin: 'Mumbai Offshore',
    severity: 'CRITICAL',
    status: 'UNACKNOWLEDGED',
    deviation: -14.2,
    absDeviation: '-2,098 bbl/d',
    expected: 15500,
    actual: 12402,
    aiScore: 94,
    detectionMethod: 'Isolation Forest + Autoencoder',
    detectedAt: '2026-08-16 16:42:07',
    detectedRelative: 'T-02:14:44',
    duration: '2h 14m',
    description: 'Sudden pressure deviation detected in Zone B manifold. Statistical confidence interval exceeded by 3σ over a 45-minute trailing window.',
    rootCauses: [
      {
        title: 'Pressure Drop at Manifold B',
        desc: 'Sudden decrease of 450 PSI detected at sensor PT-4092. Pattern matches historical cavitation events in similar pump configurations.',
        impact: '-45%'
      },
      {
        title: 'Upstream Flow Instability',
        desc: 'Flow meter FM-11a showing erratic readings 12 minutes prior to pressure drop. Possible multi-phase slugging.',
        impact: '-30%'
      }
    ],
    recoveryPotential: '+8.4% (+1,250 bbl/d)',
    recommendedAction: 'Dispatch diagnostic crew to inspect pressure sensor PT-4092 & recalibrate subsea choke valve position.',
    historyChart: [
      { time: 'T-30', actual: 15500, expected: 15500 },
      { time: 'T-25', actual: 15480, expected: 15500 },
      { time: 'T-20', actual: 15450, expected: 15500 },
      { time: 'T-15', actual: 15200, expected: 15500 },
      { time: 'T-10', actual: 14100, expected: 15500 },
      { time: 'T-5', actual: 12900, expected: 15500 },
      { time: 'NOW', actual: 12402, expected: 15500 },
    ],
    timeline: [
      { time: 'NOW', text: 'Awaiting operator acknowledgment', active: true },
      { time: 'T-00:45:00', text: 'Deviation threshold crossed (3σ)' },
      { time: 'T-01:12:30', text: 'Initial anomaly signature detected by AI' },
    ],
    correlatedAssets: [
      { id: '102', x: 20, y: 40 },
      { id: 'AD-8842', x: 50, y: 60, active: true },
      { id: 'WX-114', x: 25, y: 75 },
      { id: '23-B', x: 80, y: 70 },
      { id: 'AD-6642', x: 75, y: 35 },
    ]
  },
  {
    id: 'AN-7109',
    assetId: 'AD-7109',
    field: 'Ravva Platform Alpha',
    basin: 'Krishna-Godavari',
    severity: 'HIGH',
    status: 'INVESTIGATING',
    deviation: -8.7,
    absDeviation: '-778 bbl/d',
    expected: 8950,
    actual: 8172,
    aiScore: 78,
    detectionMethod: 'Prophet Time Series',
    detectedAt: '2026-08-16 15:10:12',
    detectedRelative: 'T-03:42:11',
    duration: '3h 42m',
    description: 'Thermal expansion variance detected on gas compressor intake manifold Node 4.',
    rootCauses: [
      {
        title: 'Thermal Sensor Spike ST-09',
        desc: 'Intake manifold temperature increased by +22°C above baseline limits.',
        impact: '-28%'
      }
    ],
    recoveryPotential: '+4.1% (+360 bbl/d)',
    recommendedAction: 'Inspect cooling loop fan speed and replace intake thermal sensor ST-09.',
    historyChart: [
      { time: 'T-30', actual: 8950, expected: 8950 },
      { time: 'T-20', actual: 8900, expected: 8950 },
      { time: 'T-10', actual: 8500, expected: 8950 },
      { time: 'NOW', actual: 8172, expected: 8950 },
    ],
    timeline: [
      { time: 'NOW', text: 'Field technician assigned to diagnostic sweep', active: true },
      { time: 'T-01:30:00', text: 'Status updated to INVESTIGATING' },
    ],
    correlatedAssets: [
      { id: 'KG-101', x: 30, y: 30 },
      { id: 'AD-7109', x: 55, y: 55, active: true },
    ]
  },
  {
    id: 'AN-6621',
    assetId: 'AD-6621',
    field: 'Ankleshwar Sector 4',
    basin: 'Cambay Basin',
    severity: 'HIGH',
    status: 'ACKNOWLEDGED',
    deviation: 6.1,
    absDeviation: '+256 bbl/d',
    expected: 4200,
    actual: 4456,
    aiScore: 72,
    detectionMethod: 'Isolation Forest',
    detectedAt: '2026-08-16 14:00:00',
    detectedRelative: 'T-04:12:00',
    duration: '4h 12m',
    description: 'Positive flow rate surge detected following wellhead valve adjustment.',
    rootCauses: [
      {
        title: 'Positive Yield Surge',
        desc: 'Unscheduled pressure equalization across sector 4 bypass line.',
        impact: '+18%'
      }
    ],
    recoveryPotential: 'Optimized Yield',
    recommendedAction: 'Verify choke valve integrity and record new baseline flow rate.',
    historyChart: [
      { time: 'T-30', actual: 4200, expected: 4200 },
      { time: 'T-15', actual: 4300, expected: 4200 },
      { time: 'NOW', actual: 4456, expected: 4200 },
    ],
    timeline: [
      { time: 'NOW', text: 'Acknowledged by Control Room Lead', active: true },
    ],
    correlatedAssets: [
      { id: 'AD-6621', x: 50, y: 50, active: true }
    ]
  },
  {
    id: 'AN-9920',
    assetId: 'AD-9920',
    field: 'Mangala Field',
    basin: 'Rajasthan Basin',
    severity: 'WATCH',
    status: 'MONITORING',
    deviation: -2.1,
    absDeviation: '-464 bbl/d',
    expected: 22100,
    actual: 21636,
    aiScore: 45,
    detectionMethod: 'Statistical Moving Average',
    detectedAt: '2026-08-16 06:00:00',
    detectedRelative: 'T-12:00:00',
    duration: '12h 00m',
    description: 'Minor flow rate fluctuation within expected natural variance threshold.',
    rootCauses: [
      {
        title: 'Background Noise Variance',
        desc: 'Minor fluid viscosity shift under normal seasonal temperature swing.',
        impact: '-5%'
      }
    ],
    recoveryPotential: 'Normal Operational Limits',
    recommendedAction: 'No immediate field action required. Continue automated background logging.',
    historyChart: [
      { time: 'T-30', actual: 22100, expected: 22100 },
      { time: 'NOW', actual: 21636, expected: 22100 },
    ],
    timeline: [
      { time: 'NOW', text: 'Automated monitoring active', active: true }
    ],
    correlatedAssets: [
      { id: 'AD-9920', x: 50, y: 50, active: true }
    ]
  }
];

export const AnomalyDetectionCenter: React.FC = () => {
  const navigate = useNavigate();
  const [anomaliesList, setAnomaliesList] = useState<AnomalyItem[]>(mockAnomaliesList);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('AD-8842');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load anomalies on mount (backend /anomaly/active is the source of truth)
  const loadAnomalies = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await anomalyApi.getActive(100);
      const rows = result?.rows ?? [];

      // Convert API anomalies to AnomalyItem format
      const convertedAnomalies: AnomalyItem[] = rows.map((a, idx) => {
        const detectedAt = a.detectedAt ?? new Date().toISOString();
        return {
          id: `${a.assetId}-${idx}`,
          assetId: a.assetId,
          field: a.field || 'Unknown',
          basin: a.basin || 'Unknown',
          severity: a.severity as 'CRITICAL' | 'HIGH' | 'WATCH' | 'NORMAL',
          status: 'UNACKNOWLEDGED' as const,
          deviation: a.deviationPct,
          absDeviation: `${a.deviationPct > 0 ? '+' : ''}${Math.round(a.deviationPct)}%`,
          expected: a.expectedBblD ?? 0,
          actual: a.actualBblD ?? 0,
          aiScore: Math.round(a.anomalyScore * 100),
          detectionMethod: 'AI Model',
          detectedAt,
          detectedRelative: 'T-00:00:00',
          duration: 'Active',
          description: `Anomaly detected with ${a.contributingFeatures.length} contributing features`,
          rootCauses: a.contributingFeatures.slice(0, 2).map(f => ({
            title: f.label ?? String(f.feature ?? 'Feature'),
            desc: `Model importance: ${Number(f.importance).toFixed(2)}`,
            impact: `${Math.round(Number(f.importance) * 100)}%`
          })),
          recoveryPotential: 'TBD',
          recommendedAction: 'Investigate contributing features',
          historyChart: [
            { time: 'T-30', actual: a.expectedBblD ?? 0, expected: a.expectedBblD ?? 0 },
            { time: 'NOW', actual: a.actualBblD ?? 0, expected: a.expectedBblD ?? 0 },
          ],
          timeline: [
            { time: 'NOW', text: 'Awaiting acknowledgment', active: true },
          ],
          correlatedAssets: [
            { id: a.assetId, x: 50, y: 50, active: true }
          ]
        };
      });

      setAnomaliesList(convertedAnomalies.length > 0 ? convertedAnomalies : mockAnomaliesList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load anomalies');
      // Keep mock data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, []);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<'SEVERITY' | 'TIME' | 'SCORE'>('SEVERITY');

  // Get currently active selected asset
  const currentAsset = useMemo(() => {
    return anomaliesList.find(a => a.assetId === selectedAssetId) || anomaliesList[0];
  }, [anomaliesList, selectedAssetId]);

  // Filtered asset list
  const filteredList = useMemo(() => {
    return anomaliesList.filter(item => {
      const matchSearch =
        item.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.basin.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (selectedSeverity !== 'ALL' && item.severity !== selectedSeverity) return false;
      if (selectedStatusFilter !== 'ALL' && item.status !== selectedStatusFilter) return false;

      return true;
    }).sort((a, b) => {
      if (sortOption === 'SEVERITY' || sortOption === 'SCORE') {
        return b.aiScore - a.aiScore;
      }
      return a.id.localeCompare(b.id);
    });
  }, [anomaliesList, searchTerm, selectedSeverity, selectedStatusFilter, sortOption]);

  // Action Handlers
  const handleAcknowledge = (assetId: string) => {
    setAnomaliesList(prev => prev.map(item => item.assetId === assetId ? { ...item, status: 'ACKNOWLEDGED' } : item));
  };

  const handleEscalate = (assetId: string) => {
    setAnomaliesList(prev => prev.map(item => item.assetId === assetId ? { ...item, status: 'INVESTIGATING' } : item));
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return { bg: '#FF3B3B22', border: '#FF3B3B', text: '#FF3B3B' };
      case 'HIGH': return { bg: '#FF900022', border: '#FF9000', text: '#FF9000' };
      case 'WATCH': default: return { bg: '#FFD70022', border: '#FFD700', text: '#FFD700' };
    }
  };

  const exportCSV = () => {
    const headers = 'Asset ID,Field,Basin,Severity,Status,Dev %,AI Score,Detected At\n';
    const rows = filteredList.map(a =>
      `${a.assetId},"${a.field}","${a.basin}",${a.severity},${a.status},${a.deviation}%,${a.aiScore},${a.detectedAt}`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PetroPulse_Anomalies_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div style={{ backgroundColor: '#080909', minHeight: '100vh', color: '#F3EFE4', padding: '24px 32px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
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
            onClick={loadAnomalies}
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
          <div style={{ color: '#B8B3A8', fontSize: '14px' }}>Loading anomaly data...</div>
        </div>
      )}

      {/* MAIN CONTENT */}
      {!loading && !error && (
      <>
      {/* DATA TRANSPARENCY BANNER */}
      <div style={{ marginBottom: '24px' }}>
        <DataTransparencyBanner context="anomaly" isDismissible />
      </div>

      {/* 1. PAGE HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#F3EFE4', margin: 0, letterSpacing: '-0.8px', fontFamily: 'sans-serif' }}>
            Anomaly Detection Center
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF3B3B', boxShadow: '0 0 10px #FF3B3B' }}></span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#FF3B3B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              14 ACTIVE ANOMALIES DETECTED
            </span>
          </div>
        </div>

        {/* Top Right Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#111313',
            border: '1px solid #2A2D30',
            borderRadius: '6px',
            padding: '8px 12px',
            gap: '8px',
            width: '240px'
          }}>
            <Search size={14} color="#B8B3A8" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by ID, Basin..."
              aria-label="Filter anomalies by ID or basin"
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#F3EFE4', fontSize: '12px', width: '100%' }}
            />
            {searchTerm && <X size={12} color="#B8B3A8" style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />}
          </div>

          {/* Status Filter Toggle */}
          <button
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'UNACKNOWLEDGED' ? 'ALL' : 'UNACKNOWLEDGED')}
            style={{
              backgroundColor: selectedStatusFilter === 'UNACKNOWLEDGED' ? '#FF3B3B22' : '#111313',
              color: selectedStatusFilter === 'UNACKNOWLEDGED' ? '#FF3B3B' : '#F3EFE4',
              border: `1px solid ${selectedStatusFilter === 'UNACKNOWLEDGED' ? '#FF3B3B' : '#2A2D30'}`,
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {selectedStatusFilter === 'UNACKNOWLEDGED' ? 'UNACKNOWLEDGED ONLY' : 'ALL STATUS'}
          </button>

          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
            style={{
              backgroundColor: selectedSeverity === 'CRITICAL' ? '#FF3B3B22' : '#111313',
              color: selectedSeverity === 'CRITICAL' ? '#FF3B3B' : '#F3EFE4',
              border: `1px solid ${selectedSeverity === 'CRITICAL' ? '#FF3B3B' : '#2A2D30'}`,
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.05em'
            }}
          >
            <Filter size={14} /> FILTER
          </button>

          <button
            onClick={() => setSortOption(sortOption === 'SEVERITY' ? 'SCORE' : 'SEVERITY')}
            style={{
              backgroundColor: '#111313',
              color: '#F3EFE4',
              border: '1px solid #2A2D30',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.05em'
            }}
          >
            <ArrowUpDown size={14} /> SORT: {sortOption}
          </button>

          <button
            onClick={exportCSV}
            style={{
              backgroundColor: '#111313',
              color: '#00D966',
              border: '1px solid #2A2D30',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} /> EXPORT
          </button>
        </div>
      </div>

      {/* 2. MASTER-DETAIL DUAL PANEL GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: ASSET ANOMALY LIST SELECTOR (5 COLS = ~40%) */}
        <div style={{
          gridColumn: 'span 5',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {filteredList.map((item) => {
            const isSelected = selectedAssetId === item.assetId;
            const badge = getSeverityBadgeColor(item.severity);

            return (
              <div
                key={item.assetId}
                onClick={() => setSelectedAssetId(item.assetId)}
                style={{
                  backgroundColor: isSelected ? '#1A1D1F' : '#111313',
                  border: isSelected ? `2px solid ${badge.border}` : '1px solid #2A2D30',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = '#444';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = '#2A2D30';
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#F3EFE4', letterSpacing: '-0.5px' }}>
                    {item.assetId}
                  </div>
                  <span style={{
                    backgroundColor: badge.bg,
                    color: badge.text,
                    border: `1px solid ${badge.border}`,
                    fontSize: '10px',
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.05em'
                  }}>
                    ● {item.severity}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#B8B3A8', fontWeight: 700 }}>DEV. %</div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: 900,
                      color: item.deviation < 0 ? '#FF3B3B' : '#00D966',
                      marginTop: '2px'
                    }}>
                      {item.deviation > 0 ? `+${item.deviation}%` : `${item.deviation}%`}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#B8B3A8', fontWeight: 700 }}>AI SCORE</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#F3EFE4', marginTop: '2px' }}>
                      {item.aiScore}<span style={{ fontSize: '12px', color: '#B8B3A8' }}>/100</span>
                    </div>
                  </div>
                </div>

                {/* Footer Timestamp & Status Tag */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #1A1D1F', fontSize: '10px', color: '#B8B3A8' }}>
                  <span>{item.detectedRelative}</span>
                  <span style={{
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    color: item.status === 'UNACKNOWLEDGED' ? '#FF3B3B' : (item.status === 'INVESTIGATING' ? '#FF9000' : '#00D966')
                  }}>
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: SELECTED ASSET DIAGNOSTIC CENTER (7 COLS = ~60%) */}
        <div style={{
          gridColumn: 'span 7',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          
          {/* 1. DIAGNOSTIC HEADER & TOP ACTION BUTTONS */}
          <div style={{
            backgroundColor: '#111313',
            border: '1px solid #2A2D30',
            borderRadius: '10px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Watermark Background Asset ID */}
            <div style={{
              position: 'absolute',
              right: '-20px',
              top: '-20px',
              fontSize: '110px',
              fontWeight: 900,
              color: '#1A1D1F',
              opacity: 0.3,
              userSelect: 'none',
              pointerEvents: 'none',
              lineHeight: 1
            }}>
              {currentAsset.assetId}
            </div>

            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#F3EFE4', margin: 0 }}>
                      Asset {currentAsset.assetId} Diagnostic
                    </h2>
                    <span style={{
                      backgroundColor: '#FF3B3B22',
                      color: '#FF3B3B',
                      border: '1px solid #FF3B3B',
                      fontSize: '10px',
                      fontWeight: 900,
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {currentAsset.severity} ANOMALY
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#B8B3A8', marginTop: '10px', maxWidth: '540px', lineHeight: 1.5 }}>
                    {currentAsset.description}
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleAcknowledge(currentAsset.assetId)}
                    disabled={currentAsset.status === 'ACKNOWLEDGED'}
                    style={{
                      backgroundColor: '#FF9000',
                      color: '#080909',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 18px',
                      fontWeight: 900,
                      fontSize: '12px',
                      cursor: currentAsset.status === 'ACKNOWLEDGED' ? 'default' : 'pointer',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {currentAsset.status === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED' : 'ACKNOWLEDGE'}
                  </button>

                  <button
                    onClick={() => handleEscalate(currentAsset.assetId)}
                    style={{
                      backgroundColor: '#1A1D1F',
                      color: '#FF3B3B',
                      border: '1px solid #FF3B3B',
                      borderRadius: '6px',
                      padding: '10px 18px',
                      fontWeight: 900,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      letterSpacing: '0.05em'
                    }}
                  >
                    <AlertTriangle size={14} /> ESCALATE
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. PRODUCTION DEVIATION DIAGNOSTIC CHART (BBL/D VS EXPECTED) */}
          <div style={{
            backgroundColor: '#111313',
            border: '1px solid #2A2D30',
            borderRadius: '10px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#F3EFE4', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PRODUCTION DEVIATION (BBL/D) VS EXPECTED
                </h3>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>45-Minute Trailing Anomaly Window</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                <span style={{ color: '#B8B3A8' }}>-- EXPECTED</span>
                <span style={{ color: '#FF3B3B', fontWeight: 700 }}>— ACTUAL</span>
              </div>
            </div>

            <div style={{ width: '100%', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentAsset.historyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRedAnomaly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF3B3B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FF3B3B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1D1F" />
                  <XAxis dataKey="time" stroke="#B8B3A8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#B8B3A8" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A1D1F', borderColor: '#2A2D30', color: '#F3EFE4' }} />
                  
                  {/* Anomaly Window Overlay */}
                  <ReferenceArea x1="T-15" x2="NOW" fill="#FF3B3B" fillOpacity={0.2} stroke="#FF3B3B" strokeDasharray="3 3" />
                  
                  <Area type="monotone" dataKey="actual" stroke="#FF3B3B" strokeWidth={3} fill="url(#colorRedAnomaly)" />
                  <Line type="monotone" dataKey="expected" stroke="#B8B3A8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. DIAGNOSTIC TRIPLE CARD GRID (ROOT CAUSE, CORRELATED ASSETS, TIMELINE) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px' }}>
            
            {/* AI ROOT CAUSE ANALYSIS (5 Cols) */}
            <div style={{
              gridColumn: 'span 5',
              backgroundColor: '#111313',
              border: '1px solid #2A2D30',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#F3EFE4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  AI ROOT CAUSE ANALYSIS
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentAsset.rootCauses.map((rc, idx) => (
                    <div key={idx} style={{ backgroundColor: '#1A1D1F', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #FF3B3B' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#F3EFE4' }}>{rc.title}</div>
                      <div style={{ fontSize: '11px', color: '#B8B3A8', marginTop: '4px', lineHeight: 1.4 }}>{rc.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => navigate('/intelligence/deviation-attribution')}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#FF9000',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '16px',
                  padding: 0
                }}
              >
                VIEW FULL ATTRIBUTION <ChevronRight size={14} />
              </button>
            </div>

            {/* CORRELATED BASIN ASSETS CLUSTER (4 Cols) */}
            <div style={{
              gridColumn: 'span 4',
              backgroundColor: '#111313',
              border: '1px solid #2A2D30',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#F3EFE4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                CORRELATED BASIN ASSETS
              </h4>
              <p style={{ fontSize: '10px', color: '#B8B3A8', marginBottom: '12px' }}>
                Assets showing similar thermal/pressure signatures in trailing 24h.
              </p>

              {/* Graphic Network Cluster Container */}
              <div style={{
                position: 'relative',
                flex: 1,
                minHeight: '160px',
                backgroundColor: '#1A1D1F',
                borderRadius: '6px',
                border: '1px solid #2A2D30',
                overflow: 'hidden'
              }}>
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                  <line x1="20%" y1="40%" x2="50%" y2="60%" stroke="#FF3B3B" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="25%" y1="75%" x2="50%" y2="60%" stroke="#FF3B3B" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="80%" y1="70%" x2="50%" y2="60%" stroke="#2A2D30" strokeWidth="1" />
                </svg>

                {currentAsset.correlatedAssets.map((node) => (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      transform: 'translate(-50%, -50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{
                      width: node.active ? '18px' : '10px',
                      height: node.active ? '18px' : '10px',
                      borderRadius: '50%',
                      backgroundColor: node.active ? '#FF3B3B' : '#666',
                      boxShadow: node.active ? '0 0 12px #FF3B3B' : 'none',
                      border: node.active ? '2px solid #F3EFE4' : 'none'
                    }}></div>
                    <span style={{ fontSize: '9px', color: node.active ? '#FF3B3B' : '#B8B3A8', fontWeight: 700, marginTop: '2px' }}>
                      {node.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* INCIDENT TIMELINE (3 Cols) */}
            <div style={{
              gridColumn: 'span 3',
              backgroundColor: '#111313',
              border: '1px solid #2A2D30',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#F3EFE4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                INCIDENT TIMELINE
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '10px' }}>
                {currentAsset.timeline.map((t, i) => (
                  <div key={i} style={{ borderLeft: `2px solid ${t.active ? '#FF3B3B' : '#2A2D30'}`, paddingLeft: '8px' }}>
                    <div style={{ color: t.active ? '#FF3B3B' : '#B8B3A8', fontWeight: 800 }}>● {t.time}</div>
                    <div style={{ color: '#F3EFE4', marginTop: '2px', lineHeight: 1.3 }}>{t.text}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
      </>
      )}

    </div>
  );
};
