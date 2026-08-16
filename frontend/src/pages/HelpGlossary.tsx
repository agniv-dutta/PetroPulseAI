import React, { useState } from 'react';
import { mockGlossary } from '../data/mockData';
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  Navigation, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp,
  Cpu
} from 'lucide-react';

export const HelpGlossary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const filteredGlossary = mockGlossary.filter(item => 
    item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const faqs = [
    {
      q: "What is the Asset Intervention Priority Score (AIPS)?",
      a: "AIPS is a proprietary prioritization index developed for PetroPulse AI to guide operational teams. It calculates score ranges based on: (1) production loss magnitude, (2) Isolation Forest anomaly severity, (3) projected recovery volume, and (4) historical complexity. This shifts field planning from volume-only targets to recovery-ROI targets."
    },
    {
      q: "How does the system distinguish natural decline from operational failures?",
      a: "The Forecasting Engine learns historical decline curve coefficients. This fits an expected production baseline representing natural reservoir depletion. The Anomaly Detector runs Isolation Forest models in real-time on incoming SCADA sensors. When actual yield drops below expected thresholds, SHAP explainability attribution calculates features (e.g. pressure drops) causing the deviation."
    },
    {
      q: "How does the real-time simulation work during the demo?",
      a: "To demonstrate live stream logic without active SCADA integrations, we fit probability distributions to OGD/PPAC oil datasets. The PetroPulse Simulation Center streams these observations at 10-second offsets. Using Scenario Injection, you can programmatically inject failure vectors (choke valves clogging, slug flow) and watch anomaly alerts trigger in real-time."
    },
    {
      q: "Can the platform scale to thousands of wells?",
      a: "Yes. The backend ingestion layer (FastAPI, PostgreSQL, TimescaleDB) compiles time-series packages asynchronously. The ML model architecture is designed well-agnostic, meaning once OPC-UA or REST SCADA node endpoints are mapped, models run isolated inferences per asset or basin."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent-lime text-xs font-mono mb-1">
            <HelpCircle size={14} />
            <span>OPERATIONAL KNOWLEDGE BASE & GLOSSARY</span>
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-text-primary">
            Help & Domain Glossary
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Petroleum terminologies glossary, interactive FAQ accordions, and judge walkthrough flows.
          </p>
        </div>
      </div>

      {/* 5-Minute Golden Demo Flow walkthrough */}
      <div className="bg-dark-surface border border-dark-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
          <Navigation size={18} className="text-accent-amber" />
          5-Minute "Golden Demo Flow" Walkthrough
        </h2>
        <p className="text-xs text-text-secondary leading-relaxed">
          Follow this structured pipeline during pitch reviews to demonstrate how PetroPulse AI bridges the gap between raw data streams and prioritizing resource scheduling.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
          <div className="p-4 bg-dark-bg border border-dark-border rounded space-y-2">
            <div className="w-6 h-6 rounded-full bg-accent-amber bg-opacity-10 text-accent-amber font-mono font-bold text-xs flex items-center justify-center border border-accent-amber border-opacity-35">
              1
            </div>
            <div className="font-bold text-xs text-text-primary uppercase">Command Center</div>
            <p className="text-[10px] text-text-secondary leading-relaxed">Open Dashboard, point out total assets (142) and portfolio recovery potential.</p>
          </div>

          <div className="p-4 bg-dark-bg border border-dark-border rounded space-y-2">
            <div className="w-6 h-6 rounded-full bg-accent-amber bg-opacity-10 text-accent-amber font-mono font-bold text-xs flex items-center justify-center border border-accent-amber border-opacity-35">
              2
            </div>
            <div className="font-bold text-xs text-text-primary uppercase">Trace Forecast</div>
            <p className="text-[10px] text-text-secondary leading-relaxed">Go to Asset Leaderboard, click MH-07, and inspect deviation attribution charts.</p>
          </div>

          <div className="p-4 bg-dark-bg border border-dark-border rounded space-y-2">
            <div className="w-6 h-6 rounded-full bg-accent-amber bg-opacity-10 text-accent-amber font-mono font-bold text-xs flex items-center justify-center border border-accent-amber border-opacity-35">
              3
            </div>
            <div className="font-bold text-xs text-text-primary uppercase">Explain root-cause</div>
            <p className="text-[10px] text-text-secondary leading-relaxed">Open Root Cause, slide What-If pressure sliders to show simulated yield changes.</p>
          </div>

          <div className="p-4 bg-dark-bg border border-dark-border rounded space-y-2">
            <div className="w-6 h-6 rounded-full bg-accent-amber bg-opacity-10 text-accent-amber font-mono font-bold text-xs flex items-center justify-center border border-accent-amber border-opacity-35">
              4
            </div>
            <div className="font-bold text-xs text-text-primary uppercase">AIPS Decision</div>
            <p className="text-[10px] text-text-secondary leading-relaxed">Review AIPS score breakdowns, expected cost ROI, and dispatch work orders.</p>
          </div>

          <div className="p-4 bg-dark-bg border border-dark-border rounded space-y-2">
            <div className="w-6 h-6 rounded-full bg-accent-amber bg-opacity-10 text-accent-amber font-mono font-bold text-xs flex items-center justify-center border border-accent-amber border-opacity-35">
              5
            </div>
            <div className="font-bold text-xs text-text-primary uppercase">Inject Anomaly</div>
            <p className="text-[10px] text-text-secondary leading-relaxed">Inject Valve Failure in Scenario Harness. Play Simulation to watch live critical alerts trigger.</p>
          </div>
        </div>
      </div>

      {/* Grid: Searchable Glossary & FAQ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Searchable Domain Glossary */}
        <div className="bg-dark-surface border border-dark-border rounded p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
                <BookOpen size={16} className="text-accent-amber" />
                Domain Glossary
              </h2>
              <span className="text-[10px] font-mono text-text-secondary">{filteredGlossary.length} TERMS FOUND</span>
            </div>

            {/* Glossary Search input */}
            <div className="flex items-center gap-2 bg-dark-bg border border-dark-border px-3 py-2 rounded focus-within:border-accent-amber transition">
              <Search size={14} className="text-text-secondary" />
              <input
                type="text"
                placeholder="Search petroleum or machine learning terms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs text-text-primary placeholder-text-secondary outline-none w-full font-sans"
              />
            </div>
          </div>

          {/* List of filtered glossary items */}
          <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 pr-2 scrollbar-thin">
            {filteredGlossary.length === 0 ? (
              <div className="text-center py-8 text-xs text-text-secondary">No terms match search parameters.</div>
            ) : (
              filteredGlossary.map((item, idx) => (
                <div key={idx} className="p-3 bg-dark-bg border border-dark-border rounded space-y-1.5 hover:border-dark-border hover:border-opacity-100 transition">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary font-mono">{item.term}</span>
                    <span className="text-[9px] text-text-secondary uppercase font-mono tracking-wider">{item.domain}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{item.definition}</p>
                  <div className="text-[10px] font-mono text-accent-lime uppercase tracking-wider pt-1 border-t border-dark-border border-opacity-30">
                    {item.impactContext}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Judges FAQ Accordion */}
        <div className="bg-dark-surface border border-dark-border rounded p-6 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary uppercase tracking-wide flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-accent-amber" />
              Judges FAQ Accordion
            </h2>

            <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2 scrollbar-thin">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div key={idx} className="border border-dark-border rounded overflow-hidden">
                    <div
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="p-4 bg-dark-bg flex justify-between items-center cursor-pointer hover:bg-dark-elevated transition select-none text-xs font-bold text-text-primary"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp size={14} className="text-accent-amber" /> : <ChevronDown size={14} className="text-text-secondary" />}
                    </div>
                    {isOpen && (
                      <div className="p-4 bg-dark-surface border-t border-dark-border text-xs text-text-secondary leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Quick Tips support banner */}
      <div className="bg-dark-surface border border-dark-border rounded p-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Cpu size={18} className="text-accent-lime shrink-0" />
          <div className="text-xs text-text-secondary">
            <span className="font-bold text-text-primary uppercase block">Administrative Node Support</span>
            Need assistance mapping SCADA wellheads or loading local logs? Access terminal instructions via API access.
          </div>
        </div>
        <button className="px-4 py-2 border border-dark-border hover:bg-dark-elevated text-xs font-bold uppercase tracking-wider rounded font-mono transition">
          Contact Field Support
        </button>
      </div>
    </div>
  );
};
