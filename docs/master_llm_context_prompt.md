# MASTER LLM CONTEXT PROMPT: PetroPulse AI Frontend

**Use this as the umbrella context for ALL page-specific prompts.**

---

## PROJECT OVERVIEW

You are building **PetroPulse AI** — an integrated hydrocarbon production forecasting and decision-support platform. This is a **frontend prototype** with dummy data, designed to demonstrate a complete intelligence loop:

> **Observe → Forecast → Detect → Explain → Prioritize → Simulate → Act**

---

## CORE MISSION

Convert historical production data and simulated real-time streams into a prioritized intervention roadmap for field engineers. The prototype must visually and functionally demonstrate how the system identifies production anomalies, explains their causes using explainable AI (SHAP), and prioritizes assets for intervention based on recovery potential.

---

## DESIGN PRINCIPLES

1. **Not a Generic Dashboard**: This is an operations command center for energy professionals, not a B2B SaaS product.
2. **Explainability is Sacred**: Every anomaly, every forecast, every priority score must be explainable. Judges must understand *why* the system flagged something.
3. **Data-to-Decision Pipeline**: Visually show the complete chain from raw observation to actionable recommendation.
4. **Real-Time Simulation**: Because we don't have live ONGC feeds, the prototype includes a synthetic stream simulator. This should feel like live data streaming, not a static dashboard.
5. **Domain Authenticity**: Use petroleum industry terminology correctly. Avoid financial jargon or tech marketing.

---

## COLOR PALETTE (MANDATORY)

### Primary Theme: BLACK EARTH / SIGNAL AMBER
```
Background (Primary)          #080909  (Black)
Surface (Secondary)           #111313  (Dark gray)
Elevated (Cards, Panels)      #1A1D1F  (Slightly lighter)

Accent (Production/Energy)    #FF9000  (Signal Amber / Orange)
Accent (AI/Intelligence)      #C7F700  (Acid Lime)
Accent (Anomaly/Risk)         #FF3B3B  (Red, from Thermal Map)
Accent (Success/Recovery)     #00D966  (Green)

Text (Primary)                #F3EFE4  (Off-white)
Text (Secondary)              #B8B3A8  (Muted)
Border                        #2A2D30  (Dark gray, subtle)
```

