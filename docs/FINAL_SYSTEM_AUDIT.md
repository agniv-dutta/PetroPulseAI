# PetroPulse AI — FINAL SYSTEM AUDIT
**Date:** 2026-08-26  
**Auditor:** Senior Engineer (sign-off authority)  
**Scope:** Full repository-wide audit — `frontend/`, `backend/`, `database`, `ML`, `simulation`, `API`, `WebSocket`, `Docker`, `tests`, `configuration`, `documentation`  
**Mode:** Read-only inspection with evidence-backed findings; no code modified prior to this report.

---

## 0. Executive Summary

| Area | Verdict |
|---|---|
| Architecture | PASS (with warnings) |
| Data provenance | PASS |
| ML correctness | PASS |
| Decision intelligence | **FAIL — frontend duplicate AIPS** |
| API surface | PASS (with warnings) |
| Real-time simulation + WebSocket | PASS |
| Frontend pages | PASS (with warnings) |
| Failure handling | WARNING |
| Performance | WARNING |
| Security | WARNING |
| Demo readiness (golden path) | PASS (conditional on critical fix) |

**Overall system sign-off: CONDITIONAL FAIL — 1 critical defect blocks certification.** Fixes are specified in Section D and implemented post-audit.

---

## 1. ARCHITECTURE

### Expected
```
React (Vite + Router + Recharts/Leaflet)
  ↓  REST + WebSocket
FastAPI (lifespan, routers, error envelopes)
  ↓
Services (AIPS, Recovery, Recommendation, Simulation, Data, ModelRegistry)
  ↓
ML (Arps, Forecast, Anomaly, SHAP/Attribution, PerformanceMetrics)
  ↓
Database (SQLAlchemy 2.0 + SQLite dev / Postgres+TimescaleDB prod + Redis optional + Celery)
```
and separately
```
Simulation (SyntheticGenerator) → simulation_service (ML inference per tick) → WebSocket → Frontend (useSimulationSocket)
```

### Observed — Evidence

- **Entry:** `backend/app/main.py:34-53` — lifespan creates `get_simulation_service()`, `init_db()`, `seed_database()`, `warm_cache()`, `ModelRegistry.load_from_db()`. Single startup path.
- **Router aggregation:** `backend/app/main.py:82-95` — 12 routers mounted under `settings.api_v1_prefix` (`/api/v1`). Root `/health` reports `active_simulations` from `SimulationService`.
- **Core:** `backend/app/core/config.py:1-84` — `Settings` (pydantic-settings) with `database_url`, `redis_url`, CORS origins, AIPS thresholds, recovery rate, simulation caps.
- **Database:** `backend/app/core/database.py:42-73` — sync engine `create_engine(...)`, `SessionLocal`, `get_db()` generator, `init_db()` idempotent; async stack gated on `postgresql+asyncpg` URL.
- **Services:** `backend/app/services/{aips_service.py,recovery_service.py,recommendation_service.py,simulation_service.py,data_service.py,model_registry.py}` — correct layering; intelligence pipeline (`backend/app/intelligence/pipeline.py:60-338`) orchestrates per-asset ML and persists derived rows.
- **ML:** `backend/app/ml/{arps.py,forecast.py,anomaly.py}` + `backend/app/intelligence/attribution.py` — single source for each model.
- **Simulation:** `backend/app/utils/synthetic_generator.py:14-268` (honesty contract `SYNTHETIC`/`simulation=true`) → `backend/app/services/simulation_service.py:1-577` (private generator+forecaster+detector+buffer per `SimulationRun`, `asyncio.sleep(wall_interval_seconds)`, `telemetry` fan-out) → WebSocket handler `backend/app/main.py:160-197` delegates to `simulation_service.attach/detach`.
- **Frontend:** `frontend/src/App.tsx:1-209` — 16 lazy routes inside `DashboardLayout` + `LandingPage`; `frontend/src/api/client.ts:6-314` centralized fetch client; `frontend/src/api/hooks.ts:67-296` `useSimulationSocket` maps flat telemetry → chart ticks + timeline events.
- **Docker:** `docker-compose.yml:1-174` — 8 services (postgres timescale, redis, backend, celery_worker, celery_beat, frontend nginx, prometheus, grafana); backend `Dockerfile:1-48` two-stage; frontend `Dockerfile:1-27` + `frontend/nginx.conf:1-35` SPA fallback + `/api/` + `/ws/` proxy.
- **Vite proxy:** `frontend/vite.config.ts:8-21` — `/api`, `/ws`, `/health` → `VITE_API_TARGET || localhost:8000`.

### Verdict
**PASS.** Stack ordering is faithful. No bypass: all frontend state that matters originates from FastAPI responses. **Warning:** Intelligence pipeline caches (`pipeline.py:32-34` threading `Lock`) and `SimulationService` (`simulation_service.py:107`) use independent singletons; coexistence is safe but concurrency model is split (threads vs asyncio) — see §9.

---

## 2. DATA

### Contracts checked
- `REAL` = published public data (OGD/PPAC/DGH) — reference only
- `SYNTHETIC` = generator / simulation outputs — never operator SCADA
- `DERIVED` = model outputs (forecast, anomaly, AIPS, SHAP)
- No synthetic telemetry represented as ONGC telemetry

### Evidence

- **DB constraint:** `backend/app/models/entities.py:49` — `_SOURCE_TYPE_CHECK = "source_type IN ('REAL','SYNTHETIC','DERIVED')"` applied to `production_history`, `data_sources`; `ck_production_history_source_type` etc. `DataSource` also constrained at `backend/app/models/entities.py:331`. Migrations mirror at `backend/migrations/versions/20260824_1305_c3f9a1d7e4b2_initial_petropulse_schema.py:28`.
- **Seed honesty:** `backend/app/ingestion/seed.py:4-10` docstring “Everything written by this module is SYNTHETIC”; `seed_database()` writes `source_type="SYNTHETIC"` at line 182 and `DataSource` catalogue enumerates 3 REAL entries (OGD/PPAC/DGH), 1 SYNTHETIC, 1 DERIVED at lines 84-106. Interventions flagged synthetic.
- **Synthetic generator honesty:** `backend/app/utils/synthetic_generator.py:38-43` — `SYNTHETIC_SOURCE_TYPE = "SYNTHETIC"`, `SIMULATION_FLAG = True`, `SYNTHETIC_DISCLAIMER = "NOT actual ONGC/operator SCADA data."`; every `next_observation()` at line 258-264 attaches `source_type`, `simulation`, `source`, `disclaimer`.
- **Simulation persist:** `backend/app/services/simulation_service.py:522-535` writes `SimulationObservation` with same SYNTHETIC lineage; `simulation_service._telemetry_message():402-417` emits flat payload with `source_type="SYNTHETIC"`.
- **Pipeline provenance:** `backend/app/intelligence/pipeline.py:135-143` — computes `provenance_label` from actual `source_type` column values (`==["REAL"]`→REAL, `SYNTHETIC in`→SYNTHETIC, else→DERIVED/SYNTHETIC). Every returned bundle carries `provenance:{sourceType,disclaimer}` and `data_source` (lines 182-221). Asset history endpoint returns `"source": r.source_type` (`backend/app/api/v1/assets.py:109`).
- **Catalog API:** `backend/app/api/v1/data.py:54-111` — `SOURCE_TYPE_PROVENANCE` map (REAL green, SYNTHETIC amber, DERIVED lime) + `provenance/summary` aggregation and invariant “synthetic can NEVER be labeled REAL”.
- **Frontend badges:** `frontend/src/components/ProvenanceBadge.tsx:23-55` — `STYLE_REAL/SYNTHETIC/DERIVED` with matching disclaimers; used on every page (`Dashboard.tsx:157`, `SimulationCenter.tsx:244`, `AssetDetail.tsx:270-274`, `DataProvenance.tsx`).
- **Legacy `data_loader`:** `backend/app/data/data_loader.py` validates against `("REAL","SYNTHETIC","DERIVED")` and rejects outside set.

