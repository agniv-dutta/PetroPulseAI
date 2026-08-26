import React, { useMemo } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  Gauge,
  Activity,
  Wrench,
  Brain,
  Search,
  ArrowRight,
  ShieldCheck,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from 'lucide-react';
import { TelemetryBar, StatusPill } from './ui/Industrial';

// ─── Types ───────────────────────────────────────────────────────
interface DecisionPanelProps {
  assetId: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  deviationPct: number;
  anomalyScore: number;
  aipsBreakdown: {
    loss_magnitude_pct: number;
    anomaly_severity: number;
    recovery_opportunity_pct: number;
    intervention_complexity: number;
  };
  recovery: {
    estimated_recovery_mmbbl: number;
    estimated_value_usd_m: number;
    combined_confidence: number;
  };
  contributions: Array<{
    feature: string;
    label: string;
    shap_value: number;
    direction: 'UPWARD' | 'DOWNWARD';
    relative_contribution_pct: number;
  }>;
  recommendations: Array<{
    code: string;
    action: string;
    rationale: string;
    priority: string;
  }>;
  anomalyWindows?: Array<{
    period: string;
    severity: string;
    contributing_features: Array<{ label: string; importance: number }>;
  }>;
}

// ─── Verification suggestion engine ──────────────────────────────
function buildVerificationList(
  deviationPct: number,
  anomalyScore: number,
  contributions: DecisionPanelProps['contributions'],
  anomalyWindows: DecisionPanelProps['anomalyWindows'],
): string[] {
  const items: string[] = [];
  const topFeature = contributions[0]?.feature ?? '';

  // Always suggest measurement verification for any deviation
  if (Math.abs(deviationPct) > 5) {
    items.push('Verify production measurement accuracy and meter calibration');
  }

  // Feature-specific verification
  if (topFeature.includes('pressure') || topFeature.includes('lag')) {
    items.push('Check wellhead pressure transducer and sensor drift');
  }
  if (topFeature.includes('flow') || topFeature.includes('roll')) {
    items.push('Verify flow meter readings and multiphase metering');
  }
  if (topFeature.includes('temperature') || topFeature.includes('meta')) {
    items.push('Inspect process temperature instrumentation');
  }
  if (topFeature.includes('decline') || topFeature.includes('arps')) {
    items.push('Review reservoir pressure data and decline curve fit');
  }

  // Anomaly severity-based
  if (anomalyScore >= 0.7) {
    items.push('Cross-reference with SCADA alarm logs for the flagged period');
  }

  // Intervention history
  if (items.length < 3) {
    items.push('Review recent intervention and workover history');
  }

  // Field-level check for persistent anomalies
  if (anomalyWindows && anomalyWindows.length >= 2) {
    items.push('Confirm field operational parameters against design basis');
  }

  // Cap at 4 items
  return items.slice(0, 4);
}

// ─── Recommendation sanitizer ────────────────────────────────────
const FORBIDDEN_PATTERNS = [
  /valve\s+fail/i,
  /pump\s+fail/i,
  /reservoir\s+damage/i,
  /confirmed/i,
  /catastrophic/i,
  /irreversible/i,
];

function sanitizeRecommendation(action: string): string {
  // Never auto-state definitive root causes
  for (const pat of FORBIDDEN_PATTERNS) {
    if (pat.test(action)) {
      return 'Field verification recommended to confirm root cause';
    }
  }
  return action;
}

