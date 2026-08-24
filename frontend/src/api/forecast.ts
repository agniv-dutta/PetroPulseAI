/**
 * Forecast API client.
 * Handles all forecast-related API calls.
 */

import { client } from './client'
import type { ForecastResponse } from './types'

export const forecastApi = {
  /**
   * Get production forecast for an asset with a specific horizon.
   * Valid horizons: 30, 90, 180, 365 days.
   */
  get: async (assetId: string, horizon: 30 | 90 | 180 | 365) => {
    return client.get<ForecastResponse>(`/forecast/${encodeURIComponent(assetId)}/${horizon}`)
  },
}
