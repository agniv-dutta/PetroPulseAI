// PetroPulse AI - Shared Mock Data System

export interface Asset {
  id: string;
  field: string;
  basin: string;
  currentProduction: number; // in MMBL or BBL/D
  expectedProduction: number;
  deviation: number; // percentage
  declineRate: number; // % per month
  anomalySeverity: 'NORMAL' | 'WATCH' | 'HIGH' | 'CRITICAL';
  anomalyScore: number; // 0.0 to 1.0
  recoveryPotential: number; // in MMBL
  aipsScore: number; // 0 to 100
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  healthScore: number; // 0 to 100
}

export interface SHAPContribution {
  feature: string;
  value: number; // absolute change in BBL/D
  percentage: number;
  impactType: 'positive' | 'negative';
  description: string;
}

export interface ModelHealth {
  id: string;
  name: string;
  algorithm: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
  lastRun: string;
  nextRetrain: string;
  mae: number;
  rmse: number;
  r2: number;
  mape: number;
  featuresUsed: number;
}

export interface TelemetryRow {
  timestamp: string;
  assetId: string;
  production: number;
  forecast: number;
  anomalyScore: number;
  status: 'NORMAL' | 'CRITICAL';
}

// 1. Core Asset Inventory
export const mockAssets: Asset[] = [
  {
    id: "MH-07",
    field: "Mumbai High",
    basin: "Arabian Sea",
    currentProduction: 11300,
    expectedProduction: 12500,
    deviation: -9.6,
    declineRate: 2.3,
    anomalySeverity: "CRITICAL",
    anomalyScore: 0.94,
    recoveryPotential: 1.24, // MMBL
    aipsScore: 92,
    priority: "CRITICAL",
    healthScore: 68,
  },
  {
    id: "CB-12",
    field: "Cambay Basin",
    basin: "Gujarat Onshore",
    currentProduction: 4200,
    expectedProduction: 5100,
    deviation: -17.6,
    declineRate: 1.8,
    anomalySeverity: "HIGH",
    anomalyScore: 0.81,
    recoveryPotential: 0.88,
    aipsScore: 78,
    priority: "HIGH",
    healthScore: 74,
  },
  {
    id: "KG-05",
    field: "Krishna-Godavari",
    basin: "Bay of Bengal",
    currentProduction: 8900,
    expectedProduction: 9400,
    deviation: -5.3,
    declineRate: 3.1,
    anomalySeverity: "WATCH",
    anomalyScore: 0.62,
    recoveryPotential: 0.95,
    aipsScore: 65,
    priority: "HIGH",
    healthScore: 81,
  },
  {
    id: "AS-09",
    field: "Assam-Arakan",
    basin: "Assam Valley",
    currentProduction: 3100,
    expectedProduction: 3200,
    deviation: -3.1,
    declineRate: 0.9,
    anomalySeverity: "NORMAL",
    anomalyScore: 0.18,
    recoveryPotential: 0.22,
    aipsScore: 42,
    priority: "MEDIUM",
    healthScore: 92,
  },
  {
    id: "CB-08",
    field: "Cambay Basin",
    basin: "Gujarat Onshore",
    currentProduction: 2800,
    expectedProduction: 2900,
    deviation: -3.4,
    declineRate: 1.2,
    anomalySeverity: "NORMAL",
    anomalyScore: 0.25,
    recoveryPotential: 0.15,
    aipsScore: 38,
    priority: "LOW",
    healthScore: 95,
  },
  {
    id: "MH-04",
    field: "Mumbai High",
    basin: "Arabian Sea",
    currentProduction: 14500,
    expectedProduction: 14700,
    deviation: -1.3,
    declineRate: 1.5,
    anomalySeverity: "NORMAL",
    anomalyScore: 0.11,
    recoveryPotential: 0.12,
    aipsScore: 32,
    priority: "LOW",
    healthScore: 97,
  }
];

