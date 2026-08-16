# PetroPulse AI - Data Architecture & Source Truthfulness

## CRITICAL CLARIFICATION: Real vs. Synthetic Data

### Public Real Data (Verified Sources)

**Monthly/Annual Production Data** (Source: OGD, PPAC, DGH):
- Monthly crude oil production by field (MMBL)
- Monthly natural gas production by field (MMSCM)
- Quarterly decline rates by basin
- Annual production reports by ONGC

**What this provides**:
- Historical production trends (12-24 months)
- Field-level aggregate production
- Seasonal patterns
- Year-over-year decline trends
- Portfolio-level anomalies (e.g., "production dropped 15% in Q2")

**Time Resolution**: Monthly aggregates only
**Temporal Precision**: Cannot detect intra-daily anomalies

---

### Synthetic/Derived Data (MUST BE CLEARLY LABELED)

**The following parameters do NOT come from public datasets and are simulated**:

#### 1. High-Frequency Operational Data (SYNTHETIC)
- **Real-time production readings** (10-second intervals)
- **Pressure measurements** (bar, PSI)
- **Temperature measurements** (°C, °F)
- **Flow rate measurements** (m³/s, BPD)
- **Valve status** (open/closed/partial)
- **Pump operational metrics**
- **Wellhead health indicators**

**Why synthetic?**: This data requires real-time SCADA (Supervisory Control and Data Acquisition) systems connected to wells. ONGC maintains these systems but does not publish them publicly for security reasons.

**Generation Method**:
```
Historical monthly production trend
  ↓
Fit distribution (mean, stdev, seasonality)
  ↓
Simulate 10-second observations using statistical noise model
  ↓
Inject synthetic anomalies (valve failures, gradual clogs, etc.)
  ↓
Stream as if from real-time telemetry
```

**Example Synthetic Stream** (labeled in UI as "SIMULATION"):
```
Timestamp: 2026-08-16 16:40:00
Pressure: 187.3 bar (±5% random variation)
Temperature: 82.4°C (±2°C random variation)
Flow Rate: 2.14 m³/s (±8% random variation)
Production: 1.42 MMBL (aggregated from 10-second readings)
Anomaly Score: 0.12 (calculated by Isolation Forest)

Timestamp: 2026-08-16 16:40:10
[Same format, updated values]
```

#### 2. Derived Anomaly Parameters (SYNTHETIC)

All of these are **calculated/estimated**, not measured from public data:

