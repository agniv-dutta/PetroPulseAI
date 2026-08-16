# PetroPulse AI - Frontend Specification & Page Architecture

## COLOR SCHEME SELECTION: BLACK EARTH / SIGNAL AMBER + THERMAL MAP

### Recommended Hybrid Palette
**Primary**: Black Earth/Signal Amber (operational backbone, professional energy industry)
**Secondary**: Thermal Map/Oxidized Copper (anomaly highlighting, risk visualization)

**Rationale**: 
- Black Earth = subsurface, data integrity, trust
- Signal Amber = production energy, operational focus
- Thermal Red/Orange = risk, anomalies (borrowed from Thermal Map)
- Acid Lime (from context) = AI intelligence signals

---

## COMPLETE PAGE STRUCTURE (15 Pages)

### TIER 1: MAIN NAVIGATION HUB (Entry Point)

**Page 1: Dashboard / Command Center**
- Portfolio health at-a-glance
- Key metrics: Total Assets, Active Production, Anomalies, Recovery Potential
- Production vs Expected trend (area chart)
- Asset map heatmap (India geospatial)
- Active anomalies widget
- System status bar
- Quick nav to Asset Leaderboard

---

### TIER 2: ASSET MANAGEMENT & INTELLIGENCE

**Page 2: Asset Leaderboard / Priority View**
- Sortable/filterable table
- Columns: Asset ID, Field, Basin, Current Production, Expected, Deviation, Decline Rate, Anomaly Severity, Recovery Potential, AIPS Score, Priority
- Color-coded priority badges (CRITICAL, HIGH, MEDIUM, LOW)
- Search bar (asset/basin/field)
- Filters panel (by priority, basin, status)
- Click row → opens Asset Detail

**Page 3: Asset Detail / Digital Asset Profile**
- Asset header (ID, location, basin, last update)
- Production Intelligence (actual vs expected chart, historical trend, forecast)
- Health Status (asset health score, anomaly status, deviation %)
- AI Analysis (SHAP contribution chart, recovery potential, AIPS breakdown)
- Timeline (important events: Normal → Decline Detected → Anomaly → Priority Raised)
- Action Panel (Investigate | Simulate Recovery | Add to Watchlist)

---

### TIER 3: FORECASTING & PREDICTION

**Page 4: Production Forecasting Canvas**
- Large chart area: Historical Actual | Model Expected | Forecast Future
- Uncertainty band (confidence interval)
- Anomaly regions highlighted
- Forecast horizon selector (30D, 90D, 180D, 365D)
- Model info card (Model: XGBoost/LSTM, MAE, RMSE, Last Updated)
- Comparison metrics table

**Page 5: Forecast Details & Model Performance**
- Forecast accuracy metrics (MAE, RMSE, R², MAPE)
- Historical forecast accuracy chart (confidence over time)
- Model retraining schedule
- Forecast breakdown by basin/field
- Feature importance for forecasting

---

### TIER 4: ANOMALY DETECTION & DIAGNOSIS

**Page 6: Anomaly Detection Center**
- Active anomalies list (sortable, filterable)
- Severity levels: NORMAL, WATCH, HIGH, CRITICAL
- Card per anomaly: Asset, Production Deviation %, Anomaly Score, Detection Time
- Production graph with anomaly region highlighted
- Anomaly timeline (when detected, duration, status)
- Related assets (cross-anomaly detection)

**Page 7: Deviation Attribution / Loss Analysis**
- Production deviation overview (Expected vs Actual gap)
- Horizontal contribution chart (SHAP values):
  - Historical decline %
  - Operational change %
  - Production volatility %
  - Other contributors %
- Recovery potential estimate
- Comparison: Expected | Actual | Gap | Recovery
- Model confidence metrics

**Page 8: Root Cause Analysis (Explainability Dashboard)**
- SHAP waterfall chart (feature contribution breakdown)
- Model-estimated feature contributions (visual + numeric)
- Pressure, Temperature, Flow Rate contribution analysis
- Seasonal factors, reservoir decline trends
- Confidence intervals for each contribution
- What-if scenarios (if X changed by 10%, production would be Y)

---

### TIER 5: DECISION SUPPORT & PRIORITIZATION

**Page 9: Intervention Priority / Decision Panel**
- Asset highlight card (ID, Location, Basin)
- Priority Score (AIPS) with breakdown formula
- Severity indicators (Production Loss, Anomaly, Recovery Potential, Complexity)
- Recommended action (Investigate | High Priority | Schedule Intervention)
- Why this asset ranks high (bullet points with scores)
- Similar past cases (optional)
- Next steps & resource allocation suggestion

