import React, { useState, useMemo } from 'react';
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
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import {
  Brain,
  Download,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { ProvenanceBadge } from '../components/ProvenanceBadge';

export type HorizonOption = '30D' | '90D' | '180D' | '365D';

export interface ForecastPoint {
  date: string;
  actual?: number | null;
  expected?: number | null;
  forecast?: number | null;
  upper?: number | null;
  lower?: number | null;
  type: 'hist' | 'future';
}

// Mock multi-horizon forecasting dataset
const generateForecastDataset = () => {
  // 12 Months Back (2025-08 to 2026-08)
  const historical: ForecastPoint[] = [
    { date: '2025-08', actual: 1.55, expected: 1.54, type: 'hist' },
    { date: '2025-09', actual: 1.52, expected: 1.50, type: 'hist' },
    { date: '2025-10', actual: 1.48, expected: 1.49, type: 'hist' },
    { date: '2025-11', actual: 1.45, expected: 1.47, type: 'hist' },
    { date: '2025-12', actual: 1.42, expected: 1.46, type: 'hist' },
    { date: '2026-01', actual: 1.38, expected: 1.45, type: 'hist' },
    { date: '2026-02', actual: 1.35, expected: 1.44, type: 'hist' },
    { date: '2026-03', actual: 1.28, expected: 1.44, type: 'hist' }, // Anomaly start
    { date: '2026-04', actual: 1.22, expected: 1.43, type: 'hist' },
    { date: '2026-05', actual: 1.20, expected: 1.43, type: 'hist' },
    { date: '2026-06', actual: 1.19, expected: 1.42, type: 'hist' },
    { date: '2026-07', actual: 1.18, expected: 1.42, type: 'hist' },
    { date: '2026-08 (NOW)', actual: 1.17, expected: 1.42, type: 'hist' },
  ];

  // 30D Forecast
  const f30: ForecastPoint[] = [
    { date: '2026-08 (NOW)', forecast: 1.17, upper: 1.17, lower: 1.17, type: 'future' },
    { date: '+10 Days', forecast: 1.19, upper: 1.25, lower: 1.12, type: 'future' },
    { date: '+20 Days', forecast: 1.20, upper: 1.28, lower: 1.11, type: 'future' },
    { date: '+30 Days', forecast: 1.21, upper: 1.31, lower: 1.10, type: 'future' },
  ];

  // 90D Forecast
  const f90: ForecastPoint[] = [
    { date: '2026-08 (NOW)', forecast: 1.17, upper: 1.17, lower: 1.17, type: 'future' },
    { date: '+30 Days', forecast: 1.21, upper: 1.31, lower: 1.10, type: 'future' },
    { date: '+60 Days', forecast: 1.23, upper: 1.35, lower: 1.12, type: 'future' },
    { date: '+90 Days', forecast: 1.24, upper: 1.38, lower: 1.10, type: 'future' },
  ];

  // 180D Forecast
  const f180: ForecastPoint[] = [
    { date: '2026-08 (NOW)', forecast: 1.17, upper: 1.17, lower: 1.17, type: 'future' },
    { date: '+45 Days', forecast: 1.22, upper: 1.33, lower: 1.11, type: 'future' },
    { date: '+90 Days', forecast: 1.24, upper: 1.38, lower: 1.10, type: 'future' },
    { date: '+135 Days', forecast: 1.26, upper: 1.41, lower: 1.09, type: 'future' },
    { date: '+180 Days', forecast: 1.28, upper: 1.45, lower: 1.08, type: 'future' },
  ];

  // 365D Forecast
  const f365: ForecastPoint[] = [
    { date: '2026-08 (NOW)', forecast: 1.17, upper: 1.17, lower: 1.17, type: 'future' },
    { date: '+90 Days', forecast: 1.24, upper: 1.38, lower: 1.10, type: 'future' },
    { date: '+180 Days', forecast: 1.28, upper: 1.45, lower: 1.08, type: 'future' },
    { date: '+270 Days', forecast: 1.32, upper: 1.50, lower: 1.06, type: 'future' },
    { date: '+365 Days', forecast: 1.35, upper: 1.56, lower: 1.05, type: 'future' },
  ];

  return { historical, f30, f90, f180, f365 };
};

const comparisonTableData = [
  { horizon: '30 Days', option: '30D' as HorizonOption, expected: '1.42 MMBL', forecast: '1.21 MMBL', confidence: '87%', change: '-14.8%', changeNum: -14.8 },
  { horizon: '90 Days', option: '90D' as HorizonOption, expected: '1.42 MMBL', forecast: '1.24 MMBL', confidence: '84%', change: '-12.7%', changeNum: -12.7 },
  { horizon: '180 Days', option: '180D' as HorizonOption, expected: '1.42 MMBL', forecast: '1.28 MMBL', confidence: '79%', change: '-9.9%', changeNum: -9.9 },
  { horizon: '365 Days', option: '365D' as HorizonOption, expected: '1.42 MMBL', forecast: '1.35 MMBL', confidence: '71%', change: '-4.9%', changeNum: -4.9 },
];

const featureImportanceData = [
  { feature: 'Seasonal Trend', pct: 28 },
  { feature: 'Historical Decline Rate', pct: 22 },
  { feature: 'Pressure Telemetry (PT-104)', pct: 18 },
  { feature: 'Temperature Variance', pct: 15 },
  { feature: 'Flow Rate Volatility', pct: 9 },
  { feature: 'Other Operational Features', pct: 8 },
];

const maeSparkline = [
  { month: 'Mar', mae: 0.12 },
  { month: 'Apr', mae: 0.11 },
  { month: 'May', mae: 0.10 },
  { month: 'Jun', mae: 0.09 },
  { month: 'Jul', mae: 0.08 },
  { month: 'Aug', mae: 0.08 },
];

export const ForecastingCanvas: React.FC = () => {
  const dataset = useMemo(() => generateForecastDataset(), []);

  const [selectedHorizon, setSelectedHorizon] = useState<HorizonOption>('90D');
  const [seriesVisibility, setSeriesVisibility] = useState({
    actual: true,
    expected: true,
    forecast: true,
    confidence: true,
  });

  // Construct combined chart data based on selected horizon
  const combinedChartData = useMemo(() => {
    let futureData = dataset.f90;
    if (selectedHorizon === '30D') futureData = dataset.f30;
    if (selectedHorizon === '180D') futureData = dataset.f180;
    if (selectedHorizon === '365D') futureData = dataset.f365;

    // Merge without duplicating NOW point
    const histNoNow = dataset.historical.slice(0, -1);
    return [...histNoNow, ...futureData];
  }, [dataset, selectedHorizon]);

  const toggleSeries = (key: keyof typeof seriesVisibility) => {
    setSeriesVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const exportForecastCSV = () => {
    const headers = 'Date,Actual Prod (MMBL),Expected Prod (MMBL),Forecast Prod (MMBL),Upper Confidence (MMBL),Lower Confidence (MMBL)\n';
    const rows = combinedChartData.map(d =>
      `${d.date},${d.actual || ''},${d.expected || ''},${d.forecast || ''},${d.upper || ''},${d.lower || ''}`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PetroPulse_Production_Forecast_${selectedHorizon}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div style={{ backgroundColor: '#080909', minHeight: '100vh', color: '#F3EFE4', padding: '24px 32px' }}>
      
      {/* PROVENANCE BANNER */}
      <ProvenanceBadge sourceType="DERIVED" context="banner" disclaimer="Model-estimated production forecast \u2014 trained on synthetic data" />

      {/* 1. PAGE HEADER & BADGES */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#C7F700', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            PREDICTIVE ANALYTICS ENGINE
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F3EFE4', margin: '4px 0 0 0', letterSpacing: '-0.5px' }}>
            Production Forecasting Canvas
          </h1>
          <p style={{ fontSize: '13px', color: '#B8B3A8', marginTop: '4px' }}>
            Historical Production | Model Expectations | Future Forecast Horizons
          </p>
        </div>

        {/* Quality Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            backgroundColor: '#C7F70022',
            border: '1px solid #C7F700',
            color: '#C7F700',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Brain size={16} /> Model Confidence: 87%
          </div>

          <div style={{
            backgroundColor: '#00D96622',
            border: '1px solid #00D966',
            color: '#00D966',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <CheckCircle2 size={16} /> Data Quality: 94%
          </div>

          <div style={{
            backgroundColor: '#1A1D1F',
            border: '1px solid #2A2D30',
            color: '#B8B3A8',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600
          }}>
            Updated 2 hours ago
          </div>
        </div>
      </div>

      {/* 2. MAIN LAYOUT: CHART (70%) + SIDEBAR (30%) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '24px',
        marginBottom: '24px'
      }}>
        
        {/* LARGE PRODUCTION FORECAST CHART CONTAINER (8 Cols = ~67%) */}
        <div style={{
          gridColumn: 'span 8',
          backgroundColor: '#1A1D1F',
          border: '1px solid #2A2D30',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          
          {/* Top Bar inside Chart: Title, Legend, Horizon Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#F3EFE4', margin: 0 }}>
                Crude Volume Trajectory & Forecast
              </h2>
              <span style={{ fontSize: '11px', color: '#B8B3A8' }}>Unit: MMBL (Million Barrels)</span>
            </div>

            {/* Horizon Selector Tabs */}
            <div style={{
              backgroundColor: '#111313',
              border: '1px solid #2A2D30',
              borderRadius: '6px',
              padding: '4px',
              display: 'flex',
              gap: '4px'
            }}>
              {(['30D', '90D', '180D', '365D'] as HorizonOption[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => setSelectedHorizon(opt)}
                  style={{
                    backgroundColor: selectedHorizon === opt ? '#FF9000' : 'transparent',
                    color: selectedHorizon === opt ? '#080909' : '#B8B3A8',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Legend Toggles */}
          <div style={{ display: 'flex', gap: '20px', fontSize: '12px', borderBottom: '1px solid #2A2D30', paddingBottom: '12px' }}>
            <div
              onClick={() => toggleSeries('actual')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: seriesVisibility.actual ? 1 : 0.4 }}
            >
              <span style={{ width: '14px', height: '3px', backgroundColor: '#FF9000', borderRadius: '2px' }}></span>
              <span style={{ color: '#F3EFE4', fontWeight: 600 }}>Historical Actual</span>
            </div>

            <div
              onClick={() => toggleSeries('expected')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: seriesVisibility.expected ? 1 : 0.4 }}
            >
              <span style={{ width: '14px', height: '2px', borderTop: '2px dashed #B8B3A8' }}></span>
              <span style={{ color: '#B8B3A8', fontWeight: 600 }}>Model Expected</span>
            </div>

            <div
              onClick={() => toggleSeries('forecast')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: seriesVisibility.forecast ? 1 : 0.4 }}
            >
              <span style={{ width: '14px', height: '3px', backgroundColor: '#C7F700', borderRadius: '2px' }}></span>
              <span style={{ color: '#C7F700', fontWeight: 700 }}>Forecast ({selectedHorizon})</span>
            </div>

            <div
              onClick={() => toggleSeries('confidence')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: seriesVisibility.confidence ? 1 : 0.4 }}
            >
              <span style={{ width: '12px', height: '12px', backgroundColor: '#C7F70033', border: '1px solid #C7F700' }}></span>
              <span style={{ color: '#C7F700', fontSize: '11px' }}>Confidence Band (95% CI)</span>
            </div>
          </div>

          {/* Recharts Canvas */}
          <div style={{ width: '100%', height: '380px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedChartData} margin={{ top: 15, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorForecastBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C7F700" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C7F700" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" />
                <XAxis dataKey="date" stroke="#B8B3A8" fontSize={11} tickLine={false} />
                <YAxis stroke="#B8B3A8" fontSize={11} domain={[0.9, 1.8]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111313', borderColor: '#2A2D30', borderRadius: '6px', color: '#F3EFE4' }}
                />

                {/* Anomaly Window Band */}
                <ReferenceArea x1="2026-03" x2="2026-07" fill="#FF3B3B" fillOpacity={0.15} stroke="#FF3B3B" strokeDasharray="3 3" />

                {/* Today Vertical Reference Line */}
                <ReferenceLine x="2026-08 (NOW)" stroke="#FF9000" strokeWidth={2} label={{ value: 'TODAY', fill: '#FF9000', fontSize: 10, position: 'top' }} />

                {/* Confidence Interval Band */}
                {seriesVisibility.confidence && (
                  <Area type="monotone" dataKey="upper" stroke="none" fill="url(#colorForecastBand)" />
                )}

                {/* Historical Actual Line */}
                {seriesVisibility.actual && (
                  <Line type="monotone" dataKey="actual" stroke="#FF9000" strokeWidth={3} dot={true} />
                )}

                {/* Model Expected Line */}
                {seriesVisibility.expected && (
                  <Line type="monotone" dataKey="expected" stroke="#B8B3A8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                )}

                {/* Forecast Line */}
                {seriesVisibility.forecast && (
                  <Line type="monotone" dataKey="forecast" stroke="#C7F700" strokeWidth={3} dot={true} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. MODEL CONFIGURATION & METRICS CARD (4 Cols = ~33%) */}
        <div style={{
          gridColumn: 'span 4',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Brain size={20} color="#C7F700" />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F3EFE4', margin: 0 }}>
                Model Configuration
              </h3>
            </div>

            {/* Configuration Parameters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', backgroundColor: '#111313', padding: '14px', borderRadius: '8px', border: '1px solid #2A2D30' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#B8B3A8' }}>Architecture:</span>
                <strong style={{ color: '#C7F700' }}>Hybrid XGBoost + LSTM</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#B8B3A8' }}>Forecast Horizon:</span>
                <strong style={{ color: '#F3EFE4' }}>{selectedHorizon}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#B8B3A8' }}>Training Window:</span>
                <strong style={{ color: '#F3EFE4' }}>24 Months</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#B8B3A8' }}>Features Used:</span>
                <strong style={{ color: '#F3EFE4' }}>15 Telemetry Signals</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#B8B3A8' }}>Last Retraining:</span>
                <span style={{ color: '#F3EFE4' }}>2026-08-16 16:40</span>
              </div>
            </div>

            {/* Performance Metrics Grid */}
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#F3EFE4', marginTop: '20px', marginBottom: '10px' }}>
              Precision Metrics
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
              <div style={{ backgroundColor: '#111313', padding: '10px 12px', borderRadius: '6px', border: '1px solid #2A2D30' }}>
                <div style={{ color: '#B8B3A8', fontSize: '10px' }}>MAE (Error)</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#C7F700', marginTop: '2px' }}>0.08 MMBL</div>
              </div>
              <div style={{ backgroundColor: '#111313', padding: '10px 12px', borderRadius: '6px', border: '1px solid #2A2D30' }}>
                <div style={{ color: '#B8B3A8', fontSize: '10px' }}>RMSE</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#C7F700', marginTop: '2px' }}>0.12 MMBL</div>
              </div>
              <div style={{ backgroundColor: '#111313', padding: '10px 12px', borderRadius: '6px', border: '1px solid #2A2D30' }}>
                <div style={{ color: '#B8B3A8', fontSize: '10px' }}>R² Score</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#00D966', marginTop: '2px' }}>0.924</div>
              </div>
              <div style={{ backgroundColor: '#111313', padding: '10px 12px', borderRadius: '6px', border: '1px solid #2A2D30' }}>
                <div style={{ color: '#B8B3A8', fontSize: '10px' }}>MAPE</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#00D966', marginTop: '2px' }}>4.2%</div>
              </div>
            </div>

            {/* Accuracy Sparkline */}
            <div style={{ backgroundColor: '#111313', padding: '12px', borderRadius: '6px', border: '1px solid #2A2D30', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px' }}>
                <span style={{ color: '#B8B3A8' }}>MAE Accuracy Trend (6M)</span>
                <span style={{ color: '#00D966', fontWeight: 700 }}>Model Stable</span>
              </div>
              <div style={{ width: '100%', height: '50px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={maeSparkline}>
                    <Line type="monotone" dataKey="mae" stroke="#00D966" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <button
            onClick={() => alert('Model retrain sequence initialized.')}
            style={{
              width: '100%',
              backgroundColor: '#FF9000',
              color: '#080909',
              border: 'none',
              borderRadius: '6px',
              padding: '12px',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={16} /> Force Retrain Model
          </button>
        </div>
      </div>

      {/* 4. COMPARISON TABLE & FEATURE IMPORTANCE GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
        
        {/* FORECAST COMPARISON TABLE (8 Cols) */}
        <div style={{ gridColumn: 'span 8', backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '10px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F3EFE4', marginBottom: '16px' }}>
            Forecast Comparison by Horizon
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#111313', borderBottom: '1px solid #2A2D30', color: '#B8B3A8', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 14px' }}>Horizon</th>
                  <th style={{ padding: '12px 14px' }}>Expected (12M Avg)</th>
                  <th style={{ padding: '12px 14px' }}>Forecast Value</th>
                  <th style={{ padding: '12px 14px' }}>Confidence</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Net Deviation</th>
                </tr>
              </thead>
              <tbody>
                {comparisonTableData.map(row => {
                  const isActive = selectedHorizon === row.option;
                  return (
                    <tr
                      key={row.horizon}
                      onClick={() => setSelectedHorizon(row.option)}
                      style={{
                        backgroundColor: isActive ? '#FF900015' : 'transparent',
                        borderBottom: '1px solid #111313',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '14px', fontWeight: 800, color: isActive ? '#FF9000' : '#F3EFE4' }}>
                        {row.horizon} {isActive && '●'}
                      </td>
                      <td style={{ padding: '14px', color: '#B8B3A8' }}>{row.expected}</td>
                      <td style={{ padding: '14px', fontWeight: 700, color: '#C7F700' }}>{row.forecast}</td>
                      <td style={{ padding: '14px', color: '#F3EFE4' }}>{row.confidence}</td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 800, color: row.changeNum < 0 ? '#FF3B3B' : '#00D966' }}>
                        {row.change}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FEATURE IMPORTANCE BREAKDOWN (4 Cols) */}
        <div style={{ gridColumn: 'span 4', backgroundColor: '#1A1D1F', border: '1px solid #2A2D30', borderRadius: '10px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F3EFE4', marginBottom: '16px' }}>
            Feature Contribution to Forecast
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {featureImportanceData.map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#F3EFE4', fontWeight: 600 }}>{item.feature}</span>
                  <span style={{ color: '#C7F700', fontWeight: 800 }}>{item.pct}%</span>
                </div>
                <div style={{ backgroundColor: '#111313', borderRadius: '4px', height: '8px', width: '100%', overflow: 'hidden' }}>
                  <div style={{ width: `${item.pct}%`, backgroundColor: '#C7F700', height: '100%', borderRadius: '4px' }}></div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button
              onClick={exportForecastCSV}
              style={{
                flex: 1,
                backgroundColor: '#111313',
                border: '1px solid #2A2D30',
                color: '#F3EFE4',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Download size={14} color="#00D966" /> Export CSV
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