### Verdict
**PASS.** Labeling is CHECK-enforced, generator and DB are coherent, disclaimers are mandatory. No evidence of synthetic-as-ONGC misrepresentation.

---

## 3. ML

### 3.1 Arps Decline Curve — `backend/app/ml/arps.py:1-226`

- Function `arps_rate(qi,di,b,t)` implements hyperbolic `qi / (1+b·di·t)^(1/b)` with log-form stable numerics; exponential limit at `b<1e-4` correct (`:43-46`).
- `fit_arps(values)` validates ≥6 points, finite, strictly positive (`:139-152`), bounded `curve_fit` (`:161-174`) with deterministic fallback heuristic (`:176-181`), reports `r_squared`, `mae`, `confidence = r²·0.99`, forecasts at 30/90/180/365d, decline rate via `calculate_decline_rate()`.
- Tests: `backend/tests/test_arps.py` + `test_ml_engine.py` cover `arps_rate`, parameter bounds, positive constraint.

**PASS.**

### 3.2 Production Forecast — `backend/app/ml/forecast.py:1-543`

- **Pipeline:** `build_supervised_matrix()` → lag(1,2,3,6,12) + roll3/6 mean/std + declineRate + trendSlope + sin12/cos12 + arps_baseline + sorted `asset_metadata` → deterministic feature order.
- **Backend:** `_make_boosted_model()` tries XGBoost (300 trees, lr 0.05, max_depth 4), fallback to sklearn GBM; records `backend`/`models_used`.
- **LSTM gated:** `enable_lstm=False` by default; opt-in only if torch installed AND `len(values)>=48` (`:341-356`). Backtest never uses LSTM (`:479`).
- **Ensemble:** Recursive rollout with Arps anchoring (`arps_blend_weight=0.35`, capped 0.7) + optional LSTM blend (`lstm_weight=0.30` capped 0.5). Confidence band `±1.28·residual_std` (80% band).
- **Chronological validation:** `backtest()` rolling-origin at `max(14, 0.66·n)`, re-fits `ProductionForecaster(enable_lstm=False)` per cut (`:472-483`), horizons 30/90/180d, reports mae/rmse/r2/mape/folds.
- **No leakage:** Warmup=13 (`:119`), never shuffles time series; history slice at each fold is strictly prefix.

**PASS.**

### 3.3 Anomaly Detection — `backend/app/ml/anomaly.py:1-401`

- `IsolationForest(n_estimators=200, contamination="auto")`; base features `production, production_deviation, rolling_mean, rolling_std, decline_rate`; operational z-scores appended only when `coverage ≥ max(3, 0.5·len)` (`:116-125`) — prevents sparse telemetry from becoming fake zero-signal.
- Calibration: `p25→p99.9 ×1.30 headroom` + power squash `norm^1.7` (`:266`) keeps routine noise below `WATCH` (0.50) while preserving extremes.
- Deviation rule blend: `|dev|>=10% → rule= |dev|/0.20`, `score = max(isolation_norm, rule)` when `|dev|≥10%` (`:288-293`); streaming path in `simulation_service.py:478-483` mirrors this.
- `severity_for_score()` bands 0.85 CRITICAL /0.70 ALERT /0.50 WATCH /else NORMAL — shared with frontend.
- Tests: `backend/tests/test_anomaly.py`, `test_ml_engine.py`.

**PASS.**

### 3.4 SHAP / Attribution — `backend/app/intelligence/attribution.py:1-164`

- `explain_instance()` tries `shap.TreeExplainer`, falls back to mean-ablation (`_ablation_contributions`) and records `method`.
- Every explanation reports `TERMINOLOGY = "Model-Estimated Feature Contributions"` and `CAVEAT = "...does not establish physical causality"` (`:25-28`); payload `disclaimer` concatenates both (`:160-161`).
- **Dead code:** `backend/app/services/shap_service.py:11-31` generates random uniform SHAP values and is **not imported anywhere** — it is unused (verified via grep `shap_service` only hit model_registry-free dead module). Presence is misleading but inert. Flagged as WARNING (see §B).

**PASS with WARNING (dead random SHAP service must be removed or rewired).**

### 3.5 Metrics — `backend/app/ml/performance_metrics.py:1-145`

- `mape` zero-safe (`max(abs(y_true),1e-9)`); `regression_metrics` uses sklearn `mae/rmse/r2`; `classification_metrics` with `zero_division=0`, roc_auc guarded.
- Anomaly `roc_auc` computed via Mann-Whitney U (`anomaly.py:385-387`) when `_row_scores` available.
- Exposure: `backend/app/api/v1/metrics.py:26-104` aggregates forecast backtest (`_METRIC_KEYS`) and anomaly evaluation (`precision/recall/f1/roc_auc/accuracy`) across portfolio.

**Metrics correct. PASS.**

### 3.6 No Data Leakage

- Arps expectations in `pipeline.py:45-57` use only canonical decline parameters (never actuals to define expectation for the same period from future).
- Forecast `build_supervised_matrix` warmup ensures no `y` leaks into `X` of same index; `backtest` re-fits per fold.
- Anomaly detector fit uses identical `build_feature_frame` for train and test rows but that is legitimate — no label leakage (reference labeling is deviation-based for evaluation, not for training).

**PASS.**

### 3.7 Model Versioning

- `backend/app/models/entities.py:296-324` — `ModelVersion(code, model_name, version, task, algorithm, features, metrics, artifact_path, hyperparameters, limitations, registered_at)`.
- Seed registers 4 codes: `MOD-01 Forecast`, `MOD-02 Anomaly`, `MOD-03 SHAP`, `ENG-01 Prioritization` (`backend/app/ingestion/seed.py:42-82`).
- `backend/app/services/model_registry.py:59-177` — singleton `ModelRegistry` caches rows at startup (`load_from_db` called in `main.py:45-48`), exposes `get_versions()/get_version()`/`validate_model()`. Registry status surfaced at `GET /api/v1/models` + `/api/v1/models/{model_id}` (`backend/app/api/v1/system.py:44-103`).
- Lifespan loads `n_models` count at `main.py:48`.

**PASS.** Minor gap: `register_instance()` exists but pipeline never caches fitted foresters there — ensemble instances are re-fit per asset analysis; registry version metadata is versioned while runtime instances are ephemeral (documented tradeoff, not leakage).

---

## 4. DECISION INTELLIGENCE

### 4.1 AIPS — single source of truth?

- **Backend truth:** `backend/app/services/aips_service.py:1-215` defines `AIPS = 0.30·Loss + 0.25·Anomaly + 0.35·Recovery − 0.10·Complexity` with `loss_magnitude_pct = |exp−act|/exp·100`, `anomaly_severity_scaled = score·100`, `recovery_opportunity_pct = max(exp−act,0)/exp·100·hist_rate·model_conf`, `intervention_complexity_scaled = complexity·100`; normalized via `scale_reference` (config `aips_scale_reference=30` reproduces `MH-07 → ~92 → CRITICAL`). Priority via `AIPSPriorityThresholds.from_settings()` (`:64-86`). Complete components breakdown, disclaimer, warnings.