### Severity Color Coding
- **NORMAL**: Green (#00D966) or off-white (#F3EFE4)
- **WATCH**: Yellow (#FFD700)
- **HIGH**: Orange (#FF9000)
- **CRITICAL**: Red (#FF3B3B)

### Visual Elements
- **Avoid**: Glassmorphism, rounded cards, purple/blue AI gradients, stock photos
- **Use**: Geological contour lines, telemetry grids, technical markings, industrial typography, subtle gradients on anomaly heatmaps

---

## COMPONENT LIBRARY (Reusable Across Pages)

### Header Components
- **Page Title** (large, sans-serif, #F3EFE4)
- **System Status Bar** (persistent top bar showing: PETROPULSE AI | ● OPERATIONAL | DATA STREAM ACTIVE | LAST UPDATE HH:MM)
- **Navigation Breadcrumb** (Home > Assets > Asset Detail > [Current Page])

### Data Display Components
- **KPI Card** (metric value + label + trend indicator)
  - Example: "Production | 1.42 MMBL | ↑ 2.3%"
- **Status Badge** (CRITICAL | HIGH | MEDIUM | LOW | NORMAL)
- **Timeline Node** (event marker on vertical or horizontal timeline)
- **Priority Score Display** (AIPS: 92 | Circular gauge or linear bar)
- **Confidence Indicator** (87% | small circular badge)

### Chart Components
- **Area Chart** (Actual vs Expected production with shaded anomaly regions)
- **Line Chart** (Forecast with uncertainty band)
- **Horizontal Bar Chart** (SHAP contributions, waterfall breakdown)
- **Heatmap** (Geospatial asset distribution, severity intensity)
- **Gauge Chart** (Asset health score, system status)
- **Table** (Sortable, filterable asset leaderboard)

### Interactive Components
- **Dropdown / Selector** (Asset, Basin, Time Horizon)
- **Filter Panel** (Collapsible panel with checkbox/radio filters)
- **Play/Pause/Reset Buttons** (Simulation controls, minimal design)
- **Scenario Button Grid** (Normal | Decline | Drop | Volatility | Recovery)
- **Action Buttons** (Investigate | Schedule Intervention | Add to Watchlist)
- **Search Bar** (Asset/Basin/Field search with instant results)

### Info Components
- **Tooltip** (Hover for term definitions, metric explanations)
- **Info Panel** (Data Provenance, Model Info, System Status)
- **Glossary Modal** (Domain terms with brief definitions)
- **Help Section** (Quick tips, demo navigation)

---

## TYPOGRAPHY

- **Headings**: Inter Bold or similar sans-serif, sizes 24px (H1), 18px (H2), 14px (H3)
- **Body Text**: Inter Regular, 13-14px, line-height 1.5
- **Monospace** (for metrics, code): IBM Plex Mono, 12px
- **Technical Labels**: All caps small text (e.g., "AIPS", "MMBL", "SCADA")

---

## LAYOUT PATTERNS

### Command Center (Dashboard)
```
┌─────────────────────────────────────┐
│  System Status Bar                  │
├─────────────────────────────────────┤
│  Page Title: Command Center         │
├──────────────┬──────────────────────┤
│ KPI Cards    │                      │
│ (4-6 cards)  │  Production Chart    │
│              │  (Area chart)        │
├──────────────┼──────────────────────┤
│ Asset Map    │  Active Anomalies    │
│ (Heatmap)    │  (Card list)         │
├──────────────┴──────────────────────┤
│  Quick Navigation to Leaderboard    │
└─────────────────────────────────────┘
```

### Asset Detail (Profile View)
```
┌─────────────────────────────────────┐
│  Asset Header (ID, Location, Basin) │
├─────────────────────────────────────┤
│  [Production] [Health] [AI Analysis]│  (Tabs)
├─────────────────────────────────────┤
│  ┌─ Production Intelligence ──────┐ │
│  │ Actual vs Expected Chart       │ │
│  │ Historical + Forecast          │ │
│  └────────────────────────────────┘ │
├─────────────────────────────────────┤
│  ┌─ AI Analysis ──────────────────┐ │
│  │ SHAP Chart                     │ │
│  │ Recovery Potential             │ │
│  │ AIPS Breakdown                 │ │
│  └────────────────────────────────┘ │
├─────────────────────────────────────┤
│  Timeline (Important Events)        │
├─────────────────────────────────────┤
│  Action Panel (Buttons)             │
└─────────────────────────────────────┘
```

### Forecasting Canvas
```
┌─────────────────────────────────────┐
│  Forecast Controls (30D/90D/180D)   │
├─────────────────────────────────────┤
│                                     │
│   Large Multi-Series Line Chart     │
│   - Historical Actual               │
│   - Model Expected                  │
│   - Forecast Future                 │
│   - Uncertainty Band                │
│   - Anomaly Regions Highlighted     │
│                                     │
├─────────────────────────────────────┤
│  Model Info Card                    │
│  MAE: 0.08 | RMSE: 0.12 | R²: 0.92 │
│  Last Updated: [Timestamp]          │
└─────────────────────────────────────┘
```

### Anomaly Detection Center
```
┌─────────────────────────────────────┐
│  Active Anomalies List              │
│  [Filters] [Search]                 │
├─────────────────────────────────────┤
│  ┌─ Anomaly Card 1 ───────────────┐ │
│  │ ● CRITICAL                     │ │
│  │ Asset: MH-07                   │ │
│  │ Deviation: -17.4%              │ │
│  │ Anomaly Score: 0.94            │ │
│  │ Detected: 16:42:07             │ │
│  └────────────────────────────────┘ │
│  ┌─ Anomaly Card 2 ───────────────┐ │
│  │ ...                            │ │
│  └────────────────────────────────┘ │
├─────────────────────────────────────┤
│  Production Graph (Anomaly Region)  │
│  with highlighted anomaly window    │
└─────────────────────────────────────┘
```

### Real-Time Simulation
```
┌─────────────────────────────────────┐
│  Simulation Controls                │
│  [Play] [Pause] [Reset] Speed: 5×   │
├─────────────────────────────────────┤
│  Asset Selector: [MH-07]            │
├─────────────────────────────────────┤
│  Incoming Observation Stream        │
│  ┌───────────────────────────────┐  │
│  │ 16:42:05 | MH-07 | 1.18 MMBL │  │
│  │ 16:42:10 | MH-07 | 1.16 MMBL │  │
│  │ 16:42:15 | MH-07 | 0.98 MMBL │  │
│  │ ⚠ ANOMALY DETECTED            │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  Live Metrics Update (KPI Cards)    │
│  Production | Anomaly Score | Status│
└─────────────────────────────────────┘
```

---

## INTERACTION PATTERNS

### Navigation
- **Global Sidebar** (collapsible, shows main sections: HOME, ASSETS, INTELLIGENCE, SCENARIOS, SYSTEM)
- **Breadcrumb** (Home > Assets > Asset Detail)
- **Tabs** (within Asset Detail: Production, Health, AI Analysis)
- **Drawer Panels** (Filters, Settings, Help slide in from right)

### Data Exploration
- **Table Sorting**: Click column header to sort (indicate direction with ▲▼)
- **Filtering**: Multi-select checkboxes (Priority, Basin, Status)
- **Search**: Type to filter asset names/IDs in real-time
- **Drill-Down**: Click table row / card → opens detail view
- **Hover Tooltips**: Hover metric → explain or show additional context

### Simulation & Scenarios
- **Play Controls**: Minimal, clean buttons. Show current timestamp and data count.
- **Scenario Selection**: Large, clear button grid. Click → triggers injection.
- **Live Updates**: Charts and metrics update smoothly (not jarring jumps).

### Time Navigation
- **Date Picker**: For historical data exploration (optional)
- **Forecast Horizon Selector**: 30D, 90D, 180D, 365D (radio or tab style)
- **Timeline Events**: Click event → jump to that date

---

## DATA REPRESENTATION

### Production Metrics
- Display as: `1.42 MMBL` (millions of barrels liquid)
- Deviation as: `-17.4%` or `-0.25 MMBL`
- Decline rate as: `2.3% per month` or `0.08 MMBL/month`

### Scores & Indices
- **AIPS Score**: 0–100 (e.g., "AIPS: 92" in large bold)
- **Anomaly Score**: 0.0–1.0 (e.g., "Anomaly Score: 0.94")
- **Asset Health**: 0–100% (e.g., "Health: 87%")
- **Confidence**: 0–100% (e.g., "Confidence: 87%")

### Time Representation
- **Timestamps**: "16:42:07" or "2026-08-16 16:42"
- **Durations**: "3 days", "2 weeks", "1 month"
- **Relative**: "2 hours ago", "yesterday", "3 months ago"

### SHAP Contributions (Attribution)
- Display as **horizontal bar chart** (left-aligned)
- Top contributors first
- Include percentage or value next to bar
- Color code: positive (green) vs negative (red) impact

---

## DUMMY DATA EXAMPLES

### Assets
```json
{
  "asset_id": "MH-07",
  "field": "Mumbai High",
  "basin": "Arabian Sea",
  "current_production": 1.17,
  "expected_production": 1.42,
  "deviation": -17.4,
  "anomaly_severity": "CRITICAL",
  "recovery_potential": 1.24,
  "aips_score": 92,
  "priority": "CRITICAL"
}
```

### Time Series (Production)
```json
[
  { "timestamp": "2026-08-16T16:40:00Z", "asset_id": "MH-07", "production": 1.42, "forecast": 1.40, "anomaly_score": 0.12 },
  { "timestamp": "2026-08-16T16:45:00Z", "asset_id": "MH-07", "production": 1.40, "forecast": 1.39, "anomaly_score": 0.15 },
  { "timestamp": "2026-08-16T16:50:00Z", "asset_id": "MH-07", "production": 0.98, "forecast": 1.38, "anomaly_score": 0.94 }
]
```

### SHAP Attribution
```json
{
  "asset_id": "MH-07",
  "deviation": -17.4,
  "contributions": [
    { "feature": "Historical Decline", "value": -7.4, "percentage": 43 },
    { "feature": "Operational Change", "value": -4.8, "percentage": 28 },
    { "feature": "Production Volatility", "value": -2.9, "percentage": 17 },
    { "feature": "Other", "value": -2.1, "percentage": 12 }
  ]
}
```

### AIPS Breakdown
```json
{
  "asset_id": "MH-07",
  "aips_score": 92,
  "components": {
    "production_loss_weight": 0.30,
    "production_loss_value": -17.4,
    "anomaly_severity_weight": 0.25,
    "anomaly_severity_score": 0.94,
    "recovery_potential_weight": 0.35,
    "recovery_potential_value": 1.24,
    "complexity_weight": 0.10,
    "complexity_score": 0.60
  }
}
```

---

## MUST-SHOW ELEMENTS (Per SIH Requirements)

Each page must include or link to:

1. **Portfolio Overview** (Command Center) — assets count, production, anomalies, health
2. **Asset Leaderboard** — AIPS-ranked list with all key metrics
3. **Asset Detail** — complete profile with forecast, anomaly status, recovery potential
4. **Production Forecast** — historical + expected + forecast with confidence interval
5. **Anomaly Detection** — active anomalies with severity and detection time
6. **Loss Attribution** — SHAP chart showing what caused the deviation
7. **Intervention Priority** — decision panel with AIPS and recommendations
8. **Real-Time Simulation** — live data stream with anomaly injection
9. **Scenario Injection** — user-triggered anomaly scenarios
10. **AI Model Status** — all 4 modules (Forecasting, Anomaly, Attribution, Prioritization) with active/inactive status
11. **Data Provenance** — sources (OGD, PPAC, DGH) with links
12. **Model Confidence** — uncertainty bands, confidence percentages on predictions

---

## TECHNICAL STACK ASSUMPTIONS

- **Frontend Framework**: React.js (TypeScript recommended)
- **Charting**: Plotly.js or Recharts
- **Styling**: Tailwind CSS with custom color overrides
- **State Management**: React Context or Zustand (for simulation state)
- **Deployment**: Vercel / Netlify

---

## DEMO NARRATIVE (For Judges)

> *"PetroPulse AI transforms reactive production monitoring into proactive decision-making. When you open the dashboard, you see at a glance which assets are underperforming. Click into an asset, and the system shows you three things: (1) the historical trend and AI forecast, (2) the specific anomaly detected in real-time, and (3) **why** the anomaly occurred using explainable AI. Finally, the system ranks that asset for intervention based not just on how much production is lost, but on how much can be recovered. In our simulation, you'll see this entire loop execute live as synthetic data streams in, the system detects an anomaly, explains it, and reprioritizes the asset for action."*

---

## PAGE-SPECIFIC PROMPT TEMPLATE

When creating prompts for individual pages, use this structure:

```
## PAGE: [Name]

**Purpose**: [One sentence describing what this page shows/does]

**Key Elements**:
- [Element 1]
- [Element 2]
- [Element 3]

**Interactions**:
- [Interaction 1]
- [Interaction 2]

**Data Shown**:
- [Metric 1]
- [Metric 2]

**Color/Design Notes**:
- Use [specific colors]
- Emphasize [specific element]

**Reference Image**: [Attached image path or description]

**Prompt**:
[Detailed IDE-specific prompt for Claude/Gemini to generate the component]
```

---

## SUCCESS CRITERIA FOR PROTOTYPE

✅ **Visual Authenticity**: Looks like a real energy operations tool, not a generic SaaS dashboard  
✅ **Complete Intelligence Loop**: Observer → Forecast → Detect → Explain → Prioritize → Simulate → Act is visible  
✅ **Explainability**: SHAP charts, attribution, confidence metrics throughout  
✅ **Real-Time Capability**: Simulation shows live data ingestion and inference  
✅ **Decision Support**: AIPS scoring and recommendations are clear and actionable  
✅ **Domain Correctness**: Terms, metrics, and workflows are accurate to petroleum industry  
✅ **Demo-Ready**: 5-minute golden path works flawlessly  
✅ **Judges' Trust**: No black-box moments; every AI output is explained  

---

## NEXT ACTION

1. Design all 15 pages in Google Stitch using this context
2. Export high-res screenshots of each page
3. For each page, create a focused IDE prompt referencing the screenshot
4. Generate React components page by page
5. Integrate dummy data endpoints
6. Test golden path end-to-end
7. Deploy to Vercel

