// Shared domain types for PetroPulse AI

export type AIPSPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type AssetSeverity = 'CRITICAL' | 'HIGH' | 'WATCH' | 'NORMAL';

export type AnomalyStatus =
  | 'UNACKNOWLEDGED'
  | 'INVESTIGATING'
  | 'ACKNOWLEDGED'
  | 'MONITORING'
  | 'RESOLVED';

export interface Asset {
  id: string;
  field: string;
  basin: string;
  currentProd: number;      // MMBL
  expectedProd: number;     // MMBL
  deviation: number;        // %
  declineRate: number;      // %/month
  severity: AssetSeverity;
  recoveryPotential: number; // MMBL
  aipsScore: number;        // 0-100
  priority: AIPSPriority;
}
