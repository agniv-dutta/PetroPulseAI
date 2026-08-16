# PetroPulse AI - GitHub & Prompt Architecture

---

## GITHUB REPOSITORY DESCRIPTION (<350 chars)

```
PetroPulse AI: Integrated hydrocarbon production forecasting & 
intervention prioritization engine. Combines XGBoost/LSTM forecasting, 
Isolation Forest anomaly detection, and SHAP explainability to convert 
raw production data into prioritized asset intervention roadmaps. Built 
for SIH 2026.
```

**Character Count**: 298 characters ✅

---

## GITHUB README OUTLINE

```markdown
# PetroPulse AI

**Integrated Hydrocarbon Production Forecasting and Asset Prioritization Engine**

A decision-support platform for Indian petroleum operations that combines 
machine learning forecasting, real-time anomaly detection, and explainable 
AI to prioritize production-enhancing interventions.

## Features

- **Dynamic Production Forecasting** (XGBoost + LSTM)
- **Intelligent Decline Analysis** (Automated curve fitting)
- **Unsupervised Anomaly Detection** (Isolation Forest)
- **Explainable Attribution** (SHAP values)
- **Asset Intervention Priority Scoring** (AIPS algorithm)
- **Real-Time Simulation Engine** (Synthetic data streaming)

## Architecture

```
Historical Data (OGD, PPAC, DGH)
    ↓
Ingestion Layer (Python ETL)
    ↓
Data Lake (PostgreSQL + TimescaleDB)
    ↓
Modeling Engine (XGBoost, LSTM, Isolation Forest, SHAP)
    ↓
Decision Layer (AIPS Scoring)
    ↓
Frontend (React Dashboard)
    ↓
Real-Time Simulation
```

## Tech Stack

- **Backend**: Python 3.10+, FastAPI
- **ML**: scikit-learn, XGBoost, PyTorch, SHAP
- **Database**: PostgreSQL + TimescaleDB
- **Frontend**: React.js, Plotly.js, Tailwind CSS
- **Deployment**: Docker, Vercel

## Getting Started

### Prerequisites
- Node.js 16+
- Python 3.10+
- PostgreSQL 13+

### Installation

```bash
# Clone repo
git clone https://github.com/[team]/petropulse-ai.git

# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

## Demo Flow

1. **Command Center**: View portfolio health & active anomalies
2. **Asset Leaderboard**: Sort by AIPS priority score
3. **Production Forecast**: View historical, expected, and forecasted production
4. **Anomaly Detection**: See detected deviations with severity
5. **SHAP Attribution**: Understand why production deviated
6. **Decision Panel**: Get ranked prioritization recommendations
7. **Real-Time Simulation**: Inject scenarios and watch system respond live

## Data Sources

- **OGD** (data.gov.in): National production statistics
- **PPAC** (ppac.gov.in): Monthly production reports
- **DGH** (dghindia.gov.in): Hydrocarbon activity reports
- **Synthetic**: Simulator for real-time demonstration

## Disclaimer

This prototype uses publicly available data and synthetic simulations. 
Authorized ONGC SCADA feeds integration available upon approval.

## Team

[SIH 2026 Cohort]

## License

[MIT / Apache 2.0]
```

---

## PAGE-SPECIFIC PROMPT TEMPLATES

Use these templates for each page. **Modify and pass to Claude IDE / Gemini:**

---

### PAGE 1: COMMAND CENTER / DASHBOARD

**File**: `pages/Dashboard.tsx`  
**Purpose**: Portfolio health at-a-glance; entry point to all workflows

```
PROMPT FOR IDE:

Generate a React component called "Dashboard" that serves as the 
PetroPulse AI command center. This is the landing page showing 
overall portfolio health.

DESIGN REFERENCE:
[Attach Figma screenshot of Dashboard design]

MANDATORY ELEMENTS:
1. System Status Bar (top, persistent)
   - Text: "PETROPULSE AI | ● OPERATIONAL | DATA STREAM: SIMULATION ACTIVE | Last Updated: [HH:MM]"
   - Background: #111313, text: #F3EFE4
   - Accent: #FF9000 for dot indicator

