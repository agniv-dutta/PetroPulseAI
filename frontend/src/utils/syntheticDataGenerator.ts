import { calculateArpsProduction } from './arpsDeclineCurve';

export interface SyntheticObservation {
  timestamp: string;
  asset_id: string;
  production: number;
  pressure: number;
  temperature: number;
  flow_rate: number;
  forecast_30d: number;
  anomaly_score: number;
  status: "NORMAL" | "WATCH" | "ALERT" | "CRITICAL";
}

export interface GenerationConfig {
  asset_id: string;
  arps_params: { qi: number; Di: number; b: number };
  seasonal_factors: number[];
  start_timestamp: Date;
  initial_values: {
    pressure: number;
    temperature: number;
  };
}

export interface AnomalyScenario {
  type: "VALVE_FAILURE" | "GRADUAL_CLOG" | "HIGH_VOLATILITY" | "RECOVERY";
  start_offset_minutes: number;
  duration_minutes: number;
  severity: number;
}

function boxMullerRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function generateSyntheticObservation(
  config: GenerationConfig,
  currentTime: Date,
  anomaly?: AnomalyScenario,
): SyntheticObservation {
  const msToMonths = 30.44 * 24 * 60 * 60 * 1000;
  const monthsElapsed =
    (currentTime.getTime() - config.start_timestamp.getTime()) / msToMonths;

  const { qi, Di, b } = config.arps_params;
  const baseProduction = calculateArpsProduction(monthsElapsed, qi, Di, b);

  const monthIndex = currentTime.getMonth();
  const seasonalMultiplier = config.seasonal_factors[monthIndex];
  let seasonedProduction = baseProduction * seasonalMultiplier;

  let noise = boxMullerRandom() * 0.05 * seasonedProduction;
  let production = seasonedProduction + noise;

  if (anomaly !== undefined) {
    const anomalyStartMs =
      config.start_timestamp.getTime() +
      anomaly.start_offset_minutes * 60 * 1000;
    const anomalyEndMs = anomalyStartMs + anomaly.duration_minutes * 60 * 1000;
    const currentMs = currentTime.getTime();

    if (currentMs >= anomalyStartMs && currentMs <= anomalyEndMs) {
      const elapsedMs = currentMs - anomalyStartMs;
      const elapsedFraction = elapsedMs / (anomaly.duration_minutes * 60 * 1000);

      switch (anomaly.type) {
        case "VALVE_FAILURE":
          production *= 1 - anomaly.severity;
          break;
        case "GRADUAL_CLOG":
          production *= 1 - anomaly.severity * elapsedFraction;
          break;
        case "HIGH_VOLATILITY":
          noise *= 3;
          production = seasonedProduction + noise;
          break;
        case "RECOVERY":
          production *= 1 + anomaly.severity;
          break;
      }
    }
  }

  production = Math.max(0.001, production);

  const pressure =
    config.initial_values.pressure *
    Math.pow(baseProduction / (qi * config.seasonal_factors[0]), -0.3) +
    boxMullerRandom() * 2;
  const clampedPressure = Math.max(150, Math.min(250, pressure));

  const temperature =
    config.initial_values.temperature +
    boxMullerRandom() * 2 +
    Math.sin((monthIndex * Math.PI) / 6) * 1.5;
  const clampedTemperature = Math.max(60, Math.min(95, temperature));

  let flowRate =
    (production * 1000000) / 30.44 / 24 / 3600 / 1000 + boxMullerRandom() * 10;
  flowRate = Math.max(50, flowRate);

  const forecast30d =
    calculateArpsProduction(monthsElapsed + 1, qi, Di, b) * seasonalMultiplier;

  let anomalyScore = 0.05 + Math.random() * 0.1;
  if (anomaly !== undefined) {
    const anomalyStartMs =
      config.start_timestamp.getTime() +
      anomaly.start_offset_minutes * 60 * 1000;
    const anomalyEndMs = anomalyStartMs + anomaly.duration_minutes * 60 * 1000;

    if (
      currentTime.getTime() >= anomalyStartMs &&
      currentTime.getTime() <= anomalyEndMs
    ) {
      anomalyScore = 0.5 + anomaly.severity * 2;
    }
  }

  let status: SyntheticObservation["status"];
  if (anomalyScore < 0.3) {
    status = "NORMAL";
  } else if (anomalyScore < 0.5) {
    status = "WATCH";
  } else if (anomalyScore < 0.7) {
    status = "ALERT";
  } else {
    status = "CRITICAL";
  }

  return {
    timestamp: currentTime.toISOString(),
    asset_id: config.asset_id,
    production,
    pressure: clampedPressure,
    temperature: clampedTemperature,
    flow_rate: flowRate,
    forecast_30d: forecast30d,
    anomaly_score: anomalyScore,
    status,
  };
}

export function* generateSyntheticStream(
  config: GenerationConfig,
  intervalSeconds: number = 10,
  maxObservations?: number,
): Generator<SyntheticObservation> {
  let currentTimestamp = new Date(config.start_timestamp);
  let observationCount = 0;

  while (maxObservations === undefined || observationCount < maxObservations) {
    yield generateSyntheticObservation(config, currentTimestamp);

    currentTimestamp = new Date(
      currentTimestamp.getTime() + intervalSeconds * 1000 * 600,
    );
    observationCount++;
  }
}

export function calculateSeasonalFactors(monthlyProduction: number[][]): number[] {
  const monthTotals: number[] = new Array(12).fill(0);
  const monthCounts: number[] = new Array(12).fill(0);

  for (const pair of monthlyProduction) {
    const month = pair[0];
    const production = pair[1];
    monthTotals[month] += production;
    monthCounts[month]++;
  }

  const monthAverages: number[] = new Array(12).fill(0);
  for (let i = 0; i < 12; i++) {
    if (monthCounts[i] > 0) {
      monthAverages[i] = monthTotals[i] / monthCounts[i];
    }
  }

  let overallSum = 0;
  let overallCount = 0;
  for (let i = 0; i < 12; i++) {
    if (monthCounts[i] > 0) {
      overallSum += monthTotals[i];
      overallCount += monthCounts[i];
    }
  }
  const overallAverage = overallCount > 0 ? overallSum / overallCount : 1;

  return monthAverages.map((avg) =>
    overallAverage > 0 ? avg / overallAverage : 1,
  );
}

export const ANOMALY_SCENARIOS: Record<string, AnomalyScenario> = {
  VALVE_FAILURE: {
    type: "VALVE_FAILURE",
    start_offset_minutes: 0,
    duration_minutes: 10000,
    severity: 0.4,
  },
  GRADUAL_CLOG: {
    type: "GRADUAL_CLOG",
    start_offset_minutes: 0,
    duration_minutes: 2880,
    severity: 0.03,
  },
  HIGH_VOLATILITY: {
    type: "HIGH_VOLATILITY",
    start_offset_minutes: 0,
    duration_minutes: 60,
    severity: 0.15,
  },
  RECOVERY: {
    type: "RECOVERY",
    start_offset_minutes: 0,
    duration_minutes: 5000,
    severity: 0.18,
  },
};

export const EXAMPLE_CONFIG: GenerationConfig = {
  asset_id: "MH-07",
  arps_params: { qi: 1.95, Di: 0.035, b: 0.65 },
  seasonal_factors: [
    0.98, 0.99, 1.0, 1.01, 1.02, 0.95, 0.94, 0.96, 0.98, 1.03, 1.02, 1.0,
  ],
  start_timestamp: new Date("2026-01-01"),
  initial_values: { pressure: 190, temperature: 78 },
};
