# PetroPulse AI Frontend - Executive Summary & Quick Reference

---

## WHAT YOU'RE BUILDING

A **React-based operations command center** for hydrocarbon production intelligence. The prototype demonstrates the complete AI-driven pipeline:

```
Observe (Incoming Data) → Forecast (XGBoost/LSTM) → Detect (Anomaly) 
→ Explain (SHAP) → Prioritize (AIPS) → Simulate (Live Stream) → Act (Decision Panel)
```

**5-Minute Demo Path**: Dashboard → Leaderboard → Asset Detail → Forecast → Anomaly → SHAP Attribution → Decision Panel → Simulation → Scenario Inject → Real-Time Anomaly Detection

---

## COLOR SCHEME: BLACK EARTH + THERMAL MAP

**Choose This Combination** (recommended):
- **Primary**: Black Earth / Signal Amber (#080909 bg, #FF9000 accent)
- **Secondary**: Thermal Map elements (#FF3B3B for critical risks)
- **AI Accent**: Acid Lime (#C7F700) for intelligence signals
- **Success**: Green (#00D966) for recovery potential

| Element | Color | Usage |
|---------|-------|-------|
| Background (Primary) | #080909 | Main page background |
| Surface (Elevated) | #1A1D1F | Cards, panels, elevated surfaces |
| Accent (Energy) | #FF9000 | Production metrics, primary buttons |
| Accent (Risk) | #FF3B3B | Anomalies, critical alerts, risks |
| Accent (AI) | #C7F700 | Forecasts, model outputs, intelligence |
| Accent (Success) | #00D966 | Recovery, positive indicators |
| Text (Primary) | #F3EFE4 | Main text, readability |
| Text (Secondary) | #B8B3A8 | Muted text, labels |
| Border | #2A2D30 | Subtle dividers |

**Why This Works**: 
- Industrial aesthetic (energy operations center)
- High contrast (accessibility)
- No generic SaaS look (judges notice immediately)
- Dark theme (24/7 ops center reality)

---

## 15-PAGE ARCHITECTURE

### MVP Tier (MUST BUILD - 5 pages)

**Page 1: Command Center**
- Portfolio health KPIs (128 assets, 98 active, 11 at risk)
- Production vs Expected area chart
- Asset distribution heatmap
- Active anomalies widget
- Quick navigation to Leaderboard

**Page 2: Asset Leaderboard**
- Sortable/filterable table (all 128 assets)
- Columns: ID, Field, Basin, Current, Expected, Deviation, Decline, Anomaly, Recovery, AIPS, Priority
- Click row → Asset Detail
- Primary filtering by AIPS score

**Page 3: Asset Detail**
- Tabbed interface (Production | Health | AI Analysis)
- Historical + forecast chart
- Asset health gauge
- SHAP contribution chart
- AIPS breakdown
- Timeline of important events
- Action buttons (Investigate, Simulate, Watchlist)

**Page 6: Anomaly Detection Center**
- Card list of active anomalies
- Severity-coded badges (CRITICAL | HIGH | WATCH | NORMAL)
- Mini production chart per anomaly
- Click → expand or navigate to Deviation Attribution

**Page 7: Deviation Attribution**
- Horizontal SHAP bar chart (feature contributions)
- Expandable feature details
- Expected vs Actual summary
- Recovery potential estimate
- Model confidence metrics

### Secondary Tier (SHOULD BUILD - 5 pages)

**Page 4: Forecasting Canvas**
- Multi-series chart (Actual | Expected | Forecast)
- Uncertainty bands
- Horizon selector (30D, 90D, 180D, 365D)
- Model info card (MAE, RMSE, R²)
- Comparison table by horizon

**Page 9: Intervention Priority**
- AIPS score display (circular gauge)
- Component breakdown (Production Loss, Anomaly, Recovery, Complexity)
- Why-this-asset-ranks-high (bullet points)
- Recommended action (Prioritize for Investigation)
- Risk factors and considerations

**Page 11: Real-Time Simulation Center**
- Play/Pause/Reset controls + speed multiplier
- Asset selector
- Data stream table (Timestamp, Asset, Production, Forecast, Anomaly Score, Status)
- Live metrics updating
- Anomaly trigger moment (visual highlight)

**Page 12: Scenario Injection**
- Button grid (Normal, Gradual Decline, Sudden Drop, Volatility, Recovery)
- Inject button → triggers synthetic data
- Dashboard updates live
- Anomaly detection fires visibly

**Page 13: Model Status Panel**
- 4 module cards (Forecasting, Anomaly, Attribution, Prioritization)
- Each shows: model name, status, last run, next run
- System status gauge
- Data stream status
- Performance trends

### Tertiary Tier (NICE-TO-HAVE - 5 pages)

- **Page 5**: Forecast Details & Model Performance (accuracy trends, retraining, feature importance)
- **Page 8**: Root Cause Analysis (deep dive into specific factors)
- **Page 10**: Recovery What-If Scenario (recovery +10%/20%/30% impacts)
- **Page 14**: Data Provenance (source transparency, data quality)
- **Page 15**: Help & Glossary (domain terms, FAQ, quick start)

---

## DEVELOPMENT WORKFLOW (TL;DR)

1. **Design (Figma/Google Stitch)**: Create all 15 page mockups → Export screenshots
2. **Prompts**: Use templates from `github_and_prompts.md` + attach screenshots → Create 15 IDE prompts
3. **Generate**: Feed prompts to Claude IDE one-by-one → Generate 15 React components
4. **Integrate**: Wire components into React Router, add dummy data, test navigation
5. **Polish**: Charts, state management, responsive design, dark theme
6. **Test**: Golden path (15-step flow), accessibility, performance, cross-browser
7. **Deploy**: GitHub + Vercel/Netlify

**Timeline**: 32-42 hours full build | ~24 hours if MVP-only (5 pages + critical paths)

---

## DUMMY DATA STRUCTURE

All data is hardcoded in components (no API calls):

```typescript
// 5 Example Assets (you need 128)
const assets = [
  {
    id: "MH-07",
    field: "Mumbai High",
    basin: "Arabian Sea",
    current_production: 1.17,      // MMBL
    expected_production: 1.42,
    deviation: -17.4,              // %
    anomaly_severity: "CRITICAL",  // or HIGH, WATCH, NORMAL
    recovery_potential: 1.24,      // MMBL
    aips_score: 92,                // 0-100
    priority: "CRITICAL",          // or HIGH, MEDIUM, LOW
    health_score: 68,              // 0-100
    decline_rate: 2.3,             // % per month
  },
  // ... 127 more assets
];

// Time series (historical production for 24 months)
const timeseries = [
  { date: "2024-01-01", asset_id: "MH-07", actual: 1.95, expected: 2.05 },
  { date: "2024-01-08", asset_id: "MH-07", actual: 1.92, expected: 2.03 },
  // ... 104 more weeks
];

// Forecasts
const forecasts = {
  "MH-07": {
    horizon_30d: 1.21,  // MMBL
    horizon_90d: 1.24,
    horizon_180d: 1.28,
    horizon_365d: 1.35,
    confidence: 0.87,   // 0-1
  }
};

// Anomalies
const anomalies = [
  {
    id: "AN001",
    asset_id: "MH-07",
    severity: "CRITICAL",
    deviation: -17.4,
    anomaly_score: 0.94,  // 0-1, higher = more severe
    detected_at: "2026-08-16T16:42:07Z",
  }
];

// SHAP Values (feature attribution)
const shap = {
  "MH-07": [
    { feature: "Historical Decline", value: -7.4, percentage: 43 },
    { feature: "Operational Change", value: -4.8, percentage: 28 },
    { feature: "Production Volatility", value: -2.9, percentage: 17 },
    { feature: "Other", value: -2.1, percentage: 12 },
  ]
};

// Simulation stream (100+ datapoints)
const simulationStream = [
  { ts: "16:40:00", production: 1.42, forecast: 1.40, anomaly_score: 0.12 },
  { ts: "16:40:10", production: 1.41, forecast: 1.40, anomaly_score: 0.14 },
  { ts: "16:40:20", production: 1.40, forecast: 1.39, anomaly_score: 0.15 },
  { ts: "16:40:30", production: 0.98, forecast: 1.38, anomaly_score: 0.94 }, // Anomaly!
  // ... more data
];
```

---

## CRITICAL COMPONENTS (Reusable)

Build these once, use everywhere:

1. **KPICard**: Displays metric + label + trend
   ```tsx
   <KPICard label="Active Assets" value={98} trend={+2.3} icon={<Icon />} />
   ```

2. **StatusBadge**: Color-coded severity
   ```tsx
   <StatusBadge severity="CRITICAL" text="CRITICAL" />
   ```

3. **ProductionChart**: Area chart with Actual vs Expected
4. **ForecastChart**: Line chart with confidence band
5. **SHAPChart**: Horizontal bar chart for feature contributions
6. **AIPSGauge**: Circular gauge 0-100
7. **AnomalyHeatmap**: Geospatial India map
8. **SystemStatusBar**: Persistent top bar (PETROPULSE AI | ● OPERATIONAL | ...)

---

## JAVASCRIPT/TYPESCRIPT STACK

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.10.0",
    "recharts": "^2.8.0",
    "zustand": "^4.3.0",
    "lucide-react": "^0.263.0",
    "clsx": "^1.2.1"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0",
    "tailwindcss": "^3.3.0",
    "@tailwindcss/typography": "^0.5.0",
    "vite": "^4.3.0"
  }
}
```

**Key libraries**:
- **React Router**: Page navigation
- **Recharts**: Charts (area, line, bar, gauge, heatmap)
- **Zustand**: Lightweight state management (simulation state, filters)
- **Lucide React**: Icons (production, alert, checkmark, etc.)
- **Tailwind CSS**: Dark theme styling

---

## GITHUB REPOSITORY DESCRIPTION (298 chars)

```
PetroPulse AI: Integrated hydrocarbon production forecasting & 
intervention prioritization engine. Combines XGBoost/LSTM forecasting, 
Isolation Forest anomaly detection, and SHAP explainability to convert 
raw production data into prioritized asset intervention roadmaps. Built 
for SIH 2026.
```

---

## 5-MINUTE DEMO SCRIPT (For Judges)

> *"PetroPulse AI transforms reactive production monitoring into proactive decision support. Watch as the system takes in historical production data, builds a forecast, detects an anomaly in real-time, explains **why** the anomaly occurred using explainable AI, and then ranks that asset for intervention based on recovery potential.*
> 
> *We open the dashboard and immediately see portfolio health: 128 assets, 98 actively producing. But 11 are at risk, and 3 have active anomalies. We click into our Asset Leaderboard, sorted by our proprietary AIPS score—Asset Intervention Priority Score. At the top is MH-07, a Mumbai High asset with 92/100 AIPS.*
> 
> *Clicking into MH-07's profile, we see three critical insights: (1) Production has dropped 17.4% below expectation, (2) Our ML forecast shows the expected trajectory, and (3) Here's the key innovation—SHAP-based attribution analysis explains that this drop is due to 43% historical decline, 28% operational change, 17% volatility. Not just a red flag, but an explanation.*
> 
> *Next, we trigger our real-time simulation. Synthetic data streams in every 10 seconds. Watch the anomaly detection—there's the spike. System immediately flags it as CRITICAL. The dashboard reprioritizes MH-07 to Rank 1. Recovery potential jumps to 1.24 MMBL.*
> 
> *Finally, the decision panel: 'Prioritize for Investigation.' Why? Because we can recover significant production with moderate complexity. That's the core value—converting data into decisions."*

---

## SUCCESS CHECKLIST FOR HACKATHON JUDGES

✅ **Dashboard loads instantly** (no loading spinners)  
✅ **All 5 MVP pages work perfectly** (Dashboard, Leaderboard, Asset Detail, Anomaly, Attribution)  
✅ **Golden 15-step demo path completes in <5 minutes**  
✅ **Judges see the complete pipeline** (Data → Forecast → Anomaly → Explain → Prioritize → Act)  
✅ **SHAP chart is prominently displayed** (explainability is evident)  
✅ **AIPS scoring is transparent** (formula shown, components explained)  
✅ **Real-time simulation shows live anomaly detection** (not a static dashboard)  
✅ **Dark theme, industrial aesthetic** (not generic SaaS)  
✅ **Zero console errors** (DevTools clean)  
✅ **Mobile-responsive** (judges may test on iPad)  

---

## QUICK REFERENCE: FILE NAMING

Save all your work with consistent naming:

```
/designs/
  ├── 01_dashboard.png
  ├── 02_leaderboard.png
  ├── 03_asset_detail.png
  ├── 04_forecasting_canvas.png
  ├── 05_anomaly_detection.png
  ├── 06_deviation_attribution.png
  ├── 07_intervention_priority.png
  ├── 08_simulation_center.png
  └── ... (15 total)

/prompts/
  ├── page_01_dashboard_prompt.md
  ├── page_02_leaderboard_prompt.md
  ├── page_03_asset_detail_prompt.md
  └── ... (15 total)

/src/pages/
  ├── Dashboard.tsx
  ├── AssetLeaderboard.tsx
  ├── AssetDetail.tsx
  ├── ForecastingCanvas.tsx
  ├── AnomalyDetectionCenter.tsx
  ├── DeviationAttribution.tsx
  ├── InterventionPriority.tsx
  ├── SimulationCenter.tsx
  └── ... (15 total)

/src/components/
  ├── KPICard.tsx
  ├── StatusBadge.tsx
  ├── ProductionChart.tsx
  ├── SHAPChart.tsx
  └── ... (reusable components)

/src/data/
  ├── mock-assets.ts (128 assets)
  ├── mock-timeseries.ts (24 months history)
  ├── mock-forecasts.ts (4 horizons)
  ├── mock-anomalies.ts (active anomalies)
  ├── mock-shap.ts (SHAP values)
  └── mock-simulation-stream.ts (100+ datapoints)
```

---

## DOCUMENTS PROVIDED

1. **petropulse_frontend_spec.md** (Detailed page architecture)
   - 15 pages fully specified
   - Navigation structure
   - Visual elements per page
   - Build order and phases

2. **master_llm_context_prompt.md** (Umbrella context for all pages)
   - Project overview
   - Design principles
   - Color palette
   - Component library
   - Data representation
   - Success criteria

3. **github_and_prompts.md** (GitHub repo + page-specific prompts)
   - GitHub description (<350 chars)
   - README template
   - Detailed IDE prompts for all 15 pages
   - Each prompt includes mandatory elements, interactions, data format

4. **WORKFLOW_AND_CHECKLIST.md** (Development workflow)
   - Phase 1: Design (Figma/Stitch)
   - Phase 2: Development (IDE prompts)
   - Phase 3: Integration (charts, state, responsive)
   - Phase 4: Testing & Deployment
   - Complete checklist with timeline estimates

---

## IMMEDIATE NEXT STEPS (Today)

1. **Read All 4 Documents**: Familiarize yourself with the architecture
2. **Open Google Stitch/Figma**: Create a new project "PetroPulse AI"
3. **Design Page 1 (Dashboard)**: Use the spec as blueprint, apply color scheme
4. **Export Screenshot**: High-res PNG of Dashboard
5. **Create First IDE Prompt**: Copy template from `github_and_prompts.md`, add your dashboard screenshot, customize mandatory elements
6. **Generate First Component**: Feed prompt to Claude IDE (or Claude API)
7. **Test Component**: Verify it renders and matches your Figma design
8. **Iterate on Page 2-7**: Build MVP pages first (Leaderboard, Detail, Anomaly, Attribution)

---

## FINAL WORDS

This is a **frontend-only prototype** with **dummy data**. Your job is to make the UI and UX shine. Judges will immediately notice:

- **Good**: Clean dark theme, no generic SaaS look, smooth interactions, clear data flow
- **Bad**: Loading spinners, console errors, broken navigation, confusing layouts, generic blue gradients

**Focus on the golden path demo (15 steps) and the 5 MVP pages.** Everything else is bonus.

**Good luck! 🚀 You've got a winning concept—now execute it flawlessly.**