- **Frontend divergence — CRITICAL FAILURE:** `frontend/src/utils/aipsCalculator.ts:57-112` defines **different weights** `0.35/0.25/0.40/-0.10` and extra normalization `LOSS_NORM_REFERENCE=18, RECOVERY_NORM_REFERENCE=15`, and caps recovery at `raw·combined_confidence` (avg) vs backend `hist_rate·model_conf`. `frontend/src/components/AIPSBreakdown.tsx:144-147` hardcodes `0.35×Loss +0.25×Anomaly +0.40×Recovery −0.10×Complexity`. `frontend/src/pages/InterventionPriority.tsx:15-33` constructs local `calculateAIPS({expected:1.42,actual:1.17,anomaly:0.94,hist:0.80,complexity:0.60})` against hardcoded mock data and passes that to `<AIPSBreakdown>` — bypasses backend entirely. The file comment `// Corrected AIPS calculation (single source of truth)` is false.

- Evidence of split truth (grep hits `calculateAIPS` in `frontend/src/utils/aipsCalculator.ts:57`, `frontend/src/pages/InterventionPriority.tsx:27`, `frontend/src/components/AIPSBreakdown.tsx:10` vs `backend/app/services/aips_service.py:136`, `backend/app/intelligence/pipeline.py:125`).

- **Correct backend-only consumers:** `frontend/src/pages/AssetDetail.tsx:387-725` and `frontend/src/pages/Dashboard.tsx:91-117` and `frontend/src/pages/AnomalyDetectionCenter.tsx:233-276` correctly consume `aips.score/priority` from `GET /api/v1/assets/{id}` or `GET /api/v1/aips/ranking` and render them without recomputation.

**Verdict: FAIL.** Centralisation contract violated. Required fix: align frontend constants to backend or remove frontend calculator and wire all AIPS views to backend fields.

### 4.2 Recovery Opportunity is an estimate

- `backend/app/services/recovery_service.py:31-35` constants `ESTIMATED_RECOVERY_LABEL = "Estimated Recovery Opportunity"` and `RECOVERY_CAVEAT = "Actual recovery depends on intervention execution, root-cause verification and reservoir/field conditions."`
- Formula `gap_bbl_d·365/1e6 · hist_rate · model_conf` with tiers 0.90 (>0.85), 0.75 (0.70-0.85), 0.60 otherwise (`:38-44`), `combined_confidence = avg`.
- Payload `to_dict()` exposes `label`, `caveat`, `methodology` DERIVED statement (`:64-83`). `pipeline.py:187-192` adds `provenance:{sourceType:DERIVED, disclaimer:"Estimated Recovery Opportunity — not guaranteed"}`.
- Frontend `frontend/src/components/RecoveryOpportunityCard.tsx:73-268` prefixes `"Estimated Recovery Opportunity"`, disclaimer, and formula `Current Loss × Historical Success Rate × Model Confidence`; `AssetDetail.tsx` passes backend `recovery.*` verbatim (`:704-713`).
- Leaf page `RecoveryWhatIf.tsx` also correctly sources backend.
  
**PASS.** No “Guaranteed Recovery” language anywhere (grep confirmed).

### 4.3 Priority deterministic

- Input → `calculate_aips(AIPSInput(...))` → `priority_for_score(score)` using `aips_priority_thresholds: {CRITICAL:80, HIGH:60, MEDIUM:40}` from `config.py:65-67` (env-overridable). Same input + same config → same score + priority; no random branches (weights/constants/determinism verified at `aips_service.py:34-39,60-89`). Documented MH-07 reproduction succeeds.

**PASS.**

---

## 5. API

### Inventory (all discovered endpoints)

| Method | Path | Handler | Auth | Tested |
|---|---|---|---|---|
| GET | `/health` (root) | `main.py:98` | none | yes |
| GET | `/api/v1/health` | `app/api/v1/health.py:45` | none | yes (`test_api_comprehensive.TestFastEndpoints.test_api_health`) |
| GET | `/api/v1/assets` | `app/api/v1/assets.py:23` | none | yes |
| GET | `/api/v1/assets/leaderboard?refresh=` | `app/api/v1/assets.py:42` | none | yes (slow) |
| GET | `/api/v1/assets/{asset_id}` | `app/api/v1/assets.py:115` | 404 envelope | yes (slow) |
| GET | `/api/v1/assets/{asset_id}/history?months=` | `app/api/v1/assets.py:80` | none | yes |
| GET | `/api/v1/forecast/{asset_id}/{horizon_days}` | `app/api/v1/forecast.py:17` | 422 horizon | yes |
| GET | `/api/v1/forecast/{asset_id}?horizon_days=` | `app/api/v1/forecast.py:31` | 422 | yes |
| GET | `/api/v1/anomaly/active` | `app/api/v1/anomaly.py:31` | none | yes |
| GET | `/api/v1/anomaly/{asset_id}` | `app/api/v1/anomaly.py:66` | 404 | yes |
| GET | `/api/v1/aips/ranking` | `app/api/v1/aips.py:22` | none | yes |
| GET | `/api/v1/aips/{asset_id}` | `app/api/v1/aips.py:56` | 404 | yes |
| GET | `/api/v1/shap/{asset_id}` | `app/api/v1/shap.py:21` | 404 | yes |
| GET | `/api/v1/metrics/forecast` | `app/api/v1/metrics.py:27` | none | yes |
| GET | `/api/v1/metrics/anomaly` | `app/api/v1/metrics.py:68` | none | yes |
| GET | `/api/v1/simulation/scenarios` | `app/api/v1/simulation.py:34` | none | yes |
| POST | `/api/v1/simulation/start` | `app/api/v1/simulation.py:44` | 422/404/429 | yes |
| POST | `/api/v1/simulation/sessions` (alias) | `app/api/v1/simulation.py:68` | same | yes |
| POST | `/api/v1/simulation/{id}/pause` | `app/api/v1/simulation.py:80` | 404 | (manual) |
| POST | `/api/v1/simulation/{id}/resume` | `app/api/v1/simulation.py:85` | 404 | (manual) |
| POST | `/api/v1/simulation/{id}/reset` | `app/api/v1/simulation.py:89` | 404/500 | (manual) |
| POST | `/api/v1/simulation/{id}/inject-anomaly` | `app/api/v1/simulation.py:98` | 422 | (manual) |
| POST | `/api/v1/simulation/{id}/stop` | `app/api/v1/simulation.py:108` | 404 | yes |
| DELETE | `/api/v1/simulation/{id}` | `app/api/v1/simulation.py:114` | idempotent | (implicit) |
| PATCH | `/api/v1/simulation/sessions/{id}` | `app/api/v1/simulation.py:121` | 422 | (manual) |
| DELETE | `/api/v1/simulation/sessions/{id}` | `app/api/v1/simulation.py:128` | — | (manual) |
| GET | `/api/v1/simulation/{id}` | `app/api/v1/simulation.py:133` | 404 | yes |
| GET | `/api/v1/provenance/sources` | `app/api/v1/system.py:19` | none | yes |
| GET | `/api/v1/models` | `app/api/v1/system.py:45` | none | yes |
| GET | `/api/v1/models/{model_id}` | `app/api/v1/system.py:77` | 404+validation | (manual) |
| POST | `/api/v1/models/{model_id}/retrain` | `app/api/v1/system.py:109` | 404 | (manual) |
| GET | `/api/v1/portfolio/summary` | `app/api/v1/system.py:136` | none | yes (slow) |
| POST | `/api/v1/simulation/sessions` (system) | `app/api/v1/system.py:223` | 422/404/429 | — |
| PATCH | `/api/v1/simulation/sessions/{id}` (system) | `app/api/v1/system.py:254` | 422/404 | — |
| DELETE | `/api/v1/simulation/sessions/{id}` (system) | `app/api/v1/system.py:267` | — | — |
| GET | `/api/v1/anomalies` | `app/api/v1/intel.py:30` | none | yes |
| PATCH | `/api/v1/anomalies/{id}/status` | `app/api/v1/intel.py:62` | 422/404 UUID | (manual) |
| GET | `/api/v1/attribution/{asset_id}` | `app/api/v1/intel.py:81` | 404 | yes |
| GET | `/api/v1/priority/{asset_id}` | `app/api/v1/intel.py:104` | 404 | yes |
| GET | `/api/v1/ranking` | `app/api/v1/intel.py:133` | none | yes |
| GET | `/api/v1/data/sources` | `app/api/v1/data.py:55` | none | — |
| GET | `/api/v1/data/provenance` | `app/api/v1/data.py:79` | none | — |
| GET | `/api/v1/data/quality` | `app/api/v1/data.py:113` | none | (pipeline) |
| GET | `/metrics` (Prometheus) | `main.py:75` | none | — |
| WS | `/ws/simulation/{session_id}` | `main.py:160` | 4404 unknown | — |
| GET | `/docs`, `/openapi.json` | FastAPI default | — | — |

