import React, { useState } from 'react';
import { mockSHAPData, simulateYieldChange } from '../data/mockData';
import { 
  RotateCcw, 
  Play, 
  Cpu, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

export const RootCauseAnalysis: React.FC = () => {
  const [pressureDelta, setPressureDelta] = useState<number>(10); // +10%
  const [chokeDelta, setChokeDelta] = useState<number>(-5); // -5%
  const [simResults, setSimResults] = useState({ yieldDelta: 400, newYield: 13400 });
  const [isSimulating, setIsSimulating] = useState(false);

  // Reservoir decline chart mock data
  const declineData = [
    { day: 'Day 1', value: 13500 },
    { day: 'Day 5', value: 13300 },
    { day: 'Day 10', value: 13200 },
    { day: 'Day 15', value: 12900 },
    { day: 'Day 20', value: 12800 },
    { day: 'Day 25', value: 12400 },
    { day: 'Day 30', value: 12100 },
  ];

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const res = simulateYieldChange(pressureDelta, chokeDelta);
      setSimResults(res);
      setIsSimulating(false);
    }, 600);
  };

  const handleReset = () => {
    setPressureDelta(10);
    setChokeDelta(-5);
    setSimResults({ yieldDelta: 400, newYield: 13400 });
  };

  // SHAP waterfall steps calculation helper
  // Base = 12500, BHP = +850, GOR = -320, Temp = +180, Seasonal = -210
  // Total = 13000
  const waterfallSteps = [
    { label: 'Base Value', start: 0, end: 12500, type: 'neutral', displayVal: '12,500' },
    { label: 'Btm Hole Press.', start: 12500, end: 13350, type: 'positive', displayVal: '+850', subText: '+124 psi' },
    { label: 'Gas-Oil Ratio', start: 13350, end: 13030, type: 'negative', displayVal: '-320', subText: '+45 scf/bbl' },
    { label: 'Surface Temp', start: 13030, end: 13210, type: 'positive', displayVal: '+180', subText: '-2 °F' },
    { label: 'Seasonal Factor', start: 13210, end: 13000, type: 'negative', displayVal: '-210', subText: 'Winter Q1' },
    { label: 'Predicted Output', start: 0, end: 13000, type: 'final', displayVal: '13,000 BBL/D' }
  ];

  const maxVal = 14000;

  return (
    <div className="space-y-6">
      {/* Header and Asset Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent-amber text-xs font-mono mb-1">
            <Cpu size={14} />
            <span>EXPLAINABILITY & LOSS ATTRIBUTION ENGINE</span>
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-text-primary">
            AI Explainability Matrix
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Deep dive into the machine learning inference engine. Analyzing real-time SHAP values for Asset #042-Delta.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-text-secondary font-mono">SELECTED ASSET</div>
            <div className="text-sm font-bold text-text-primary">MH-07 | Mumbai High</div>
          </div>
          <div className="h-8 w-[1px] bg-dark-border"></div>
          <span className="px-2.5 py-1 bg-accent-red bg-opacity-10 border border-accent-red border-opacity-35 text-accent-red text-xs font-mono font-bold rounded">
            CRITICAL DEV
          </span>
        </div>
      </div>

      {/* Grid of Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Waterfall Chart Panel */}
        <div className="lg:col-span-2 bg-dark-surface border border-dark-border rounded p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-text-primary uppercase tracking-wide">
                  SHAP Waterfall Distribution
                </h2>
                <p className="text-xs text-text-secondary">
                  Quantifying parameter attributions relative to predicted base reservoir models
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-accent-amber rounded-sm"></span>
                  <span className="text-text-secondary uppercase">Positive Impact</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-accent-red bg-opacity-70 rounded-sm"></span>
                  <span className="text-text-secondary uppercase">Negative Impact</span>
                </div>
              </div>
            </div>

            {/* Waterfall Body */}
            <div className="space-y-4 py-4 relative">
              {/* Vertical line indicator at base line */}
              <div className="absolute left-[30%] top-0 bottom-0 border-l border-dashed border-dark-border pointer-events-none"></div>
              
              {waterfallSteps.map((step, idx) => {
                const baseShiftPct = 30; // offset percentage from left where base starts
                
                let left = 0;
                let width = 0;
                let barColor = '';

                if (step.type === 'neutral' || step.type === 'final') {
                  left = baseShiftPct;
                  width = (step.end / maxVal) * 50;
                  barColor = 'bg-dark-elevated border border-dark-border';
                } else {
                  const leftBound = Math.min(step.start, step.end);
                  const rightBound = Math.max(step.start, step.end);
                  left = baseShiftPct + (leftBound / maxVal) * 50;
                  width = ((rightBound - leftBound) / maxVal) * 50;
                  barColor = step.type === 'positive' 
                    ? 'bg-accent-amber border border-accent-amber border-opacity-40' 
                    : 'bg-accent-red bg-opacity-70 border border-accent-red border-opacity-40';
                }

                return (
                  <div key={idx} className="flex items-center text-xs font-mono relative">
                    {/* Label */}
                    <div className="w-[30%] text-text-primary pr-4 flex flex-col">
                      <span className="font-semibold text-[13px]">{step.label}</span>
                      {step.subText && <span className="text-[10px] text-text-secondary">{step.subText}</span>}
                    </div>

                    {/* Bar container */}
                    <div className="flex-1 h-9 flex items-center relative">
                      <div 
                        className={`h-6 rounded-sm flex items-center px-2 transition-all duration-300 ${barColor}`}
                        style={{ 
                          marginLeft: `${left}%`, 
                          width: `${width}%`,
                          minWidth: step.type !== 'neutral' && step.type !== 'final' ? '8px' : 'auto'
                        }}
                      >
                        {width > 8 && (
                          <span className={`text-[10px] font-bold ${step.type === 'positive' ? 'text-dark-bg' : 'text-text-primary'}`}>
                            {step.type === 'positive' ? `+${step.displayVal}` : step.displayVal}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-dark-border pt-4 mt-6 flex justify-between text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Info size={14} className="text-accent-lime" />
              Base reservoir model calibrated dynamically against 30D decline curve.
            </span>
          </div>
        </div>

        {/* Right Sidebar Widgets */}
        <div className="space-y-6">
          
          {/* Confidence Indicator Card */}
          <div className="bg-dark-surface border border-dark-border rounded p-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-text-secondary font-mono tracking-widest uppercase block">
                  Explainability Confidence
                </span>
                <span className="text-4xl font-bold font-mono text-text-primary block mt-2">
                  94.8<span className="text-xl text-accent-lime">%</span>
                </span>
              </div>
              <CheckCircle2 className="text-accent-lime" size={24} />
            </div>
            <div className="flex items-center gap-2 mt-4 text-[10px] font-mono text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green"></span>
              <span>MODEL SYNCED 2S AGO</span>
            </div>
          </div>

          {/* What-If Simulation Card */}
          <div className="bg-dark-surface border border-dark-border rounded p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-dark-border pb-3">
              <div className="flex items-center gap-1.5">
                <Cpu size={16} className="text-accent-amber" />
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  What-If Simulator
                </h3>
              </div>
              <button 
                onClick={handleReset} 
                className="text-[10px] text-text-secondary hover:text-accent-amber font-mono flex items-center gap-1 uppercase transition"
              >
                <RotateCcw size={10} />
                <span>Reset</span>
              </button>
            </div>

            {/* Parameter Sliders */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-text-secondary">PUMP PRESSURE DELTA</span>
                  <span className="text-accent-amber font-bold">{pressureDelta >= 0 ? `+${pressureDelta}` : pressureDelta}%</span>
                </div>
                <input 
                  type="range" 
                  min="-50" 
                  max="50" 
                  value={pressureDelta}
                  onChange={(e) => setPressureDelta(parseInt(e.target.value))}
                  className="w-full h-1 bg-dark-border rounded-lg appearance-none cursor-pointer accent-accent-amber"
                />
                <div className="flex justify-between text-[9px] text-text-secondary font-mono">
                  <span>-50%</span>
                  <span>0%</span>
                  <span>+50%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-text-secondary">CHOKE SIZE ADJUSTMENT</span>
                  <span className="text-accent-lime font-bold">{chokeDelta >= 0 ? `+${chokeDelta}` : chokeDelta}%</span>
                </div>
                <input 
                  type="range" 
                  min="-50" 
                  max="50" 
                  value={chokeDelta}
                  onChange={(e) => setChokeDelta(parseInt(e.target.value))}
                  className="w-full h-1 bg-dark-border rounded-lg appearance-none cursor-pointer accent-accent-lime"
                />
                <div className="flex justify-between text-[9px] text-text-secondary font-mono">
                  <span>-50%</span>
                  <span>0%</span>
                  <span>+50%</span>
                </div>
              </div>
            </div>

            {/* Results Display */}
            <div className="bg-dark-elevated border border-dark-border rounded p-3 text-center space-y-1">
              <span className="text-[10px] text-text-secondary uppercase font-mono">SIMULATED PRODUCTION</span>
              <div className="text-2xl font-bold font-mono text-text-primary">
                {isSimulating ? 'SIMULATING...' : `${simResults.newYield.toLocaleString()} BBL/D`}
              </div>
              <div className={`text-xs font-mono font-semibold ${simResults.yieldDelta >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {simResults.yieldDelta >= 0 ? '↗' : '↘'} {simResults.yieldDelta >= 0 ? '+' : ''}{((simResults.yieldDelta / 13000) * 100).toFixed(1)}% over baseline
              </div>
            </div>

            <button 
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full bg-accent-amber hover:bg-opacity-95 text-dark-bg text-xs font-bold uppercase tracking-wider py-2.5 rounded transition flex items-center justify-center gap-2"
            >
              <Play size={12} fill="currentColor" />
              <span>{isSimulating ? 'CALCULATING HYDRAULICS...' : 'RUN SIMULATION'}</span>
            </button>
          </div>

          {/* Decline Trend Widget */}
          <div className="bg-dark-surface border border-dark-border rounded p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Reservoir Decline Trend
              </span>
              <span className="text-[10px] font-mono text-accent-red bg-accent-red bg-opacity-10 px-1.5 py-0.5 rounded">
                -2.4% / wk
              </span>
            </div>
            
            {/* Mini Sparkline Chart */}
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={declineData}>
                  <defs>
                    <linearGradient id="declineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF3B3B" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#FF3B3B" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1D1F', borderColor: '#2A2D30' }}
                    labelStyle={{ color: '#F3EFE4' }}
                    itemStyle={{ color: '#FF3B3B' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#FF3B3B" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#declineGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <span className="text-[10px] text-text-secondary font-mono block text-center uppercase tracking-widest">
              30-Day Moving Average
            </span>
          </div>

        </div>
      </div>

      {/* Feature Attribution Detail List (Bottom) */}
      <div className="bg-dark-surface border border-dark-border rounded p-6">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
          Feature Attribution Detail (Real-Time Weights)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockSHAPData.map((item, idx) => (
            <div key={idx} className="p-4 bg-dark-elevated border border-dark-border rounded flex flex-col justify-between space-y-2">
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold text-sm text-text-primary">{item.feature}</span>
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0 ${
                  item.impactType === 'positive' 
                    ? 'bg-accent-amber bg-opacity-10 text-accent-amber border border-accent-amber border-opacity-35' 
                    : 'bg-accent-red bg-opacity-10 text-accent-red border border-accent-red border-opacity-35'
                }`}>
                  {item.impactType === 'positive' ? '+' : ''}{item.value} BBL/D
                </span>
              </div>
              <p className="text-xs text-text-secondary">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
