import React, { useState, useMemo } from 'react';
import { mockRecoveryScenarios, mockRecoveryTimeseries } from '../data/mockData';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { TrendingUp, Calendar, Shield, DollarSign, Sliders } from 'lucide-react';
import { ProvenanceBadge } from '../components/ProvenanceBadge';

type ScenarioKey = '10' | '20' | '30' | 'custom';

export const RecoveryWhatIf: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>('30');
  const [customPct, setCustomPct] = useState<number>(25); // default custom 25%

  // Compute stats dynamically based on selected scenario
  const computedStats = useMemo(() => {
    if (selectedScenario !== 'custom') {
      const stats = mockRecoveryScenarios[selectedScenario as '10' | '20' | '30'];
      return {
        pct: parseInt(selectedScenario),
        label: stats.label,
        volume: stats.yieldVol,
        value: stats.financialValue,
        time: stats.timeToRecover,
        health: stats.portfolioHealthImpact
      };
    } else {
      // Linear scaling for custom inputs
      // +30% is 1.24 MMBL, 62M value, 28 days, 4.8% health
      const ratio = customPct / 30;
      return {
        pct: customPct,
        label: `+${customPct}% Custom Recovery`,
        volume: parseFloat((1.24 * ratio).toFixed(2)),
        value: parseFloat((62.0 * ratio).toFixed(1)),
        time: Math.round(28 * ratio),
        health: parseFloat((4.8 * ratio).toFixed(1))
      };
    }
  }, [selectedScenario, customPct]);

  // Construct chart dataset dynamically
  const chartData = useMemo(() => {
    return mockRecoveryTimeseries.map(point => {
      let recoveryVal: number | null = null;
      
      if (point.month === 'Sep (Int)' || point.actual === null) {
        // We project starting from Sep (Int)
        // Sep (Int) baseline is 11,300, Expected is 12,800.
        // Difference is 1,500. Recovery % captures part of this gap.
        // Compute projection curve
        const idx = mockRecoveryTimeseries.findIndex(p => p.month === point.month);
        const sepIntIdx = 8;
        const steps = idx - sepIntIdx;
        
        // Smoothly grow back to expected line + premium multiplier
        const expectedForMonth = point.expected;
        const baseLevel = 11300 + (steps * 500); 
        recoveryVal = Math.min(expectedForMonth + (computedStats.pct * 10), baseLevel);
        
        // Cap or smooth post-intervention line
        if (point.month === 'Sep (Int)') {
          recoveryVal = 11300 + (1500 * (computedStats.pct / 100));
        }
      }

      return {
        ...point,
        projectedRecovery: recoveryVal
      };
    });
  }, [computedStats.pct]);

  return (
    <div className="space-y-6">
      {/* Provenance Banner */}
      <ProvenanceBadge sourceType="DERIVED" context="banner" disclaimer="Estimated Recovery Opportunity \u2014 not guaranteed" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent-amber text-xs font-mono mb-1">
            <TrendingUp size={14} />
            <span>FINANCIAL & VOLUMETRIC SCENARIO PLANNING</span>
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-text-primary">
            Recovery Scenario Canvas
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Evaluate expected recovery volumes, timeframes, and asset yields across custom planning horizons.
          </p>
        </div>
      </div>

      {/* Scenario Selector Tabs */}
      <div className="bg-dark-surface border border-dark-border rounded p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {(['10', '20', '30', 'custom'] as ScenarioKey[]).map((scenario) => (
            <button
              key={scenario}
              onClick={() => setSelectedScenario(scenario)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition font-mono ${
                selectedScenario === scenario
                  ? 'bg-accent-amber text-dark-bg'
                  : 'bg-dark-bg border border-dark-border text-text-secondary hover:text-text-primary hover:bg-dark-elevated'
              }`}
            >
              {scenario === 'custom' ? 'Custom Scenario' : `+${scenario}% Recovery`}
            </button>
          ))}
        </div>

        {/* Custom Slider Input */}
        {selectedScenario === 'custom' && (
          <div className="flex items-center gap-4 w-full md:w-80 bg-dark-bg border border-dark-border px-4 py-2 rounded">
            <Sliders size={16} className="text-accent-amber" />
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-text-secondary uppercase">Custom Recovery</span>
                <span className="text-accent-amber font-bold">{customPct}%</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="50" 
                value={customPct}
                onChange={(e) => setCustomPct(parseInt(e.target.value))}
                className="w-full h-1 bg-dark-border rounded-lg appearance-none cursor-pointer accent-accent-amber"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Projected Volume */}
        <div className="bg-dark-surface border border-dark-border rounded p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-text-secondary font-mono tracking-wider uppercase">Projected Recovery Volume</span>
            <TrendingUp size={16} className="text-accent-amber" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold font-mono text-text-primary">{computedStats.volume}</span>
            <span className="text-sm font-mono text-text-secondary ml-1">MMBL</span>
          </div>
          <div className="text-[10px] text-text-secondary font-mono uppercase tracking-wider mt-2 border-t border-dark-border pt-2">
            Estimated 12-month net gain
          </div>
        </div>

        {/* Card 2: Estimated Time */}
        <div className="bg-dark-surface border border-dark-border rounded p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-text-secondary font-mono tracking-wider uppercase">Time to Recover Yield</span>
            <Calendar size={16} className="text-accent-lime" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold font-mono text-text-primary">{computedStats.time}</span>
            <span className="text-sm font-mono text-text-secondary ml-1">DAYS</span>
          </div>
          <div className="text-[10px] text-text-secondary font-mono uppercase tracking-wider mt-2 border-t border-dark-border pt-2">
            Stabilization period post-cleanout
          </div>
        </div>

        {/* Card 3: Portfolio Health */}
        <div className="bg-dark-surface border border-dark-border rounded p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-text-secondary font-mono tracking-wider uppercase">Portfolio Health Boost</span>
            <Shield size={16} className="text-accent-green" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold font-mono text-text-primary">+{computedStats.health}</span>
            <span className="text-sm font-mono text-text-secondary ml-1">%</span>
          </div>
          <div className="text-[10px] text-text-secondary font-mono uppercase tracking-wider mt-2 border-t border-dark-border pt-2">
            Asset deviation mitigation impact
          </div>
        </div>

        {/* Card 4: Financial Value */}
        <div className="bg-dark-surface border border-dark-border rounded p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-text-secondary font-mono tracking-wider uppercase">Economic Recovery ROI</span>
            <DollarSign size={16} className="text-accent-green" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold font-mono text-accent-green">${computedStats.value}</span>
            <span className="text-sm font-mono text-text-secondary ml-1">M</span>
          </div>
          <div className="text-[10px] text-text-secondary font-mono uppercase tracking-wider mt-2 border-t border-dark-border pt-2">
            Calculated at oil $50/barrel
          </div>
        </div>
      </div>

      {/* Main comparative chart */}
      <div className="bg-dark-surface border border-dark-border rounded p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary uppercase tracking-wide">
            Actual vs Projected Production Curve
          </h2>
          <p className="text-xs text-text-secondary">
            Comparative layout illustrating post-intervention startup trajectory relative to decline models.
          </p>
        </div>

        {/* Chart Container */}
        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF9000" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#FF9000" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D966" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#00D966" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D30" opacity={0.3} />
              <XAxis dataKey="month" stroke="#B8B3A8" fontSize={11} tickLine={false} />
              <YAxis stroke="#B8B3A8" fontSize={11} tickLine={false} domain={[9000, 14000]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1D1F', borderColor: '#2A2D30' }}
                labelStyle={{ color: '#F3EFE4', fontWeight: 'bold' }}
                itemStyle={{ fontSize: 12 }}
              />
              <Legend verticalAlign="top" height={36} iconSize={10} />
              
              {/* Expected decline curve baseline */}
              <Area 
                type="monotone" 
                name="Expected Baseline (Decline)" 
                dataKey="expected" 
                stroke="#B8B3A8" 
                strokeWidth={1.5} 
                strokeDasharray="4 4"
                fill="transparent" 
              />
              
              {/* Historical actual production */}
              <Area 
                type="monotone" 
                name="Actual Production" 
                dataKey="actual" 
                stroke="#FF9000" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#actualGrad)" 
              />
              
              {/* Projected recovery projection */}
              <Area 
                type="monotone" 
                name={`Projected Recovery (${computedStats.pct}%)`} 
                dataKey="projectedRecovery" 
                stroke="#00D966" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#projectedGrad)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
