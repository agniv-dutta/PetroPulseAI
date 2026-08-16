import React from 'react';
import { mockAssets } from '../data/mockData';
import { 
  LayoutDashboard, 
  Database, 
  FileText, 
  TrendingUp, 
  Activity, 
  AlertTriangle, 
  PieChart 
} from 'lucide-react';

// Wrapper for placeholders to maintain dark theme
const PlaceholderWrapper: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  description: string;
  children?: React.ReactNode;
}> = ({ title, icon, description, children }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-dark-border pb-4">
        <div className="p-2 bg-accent-amber bg-opacity-10 text-accent-amber rounded border border-accent-amber border-opacity-25">
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary uppercase tracking-wide">{title}</h1>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
      </div>
      
      <div className="bg-dark-surface border border-dark-border rounded p-6">
        <div className="flex items-center gap-2 text-accent-amber text-xs font-mono mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-ping"></span>
          <span>TIER INTERFACE ACTIVE | PHASE 1 LOOP REFERENCE</span>
        </div>
        
        {children ? children : (
          <p className="text-sm text-text-secondary">
            This screen contains operational telemetry from the initial deployment phase. All data pathways remain active. Use the sidebar to explore the diagnostic and priority features of Pages 8 through 15.
          </p>
        )}
      </div>
    </div>
  );
};

export const DashboardPlaceholder: React.FC = () => (
  <PlaceholderWrapper 
    title="Command Center / Portfolio Dashboard" 
    icon={<LayoutDashboard size={24} />} 
    description="Portfolio health overview and regional operations heatmap"
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="p-4 bg-dark-elevated border border-dark-border rounded">
        <div className="text-[10px] text-text-secondary font-mono tracking-wider uppercase">Active Assets</div>
        <div className="text-2xl font-bold text-text-primary mt-1 font-mono">142</div>
        <div className="text-xs text-accent-green font-mono mt-1">● ALL SYNCED</div>
      </div>
      <div className="p-4 bg-dark-elevated border border-dark-border rounded">
        <div className="text-[10px] text-text-secondary font-mono tracking-wider uppercase">Current Production</div>
        <div className="text-2xl font-bold text-text-primary mt-1 font-mono">33,400 <span className="text-xs">BBL/D</span></div>
        <div className="text-xs text-accent-red font-mono mt-1">↓ -4.2% DEVIATION</div>
      </div>
      <div className="p-4 bg-dark-elevated border border-dark-border rounded">
        <div className="text-[10px] text-text-secondary font-mono tracking-wider uppercase">Active Anomalies</div>
        <div className="text-2xl font-bold text-accent-red mt-1 font-mono">3</div>
        <div className="text-xs text-text-secondary font-mono mt-1">2 CRITICAL | 1 WATCH</div>
      </div>
      <div className="p-4 bg-dark-elevated border border-dark-border rounded">
        <div className="text-[10px] text-text-secondary font-mono tracking-wider uppercase">Net Recovery Potential</div>
        <div className="text-2xl font-bold text-accent-green mt-1 font-mono">3.42 <span className="text-xs">MMBL</span></div>
        <div className="text-xs text-accent-lime font-mono mt-1">AIPS DRIVEN</div>
      </div>
    </div>
    <div className="h-48 border border-dashed border-dark-border rounded flex flex-col items-center justify-center text-text-secondary bg-dark-bg p-4 text-center">
      <span className="text-xs uppercase tracking-wider font-mono text-text-primary mb-2">India Basin Heatmap (Geospatial)</span>
      <span className="text-[11px] max-w-md">Geospatial overlays showing Cambay Basin, Mumbai High offshore platforms, and KG deepwater fields. Click assets in Sidebar to drill down.</span>
    </div>
  </PlaceholderWrapper>
);