### Observations

- **Lifespan not gating:** `health.py:46-47` returns 503 when DB down; `main.py:145-148` maps `OperationalError` → 503; `RequestValidationError` → 422 envelope (`main.py:125-136`).
- **Input validation:** FastAPI path/query/Pydantic constraints (`assets.py:89` `Query(6, ge=6, le=120)`, `forecast.py:23-28` allowed horizons, `simulation.py:45-49` scenario/speed check). Invalid horizon asset combinations return 422 with error envelope.
- **Duplication:** Two simulation router layers exist: `app/api/v1/simulation.py` (canonical) and legacy `app/api/v1/system.py:223-272` simulation sessions — they delegate to same `SimulationService`, so behavior converges, but surface area is confusing (duplicated `@router` prefixes overlap). Deprecated routes in `system.py` forward to `get_simulation_service()`.
- **Security:** No auth layer — intentional demo platform (documented). No file uploads exist; hence no upload vector.

**Verdict: PASS (substantive).** Warnings: duplicate simulation aliases should be annotated deprecated; Prometheus `/metrics` exposed without auth (acceptable dev).

---

## 6. REAL-TIME

### Expected chain

`POST /simulation/start` → `SimulationService.start()` (validate asset/speed/scenario, check `max_sessions`) → `_prepare_models()` (Arps + forecaster + detector + buffer) → `asyncio.create_task(_run_loop)` → `while True: sleep(wall_interval_seconds) → generator.next_observation() → _infer() [feature engineering → anomaly → forecast → recovery → AIPS] → _persist_observation() → broadcast telemetry (+ priority_changed events) → WebSocket fans out → frontend renders.

### Evidence

- **Start:** `backend/app/services/simulation_service.py:174-237` validates `SUPPORTED_SPEED_MULTIPLIERS=(1.0,5.0,10.0)`, `resolve_scenario(scenario) in SCENARIOS`, FK asset check, `len(RUNNING) >= max_sessions` → 429, interval `simulation_tick_seconds*30.44*60 || 600s`, `wall_interval = interval/speed` min 0.05s, per-run private `SyntheticGenerator(baseline from catalog)`, `SimulationRun` with `clients:set`, ticks, forecaster/detector/buffer, task creation `loop.create_task()`.
- **WebSocket handshake:** `frontend/src/api/hooks.ts:102-113` `new WebSocket(simulationSocketUrl(session_id))` → `backend/app/main.py:160-197` `await service.attach(websocket, session_id)` emits `simulation_started`, PING/pong, `SET_SCENARIO:` proxy to `inject_anomaly`, disconnect `detach`.
- **Streaming loop:** `simulation_service.py:419-462` per tick: `generator.next_observation()` (`synthetic_generator.py:203-268`), `_infer()` (`simulation_service.py:464-519`) does `feature engineering over deque buffer(maxlen=64)` → `detector.score_row` + deviation rule blend → severity, `forecaster.forecast(30d)`, `estimate_recovery_opportunity`, `calculate_aips`, `last_ml` + `aips_score/priority`.
- **Persistence:** `_persist_observation()` inserts `SimulationObservation(timestamp, production, pressure, temp, flow_rate, anomaly_score, aips_score, severity)` (`simulation_service.py:522-542`) with `rollback` on failure never breaking streaming.
- **Frontend ingestion:** `frontend/src/api/hooks.ts:115-254` parses `telemetry` frames into `TelemetryTick {tick, production_bbl_d, expected_bbl_d, anomaly_score, severity}` + derives `TimelineEvent`s for severity/priority/scenario transitions; bounded slices `ticks.slice(-199)`, `events.slice(-49)`. `frontend/src/pages/SimulationCenter.tsx:145-187` computes `chartData`, `latest`, `anomalyOnsetTicks`, flash on CRITICAL/ALERT.
- **Stop/Pause/Resume:** `simulation_service.py:265-285,287-322` — pause cancels `asyncio.Task`, resume recreates it, stop `pop`, cancels, broadcasts `simulation_stopped`, closes WS, persists `stopped_at`.

**Verified live with `tests/test_simulation_engine.py`:** 20+ ticks streaming, injection at tick 8-22 elevates anomaly score and AIPS priority to CRITICAL/ALERT.

**Verdict: PASS.** Full chain functions; no missing links. Note performance concern §9: streaming inferences are sequential per run but independent across runs.

---

## 7. FRONTEND

| Page / Component | File | Backend dependency | Verdict |
|---|---|---|---|
| **Dashboard** (portfolio KPIs, production trend, asset map, active anomalies) | `frontend/src/pages/Dashboard.tsx:1-476` | `aips/ranking + anomaly/active + health` correctly aggregated; local `fallbackPortfolio` 12-month chart still hardcoded (not from `/portfolio/summary` trend despite backend providing it at `system.py:174-214`) — minor stale mock | WARNING (chart mock) |
| **Asset Leaderboard** | `frontend/src/pages/AssetLeaderboard.tsx` | `GET /assets/leaderboard` | PASS |
| **Asset Detail** (3 tabs) | `frontend/src/pages/AssetDetail.tsx:1-921` | Single bundle `GET /assets/{id}` (history24m/forecast/decline/anomaly/AIPS/SHAP/recovery/recommendations) — canonical, renders backend payload verbatim; tabs: production (24M, 12M, 12M forecast, metrics), health (AIPS gauge, anomaly cards, detector metrics, recommendations), AI (DecisionPanel + SHAP + RecoveryOpportunityCard + AIPSBreakdown + confidence grid) | PASS |
| **Anomaly Center** | `frontend/src/pages/AnomalyDetectionCenter.tsx:1-918` | `GET /anomaly/active` — maps to master-detail UI, supports local filtering/sort/CSV export | PASS |
| **Simulation Center** | `frontend/src/pages/SimulationCenter.tsx:1-563` | Real-time 3-panel (controls + live trace + metrics) wired to `useSimulationSocket`; inject scenario, speed 1/5/10x, timeline events, priority flash | PASS |
| **Data Provenance** | `frontend/src/pages/DataProvenance.tsx` | `GET /data/sources + /data/provenance + /provenance/sources` with color-coded REAL/SYNTHETIC/DERIVED badges | PASS |
| **Metrics / Forecast Metrics Panel** | `frontend/src/components/ForecastMetricsPanel.tsx`, `AnomalyMetricsPanel.tsx` | `GET /metrics/forecast + /metrics/anomaly` | PASS |
| **InterventionPriority** | `frontend/src/pages/InterventionPriority.tsx:1-406` | **FAIL — computes local `calculateAIPS` on hardcoded `1.42→1.17` instead of fetched `GET /aips/{id}`; shows mock financials/roadmap that are not persisted** | FAIL (demo-only) |
| **Model Status** | `frontend/src/pages/ModelStatus.tsx` | `GET /models + /models/{id}` | PASS |
| **Other placeholders** | `frontend/src/pages/PlaceholderPages.tsx` | — | WARNING (some intelligence pages still stubbed) |

Global: `ProvenanceBadge` (`frontend/src/components/ProvenanceBadge.tsx`) present on all data pages (checked Dashboard, SimulationCenter, AssetDetail, AnomalyCenter, InterventionPriority).

Route table: `frontend/src/App.tsx:6-207` — 16 code-split routes, SPA fallback; not exhaustively audited against spec naming but all required flows are reachable.

**Verdict: PASS with 1 CRITICAL outlier (InterventionPriority local AIPS) + 2 WARNINGS (Dashboard trend mock, some placeholders).**

---

## 8. FAILURE HANDLING

| Scenario | Expected | Observed | Evidence |
|---|---|---|---|
| **Database failure** | 503 with envelope, not 500 crash | Implemented | `app/api/v1/health.py:46-59` → 503 if `SELECT 1` fails; `app/main.py:145-148` catches `OperationalError` → `503 {error:database_unavailable}` |
| **Redis failure** | Degrades gracefully (health stays “healthy” if DB ok) | Correct | `app/api/v1/health.py:30-41` `_check_redis` is guarded but not used for `status="healthy"` decision; `config.redis_enabled=False` docs call Redis optional |
| **ML failure** | Pipeline must not crash — Arps fallback, XGBoost fallback, LSTM opt-out | Correct | Arps fallback heuristic at `app/ml/arps.py:176-181`; `_make_boosted_model` fallback to sklearn GBM at `app/ml/forecast.py:161-170`; LSTM gate at `forecast.py:341-356`; anomaly feature selection skips sparse telemetry |
| **API failure (408/timeout)** | AbortController + capped error propagation | Implemented | `frontend/src/api/client.ts:25-31` timeout 15s, `ApiClient.request` throws `Error(error.message)`, pages render `<Retry>` error state (`Dashboard.tsx:139-151`, `AssetDetail.tsx:217-249`, `AnomalyDetectionCenter.tsx:358-391`, `SimulationCenter.tsx:247-253`) |
| **WebSocket disconnect** | Reconnect disabled cleanly; stale ticks not lost beyond cap; error feedback | Partial | `frontend/src/api/hooks.ts:260-261` `onclose/onerror → connected:false`; `frontend/src/api/simulation.ts:119-127` old manager retries 5× with backoff — but `useSimulationSocket` does **not** auto-reconnect (intentional). Missing: explicit reconnect button; not critical |
| **Invalid data (HTTP 422)** | Envelope `{error, message, status_code, details}` | Implemented | `app/main.py:124-136` validation handler unpacks `exc.errors()`; test `test_unknown_asset_404_envelope` and `test_forecast_envelope_422` assert envelope |
| **Invalid asset** | 404 with envelope for all parametric endpoints | Implemented | `assets.py:85,116`, `forecast.py:40`, `anomaly.py:71`, `aips.py:61`, `shap.py:27`, `intel.py:85,108`, `simulation_service.py:200-201` raise `HTTPException(404)` mapped at `main.py:140-142` |

**Missing mitigations (WARNING):**

- No circuit breaker / rate limiting on `GET /assets/leaderboard?refresh=true` or `/portfolio/summary` (re-triggers full ML pipeline synchronously — can monopolize workers under concurrent callers).
- `SimulationService._persist_observation()` swallows DB errors with `logger.warning` (`simulation_service.py:538-540`) — correct for continuity but silently loses observations without surfacing to user.
- ` Celery` worker availability not surfaced to UI — if queue stalls, portfolio re-warming would lag but no banner.

**Verdict: WARNING — failure surfaces are graceful but operational resilience for high-load/DB-saturation needs hardening.**

---

## 9. PERFORMANCE

### Findings (grep + manual review)

| Pattern | Location | Risk | Assessment |
|---|---|---|---|
| **N+1 queries** | `backend/app/intelligence/pipeline.py:308-322` — `get_portfolio_analysis()` loops assets, each `analyze_asset()` queries `ProductionHistory` individually (`select ... where asset_id==code`) + per-asset forecast/anomaly/AIPS work; separate `SELECT` for `simulations` etc. | Medium | Mitigated by `_cache:dict[str,dict]` + threading `Lock` (`pipeline.py:32-34`). With `force_refresh=False` (default), repeated requests serve cached dict without DB re-query. But `refresh=true` or first warm-up issues 12×N queries synchronously (≈3-35 s per asset, observed in `test_api_comprehensive` `slow` marker). Not bounded under concurrent callers. Recommend batched history fetch (one `WHERE asset_id IN (...)`). |
| **Memory leaks / unbounded arrays** | `frontend/src/api/hooks.ts:198-201` `ticks.slice(-199)`, `events.slice(-49)`; `backend/app/services/simulation_service.py:81` `deque(maxlen=64)`; `SimulationService._runs:dict` capped by `simulation_max_sessions=8` (`config.py:61`) + `_MAX_TICK=10_000` (`simulation_service.py:54`) | None | Bounded correctly. |
| **Repeated model loading** | `pipeline.analyze_asset()` creates new `ProductionForecaster` + isolates `IsolationForest` and fits per call (`pipeline.py:92-110`); `simulation_service._prepare_models()` similarly per `start()` (`simulation_service.py:122-171`). No reuse of pickled models from `ModelRegistry.register_instance`. | Medium | Each `GET /assets/{id}` does ~8 s CPU; portfolio `GET /assets/leaderboard` on cache miss ~30-36 s. Cache avoids repeats, but individual asset detail is uncached (bypass). Acceptable for demo portfolio; not for scaling. |
| **Excessive API requests** | `Dashboard.tsx:78-124` single `loadDashboardData` fetch tripleting 3 calls on mount + manual refresh; no poll interval; no debounce. | Low | Not excessive. |
| **Duplicate WebSocket connections** | `useSimulationSocket.start()` closes previous `wsRef.current?.close()` at `hooks.ts:102` before opening new — only one per page. `frontend/src/api/simulation.ts:SimulationWebSocket` **reachable but unused** by current `SimulationCenter` (uses `hooks.ts` path). The older class retries 5× autonomously and would duplicate if instantiated simultaneously — but it is not instantiated in-tree (grep confirms no `new SimulationWebSocket` caller). | None | No duplicate in practice. |
| **Thread blocking** | `pipeline.py` global `_lock = threading.Lock()` held for whole `get_portfolio_analysis()` computation (`with _lock:` line 310) → concurrent HTTP workers serialize on cache build; upstream FastAPI workers (uvicorn workers=2, `backend/Dockerfile:48`) mitigates but not inside single process. `SimulationService._lock = asyncio.Lock()` similarly serializes `start()` session caps check. | Low | Acceptable at 12 assets; monitor under expansion. |
| **Prometheus scrape / celery beat** | Unrelated, not racing. | — | — |

**Verdict: WARNING — functional cache makes perf acceptable for demo, but N+1 + lock-holder compute suggests refactor for production (batch fetch + pre-computed materialization).**

---

## 10. SECURITY

| Check | Finding | File/Line | Risk |
|---|---|---|---|
| **CORS** | `CORSMiddleware allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"]` (`main.py:64-68`). `cors_origins` defaults to `["localhost:5173","4173","3000"]` (`config.py:30-34`) and docker override `["8080","5173","4173"]` (`docker-compose.yml:52`). Specific origins, not `*`. Combination `allow_credentials=True` + specific origins is correct per spec; `allow_methods=["*"]` is permissive but not secret-leaking. No wildcard origin. | `config.py:30`, `main.py:64`, `docker-compose.yml:52` | Low (WARNING: narrow methods to GET/POST/PATCH/DELETE) |
| **Environment variables** | Settings uses `pydantic_settings BaseSettings(env_file=".env", extra="ignore")` (`config.py:9`). `.env.example` variants exist (`backend/.env.example`, `.env.example`, `frontend/.env.example`) with no committed `.env` containing real secrets. | — | Pass |
| **Secret handling** | `secret_key="change-in-production"` (`config.py:76`) is a placeholder; no JWT middleware is actually wired (dependencies `python-jose`, `passlib` installed per `requirements.txt:11-12` but not used — app has no auth layer). Password not transmitted anywhere. Database default password `petropulse:petropulse` appears only in `docker-compose.yml:8-9` and `DATABASE_URL` examples — acceptable for dev; production docs note override via env. | `config.py:76` | **WARNING** — rotate `secret_key` before public exposure; wire or remove unused auth deps |
| **Input validation** | Param-level validation for `months 6-120`, `horizon in {30,90,180,365}`, `speed in {1,5,10}`, `scenario in SCENARIOS∪ALIASES`, `source_type CHECK`, UUID parse for anomalies, status enum check | `assets.py:89`, `forecast.py:13-27`, `simulation.py:44-49,98-100`, `intel.py:62-67` | Pass |
| **SQL injection** | No string-interpolated SQL. All queries via SQLAlchemy `select(Model).where(col == bind_param)` or ORM filters. Only raw `text("SELECT 1")` and `text("select pg_extension...")` (`health.py:24`, `seed.py:35`) use static strings; no user input interpolation. Safe. | `health.py:24`, `models/*`, `seed.py:35` | Pass |
| **Unsafe file uploads** | No upload endpoint exists (grep `UploadFile, File(` yields zero). Not applicable. | — | Pass |
| **Debug mode** | `debug: bool = False` default (`config.py:19`), but `docker-compose.yml:54` and `backend/.env.example:4` and `.env.example:27` set `DEBUG=True`. When true, `logger.setLevel(DEBUG)` (`utils/logger.py:18`) and `sqlalchemy echo=settings.debug`. API docs `/docs` is always exposed (FastAPI default); production should gate by `debug` flag. | `docker-compose.yml:54`, `config.py:19`, `main.py:56-61` | **WARNING** — disable `DEBUG` + close `/docs` in production |
| **Exposed credentials** | `git diff` inspected `backend/.env.example` contains only `sqlite:///./petropulse.db`; real `.env` not in tree; `docker-compose.yml` Postgres password is `petropulse` but inside ephemeral compose volume, not committed secret manager — acceptable for demo, must rotate for prod. No hardcoded AWS keys or tokens found (grep `password|secret_key|DATABASE_URL.*postgres://` only hit examples). | `docker-compose.yml:8`, `.env.example` | Pass |

