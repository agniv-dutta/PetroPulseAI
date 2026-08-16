import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { LandingPage } from './pages/LandingPage';

// Code-split route-level chunks to reduce initial bundle size
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const AssetLeaderboard = lazy(() => import('./pages/AssetLeaderboard').then(m => ({ default: m.AssetLeaderboard })));
const AssetDetail = lazy(() => import('./pages/AssetDetail').then(m => ({ default: m.AssetDetail })));
const ForecastingCanvas = lazy(() => import('./pages/ForecastingCanvas').then(m => ({ default: m.ForecastingCanvas })));
const ForecastDetailsPlaceholder = lazy(() => import('./pages/PlaceholderPages').then(m => ({ default: m.ForecastDetailsPlaceholder })));
const AnomalyDetectionCenter = lazy(() => import('./pages/AnomalyDetectionCenter').then(m => ({ default: m.AnomalyDetectionCenter })));
const DeviationAttribution = lazy(() => import('./pages/DeviationAttribution').then(m => ({ default: m.DeviationAttribution })));
const RootCauseAnalysis = lazy(() => import('./pages/RootCauseAnalysis').then(m => ({ default: m.RootCauseAnalysis })));
const InterventionPriority = lazy(() => import('./pages/InterventionPriority').then(m => ({ default: m.InterventionPriority })));
const RecoveryWhatIf = lazy(() => import('./pages/RecoveryWhatIf').then(m => ({ default: m.RecoveryWhatIf })));
const SimulationCenter = lazy(() => import('./pages/SimulationCenter').then(m => ({ default: m.SimulationCenter })));
const ScenarioInjection = lazy(() => import('./pages/ScenarioInjection').then(m => ({ default: m.ScenarioInjection })));
const ModelStatus = lazy(() => import('./pages/ModelStatus').then(m => ({ default: m.ModelStatus })));
const DataProvenance = lazy(() => import('./pages/DataProvenance').then(m => ({ default: m.DataProvenance })));
const HelpGlossary = lazy(() => import('./pages/HelpGlossary').then(m => ({ default: m.HelpGlossary })));

function PageFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#B8B3A8', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', letterSpacing: '0.05em' }}>
        LOADING...
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page - Top level root route with its own header & footer design */}
        <Route path="/" element={<LandingPage />} />

        {/* Command Center App Routes - Rendered within DashboardLayout */}
        <Route
          path="/dashboard"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <Dashboard />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/assets/leaderboard"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <AssetLeaderboard />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/assets/detail/:assetId"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <AssetDetail />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/intelligence/forecasting"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <ForecastingCanvas />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/intelligence/forecast-details"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <ForecastDetailsPlaceholder />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/intelligence/anomaly-detection"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <AnomalyDetectionCenter />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/intelligence/deviation-attribution"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <DeviationAttribution />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/intelligence/root-cause"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <RootCauseAnalysis />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/intelligence/priority"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <InterventionPriority />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/scenarios/recovery-what-if"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <RecoveryWhatIf />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/scenarios/simulation"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <SimulationCenter />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/scenarios/injection"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <ScenarioInjection />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/system/model-status"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <ModelStatus />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/system/provenance"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <DataProvenance />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/data-provenance"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <DataProvenance />
              </Suspense>
            </DashboardLayout>
          }
        />
        <Route
          path="/system/help"
          element={
            <DashboardLayout>
              <Suspense fallback={<PageFallback />}>
                <HelpGlossary />
              </Suspense>
            </DashboardLayout>
          }
        />

        {/* Catch-all fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
