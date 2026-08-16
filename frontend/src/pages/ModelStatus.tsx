import React, { useState } from 'react';
import { mockModels, mockDataIngestionLog } from '../data/mockData';
import { 
  ShieldCheck, 
  Settings, 
  Terminal,
  RefreshCw,
  Info
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const ModelStatus: React.FC = () => {
  const [retrainingModule, setRetrainingModule] = useState<string | null>(null);
  const [retrainSuccess, setRetrainSuccess] = useState<string | null>(null);

  // Performance history mock data
  const performanceHistory = [
    { time: '-24h', accuracy: 93.8 },
    { time: '-20h', accuracy: 94.2 },
    { time: '-16h', accuracy: 93.1 },
    { time: '-12h', accuracy: 94.5 },
    { time: '-8h', accuracy: 92.4 },
    { time: '-4h', accuracy: 95.8 },
    { time: 'Now', accuracy: 94.8 },
  ];

  const handleForceRetrain = (name: string) => {
    setRetrainingModule(name);
    setRetrainSuccess(null);
    setTimeout(() => {
      setRetrainingModule(null);
      setRetrainSuccess(name);
      setTimeout(() => setRetrainSuccess(null), 3000);
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent-lime text-xs font-mono mb-1">
            <ShieldCheck size={14} />
            <span>AI MODEL STATUS & ORCHESTRATION</span>
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-text-primary">
            Intelligence Node Status
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Operational status, pipeline health, and execution latency statistics for the core model cluster.
          </p>
        </div>
      </div>

      {/* Top Indicators Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-dark-surface border border-dark-border rounded">
          <span className="text-[10px] text-text-secondary font-mono tracking-wider uppercase block">System Status</span>
          <div className="text-xl font-bold font-mono text-accent-green mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
            <span>OPERATIONAL</span>
          </div>
        </div>

        <div className="p-4 bg-dark-surface border border-dark-border rounded">
          <span className="text-[10px] text-text-secondary font-mono tracking-wider uppercase block">Data Stream</span>
          <div className="text-xl font-bold font-mono text-accent-lime mt-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-lime animate-ping"></span>
            <span>ACTIVE</span>
          </div>
        </div>

        <div className="p-4 bg-dark-surface border border-dark-border rounded">
          <span className="text-[10px] text-text-secondary font-mono tracking-wider uppercase block">Last Model Sync</span>
          <div className="text-xl font-bold font-mono text-text-primary mt-1">
            T+00:02:45
          </div>
        </div>

        <div className="p-4 bg-dark-surface border border-dark-border rounded">
          <span className="text-[10px] text-text-secondary font-mono tracking-wider uppercase block">Next Cron Sync</span>
          <div className="text-xl font-bold font-mono text-accent-amber mt-1">
            00:12:15
          </div>
        </div>
      </div>

      {/* Active Modules Cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            Active Core AI Modules
          </h3>
          <span className="text-[10px] text-text-secondary font-mono">STATUS: 4/4 ACTIVE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockModels.map((model) => (
            <div key={model.id} className="bg-dark-surface border border-dark-border rounded p-5 flex flex-col justify-between h-[230px] hover:border-accent-amber transition duration-200">
              
              {/* Header inside card */}
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] text-text-secondary font-mono block">{model.id}</span>
                    <h4 className="text-sm font-bold text-text-primary uppercase tracking-wide mt-0.5">{model.name}</h4>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-accent-green bg-opacity-10 text-accent-green border border-accent-green border-opacity-35">
                    {model.status}
                  </span>
                </div>
                
                <div className="text-xs font-mono text-text-secondary">
                  <div>Model: <span className="text-text-primary">{model.algorithm}</span></div>
                  <div className="mt-1">Last Sync: <span className="text-text-primary">{model.lastRun}</span></div>
                </div>
              </div>

              {/* Accuracy Details or trigger retraining */}
              <div className="space-y-3 pt-3 border-t border-dark-border border-opacity-60">
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-text-secondary">
                  <div>MAE: <span className="text-text-primary font-bold">{model.mae}</span></div>
                  <div>R² Score: <span className="text-accent-lime font-bold">{model.r2}</span></div>
                </div>

                {retrainSuccess === model.name ? (
                  <div className="text-[10px] text-accent-green font-mono uppercase font-bold text-center">
                    ✓ Retrain Succeeded
                  </div>
                ) : (
                  <button
                    onClick={() => handleForceRetrain(model.name)}
                    disabled={retrainingModule !== null}
                    className="w-full bg-dark-bg hover:bg-dark-elevated border border-dark-border text-[10px] text-text-secondary hover:text-accent-amber font-mono font-bold uppercase tracking-wider py-1.5 rounded transition flex items-center justify-center gap-1.5"
                  >
                    {retrainingModule === model.name ? (
                      <>
                        <RefreshCw size={10} className="animate-spin" />
                        <span>Compiling...</span>
                      </>
                    ) : (
                      <>
                        <Settings size={10} />
                        <span>Force Retrain</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Accuracy History and Ingestion Log Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-dark-surface border border-dark-border rounded p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">
              Model Performance History (24h)
            </h3>
            <p className="text-xs text-text-secondary mb-6">
              Ensures tracking accuracy levels relative to predicted baseline drift thresholds.
            </p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" opacity={0.3} />
                <XAxis dataKey="time" stroke="#B8B3A8" fontSize={9} tickLine={false} />
                <YAxis stroke="#B8B3A8" fontSize={9} tickLine={false} domain={[90, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1D1F', borderColor: '#2A2D30' }}
                  labelStyle={{ color: '#F3EFE4' }}
                />
                <Line 
                  type="monotone" 
                  name="Accuracy %" 
                  dataKey="accuracy" 
                  stroke="#FF9000" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <span className="text-[10px] text-text-secondary font-mono block text-center uppercase tracking-widest mt-2">
            Accuracy vs Expected Baseline
          </span>
        </div>

        {/* Data Ingestion Log Console */}
        <div className="bg-dark-surface border border-dark-border rounded p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
              <Terminal size={16} className="text-accent-lime" />
              Data Ingestion Log
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              Real-time Ingestion Layer transaction packet feedback.
            </p>
          </div>

          <div className="flex-1 bg-dark-bg border border-dark-border rounded p-3 font-mono text-[10px] text-text-secondary space-y-2 overflow-y-auto h-36">
            {mockDataIngestionLog.map((logItem, idx) => (
              <div key={idx} className="flex justify-between items-start gap-1">
                <span className="text-accent-lime shrink-0">{logItem.timestamp}</span>
                <span className="flex-1 text-right break-all">{logItem.log}</span>
              </div>
            ))}
          </div>

          <button className="w-full bg-dark-bg hover:bg-dark-elevated border border-dark-border text-text-secondary hover:text-text-primary text-xs font-bold uppercase tracking-wider py-2 rounded transition mt-4 font-mono">
            View Full Logs
          </button>
        </div>

      </div>

      {/* Retraining Details alert */}
      <div className="bg-dark-surface border border-dark-border rounded p-5 flex items-start gap-3">
        <Info size={18} className="text-accent-lime shrink-0 mt-0.5" />
        <div className="text-xs text-text-secondary leading-relaxed">
          <span className="font-bold text-text-primary uppercase">Pipeline Retraining Triggers:</span> Retraining pipelines execute automatically when Mean Absolute Percentage Error (MAPE) drifts above 5%, or when new sensor node layouts are added to SCADA. Manual retraining override triggers can be initiated by administrative engineers using 'Force Retrain'.
        </div>
      </div>
    </div>
  );
};