**Page 10: Recovery Scenario & What-If Analysis**
- Current production (actual)
- Scenario selector: Recovery +10% | +20% | +30% | Custom
- Projected production (if recovered)
- Potential recovery volume (MMBL)
- Time to recover estimate
- Resource required estimate
- Impact on portfolio KPIs

---

### TIER 6: REAL-TIME SIMULATION & DEMO

**Page 11: Real-Time Simulation Center**
- Large streaming data display
- Controls: Play | Pause | Reset
- Speed multiplier: 1× | 5× | 10×
- Asset selector dropdown
- Incoming observation stream:
  - Timestamp
  - Asset ID
  - Production value
  - Model prediction
  - Anomaly score
  - Status (Normal/Alert/Critical)
- Live metrics update (as simulation progresses)
- Anomaly detection trigger moment (visual highlight)

**Page 12: Scenario Injection Controls**
- Scenario buttons:
  - Normal Production
  - Gradual Decline
  - Sudden Production Drop
  - High Volatility
  - Recovery After Intervention
- Trigger injection button
- Show scenario description & expected outcome
- Streaming data responds live to scenario
- Dashboard updates in real-time
- Anomaly detection fires visibly

---

### TIER 7: SYSTEM & META INFORMATION

**Page 13: AI Intelligence Panel / Model Status**
- Forecasting Module (XGBoost status, active/inactive, last run time)
- Anomaly Detection Module (Isolation Forest status, active/inactive)
- Attribution Module (SHAP status, active/inactive)
- Prioritization Engine (AIPS Decision Logic status, active/inactive)
- System status: OPERATIONAL | DEGRADED | OFFLINE
- Data stream status: ACTIVE | PAUSED | SIMULATION
- Last model update timestamp
- Next scheduled update

**Page 14: Data Provenance & Dataset Information**
- Real Data Sources (OGD, ONGC datasets, DGH, PPAC with links)
- Derived Data (features calculated from historical production)
- Synthetic Data (used for simulation/demo only)
- Future Integration (Authorized ONGC feeds, SCADA, API)
- Data freshness (last updated timestamp)
- Data quality metrics
- Attribution & disclaimers

**Page 15: Help & Domain Glossary**
- Glossary of terms:
  - Production, Reservoir, Well, Asset, Decline, Anomaly
  - Recovery Potential, AIPS, SCADA, MMbl, Decline Rate, etc.
- Quick start guide
- Demo navigation tips
- FAQ section
- Contact/support info

---

## NAVIGATION STRUCTURE

```
HOME (Dashboard/Command Center)
├── ASSETS
│   ├── Asset Leaderboard
│   └── Asset Detail [Drill-down]
├── INTELLIGENCE
│   ├── Production Forecasting
│   ├── Forecast Details
│   ├── Anomaly Detection Center
│   ├── Deviation Attribution
│   ├── Root Cause Analysis
│   └── Intervention Priority
├── SCENARIOS
│   ├── Recovery What-If
│   ├── Real-Time Simulation
│   └── Scenario Injection
├── SYSTEM
│   ├── AI Model Status
│   ├── Data Provenance
│   └── Help & Glossary
```

---

## GOLDEN DEMO PATH (5-Minute Flow)

1. **OPEN Command Center** → Portfolio health visible
2. **VIEW Leaderboard** → MH-07 at top (CRITICAL)
3. **SELECT Asset** → Asset Detail opens
4. **EXAMINE Forecast** → Forecast Canvas shows actual vs expected divergence
5. **INSPECT Anomaly** → Anomaly Detection triggered (production drop visible)
6. **ANALYZE Attribution** → SHAP chart shows "Pressure Drop" as top contributor
7. **REVIEW Priority** → Decision Panel shows AIPS increased to 92
8. **TRIGGER Simulation** → Start real-time stream
9. **INJECT Anomaly** → Scenario "Gradual Decline" triggered
10. **WATCH Detection** → System detects anomaly live on stream
11. **OBSERVE Priority Change** → Asset moves to Rank #2
12. **VIEW Recovery Potential** → What-if shows +15% recovery = +0.18 MMBL
13. **CHECK System Status** → All modules operational
14. **END with Impact** → Portfolio recovery potential highlighted

---

## WIREFRAME PRIORITY & BUILD ORDER

