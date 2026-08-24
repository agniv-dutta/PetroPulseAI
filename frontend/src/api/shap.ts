/**
 * SHAP (SHapley Additive exPlanations) API client.
 * Handles all SHAP explanation API calls.
 */

import { client } from './client'
import type { SHAPExplanationResponse } from './types'

export const shapApi = {
  /**
   * Get SHAP explanation for an asset's forecast.
   */
  getExplanation: async (assetId: string) => {
    return client.get<SHAPExplanationResponse>(`/shap/${encodeURIComponent(assetId)}`)
  },
}