// ─── Component ───────────────────────────────────────────────────
export const DecisionPanel: React.FC<DecisionPanelProps> = ({
  assetId,
  priority,
  deviationPct,
  anomalyScore,
  aipsBreakdown,
  recovery,
  contributions,
  recommendations,
  anomalyWindows,
}) => {
  const verifications = useMemo(
    () => buildVerificationList(deviationPct, anomalyScore, contributions, anomalyWindows),
    [deviationPct, anomalyScore, contributions, anomalyWindows],
  );

  const priorityColor =
    priority === 'CRITICAL' ? '#FF3B3B' :
    priority === 'HIGH' ? '#FF9000' :
    priority === 'MEDIUM' ? '#C7F700' : '#6B6860';

  const topContributions = contributions.slice(0, 6);

  return (
    <div className="card-panel p-0 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-accent-amber" />
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-text-primary">
            Decision Support Panel
          </span>
          <span className="text-[9px] font-mono text-text-dim">— {assetId}</span>
        </div>
        <StatusPill
          label={`PRIORITY: ${priority}`}
          color={priority === 'CRITICAL' ? 'red' : priority === 'HIGH' ? 'amber' : 'neutral'}
          pulse={priority === 'CRITICAL'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-dark-border">
        {/* ═══ LEFT COLUMN ═══ */}

        {/* ─── 1. WHY PRIORITIZED ─── */}
        <div className="p-4">
          <div className="section-divider mb-3">
            <span>Why Prioritized</span>
          </div>
          <div className="space-y-3">
            {/* Production Loss */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <TrendingDown size={11} className="text-accent-red" />
                  <span className="telemetry-label">Production Loss</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-accent-red tabular-nums">
                  {deviationPct > 0 ? '+' : ''}{deviationPct.toFixed(1)}%
                </span>
              </div>
              <TelemetryBar value={Math.abs(aipsBreakdown.loss_magnitude_pct)} max={100} color="red" height={3} />
              <span className="text-[9px] font-mono text-text-dim mt-0.5 block">
                Loss magnitude contributes {aipsBreakdown.loss_magnitude_pct.toFixed(0)}% to AIPS score
              </span>
            </div>

            {/* Anomaly Severity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={11} className={anomalyScore > 0.7 ? 'text-accent-red' : 'text-accent-amber'} />
                  <span className="telemetry-label">Anomaly Severity</span>
                </div>
                <span className={`font-mono text-[11px] font-bold tabular-nums ${anomalyScore > 0.7 ? 'text-accent-red' : anomalyScore > 0.4 ? 'text-accent-amber' : 'text-text-primary'}`}>
                  {anomalyScore.toFixed(3)}
                </span>
              </div>
              <TelemetryBar value={anomalyScore * 100} max={100} color={anomalyScore > 0.7 ? 'red' : 'amber'} height={3} />
              <span className="text-[9px] font-mono text-text-dim mt-0.5 block">
                Model-estimated severity: {aipsBreakdown.anomaly_severity.toFixed(0)} / 100
              </span>
            </div>

            {/* Recovery Opportunity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Activity size={11} className="text-accent-green" />
                  <span className="telemetry-label">Recovery Opportunity</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-accent-green tabular-nums">
                  {recovery.estimated_recovery_mmbbl.toFixed(4)} MMBBL
                </span>
              </div>
              <TelemetryBar value={aipsBreakdown.recovery_opportunity_pct} max={100} color="green" height={3} />
              <span className="text-[9px] font-mono text-text-dim mt-0.5 block">
                Est. value: ${recovery.estimated_value_usd_m.toFixed(2)}M USD &middot; Confidence: {(recovery.combined_confidence * 100).toFixed(0)}%
              </span>
            </div>

            {/* Intervention Complexity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Wrench size={11} className="text-text-secondary" />
                  <span className="telemetry-label">Intervention Complexity</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-text-secondary tabular-nums">
                  {(aipsBreakdown.intervention_complexity * 100).toFixed(0)}%
                </span>
              </div>
              <TelemetryBar value={aipsBreakdown.intervention_complexity * 100} max={100} color="amber" height={3} />
              <span className="text-[9px] font-mono text-text-dim mt-0.5 block">
                Higher complexity reduces AIPS priority weighting
              </span>
            </div>
          </div>
        </div>

        {/* ─── 2. WHAT THE MODEL OBSERVED ─── */}
        <div className="p-4">
          <div className="section-divider mb-3">
            <span>What the Model Observed</span>
          </div>

          {topContributions.length > 0 ? (
            <div className="space-y-2">
              {topContributions.map((c, i) => {
                const isUpward = c.direction === 'UPWARD';
                const barWidth = Math.min(Math.abs(c.relative_contribution_pct), 100);
                return (
                  <div key={`${c.feature}-${i}`} className="flex items-center gap-2">
                    <div className="w-28 shrink-0">
                      <div className="text-[10px] font-mono text-text-primary truncate" title={c.feature}>
                        {c.label}
                      </div>
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 h-2 bg-dark-bg rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: isUpward ? '#FF3B3B' : '#00D966',
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-text-dim w-10 text-right tabular-nums">
                        {c.relative_contribution_pct > 0 ? '+' : ''}{c.relative_contribution_pct.toFixed(1)}%
                      </span>
                    </div>
                    <span className="w-4 flex justify-center">
                      {isUpward ? (
                        <ArrowUpRight size={10} className="text-accent-red" />
                      ) : c.direction === 'DOWNWARD' ? (
                        <ArrowDownRight size={10} className="text-accent-green" />
                      ) : (
                        <Minus size={10} className="text-text-dim" />
                      )}
                    </span>
                  </div>
                );
              })}
              <div className="mt-2 text-[9px] font-mono text-text-dim leading-relaxed border-t border-dark-border pt-2">
                <Brain size={10} className="inline mr-1 text-accent-lime" />
                {contributions[0]?.direction === 'DOWNWARD'
                  ? 'Dominant signal: model attributes deviation primarily to declining input features, consistent with natural depletion or operational constraint.'
                  : 'Dominant signal: model attributes deviation to elevated input features, suggesting operational anomaly or measurement artifact.'}
              </div>
            </div>
          ) : (
            <div className="text-[10px] font-mono text-text-dim">
              Insufficient feature data for attribution. Asset may need more history.
            </div>
          )}
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}

        {/* ─── 3. WHAT TO VERIFY ─── */}
        <div className="p-4">
          <div className="section-divider mb-3">
            <span>What to Verify</span>
          </div>
          <div className="space-y-2">
            {verifications.map((v, i) => (
              <div key={i} className="flex items-start gap-2 px-2.5 py-2 bg-dark-surface border-l-2 border-accent-lime">
                <Search size={11} className="text-accent-lime mt-0.5 shrink-0" />
                <span className="text-[10px] font-mono text-text-secondary leading-relaxed">{v}</span>
              </div>
            ))}
            <div className="mt-2 text-[9px] font-mono text-text-dim leading-relaxed">
              These are model-suggested verification steps, not confirmed diagnoses. Ground truth requires field confirmation.
            </div>
          </div>
        </div>

        {/* ─── 4. RECOMMENDED NEXT STEP ─── */}
        <div className="p-4">
          <div className="section-divider mb-3">
            <span>Recommended Next Step</span>
          </div>

          {recommendations.length > 0 ? (
            <div className="space-y-2">
              {recommendations.slice(0, 3).map((rec, i) => {
                const safeAction = sanitizeRecommendation(rec.action);
                const color =
                  rec.priority === 'CRITICAL' || rec.priority === 'HIGH' ? '#FF9000' :
                  rec.priority === 'MEDIUM' ? '#C7F700' : '#6B6860';
                return (
                  <div
                    key={`${rec.code}-${i}`}
                    className="flex items-start gap-2 px-2.5 py-2 bg-dark-surface border-l-2"
                    style={{ borderLeftColor: color }}
                  >
                    <ArrowRight size={11} className="mt-0.5 shrink-0" style={{ color }} />
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono font-bold text-text-primary leading-snug">
                        {safeAction}
                      </div>
                      <div className="text-[9px] font-mono text-text-dim mt-0.5 leading-relaxed">
                        {rec.rationale}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2.5 py-3 bg-dark-surface border-l-2 border-accent-green">
              <ShieldCheck size={12} className="text-accent-green shrink-0" />
              <span className="text-[10px] font-mono text-accent-green font-bold">
                No action indicated — asset performing within expected bounds.
              </span>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-3 px-2.5 py-2 bg-dark-bg border border-dark-border text-[8px] font-mono text-text-dim leading-relaxed">
            <span className="text-accent-amber font-bold">NOTICE:</span> PetroPulse is decision-support software, not autonomous field control.
            All recommendations require human review and ground-truth verification before operational action.
            Never treat model outputs as confirmed diagnoses.
          </div>
        </div>
      </div>
    </div>
  );
};
