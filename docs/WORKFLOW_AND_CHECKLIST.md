# PetroPulse AI - Frontend Development Workflow & Checklist

---

## PHASE 1: DESIGN (Google Stitch)

### Step 1: Set Up Figma/Google Stitch Project
- [ ] Create new project: "PetroPulse AI Prototype"
- [ ] Import color palette from color scheme reference
- [ ] Set up typography (Inter, IBM Plex Mono)
- [ ] Create component library (KPI cards, badges, buttons, charts, etc.)

### Step 2: Design All 15 Pages
Use the **Frontend Specification** document to create wireframes/mockups for each page:

**Tier 1 - Entry Point (1 page)**
- [ ] Page 1: Command Center / Dashboard

**Tier 2 - Asset Management (2 pages)**
- [ ] Page 2: Asset Leaderboard
- [ ] Page 3: Asset Detail

**Tier 3 - Forecasting (2 pages)**
- [ ] Page 4: Production Forecasting Canvas
- [ ] Page 5: Forecast Details & Model Performance

**Tier 4 - Anomaly & Diagnosis (3 pages)**
- [ ] Page 6: Anomaly Detection Center
- [ ] Page 7: Deviation Attribution / SHAP
- [ ] Page 8: Root Cause Analysis

**Tier 5 - Decision Support (2 pages)**
- [ ] Page 9: Intervention Priority
- [ ] Page 10: Recovery What-If Scenario

**Tier 6 - Simulation & Demo (2 pages)**
- [ ] Page 11: Real-Time Simulation Center
- [ ] Page 12: Scenario Injection Controls

**Tier 7 - System & Meta (4 pages)**
- [ ] Page 13: AI Intelligence Panel / Model Status
- [ ] Page 14: Data Provenance
- [ ] Page 15: Help & Domain Glossary

### Step 3: Export High-Resolution Screenshots
- [ ] Export each page as PNG or JPEG (1920px width, 2x scale for clarity)
- [ ] Label files: `01_dashboard.png`, `02_leaderboard.png`, etc.
- [ ] Store in organized folder: `/designs/pages/`

### Step 4: Figma Design Review
- [ ] Color accuracy (check contrast, dark theme readability)
- [ ] Typography consistency
- [ ] Component reusability
- [ ] Responsive breakpoints (desktop, tablet, mobile)
- [ ] Interactive elements clearly marked
- [ ] Annotation for hover states, animations

---

## PHASE 2: DEVELOPMENT (React + IDE Prompts)

### Step 5: Prepare Master Context
- [ ] Copy **Master LLM Context Prompt** (from `master_llm_context_prompt.md`)
- [ ] This is your umbrella context for ALL page-specific prompts

### Step 6: Create IDE Prompts for Each Page
For each of the 15 pages:

1. **Gather**: Figma screenshot + page template from `github_and_prompts.md`
2. **Customize**: Modify the template with specific page name, elements, data structure
3. **Reference**: Attach screenshot to prompt
4. **Store**: Save prompt in `/prompts/page_XX_name.md`

Example workflow for Page 1:
```
FILE: /prompts/page_01_dashboard.md

[Use template from github_and_prompts.md → PAGE 1: COMMAND CENTER]
↓
[Modify for your specific design from Figma]
↓
[Attach Figma screenshot to prompt]
↓
[Copy complete prompt to Claude IDE / Gemini]
```

### Step 7: Generate React Components (Page by Page)

**Tools**: Claude IDE, Gemini Code Assist, or similar

**Workflow**:
1. Open IDE (VS Code with Claude extension, or Gemini)
2. Copy full prompt (Master Context + Page-Specific Prompt)
3. Attach screenshot of Figma page
4. Request: "Generate React component for [Page Name]"
5. Specify output format:
   ```
   - Language: TypeScript (.tsx)
   - Framework: React 18+
   - CSS: Tailwind + custom CSS modules
   - Charts: Recharts or Plotly.js
   - State: React Context or Zustand
   - Dummy data: hardcoded in component
   - File name: pages/[PageName].tsx
   ```

### Step 8: Component Quality Checklist (Per Page)

For each generated component, verify:

