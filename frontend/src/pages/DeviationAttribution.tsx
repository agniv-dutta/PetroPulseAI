import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Sliders,
  ExternalLink
} from 'lucide-react';

export interface SHAPFeature {
  name: string;
  impactVal: number;
  percentage: number;
  confidence: number;
  description: string;
  indicators?: string[];
  action: string;
  color: string;
}

const mockAttributionData = {
  assetId: 'MH-07',
  field: 'Mumbai High North',
  basin: 'Arabian Sea',
  expected: 1.42,
  actual: 1.17,
  gap: -0.25,
  deviationPercent: -17.4,
  estimatedRecovery: '+0.18 MMBL (+15.4%)',
  confidenceScore: 87,

  features: [
    {
      name: 'Historical Decline Rate',
      impactVal: -0.11,
      percentage: 43,
      confidence: 93,
      description: 'Natural reservoir depletion and pressure drawdown over time.',
      indicators: ['Average 2.3% per month decline rate', 'Consistent with mature reservoir stage'],
      action: 'Monitor decline trend; standard reservoir depletion trajectory.',
      color: '#FF3B3B'
    },
    {
      name: 'Operational Change (PT-104)',
      impactVal: -0.07,
      percentage: 28,
      confidence: 89,
      description: 'Detected operational inefficiency in pressure control sub-assembly PT-104.',
      indicators: ['Pressure drop of 2.1 bar detected', 'Flow rate reduced by 8.3%'],
      action: 'Investigate pressure system PT-104; inspect choke valve for obstruction.',
      color: '#FF3B3B'
    },
    {
      name: 'Production Volatility',
      impactVal: -0.04,
      percentage: 17,
      confidence: 94,
      description: 'Random fluctuations and multi-phase flow noise across manifold lines.',
      indicators: ['Variance within 1.5 sigma bounds', 'Transient gas lock noise'],
      action: 'No immediate field action required; continue telemetry logging.',
      color: '#FF9000'
    },
    {
      name: 'Environmental & Other',
      impactVal: -0.03,
      percentage: 12,
      confidence: 71,
      description: 'Minor background factors below individual detection thresholds.',
      indicators: ['Offshore swell micro-vibrations', 'Ambient temperature delta'],
      action: 'Baseline monitoring.',
      color: '#B8B3A8'
    }
  ] as SHAPFeature[],

  waterfallData: [
    { step: 'Expected Baseline', value: 1.42, fill: '#00D966' },
    { step: 'Hist. Decline (-43%)', value: -0.11, fill: '#FF3B3B' },
    { step: 'Op. Change (-28%)', value: -0.07, fill: '#FF3B3B' },
    { step: 'Volatility (-17%)', value: -0.04, fill: '#FF9000' },
    { step: 'Other (-12%)', value: -0.03, fill: '#B8B3A8' },
    { step: 'Actual Telemetry', value: 1.17, fill: '#FF9000' },
  ]
};

