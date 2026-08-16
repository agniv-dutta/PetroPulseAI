import { useMemo } from 'react';

// Mock asset intelligence bundle for Asset MH-07 (demo dataset)
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

export type AssetData = typeof mockAssetData;

/**
 * Returns the intelligence bundle for a given asset id.
 * Falls back to the default MH-07 demo asset when the id is unknown.
 */
export const useAssetData = (assetId?: string): AssetData =>
  useMemo(() => ({ ...mockAssetData, id: assetId || mockAssetData.id }), [assetId]);