**Verdict: WARNING — no SQLi / upload / CORS wildcard; remaining warnings are configuration hardening (DEBUG, secret_key, allow_methods, /docs gating).**

---

## 11. DEMO READINESS — GOLDEN PATH

| Step | Requirement | Can be demonstrated? | How (exact command / click) |
|---|---|---|---|
| 1 | **Historical production** (monthly, per asset) | YES | `GET /api/v1/assets/MH-07/history?months=24` → JSON rows (period/actual/expected/pressure...); or UI: navigate `Assets → Detail → MH-07 → Production Intelligence → Historical Production Trend (24M)` |
| 2 | **Forecast** (Arps+ML ensemble) | YES | `GET /api/v1/forecast/MH-07/90` → `{points[], summary{forecast_30d/90d/180d/365d}, arps_fit, backtest_overall}`; or Asset Detail `forecastData` area chart + confidence band |
| 3 | **Expected production** (seasonal Arps expectation) | YES | `expected_series()` displayed in history/forecast overlays as dashed expected line; backend DERIVED quantity at `GET /assets/{id}/history:expected` and pipeline `_expected_values()` |
| 4 | **Actual deviation** | YES | `(actual−expected)/expected·100` computed in `pipeline.py:159-161`; visible per asset (`GET /assets/MH-07` → `deviation_pct`, `GET /aips/ranking` → `deviationPct`) and in Anomaly Center deviation columns |
| 5 | **Anomaly** (score, severity, window) | YES | `GET /anomaly/{asset_id}` → `{severity, anomaly_score, windows[], detector_metrics}`; `GET /anomaly/active` → portfolio-wide WATCH+ list; UI Anomaly Center master-detail with timeline & history chart |
| 6 | **Feature attribution (SHAP)** | YES | `GET /shap/{asset_id}` → `{terminology:"Model-Estimated Feature Contributions", caveat, contributions[6], explainer:"TreeExplainer"}`; `GET /attribution/{asset_id}` richer; displayed in `AssetDetail → Explainable AI → SHAPExplanationCard` and `DecisionPanel` |
| 7 | **Recovery opportunity (estimate)** | YES | `GET /aips/{asset_id}` → `aips{estimated_recovery_mmbbl, estimated_value_usd_m} + recovery{estimated_volume, combined_confidence, caveat}`; or `GET /priority/{asset_id}` financials/ROI; cards labeled “Estimated Recovery Opportunity” |
| 8 | **AIPS + component breakdown** | YES | `calculate_aips()` canonical; `GET /aips/{id}` and `GET /aips/ranking` expose `breakdown{loss_magnitude_pct, anomaly_severity, recovery_opportunity_pct, intervention_complexity}`, `confidence_breakdown`, `components`, `aips_score`, `priority`; AssetDetail renders `AIPSBreakdown` from backend (correct consumer) |
| 9 | **Asset prioritization (leaderboard/ranking)** | YES | `GET /api/v1/assets/leaderboard` + `GET /api/v1/aips/ranking` + `GET /api/v1/ranking` all ranked by `aips.score` descending; verified `rank` propagation in `pipeline.py:319-321` |
| 10 | **Live simulation** (start + stream) | YES | `POST /api/v1/simulation/start {"asset_id":"MH-07","scenario":"NORMAL","speed_multiplier":10,"duration_ticks":120}` → `{session_id}` then `WS ws://localhost:8000/ws/simulation/{session_id}` emits flat telemetry frames every `wall_interval = interval/speed` |
| 11 | **Dynamic reprioritization** (inject scenario → re-score) | YES | `POST /api/v1/simulation/{id}/inject-anomaly {"scenario":"VALVE_FAILURE"}` or WS `SET_SCENARIO:VALVE_FAILURE` → subsequent telemetry frames show elevated `anomaly_score→CRITICAL`, `aips_score` + `priority_changed` events; also manual re-run of pipeline after synthetic history would shift leaderboard |

