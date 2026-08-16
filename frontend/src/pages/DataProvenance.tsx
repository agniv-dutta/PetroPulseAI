import React from 'react';
import { mockProvenanceSources } from '../data/mockData';
import { 
  Database, 
  ExternalLink, 
  RefreshCw, 
  ShieldAlert,
  Server
} from 'lucide-react';

export const DataProvenance: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent-lime text-xs font-mono mb-1">
            <Database size={14} />
            <span>TRANSPARENCY & DATA ACCREDITATION LAYER</span>
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-text-primary">
            Data Provenance Catalog
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Origin records, mathematical derivation pathways, and audit logs for databases seeding the PetroPulse ML models.
          </p>
        </div>
      </div>

      {/* Global Data Health KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-dark-surface border border-dark-border rounded">
          <span className="text-[10px] text-text-secondary font-mono tracking-wider uppercase block">Global Data Integrity</span>
          <div className="text-2xl font-bold font-mono text-accent-green mt-1">
            98.4<span className="text-xs text-text-secondary">%</span>
          </div>
          <span className="text-[10px] text-text-secondary font-mono mt-1 block uppercase">Calculated across 14,200 checkpoints</span>
        </div>

        <div className="p-4 bg-dark-surface border border-dark-border rounded">
          <span className="text-[10px] text-text-secondary font-mono tracking-wider uppercase block">Sensor Ingestion Latency</span>
          <div className="text-2xl font-bold font-mono text-accent-lime mt-1">
            4.2<span className="text-xs text-text-secondary"> ms</span>
          </div>
          <span className="text-[10px] text-text-secondary font-mono mt-1 block uppercase">OPC-UA client to inference engine</span>
        </div>

        <div className="p-4 bg-dark-surface border border-dark-border rounded">
          <span className="text-[10px] text-text-secondary font-mono tracking-wider uppercase block">Data Validation Checks</span>
          <div className="text-2xl font-bold font-mono text-text-primary mt-1">
            100%
          </div>
          <span className="text-[10px] text-accent-green font-mono mt-1 block uppercase">● 24 validation schema passes</span>
        </div>
      </div>

      {/* Seed Directories List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
          Seed Databases & Live Feeds
        </h3>

        <div className="space-y-4">
          {mockProvenanceSources.map((source, idx) => (
            <div key={idx} className="bg-dark-surface border border-dark-border rounded-lg p-5 flex flex-col md:flex-row justify-between gap-6 hover:border-accent-amber transition duration-200">
              
              {/* Left Column: Title & Description */}
              <div className="md:w-3/5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-bold text-text-primary uppercase tracking-wide">{source.name}</h4>
                  
                  {/* Category Badges */}
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono uppercase ${
                    source.category === 'REAL' 
                      ? 'bg-accent-green bg-opacity-10 text-accent-green border border-accent-green border-opacity-35' 
                      : source.category === 'DERIVED'
                      ? 'bg-accent-amber bg-opacity-10 text-accent-amber border border-accent-amber border-opacity-35'
                      : 'bg-accent-lime bg-opacity-10 text-accent-lime border border-accent-lime border-opacity-35'
                  }`}>
                    {source.category === 'REAL' ? 'Real Data Source' : source.category === 'DERIVED' ? 'Derived Feature' : 'Synthetic Stream'}
                  </span>
                </div>
                
                <p className="text-xs text-text-secondary leading-relaxed">{source.description}</p>
                <div className="text-[10px] text-text-secondary font-mono">{source.notes}</div>
              </div>

              {/* Right Column: Freshness & Integrity Score */}
              <div className="md:w-2/5 flex flex-col justify-between gap-4 md:border-l md:border-dark-border md:pl-6">
                
                {/* Link or tag */}
                <div className="flex justify-between items-start text-xs font-mono">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-text-secondary uppercase">Update Frequency</span>
                    <div className="text-text-primary font-semibold flex items-center gap-1">
                      <RefreshCw size={12} className="text-accent-amber" />
                      <span>{source.freshness}</span>
                    </div>
                  </div>

                  {source.url.startsWith('http') ? (
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-accent-amber hover:underline flex items-center gap-1 text-[11px] font-bold"
                    >
                      <span>GO TO SOURCE</span>
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-text-secondary uppercase tracking-widest text-[9px] font-bold">
                      {source.url}
                    </span>
                  )}
                </div>

                {/* Integrity meter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-text-secondary">
                    <span>DATA INTEGRITY SCORE</span>
                    <span className="text-accent-green font-bold">{source.integrityScore}%</span>
                  </div>
                  {/* Gauge bar */}
                  <div className="w-full bg-dark-bg h-1.5 rounded-full overflow-hidden border border-dark-border">
                    <div 
                      className="h-full bg-accent-green" 
                      style={{ width: `${source.integrityScore}%` }}
                    ></div>
                  </div>
                </div>

              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Future Integration Section */}
      <div className="bg-dark-surface border border-dark-border rounded p-6 space-y-4">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
          <Server size={16} className="text-accent-amber" />
          Enterprise Pipeline Integration Schema
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          PetroPulse AI is designed well-agnostic. In enterprise production environments, the synthetic stream layer is swapped for physical SCADA system loops and telemetry grids using standard OPC-UA and REST API endpoints.
        </p>

        {/* Technical architecture mock diagram */}
        <div className="p-4 bg-dark-bg border border-dark-border rounded text-xs font-mono text-text-secondary space-y-2">
          <div className="text-accent-lime font-bold uppercase tracking-wider mb-2">Target Data Ingest Specification:</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-text-primary">1. SCADA loop / Wellhead sensors</div>
              <div className="text-[10px] leading-relaxed">Continuous OPC-UA broadcast transmitting casing/tubing pressures, choke settings, and downhole fluid temps.</div>
            </div>
            <div className="space-y-1">
              <div className="text-text-primary">2. Kafka Message Queue</div>
              <div className="text-[10px] leading-relaxed">Buffers high-frequency telemetries at 10-second offsets, carrying checksum validation stamps to the ingestion store.</div>
            </div>
            <div className="space-y-1">
              <div className="text-text-primary">3. MLOps Sync Engine</div>
              <div className="text-[10px] leading-relaxed">Reads logs hourly, triggering automatic retraining in PyTorch/XGBoost if model drift MAPE exceeds 5.0%.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Disclaimers */}
      <div className="bg-dark-surface border border-dark-border rounded p-5 flex items-start gap-3">
        <ShieldAlert size={18} className="text-accent-amber shrink-0 mt-0.5" />
        <div className="text-xs text-text-secondary leading-relaxed">
          <span className="font-bold text-text-primary uppercase">Attribution & Disclaimer:</span> Historical production datasets are extracted from official GOI platforms (OGD, PPAC, DGH) and ONGC public records. Datapoints utilized in simulation streaming and what-if calculations are statistically fitted synthetic observations meant for demo/prototype evaluations only. No proprietary reservoir grids are accessed.
        </div>
      </div>
    </div>
  );
};
