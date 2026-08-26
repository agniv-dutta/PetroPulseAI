import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 1;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 3;
  }

  simulateOpen() {
    this.onopen?.();
  }

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

// Mock the api module
vi.mock('../api/client', () => {
  return {
    api: {
      startSimulation: vi.fn().mockResolvedValue({
        session_id: 'test-session-001',
        asset_id: 'CB-08',
        scenario: 'NORMAL',
      }),
      stopSimulation: vi.fn().mockResolvedValue({}),
      pauseSimulation: vi.fn().mockResolvedValue({}),
      resumeSimulation: vi.fn().mockResolvedValue({}),
      injectAnomaly: vi.fn().mockResolvedValue({ status: 'ok' }),
    },
    simulationSocketUrl: (sid: string) => `ws://localhost:8000/ws/simulation/${sid}`,
    API_BASE_URL: 'http://localhost:8000/api/v1',
    client: { get: vi.fn(), post: vi.fn() },
  };
});

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket as any);
  vi.clearAllMocks();
});

import { useSimulationSocket } from '../api/hooks';

describe('useSimulationSocket', () => {
  it('initializes with disconnected state', () => {
    const { result } = renderHook(() => useSimulationSocket('CB-08'));
    expect(result.current.connected).toBe(false);
    expect(result.current.sessionId).toBeNull();
    expect(result.current.ticks).toEqual([]);
  });

  it('start() opens a WebSocket after API call', async () => {
    const { result } = renderHook(() => useSimulationSocket('CB-08'));

    await act(async () => {
      const ok = await result.current.start('NORMAL');
      expect(ok).toBe(true);
    });

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toContain('test-session-001');
  });

  it('sets connected=true on WebSocket open', async () => {
    const { result } = renderHook(() => useSimulationSocket('CB-08'));

    await act(async () => {
      await result.current.start('NORMAL');
    });

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.sessionId).toBe('test-session-001');
  });

  it('receives telemetry ticks', async () => {
    const { result } = renderHook(() => useSimulationSocket('CB-08'));

    await act(async () => {
      await result.current.start('NORMAL');
    });

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    act(() => {
      MockWebSocket.instances[0].simulateMessage({
        type: 'telemetry',
        data: {
          tick: 1,
          production_bbl_d: 4500,
          expected_bbl_d: 5000,
        },
      });
    });

    expect(result.current.ticks.length).toBe(1);
  });

  it('caps ticks at 120', async () => {
    const { result } = renderHook(() => useSimulationSocket('CB-08'));

    await act(async () => {
      await result.current.start('NORMAL');
    });

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    for (let i = 0; i < 130; i++) {
      act(() => {
        MockWebSocket.instances[0].simulateMessage({
          type: 'telemetry',
          data: { tick: i, production_bbl_d: 4500 },
        });
      });
    }

    expect(result.current.ticks.length).toBeLessThanOrEqual(120);
  });

  it('setScenario sends SET_SCENARIO message', async () => {
    const { result } = renderHook(() => useSimulationSocket('CB-08'));

    await act(async () => {
      await result.current.start('NORMAL');
    });

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    act(() => {
      result.current.setScenario('GRADUAL_CLOG');
    });

    expect(MockWebSocket.instances[0].sentMessages).toContain('SET_SCENARIO:GRADUAL_CLOG');
    expect(result.current.scenario).toBe('GRADUAL_CLOG');
  });
});
