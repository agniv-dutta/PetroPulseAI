/**
 * Anomaly API client.
 * Handles all anomaly detection API calls.
 */

import { client } from './client'
import type { AnomalyResponse } from './types'

export const anomalyApi = {
  /**
   * Get all active anomalies across the portfolio.
   */
  getActive: async (limit = 100) => {
    return client.get<AnomalyResponse[]>(`/anomaly/active?limit=${limit}`)
  },

  /**
   * Get anomalies for a specific asset.
   */
  getByAsset: async (assetId: string, limit = 50) => {
    return client.get<AnomalyResponse[]>(`/anomaly/${encodeURIComponent(assetId)}?limit=${limit}`)
  },
}
