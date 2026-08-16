import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { AssetLeaderboard } from './pages/AssetLeaderboard';
import { AssetDetail } from './pages/AssetDetail';
import { ForecastingCanvas } from './pages/ForecastingCanvas';
import { AnomalyDetectionCenter } from './pages/AnomalyDetectionCenter';
import { DeviationAttribution } from './pages/DeviationAttribution';
import { InterventionPriority } from './pages/InterventionPriority';

// Placeholder views for sub-routes
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ padding: '40px', color: '#F3EFE4' }}>
    <h1 style={{ fontSize: '24px', fontWeight: 700 }}>{title}</h1>
    <p style={{ color: '#B8B3A8', marginTop: '8px' }}>Module view under active development.</p>
  </div>
);

export const App: React.FC = () => {
  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#080909' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/asset-map" element={<PlaceholderPage title="Asset Geospatial Map" />} />
            <Route path="/metrics" element={<ForecastingCanvas />} />
            <Route path="/forecast" element={<ForecastingCanvas />} />
            <Route path="/anomalies" element={<AnomalyDetectionCenter />} />
            <Route path="/attribution" element={<DeviationAttribution />} />
            <Route path="/attribution/:id" element={<DeviationAttribution />} />
            <Route path="/intervention" element={<InterventionPriority />} />
            <Route path="/intervention/:id" element={<InterventionPriority />} />
            <Route path="/recovery" element={<InterventionPriority />} />
            <Route path="/reports" element={<PlaceholderPage title="Field Reports" />} />
            <Route path="/leaderboard" element={<AssetLeaderboard />} />
            <Route path="/asset/:id" element={<AssetDetail />} />
            <Route path="/asset" element={<AssetDetail />} />
            <Route path="/recovery" element={<PlaceholderPage title="Estimated Recovery Potential" />} />
            <Route path="/equipment" element={<PlaceholderPage title="Equipment Health" />} />
            <Route path="/esg" element={<PlaceholderPage title="ESG Tracking" />} />
            <Route path="/maintenance" element={<PlaceholderPage title="Predictive Maintenance" />} />
            <Route path="/cost" element={<PlaceholderPage title="Cost Analysis" />} />
            <Route path="/team" element={<PlaceholderPage title="Team Collaboration" />} />
            <Route path="/exports" element={<PlaceholderPage title="Data Exports" />} />
            <Route path="/api" element={<PlaceholderPage title="API Access" />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
            <Route path="/simulation" element={<PlaceholderPage title="Reservoir & Production Simulation" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
