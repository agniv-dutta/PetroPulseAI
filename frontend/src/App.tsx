import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { AssetLeaderboard } from './pages/AssetLeaderboard';
import { AssetDetail } from './pages/AssetDetail';
import { ForecastingCanvas } from './pages/ForecastingCanvas';
import { AnomalyDetectionCenter } from './pages/AnomalyDetectionCenter';
import { DeviationAttribution } from './pages/DeviationAttribution';
import { RootCauseAnalysis } from './pages/RootCauseAnalysis';
import { InterventionPriority } from './pages/InterventionPriority';
import { RecoveryWhatIf } from './pages/RecoveryWhatIf';
import { SimulationCenter } from './pages/SimulationCenter';
import { ScenarioInjection } from './pages/ScenarioInjection';
import { ModelStatus } from './pages/ModelStatus';
import { DataProvenance } from './pages/DataProvenance';
import { HelpGlossary } from './pages/HelpGlossary';
import { ForecastDetailsPlaceholder } from './pages/PlaceholderPages';

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
              <Dashboard />
            </DashboardLayout>
          }
        />
        <Route
          path="/assets/leaderboard"
          element={
            <DashboardLayout>
              <AssetLeaderboard />
            </DashboardLayout>
          }
        />
        <Route
          path="/assets/detail/:assetId"
          element={
            <DashboardLayout>
              <AssetDetail />
            </DashboardLayout>
          }
        />
        <Route
          path="/intelligence/forecasting"
          element={
            <DashboardLayout>
              <ForecastingCanvas />
            </DashboardLayout>
          }
        />
        <Route
          path="/intelligence/forecast-details"
          element={
            <DashboardLayout>
              <ForecastDetailsPlaceholder />
            </DashboardLayout>
          }
        />
        <Route
          path="/intelligence/anomaly-detection"
          element={
            <DashboardLayout>
              <AnomalyDetectionCenter />
            </DashboardLayout>
          }
        />
        <Route
          path="/intelligence/deviation-attribution"
          element={
            <DashboardLayout>
              <DeviationAttribution />
            </DashboardLayout>
          }
        />
        <Route
          path="/intelligence/root-cause"
          element={
            <DashboardLayout>
              <RootCauseAnalysis />
            </DashboardLayout>
          }
        />
        <Route
          path="/intelligence/priority"
          element={
            <DashboardLayout>
              <InterventionPriority />
            </DashboardLayout>
          }
        />
        <Route
          path="/scenarios/recovery-what-if"
          element={
            <DashboardLayout>
              <RecoveryWhatIf />
            </DashboardLayout>
          }
        />
        <Route
          path="/scenarios/simulation"
          element={
            <DashboardLayout>
              <SimulationCenter />
            </DashboardLayout>
          }
        />
        <Route
          path="/scenarios/injection"
          element={
            <DashboardLayout>
              <ScenarioInjection />
            </DashboardLayout>
          }
        />
        <Route
          path="/system/model-status"
          element={
            <DashboardLayout>
              <ModelStatus />
            </DashboardLayout>
          }
        />
        <Route
          path="/system/provenance"
          element={
            <DashboardLayout>
              <DataProvenance />
            </DashboardLayout>
          }
        />
        <Route
          path="/system/help"
          element={
            <DashboardLayout>
              <HelpGlossary />
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