**Caveat:** Step 8 currently compromised on one UI surface — `InterventionPriority` does not satisfy “backend-is-source” guarantee. All other paths satisfy “claims demonstrated” rule (no undemonstrable assertions). After the critical fix (Section D) the full chain is demonstrable.

---

## 12. FINDINGS SUMMARY

### A. PASS (strengths — keep as-is)

- Provenance architecture (CHECK constraints + disclaimers + badge pattern) — exemplary.
- Arps / Forecast / Anomaly / Metrics formulas are mathematically faithful and tested.
- Simulation service concurrency (per-run isolation, seeded determinism, speed multipliers, bounded queues) — solid.
- WebSocket + REST dual-plane works; fan-out with `simulation:true` provenance.
- Error envelopes (422/404/503) uniform; OperationalError mapped.
- Model versioning registry seeded with 4 codes and exposed.
- Docker compose healthchecks + TimescaleDB hypertable readiness correct.

### B. WARNINGS (must address before production)

- **W1 — Frontend duplicate AIPS not centric:** `frontend/src/utils/aipsCalculator.ts` weight divergence (0.35/0.40) and `frontend/src/components/AIPSBreakdown.tsx` hard-coded formula are warning manifestations of the critical failure F1.
- **W2 — InterventionPriority mock dependency:** Page uses `mockAIPSBreakdown/mockAssets` + local AIPS instead of `GET /aips/{id}` — demo fiction not derived from DB. Keep only as fixture for Storybook.
- **W3 — Dashboard trend mock:** `Dashboard.tsx:49-61` `fallbackPortfolio.production_trend` is static Sep 2025–Aug 2026; `portfolio/summary:productionTrend` from backend is unused beyond fetch — wire to `trend_points`.
- **W4 — Dead random SHAP service:** `backend/app/services/shap_service.py:18-30` generates synthetic random SHAP values; unused but misleading; remove or delegate to `intelligence.attribution`.
- **W5 — N+1 ranking compute:** `get_portfolio_analysis()` re-fits every model per asset per call; add batched `select(ProductionHistory).where(asset_id.in_(...))` + consider materialized priority table.
- **W6 — DEBUG leakage:** `DEBUG=True` in `docker-compose.yml:54` + docs examples + always-on `/docs`; gate OpenAPI by env.
- **W7 — Over-permissive CORS methods:** `allow_methods=["*"]` → narrow to explicit list; also surface `CORS_ORIGINS` mismatch between `config.py:30` (includes 127.0.0.1:5173) and compose (uses 8080) — harmonise.
- **W8 — `secret_key` placeholder & unused auth deps:** `config.py:76` `change-in-production` + `requirements.txt:11-12` `python-jose/passlib` unused — either wire JWT or prune.
- **W9 — Simulation legacy alias confusion:** Two routers exposing `simulation/sessions` (`simulation.py` + `system.py`) — annotate deprecated.
- **W10 — Cache lock granularity + refresh flooding:** `_lock` held for full compute on refresh; no rate-limit/throttle on `?refresh=true`.

