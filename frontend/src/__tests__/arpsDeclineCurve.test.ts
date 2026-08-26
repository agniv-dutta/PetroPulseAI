import { describe, it, expect } from 'vitest';
import {
  calculateArpsProduction,
  calculateDeclineRate,
} from '../utils/arpsDeclineCurve';

describe('arpsDeclineCurve utility', () => {
  it('arps_rate at t=0 returns qi', () => {
    const rate = calculateArpsProduction(0, 5000, 0.04, 0.5);
    expect(rate).toBeCloseTo(5000, 1);
  });

  it('arps_rate is monotonically decreasing', () => {
    const rates = Array.from({ length: 24 }, (_, i) =>
      calculateArpsProduction(i, 5000, 0.04, 0.5)
    );
    for (let i = 0; i < rates.length - 1; i++) {
      expect(rates[i]).toBeGreaterThanOrEqual(rates[i + 1]);
    }
  });

  it('exponential limit when b is tiny', () => {
    const qi = 5000;
    const di = 0.04;
    const t = 12;
    const hyperbolic = calculateArpsProduction(t, qi, di, 0.0001);
    const exponential = qi * Math.exp(-di * t);
    expect(hyperbolic).toBeCloseTo(exponential, 1);
  });

  it('harmonic formula when b=1', () => {
    const qi = 3000;
    const di = 0.05;
    const t = 6;
    const result = calculateArpsProduction(t, qi, di, 1.0);
    const expected = qi / (1 + di * t);
    expect(result).toBeCloseTo(expected, 6);
  });

  it('calculateDeclineRate returns positive value', () => {
    const result = calculateDeclineRate(12, 0.05, 0.6);
    expect(result).toBeGreaterThan(0);
  });

  it('calculateDeclineRate for exponential (b near 0) returns di', () => {
    const result = calculateDeclineRate(0, 0.04, 0.0001);
    expect(result).toBeCloseTo(0.04, 4);
  });
});
