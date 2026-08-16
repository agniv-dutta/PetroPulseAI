import React, { useState, useEffect, useRef } from 'react';
import { generateTelemetryBase, mockAssets } from '../data/mockData';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Activity, 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { DataTransparencyBanner } from '../components/DataTransparencyBanner';

export const SimulationCenter: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1); // 1x, 5x, 10x
  const [selectedAsset, setSelectedAsset] = useState<string>('MH-07');
  
  // We populate initial data (e.g. 15 points) to start with
  const [stream, setStream] = useState(() => generateTelemetryBase(15));
  const [flashAlert, setFlashAlert] = useState<boolean>(false);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Audio or visual flash handler for critical states
  const latestDataPoint = stream[stream.length - 1];

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(100, 1000 / speed);
      
      streamTimerRef.current = setInterval(() => {
        setStream((prevStream) => {
          const baseVal = 12500;
          const nextIndex = prevStream.length;
          
          // Generate new single observation
          const time = new Date();
          const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          
          // Inject failing trend sometimes or just standard variation
          // After 25 points, inject a valve failure anomaly for the demo
          let production = 12500;
          let anomalyScore = 0.05 + Math.random() * 0.1;
          
          if (nextIndex > 22 && nextIndex < 35) {
            // valve failure simulation
            production = Math.round(6200 + (Math.random() - 0.5) * 180);
            anomalyScore = 0.96 + Math.random() * 0.03;
          } else {
            production = Math.round(baseVal + (Math.sin(nextIndex / 5) * 200) + (Math.random() - 0.5) * 100);
          }

          const forecast = Math.round(baseVal + (Math.sin(nextIndex / 5) * 80));
          let status: 'NORMAL' | 'CRITICAL' = 'NORMAL';
          if (anomalyScore > 0.85) {
            status = 'CRITICAL';
            // Trigger visual flash
            setFlashAlert(true);
            setTimeout(() => setFlashAlert(false), 500);
          }

          const newRow = {
            timestamp: timeString,
            assetId: selectedAsset,
            production,
            forecast,
            anomalyScore: parseFloat(anomalyScore.toFixed(2)),
            status
          };

          // Limit stream history to 30 points to prevent overload
          const updated = [...prevStream, newRow];
          if (updated.length > 25) {
            updated.shift();
          }
          return updated;
        });
      }, intervalMs);
    } else {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
      }
    }

    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
      }
    };
  }, [isPlaying, speed, selectedAsset]);

  const handleReset = () => {
    setIsPlaying(false);
    setStream(generateTelemetryBase(15));
    setFlashAlert(false);
  };

  const getDevPct = () => {
    if (!latestDataPoint) return '0.0';
    const diff = latestDataPoint.production - latestDataPoint.forecast;
    return ((diff / latestDataPoint.forecast) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6 relative">
      {/* Data Transparency Banner */}
      <DataTransparencyBanner context="simulation" isDismissible />

      {/* Visual Flash Alert overlay when threshold is breached */}
      {flashAlert && (
        <div className="absolute inset-0 bg-accent-red bg-opacity-[0.06] border-2 border-accent-red border-opacity-40 rounded pointer-events-none z-10 transition-all duration-100 animate-pulse"></div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent-lime text-xs font-mono mb-1">
            <Activity size={14} />
            <span>REAL-TIME SIMULATION & TELEMETRY HUB</span>
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-text-primary">
            Simulation Center
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Stream synthetic wellhead observations and trace model inference response curves in real-time.
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-dark-surface border border-dark-border rounded p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        
        {/* Play / Pause / Reset */}
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button 
              onClick={() => setIsPlaying(false)}
              className="p-3 bg-dark-bg hover:bg-dark-elevated border border-dark-border text-accent-amber rounded transition"
              title="Pause Simulation"
              aria-label="Pause simulation"
            >
              <Pause size={16} fill="currentColor" />
            </button>
          ) : (
            <button 
              onClick={() => setIsPlaying(true)}
              className="p-3 bg-accent-amber text-dark-bg rounded transition hover:bg-opacity-95 shadow-md shadow-accent-amber shadow-opacity-10"
              title="Play Simulation"
              aria-label="Play simulation"
            >
              <Play size={16} fill="currentColor" />
            </button>
          )}

          <button 
            onClick={handleReset}
            className="p-3 bg-dark-bg hover:bg-dark-elevated border border-dark-border text-text-secondary hover:text-text-primary rounded transition"
            title="Reset Stream"
            aria-label="Reset simulation stream"
          >
            <RotateCcw size={16} />
          </button>

          <span className="text-xs font-mono text-text-secondary uppercase ml-2">
            Status: {isPlaying ? <span className="text-accent-green font-bold">STREAMING</span> : 'PAUSED'}
          </span>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-text-secondary uppercase">Playback Speed:</span>
          <div className="flex bg-dark-bg border border-dark-border rounded p-1">
            {([1, 5, 10] as number[]).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                aria-label={`Set playback speed to ${s}x`}
                aria-pressed={speed === s}
                className={`px-3 py-1 text-xs font-mono font-bold rounded transition ${
                  speed === s 
                    ? 'bg-dark-elevated text-accent-amber' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Asset Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[10px] font-mono text-text-secondary uppercase">Telemetry Target:</span>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            aria-label="Select telemetry target asset"
            className="bg-dark-bg border border-dark-border text-xs text-text-primary px-3 py-1.5 rounded outline-none font-mono focus:border-accent-amber cursor-pointer"
          >
            {mockAssets.map(a => (
              <option key={a.id} value={a.id}>{a.id} ({a.field})</option>
            ))}
          </select>
        </div>

      </div>

      {/* Live Stream KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-dark-surface border border-dark-border rounded flex flex-col justify-between">
          <span className="text-[9px] text-text-secondary font-mono uppercase">Telemetry Production</span>
          <div className="text-2xl font-bold font-mono text-text-primary mt-1">
            {latestDataPoint ? latestDataPoint.production.toLocaleString() : '---'} <span className="text-xs">BBL/D</span>
          </div>
          <span className="text-[10px] text-text-secondary font-mono mt-1 uppercase">Sensor frequency 10s</span>
        </div>

        <div className="p-4 bg-dark-surface border border-dark-border rounded flex flex-col justify-between">
          <span className="text-[9px] text-text-secondary font-mono uppercase">Expected Forecast</span>
          <div className="text-2xl font-bold font-mono text-text-primary mt-1">
            {latestDataPoint ? latestDataPoint.forecast.toLocaleString() : '---'} <span className="text-xs">BBL/D</span>
          </div>
          <span className="text-[10px] text-text-secondary font-mono mt-1 uppercase">XGBoost continuous sync</span>
        </div>

        <div className="p-4 bg-dark-surface border border-dark-border rounded flex flex-col justify-between">
          <span className="text-[9px] text-text-secondary font-mono uppercase">Deviation Delta</span>
          <div className={`text-2xl font-bold font-mono mt-1 ${parseFloat(getDevPct()) < -4 ? 'text-accent-red' : 'text-accent-green'}`}>
            {latestDataPoint ? `${getDevPct()}%` : '---'}
          </div>
          <span className="text-[10px] text-text-secondary font-mono mt-1 uppercase">Critical Limit -5%</span>
        </div>

        <div className="p-4 bg-dark-surface border border-dark-border rounded flex flex-col justify-between">
          <span className="text-[9px] text-text-secondary font-mono uppercase">Anomaly Inference Score</span>
          <div className={`text-2xl font-bold font-mono mt-1 ${latestDataPoint && latestDataPoint.anomalyScore > 0.85 ? 'text-accent-red' : 'text-text-primary'}`}>
            {latestDataPoint ? latestDataPoint.anomalyScore : '---'}
          </div>
          <span className={`text-[10px] font-bold font-mono mt-1 uppercase ${
            latestDataPoint && latestDataPoint.status === 'CRITICAL' ? 'text-accent-red' : 'text-text-secondary'
          }`}>
            {latestDataPoint ? latestDataPoint.status : '---'}
          </span>
        </div>
      </div>

      {/* Streaming Sparkline Chart */}
      <div className="bg-dark-surface border border-dark-border rounded p-6">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
          Live Ingestion Trace Chart
        </h3>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stream}>
              <XAxis dataKey="timestamp" stroke="#B8B3A8" fontSize={9} tickLine={false} />
              <YAxis stroke="#B8B3A8" fontSize={9} tickLine={false} domain={[5000, 14000]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1D1F', borderColor: '#2A2D30' }}
                labelStyle={{ color: '#F3EFE4' }}
              />
              <Line 
                type="monotone" 
                name="Actual Flow" 
                dataKey="production" 
                stroke="#FF9000" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4 }} 
              />
              <Line 
                type="monotone" 
                name="Forecast" 
                dataKey="forecast" 
                stroke="#B8B3A8" 
                strokeWidth={1.5} 
                strokeDasharray="3 3" 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stream Table */}
      <div className="bg-dark-surface border border-dark-border rounded p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            Incoming Telemetry Observations (Log)
          </h3>
          <span className="text-[10px] text-text-secondary font-mono">SHOWING LATEST 25 OBSERVATIONS</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-dark-border text-text-secondary uppercase text-[10px]">
                <th className="py-2.5">Ingestion Timestamp</th>
                <th className="py-2.5">Asset ID</th>
                <th className="py-2.5 text-right">Production (BBL/D)</th>
                <th className="py-2.5 text-right">Model Forecast (BBL/D)</th>
                <th className="py-2.5 text-right">Deviation Delta</th>
                <th className="py-2.5 text-right">Anomaly Score</th>
                <th className="py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border divide-opacity-35">
              {[...stream].reverse().map((row, idx) => {
                const dev = ((row.production - row.forecast) / row.forecast) * 100;
                
                return (
                  <tr 
                    key={idx} 
                    className={`transition duration-150 ${
                      row.status === 'CRITICAL' 
                        ? 'bg-accent-red bg-opacity-[0.04] text-accent-red hover:bg-opacity-[0.08]' 
                        : 'hover:bg-dark-elevated text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <td className="py-3 font-semibold">{row.timestamp}</td>
                    <td className="py-3">{row.assetId}</td>
                    <td className="py-3 text-right font-bold text-text-primary">{row.production.toLocaleString()}</td>
                    <td className="py-3 text-right">{row.forecast.toLocaleString()}</td>
                    <td className={`py-3 text-right font-semibold ${dev < -4 ? 'text-accent-red' : 'text-accent-green'}`}>
                      {dev >= 0 ? '+' : ''}{dev.toFixed(1)}%
                    </td>
                    <td className="py-3 text-right">{row.anomalyScore}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                        row.status === 'CRITICAL' 
                          ? 'bg-accent-red text-white' 
                          : 'bg-dark-bg border border-dark-border text-text-secondary'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