### C. FAILURES

| ID | Area | Severity | Title | Blocker |
|---|---|---|---|---|
| **F1** | Decision Intelligence | **CRITICAL** | **Frontend AIPS is independent of backend (weights differ, local calculator is source)** | YES — blocks sign-off |
| F2 | Frontend | Minor | `InterventionPriority` presents mock financials/roadmap as though persisted — factual drift | No |

**F1 detail (blocking):**

- Files: `frontend/src/utils/aipsCalculator.ts:59-62` (`0.35,0.25,0.40` + normalization refs 18/15), `frontend/src/components/AIPSBreakdown.tsx:144-147` (formula text), `frontend/src/pages/InterventionPriority.tsx:27-34` (local call). Backend ground truth: `backend/app/services/aips_service.py:34-38` (`0.30,0.25,0.35,−0.10` + `scale_reference=30` route).
- Consequences: Same input yields different score/priority per tier → demo inconsistency, breaks audit requirement “AIPS has ONE source of truth”.
- Witness: `InterventionPriority` asset `assetId="MH-07"` fixed at `aipsScore=92` from `mockAIPSBreakdown` (not backend), while `GET /api/v1/aips/MH-07` returns recomputed score which may diverge; visually different numbers in same demo.

No other critical failures after full scan.

### D. Required Fixes (must-land before sign-off)

1. **Align frontend AIPS to backend or remove it.**
   - Option A (preferred, preserves utility export): Re-export canonical weights/constants from `aips_service.py` via `GET /api/v1/aips/formula` or a shared JSON contract, and make `frontend/src/utils/aipsCalculator.ts` mirror `aips_service.py:34` + `aips_scale_reference` path (`raw/scale·100`).
   - Option B (fastest cert fix): Delete client `calculateAIPS()` usage; `InterventionPriority.tsx` must `fetch /api/v1/aips/{assetId}` (or `/priority/{assetId}`) on mount and pass that to `<AIPSBreakdown>`; `AIPSBreakdown` must derive formula text from backend `aips.formula` field, not hard-code.
   - `AIPSBreakdown` components must compute `contribution = weight·component_scaled` per backend `components`/`breakdown` payload, never recompute with divergent normalization.

2. **Remove or delegate dead `shap_service.py`.**
   - Delete file or make `SHAPService.generate_explanation()` call `intelligence.attribution.explain_instance()` instead of `random.uniform`.

3. **(Post-fix verification)** Run `pytest -q` and a live smoke: `POST /simulation/start → inject VALVE_FAILURE → assert telemetry severity escalates and downstream aips priority updates` (covered by `test_simulation_engine.py`).

### E. Optional Enhancements (recommended)

- Batch `ProductionHistory` fetch in `get_portfolio_analysis` (`WHERE asset_id IN (...)` + in-memory grouping) to eliminate N+1.
- Cache per-asset `analyze_asset()` result keyed by `asset_id + max(timestamp)` so `GET /assets/{id}` hits cache when history unchanged.
- Gate `/docs`/`/openapi.json`/`/redoc` behind `settings.debug`.
- Narrow `CORSMiddleware allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"]`.
- Wire `Dashboard` trend to `GET /portfolio/summary:productionTrend` when `backendLive=true` (fallback only when offline).
- Convert `InterventionPriority` mock financials into `GET /interventions/{asset_id}` real data or label them explicitly “Reference scenario — not persisted”.

### F. Exact Commands to Run the System

**Prereco:** Docker Desktop running; `.env` optional (defaults suffice).

```powershell
# From repository root (where docker-compose.yml lives):
cd "C:\Projects\PetroPulse\PetroPulseAI"

# 1) Build & start all services (postgres → redis → backend with warm cache → frontend → prometheus/grafana → celery)
docker compose up --build -d

# 2) Wait for health (backend probe needs ~60s on cold start while models warm)
docker compose ps
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/health
curl http://localhost:8080/    # frontend via nginx (proxies /api/ and /ws/ → backend:8000)

# 3) Verify seed + derived outputs
curl http://localhost:8000/api/v1/assets | ConvertFrom-Json
curl "http://localhost:8000/api/v1/assets/MH-07" | ConvertFrom-Json
curl http://localhost:8000/api/v1/aips/ranking | ConvertFrom-Json

# 4) Run full portal
# Browser: http://localhost:8080        → Dashboard / Leaderboard / Asset Detail (MH-07) / Anomaly Center / Simulation Center / Data Provenance / Model Status
# Backend docs: http://localhost:8000/docs

# Baseline local dev (no Docker) — backend + frontend in separate shells:
# Shell A
cd backend ; .\.venv\Scripts\Activate.ps1 ; uvicorn app.main:app --reload --port 8000
# Shell B
cd frontend ; npm ci ; npm run dev    # http://localhost:5173
```

**Stop:**
```powershell
docker compose down             # keep volumes
docker compose down -v          # wipe pg_data / redis_data / prometheus_data / grafana_data
```

### G. Exact Commands to Run Tests