### Phase 1 (MUST - Core Demo Loop)
1. Dashboard / Command Center
2. Asset Leaderboard
3. Asset Detail
4. Production Forecasting Canvas
5. Anomaly Detection Center
6. Deviation Attribution / SHAP Chart
7. Real-Time Simulation Center
8. Scenario Injection

### Phase 2 (SHOULD - Decision Support)
9. Intervention Priority / Decision Panel
10. Recovery What-If Analysis
11. AI Model Status Panel
12. Data Provenance

### Phase 3 (NICE-TO-HAVE)
13. Root Cause Analysis (deep dive)
14. Forecast Details & Model Performance
15. Help & Glossary

---

## KEY VISUAL ELEMENTS BY PAGE

| Page | Primary Chart | Secondary Element | Interaction |
|------|---------------|-------------------|-------------|
| Dashboard | Area chart (Actual vs Expected) | Heatmap (geospatial) | Click asset → Leaderboard |
| Leaderboard | Table (sortable/filterable) | Priority badges | Click row → Asset Detail |
| Asset Detail | Line chart (trend) + Forecast | SHAP bar chart | Timeline hover, tabs |
| Forecasting | Multi-series line (historical, expected, forecast) | Uncertainty band | Horizon selector (30/90/180/365D) |
| Anomaly Center | Card list (anomalies) | Production graph | Click card → expand details |
| Attribution | Horizontal bar chart (SHAP) | Waterfall (optional) | Hover for values |
| Decision Panel | KPI cards (AIPS, Severity, Recovery) | Recommendation text | Action buttons |
| Simulation | Data stream (table) | Live metrics | Play/Pause/Reset controls |
| Scenario | Button grid (scenarios) | Injection trigger | Click scenario → simulate |
| Status Panel | Module status cards | System health gauge | Refresh button |
| Provenance | Data source list | Links to original datasets | Copy dataset link |
| Glossary | Term definitions | Search/filter | Click term → definition |

---

## RESPONSIVE DESIGN NOTES

- **Desktop** (1920px): Full 2-3 column layouts, large charts, all elements visible
- **Tablet** (1024px): 2-column layouts, collapsible panels, stacked charts
- **Mobile** (375px): Single column, drawer navigation, mobile-optimized charts

---

## ACCESSIBILITY & USABILITY

- Color-blind safe palette (avoid red-green only distinction; use labels)
- ARIA labels for all interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Dark theme (reduces eye strain in 24/7 ops centers)
- Tooltips for domain-specific terms
- Consistent icon usage (hazard icons for alerts, checkmarks for stable)

---

## DUMMY DATA REQUIREMENTS

### Asset Inventory
- 5–10 primary assets (MH-07, CB-12, KG-05, AS-09, etc.)
- Basins: Mumbai High, Cauvery, Krishna-Godavari, Assam-Arakan
- Production range: 0.5–2.5 MMBL

### Time Series Data
- Historical: 12–24 months
- Forecast: 30/90/180/365 day horizons
- Simulation: 100+ datapoints at 10-second intervals

### Anomaly Scenarios
- Gradual decline (pressure drop)
- Sudden drop (valve failure)
- High volatility (flow instability)
- Recovery (intervention success)

### Model Metrics
- Forecasting: MAE ~0.08 MMBL, RMSE ~0.12, R² ~0.92
- Anomaly: Precision ~0.89, Recall ~0.91, F1 ~0.90
- AIPS: 0–100 scale, weighted by loss + severity + recovery

---

## FILE STRUCTURE (Figma/Google Stitch)

```
PetroPulse AI Prototype
├── 1. Command Center (Dashboard)
├── 2. Asset Leaderboard
├── 3. Asset Detail
├── 4. Forecasting Canvas
├── 5. Anomaly Detection
├── 6. Deviation Attribution
├── 7. Decision Panel
├── 8. Simulation Center
├── 9. Scenario Injection
├── 10. Recovery What-If
├── 11. Model Status
├── 12. Data Provenance
├── 13. Root Cause Analysis
├── 14. Forecast Details
└── 15. Help & Glossary

[Each page = 1 artboard in Figma, 1 frame in Stitch]
```

---

## NEXT STEPS

1. **Design in Google Stitch** (create all 15 page wireframes/mockups)
2. **Export page images** (one per page)
3. **Create IDE prompts** (one per page, referencing the image)
4. **Generate React components** (using Claude + IDE)
5. **Integrate dummy data** (mock API endpoints)
6. **Deploy prototype** (Vercel/Netlify)