2. Page Title: "Command Center" (H1, #F3EFE4, left-aligned)

3. KPI Cards Grid (4-6 cards, responsive 2-column on desktop, 1-column on mobile)
   Cards to show:
   - Total Assets: 128 (number, label below)
   - Active Production: 98 (green indicator)
   - Assets at Risk: 11 (red indicator with #FF3B3B)
   - Portfolio Production: 2.48 MMT (large number)
   - Expected Production: 2.89 MMT
   - Production Deviation: -14.2% (red text)
   - Active Anomalies: 03 (orange badge)
   - Estimated Recovery Potential: 2.34 MMBL (green text)

   Each card should:
   - Background: #1A1D1F
   - Border: subtle #2A2D30
   - Title: #B8B3A8 (secondary text)
   - Value: large bold #F3EFE4 or accent color (red/green/amber based on metric)
   - Icon: small relevant icon (production icon, alert icon, etc.)

4. Production Trend Chart (50% width on desktop, full width on tablet)
   - Type: Area chart with dual series
   - Series 1: Actual Production (line, #FF9000)
   - Series 2: Expected Production (dashed line, #B8B3A8)
   - Fill: subtle gradient under "Actual" (#FF9000 with low opacity)
   - Anomaly regions: highlighted in light red (#FF3B3B with 20% opacity)
   - X-axis: dates (last 12 months)
   - Y-axis: MMBL
   - Legend: top-right
   - Tooltip: on hover, show timestamp, actual, expected, deviation

5. Asset Distribution Map (40% width on desktop)
   - Title: "Asset Geospatial Distribution"
   - Show simplified India map with marker clusters
   - Markers color-coded by severity:
     - Green (#00D966): Normal
     - Yellow (#FFD700): Watch
     - Orange (#FF9000): High
     - Red (#FF3B3B): Critical
   - Heatmap intensity increases in anomaly zones
   - Click marker → navigate to Asset Leaderboard (filter by basin)

6. Active Anomalies Widget (40% width, below map)
   - Title: "Active Anomalies"
   - List of 3-5 latest anomalies
   - Each item shows:
     - Severity badge (CRITICAL | HIGH | WATCH)
     - Asset ID
     - Anomaly type (production drop %)
     - Detection time (relative, e.g., "2 hours ago")
   - Click item → navigate to Anomaly Detection Center
   - View All link → navigate to Anomaly Detection Center

7. Quick Navigation Section (bottom)
   - Large action buttons:
     - "View Asset Leaderboard" (primary, #FF9000 bg)
     - "Start Simulation" (secondary, transparent with #FF9000 border)

8. Color Palette Adherence:
   - Background: #080909 or #111313
   - Surfaces: #1A1D1F
   - Accent (Energy): #FF9000
   - Accent (Risk): #FF3B3B
   - Accent (Success): #00D966
   - Accent (AI): #C7F700
   - Text: #F3EFE4 and #B8B3A8

9. Responsive Layout:
   - Desktop (1920px): KPI grid (6 cols), chart (6 cols), map + anomalies (4 cols each)
   - Tablet (1024px): KPI grid (3 cols), chart (full), map + anomalies stacked
   - Mobile (375px): All full-width, stacked vertically

10. Interactions:
    - Hover KPI card → highlight, show tooltip with trend sparkline
    - Hover chart → show detailed values
    - Click map marker → scroll to asset in Leaderboard
    - Click anomaly item → open Anomaly Detail modal or navigate

11. Data Format (Use mock data in component):
    Portfolio = {
      total_assets: 128,
      active_production: 98,
      at_risk: 11,
      portfolio_production: 2.48,
      expected_production: 2.89,
      deviation: -14.2,
      active_anomalies: 3,
      recovery_potential: 2.34,
      production_trend: [
        { date: "2026-01-01", actual: 1.95, expected: 2.05, anomaly: false },
        ...
      ],
      anomalies: [
        { id: "MH-07", severity: "CRITICAL", deviation: -17.4, time: "2h ago" },
        ...
      ]
    }

12. No external API calls; all data is local mock/component state

OUTPUT EXPECTATION:
- Fully functional React component
- All charts interactive (Plotly/Recharts)
- Responsive and mobile-friendly
- Dark theme throughout
- No loading spinners (data is instant)
- Ready to integrate with page navigation
```

---

### PAGE 2: ASSET LEADERBOARD

**File**: `pages/AssetLeaderboard.tsx`  
**Purpose**: Sorted list of assets by AIPS priority; main drill-down entry point

```
PROMPT FOR IDE:

Generate a React component called "AssetLeaderboard" that displays 
all assets ranked by intervention priority (AIPS Score).

DESIGN REFERENCE:
[Attach Figma screenshot of Leaderboard design]

MANDATORY ELEMENTS:
1. Page Header
   - Title: "Asset Intelligence Leaderboard"
   - Subtitle: "Ranked by Asset Intervention Priority Score (AIPS)"

2. Toolbar (Top of table)
   - Search box: "Search assets, basins, fields..."
   - Filter button (opens collapsible filter panel)
   - Sort indicator (current sort: "AIPS Score Descending")

3. Filter Panel (Collapsible, left side or drawer)
   Filters:
   - Priority: CRITICAL, HIGH, MEDIUM, LOW (checkboxes)
   - Basin: Mumbai High, Cauvery, KG, Assam (checkboxes)
   - Anomaly Status: Normal, Watch, High, Critical (checkboxes)
   - Production Deviation: range slider (-50% to +50%)
   - Recovery Potential: range slider (0 to 5 MMBL)
   
   Actions:
   - Apply Filters button
   - Reset Filters link

4. Main Table (Sortable columns)
   Columns (in order):
   - Rank (auto-numbered, 1-based)
   - Asset ID (clickable → opens Asset Detail)
   - Field Name
   - Basin
   - Current Production (MMBL, numeric)
   - Expected Production (MMBL, numeric)
   - Deviation (%, color-coded: red if negative)
   - Decline Rate (%/month)
   - Anomaly Severity (badge: CRITICAL | HIGH | WATCH | NORMAL)
   - Recovery Potential (MMBL, green text)
   - AIPS Score (0-100, large bold, color-coded)
   - Priority (badge: CRITICAL | HIGH | MEDIUM | LOW)
   
   Sorting:
   - Click column header to sort ascending/descending
   - Show sort indicator (▲ or ▼)
   - Default sort: AIPS Score (descending)
   
   Row Styling:
   - Hover state: slightly elevated background (#1A1D1F)
   - CRITICAL priority: faint red background (#FF3B3B with 10% opacity)
   - Click row → opens Asset Detail panel/page
   
   Pagination:
   - Show 10 rows per page
   - Pagination controls at bottom (Previous | Page 1/13 | Next)

5. Example Row Data:
   Rank | Asset ID | Field | Basin | Current | Expected | Deviation | Decline | Severity | Recovery | AIPS | Priority
   1    | MH-07    | Mumbai High | Arabian Sea | 1.17 | 1.42 | -17.4% | 2.3%/mo | CRITICAL | 1.24 | 92 | CRITICAL
   2    | CB-12    | Cauvery | Cauvery Basin | 0.89 | 1.05 | -15.2% | 1.8%/mo | HIGH | 0.87 | 78 | HIGH
   ...

6. Bulk Actions (Optional)
   - Select multiple rows (checkboxes)
   - "Add to Watchlist" button (grayed if none selected)
   - "Generate Report" button

7. Export/Share Options (Top-right)
   - "Download as CSV" link
   - "Share" button (copy link)

8. Color Coding:
   - Deviation % (negative): #FF3B3B (red)
   - Deviation % (positive): #00D966 (green)
   - Recovery Potential: #C7F700 (lime, AI color)
   - AIPS Score 80+: #00D966 (green)
   - AIPS Score 60-80: #FFD700 (yellow/amber)
   - AIPS Score 40-60: #FF9000 (orange)
   - AIPS Score <40: #FF3B3B (red)

9. Responsive:
   - Desktop: Full table with all columns
   - Tablet: Hide "Decline Rate", "Recovery Potential" columns
   - Mobile: Show Asset ID, Current, Expected, Deviation, AIPS, Priority only; other columns in expandable row

10. Interactions:
    - Click asset ID → navigate to Asset Detail for that asset
    - Click row → same as above
    - Hover row → highlight entire row
    - Click severity badge → filter by that severity
    - Type in search → live filter table (searches ID, field, basin)
    - Checkbox filters → apply immediately or show "Apply" button

11. No loading; all data is mock/local

OUTPUT EXPECTATION:
- Fully sortable, filterable table
- Responsive design
- Click-through navigation to Asset Detail
- All 128 assets represented (paginated)
- Ready for integration
```

---

### PAGE 3: ASSET DETAIL / DIGITAL ASSET PROFILE

**File**: `pages/AssetDetail.tsx`  
**Purpose**: Complete intelligence profile for a single asset

```
PROMPT FOR IDE:

Generate a React component called "AssetDetail" that shows comprehensive 
intelligence for a selected asset (e.g., MH-07).

DESIGN REFERENCE:
[Attach Figma screenshot of Asset Detail design]

MANDATORY ELEMENTS:

1. Asset Header Card
   - Background: gradient from #1A1D1F to #111313
   - Left side: Large asset ID (e.g., "MH-07", bold, 36px)
   - Right side: Key info
     - Field: "Mumbai High"
     - Basin: "Arabian Sea"
     - Last Update: "2026-08-16 16:42:07"
   - Status indicator: circular badge (green/yellow/red/orange)

2. Tab Navigation (Below header)
   - Tabs: [Production] [Health] [AI Analysis]
   - Click to switch tab content
   - Underline indicator on active tab

3. TAB 1: PRODUCTION
   Content:
   - Subtitle: "Production Intelligence"
   
   a) Historical Production Chart
      - Type: Line chart with area fill
      - X-axis: Last 24 months
      - Y-axis: MMBL
      - Line color: #FF9000 (actual production)
      - Fill: gradient below line (#FF9000, low opacity)
      - Hover: show timestamp, production value
      - Title: "Historical Production Trend"
   
   b) Actual vs Expected Chart
      - Type: Dual-axis line chart
      - Line 1 (left axis): Actual Production (#FF9000, solid)
      - Line 2 (left axis): Expected Production (#B8B3A8, dashed)
      - Last 12 months
      - Anomaly window: highlight region where deviation > 10%
      - Title: "Actual vs Expected Production"
   
   c) Production Forecast Chart
      - Type: Line chart with uncertainty band
      - X-axis: 12 months back to 90 days forward
      - Historical (12mo back): Actual line
      - Forecast (forward): Dotted line with confidence band (e.g., ±10%)
      - Forecast line color: #C7F700 (AI color)
      - Confidence band: light color with 30% opacity
      - Title: "Production Forecast (90D Horizon)"
   
   d) Production Metrics Table
      - Current Production: 1.17 MMBL
      - Expected Production: 1.42 MMBL
      - Deviation: -0.25 MMBL (-17.4%)
      - Forecast (30D): 1.21 MMBL
      - Forecast (90D): 1.24 MMBL
      - Decline Rate: 2.3% per month
      - Last Month Change: -4.1%

4. TAB 2: HEALTH
   Content:
   - Subtitle: "Asset Health & Status"
   
   a) Health Score Gauge (circular, 0-100)
      - Current: 68%
      - Color: yellow/orange (#FF9000)
      - Animation: needle pointing to current value
      - Title: "Asset Health Score"
   
   b) Status Cards (2x2 grid)
      - Anomaly Status: "CRITICAL" (red badge)
      - Production Status: "DECLINING" (orange badge)
      - Operational Status: "ACTIVE" (green badge)
      - Last Alert: "2h ago" (timestamp, orange text)
   
   c) Health Trend Chart
      - Type: Area chart (stacked or overlaid)
      - Y-axis: Health score (0-100%)
      - Last 6 months
      - Line color: #FF9000
      - Show trend direction (up/down arrow)
   
   d) Active Issues
      - List of current issues/anomalies:
        • Production Deviation (HIGH) - 17.4% below expected
        • Pressure Drop Detected (HIGH) - 2.1 bar below normal
        • Decline Rate Accelerating (MEDIUM) - 2.3% vs 1.8% avg
      - Each issue is clickable → jumps to Deviation Attribution tab

5. TAB 3: AI ANALYSIS
   Content:
   - Subtitle: "Explainable AI Insights"
   
   a) SHAP Contribution Chart (Horizontal Bar Chart)
      - Title: "Production Deviation Attribution"
      - Shows top 5 feature contributions to current deviation
      - Example:
        Historical Decline: ████████████ 43%
        Operational Change: ████████ 28%
        Production Volatility: █████ 17%
        Other: ███ 12%
      - Colors: bars in #FF9000 (amber)
      - Values shown on right (e.g., "-7.4%" or "7.4 MMBL")
      - Tooltip: explain what each factor means
   
   b) Recovery Potential Card
      - Title: "Estimated Recovery Potential"
      - Current Production: 1.17 MMBL (red)
      - Potential Production: 1.35 MMBL (green)
      - Recovery Volume: +0.18 MMBL (+15.4%)
      - Confidence: 87%
      - Horizontal progress bar showing current → potential
   
   c) AIPS Breakdown Card
      - Title: "Asset Intervention Priority Score"
      - Large display: AIPS = 92 (large bold number)
      - Color: gradient to red (#FF3B3B) since high priority
      - Components breakdown:
        * Production Loss Weight: 30% → Value: -17.4% → Contribution: 5.2
        * Anomaly Severity Weight: 25% → Score: 0.94 → Contribution: 4.7
        * Recovery Potential Weight: 35% → Value: 1.24 → Contribution: 4.3
        * Complexity Weight: 10% → Score: 0.60 → Contribution: 0.6
        * TOTAL AIPS: 92
      - Formula shown as equation (subscript weights)
   
   d) Model Confidence
      - Forecast Confidence: 87%
      - Anomaly Detection Confidence: 94%
      - Attribution Confidence: 82%
      - Each with small progress bar or circular indicator

6. TIMELINE (Below all tabs)
   - Title: "Important Events"
   - Vertical timeline showing 8-10 events
   - Example events:
     01-JAN-2024 → ● NORMAL
     15-FEB-2024 → ● NORMAL
     12-MAR-2024 → ◆ DECLINE DETECTED (orange marker)
     18-APR-2024 → ◆ ANOMALY DETECTED (red marker)
     25-MAY-2024 → ◆ HIGH DEVIATION (red marker)
     02-JUN-2024 → ◆ PRIORITY RAISED TO CRITICAL (red marker)
   - Click event → scroll to that date in Production chart
   - Hover event → show tooltip with details

7. ACTION PANEL (Bottom)
   Three action buttons:
   - "Investigate Asset" (primary, #FF9000 background)
   - "Simulate Recovery Scenario" (secondary, transparent with border)
   - "Add to Watchlist" (tertiary, transparent)
   - Click buttons → open respective modals or navigate

8. Layout:
   - Header: full width
   - Tabs + content: full width
   - Each tab's charts: responsive (2 columns on desktop, 1 on mobile)
   - Timeline: full width below
   - Actions: full width, sticky at bottom (optional)

9. Back Button:
   - Top-left, "← Back to Leaderboard"
   - Or breadcrumb: "Home > Assets > Asset Detail > MH-07"

OUTPUT EXPECTATION:
- Fully interactive multi-tab component
- All charts are responsive and interactive
- Click-through to related views
- Professional, technical aesthetic
```

---

### PAGE 4: PRODUCTION FORECASTING CANVAS

**File**: `pages/ForecastingCanvas.tsx`  
**Purpose**: Large, detailed forecasting view with model metrics

```
PROMPT FOR IDE:

Generate a React component called "ForecastingCanvas" displaying 
production forecasting with multiple horizons and model performance.

DESIGN REFERENCE:
[Attach Figma screenshot of Forecasting Canvas]

MANDATORY ELEMENTS:

1. Page Header
   - Title: "Production Forecasting Canvas"
   - Subtitle: "Historical Production | Model Expectations | Future Forecast"

2. Forecast Horizon Selector (Top-right of chart)
   - Radio buttons or tab-style selector:
     ○ 30D (30 Days)
     ○ 90D (90 Days) [DEFAULT]
     ○ 180D (6 Months)
     ○ 365D (1 Year)
   - Selecting changes chart X-axis span and forecast line

3. Large Production Forecast Chart (70% of viewport width)
   - Type: Multi-series line chart
   
   Series:
   - Historical Actual (12 months back): solid line, #FF9000
   - Model Expected (12 months back): dashed line, #B8B3A8
   - Forecast Future (30/90/180/365 days forward): dotted line, #C7F700
   - Confidence Upper Band: thin line or shaded area, #C7F700 (20% opacity)
   - Confidence Lower Band: thin line or shaded area, #C7F700 (20% opacity)
   
   Annotations:
   - Anomaly windows: vertical bands in light red (#FF3B3B, 15% opacity)
   - Today marker: vertical line at current date
   
   X-axis: Dates (last 12 months + future)
   Y-axis: MMBL
   
   Legend:
   - Top-right corner, clickable to toggle series on/off
   - Color-coded matching lines
   
   Interactivity:
   - Hover → show tooltip with timestamp, actual, expected, forecast, confidence
   - Zoom in/out (mouse wheel or pinch on mobile)
   - Drag to pan
   - Click on anomaly band → show details

4. Model Information Card (30% of width, right side of chart)
   - Title: "Model Configuration"
   - Card background: #1A1D1F
   - Fields:
     * Forecasting Models: XGBoost | LSTM (hybrid)
     * Forecast Horizon: [Selected horizon from selector]
     * Historical Training Data: 24 months
     * Features Used: 15 (Production, Pressure, Temperature, Flow Rate, Season, Decline, etc.)
     * Last Training: 2026-08-16 16:40
     * Next Training: 2026-08-17 16:40
   
   - Performance Metrics (below):
     * MAE (Mean Absolute Error): 0.08 MMBL
     * RMSE (Root Mean Squared Error): 0.12 MMBL
     * R² (Coefficient of Determination): 0.924
     * MAPE (Mean Absolute % Error): 4.2%
   
   - Forecast Accuracy Trend:
     * Small sparkline showing MAE over last 6 months
     * Tooltip: "Model improving" or "Model stable"

5. Comparison Table (Below chart, full width)
   - Title: "Forecast Comparison by Horizon"
   - Table columns:
     Horizon | Expected (12mo avg) | Forecast (current) | Confidence | Change
     30 Days | 1.42 MMBL | 1.21 MMBL | 87% | -14.8%
     90 Days | 1.42 MMBL | 1.24 MMBL | 84% | -12.7%
     180 Days | 1.42 MMBL | 1.28 MMBL | 79% | -9.9%
     365 Days | 1.42 MMBL | 1.35 MMBL | 71% | -4.9%
   
   - Negative change in red, positive in green
   - Click row → update chart to show that horizon

6. Feature Importance (Optional, expandable section)
   - Title: "Feature Contribution to Forecast"
   - Horizontal bar chart showing top 10 features
   - Example:
     Seasonal Trend: ████████████ 28%
     Historical Decline: ██████████ 22%
     Pressure: ████████ 18%
     Temperature: ███████ 15%
     Flow Rate: ████ 9%
     Other: ██ 8%

7. Forecast Quality Indicators (Top-left, badges)
   - Model Confidence: 87% (green or yellow badge)
   - Data Quality: 94% (green badge)
   - Recency: "Updated 2 hours ago" (blue badge)

8. Actions (Bottom-right)
   - "View Model Details" (link → Model Status page)
   - "Download Forecast" (CSV export)
   - "Share Forecast" (copy link)

9. Color Palette:
   - Chart lines: #FF9000 (actual), #B8B3A8 (expected), #C7F700 (forecast)
   - Confidence band: #C7F700 with opacity
   - Anomaly window: #FF3B3B with low opacity
   - Background: #080909 or #111313
   - Cards: #1A1D1F
   - Text: #F3EFE4 and #B8B3A8

10. Responsive:
    - Desktop: Chart 70%, info 30%, side-by-side
    - Tablet: Chart 100%, info below (stack)
    - Mobile: Chart 100%, info below (simplified)

11. No loading; instant display

OUTPUT EXPECTATION:
- Interactive multi-series chart with zoom/pan
- Responsive horizon selector
- Model metrics clearly displayed
- Professional forecasting interface
```

---

### PAGE 5: ANOMALY DETECTION CENTER

**File**: `pages/AnomalyDetectionCenter.tsx`  
**Purpose**: Real-time anomaly monitoring and severity assessment

```
PROMPT FOR IDE:

Generate a React component called "AnomalyDetectionCenter" displaying 
active production anomalies with severity levels and details.

DESIGN REFERENCE:
[Attach Figma screenshot of Anomaly Detection Center]

MANDATORY ELEMENTS:

1. Page Header
   - Title: "Anomaly Detection Center"
   - Subtitle: "Active production deviations and severity assessment"
   - Total count: "Active Anomalies: 3"

2. Filter & Search Toolbar
   - Search: "Search by asset ID or field name"
   - Severity filter: buttons (ALL | CRITICAL | HIGH | WATCH | NORMAL)
   - Status filter: buttons (ACTIVE | RESOLVED | ACKNOWLEDGED)
   - Sort dropdown: (By Severity | By Detection Time | By Magnitude)

3. Anomaly List (Card-based, not table)
   - Grid layout: 2 columns on desktop, 1 on tablet/mobile
   - Each card represents one anomaly
   
   Anomaly Card Structure:
   
   a) Card Header
      - Severity Badge (left): ● CRITICAL (or HIGH/WATCH/NORMAL)
      - Color: #FF3B3B (critical), #FF9000 (high), #FFD700 (watch), #00D966 (normal)
      - Time indicator (right): "Detected 2h ago"
   
   b) Asset Info
      - Asset ID (large, bold): "MH-07"
      - Field: "Mumbai High"
      - Basin: "Arabian Sea"
   
   c) Deviation Metrics
      - Production Deviation: "-17.4%" (large red text)
      - Absolute Deviation: "-0.25 MMBL" (smaller gray text)
      - Expected vs Actual:
        Expected: 1.42 MMBL
        Actual: 1.17 MMBL
   
   d) Anomaly Scoring
      - Anomaly Score: 0.94 (large number, color-coded)
      - Score 0.9-1.0: #FF3B3B (critical)
      - Score 0.7-0.9: #FF9000 (high)
      - Score 0.5-0.7: #FFD700 (watch)
      - Score <0.5: #00D966 (normal)
   
   e) Detection Details
      - Detection Method: "Isolation Forest"
      - Detection Time: "2026-08-16 16:42:07"
      - Duration: "Active for 2h 15m"
   
   f) Mini Chart (small line graph on card)
      - Production history (last 24 hours)
      - Line: #FF9000
      - Anomaly point: marked with red dot or vertical line
      - Fit small: 200px width × 80px height
   
   g) Action Buttons (Card footer)
      - "View Details" (primary link)
      - "Acknowledge" (secondary button)
      - "Resolve" (tertiary, grayed if not applicable)

4. Anomaly Detail View (Expanded or Modal)
   When card clicked or "View Details" pressed:
   
   a) Full Production Graph
      - Larger version of mini chart
      - 48-hour window around anomaly
      - Anomaly region highlighted in light red
      - Expected production line (dashed, #B8B3A8)
      - Actual production line (solid, #FF9000)
      - Anomaly point marked clearly
   
   b) Root Cause Indicators (Suggested)
      - Based on SHAP analysis (preview)
      - "Top Contributing Factors:"
        1. Pressure Drop (estimated -8.4% impact)
        2. Flow Rate Reduction (estimated -6.2% impact)
      - Link: "View Full Attribution Analysis" → navigate to Deviation Attribution page
   
   c) Recovery Estimate
      - "If resolved, potential recovery: +0.18 MMBL"
   
   d) Recommended Action
      - Priority for intervention
      - Suggested next step (investigate, schedule maintenance, etc.)

