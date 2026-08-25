/**
 * Anomaly API client.
 * Handles all anomaly detection API calls.
 */

import { client } from './client'
import type { AnomalyResponse } from './types'

export const anomalyApi = {
  /**
   * Get all active anomalies across the portfolio (backend returns { rows, count }).
   */
  getActive: async (limit = 100) => {
    return client.get<{ rows: AnomalyResponse[]; count?: number; generated_at?: string }>(
      `/anomaly/active?limit=${limit}`,
    )
  },

  /**
   * Get anomalies for a specific asset.
   */
  getByAsset: async (assetId: string, limit = 50) => {
    return client.get<{ asset_id: string; severity: AnomalyResponse['severity']; anomaly_score: number; windows: unknown[] }>(
      `/anomaly/${encodeURIComponent(assetId)}?limit=${limit}`,
    )
  },
}