- [ ] **Visual Fidelity**: Matches Figma design accurately
- [ ] **Color Palette**: All colors from spec (#080909, #FF9000, #FF3B3B, #C7F700, etc.)
- [ ] **Typography**: Correct font sizes, weights, line-heights
- [ ] **Responsiveness**: Works on desktop (1920px), tablet (1024px), mobile (375px)
- [ ] **Interactivity**: All interactions work (click, hover, filters, sorting)
- [ ] **Data Structure**: Matches dummy data format in spec
- [ ] **Accessibility**: ARIA labels, keyboard navigation
- [ ] **Performance**: No unnecessary re-renders, smooth animations
- [ ] **Error Handling**: Graceful fallbacks if data is missing
- [ ] **Code Quality**: No console warnings, clean imports, no unused variables

### Step 9: Setup Project Structure

```
petropulse-ai/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── KPICard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── SystemStatusBar.tsx
│   │   ├── charts/
│   │   │   ├── ProductionTrendChart.tsx
│   │   │   ├── ForecastChart.tsx
│   │   │   ├── SHAPChart.tsx
│   │   │   └── AnomalyHeatmap.tsx
│   │   └── ...
│   ├── pages/
│   │   ├── Dashboard.tsx (Page 1)
│   │   ├── AssetLeaderboard.tsx (Page 2)
│   │   ├── AssetDetail.tsx (Page 3)
│   │   ├── ForecastingCanvas.tsx (Page 4)
│   │   ├── AnomalyDetectionCenter.tsx (Page 6)
│   │   ├── DeviationAttribution.tsx (Page 7)
│   │   ├── InterventionPriority.tsx (Page 9)
│   │   ├── SimulationCenter.tsx (Page 11)
│   │   ├── ModelStatus.tsx (Page 13)
│   │   ├── DataProvenance.tsx (Page 14)
│   │   ├── Glossary.tsx (Page 15)
│   │   └── ...
│   ├── hooks/
│   │   ├── useAssetData.ts
│   │   ├── useSimulation.ts
│   │   └── useForecasting.ts
│   ├── types/
│   │   └── index.ts (TypeScript interfaces)
│   ├── data/
│   │   ├── mock-assets.ts
│   │   ├── mock-timeseries.ts
│   │   ├── mock-anomalies.ts
│   │   └── mock-shap.ts
│   ├── styles/
│   │   ├── globals.css (dark theme, color vars)
│   │   └── tailwind.config.js
│   ├── App.tsx (Router setup)
│   └── main.tsx
├── public/
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.js (or next.config.js)
```

### Step 10: Integrate Navigation

- [ ] Set up React Router (v6+)
- [ ] Create navigation structure:
  ```
  Home (Dashboard)
  ├── Assets
  │   ├── Leaderboard
  │   └── Detail/:assetId
  ├── Intelligence
  │   ├── Forecasting
  │   ├── Anomalies
  │   ├── Attribution
  │   └── Decision Panel
  ├── Scenarios
  │   ├── Simulation
  │   └── What-If
  └── System
      ├── Model Status
      ├── Data Provenance
      └── Glossary
  ```
- [ ] Add breadcrumb navigation to each page
- [ ] Test navigation flow (golden path)

### Step 11: Integrate Dummy Data

Create mock data files for:
- [ ] **assets.ts**: Array of 128 asset objects
- [ ] **timeseries.ts**: Historical production data (12+ months)
- [ ] **forecasts.ts**: Forecasted production by horizon (30D, 90D, 180D, 365D)
- [ ] **anomalies.ts**: List of active anomalies with scores
- [ ] **shap-values.ts**: Feature contribution data (SHAP)
- [ ] **simulation-stream.ts**: Synthetic time-series data for real-time demo

Example dummy data structure:
```typescript
// assets.ts
export const assets = [
  {
    id: "MH-07",
    field: "Mumbai High",
    basin: "Arabian Sea",
    current_production: 1.17,
    expected_production: 1.42,
    deviation: -17.4,
    anomaly_severity: "CRITICAL",
    recovery_potential: 1.24,
    aips_score: 92,
    priority: "CRITICAL",
    health_score: 68,
    decline_rate: 2.3,
  },
  // ... 127 more assets
];

// timeseries.ts
export const productionHistory = [
  { timestamp: "2025-01-01", asset_id: "MH-07", production: 1.95, forecast: 1.98 },
  { timestamp: "2025-01-08", asset_id: "MH-07", production: 1.92, forecast: 1.96 },
  // ... historical data for 24 months
];

// forecasts.ts
export const forecasts = {
  "MH-07": {
    horizon_30d: 1.21,
    horizon_90d: 1.24,
    horizon_180d: 1.28,
    horizon_365d: 1.35,
    confidence: 0.87,
  },
};

// anomalies.ts
export const anomalies = [
  {
    id: "AN001",
    asset_id: "MH-07",
    severity: "CRITICAL",
    deviation: -17.4,
    anomaly_score: 0.94,
    detected_at: "2026-08-16T16:42:07Z",
  },
  // ... more anomalies
];

// shap-values.ts
export const shapValues = {
  "MH-07": [
    { feature: "Historical Decline", value: -7.4, percentage: 43 },
    { feature: "Operational Change", value: -4.8, percentage: 28 },
    { feature: "Production Volatility", value: -2.9, percentage: 17 },
    { feature: "Other", value: -2.1, percentage: 12 },
  ],
};

// simulation-stream.ts
export const simulationDataStream = [
  { timestamp: "16:40:00", production: 1.42, forecast: 1.40, anomaly_score: 0.12 },
  { timestamp: "16:40:30", production: 1.41, forecast: 1.40, anomaly_score: 0.14 },
  // ... 100+ data points
];
```

---

## PHASE 3: INTEGRATION & POLISH

### Step 12: Chart Integration

- [ ] Install charting library: `npm install recharts` or `plotly.js`
- [ ] Create wrapper components for each chart type:
  - [ ] ProductionTrendChart.tsx
  - [ ] ForecastChart.tsx
  - [ ] SHAPChart.tsx
  - [ ] AnomalyHeatmap.tsx
  - [ ] AssetMapVisualization.tsx
  - [ ] AIPSGauge.tsx
  - [ ] TimelineChart.tsx
- [ ] Test charts with mock data
- [ ] Verify responsiveness and tooltips

### Step 13: State Management Setup

- [ ] Choose state management: React Context (simple) or Zustand (scalable)
- [ ] Create stores/contexts:
  - [ ] AssetStore (current asset, filters, sorting)
  - [ ] SimulationStore (play/pause, speed, current timestamp)
  - [ ] AnomalyStore (active anomalies, selected anomaly)
  - [ ] UIStore (sidebar open/closed, modals)
- [ ] Test state updates across pages

### Step 14: Responsive Design Testing

Test on all breakpoints:
- [ ] Desktop (1920px)
- [ ] Tablet (1024px)
- [ ] Mobile (375px)
- [ ] Verify all pages render correctly
- [ ] Test navigation on mobile (drawer sidebar)
- [ ] Check touch interactions

### Step 15: Dark Theme Verification

- [ ] All text has sufficient contrast (#F3EFE4 on #080909 minimum 7:1 ratio)
- [ ] Colors meet WCAG AA accessibility standards
- [ ] No bright whites that cause eye strain
- [ ] Test in low-light environment

### Step 16: Add Global Styles

- [ ] Create `tailwind.config.js` with custom colors:
  ```javascript
  theme: {
    colors: {
      'dark-bg': '#080909',
      'dark-surface': '#111313',
      'dark-elevated': '#1A1D1F',
      'dark-border': '#2A2D30',
      'accent-amber': '#FF9000',
      'accent-lime': '#C7F700',
      'accent-red': '#FF3B3B',
      'accent-green': '#00D966',
      'text-primary': '#F3EFE4',
      'text-secondary': '#B8B3A8',
    },
  }
  ```
- [ ] Create global CSS for scrollbars, focus states, animations

### Step 17: Animation & Transitions

- [ ] Add smooth page transitions (fade, slide)
- [ ] Add hover effects on interactive elements
- [ ] Add loading animations for charts
- [ ] Smooth transitions when data updates
- [ ] Anomaly detection "flash" animation

### Step 18: Accessibility

- [ ] Add ARIA labels to all buttons and form inputs
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus indicators visible on all interactive elements
- [ ] Color-blind safe palette (no red-green only distinctions)
- [ ] Test with screen reader (NVDA, JAWS)

---

## PHASE 4: TESTING & DEPLOYMENT

### Step 19: End-to-End Testing (Golden Path)

Test the complete 15-step demo flow:

1. [ ] Open Command Center → see portfolio health
2. [ ] Click "View Asset Leaderboard" → navigate to Leaderboard
3. [ ] Sort by AIPS descending → MH-07 at top
4. [ ] Click MH-07 → open Asset Detail
5. [ ] View Production tab → see forecast chart
6. [ ] Click on Forecasting Canvas → full forecast view
7. [ ] View Anomaly Detection Center → see MH-07 anomaly
8. [ ] Click anomaly → open Deviation Attribution
9. [ ] See SHAP chart → understand root causes
10. [ ] Navigate to Intervention Priority → see AIPS breakdown
11. [ ] View recovery potential → click "Simulate Recovery"
12. [ ] Navigate to Simulation Center → start simulation
13. [ ] Click "Scenario Injection" → select "Gradual Decline"
14. [ ] Watch data stream → anomaly detection fires
15. [ ] See priority updated → navigation back to dashboard

- [ ] All 15 steps work flawlessly
- [ ] No console errors or warnings
- [ ] Smooth transitions between pages
- [ ] All data displayed correctly
- [ ] Charts interactive and responsive

### Step 20: Performance Testing

- [ ] Lighthouse score >90 on desktop
- [ ] Load time <3 seconds on 3G
- [ ] No memory leaks (DevTools check)
- [ ] Smooth 60 FPS animations (DevTools Performance tab)
- [ ] No unnecessary re-renders (React DevTools Profiler)

### Step 21: Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

- [ ] All features work on all browsers
- [ ] No rendering issues
- [ ] Consistent styling

### Step 22: Build & Optimization

- [ ] Code splitting for pages
- [ ] Tree-shake unused code
- [ ] Compress images
- [ ] Minify CSS/JS
- [ ] Test production build

### Step 23: Documentation

- [ ] Create README.md with setup instructions
- [ ] Document component library
- [ ] Create demo flow guide
- [ ] Document API structure (mock data)
- [ ] Add troubleshooting section

### Step 24: Deployment

- [ ] Push to GitHub repo
- [ ] Deploy to Vercel:
  ```bash
  npm i -g vercel
  vercel --prod
  ```
  OR
- [ ] Deploy to Netlify:
  ```bash
  npm run build
  netlify deploy --prod --dir=dist
  ```
- [ ] Set up domain (if applicable)
- [ ] Enable Vercel analytics
- [ ] Share live link with team

---

## GITHUB REPOSITORY SETUP

### Step 25: Initialize Repository

```bash
# Create repo
git init petropulse-ai
cd petropulse-ai

# Create .gitignore
echo "node_modules/
dist/
.env.local
.DS_Store
*.swp" > .gitignore

# Initial commit
git add .
git commit -m "Initial commit: Project setup"
git branch -M main
git remote add origin https://github.com/[team]/petropulse-ai.git
git push -u origin main
```

### Step 26: README & Documentation

Create comprehensive README:
```markdown
# PetroPulse AI

**Integrated Hydrocarbon Production Forecasting and Asset Prioritization Engine**

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation
```bash
git clone https://github.com/[team]/petropulse-ai.git
cd petropulse-ai
npm install
npm run dev
```

### Demo
Open http://localhost:5173 in browser.

## Architecture
[Include architecture diagram]

## Features
[List of features from problem statement]

## Tech Stack
- React 18, TypeScript
- Recharts for charting
- Tailwind CSS
- Zustand for state
- Vite for bundling

## Project Structure
[Include directory tree]

## Contributing
[Guidelines]

## License
MIT
```

---

## FINAL CHECKLIST

- [ ] All 15 pages designed in Figma/Google Stitch
- [ ] All 15 pages exported as high-res screenshots
- [ ] All 15 IDE prompts created and tested
- [ ] All 15 React components generated
- [ ] Navigation integrated and tested
- [ ] Dummy data wired into all components
- [ ] Charts interactive and responsive
- [ ] Dark theme colors verified
- [ ] Golden path tested end-to-end
- [ ] Accessibility checks passed
- [ ] Performance optimized
- [ ] Cross-browser testing complete
- [ ] Documentation written
- [ ] GitHub repo initialized with README
- [ ] Project deployed to Vercel/Netlify
- [ ] Live link shareable and working

---

## TIMELINE ESTIMATE

- **Phase 1 (Design)**: 6-8 hours (Google Stitch, export screenshots)
- **Phase 2 (Development)**: 16-20 hours (React components, 2-3 hours per page × 6-7 pages, then integration)
- **Phase 3 (Integration)**: 6-8 hours (Charts, state, responsive design)
- **Phase 4 (Testing)**: 4-6 hours (E2E, performance, cross-browser)
- **Total**: ~32-42 hours for full prototype

**Hackathon Sprint** (48 hours): Doable if you focus on MVP checklist and defer nice-to-have pages.

---

## SUCCESS CRITERIA

✅ Prototype loads instantly (no spinners)  
✅ All 5 mandatory demo pages work flawlessly  
✅ Golden path (15-step flow) completes in <5 minutes  
✅ Judges see complete Observe → Forecast → Detect → Explain → Prioritize → Simulate → Act loop  
✅ SHAP attribution clearly explained  
✅ AIPS scoring transparent and justifiable  
✅ Real-time simulation shows anomaly detection live  
✅ Dark theme, no generic SaaS look  
✅ No console errors  
✅ Mobile responsive (judges may view on iPad)  

---

## NEXT IMMEDIATE STEP

1. **Start with Google Stitch Design**: Design Page 1 (Dashboard) first as a template
2. **Export and Screenshot**: Get high-res image of dashboard
3. **Create First IDE Prompt**: Use template from `github_and_prompts.md` + screenshot
4. **Generate First Component**: Run prompt through Claude IDE
5. **Test Component**: Verify it renders and matches design
6. **Repeat for Pages 2-7**: These are the critical MVP pages

Good luck! 🚀

