import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import {
  AnomalyDetectionPlaceholder,
  AssetDetailPlaceholder,
  AssetLeaderboardPlaceholder,
  DashboardPlaceholder,
  DeviationAttributionPlaceholder,
  ForecastDetailsPlaceholder,
  ForecastingCanvasPlaceholder,
} from './pages/PlaceholderPages';
import { DataProvenance } from './pages/DataProvenance';
import { HelpGlossary } from './pages/HelpGlossary';
import { InterventionPriority } from './pages/InterventionPriority';
import { ModelStatus } from './pages/ModelStatus';
import { RecoveryWhatIf } from './pages/RecoveryWhatIf';
import { RootCauseAnalysis } from './pages/RootCauseAnalysis';
import { ScenarioInjection } from './pages/ScenarioInjection';
import { SimulationCenter } from './pages/SimulationCenter';

function App() {
  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<DashboardPlaceholder />} />
          <Route path="/assets/leaderboard" element={<AssetLeaderboardPlaceholder />} />
          <Route path="/assets/detail/:assetId" element={<AssetDetailPlaceholder />} />
          <Route path="/intelligence/forecasting" element={<ForecastingCanvasPlaceholder />} />
          <Route path="/intelligence/forecast-details" element={<ForecastDetailsPlaceholder />} />
          <Route path="/intelligence/anomaly-detection" element={<AnomalyDetectionPlaceholder />} />
          <Route path="/intelligence/deviation-attribution" element={<DeviationAttributionPlaceholder />} />
          <Route path="/intelligence/root-cause" element={<RootCauseAnalysis />} />
          <Route path="/intelligence/priority" element={<InterventionPriority />} />
          <Route path="/scenarios/recovery-what-if" element={<RecoveryWhatIf />} />
          <Route path="/scenarios/simulation" element={<SimulationCenter />} />
          <Route path="/scenarios/injection" element={<ScenarioInjection />} />
          <Route path="/system/model-status" element={<ModelStatus />} />
          <Route path="/system/provenance" element={<DataProvenance />} />
          <Route path="/system/help" element={<HelpGlossary />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}

export default App;
