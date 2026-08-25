# PetroPulse AI — Full-Stack Integration Report

**Date:** 2026-08-24
**Status:** COMPLETE — backend canonical stack unified, all contracts restored, frontend rewired to consume backend data exclusively.

---

## 1. Verification Results

| Check | Result |
|---|---|
| Backend test suite (`pytest tests -q`) | **111 passed, 1 skipped** |
| Live golden-path E2E (`golden_path_e2e.py`, 41 assertions) | **41 / 41 passed** |
| Frontend production build (`npm run build`) | **Clean, 0 TS errors** |

The golden path exercises, against a live uvicorn server:
`/health` → `/assets` → `/assets/leaderboard` → asset detail bundle → 24-month history → forecasts (30/90/180/365 + invalid-horizon 422) → anomaly active/per-asset → AIPS ranking/breakdown → SHAP terminology → metrics endpoints → error envelope matrix → **full WebSocket simulation lifecycle** (started event → telemetry ticks with embedded ML inference → `GRADUAL_CLOG` injection → `anomaly_injected` + `priority_changed` events → score escalation 0.287→0.659 on a stable asset → pause/resume/state/stop-with-summary).

---

## 2. Architecture Reconciliation

Two conflicting backend stacks existed. Resolution: **the sync SQLAlchemy stack is canonical**.

| Area | Kept (canonical) | Deleted |
|---|---|---|
| Models | `app/models/entities.py` via `app/models/__init__.py` | `app/models/asset.py` (async Postgres) |
| ML | `app/ml/arps.py`, `app/ml/anomaly.py`, `app/ml/forecast.py` | `app/ml/forecaster.py`, `app/ml/shap_explainer.py` |
| Services | `app/services/aips_service.py`, `simulation_service.py`, etc. | `app/services/aips.py` (duplicate AIPS) |
| Realtime | `simulation_service.py` broadcast fan-out | `app/api/v1/websocket.py` |

`core/database.py` keeps an optional async engine for future Postgres but defaults to
SQLite (`sqlite:///./petropulse.db`) with sync sessions everywhere the pipeline runs.

### Single source of truth rules enforced
- All scores/severities/priorities come from `intelligence.pipeline.analyze_asset`
  (Isolation Forest + seasonal Arps + approved AIPS-v2). The frontend performs
  **presentation formatting only** — no model math client-side.
- The local `frontend/src/utils/aipsCalculator.ts` and a 128-fake-asset generator were
  removed from the leaderboard path; `/aips/ranking` now ships every display field.
- Simulation telemetry is generated and scored by the backend; WS frames carry both
  flat spec fields and the legacy nested `data` payload consumed by existing hooks.

---

## 3. API Surface (`/api/v1`)

| Endpoint | Notes |
|---|---|
| `GET /health` | db+redis checks; 503 when DB down |
| `GET /assets`, `/assets/leaderboard`, `/assets/{id}`, `/assets/{id}/history?months=` | detail = full pipeline bundle + `historical24m` |
| `GET /forecast/{id}?horizon_days=`, `GET /forecast/{id}/{30\|90\|180\|365}` | invalid horizon → 422 |
| `GET /anomaly/active`, `/anomaly/{id}` | camelCase rows; severity from `severity_for_score` |
| `GET /aips/ranking`, `/aips/{id}` | ranking rows include prod/deviation/decline/recovery fields |
| `GET /shap/{id}` | "Model-Estimated Feature Contributions" terminology enforced |
| `GET /metrics/forecast`, `/metrics/anomaly` | portfolio aggregates over cache |
| `POST /simulation/start` (+ legacy `/sessions`), `/{id}/pause|resume|reset|inject-anomaly|stop` (POST), `DELETE /{id}` | speed ∈ {1,5,10} else 422 |
| `WS /ws/simulation/{id}` | `simulation_started`, flat telemetry + nested `data`, `anomaly_injected`, `priority_changed`, `simulation_stopped`; handles `SET_SCENARIO:`/`PING` |

Global error envelopes: 400/404/422/500 + `OperationalError`→503 `database_unavailable`.

---

## 4. Frontend Integration

- `api/client.ts`: added `pauseSimulation/resumeSimulation/injectAnomaly`,
  `startSimulation(..., {speed_multiplier})`; typed against real envelopes.
- `api/hooks.ts`: `useSimulationSocket` extended with `pause/resume/inject`;
  consumes `msg.data` frames (120-tick window).
- `pages/SimulationCenter.tsx`: rewritten to run entirely off the backend session —
  no local interval generator. Inject button fires `GRADUAL_CLOG`; flash alerts are
  driven by backend severities.
- `pages/AssetDetail.tsx`: consumes the single `/assets/{id}` bundle; charts, gauge,
  status cards, recommendations list, timeline and confidence grid all render backend
  values (Arps R², detector ROC-AUC, combined recovery confidence…).
- `pages/AssetLeaderboard.tsx`: renders `/aips/ranking` rows directly (fake generator +
  client-side AIPS deleted); labelled static fallback only when API unreachable.
- `pages/Dashboard.tsx` / `AnomalyDetectionCenter.tsx`: fixed to unwrap `{rows}`
  envelopes with camelCase fields; Dashboard aggregates real bbl/d values.
- `api/types.ts`: `AnomalyResponse`, `AIPSScoreResponse`, `AssetRankingResponse`,
  `SHAPExplanationResponse` aligned with actual payloads.

---

## 5. Known Debt / Decisions

1. **Redis optional layer disabled by default** — health reports `redis_connected:false`;
   cache is the in-process portfolio dict guarded by a lock.
2. **LSTM stays opt-in off** — 36 monthly points per asset is too few to train;
   GradientBoosting+Arps ensemble only.
3. **Permissive response envelopes** (`schemas/envelopes.py`) intentionally loose so
   pipeline extensions don't break response validation; strict models live in tests.
4. **Anomaly calibration constants** (`ml/anomaly.py`: p25→p99.9 ×1.30 headroom,
   `norm^1.7` squash, ≥10% deviation blend) are tuning-sensitive; tests pin behaviour.
5. **Changing simulation asset mid-session** starts fresh session per hook design;
   previous session stops on unmount.
6. **`GET /portfolio/summary`** exists as an aggregate shortcut; Dashboard currently
   aggregates ranking rows client-side (values still 100% backend-sourced).