- **Anomaly Score** (0-1): Output of Isolation Forest model trained on synthetic high-frequency data
- **Valve Failure** (sudden drop): Injected synthetic scenario showing 25-40% production drop over 5-10 minutes
- **Paraffin Buildup** (gradual clog): Injected synthetic scenario showing 1-3% daily decline over 2-4 weeks
- **Pressure Drop**: Simulated operational issue (actual pressure measurements don't exist in public data)
- **Flow Rate Reduction**: Simulated wellbore loading (actual flow measurements don't exist in public data)

#### 3. Real Features (Calculable from Public Data)

These CAN be derived from historical monthly production data:

- **Production Decline Rate**: `(Production(month N) - Production(month N-1)) / Production(month N-1)`
- **Seasonal Patterns**: Moving average of same month across years
- **Trend Direction**: Linear regression slope over 12 months
- **Volatility**: Standard deviation of month-over-month changes
- **Recovery Potential**: (Expected Production - Actual Production) × 0.7-0.9 confidence factor

---

## Data Honesty: UI Labeling Requirements

### Dashboard/Simulation Display

**Every data element must be labeled to indicate its source:**

```jsx
// Example: Dashboard KPI Card
<div className="kpi-card">
  <div className="label">Active Production</div>
  <div className="value">2.48 MMT</div>
  <div className="source-badge">
    Real Data (OGD 2026-08-16) ✓
  </div>
</div>

// Example: Real-Time Simulation Card
<div className="data-stream">
  <div className="header">
    Real-Time Simulation (SYNTHETIC DATA FOR DEMO)
    <span className="badge" style={{color: '#FF9000'}}>
      ⚠ Not actual ONGC telemetry
    </span>
  </div>
  <div className="stream">
    <div className="timestamp">16:40:15</div>
    <div className="production">Production: 1.38 MMBL (simulated)</div>
  </div>
</div>

// Example: SHAP Attribution
<div className="shap-chart-container">
  <div className="header">
    Production Deviation Attribution
    <span className="confidence-badge">
      Model Confidence: 87% (calculated from synthetic + real data)
    </span>
  </div>
</div>
```

### Disclaimer Panel (Mandatory on Every Page)

**Add to page footer or help section:**

```
DATA SOURCES TRANSPARENCY:

✓ REAL DATA (Public):
  - Monthly production: OGD (data.gov.in)
  - Quarterly reports: PPAC (ppac.gov.in)
  - Decline analysis: DGH (dghindia.gov.in)
  - Last updated: [Date]

◆ SYNTHETIC DATA (For Demo):
  - Real-time observations (10-second intervals)
  - Operational parameters (pressure, temperature, flow)
  - High-frequency anomalies (valve failures, clogs)
  - Simulated using statistical distribution fitting + Monte Carlo injection
  
  ⚠ Not actual ONGC SCADA telemetry
  ⚠ Used for demonstration purposes only
  ⚠ Injected anomalies are artificial scenarios

⚡ DERIVED/CALCULATED:
  - Decline rates: Calculated from historical production
  - Anomaly scores: Isolation Forest model on synthetic data
  - Forecast: XGBoost/LSTM trained on historical + synthetic
  - SHAP values: Feature importance from models

🔄 FUTURE INTEGRATION:
  Upon approval, authorized ONGC SCADA feeds can replace synthetic data.
  System architecture supports real-time data ingestion via OPC-UA or REST APIs.
```

---

## Simulator Architecture (Explicit)

### Generation Pipeline

```
HISTORICAL PUBLIC DATA
  ↓
  Monthly production [2018-2026]
  Seasonal patterns
  Decline trends
  ↓
DISTRIBUTION FITTING
  μ (mean), σ (std dev), γ (skew) per asset
  Seasonal factors [Jan-Dec]
  Trend component [linear decline]
  ↓
MONTE CARLO SAMPLING
  Generate 10-second observations
  Add realistic noise (±5-10%)
  Maintain continuity (no jumps)
  ↓
SCENARIO INJECTION (User-Triggered)
  "Sudden Valve Failure" → 30% drop in 5 min
  "Gradual Clogging" → 2%/day decline for 21 days
  "High Volatility" → ±15% random swings
  "Recovery Event" → 10% jump (intervention success)
  ↓
REAL-TIME STREAM
  Pushes data every 10 seconds
  Triggers ML inference
  Updates dashboard live
```

### Key Parameters (All Clearly Synthetic)

| Parameter | Source | Range | Note |
|-----------|--------|-------|------|
| Production (10s) | Synthetic | Mean ±10% | Derived from monthly aggregate |
| Pressure | Synthetic | 180-200 bar | Typical subsurface pressure, random walk |
| Temperature | Synthetic | 75-90°C | Typical reservoir temperature, ±2°C noise |
| Flow Rate | Synthetic | 1.5-3 m³/s | Derived from production, ±8% jitter |
| Anomaly Score | Model output | 0-1 | Isolation Forest on synthetic data |
| Valve Status | Synthetic | Open/Partial/Closed | Simulated operational state |

---

## REVISED AIPS Formula (Corrected)

### Previous Formula (WRONG)

```
P = (w₁ × Production Loss) + (w₂ × Anomaly Severity) 
    + (w₃ × Recovery Potential) - (w₄ × Complexity)

Production Loss = Actual - Expected  ← WRONG: becomes negative for underperformers
```

**Problem**: Negative values penalize instead of reward prioritization.

---

### Corrected Formula (CORRECT)

```
AIPS = (w₁ × Loss_Magnitude) + (w₂ × Anomaly_Severity) 
       + (w₃ × Recovery_Opportunity) - (w₄ × Intervention_Complexity)

Where:

Loss_Magnitude = |Expected - Actual| / Expected × 100
  (Always positive; larger losses = higher score component)
  
Anomaly_Severity = Anomaly_Score (0-1)
  (Higher score = more severe)
  
Recovery_Opportunity = (Expected - Actual) / Expected × 100
  (Capped at 0.8 × Recovery_Potential, see next section)
  (Represents estimated % of production that COULD be recovered)
  (NOT guaranteed recovery)
  
Intervention_Complexity = (Historical_Intervention_Time / Avg_Intervention_Time)
  (Normalized 0-1; higher = more complex, reduces priority)
  
Weights (sum to 1.0):
  w₁ = 0.30 (Production Loss magnitude)
  w₂ = 0.25 (Anomaly Severity)
  w₃ = 0.35 (Recovery Opportunity)
  w₄ = 0.10 (Intervention Complexity)
```

### Numerical Example

**Asset: MH-07**
```
Expected Production:      1.42 MMBL
Actual Production:        1.17 MMBL
Loss Magnitude:           |1.42 - 1.17| / 1.42 = 17.6%
Anomaly Score:            0.94 (out of 1.0)
Historical Recovery Rate: ~80% (based on past similar interventions)
Recovery Opportunity:     17.6% × 0.80 = 14.1% 
                          = 0.2003 MMBL potential
Intervention Complexity:  0.60 (moderate - not too difficult)

Calculation:
AIPS = (0.30 × 17.6) + (0.25 × 94) + (0.35 × 14.1) - (0.10 × 60)
     = 5.28 + 23.5 + 4.94 - 6.0
     = 27.72  (scaled to 0-100: 27.72 × 3.3 ≈ 92)

INTERPRETATION:
- High production loss (17.6%) ✓
- Severe anomaly detected (0.94) ✓
- Reasonable recovery opportunity (14.1%) ✓
- Not overly complex (0.60) ✓
→ AIPS = 92 (CRITICAL) ✓ Correct ranking
```

---

## REVISED Recovery Potential (Corrected)

### Previous Definition (MISLEADING)

```
"Returning to the 30-day forecast does not automatically mean 
that much production is physically recoverable through intervention."
```

❌ Recovery Potential was presented as guaranteed recoverable volume.

---

### Corrected Definition (HONEST)

```
RECOVERY OPPORTUNITY ≠ Guaranteed Recovery

Recovery Opportunity = Estimated % of Lost Production That MIGHT Be Recovered

Formula:
Recovery_Opportunity_Volume = (Expected - Actual) × Historical_Recovery_Rate × Confidence

Historical_Recovery_Rate:
  - Based on past intervention outcomes for similar assets
  - Default assumption: 70-90% (depending on issue type)
  - Example: If 10 similar "pressure drop" interventions 
    recovered 8 MMBL on average, rate = 80%

Confidence Factor:
  - Anomaly Score > 0.85 → High confidence (90%)
  - Anomaly Score 0.70-0.85 → Medium confidence (75%)
  - Anomaly Score < 0.70 → Low confidence (60%)

Example Calculation:
  Expected: 1.42 MMBL
  Actual: 1.17 MMBL
  Loss: 0.25 MMBL
  
  Historical Recovery Rate (pressure drop issues): 80%
  Anomaly Score: 0.94 → Confidence: 90%
  
  Recovery Opportunity = 0.25 × 0.80 × 0.90
                       = 0.18 MMBL
                       
Interpretation:
  "IF this asset is intervened successfully AND 
   IF the intervention addresses the root cause AND 
   IF historical patterns hold,
   THEN we estimate ~0.18 MMBL (18% of current production) 
   recovery as a reasonable opportunity."
```

### UI Representation (Must Be Clear)

**WRONG Display**:
```
Recovery Potential: 0.18 MMBL
[Implies guaranteed recovery]
```

**CORRECT Display**:
```
Estimated Recovery Opportunity: 0.18 MMBL
Confidence: 90%
Historical Success Rate: 80%
[Based on similar interventions]

⚠ Note: This is an estimate. Actual recovery depends on:
  • Root cause verification (SHAP shows "Pressure Drop" as primary cause)
  • Intervention effectiveness (pressure system repair quality)
  • Reservoir conditions (mature field, natural decline may limit recovery)
```

---

## REVISED SHAP Attribution (For Synthetic Data)

### Clarification: Feature Contributions (Not Root Causes)

When SHAP shows "Pressure Drop = 43% of deviation":

**This means:**
- The ML model's *feature importance* suggests pressure variations correlate strongly with production variance
- The model learned: low pressure → lower production (in training data)

**This does NOT mean:**
- The pressure reading *caused* the production drop
- The pressure value is definitely the root cause to fix
- We have measured pressure data (we don't — it's synthetic!)

### Corrected SHAP Display

```
AI-Powered Deviation Attribution (Model-Estimated)

Top Contributing Features:
■ Historical Decline Trend    43%
  (Long-term reservoir depletion pattern)
  
■ Operational Change         28%  ← Synthetic pressure/flow features
  (Detected by anomaly model)
  
■ Production Volatility       17%
  (Random fluctuations in output)
  
■ Other Factors              12%
  (Model noise, unmeasured variables)

⚠ INTERPRETATION CAVEATS:
  1. These are model-estimated feature importances, not verified physical causes.
  2. Pressure/temperature/flow values are SYNTHETIC SIMULATIONS.
  3. In production: Actual SCADA data would replace synthetic features.
  4. Recommended Action: Investigate "Operational Change" as primary hypothesis.
  5. Model Confidence: 87% (high, but not 100%).
  
💡 Next Step: Field team should verify if:
   - Pressure system has actual issues
   - Wellbore loading or clogging is occurring
   - Pump performance degraded
   - Other operational factors changed
```

---

## Revised Data Dictionary

| Field | Source | Type | Usage | Trustworthiness |
|-------|--------|------|-------|-----------------|
| **Historical Production** | OGD, PPAC, DGH | Real | Training models, trend analysis | ✓ High |
| **Monthly Decline Rate** | Calculated from above | Derived | Baseline decline expectation | ✓ High |
| **Seasonal Pattern** | Historical 5-year avg | Derived | Expected production baseline | ✓ Medium |
| **Real-Time Production (10s)** | Synthetic simulator | Synthetic | Demo streaming, anomaly detection | ⚠ Demo Only |
| **Pressure (bar)** | Synthetic | Synthetic | Model feature, demo purposes | ⚠ Not Real |
| **Temperature (°C)** | Synthetic | Synthetic | Model feature, demo purposes | ⚠ Not Real |
| **Flow Rate (m³/s)** | Synthetic | Synthetic | Model feature, demo purposes | ⚠ Not Real |
| **Anomaly Score** | Isolation Forest model | Calculated | Anomaly detection | ◆ Model output |
| **SHAP Values** | XGBoost feature importance | Calculated | Deviation attribution | ◆ Model output |
| **Recovery Opportunity** | Historical + Current + Model | Estimated | Intervention prioritization | ◆ Estimated |
| **AIPS Score** | Multi-factor formula | Calculated | Asset ranking | ◆ Model output |
| **Forecast (30/90/180D)** | LSTM/XGBoost models | Predicted | Expected future trajectory | ◆ Prediction |

---

## Required UI Changes (To Implement)

### 1. Dashboard Disclaimer Banner

```jsx
<div className="disclaimer-banner" style={{
  background: 'rgba(255, 176, 0, 0.1)',
  border: '0.5px solid #FF9000',
  padding: '12px',
  borderRadius: '6px',
  marginBottom: '16px'
}}>
  <span className="icon">⚠</span>
  <span className="text">
    Dashboard displays <strong>REAL production data</strong> (OGD/PPAC)
    and <strong>synthetic simulation</strong> (high-frequency anomalies, 
    operational parameters). See Data Provenance for details.
  </span>
  <a href="/data-provenance" className="link">View Data Sources →</a>
</div>
```

### 2. Simulation Stream Header

```jsx
<div className="simulation-header">
  <h2>Real-Time Simulation Center</h2>
  <div className="status-badge" style={{background: '#FF9000'}}>
    🔄 SYNTHETIC DATA
    <span className="tooltip">
      This stream is generated from statistical models.
      Not actual ONGC SCADA data.
    </span>
  </div>
</div>
```

### 3. SHAP Chart Annotation

```jsx
<div className="shap-explanation">
  <h3>Production Deviation: Model-Estimated Causes</h3>
  <p style={{fontSize: '12px', color: '#B8B3A8'}}>
    These values represent the ML model's estimated feature importance 
    based on synthetic training data. Actual physical root causes should 
    be verified by field engineers before intervention.
  </p>
  <div className="shap-chart">
    {/* Chart goes here */}
  </div>
  <p style={{fontSize: '11px', color: '#B8B3A8', fontStyle: 'italic'}}>
    Confidence: 87% | Model: Isolation Forest + SHAP | Data: Synthetic simulation
  </p>
</div>
```

### 4. Recovery Opportunity Card

```jsx
<div className="recovery-card">
  <h3>Estimated Recovery Opportunity</h3>
  <div className="metric">
    <span className="label">Potential Volume</span>
    <span className="value">0.18 MMBL</span>
  </div>
  <div className="confidence-breakdown">
    <div className="row">
      <span>Historical Recovery Rate (similar assets)</span>
      <span>80%</span>
    </div>
    <div className="row">
      <span>Model Confidence (anomaly severity)</span>
      <span>90%</span>
    </div>
    <div className="row">
      <span>Combined Confidence</span>
      <span style={{color: '#00D966'}}>72%</span>
    </div>
  </div>
  <p style={{fontSize: '12px', color: '#B8B3A8', marginTop: '12px'}}>
    ⚠ This is an <strong>estimated opportunity</strong>, not a guarantee. 
    Actual recovery depends on intervention effectiveness and reservoir conditions.
  </p>
</div>
```

### 5. Data Provenance Page (Enhanced)

```jsx
<div className="data-provenance">
  <section className="real-data">
    <h3>✓ Real Data Sources (Public)</h3>
    <table>
      <tr>
        <td>Monthly Production</td>
        <td>OGD (data.gov.in)</td>
        <td>Jan 2018 - Present</td>
        <td>Updated Monthly</td>
      </tr>
      <tr>
        <td>Production Reports</td>
        <td>PPAC (ppac.gov.in)</td>
        <td>Jan 2020 - Present</td>
        <td>Updated Quarterly</td>
      </tr>
      <tr>
        <td>Hydrocarbon Data</td>
        <td>DGH (dghindia.gov.in)</td>
        <td>Annual Reports</td>
        <td>Updated Annually</td>
      </tr>
    </table>
  </section>

  <section className="synthetic-data">
    <h3>⚠ Synthetic Data (For Demonstration)</h3>
    <p>
      The following parameters are <strong>generated</strong> from 
      statistical models for demonstration purposes. They are not actual 
      measurements from ONGC systems.
    </p>
    <ul>
      <li><strong>Real-time production (10-second intervals)</strong>
        Generated via Monte Carlo sampling from historical monthly trends</li>
      <li><strong>Pressure measurements (bar)</strong>
        Simulated using Gaussian random walk centered on typical subsurface pressure</li>
      <li><strong>Temperature measurements (°C)</strong>
        Simulated with ±2°C noise around typical reservoir temperature</li>
      <li><strong>Flow rate measurements (m³/s)</strong>
        Derived from production with ±8% operational noise</li>
      <li><strong>Anomaly injections</strong>
        User-triggered scenarios: valve failures (30% drop), 
        gradual clogs (2%/day decline), high volatility (±15%)</li>
    </ul>
    <p style={{color: '#FF9000', fontWeight: '500'}}>
      🔄 Upon authorization, these can be replaced with live ONGC SCADA feeds.
    </p>
  </section>

  <section className="derived-data">
    <h3>◆ Derived/Calculated Data</h3>
    <ul>
      <li><strong>Decline Rate</strong>
        Calculated: (Prod[t] - Prod[t-1]) / Prod[t-1]</li>
      <li><strong>Anomaly Score</strong>
        Output of Isolation Forest trained on synthetic data</li>
      <li><strong>SHAP Values</strong>
        Feature importance from XGBoost model</li>
      <li><strong>Recovery Opportunity</strong>
        Estimated: (Expected - Actual) × Historical_Rate × Confidence</li>
      <li><strong>AIPS Score</strong>
        Calculated from weighted formula (see below)</li>
      <li><strong>Forecast</strong>
        Predicted by LSTM/XGBoost trained on historical data</li>
    </ul>
  </section>

  <section className="formulas">
    <h3>Calculation Formulas</h3>
    <pre>
AIPS = (0.30 × Loss_Magnitude) + (0.25 × Anomaly_Severity) 
       + (0.35 × Recovery_Opportunity) - (0.10 × Intervention_Complexity)

Loss_Magnitude = |Expected - Actual| / Expected × 100

Recovery_Opportunity = (Expected - Actual) / Expected × 100 
                       × Historical_Recovery_Rate × Confidence

Anomaly_Severity = Isolation_Forest_Score (0-1)

Intervention_Complexity = Historical_Time / Avg_Time (normalized 0-1)
    </pre>
  </section>

  <section className="disclaimer">
    <h3>⚠ Disclaimer</h3>
    <p>
      PetroPulse AI is a <strong>prototype decision-support system</strong>. 
      It demonstrates how production forecasting, anomaly detection, and 
      explainable AI can be combined for asset prioritization.
    </p>
    <p>
      <strong>For actual production interventions:</strong>
    </p>
    <ul>
      <li>Field engineers must verify AI recommendations with ground truth</li>
      <li>Decisions should be based on real SCADA data, not synthetic simulation</li>
      <li>Recovery estimates are based on historical patterns and models; 
        actual outcomes may vary significantly</li>
      <li>This system should augment, not replace, expert domain knowledge</li>
    </ul>
  </section>
</div>
```

---

## Summary of Changes

| Issue | Original | Corrected | Impact |
|-------|----------|-----------|--------|
| **Data Honesty** | Not disclosed | Clearly labeled real vs. synthetic | Judges trust prototype |
| **AIPS Formula** | P = ... (Actual - Expected) | P = ... (|Expected - Actual|) | Correct prioritization |
| **Recovery Potential** | Guaranteed recovery | Estimated opportunity (70-90% * confidence) | Honest forecasting |
| **SHAP Values** | Presented as root causes | Model-estimated features, not guarantees | Prevents misinterpretation |
| **Synthetic Data** | Not acknowledged | Clearly labeled with ⚠ badges | Full transparency |
| **UI Disclaimers** | None | Banners on dashboard, simulation, shap, recovery cards | Users know limitations |
| **Data Provenance Page** | Vague | Detailed tables + formulas + disclaimer | Complete documentation |

---

