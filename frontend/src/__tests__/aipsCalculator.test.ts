import { describe, it, expect } from 'vitest';
import { calculateAIPS } from '../utils/aipsCalculator';

describe('aipsCalculator utility', () => {
  it('calculateAIPS returns valid score 0-100', () => {
    const result = calculateAIPS({
      asset_id: 'T-1',
      expected_production: 10000,
      actual_production: 8000,
      anomaly_score: 0.75,
      historical_recovery_rate: 0.80,
      intervention_complexity: 0.5,
    });
    expect(result.aips_score).toBeGreaterThanOrEqual(0);
    expect(result.aips_score).toBeLessThanOrEqual(100);
  });

  it('zero gap produces low score', () => {
    const result = calculateAIPS({
      asset_id: 'T-1',
      expected_production: 10000,
      actual_production: 10000,
      anomaly_score: 0.0,
      historical_recovery_rate: 0.80,
      intervention_complexity: 1.0,
    });
    expect(result.aips_score).toBe(0);
    expect(result.priority).toBe('LOW');
  });

  it('loss_magnitude is symmetric (absolute)', () => {
    const under = calculateAIPS({
      asset_id: 'T-1',
      expected_production: 1000,
      actual_production: 800,
      anomaly_score: 0.5,
      historical_recovery_rate: 0.80,
      intervention_complexity: 0.5,
    });
    const over = calculateAIPS({
      asset_id: 'T-1',
      expected_production: 1000,
      actual_production: 1200,
      anomaly_score: 0.5,
      historical_recovery_rate: 0.80,
      intervention_complexity: 0.5,
    });
    expect(under.loss_magnitude).toBeCloseTo(over.loss_magnitude);
  });

  it('complexity penalty reduces score', () => {
    const low = calculateAIPS({
      asset_id: 'T-1',
      expected_production: 10000,
      actual_production: 8000,
      anomaly_score: 0.8,
      historical_recovery_rate: 0.80,
      intervention_complexity: 0.2,
    });
    const high = calculateAIPS({
      asset_id: 'T-1',
      expected_production: 10000,
      actual_production: 8000,
      anomaly_score: 0.8,
      historical_recovery_rate: 0.80,
      intervention_complexity: 0.9,
    });
    expect(high.aips_score).toBeLessThan(low.aips_score);
  });

  it('priority bands are correct', () => {
    const critical = calculateAIPS({
      asset_id: 'T-1',
      expected_production: 10000,
      actual_production: 5000,
      anomaly_score: 0.95,
      historical_recovery_rate: 0.80,
      intervention_complexity: 0.0,
    });
    expect(critical.priority).toBe('CRITICAL');

    const low = calculateAIPS({
      asset_id: 'T-1',
      expected_production: 10000,
      actual_production: 9900,
      anomaly_score: 0.1,
      historical_recovery_rate: 0.80,
      intervention_complexity: 0.5,
    });
    expect(low.priority).toBe('LOW');
  });

  it('calculateAIPS has all required fields', () => {
    const result = calculateAIPS({
      asset_id: 'T-1',
      expected_production: 10000,
      actual_production: 8000,
      anomaly_score: 0.75,
      historical_recovery_rate: 0.80,
      intervention_complexity: 0.5,
    });
    expect(result).toHaveProperty('aips_score');
    expect(result).toHaveProperty('priority');
    expect(result).toHaveProperty('loss_magnitude');
    expect(result).toHaveProperty('anomaly_severity');
    expect(result).toHaveProperty('recovery_opportunity');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('recovery_confidence_breakdown');
  });

  it('confidence breakdown is consistent', () => {
    const result = calculateAIPS({
      asset_id: 'T-1',
      expected_production: 10000,
      actual_production: 8000,
      anomaly_score: 0.90,
      historical_recovery_rate: 0.80,
      intervention_complexity: 0.5,
    });
    const cb = result.recovery_confidence_breakdown;
    expect(cb.historical_success_rate).toBeCloseTo(0.80);
    expect(cb.model_confidence).toBe(0.90); // score > 0.85
    expect(cb.combined_confidence).toBeCloseTo((0.80 + 0.90) / 2);
  });
});
