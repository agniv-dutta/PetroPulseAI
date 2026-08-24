/**
 * Metrics API client.
 * Handles all performance metrics API calls.
 */

import { client } from './client'
import type { ForecastMetricsResponse, AnomalyMetricsResponse } from './types'

export const metricsApi = {
  /**
   * Get forecast performance metrics.
   */
  getForecastMetrics: async (horizon = '90d') => {
    return client.get<ForecastMetricsResponse>(`/metrics/forecast?horizon=${horizon}`)
  },

  /**
   * Get anomaly detection metrics.
   */
  getAnomalyMetrics: async () => {
    return client.get<AnomalyMetricsResponse>('/metrics/anomaly')
  },
}
