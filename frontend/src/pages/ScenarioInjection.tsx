import React, { useState, useMemo } from 'react';
import { getInjectedScenarioData, mockAssets } from '../data/mockData';
import { 
  CheckCircle, 
  Play, 
  ShieldAlert, 
  Terminal,
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type ScenarioType = 'normal' | 'decline' | 'valve_failure' | 'volatility' | 'recovery';

interface ScenarioMeta {
  type: ScenarioType;
  title: string;
  subtitle: string;
  severity: 'NORMAL' | 'WATCH' | 'HIGH' | 'CRITICAL' | 'SUCCESS';
  color: string;
}

export const ScenarioInjection: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<string>('MH-07');
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('decline');
  const [injecting, setInjecting] = useState<boolean>(false);
  const [payloadLog, setPayloadLog] = useState<string[]>([]);
  const [injectedSuccess, setInjectedSuccess] = useState<boolean>(false);

  const scenarioMetaList: ScenarioMeta[] = [
    {
      type: 'normal',
      title: 'Normal Production',
      subtitle: 'Standard reservoir flow profile',
      severity: 'NORMAL',
      color: '#00D966'
    },
    {
      type: 'decline',
      title: 'Gradual Decline',
      subtitle: 'Paraffin build-up / pressure drop',
      severity: 'WATCH',
      color: '#FF9000'
    },
    {
      type: 'valve_failure',
      title: 'Sudden Valve Failure',
      subtitle: 'Choke manifold control collapse',
      severity: 'CRITICAL',
      color: '#FF3B3B'
    },
    {
      type: 'volatility',
      title: 'High Volatility',
      subtitle: 'Slugging flow multiphase fluid',
      severity: 'HIGH',
      color: '#FF9000'
    },
    {
      type: 'recovery',
      title: 'Post-Intervention Recovery',
      subtitle: 'Successive valve gas-lift wash',
      severity: 'SUCCESS',
      color: '#00D966'
    }
  ];

  const scenarioData = useMemo(() => {
    return getInjectedScenarioData(activeScenario);
  }, [activeScenario]);

  const handleInject = () => {
    setInjecting(true);
    setInjectedSuccess(false);
    setPayloadLog([]);
    
    // Simulating terminal logging sequence
    const logs = [
      `SYS: INITIALIZING PAYLOAD FOR ASSET [${selectedAsset}]`,
      `SYS: MAP INJECTION PROTOCOL -> SCENARIO [${activeScenario.toUpperCase()}]`,
      `INGESTION: COMPILING 20 SEQUENTIAL SENSOR DATA-POINTS`,
      `STREAM: SENDING TELEMETRY STREAM PACKETS...`,
      `MODEL: SYNCING INFERENCE GRIDS (ISOLATION FOREST & XGBOOST)`,
      `SUCCESS: INJECTION STREAM MERGED INTO MASTER PIPELINE`
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setPayloadLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
        if (index === logs.length - 1) {
          setInjecting(false);
          setInjectedSuccess(true);
        }
      }, (index + 1) * 350);
    });
  };

  const activeMeta = scenarioMetaList.find(s => s.type === activeScenario) || scenarioMetaList[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent-red text-xs font-mono mb-1">
            <ShieldAlert size={14} className="animate-pulse" />
            <span>DEMO TOOL: SYNTHETIC DATA INJECTION HARNESS</span>
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-text-primary">
            Scenario Injection Controls
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manually trigger production anomalies and valve behaviors to demonstrate live alerting loops during judge reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-secondary uppercase">Injection Target:</span>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="bg-dark-surface border border-dark-border text-xs text-text-primary px-3 py-1.5 rounded outline-none font-mono focus:border-accent-amber cursor-pointer"
          >
            {mockAssets.map(a => (
              <option key={a.id} value={a.id}>{a.id} ({a.field})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Scenario Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {scenarioMetaList.map((scenario) => {
          const isActive = activeScenario === scenario.type;
          return (
            <div
              key={scenario.type}
              onClick={() => {
                if (!injecting) {
                  setActiveScenario(scenario.type);
                  setInjectedSuccess(false);
                  setPayloadLog([]);
                }
              }}
              className={`p-4 border rounded cursor-pointer transition select-none flex flex-col justify-between h-32 ${
                isActive 
                  ? 'bg-dark-elevated border-accent-amber' 
                  : 'bg-dark-surface border-dark-border hover:bg-dark-elevated hover:border-text-secondary'
              }`}
            >
              <div>
                <span 
                  className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono uppercase"
                  style={{ 
                    backgroundColor: `${scenario.color}15`, 
                    color: scenario.color,
                    border: `1px solid ${scenario.color}35`
                  }}
                >
                  {scenario.severity}
                </span>
                <h3 className="font-bold text-xs text-text-primary uppercase mt-3">{scenario.title}</h3>
              </div>
              <p className="text-[10px] text-text-secondary leading-normal">{scenario.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Detail & Control Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Description & Injector Button */}
        <div className="bg-dark-surface border border-dark-border rounded p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-[10px] text-text-secondary font-mono tracking-widest uppercase">Active Selection</h3>
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-wide mt-1">
                {activeMeta.title}
              </h2>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div>
                <span className="text-text-secondary block font-semibold uppercase text-[9px] font-mono">Scenario Description</span>
                <p className="text-text-primary mt-1">{scenarioData.description}</p>
              </div>
              <div>
                <span className="text-text-secondary block font-semibold uppercase text-[9px] font-mono">Expected System Response</span>
                <p className="text-text-primary mt-1">{scenarioData.expectedOutcome}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleInject}
              disabled={injecting}
              className="w-full bg-accent-red hover:bg-opacity-95 text-white text-xs font-bold uppercase tracking-wider py-3 rounded transition font-mono flex items-center justify-center gap-2 shadow-lg shadow-accent-red shadow-opacity-10"
            >
              {injecting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
              <span>{injecting ? 'TRANSMITTING STREAM...' : 'INJECT SCENARIO TO PIPELINE'}</span>
            </button>

            {injectedSuccess && (
              <div className="p-2.5 bg-accent-green bg-opacity-10 border border-accent-green border-opacity-35 rounded text-accent-green text-center text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle size={14} />
                <span>SCENARIO INGESTION ACTIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Preview Chart */}
        <div className="lg:col-span-2 bg-dark-surface border border-dark-border rounded p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">
              Sensor Wave-shape Preview
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              Visual response curve depicting how the ingestion sensors will fluctuate during this scenario.
            </p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scenarioData.datapoints} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="previewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeMeta.color} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={activeMeta.color} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" opacity={0.3} />
                <XAxis dataKey="timestamp" stroke="#B8B3A8" fontSize={8} tickLine={false} />
                <YAxis stroke="#B8B3A8" fontSize={8} tickLine={false} domain={[5000, 14000]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1D1F', borderColor: '#2A2D30' }}
                  labelStyle={{ color: '#F3EFE4' }}
                />
                <Area 
                  type="monotone" 
                  name="Fluid Rate (BBL/D)" 
                  dataKey="production" 
                  stroke={activeMeta.color} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#previewGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Terminal logs showing payload transmission (Page 12 Payload Feedback) */}
      <div className="bg-dark-surface border border-dark-border rounded p-5">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Terminal size={16} className="text-accent-lime" />
          Payload Transmission Logs
        </h3>
        
        <div className="h-32 bg-dark-bg border border-dark-border rounded p-4 overflow-y-auto font-mono text-xs text-text-secondary space-y-1.5">
          {payloadLog.length === 0 ? (
            <span className="italic text-text-secondary text-opacity-50">Harness idle. Click 'Inject Scenario' to transmit sensor waves...</span>
          ) : (
            payloadLog.map((log, index) => (
              <div key={index} className={log.includes('SUCCESS') ? 'text-accent-green font-semibold' : log.includes('INGESTION') ? 'text-accent-lime' : ''}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