// 2. SHAP Waterfall Distribution (Page 8 - Root Cause Analysis)
export const mockSHAPData: SHAPContribution[] = [
  {
    feature: "Bottom Hole Pressure (BHP)",
    value: 850,
    percentage: 54.8,
    impactType: "positive",
    description: "Gas lift valve optimization restored bottom hole flowing pressure (+124 psi delta)."
  },
  {
    feature: "Gas-Oil Ratio (GOR) Drift",
    value: -320,
    percentage: 20.6,
    impactType: "negative",
    description: "Excessive gas breakout in wellbore restricts liquid lift efficacy (+45 scf/bbl)."
  },
  {
    feature: "Surface Temp Delta",
    value: 180,
    percentage: 11.6,
    impactType: "positive",
    description: "Daytime pipeline manifold warming decreases hydrocarbon viscosity (-2 °F drop)."
  },
  {
    feature: "Seasonal Flow Constraints",
    value: -210,
    percentage: 13.5,
    impactType: "negative",
    description: "Winter cooling at offloading terminal increases backpressure."
  }
];

// 3. What-If Yield Simulation Parameters (Page 8)
export const simulateYieldChange = (pressurePct: number, chokePct: number): { yieldDelta: number; newYield: number } => {
  // Simple deterministic model representing physics simulation
  // Baseline = 13,000 BBL/D
  const baseYield = 13000;
  
  // Pressure increase of 10% yields +0.12 MMBL annually or +600 bbl/d instantly
  // Choke increase of 10% yields +200 bbl/d but increases volatility/water cut risk
  const pressureImpact = (pressurePct / 10) * 400;
  const chokeImpact = (chokePct / 10) * 150;
  
  const yieldDelta = pressureImpact + chokeImpact;
  return {
    yieldDelta: Math.round(yieldDelta),
    newYield: Math.round(baseYield + yieldDelta)
  };
};

// 4. AIPS Scoring Parameters (Page 9 - Priority Panel)
export const mockAIPSBreakdown = {
  assetId: "MH-07",
  aipsScore: 92,
  priority: "CRITICAL",
  formula: "AIPS = (0.35 × Loss) + (0.25 × Anomaly) + (0.40 × Recovery) - (0.10 × Complexity)",
  components: [
    {
      name: "Production Loss",
      weight: 0.35,
      value: "17.6% loss",
      contribution: 34.2,
      impact: "HIGH IMPACT",
      color: "#FF9000"
    },
    {
      name: "Anomaly Severity",
      weight: 0.25,
      value: "0.94 score",
      contribution: 23.5,
      impact: "CRITICAL ALERT",
      color: "#FF3B3B"
    },
    {
      name: "Recovery Potential",
      weight: 0.40,
      value: "15.0% opportunity",
      contribution: 39.9,
      impact: "HIGH YIELD",
      color: "#00D966"
    },
    {
      name: "Intervention Complexity",
      weight: 0.10,
      value: "0.60 score",
      contribution: 6.0,
      impact: "MODERATE",
      color: "#B8B3A8"
    }
  ],
  financials: {
    interventionCost: 1200000, // $1.2M
    expectedYield: 62000000, // $62M yield
    roiMultiplier: 51.6,
    personnelRequired: 4,
    durationDays: 3,
    equipment: ["Calibrated flow regulator", "Gas lift valve replacements"]
  },
  bullets: [
    "Production deviation has breached the critical -5% threshold for 72 consecutive hours.",
    "Isolation Forest detects signal anomaly signature matching historical wellbore sand-up profiles.",
    "Predicted liquid recovery curve displays high slope post-intervention, showing rapid stabilization.",
    "Field operational constraints indicate active workboats nearby, reducing logistics delay score."
  ]
};