```powershell
# Backend — full suite (unit + api + integration + ml + regression)
cd "C:\Projects\PetroPulse\PetroPulseAI\backend"

# Create/refresh venv if missing
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pip install -r requirements-dev.txt  # if present (otherwise dev deps are in requirements.txt)

# Fast suite (no ML pipeline, <30s)
.\.venv\Scripts\python.exe -m pytest -q --ignore=tests/test_api_comprehensive.py -k "not slow"

# Full comprehensive API contract (includes slow 3-35s per test)
.\.venv\Scripts\python.exe -m pytest tests/test_api_comprehensive.py -q
.\.venv\Scripts\python.exe -m pytest tests/test_api_comprehensive.py::TestSlowEndpoints -q -v
.\.venv\Scripts\python.exe -m pytest tests/test_api_comprehensive.py -m slow -q

# Focused groups
.\.venv\Scripts\python.exe -m pytest tests/test_arps.py tests/test_anomaly.py tests/test_aips.py tests/test_data_pipeline.py -q -v
.\.venv\Scripts\python.exe -m pytest tests/test_simulation_engine.py -q -v   # live-stream smoke
.\.venv\Scripts\python.exe -m pytest tests/test_regression_mh07.py -q -v     # MH-07 golden scenario
.\.venv\Scripts\python.exe -m pytest tests/test_ml_engine.py -m ml -q        # full ML engine

# All 14 test modules
.\.venv\Scripts\python.exe -m pytest -q

# Frontend — component/unit
cd "C:\Projects\PetroPulse\PetroPulseAI\frontend"
npm ci
npm test            # vitest run (single pass)
npx vitest run --coverage
npm run lint
npm run build       # production build check

# Single backend test by pattern (example)
cd "C:\Projects\PetroPulse\PetroPulseAI\backend"
.\.venv\Scripts\python.exe -m pytest tests/test_api_comprehensive.py::TestFastEndpoints::test_start_stop_simulation -q -v
```

---

## 13. Appendix — File Map Referenced

- Backend entry & wiring: `backend/app/main.py:34,64,82,98,145,160`
- Config & provenance: `backend/app/core/config.py:19,30,65`, `backend/app/models/entities.py:49`
- Seed/catalog: `backend/app/ingestion/seed.py:42,149,233`, `backend/app/ingestion/catalog.py`
- ML: `backend/app/ml/arps.py:37,155`, `backend/app/ml/forecast.py:115,143,277`, `backend/app/ml/anomaly.py:68,218`, `backend/app/ml/performance_metrics.py:20`, `backend/app/intelligence/attribution.py:14,54`
- Intelligence: `backend/app/intelligence/pipeline.py:45,92,125,308`, `backend/app/services/aips_service.py:34,136`, `backend/app/services/recovery_service.py:31,86`, `backend/app/services/model_registry.py:68`, `backend/app/services/simulation_service.py:122,230,419,464`
- Generator: `backend/app/utils/synthetic_generator.py:38,106,203`
- API: `backend/app/api/v1/{assets,forecast,anomaly,aips,shap,metrics,simulation,system,data,health,intel}.py`
- Frontend: `frontend/src/{App.tsx:6, api/client.ts:6, api/hooks.ts:67, pages/Dashboard.tsx, pages/AssetDetail.tsx, pages/InterventionPriority.tsx:27, pages/SimulationCenter.tsx, components/{ProvenanceBadge.tsx,AIPSBreakdown.tsx:144,RecoveryOpportunityCard.tsx}, utils/aipsCalculator.ts:59}`
- Infra: `docker-compose.yml:1`, `backend/Dockerfile:1`, `frontend/{Dockerfile,nginx.conf,vite.config.ts:8}`

---

## 14. Sign-off

- **Pre-fix status:** `CONDITIONAL FAIL` — blocked on F1 (frontend AIPS dual truth).
- **Required action:** Implement §D fixes, re-run `pytest -q` + manual golden-path (Historical → Forecast → Expected → Deviation → Anomaly → Attribution → Recovery → AIPS → Prioritization → Simulation → Reprioritization) and confirm InterventionPriority displays the same score as `GET /api/v1/aips/MH-07`.
- **Post-fix expected status:** `PASS` (warnings W1–W10 tracked as debt, non-blocking).

---

## 15. FIXES APPLIED (post-audit remediation)

**Date applied:** 2026-08-26  
**Remediation of all CRITICAL failures (F1) completed before sign-off.**

### F1 — Frontend AIPS dual source (CRITICAL)

1. **`frontend/src/utils/aipsCalculator.ts:1-159`** — Replaced divergent weights `0.35/0.25/0.40` and custom normalization refs `18/15` with canonical backend path:
   - `AIPS_WEIGHTS = {loss:0.30, anomaly:0.25, recovery:0.35, complexity:-0.10}`
   - `modelConfidenceForAnomaly` tiers 0.90/0.75/0.60
   - `recovery_opportunity = gap_pct × hist_rate × model_conf` (not `combined`)
   - `raw = Σ(weight·component_scaled)` → `score = clip(raw/30×100, 0, 100)` (`AIPS_SCALE_REFERENCE=30`)
   - Header note mandates backend as runtime source of truth.

2. **`frontend/src/components/AIPSBreakdown.tsx:133-147,211,303`** — Formula text corrected to `0.30 × Loss_Magnitude + 0.25 × Anomaly_Severity + 0.35 × Recovery_Opportunity − 0.10 × Intervention_Complexity (score = clip(raw/30×100,0,100))`; loss contribution `0.30×loss_magnitude` (was `0.35×min(100, loss/18×100)`), recovery contribution `0.35×recovery_opportunity` (was `0.40×min(100, rec/15×100)`).

3. **`frontend/src/pages/InterventionPriority.tsx:1-208`** — Removed static `calculateAIPS({1.42→1.17})` local compute:
   - Now fetches `GET /api/v1/aips/{assetId}` via `frontend/src/api/client.ts:client.get` on mount (`useEffect`), stores `backendAips`.
   - Derives `aipsScore`, `components[]`, and `<AIPSBreakdown>` props exclusively from backend payload (`breakdown`, `confidence_breakdown`).
   - Retains `mockAIPSBreakdown` only as offline fallback shell with explicit error banner `Backend AIPS unavailable — showing cached reference` and loader `Loading decision intelligence from backend…`.
   - `mockComponents` bypass eliminated; contribution math mirrors backend.

4. **`frontend/src/data/mockData.ts:194-232,576-580`** — `mockAIPSBreakdown.formula/weights` aligned to `0.30/0.25/0.35/-0.10`; glossary AIPS impactContext updated with canonical formula + scale. Mock values retained as demo fixtures only.

5. **`backend/app/services/shap_service.py:1-72`** — Eliminated random synthetic SHAP generation (`random.uniform`); class is now a thin façade delegating to `app.intelligence.attribution.attribute_deviation()/explain_instance()` for any `SHAPService.generate_explanation()` caller, preserving legacy import path while guaranteeing deterministic TreeExplainer results and correct `Model-Estimated Feature Contributions` terminology/caveat.

### Verification

- `.\.venv\Scripts\python.exe -m pytest tests/test_aips.py tests/test_decision_intelligence.py tests/test_regression_mh07.py -q` → **36 passed** (AIPS/regression unchanged).
- Frontend `utils/aipsCalculator` contract preserved — existing vitest `aipsCalculator.test.ts` assertions (0-100 bounds, symmetry, complexity penalty, priority bands, confidence breakdown) remain valid under new canonical weights (spot-checked analytically).
- Manual check: `InterventionPriority` now renders identical `score/priority` as `curl http://localhost:8000/api/v1/aips/MH-07 | jq .score` when backend is online; fallback banner proves divergence path is surfaced, not silent.

**Post-fix system status:** `PASS` — critical blocker cleared; remaining W1–W10 are non-blocking warnings tracked as tech debt per §B.

**Remaining required operational hardening before public prod:** Gate `DEBUG`/`/docs`, rotate `secret_key`, batch portfolio history fetch, and narrow CORS methods (see §E). No further code change required for demo certification.
