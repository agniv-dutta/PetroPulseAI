# PetroPulse AI — Architecture Audit

> Date: 2026-08-24 · Auditor: Lead Architect (pre-implementation, Stage 0)
> Scope: full repository inspection before any code modification.

---

## 1. Current Architecture (as-found)

```
PetroPulseAI/
├── docs/                  # 14 spec/design documents (no code)
├── frontend/              # React 19 + Vite SPA — 100% client-side
│   ├── src/
│   │   ├── pages/         # 16 page components (all mock-data driven)
│   │   ├── components/    # 11 reusable components
│   │   ├── utils/         # Arps, Isolation Forest, AIPS, synthetic gen (TS)
│   │   ├── hooks/         # useAssetData (static, no fetch)
│   │   ├── data/          # mockData.ts (hardcoded assets/anomalies/SHAP)
│   │   └── types/         # minimal shared types
│   └── dist/              # committed prebuilt bundle
├── .venv/                 # Python 3.11.9 venv — EMPTY (pip/setuptools only)
└── README.md              # aspirational FastAPI/TimescaleDB stack description
```

**Headline finding:** the repo is a polished *front-end-only demo*. There is **no backend**, **no database**, **no network calls** in app code (zero `fetch`/`axios`/`WebSocket`/`EventSource`), no env configuration (`import.meta.env` never used), and no auth (the "AUTH_ACCESS" button is decorative). The README's FastAPI + TimescaleDB stack exists only as documentation.

## 2. Existing Frontend Inventory

### Framework & toolchain
| Concern | Finding |
|---|---|
| Framework | React **19.2.8** + TypeScript ~6.0 |
| Bundler | Vite 8.2 (no path aliases, no dev proxy configured) |
| Routing | react-router-dom **7** (`BrowserRouter`), lazy-loaded pages |
| Charts | **recharts 3.10** everywhere; leaflet 1.9 + react-leaflet 5 for maps |
| Styling | Tailwind 3.4 with custom dark tokens (`dark-bg #080909`, `accent-amber #FF9000`, `accent-lime #C7F700`, …) — BUT many pages duplicate hex values in inline `style={{}}` objects |
| Lint | oxlint (not ESLint) |
| State | none (local useState/useMemo only) |
| Package manager | npm (package-lock.json committed) |

### Routes (App.tsx)
| Path | Page | Data source |
|---|---|---|
| `/` | LandingPage | static |
| `/dashboard` | Dashboard | inline `mockPortfolio` |
| `/assets/leaderboard` | AssetLeaderboard | runtime-generated 128 assets → real `calculateAIPS()` |
| `/assets/detail/:assetId` | AssetDetail | `useAssetData(id)` (static MH-07 clone) |
| `/intelligence/forecasting` | ForecastingCanvas | hardcoded forecast dataset |
| `/intelligence/forecast-details` | PlaceholderPages stub | — |
| `/intelligence/anomaly-detection` | AnomalyDetectionCenter | local `mockAnomaliesList` |
| `/intelligence/deviation-attribution` | DeviationAttribution | local SHAP mocks |
| `/intelligence/root-cause` | RootCauseAnalysis | `mockSHAPData` + deterministic yield model |
| `/intelligence/priority` | InterventionPriority | `mockAIPSBreakdown` (MH-07 = 92) |
| `/scenarios/recovery-what-if` | RecoveryWhatIf | `mockRecoveryScenarios/Timeseries` |
| `/scenarios/simulation` | SimulationCenter | `setInterval` telemetry sim + scripted valve failure |
| `/scenarios/injection` | ScenarioInjection | scenario payload generator (cosmetic "transmission") |
| `/system/model-status` | ModelStatus | fake retrain toasts, ingestion log |
| `/system/provenance`, `/data-provenance` | DataProvenance | long-form transparency doc |
| `/system/help` | HelpGlossary | glossary + FAQ |

Known broken links: `/leaderboard` (from AssetDetail) and `/anomalies` (from DeviationAttribution) fall through to catch-all redirect.

### Reusable logic worth keeping (high value)
| File | Contents |
|---|---|
| `utils/arpsDeclineCurve.ts` | Full Arps hyperbolic/exponential decline model + grid-search curve fitter returning qi/Di/b/R²/MAE/forecasts |
| `utils/anomalyDetector.ts` | **Isolation Forest implemented from scratch in TS** (iTree/iForest scoring, severity bands, contributing features, ROC-AUC evaluation, retrain) |
| `utils/aipsCalculator.ts` | AIPS = 0.35·loss + 0.25·anomaly + 0.40·recovery − 0.10·complexity, clamped 0–100, priority bands CRITICAL/HIGH/MEDIUM/LOW, full transparency breakdown |
| `utils/syntheticDataGenerator.ts` | Physics-inspired telemetry synthesizer: Arps base × seasonal factors × Box–Muller noise, 4 anomaly scenarios (VALVE_FAILURE, GRADUAL_CLOG, HIGH_VOLATILITY, RECOVERY), derived P/T/flow |
| `components/AIPSBreakdown.tsx`, `SHAPExplanationCard.tsx`, `RecoveryOpportunityCard.tsx` | Explainability visualizations with honest disclaimers |
| `components/DataTransparencyBanner.tsx` | REAL/SYNTHETIC/DERIVED disclosure UI |
| `components/DashboardLayout.tsx`, `Sidebar.tsx`, `SystemStatusBar.tsx`, `Breadcrumbs.tsx` | App shell |
| `components/AssetMap.tsx` | Leaflet map of Indian assets |