// 5. Recovery Scenarios (Page 10 - What-If Canvas)
export const mockRecoveryScenarios = {
  "10": {
    label: "+10% Yield Recovery",
    yieldVol: 0.42, // MMBL
    financialValue: 21.0, // $M
    timeToRecover: 14, // Days
    portfolioHealthImpact: 1.5 // % increase
  },
  "20": {
    label: "+20% Yield Recovery",
    yieldVol: 0.84,
    financialValue: 42.0,
    timeToRecover: 22,
    portfolioHealthImpact: 3.2
  },
  "30": {
    label: "+30% Yield Recovery",
    yieldVol: 1.24,
    financialValue: 62.0,
    timeToRecover: 28,
    portfolioHealthImpact: 4.8
  }
};

// Comparative actual vs projected production timeline (24 months: 12 months past, 12 months forecast)
export const mockRecoveryTimeseries = [
  { month: "Jan", actual: 12400, expected: 12400, recovery10: 12400, recovery20: 12400, recovery30: 12400 },
  { month: "Feb", actual: 12500, expected: 12450, recovery10: 12500, recovery20: 12500, recovery30: 12500 },
  { month: "Mar", actual: 12300, expected: 12500, recovery10: 12300, recovery20: 12300, recovery30: 12300 },
  { month: "Apr", actual: 12100, expected: 12550, recovery10: 12100, recovery20: 12100, recovery30: 12100 },
  { month: "May", actual: 11900, expected: 12600, recovery10: 11900, recovery20: 11900, recovery30: 11900 },
  { month: "Jun", actual: 11500, expected: 12650, recovery10: 11500, recovery20: 11500, recovery30: 11500 },
  { month: "Jul", actual: 11200, expected: 12700, recovery10: 11200, recovery20: 11200, recovery30: 11200 },
  { month: "Aug", actual: 11300, expected: 12750, recovery10: 11300, recovery20: 11300, recovery30: 11300 },
  // Current month: intervention point
  { month: "Sep (Int)", actual: 11300, expected: 12800, recovery10: 11800, recovery20: 12100, recovery30: 12500 },
  { month: "Oct", actual: null, expected: 12850, recovery10: 12200, recovery20: 12600, recovery30: 13000 },
  { month: "Nov", actual: null, expected: 12900, recovery10: 12400, recovery20: 12900, recovery30: 13400 },
  { month: "Dec", actual: null, expected: 12950, recovery10: 12500, recovery20: 13100, recovery30: 13700 },
];

// 6. Real-Time Telemetry Stream Simulator (Page 11 & 12)
// This array represents a baseline stream
export const generateTelemetryBase = (length: number): TelemetryRow[] => {
  const data: TelemetryRow[] = [];
  let baseVal = 12500;
  
  for (let i = 0; i < length; i++) {
    const time = new Date(Date.now() - (length - i) * 10000); // 10s intervals
    const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Add random noise
    const noise = (Math.random() - 0.5) * 120;
    const production = Math.round(baseVal + noise);
    const forecast = Math.round(baseVal + (Math.sin(i / 10) * 80));
    const dev = ((production - forecast) / forecast) * 100;
    
    let anomalyScore = 0.05 + (Math.random() * 0.12);
    let status: 'NORMAL' | 'CRITICAL' = 'NORMAL';
    
    if (dev < -4) {
      anomalyScore = 0.75 + (Math.random() * 0.20);
      status = anomalyScore > 0.85 ? 'CRITICAL' : 'NORMAL';
    }
    
    data.push({
      timestamp: timeString,
      assetId: "MH-07",
      production,
      forecast,
      anomalyScore: parseFloat(anomalyScore.toFixed(2)),
      status
    });
  }
  return data;
};

