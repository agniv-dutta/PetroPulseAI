import { describe, it, expect } from 'vitest';
import { ANOMALY_SCENARIOS } from '../utils/syntheticDataGenerator';

describe('syntheticDataGenerator utility', () => {
  it('ANOMALY_SCENARIOS has all expected types', () => {
    expect(ANOMALY_SCENARIOS).toHaveProperty('VALVE_FAILURE');
    expect(ANOMALY_SCENARIOS).toHaveProperty('GRADUAL_CLOG');
    expect(ANOMALY_SCENARIOS).toHaveProperty('HIGH_VOLATILITY');
    expect(ANOMALY_SCENARIOS).toHaveProperty('RECOVERY');
  });

  it('scenarios have required fields', () => {
    for (const [, scenario] of Object.entries(ANOMALY_SCENARIOS)) {
      expect(scenario).toHaveProperty('type');
      expect(scenario).toHaveProperty('start_offset_minutes');
      expect(scenario).toHaveProperty('duration_minutes');
      expect(scenario).toHaveProperty('severity');
      expect(scenario.duration_minutes).toBeGreaterThan(0);
      expect(scenario.severity).toBeGreaterThan(0);
    }
  });

  it('GRADUAL_CLOG has progressive characteristics', () => {
    const clog = ANOMALY_SCENARIOS.GRADUAL_CLOG;
    expect(clog.type).toBe('GRADUAL_CLOG');
    expect(clog.duration_minutes).toBeGreaterThan(1000); // long-duration
  });

  it('VALVE_FAILURE has sharp characteristics', () => {
    const valve = ANOMALY_SCENARIOS.VALVE_FAILURE;
    expect(valve.type).toBe('VALVE_FAILURE');
    expect(valve.severity).toBeGreaterThan(0.3); // high severity
  });
});