export const DeviationAttribution: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const data = {
    ...mockAttributionData,
    assetId: id || mockAttributionData.assetId
  };

  const [expandedFeature, setExpandedFeature] = useState<string | null>('Operational Change (PT-104)');

  // What-If Simulation Sliders
  const [fixOpChange, setFixOpChange] = useState<boolean>(false);
  const [fixDecline, setFixDecline] = useState<boolean>(false);

  // Calculate simulated yield
  const simulatedYield = useMemo(() => {
    let yieldVal = data.actual;
    if (fixOpChange) yieldVal += 0.07;
    if (fixDecline) yieldVal += 0.11;
    return parseFloat(yieldVal.toFixed(2));
  }, [data.actual, fixOpChange, fixDecline]);

  const exportReport = () => {
    const headers = 'Asset ID,Expected (MMBL),Actual (MMBL),Gap (MMBL),Deviation %,Feature,Impact (MMBL),Percentage,Confidence\n';
    const rows = data.features.map(f =>
      `${data.assetId},${data.expected},${data.actual},${data.gap},${data.deviationPercent}%,"${f.name}",${f.impactVal},${f.percentage}%,${f.confidence}%`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PetroPulse_SHAP_Attribution_${data.assetId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div style={{ backgroundColor: '#080909', minHeight: '100vh', color: '#F3EFE4', padding: '24px 32px' }}>
      
      {/* BREADCRUMB & BACK BUTTON */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#B8B3A8' }}>
          <Link to="/anomalies" style={{ color: '#FF9000', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to Anomalies
          </Link>
          <span>/</span>
          <span>Explainable AI</span>
          <span>/</span>
          <span style={{ color: '#F3EFE4', fontWeight: 700 }}>SHAP Attribution ({data.assetId})</span>
        </div>

        <div style={{ fontSize: '11px', color: '#B8B3A8' }}>
          SHAP Model Version: <strong style={{ color: '#C7F700' }}>v2.4-shapley</strong>
        </div>
      </div>

      {/* 1. PAGE HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#C7F700', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            EXPLAINABLE AI ENGINE (XAI)
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F3EFE4', margin: '4px 0 0 0', letterSpacing: '-0.5px' }}>
            Production Deviation Attribution
          </h1>
          <p style={{ fontSize: '13px', color: '#B8B3A8', marginTop: '4px' }}>
            Why is production below expectation? — SHAP-based Root Cause Decomposition for <strong style={{ color: '#FF9000' }}>{data.assetId}</strong> ({data.field})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate(`/asset/${data.assetId}`)}
            style={{
              backgroundColor: '#1A1D1F',
              border: '1px solid #2A2D30',
              color: '#F3EFE4',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ExternalLink size={14} color="#FF9000" /> View Digital Twin Profile
          </button>

          <button
            onClick={exportReport}
            style={{
              backgroundColor: '#1A1D1F',
              border: '1px solid #2A2D30',
              color: '#F3EFE4',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} color="#00D966" /> Export Report
          </button>
        </div>
      </div>

      {/* 2. DEVIATION SUMMARY CARD (TOP) */}
      <div style={{
        backgroundColor: '#1A1D1F',
        border: '1px solid #FF3B3B44',
        borderRadius: '10px',
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ borderRight: '1px solid #2A2D30', paddingRight: '16px' }}>
          <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>EXPECTED PRODUCTION</span>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#00D966', marginTop: '4px' }}>
            {data.expected} <span style={{ fontSize: '12px', color: '#B8B3A8', fontWeight: 500 }}>MMBL</span>
          </div>
        </div>

        <div style={{ borderRight: '1px solid #2A2D30', paddingRight: '16px' }}>
          <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>ACTUAL TELEMETRY</span>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#FF3B3B', marginTop: '4px' }}>
            {data.actual} <span style={{ fontSize: '12px', color: '#B8B3A8', fontWeight: 500 }}>MMBL</span>
          </div>
        </div>

        <div style={{ borderRight: '1px solid #2A2D30', paddingRight: '16px' }}>
          <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>NET PRODUCTION GAP</span>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#FF3B3B', marginTop: '4px' }}>
            {data.gap} MMBL <span style={{ fontSize: '14px', color: '#FF3B3B' }}>({data.deviationPercent}%)</span>
          </div>
        </div>

        <div style={{ borderRight: '1px solid #2A2D30', paddingRight: '16px' }}>
          <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>ESTIMATED RECOVERY</span>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#00D966', marginTop: '4px' }}>
            {data.estimatedRecovery}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>XAI CONFIDENCE</span>
          <div style={{ marginTop: '6px' }}>
            <span style={{ backgroundColor: '#C7F70022', color: '#C7F700', border: '1px solid #C7F700', borderRadius: '12px', padding: '4px 12px', fontSize: '12px', fontWeight: 900 }}>
              {data.confidenceScore}% CONFIDENCE
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN LAYOUT: SHAP BAR CHART (60%) + FEATURE DETAILS ACCORDION (40%) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', marginBottom: '24px' }}>
        
        {/* SHAP HORIZONTAL BAR CHART CONTAINER (7 Cols = ~58%) */}
        <div style={{
          gridColumn: 'span 7',
          backgroundColor: '#1A1D1F',
          border: '1px solid #2A2D30',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F3EFE4', margin: 0 }}>
                  Feature Contributions (SHAP Values)
                </h2>
                <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Decomposition of -0.25 MMBL Production Shortfall</span>
              </div>
              <span style={{ fontSize: '11px', color: '#FF3B3B', fontWeight: 700 }}>● Negative Impact</span>
            </div>

            {/* Custom SHAP Horizontal Bar Representation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: '20px 0' }}>
              {data.features.map((feat) => (
                <div
                  key={feat.name}
                  onClick={() => setExpandedFeature(expandedFeature === feat.name ? null : feat.name)}
                  style={{
                    backgroundColor: expandedFeature === feat.name ? '#111313' : 'transparent',
                    padding: '12px',
                    borderRadius: '8px',
                    border: expandedFeature === feat.name ? '1px solid #FF9000' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: '#F3EFE4', fontWeight: 700 }}>{feat.name}</span>
                    <span style={{ color: feat.color, fontWeight: 900 }}>
                      {feat.impactVal} MMBL ({feat.percentage}%)
                    </span>
                  </div>

                  {/* Horizontal Bar Container */}
                  <div style={{ backgroundColor: '#111313', height: '14px', borderRadius: '4px', width: '100%', overflow: 'hidden', border: '1px solid #2A2D30' }}>
                    <div style={{
                      width: `${feat.percentage}%`,
                      backgroundColor: feat.color,
                      height: '100%',
                      borderRadius: '4px',
                      boxShadow: `0 0 8px ${feat.color}66`
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#B8B3A8', backgroundColor: '#111313', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #C7F700' }}>
            <strong style={{ color: '#C7F700' }}>SHAP INSIGHT:</strong> Historical decline and PT-104 operational pressure drop account for 71% of total portfolio variance.
          </div>
        </div>

        {/* FEATURE DETAILS ACCORDION PANEL (5 Cols = ~42%) */}
        <div style={{
          gridColumn: 'span 5',
          backgroundColor: '#1A1D1F',
          border: '1px solid #2A2D30',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F3EFE4', margin: 0 }}>
            Detailed Factor Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
            {data.features.map((feat) => {
              const isExpanded = expandedFeature === feat.name;
              return (
                <div
                  key={feat.name}
                  style={{
                    backgroundColor: '#111313',
                    border: `1px solid ${isExpanded ? '#FF9000' : '#2A2D30'}`,
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => setExpandedFeature(isExpanded ? null : feat.name)}
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: isExpanded ? '#1A1D1F' : '#111313'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#F3EFE4' }}>
                      {feat.name} <span style={{ color: feat.color, marginLeft: '6px', fontWeight: 800 }}>({feat.percentage}%)</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} color="#FF9000" /> : <ChevronDown size={16} color="#B8B3A8" />}
                  </div>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div style={{ padding: '16px', borderTop: '1px solid #2A2D30', fontSize: '12px', color: '#B8B3A8', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div><strong>Description:</strong> {feat.description}</div>
                      
                      {feat.indicators && (
                        <div>
                          <strong>Key Indicators:</strong>
                          <ul style={{ paddingLeft: '18px', marginTop: '4px', color: '#F3EFE4' }}>
                            {feat.indicators.map((ind, i) => (
                              <li key={i}>{ind}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Confidence Score:</span>
                        <strong style={{ color: '#C7F700' }}>{feat.confidence}%</strong>
                      </div>

                      <div style={{ backgroundColor: '#FF900015', borderLeft: '3px solid #FF9000', padding: '8px 12px', borderRadius: '4px', color: '#F3EFE4', marginTop: '4px' }}>
                        <strong style={{ color: '#FF9000' }}>Recommended Action:</strong> {feat.action}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. WATERFALL CHART & WHAT-IF SIMULATION GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', marginBottom: '24px' }}>
        
        {/* WATERFALL CUMULATIVE LOSS CHART (7 Cols) */}
        <div style={{ gridColumn: 'span 7', backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '10px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F3EFE4', marginBottom: '16px' }}>
            Cumulative Loss Waterfall Breakdown
          </h3>

          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.waterfallData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" />
                <XAxis dataKey="step" stroke="#B8B3A8" fontSize={10} tickLine={false} />
                <YAxis stroke="#B8B3A8" fontSize={10} domain={[-0.2, 1.6]} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111313', borderColor: '#2A2D30', color: '#F3EFE4' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WHAT-IF SCENARIO ANALYSIS (5 Cols) */}
        <div style={{ gridColumn: 'span 5', backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Sliders size={20} color="#C7F700" />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F3EFE4', margin: 0 }}>
                What-If Scenario Simulation
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#B8B3A8', marginBottom: '16px' }}>
              Simulate operational field interventions to project yield recovery.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Toggle 1: Resolve Operational Change */}
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111313', padding: '12px', borderRadius: '6px', border: '1px solid #2A2D30', cursor: 'pointer' }}>
                <span style={{ fontSize: '12px', color: '#F3EFE4', fontWeight: 600 }}>Resolve PT-104 Pressure Drop (+0.07 MMBL)</span>
                <input
                  type="checkbox"
                  checked={fixOpChange}
                  onChange={(e) => setFixOpChange(e.target.checked)}
                />
              </label>

              {/* Toggle 2: Reverse Decline */}
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111313', padding: '12px', borderRadius: '6px', border: '1px solid #2A2D30', cursor: 'pointer' }}>
                <span style={{ fontSize: '12px', color: '#F3EFE4', fontWeight: 600 }}>Apply Secondary EOR Gas-Lift (+0.11 MMBL)</span>
                <input
                  type="checkbox"
                  checked={fixDecline}
                  onChange={(e) => setFixDecline(e.target.checked)}
                />
              </label>
            </div>

            {/* Simulated Yield Display */}
            <div style={{ backgroundColor: '#111313', border: '1px solid #00D966', borderRadius: '8px', padding: '16px', marginTop: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#B8B3A8', fontWeight: 700 }}>PROJECTED RECOVERED PRODUCTION</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#00D966', marginTop: '4px' }}>
                {simulatedYield} <span style={{ fontSize: '14px', color: '#B8B3A8' }}>MMBL</span>
              </div>
              <div style={{ fontSize: '11px', color: '#C7F700', marginTop: '4px' }}>
                Net Gain: +{parseFloat((simulatedYield - data.actual).toFixed(2))} MMBL
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. CONFIDENCE METRICS & SHAP METHODOLOGY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div style={{ backgroundColor: '#111313', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#F3EFE4', marginBottom: '14px' }}>Model Confidence Ratings</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#B8B3A8' }}>Attribution Model Confidence:</span>
              <strong style={{ color: '#C7F700' }}>87%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#B8B3A8' }}>Feature Measurement Precision:</span>
              <strong style={{ color: '#C7F700' }}>91%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#B8B3A8' }}>Overall Explainability Index:</span>
              <strong style={{ color: '#00D966' }}>87%</strong>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#111313', border: '1px solid #2A2D30', borderRadius: '8px', padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#F3EFE4', marginBottom: '8px' }}>Attribution Methodology (SHAP)</h4>
          <p style={{ fontSize: '12px', color: '#B8B3A8', lineHeight: 1.5 }}>
            This analysis uses SHAP (SHapley Additive exPlanations) derived from cooperative game theory to quantify how each telemetry signal shifts prediction away from baseline expected production.
          </p>
        </div>
      </div>

    </div>
  );
};
