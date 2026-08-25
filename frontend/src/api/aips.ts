/**
 * AIPS (Asset Intelligence Priority System) API client.
 * Handles all AIPS scoring API calls.
 */

import { client } from './client'
import type { AIPSScoreResponse, AssetRankingResponse } from './types'

export const aipsApi = {
  /**
   * Get asset ranking by AIPS score (backend returns { rows, generated_at }).
   */
  getRanking: async (limit = 100) => {
    return client.get<{ rows: AssetRankingResponse[]; count?: number; generated_at?: string }>(
      `/aips/ranking?limit=${limit}`,
    )
  },

  /**
   * Get AIPS score for a specific asset.
   */
  getScore: async (assetId: string) => {
    return client.get<AIPSScoreResponse>(`/aips/${encodeURIComponent(assetId)}`)
  },
}