5. Summary Statistics (Top-right section)
   - Total Active Anomalies: 3
   - Critical: 1
   - High: 1
   - Watch: 1
   - Combined Production Loss: -2.34 MMBL
   - Total Recovery Potential: 1.89 MMBL

6. Anomaly Timeline (Optional, below cards)
   - Horizontal timeline of anomalies in past 7 days
   - Severity markers (red/orange/yellow dots)
   - Click marker → scroll to that anomaly card

7. Export / Reports (Top-right)
   - "Download Report" (PDF with anomalies)
   - "Export Data" (CSV)

8. Color Palette:
   - CRITICAL (#FF3B3B): red
   - HIGH (#FF9000): orange
   - WATCH (#FFD700): yellow
   - NORMAL (#00D966): green
   - Backgrounds: #080909, #111313, #1A1D1F
   - Text: #F3EFE4, #B8B3A8

9. Data Example:
   {
     anomalies: [
       {
         id: "AN001",
         asset_id: "MH-07",
         field: "Mumbai High",
         basin: "Arabian Sea",
         severity: "CRITICAL",
         deviation: -17.4,
         anomaly_score: 0.94,
         detected_at: "2026-08-16T16:42:07Z",
         duration_minutes: 135,
         expected: 1.42,
         actual: 1.17,
         production_history: [...]
       },
       ...
     ]
   }

10. Interactions:
    - Click card → expand detail or open modal
    - Hover badge → show tooltip explaining severity
    - Click severity filter → show only anomalies of that level
    - Click "View Details" → navigate to Deviation Attribution for that asset
    - Click "Acknowledge" → mark as seen (UI change)
    - Click "Resolve" → mark as resolved (remove from list or gray out)

11. Responsive:
    - Desktop: 2-column card grid
    - Tablet: 1-2 column grid
    - Mobile: 1-column stack

OUTPUT EXPECTATION:
- Card-based anomaly list
- Severity-coded color system
- Quick drill-down to details
- Mini charts on cards
- Professional severity indicators
```

---

### PAGE 6: DEVIATION ATTRIBUTION / SHAP ANALYSIS

**File**: `pages/DeviationAttribution.tsx`  
**Purpose**: Explainable AI showing root causes of production deviations

```
PROMPT FOR IDE:

Generate a React component called "DeviationAttribution" that displays 
SHAP-based feature contribution analysis for production deviations.

DESIGN REFERENCE:
[Attach Figma screenshot of Deviation Attribution page]

MANDATORY ELEMENTS:

1. Page Header
   - Title: "Production Deviation Attribution"
   - Subtitle: "Why is production below expectation? — AI-Powered Explainability"
   - Asset reference: "MH-07 | Mumbai High | Arabian Sea"

2. Deviation Summary Card (Top)
   - Large display of deviation:
     Expected Production: 1.42 MMBL (green text, large)
     Actual Production: 1.17 MMBL (red text, large)
     Gap: 0.25 MMBL (red bold text)
     Deviation: -17.4% (red bold text)
     Estimated Recovery: +0.18 MMBL (green text)
     Confidence: 87% (badge)

3. Main SHAP Contribution Chart (Horizontal Bar Chart, 60% of page width)
   - Title: "Feature Contributions to Production Deviation"
   - X-axis: Contribution value (from negative left to positive right)
   - Y-axis: Feature names
   
   Features (example):
   Historical Decline ████████████ -7.4 MMBL (43%)
   Operational Change ████████ -4.8 MMBL (28%)
   Production Volatility █████ -2.9 MMBL (17%)
   Other ███ -2.1 MMBL (12%)
   
   Bar colors:
   - Negative impact (left): #FF3B3B (red)
   - Positive impact (right): #00D966 (green)
   - Neutral: #B8B3A8 (gray)
   
   Interactivity:
   - Hover bar → show tooltip with exact value, percentage, explanation
   - Click feature name → expand to show more details about that factor

4. Feature Details Panel (Right side, 40% width)
   - Title: "Detailed Breakdown"
   - Expandable sections for each top feature:
   
   ▼ Historical Decline (-7.4 MMBL, 43%)
     Description: "Natural reservoir decline over time"
     Trend: "Average 2.3% per month decline"
     Confidence: "93% (model confident)"
     Action: "Monitor trend; normal for mature fields"
   
   ▼ Operational Change (-4.8 MMBL, 28%)
     Description: "Detected operational inefficiency"
     Indicators:
       • Pressure drop of 2.1 bar detected
       • Flow rate reduced by 8.3%
     Confidence: "89%"
     Action: "Investigate pressure system; check for blockage"
   
   ▼ Production Volatility (-2.9 MMBL, 17%)
     Description: "Random fluctuations in production"
     Range: "Within normal variance"
     Confidence: "94%"
     Action: "No immediate action; monitor"
   
   ▼ Other (-2.1 MMBL, 12%)
     Description: "Minor factors below detection threshold"
     Confidence: "71%"

5. Waterfall Chart (Optional, below main chart)
   - Shows cumulative impact of each feature
   - Starting point: Baseline expected
   - Each bar drops: -historical, -operational, -volatility, -other
   - Ending point: Actual production
   - X-axis: Feature sequence
   - Y-axis: Production value
   - Color-coded bars (red for decreases, green for increases)

6. Confidence Metrics (Bottom-left)
   - Attribution Model Confidence: 87%
   - Feature Measurement Confidence: 91%
   - Overall Explainability Confidence: 87%
   - Show as circular progress indicators or progress bars

7. Model Explanation (Bottom-right, smaller section)
   - Title: "Attribution Methodology"
   - Text: "This analysis uses SHAP (SHapley Additive exPlanations) to quantify how each input feature contributes to the deviation from expected production. SHAP values are model-agnostic and provide consistent, theoretically sound feature importance."
   - Link: "Learn more about SHAP" (→ Help/Glossary page)

8. Actions (Bottom)
   - "View Full Asset Profile" (navigate to Asset Detail)
   - "Investigate Feature" dropdown (select feature → show recommendations)
   - "Export Attribution Report" (PDF/CSV)

9. What-If Analysis (Optional, expandable section)
   - Title: "What-If Scenario"
   - If "Operational Change" was resolved:
     * Production would increase by 4.8 MMBL (+28%)
     * New total: 1.45 MMBL
   - If "Historical Decline" was reversed:
     * Production would increase by 7.4 MMBL (+43%)
     * New total: 1.91 MMBL (unrealistic, for illustration)
   - Sliders to adjust feature values and see impact

10. Color Palette:
    - Negative impact bars: #FF3B3B (red)
    - Positive impact bars: #00D966 (green)
    - Feature labels: #F3EFE4 (white)
    - Backgrounds: #080909, #1A1D1F
    - Text: #F3EFE4, #B8B3A8
    - Accent (confidence): #C7F700 (lime)

11. Typography:
    - Header: 24px bold
    - Feature names: 13px, monospace or sans-serif
    - Values: 14px bold, color-coded
    - Descriptions: 12px, line-height 1.5

12. Data Structure:
    {
      asset_id: "MH-07",
      expected: 1.42,
      actual: 1.17,
      deviation: -0.25,
      deviation_percent: -17.4,
      confidence: 0.87,
      features: [
        { name: "Historical Decline", value: -7.4, percentage: 43, confidence: 0.93, description: "..." },
        { name: "Operational Change", value: -4.8, percentage: 28, confidence: 0.89, description: "..." },
        ...
      ]
    }

13. Responsive:
    - Desktop: Main chart (60%), details (40%), side-by-side
    - Tablet: Chart (100%), details below (stack)
    - Mobile: Chart full-width, details below as accordion

OUTPUT EXPECTATION:
- Interactive horizontal bar chart
- Expandable feature details
- Clear confidence indicators
- Professional explainability interface
- Easy to understand by domain experts
```

---

### PAGE 7: INTERVENTION PRIORITY / DECISION PANEL

**File**: `pages/InterventionPriority.tsx`  
**Purpose**: Decision-support recommendations for asset intervention

```
PROMPT FOR IDE:

Generate a React component called "InterventionPriority" that provides 
ranked recommendations for which asset to prioritize for intervention.

DESIGN REFERENCE:
[Attach Figma screenshot of Intervention Priority page]

MANDATORY ELEMENTS:

1. Page Header
   - Title: "Intervention Priority & Decision Support"
   - Subtitle: "AI-driven recommendations for operational intervention allocation"

2. Asset Card (Large, prominent, center of page)
   Background gradient: #1A1D1F → #111313
   Border: subtle #2A2D30
   Padding: generous (2rem)
   
   Content:
   a) Asset Identity (top-left)
      - Asset ID: "MH-07" (large, 48px)
      - Field: "Mumbai High"
      - Basin: "Arabian Sea"
   
   b) AIPS Indicator (top-right, circular gauge)
      - AIPS Score: 92 (large, center of circle)
      - Out of: 100 (smaller text)
      - Needle: pointing to 92%
      - Color: gradient from yellow (#FFD700) to red (#FF3B3B) as score increases
      - Ring background: #2A2D30
   
   c) Priority Badge (left side, large)
      ◆ CRITICAL
      Color: #FF3B3B
      Text: white, 18px
   
   d) AIPS Components Breakdown (right side, 3-4 cards in grid)
      ┌─ Production Loss ────────┐
      │ 30% Weight               │
      │ Value: -17.4%            │
      │ Contribution: 5.2        │
      │ ◆ HIGH IMPACT            │
      └──────────────────────────┘
      
      ┌─ Anomaly Severity ──────┐
      │ 25% Weight               │
      │ Score: 0.94              │
      │ Contribution: 4.7        │
      │ ◆ CRITICAL               │
      └──────────────────────────┘
      
      ┌─ Recovery Potential ────┐
      │ 35% Weight               │
      │ Value: 1.24 MMBL         │
      │ Contribution: 4.3        │
      │ ◆ HIGH POTENTIAL         │
      └──────────────────────────┘
      
      ┌─ Complexity ────────────┐
      │ 10% Weight               │
      │ Score: 0.60              │
      │ Contribution: 0.6        │
      │ ◆ MEDIUM COMPLEXITY      │
      └──────────────────────────┘

3. AIPS Formula (Below components)
   Visual representation:
   AIPS = (0.30 × |-17.4%|) + (0.25 × 0.94) + (0.35 × 1.24) - (0.10 × 0.60)
   AIPS = 5.2 + 4.7 + 4.3 - 0.6 = 92
   
   Colors:
   - Positive terms: green text
   - Negative terms: red text
   - Result: large bold red (#FF3B3B)

4. Why This Asset Ranks High (Section below card)
   Title: "Why Prioritize MH-07?"
   Bullet points (✓ or ◆ icons):
   ✓ High production deviation from expected
   ✓ Rapid decline rate (2.3% per month)
   ✓ Severe anomaly detected (0.94 score)
   ✓ High recovery potential (1.24 MMBL)
   ✗ Moderate complexity (not blocking prioritization)
   
   Summary text:
   "This asset has the highest combination of production loss and recovery potential. 
   Intervening on this asset could recover up to 1.24 MMBL of production, making it 
   the highest-impact intervention target."

5. Recommended Action (Large section below)
   Title: "Recommended Action"
   Main action button (primary, large):
   ┌─────────────────────────────────────┐
   │  ▶ PRIORITIZE FOR INVESTIGATION     │
   │     Next step: Engage field team    │
   └─────────────────────────────────────┘
   
   Secondary options (smaller buttons below):
   - "Schedule Maintenance" (secondary)
   - "Simulate Recovery Scenario" (secondary)
   - "Add to Watch List" (tertiary)

6. Comparison to Other Assets (Optional section)
   Title: "Ranking Context"
   Simplified comparison:
   
   ▲ MH-07 | AIPS: 92 | CRITICAL ← Current asset
   2. CB-12 | AIPS: 78 | HIGH
   3. KG-05 | AIPS: 65 | MEDIUM
   ...
   
   Shows where this asset ranks among all portfolio assets

7. Risk Factors (Expandable section)
   Title: "Risk Factors & Considerations"
   
   ▼ Operational Risks
     • Field is mature (>15 years); recovery uncertain
     • Pressure system has history of issues
   
   ▼ Financial Implications
     • Estimated cost of intervention: $1.2M
     • Expected recovery: 1.24 MMBL (value ~$62M at $50/barrel)
     • ROI: Positive (breakeven in 3 weeks)
   
   ▼ Resource Requirements
     • Estimated personnel: 4 technicians
     • Estimated duration: 2-3 days
     • Equipment needed: Pressure regulator, flow meter calibration kit

8. Similar Past Cases (Optional)
   Title: "Similar Interventions"
   Card list of past interventions on similar assets:
   - "AS-09 (2025)" | Recovery achieved: +0.92 MMBL
   - "CB-08 (2025)" | Recovery achieved: +1.15 MMBL
   - "MH-04 (2024)" | Recovery achieved: +0.67 MMBL
   
   Average recovery: ~0.91 MMBL (compare to predicted 1.24)

9. Next Steps Section (Bottom)
   Title: "Next Steps"
   Ordered list:
   1. Notify field operations team
   2. Schedule on-site diagnostic (48h)
   3. Prepare intervention plan
   4. Execute intervention (2-3 days)
   5. Monitor recovery (1 week post-intervention)
   
   Each step is clickable → shows assigned team, timeline, status

10. Color Palette:
    - CRITICAL badge: #FF3B3B (red)
    - AIPS score 80+: gradient to red
    - Positive factors: #00D966 (green ✓)
    - High impact: #C7F700 (lime ◆)
    - High recovery: #00D966 (green)
    - High complexity: #FF9000 (orange)
    - Backgrounds: #080909, #1A1D1F
    - Text: #F3EFE4, #B8B3A8

11. Print-Friendly:
    - Include "Print Recommendation" button
    - PDF export includes all components

OUTPUT EXPECTATION:
- Prominent AIPS score display
- Clear, actionable recommendation
- Professional decision-support interface
- Easy to explain to operations team
```

---

## REMAINING PAGE PROMPTS (Quick Templates)

Due to length, I'll provide condensed templates for pages 8-15:

---

### PAGE 8: REAL-TIME SIMULATION CENTER

**Purpose**: Live data streaming with model inference  
**Key Elements**:
- Play/Pause/Reset controls + speed multiplier (1×, 5×, 10×)
- Asset selector dropdown
- Data stream table (Timestamp, Asset, Production, Forecast, Anomaly Score, Status)
- Live metrics dashboard (KPI cards updating as data streams)
- Anomaly trigger moment (visual flash/highlight)
- Integration with Forecasting and Anomaly Detection models

**Dummy Data**: 100+ observations at 10-second intervals (simulated 3-hour timeframe at 10× speed)

---

### PAGE 9: SCENARIO INJECTION CONTROLS

**Purpose**: User-triggered anomaly scenarios  
**Key Elements**:
- Scenario button grid (Normal Production, Gradual Decline, Sudden Drop, High Volatility, Recovery After Intervention)
- Asset selector
- Scenario description and expected outcome
- Inject button → triggers synthetic data generation
- Monitors dashboard updates in real-time
- Anomaly detection fires visibly

---

### PAGE 10: RECOVERY WHAT-IF ANALYSIS

**Purpose**: Scenario planning for recovery potential  
**Key Elements**:
- Current production display
- Scenario selector (Recovery +10% / +20% / +30% / Custom %)
- Projected production post-recovery
- Recovery volume in MMBL and monetary value
- Time to recover estimate
- Resource allocation estimate
- Impact on portfolio KPIs

---

### PAGE 11: AI MODEL STATUS PANEL

**Purpose**: System status and model health  
**Key Elements**:
- 4 module cards (Forecasting, Anomaly Detection, Attribution, Prioritization)
- Each card shows: Model name, Status (Active/Inactive), Last run time, Next run time
- System status gauge (OPERATIONAL / DEGRADED / OFFLINE)
- Data stream status (ACTIVE / PAUSED / SIMULATION)
- Model update schedule
- Performance metrics (accuracy trends)

---

### PAGE 12: DATA PROVENANCE

**Purpose**: Data source transparency and attribution  
**Key Elements**:
- Real Data Sources (links to OGD, PPAC, DGH with descriptions)
- Derived Data (features calculated from historical production)
- Synthetic Data (used for simulation/demo with disclaimer)
- Future Integration (authorized ONGC feeds)
- Data freshness indicators
- Data quality metrics
- Attribution and disclaimers

---

### PAGE 13: ROOT CAUSE ANALYSIS (DEEP DIVE)

**Purpose**: Detailed diagnostic investigation  
**Key Elements**:
- Multi-level feature contribution analysis
- Pressure, temperature, flow rate breakdowns
- Seasonal and trend factor analysis
- Peer comparison (how similar assets are performing)
- Historical precedent (past anomalies with similar signatures)
- Recommended investigation focus

---

### PAGE 14: FORECAST DETAILS & MODEL PERFORMANCE

**Purpose**: Model training and accuracy metrics  
**Key Elements**:
- Historical forecast accuracy over time (chart showing MAE trend)
- Model retraining schedule and history
- Forecast breakdown by basin/field
- Feature importance for forecasting (top 15 features)
- Model comparison (XGBoost vs LSTM performance)
- Cross-validation metrics

---

### PAGE 15: HELP & DOMAIN GLOSSARY

**Purpose**: User support and term definitions  
**Key Elements**:
- Searchable glossary (Production, Reservoir, Well, Asset, Decline, etc.)
- Quick start guide for new users
- Demo navigation tips
- FAQ (5-10 common questions)
- Keyboard shortcuts
- Contact/support info
- Links to data sources and external references

---

## END OF PROMPT TEMPLATES