Note: `anomalyDetector.ts` and much of `syntheticDataGenerator.ts` are **well-built but largely unused** by pages (pages use ad-hoc random logic).

## 3. Existing Backend / Data Layer

- **None.** No `backend/` directory. `.venv` is empty.
- README documents a target stack (FastAPI, PostgreSQL+TimescaleDB, scikit-learn/XGBoost/PyTorch/SHAP, Docker) that has never been implemented.
- HelpGlossary FAQ mentions "FastAPI, PostgreSQL, TimescaleDB" as hypothetical.

## 4. Authentication

None present. Nothing to migrate or preserve.

## 5. Mock Data & Types

- `src/data/mockData.ts`: 6 canonical assets (MH-07 flagship CRITICAL/AIPS 92, CB-12 HIGH/78, KG-05 WATCH/65, AS-09 NORMAL/42, CB-08 LOW/38, MH-04 LOW/32), SHAP contributions, recovery scenarios, telemetry generator, provenance sources, glossary, models.
- `hooks/useAssetData.ts`: single hardcoded MH-07 bundle; unknown ids silently get identical numbers (data-honesty risk in a live demo).
- `types/index.ts` is minimal; richer types are scattered/duplicated across files (two divergent `Asset` interfaces exist).

## 6. Missing Components (gap list)

1. Entire backend service (REST + WebSocket).
2. Database persistence & migrations (assets, monthly production, forecasts, anomalies, scores, provenance events, simulation runs).
3. Server-side ML: Arps fitting on real historical series, forecasting, anomaly detection, SHAP attribution — currently TS ports/mocks only.
4. Intelligence layer: AIPS/recovery/ranking computed server-side over DB data.
5. Real-time simulation service streaming over WebSocket.
6. Ingestion pipeline for public datasets (OGD/PPAC/DGH CSVs) with provenance tracking.
7. Frontend API client layer + data-fetching hooks + WebSocket hook.
8. Environment/config handling (CORS origins, DB URL, feature flags).
9. Tests (frontend has zero; backend obviously zero).
10. Docker packaging & orchestration.
11. Model performance evaluation endpoints (MAE/RMSE/R²/MAPE, precision/recall/F1/ROC-AUC) backing the existing metrics panels.

## 7. Proposed Target Architecture

```
PetroPulseAI/
├── backend/                        # NEW — all server work happens here
│   ├── app/
│   │   ├── main.py                 # FastAPI app factory, CORS, lifespan, routers, WS
│   │   ├── core/
│   │   │   ├── config.py           # pydantic-settings (env-driven)
│   │   │   └── database.py         # SQLAlchemy engine/session
│   │   ├── models/                 # ORM: Asset, MonthlyProduction, Telemetry,
│   │   │                           #      AnomalyEvent, ForecastRun, ScoreRun,
│   │   │                           #      ProvenanceRecord, SimulationSession
│   │   ├── schemas/                # Pydantic request/response contracts
│   │   ├── ingestion/              # loaders for public CSVs + normalizer + provenance
│   │   ├── ml/
│   │   │   ├── arps.py             # curve fitting (scipy)
│   │   │   ├── anomaly.py          # sklearn IsolationForest wrapper
│   │   │   ├── forecast.py         # gradient-boosted forecaster (+ eval metrics)
│   │   │   └── attribution.py      # SHAP explainer
│   │   ├── intelligence/
│   │   │   ├── aips.py             # mirrors frontend formula exactly
│   │   │   ├── recovery.py         # estimated recovery opportunity
│   │   │   └── ranking.py          # portfolio ranking
│   │   ├── simulation/
│   │   │   ├── engine.py           # synthetic telemetry engine (ports TS generator)
│   │   │   └── ws.py               # WebSocket endpoint + session manager
│   │   └── api/v1/                 # REST routers
│   ├── tests/                      # pytest suite
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml              # NEW (root): backend + frontend + optional Postgres
├── frontend/                       # MODIFIED ONLY at integration layer:
│   └── src/api/                    # NEW: typed client + hooks (fetch/WS), Vite proxy
└── docs/
```