export const AssetLeaderboardPlaceholder: React.FC = () => (
  <PlaceholderWrapper 
    title="Asset Leaderboard / Priority View" 
    icon={<Database size={24} />} 
    description="Unified inventory of assets ranked by Asset Intervention Priority Score (AIPS)"
  >
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs font-mono">
        <thead>
          <tr className="border-b border-dark-border text-text-secondary uppercase">
            <th className="py-2">Asset ID</th>
            <th className="py-2">Field / Basin</th>
            <th className="py-2 text-right">Production</th>
            <th className="py-2 text-right">Deviation</th>
            <th className="py-2 text-center">Severity</th>
            <th className="py-2 text-right">AIPS Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-border divide-opacity-30">
          {mockAssets.map((asset) => (
            <tr key={asset.id} className="hover:bg-dark-elevated transition">
              <td className="py-3 font-bold text-text-primary">{asset.id}</td>
              <td className="py-3 text-text-secondary">{asset.field} ({asset.basin})</td>
              <td className="py-3 text-right text-text-primary">{asset.currentProduction.toLocaleString()} / {asset.expectedProduction.toLocaleString()} BBL/D</td>
              <td className={`py-3 text-right ${asset.deviation < 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                {asset.deviation}%
              </td>
              <td className="py-3 text-center">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  asset.anomalySeverity === 'CRITICAL' ? 'bg-accent-red text-white' :
                  asset.anomalySeverity === 'HIGH' ? 'bg-accent-amber text-dark-bg' :
                  asset.anomalySeverity === 'WATCH' ? 'bg-yellow-500 text-dark-bg' :
                  'bg-dark-border text-text-secondary'
                }`}>
                  {asset.anomalySeverity}
                </span>
              </td>
              <td className="py-3 text-right font-bold text-accent-lime">{asset.aipsScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </PlaceholderWrapper>
);

export const AssetDetailPlaceholder: React.FC = () => (
  <PlaceholderWrapper 
    title="Digital Asset Profile / Asset Detail" 
    icon={<FileText size={24} />} 
    description="Drill-down diagnostics and operational events timeline for MH-07"
  >
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 p-4 bg-dark-elevated border border-dark-border rounded">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Telemetry Health Timeline</h3>
        <div className="space-y-4">
          <div className="flex gap-3 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-red mt-1.5 shrink-0 animate-ping"></div>
            <div>
              <div className="font-semibold text-text-primary">Anomaly Flagged (Severe flow deviation)</div>
              <div className="text-[10px] text-text-secondary mt-0.5">Aug 16, 2026 - 16:42:07</div>
            </div>
          </div>
          <div className="flex gap-3 text-xs border-l border-dark-border ml-[3px] pl-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-amber mt-1.5 shrink-0"></div>
            <div>
              <div className="font-semibold text-text-primary">Decline Mode Confirmed (Pressure drift &gt; 5%)</div>
              <div className="text-[10px] text-text-secondary mt-0.5">Aug 15, 2026 - 04:12:00</div>
            </div>
          </div>
          <div className="flex gap-3 text-xs border-l border-dark-border ml-[3px] pl-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green mt-1.5 shrink-0"></div>
            <div>
              <div className="font-semibold text-text-primary">Model sync complete (XGBoost forecasting)</div>
              <div className="text-[10px] text-text-secondary mt-0.5">Aug 14, 2026 - 00:00:00</div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 bg-dark-elevated border border-dark-border rounded flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-1">Asset Metadata</h3>
          <p className="text-[10px] text-text-secondary font-mono">ID: MH-07-DELTA</p>
        </div>
        <div className="space-y-2 mt-4 text-xs font-mono">
          <div className="flex justify-between border-b border-dark-border pb-1">
            <span className="text-text-secondary">Basin:</span>
            <span className="text-text-primary">Arabian Sea</span>
          </div>
          <div className="flex justify-between border-b border-dark-border pb-1">
            <span className="text-text-secondary">Depth:</span>
            <span className="text-text-primary">1,420 m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Type:</span>
            <span className="text-text-primary">Offshore Lift</span>
          </div>
        </div>
      </div>
    </div>
  </PlaceholderWrapper>
);

export const ForecastingCanvasPlaceholder: React.FC = () => (
  <PlaceholderWrapper 
    title="Production Forecasting Canvas" 
    icon={<TrendingUp size={24} />} 
    description="Multi-series predictive charts comparing historical yield, expected baseline, and future horizons"
  >
    <div className="h-64 border border-dashed border-dark-border rounded flex flex-col items-center justify-center text-text-secondary bg-dark-bg p-4 text-center">
      <span className="text-xs uppercase tracking-wider font-mono text-text-primary mb-2">Historical Actual vs Expected Neural Forecast</span>
      <span className="text-[11px] max-w-md">Displays 180D historical production trends overlays and 365D forward projection with uncertainty bands (+/- 8% confidence). Model configuration details are visible on Page 13 (Model Status).</span>
    </div>
  </PlaceholderWrapper>
);

export const ForecastDetailsPlaceholder: React.FC = () => (
  <PlaceholderWrapper 
    title="Forecast Diagnostics & Performance" 
    icon={<Activity size={24} />} 
    description="Model error metrics (MAE, RMSE), retraining schedules, and feature importance matrices"
  />
);

export const AnomalyDetectionPlaceholder: React.FC = () => (
  <PlaceholderWrapper 
    title="Anomaly Detection Center" 
    icon={<AlertTriangle size={24} />} 
    description="Real-time Isolation Forest warning flags and threshold monitoring"
  />
);

export const DeviationAttributionPlaceholder: React.FC = () => (
  <PlaceholderWrapper 
    title="Deviation Attribution / Loss Analysis" 
    icon={<PieChart size={24} />} 
    description="SHAP attribution summary of production drops, distinguishing natural decline from operational failures"
  />
);