// Scenario generator for injection controls
export const getInjectedScenarioData = (scenarioType: string): {
  description: string;
  expectedOutcome: string;
  datapoints: TelemetryRow[];
} => {
  const baseTime = Date.now();
  const makeTime = (offsetSec: number) => {
    return new Date(baseTime + offsetSec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  let description = "";
  let expectedOutcome = "";
  const datapoints: TelemetryRow[] = [];

  switch (scenarioType) {
    case "normal":
      description = "Normal operating conditions with standard reservoir pressure and flow rate.";
      expectedOutcome = "Production matches forecast values within a 1.5% noise margin. Anomaly score remains low (< 0.15).";
      for (let i = 0; i < 20; i++) {
        const prod = 12500 + Math.round((Math.random() - 0.5) * 80);
        datapoints.push({
          timestamp: makeTime(i * 10),
          assetId: "MH-07",
          production: prod,
          forecast: 12500,
          anomalyScore: parseFloat((0.04 + Math.random() * 0.08).toFixed(2)),
          status: 'NORMAL'
        });
      }
      break;
      
    case "decline":
      description = "Simulates gradual wellhead pressure decline due to reservoir depletion and hydrostatic column load.";
      expectedOutcome = "Slow drop in production over time. Isolation Forest flags subtle drift once deviation exceeds -5% (Anomaly Score climbs to 0.72).";
      for (let i = 0; i < 20; i++) {
        // Linearly decline production from 12500 down to 11800
        const declineAmt = (i / 20) * 700;
        const prod = Math.round(12500 - declineAmt + (Math.random() - 0.5) * 80);
        const score = i < 8 ? 0.12 + (i * 0.04) : 0.45 + ((i - 8) * 0.035);
        datapoints.push({
          timestamp: makeTime(i * 10),
          assetId: "MH-07",
          production: prod,
          forecast: 12500,
          anomalyScore: parseFloat(Math.min(0.92, score).toFixed(2)),
          status: score > 0.85 ? 'CRITICAL' : 'NORMAL'
        });
      }
      break;

    case "valve_failure":
      description = "Sudden choke valve control error or safety system lockdown on the flowline manifold.";
      expectedOutcome = "Immediate drop in yield from 12.5k down to 6k. System triggers immediate flash visual alert, anomaly score spikes to 0.99.";
      for (let i = 0; i < 20; i++) {
        const isFailed = i >= 8;
        const prod = isFailed 
          ? 6100 + Math.round((Math.random() - 0.5) * 150)
          : 12500 + Math.round((Math.random() - 0.5) * 80);
        const score = isFailed ? 0.99 : parseFloat((0.05 + Math.random() * 0.06).toFixed(2));
        datapoints.push({
          timestamp: makeTime(i * 10),
          assetId: "MH-07",
          production: prod,
          forecast: 12500,
          anomalyScore: score,
          status: isFailed ? 'CRITICAL' : 'NORMAL'
        });
      }
      break;

    case "volatility":
      description = "Severe slugging in multiphase pipeline flow causing erratic pressure oscillations at separators.";
      expectedOutcome = "High volatility in telemetry readings. Standard deviation exceeds normal parameters; model raises WATCH alerts.";
      for (let i = 0; i < 20; i++) {
        // High frequency sine oscillation representing slug flow
        const oscillation = Math.sin(i * 1.5) * 1600;
        const prod = Math.round(12500 + oscillation + (Math.random() - 0.5) * 200);
        const score = Math.abs(oscillation) > 1000 ? 0.78 : 0.32;
        datapoints.push({
          timestamp: makeTime(i * 10),
          assetId: "MH-07",
          production: prod,
          forecast: 12500,
          anomalyScore: score,
          status: score > 0.85 ? 'CRITICAL' : 'NORMAL'
        });
      }
      break;

    case "recovery":
      description = "Simulates successful gas lift optimization and well cleanup wash operation.";
      expectedOutcome = "Hydrocarbon stream volume climbs steadily, merging back into the expected forecast profile. Anomaly scores decay to normal.";
      for (let i = 0; i < 20; i++) {
        // Startup at 11300 and recover up to 12500
        const isRecovered = i >= 5;
        const recoveredAmt = isRecovered ? Math.min(1200, (i - 5) * 150) : 0;
        const prod = Math.round(11300 + recoveredAmt + (Math.random() - 0.5) * 60);
        const score = Math.max(0.08, 0.94 - (i * 0.075));
        datapoints.push({
          timestamp: makeTime(i * 10),
          assetId: "MH-07",
          production: prod,
          forecast: 12500,
          anomalyScore: parseFloat(score.toFixed(2)),
          status: score > 0.85 ? 'CRITICAL' : 'NORMAL'
        });
      }
      break;
  }

  return { description, expectedOutcome, datapoints };
};

// 7. Model Status & Diagnostics Metrics (Page 13)
export const mockModels: ModelHealth[] = [
  {
    id: "MOD-01",
    name: "Forecasting Engine",
    algorithm: "XGBoost + LSTM Ensemble",
    status: "OPERATIONAL",
    lastRun: "4m ago",
    nextRetrain: "2026-08-20 04:00 (Auto-queued)",
    mae: 12.4, // Mean Absolute Error
    rmse: 15.8,
    r2: 0.94,
    mape: 3.2, // Mean Absolute Percentage Error
    featuresUsed: 28
  },
  {
    id: "MOD-02",
    name: "Anomaly Detector",
    algorithm: "Isolation Forest",
    status: "OPERATIONAL",
    lastRun: "12h ago",
    nextRetrain: "2026-08-17 00:00 (Weekly Cron)",
    mae: 0.03, // represented as anomaly threshold mapping
    rmse: 0.05,
    r2: 0.91, // F1 Score mapped for standard layout compatibility
    mape: 1.8, // False alarm rate %
    featuresUsed: 14
  },
  {
    id: "MOD-03",
    name: "Loss Attribution Engine",
    algorithm: "SHAP (KernelExplainer)",
    status: "OPERATIONAL",
    lastRun: "Real-time",
    nextRetrain: "Continuous",
    mae: 0.08,
    rmse: 0.12,
    r2: 0.96,
    mape: 2.1,
    featuresUsed: 18
  },
  {
    id: "ENG-01",
    name: "Prioritization Engine",
    algorithm: "AIPS Decision Model",
    status: "OPERATIONAL",
    lastRun: "2s ago",
    nextRetrain: "Continuous",
    mae: 0.0,
    rmse: 0.0,
    r2: 0.98,
    mape: 0.0,
    featuresUsed: 8
  }
];

export const mockDataIngestionLog = [
  { timestamp: "17:25:45", log: "RCV: TELEMETRY_PKT_904A [WELL_42] → PROCESSED (4ms)" },
  { timestamp: "17:25:44", log: "RCV: TELEMETRY_PKT_9049 [PUMP_12] → PROCESSED (3ms)" },
  { timestamp: "17:25:41", log: "RCV: SENSOR_SYNC_B4 [FIELD_Z] → PROCESSED (12ms)" },
  { timestamp: "17:25:39", log: "ERR: CHECKSUM_FAIL [WELL_18] → RETRYING INGESTION" },
  { timestamp: "17:25:35", log: "RCV: TELEMETRY_PKT_9048 [WELL_03] → PROCESSED (5ms)" },
  { timestamp: "17:25:30", log: "SYS: RETRAINING PIPELINE SYNCED WITH MASTER DB" },
];

// 8. Data Provenance & Sources (Page 14)
export interface ProvenanceSource {
  name: string;
  description: string;
  url: string;
  category: 'REAL' | 'DERIVED' | 'SYNTHETIC';
  integrityScore: number;
  freshness: string;
  notes: string;
}

export const mockProvenanceSources: ProvenanceSource[] = [
  {
    name: "Open Government Data (OGD) Platform",
    description: "Official Ministry of Petroleum Crude Oil and Natural Gas Production statistics.",
    url: "https://data.gov.in",
    category: "REAL",
    integrityScore: 98.4,
    freshness: "Updated Monthly",
    notes: "Provides the historical production baselines from 2018-2024 to seed the initial trend distributions."
  },
  {
    name: "Petroleum Planning & Analysis Cell (PPAC)",
    description: "Monthly production reports, domestic consumption, and supply chain telemetry statistics.",
    url: "https://ppac.gov.in",
    category: "REAL",
    integrityScore: 99.1,
    freshness: "Updated Monthly",
    notes: "Used to train the core XGBoost Forecasting Canvas model for countrywide production forecasts."
  },
  {
    name: "Directorate General of Hydrocarbons (DGH)",
    description: "Annual reservoir study reports, decline curves, and production decline profiles of public fields.",
    url: "https://dghindia.gov.in",
    category: "REAL",
    integrityScore: 97.8,
    freshness: "Updated Annually",
    notes: "Provides the decline coefficients and decline curve parameters used in the expected yield curves."
  },
  {
    name: "Derived Feature Store",
    description: "Rolling moving averages, water cuts, pressure gradients, and bottom hole flowing indicators.",
    url: "Internal Calculated",
    category: "DERIVED",
    integrityScore: 96.5,
    freshness: "Real-time stream calculated",
    notes: "Formulates SHAP explainability inputs by transforming high-frequency observations."
  },
  {
    name: "PetroPulse Synthetic Telemetry Generator",
    description: "Statistically-modeled data stream engine mimicking Mumbai High field physics.",
    url: "Simulation Engine",
    category: "SYNTHETIC",
    integrityScore: 100.0,
    freshness: "Simulated every 10 seconds",
    notes: "Allows judges to trigger controlled anomaly injections (pressure drops, valve fail) for live demo execution."
  }
];

// 9. Help & Domain Glossary Terms (Page 15)
export interface GlossaryTerm {
  term: string;
  definition: string;
  domain: string;
  impactContext: string;
}

export const mockGlossary: GlossaryTerm[] = [
  {
    term: "AIPS Score",
    definition: "Asset Intervention Priority Score. A composite metric ranging from 0 to 100 that ranks oil wells based on their economic yield recovery potential.",
    domain: "Asset Optimization",
    impactContext: "AIPS = (0.30 × Loss) + (0.25 × Anomaly) + (0.35 × Recovery) - (0.10 × Complexity). High AIPS indicates immediate target for field crew."
  },
  {
    term: "MMBL",
    definition: "Million Barrels of Liquid. A volume measurement standard in the energy sector for crude oil production estimation.",
    domain: "Production Accounting",
    impactContext: "Calculates the total potential yield recoverable over a forecast horizon (typically 12-month window)."
  },
  {
    term: "SHAP Values",
    definition: "SHapley Additive exPlanations. A game-theoretic approach that explains the output of any machine learning model by assigning attribution to individual features.",
    domain: "Explainable AI (XAI)",
    impactContext: "Quantifies why actual production deviated from the forecast (e.g. pressure drops accounts for -8.4% of total loss)."
  },
  {
    term: "Decline Curve",
    definition: "A mathematical fit modeling the natural depletion rate of reservoir pressure and fluid yield over time.",
    domain: "Reservoir Engineering",
    impactContext: "Helps models establish the 'Expected baseline' so operational anomalies can be measured cleanly."
  },
  {
    term: "Water Cut",
    definition: "The ratio of water produced compared to the total volume of liquid hydrocarbon streams extracted from the well.",
    domain: "Production Operations",
    impactContext: "High water cuts indicate well loading or zone watering, reducing net oil yield and requiring lift intervention."
  },
  {
    term: "SCADA",
    definition: "Supervisory Control and Data Acquisition. The hardware/software control system used to monitor and collect sensor readings at wellheads.",
    domain: "Field Automation",
    impactContext: "Feeds pressure, temp, flow, and choke size telemetry to the PetroPulse Ingestion Layer."
  }
];
