import React, { useState } from 'react';
import { mockAIPSBreakdown, mockAssets } from '../data/mockData';
import { 
  DollarSign, 
  Users, 
  Wrench, 
  Printer, 
  CheckCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Flame
} from 'lucide-react';
import { AIPSBreakdown } from '../components/AIPSBreakdown';
import { calculateAIPS } from '../utils/aipsCalculator';
import { ProvenanceBadge } from '../components/ProvenanceBadge';

export const InterventionPriority: React.FC = () => {
  const [printSuccess, setPrintSuccess] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('financial');
  const [investigationRaised, setInvestigationRaised] = useState(false);

  const { assetId, aipsScore, components, financials, bullets } = mockAIPSBreakdown;
  const currentAsset = mockAssets.find(a => a.id === assetId) || mockAssets[0];

  // Corrected AIPS calculation (single source of truth)
  const aipsResult = calculateAIPS({
    asset_id: assetId,
    expected_production: 1.42,
    actual_production: 1.17,
    anomaly_score: 0.94,
    historical_recovery_rate: 0.80,
    intervention_complexity: 0.60,
  });

  const toggleAccordion = (name: string) => {
    setActiveAccordion(activeAccordion === name ? null : name);
  };

  const handlePrint = () => {
    setPrintSuccess(true);
    setTimeout(() => {
      window.print();
      setPrintSuccess(false);
    }, 1500);
  };

  const triggerInvestigation = () => {
    setInvestigationRaised(true);
  };

  // SVG Gauge calculations
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (aipsScore / 100) * circumference;

  return (
    <div className="space-y-6 print:bg-white print:text-black">
      {/* Provenance Banner */}
      <ProvenanceBadge sourceType="DERIVED" context="banner" disclaimer="Decision-support prioritization score \u2014 not an autonomous intervention decision" />

      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-4 gap-4 print:border-black">
        <div>
          <div className="flex items-center gap-2 text-accent-red text-xs font-mono mb-1">
            <Flame size={14} className="animate-pulse" />
            <span>AIPS DECISION SUPPORT BOARD</span>
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-text-primary print:text-black">
            Intervention Priority Center
          </h1>
          <p className="text-sm text-text-secondary mt-1 print:text-gray-600">
            AIPS ranked decision pathways and resource planning for candidate assets
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button 
            onClick={handlePrint}
            aria-label="Export recommendation as PDF"
            className="px-4 py-2 border border-dark-border bg-dark-surface hover:bg-dark-elevated text-text-primary text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-2"
          >
            <Printer size={14} />
            <span>{printSuccess ? 'GENERATING PDF...' : 'Export Recommendation'}</span>
          </button>
        </div>
      </div>

      {/* Main Asset Highlight Card */}
      <div className="bg-gradient-to-br from-dark-elevated to-dark-surface border border-dark-border rounded-lg p-6 md:p-8 print:border-black print:text-black">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          
          {/* Column 1: Asset Identity */}
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-text-secondary font-mono tracking-widest uppercase">Target Candidate</span>
              <h2 className="text-5xl font-extrabold text-text-primary mt-1 font-mono tracking-tight print:text-black">
                {assetId}
              </h2>
              <div className="text-sm font-semibold text-text-secondary mt-1 font-sans">
                {currentAsset.field} Field — {currentAsset.basin}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-accent-red rounded-full shrink-0"></span>
              <span className="text-sm font-bold uppercase tracking-wider text-accent-red">
                ◆ PRIORITY SEVERITY: CRITICAL
              </span>
            </div>

            <div className="text-xs text-text-secondary leading-relaxed bg-dark-bg bg-opacity-50 p-3 rounded border border-dark-border border-opacity-40 font-sans print:border-gray-300">
              This asset registers high cumulative production loss combined with high recovery potential, triggering a priority rank of #1 across the regional asset matrix.
            </div>
          </div>

          {/* Column 2: AIPS Circle Gauge */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-40 h-40">
              {/* SVG circular track */}
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="80" 
                  cy="80" 
                  r={radius} 
                  stroke="#2A2D30" 
                  strokeWidth={strokeWidth} 
                  fill="transparent" 
                />
                <circle 
                  cx="80" 
                  cy="80" 
                  r={radius} 
                  stroke="#FF3B3B" 
                  strokeWidth={strokeWidth} 
                  fill="transparent" 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner score label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-mono text-text-secondary uppercase">AIPS Score</span>
                <span className="text-4xl font-extrabold text-accent-red font-mono leading-none mt-1">
                  {aipsScore}
                </span>
                <span className="text-[10px] text-text-secondary font-mono mt-1">/ 100</span>
              </div>
            </div>
          </div>

          {/* Column 3: Components Contribution List */}
          <div className="grid grid-cols-2 gap-3">
            {components.map((item, idx) => (
              <div key={idx} className="p-3 bg-dark-bg border border-dark-border rounded print:border-gray-300">
                <div className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">{item.name}</div>
                <div className="text-sm font-bold text-text-primary mt-1 font-mono">{item.value}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-text-secondary font-mono">Contr: +{item.contribution}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: item.color }}>
                    {item.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Corrected AIPS Breakdown (formula, components, confidence) */}
      <AIPSBreakdown
        aips_score={aipsResult.aips_score}
        priority={aipsResult.priority}
        loss_magnitude={aipsResult.loss_magnitude}
        anomaly_severity={aipsResult.anomaly_severity}
        recovery_opportunity={aipsResult.recovery_opportunity}
        intervention_complexity={aipsResult.intervention_complexity}
        confidence={aipsResult.confidence}
      />

      {/* Detailed analysis grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Why this Asset Ranks High */}
        <div className="lg:col-span-2 bg-dark-surface border border-dark-border rounded p-6 space-y-4">
          <h3 className="text-base font-bold text-text-primary uppercase tracking-wide">
            Why Prioritize {assetId}?
          </h3>
          <ul className="space-y-3">
            {bullets.map((bullet, idx) => (
              <li key={idx} className="flex gap-3 text-xs leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-accent-red bg-opacity-10 border border-accent-red border-opacity-35 text-accent-red font-bold flex items-center justify-center shrink-0 mt-0.5">
                  !
                </span>
                <span className="text-text-primary">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Primary Action Panel */}
        <div className="bg-dark-surface border border-dark-border rounded p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">
              Recommended Intervention Action
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Based on decision support indices, immediately trigger field diagnostics to clear possible sand blockages.
            </p>
          </div>

          <div className="space-y-3">
            {investigationRaised ? (
              <div className="p-3 bg-accent-green bg-opacity-10 border border-accent-green border-opacity-35 rounded text-accent-green text-center text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle size={16} />
                <span>INVESTIGATION REQUEST TRANSMITTED</span>
              </div>
            ) : (
              <button 
                onClick={triggerInvestigation}
                aria-label="Prioritize asset for investigation"
                className="w-full bg-accent-red hover:bg-opacity-95 text-white text-xs font-bold uppercase tracking-wider py-3 rounded transition font-mono flex items-center justify-center gap-2 shadow-lg shadow-accent-red shadow-opacity-10"
              >
                <span>▶ PRIORITIZE FOR INVESTIGATION</span>
              </button>
            )}

            <div className="text-[10px] text-text-secondary text-center font-mono uppercase">
              Assigned: Field Operations Crew #2B
            </div>
          </div>
        </div>

      </div>

      {/* Accordion Sections: Risk Factors, Resource Allocation & ROI */}
      <div className="bg-dark-surface border border-dark-border rounded">
        
        {/* Financial Accordion Header */}
        <div 
          onClick={() => toggleAccordion('financial')}
          role="button"
          aria-expanded={activeAccordion === 'financial'}
          aria-controls="financial-accordion-panel"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAccordion('financial'); } }}
          className="p-4 border-b border-dark-border flex justify-between items-center cursor-pointer hover:bg-dark-elevated transition select-none"
        >
          <div className="flex items-center gap-2.5">
            <DollarSign size={16} className="text-accent-green" />
            <span className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Financial Breakdown & Expected Recovery ROI
            </span>
          </div>
          {activeAccordion === 'financial' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        
        {/* Financial Accordion Content */}
        {activeAccordion === 'financial' && (
          <div id="financial-accordion-panel" className="p-6 bg-dark-bg bg-opacity-50 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-dark-elevated border border-dark-border rounded">
                <span className="text-[9px] text-text-secondary font-mono uppercase">Estimated Cost</span>
                <div className="text-2xl font-bold font-mono text-text-primary mt-1">
                  ${(financials.interventionCost / 1000000).toFixed(1)}M
                </div>
                <span className="text-[10px] text-text-secondary block mt-1 font-sans">Parts, boat hire, & logistics</span>
              </div>
              <div className="p-4 bg-dark-elevated border border-dark-border rounded">
                <span className="text-[9px] text-text-secondary font-mono uppercase">Expected Recovery Yield</span>
                <div className="text-2xl font-bold font-mono text-accent-green mt-1">
                  ${(financials.expectedYield / 1000000).toFixed(1)}M
                </div>
                <span className="text-[10px] text-text-secondary block mt-1 font-sans">Based on $50/barrel benchmark</span>
              </div>
              <div className="p-4 bg-dark-elevated border border-dark-border rounded">
                <span className="text-[9px] text-text-secondary font-mono uppercase">ROI Multiplier</span>
                <div className="text-2xl font-bold font-mono text-accent-lime mt-1">
                  {financials.roiMultiplier}x
                </div>
                <span className="text-[10px] text-text-secondary block mt-1 font-sans">Breakeven expected in 3 weeks</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <h4 className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench size={14} className="text-accent-amber" />
                  Required Equipment Allocation
                </h4>
                <ul className="space-y-1.5 pl-5 list-disc text-text-secondary">
                  {financials.equipment.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-accent-lime" />
                  Resource & Manpower Details
                </h4>
                <div className="space-y-1 font-mono">
                  <div className="flex justify-between border-b border-dark-border pb-1">
                    <span className="text-text-secondary">Personnel needed:</span>
                    <span className="text-text-primary">{financials.personnelRequired} Technicians</span>
                  </div>
                  <div className="flex justify-between border-b border-dark-border pb-1">
                    <span className="text-text-secondary">Estimated Duration:</span>
                    <span className="text-text-primary">{financials.durationDays} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Permits Status:</span>
                    <span className="text-accent-green">APPROVED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Similar past cases */}
        <div 
          onClick={() => toggleAccordion('cases')}
          role="button"
          aria-expanded={activeAccordion === 'cases'}
          aria-controls="cases-accordion-panel"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAccordion('cases'); } }}
          className="p-4 border-t border-dark-border flex justify-between items-center cursor-pointer hover:bg-dark-elevated transition select-none"
        >
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet size={16} className="text-accent-amber" />
            <span className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Similar Past Interventions (Reference Records)
            </span>
          </div>
          {activeAccordion === 'cases' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>

        {activeAccordion === 'cases' && (
          <div id="cases-accordion-panel" className="p-6 bg-dark-bg bg-opacity-50 text-xs font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-dark-elevated border border-dark-border rounded">
                <div className="text-[10px] text-text-secondary uppercase">AS-09 (2025)</div>
                <div className="text-base font-bold mt-1 text-accent-green">+0.92 MMBL RECOVERED</div>
                <div className="text-[10px] text-text-secondary mt-1">Silt washout project</div>
              </div>
              <div className="p-4 bg-dark-elevated border border-dark-border rounded">
                <div className="text-[10px] text-text-secondary uppercase">CB-08 (2025)</div>
                <div className="text-base font-bold mt-1 text-accent-green">+1.15 MMBL RECOVERED</div>
                <div className="text-[10px] text-text-secondary mt-1">Lift gas pressure calibration</div>
              </div>
              <div className="p-4 bg-dark-elevated border border-dark-border rounded">
                <div className="text-[10px] text-text-secondary uppercase">MH-04 (2024)</div>
                <div className="text-base font-bold mt-1 text-accent-green">+0.67 MMBL RECOVERED</div>
                <div className="text-[10px] text-text-secondary mt-1">Subsurface valve replacement</div>
              </div>
            </div>
            <div className="mt-4 text-center text-text-secondary text-[11px] font-sans">
              Average recovery on similar failures is <span className="text-accent-green font-bold">0.91 MMBL</span> (MH-07 predicted potential: 1.24 MMBL).
            </div>
          </div>
        )}
      </div>

      {/* Bottom roadmap timeline steps */}
      <div className="bg-dark-surface border border-dark-border rounded p-6">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
          Operational Roadmap / Next Steps
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-center">
          <div className="p-3 bg-dark-elevated border border-dark-border rounded flex flex-col justify-between">
            <div className="text-[10px] text-text-secondary font-mono">STEP 1</div>
            <div className="text-xs font-bold text-text-primary mt-2">Field Crew Dispatch</div>
            <div className="text-[10px] text-accent-green mt-1">SCHEDULED</div>
          </div>
          <div className="p-3 bg-dark-elevated border border-dark-border rounded flex flex-col justify-between">
            <div className="text-[10px] text-text-secondary font-mono">STEP 2</div>
            <div className="text-xs font-bold text-text-primary mt-2">Site Diagnostic</div>
            <div className="text-[10px] text-text-secondary mt-1">PENDING DISPATCH</div>
          </div>
          <div className="p-3 bg-dark-elevated border border-dark-border rounded flex flex-col justify-between">
            <div className="text-[10px] text-text-secondary font-mono">STEP 3</div>
            <div className="text-xs font-bold text-text-primary mt-2">Safety Isolations</div>
            <div className="text-[10px] text-text-secondary mt-1">AWAITING DIAGNOSTICS</div>
          </div>
          <div className="p-3 bg-dark-elevated border border-dark-border rounded flex flex-col justify-between">
            <div className="text-[10px] text-text-secondary font-mono">STEP 4</div>
            <div className="text-xs font-bold text-text-primary mt-2">Choke Valve Swap</div>
            <div className="text-[10px] text-text-secondary mt-1">PARTS ALLOCATED</div>
          </div>
          <div className="p-3 bg-dark-elevated border border-dark-border rounded flex flex-col justify-between">
            <div className="text-[10px] text-text-secondary font-mono">STEP 5</div>
            <div className="text-xs font-bold text-text-primary mt-2">Post-Intervention Review</div>
            <div className="text-[10px] text-text-secondary mt-1">1 WEEK WINDOW</div>
          </div>
        </div>
      </div>
    </div>
  );
};
