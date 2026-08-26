import { describe, it, expect } from 'vitest';
import {
  trainIsolationForest,
  scoreAnomaly,
  evaluateAnomalyDetector,
  type TrainingData,
} from '../utils/anomalyDetector';

function makeTrainingData(n: number, injectAnomalies = false): TrainingData {
  const timestamps: Date[] = [];
  const production: number[] = [];
  const pressure: number[] = [];
  const temperature: number[] = [];
  const flow_rate: number[] = [];

  for (let i = 0; i < n; i++) {
    timestamps.push(new Date(2024, 0, 1 + i));
    production.push(5000 + (Math.random() - 0.5) * 200);
    pressure.push(200 + (Math.random() - 0.5) * 10);
    temperature.push(150 + (Math.random() - 0.5) * 5);
    flow_rate.push(120 + (Math.random() - 0.5) * 8);
  }

  if (injectAnomalies) {
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(Math.random() * n);
      production[idx] = 500;
      pressure[idx] = 500;
      temperature[idx] = 400;
      flow_rate[idx] = 10;
    }
  }

  return { timestamps, production, pressure, temperature, flow_rate };
}

describe('anomalyDetector utility', () => {
  it('trainIsolationForest returns a model with score and retrain', () => {
    const model = trainIsolationForest(makeTrainingData(100));
    expect(typeof model.score).toBe('function');
    expect(typeof model.retrain).toBe('function');
  });

  it('score returns valid AnomalyScoreResult shape', () => {
    const model = trainIsolationForest(makeTrainingData(100));
    const obs = { production: 5000, pressure: 200, temperature: 150, flow_rate: 120 };
    const result = model.score(obs);
    expect(typeof result.anomaly_score).toBe('number');
    expect(typeof result.is_anomalous).toBe('boolean');
    expect(['NORMAL', 'WATCH', 'ALERT', 'CRITICAL']).toContain(result.anomaly_severity);
    expect(Array.isArray(result.contributing_features)).toBe(true);
    expect(typeof result.explanation).toBe('string');
  });

  it('anomaly_score is between 0 and 1', () => {
    const model = trainIsolationForest(makeTrainingData(100));
    const obs = { production: 5000, pressure: 200, temperature: 150, flow_rate: 120 };
    const result = model.score(obs);
    expect(result.anomaly_score).toBeGreaterThanOrEqual(0);
    expect(result.anomaly_score).toBeLessThanOrEqual(1);
  });

  it('extreme outlier gets higher score than normal observation', () => {
    const model = trainIsolationForest(makeTrainingData(100));
    const normalObs = { production: 5000, pressure: 200, temperature: 150, flow_rate: 120 };
    const extremeObs = { production: 100, pressure: 500, temperature: 400, flow_rate: 10 };
    const normalResult = model.score(normalObs);
    const extremeResult = model.score(extremeObs);
    expect(extremeResult.anomaly_score).toBeGreaterThan(normalResult.anomaly_score);
  });

  it('severity is in valid range', () => {
    const model = trainIsolationForest(makeTrainingData(100));
    const obs = { production: 5000, pressure: 200, temperature: 150, flow_rate: 120 };
    const result = model.score(obs);
    expect(['NORMAL', 'WATCH', 'ALERT', 'CRITICAL']).toContain(result.anomaly_severity);
  });

  it('scoreAnomaly respects custom threshold', () => {
    const model = trainIsolationForest(makeTrainingData(100));
    const obs = { production: 5000, pressure: 200, temperature: 150, flow_rate: 120 };
    const resultLow = scoreAnomaly(model, obs, 0.01);
    const resultHigh = scoreAnomaly(model, obs, 0.99);
    expect(resultLow.is_anomalous).toBe(true);
    expect(resultHigh.is_anomalous).toBe(false);
  });

  it('contributing_features has rank field', () => {
    const model = trainIsolationForest(makeTrainingData(100));
    const obs = { production: 5000, pressure: 200, temperature: 150, flow_rate: 120 };
    const result = model.score(obs);
    if (result.contributing_features.length > 0) {
      expect(typeof result.contributing_features[0].rank).toBe('number');
      expect(typeof result.contributing_features[0].feature).toBe('string');
    }
  });

  it('model.retrain does not throw', () => {
    const model = trainIsolationForest(makeTrainingData(100));
    expect(() => model.retrain(makeTrainingData(30))).not.toThrow();
  });

  it('training with anomalies included produces valid model', () => {
    const model = trainIsolationForest(makeTrainingData(100, true));
    const obs = { production: 5000, pressure: 200, temperature: 150, flow_rate: 120 };
    const result = model.score(obs);
    expect(typeof result.anomaly_score).toBe('number');
  });

  it('evaluateAnomalyDetector returns metrics', () => {
    const model = trainIsolationForest(makeTrainingData(100));
    const testData = makeTrainingData(20, true);
    const metrics = evaluateAnomalyDetector(model, testData, [{ startIdx: 0, endIdx: 5 }]);
    expect(typeof metrics.precision).toBe('number');
    expect(typeof metrics.recall).toBe('number');
    expect(typeof metrics.f1_score).toBe('number');
    expect(typeof metrics.false_positive_rate).toBe('number');
    expect(typeof metrics.roc_auc).toBe('number');
  });
});