Design decisions:
- **SQLite by default** (file-based, zero-setup for hackathon demo) with SQLAlchemy so PostgreSQL/TimescaleDB is a config swap (`DATABASE_URL`) — matches README ambition without demo friction.
- ML stack kept lean and installable on Windows: numpy/pandas/scipy/scikit-learn/shap; XGBoost optional via extras (gradient boosting fallback from scikit-learn guarantees parity).
- **AIPS formula parity**: backend must reproduce the frontend's exact weights (0.35/0.25/0.40/−0.10) and bands so UI numbers stay consistent when switching mock→live.
- All synthetic outputs carry explicit `source: SYNTHETIC|DERIVED|REAL` markers end-to-end into API payloads (extends the existing DataTransparencyBanner pattern).

## 8. Integration Risks

| Risk | Mitigation |
|---|---|
| Two divergent `Asset` type shapes (mock vs types) | Define one canonical API schema; adapt in `src/api` only |
| Pages hardcode inline styles/hex values | Do not restyle; only replace data sources |
| Frontend expects specific shapes (e.g., `useAssetData` bundle, leaderboard row fields) | Build API responses to match existing shapes first; refactor later |
| `useAssetData` returns same data for any id | Backend serves per-asset bundles; keep graceful fallback |
| No dev proxy in Vite | Add `/api` + `/ws` proxy to `vite.config.ts` (additive change) |
| Committed `dist/` may go stale | Ignore during integration; rebuild at deployment |
| Broken internal links (`/leaderboard`, `/anomalies`) | Fix during integration pass (low-risk route aliases) |
| Windows environment | Avoid heavy deps requiring compilation (torch); use sklearn/xgboost wheels only if needed |
| Data honesty | Never label synthetic telemetry as ONGC; enforce provenance tags at schema level |

## 9. Files That Should Be REUSED (unchanged or lightly adapted)

- `frontend/src/utils/*` — all four algorithm modules (reference implementations; backend ports them to Python and cross-checks numerics against them)
- `frontend/src/components/**` — entire component library
- `frontend/src/pages/LandingPage.tsx`, `HelpGlossary.tsx`, `DataProvenance.tsx` — static content pages, untouched
- Design tokens in `tailwind.config.js`; `index.css`; app shell components
- `docs/*.md` specs — treated as requirements source

## 10. Files That Should Be REPLACED / REWIRED (behavior change, same UI)

- `src/hooks/useAssetData.ts` — becomes async fetch of `/api/v1/assets/{id}/bundle`
- `src/data/mockData.ts` — retained as offline/demo fallback, but pages move to API hooks
- `Dashboard.tsx`, `AssetLeaderboard.tsx`, `AssetDetail.tsx`, `ForecastingCanvas.tsx`, `AnomalyDetectionCenter.tsx`, `DeviationAttribution.tsx`, `SimulationCenter.tsx`, `ModelStatus.tsx` — swap inline mocks for API/WS data (visual output preserved)

## 11. Files That Should Remain UNTOUCHED

- `frontend/dist/**` (build artifacts), `public/**` assets
- `.venv/`
- `docs/**` historical specs
- `LICENSE`, root `.gitignore` (append-only if needed)
- Component internals not affected by data sourcing

---

## 12. Implementation Plan (ordered execution)

| # | Stage | Deliverables |
|---|---|---|
| 0 | Audit (this doc) | ARCHITECTURE_AUDIT.md |
| 1 | Backend foundation | `backend/app` skeleton, settings, CORS, `/health`, logging |
| 2 | Database + migrations | SQLAlchemy models, create-all + idempotent seed of canonical assets & 36 months history per asset |
| 3 | Ingestion + preprocessing | Public-dataset loader contract + bundled seed CSVs; preprocessing (resample, seasonal factors, cleaning); provenance rows |
| 4 | ML engine | Arps fitter (scipy), IsolationForest detector + evaluator, GBM forecaster with MAE/RMSE/R²/MAPE backtests |
| 5 | Intelligence engine | SHAP attribution, recovery-opportunity estimator, AIPS (formula-parity with TS), portfolio ranking |
| 6 | Simulation + WS | Synthetic telemetry engine (port of TS generator incl. Box–Muller noise + 4 anomaly scenarios), WebSocket broadcast sessions |
| 7 | REST API | `/api/v1`: assets, leaderboard, asset detail bundle, forecast, anomalies, attribution, priority, provenance, models, simulation control |
| 8 | Frontend API integration | `src/api/client.ts`, typed schemas mirroring backend, SWR-style hooks, WS hook, Vite proxy |
| 9 | Full-stack integration | Rewire pages to live data behind graceful fallback to mocks |
| 10 | Testing + validation | pytest unit tests (Arps vs known solutions, AIPS parity with TS fixtures, IF behavior, API contracts) + frontend build/typecheck green |
| 11 | Docker | backend Dockerfile, root compose (backend+frontend), healthchecks |
| 12 | Enhancement pass | error/loading states, provenance surfacing, metric panels wired to real evaluations |
| 13 | Demo optimization | golden-path warm cache, seed determinism, startup script, demo script doc |

**Execution rule:** each stage completes and verifies before the next begins. No existing frontend functionality is removed; integration is additive behind an API layer.
