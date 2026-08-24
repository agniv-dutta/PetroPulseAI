/**
 * Health check API client.
 * Handles health check API calls.
 */

import { client } from './client'
import type { HealthResponse } from './types'

export const healthApi = {
  /**
   * Get health status of the backend service.
   */
  check: async () => {
    return client.get<HealthResponse>('/health')
  },
}
