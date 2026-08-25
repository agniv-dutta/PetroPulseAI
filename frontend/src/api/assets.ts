/**
 * Assets API client.
 * Handles all asset-related API calls.
 */

import { client } from './client'
import type { AssetResponse, MonthlyProduction } from './types'

export const assetsApi = {
  /**
   * Get all assets with pagination.
   */
  list: async (params?: { limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    const query = queryParams.toString()
    return client.get<AssetResponse[]>(`/assets${query ? `?${query}` : ''}`)
  },

  /**
   * Get the canonical analysis bundle for an asset by ID.
   */
  get: async <T = AssetResponse>(assetId: string) => {
    return client.get<T>(`/assets/${encodeURIComponent(assetId)}`)
  },

  /**
   * Get production history for an asset.
   */
  getHistory: async (assetId: string, limit = 36) => {
    return client.get<MonthlyProduction[]>(`/assets/${encodeURIComponent(assetId)}/history?limit=${limit}`)
  },
}
