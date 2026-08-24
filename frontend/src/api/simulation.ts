/**
 * Simulation API client.
 * Handles all simulation API calls including WebSocket connection.
 */

import { client } from './client'
import type { SimulationResponse, SimulationStartRequest, InjectAnomalyRequest } from './types'

export const simulationApi = {
  /**
   * Start a new simulation session.
   */
  start: async (request: SimulationStartRequest) => {
    return client.post<SimulationResponse>('/simulation/start', request)
  },

  /**
   * Inject an anomaly into an active simulation.
   */
  injectAnomaly: async (simulationId: string, request: InjectAnomalyRequest) => {
    return client.post<{ message: string; simulation_id: string; severity: string; magnitude: number; timestamp: string }>(
      `/simulation/inject-anomaly?simulation_id=${encodeURIComponent(simulationId)}`,
      request,
    )
  },

  /**
   * Pause an active simulation.
   */
  pause: async (simulationId: string) => {
    return client.post<{ message: string; simulation_id: string; status: string }>(
      `/simulation/pause?simulation_id=${encodeURIComponent(simulationId)}`,
    )
  },

  /**
   * Resume a paused simulation.
   */
  resume: async (simulationId: string) => {
    return client.post<{ message: string; simulation_id: string; status: string }>(
      `/simulation/resume?simulation_id=${encodeURIComponent(simulationId)}`,
    )
  },

  /**
   * Stop an active simulation.
   */
  stop: async (simulationId: string) => {
    return client.post<{ message: string; simulation_id: string; status: string }>(
      `/simulation/stop?simulation_id=${encodeURIComponent(simulationId)}`,
    )
  },

  /**
   * Get simulation session details.
   */
  get: async (simulationId: string) => {
    return client.get<SimulationResponse>(`/simulation/${encodeURIComponent(simulationId)}`)
  },

  /**
   * Build WebSocket URL for simulation telemetry.
   */
  getWebSocketUrl: (simulationId: string): string => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws'
    const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/api\/v1$/, '')
    return `${wsProtocol}://${host}/ws/simulation/${encodeURIComponent(simulationId)}`
  },
}

/**
 * WebSocket connection manager for simulation telemetry.
 */
export class SimulationWebSocket {
  private ws: WebSocket | null = null
  private simulationId: string
  private messageHandlers: Map<string, ((data: unknown) => void)[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(simulationId: string) {
    this.simulationId = simulationId
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = simulationApi.getWebSocketUrl(this.simulationId)
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            const messageType = data.type

            const handlers = this.messageHandlers.get(messageType) || []
            handlers.forEach((handler) => handler(data))

            // Also call wildcard handlers
            const wildcardHandlers = this.messageHandlers.get('*') || []
            wildcardHandlers.forEach((handler) => handler(data))
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          // Attempt to reconnect if not intentionally closed
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            setTimeout(() => {
              this.connect().catch(console.error)
            }, this.reconnectDelay * this.reconnectAttempts)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  on(messageType: string, handler: (data: unknown) => void): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, [])
    }
    this.messageHandlers.get(messageType)!.push(handler)
  }

  send(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.messageHandlers.clear()
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}
