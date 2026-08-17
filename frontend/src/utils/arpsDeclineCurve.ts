export interface ArpsFitResult {
  qi: number;
  Di: number;
  b: number;
  r_squared: number;
  mean_absolute_error: number;
  forecast_30d: number;
  forecast_90d: number;
  forecast_180d: number;
  std_error: number;
  fitted_curve: Array<{ month: number; production: number }>;
}

export function calculateArpsProduction(
  t: number,
  qi: number,
  Di: number,
  b: number,
): number {
  if (b < 0.001) {
    return qi * Math.exp(-Di * t);
  }
  return qi / Math.pow(1 + b * Di * t, 1 / b);
}

export function calculateDeclineRate(
  t: number,
  Di: number,
  b: number,
): number {
  if (b < 0.001) {
    return Di;
  }
  return Di / (1 + b * Di * t);
}

export function forecastArpsProduction(
  arpsParams: { qi: number; Di: number; b: number },
  monthsAhead: number,
): number[] {
  const result: number[] = [];
  for (let i = 1; i <= monthsAhead; i++) {
    result.push(
      calculateArpsProduction(i, arpsParams.qi, arpsParams.Di, arpsParams.b),
    );
  }
  return result;
}

function linearRegression(
  x: number[],
  y: number[],
): { slope: number; intercept: number; rSquared: number } {
  const n = x.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }
  const denom = n * sumX2 - sumX * sumX;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const ssRes = y.reduce(
    (acc, yi, i) => acc + (yi - (slope * x[i] + intercept)) ** 2,
    0,
  );
  const meanY = sumY / n;
  const ssTot = y.reduce((acc, yi) => acc + (yi - meanY) ** 2, 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, rSquared };
}

function sumSquaredError(
  data: number[],
  qi: number,
  Di: number,
  b: number,
): number {
  let sse = 0;
  for (let i = 0; i < data.length; i++) {
    const predicted = calculateArpsProduction(i + 1, qi, Di, b);
    const diff = data[i] - predicted;
    sse += diff * diff;
  }
  return sse;
}

export function fitArpsDeclineCurve(
  historicalProduction: number[],
  _startDate?: Date,
): ArpsFitResult {
  const n = historicalProduction.length;
  if (n < 12) {
    throw new Error("At least 12 months of historical production required");
  }
  for (let i = 0; i < n; i++) {
    if (historicalProduction[i] <= 0) {
      throw new Error("All production values must be positive");
    }
  }

  const q0 = historicalProduction[0];
  const qiMin = q0 * 0.8;
  const qiMax = q0 * 1.2;
  const diMin = 0.01;
  const diMax = 0.12;
  const bMin = 0.1;
  const bMax = 1.0;

  let bestQi = q0;
  let bestDi = 0.04;
  let bestB = 0.5;
  let bestSSE = Infinity;

  const coarseSteps = 5;
  const qiStep = (qiMax - qiMin) / (coarseSteps - 1);
  const diStep = (diMax - diMin) / (coarseSteps - 1);
  const bStep = (bMax - bMin) / (coarseSteps - 1);

  for (let qiIdx = 0; qiIdx < coarseSteps; qiIdx++) {
    for (let diIdx = 0; diIdx < coarseSteps; diIdx++) {
      for (let bIdx = 0; bIdx < coarseSteps; bIdx++) {
        const qi = qiMin + qiIdx * qiStep;
        const Di = diMin + diIdx * diStep;
        const b = bMin + bIdx * bStep;
        const sse = sumSquaredError(historicalProduction, qi, Di, b);
        if (sse < bestSSE) {
          bestSSE = sse;
          bestQi = qi;
          bestDi = Di;
          bestB = b;
        }
      }
    }
  }

  const fineSteps = 5;
  const fineQiMin = bestQi - qiStep;
  const fineQiMax = bestQi + qiStep;
  const fineDiMin = bestDi - diStep;
  const fineDiMax = bestDi + diStep;
  const fineBMin = bestB - bStep;
  const fineBMax = bestB + bStep;
  const fineQiStep = (fineQiMax - fineQiMin) / (fineSteps - 1);
  const fineDiStep = (fineDiMax - fineDiMin) / (fineSteps - 1);
  const fineBStep = (fineBMax - fineBMin) / (fineSteps - 1);

  for (let qiIdx = 0; qiIdx < fineSteps; qiIdx++) {
    for (let diIdx = 0; diIdx < fineSteps; diIdx++) {
      for (let bIdx = 0; bIdx < fineSteps; bIdx++) {
        const qi = fineQiMin + qiIdx * fineQiStep;
        const Di = fineDiMin + diIdx * fineDiStep;
        const b = fineBMin + bIdx * fineBStep;
        const sse = sumSquaredError(historicalProduction, qi, Di, b);
        if (sse < bestSSE) {
          bestSSE = sse;
          bestQi = qi;
          bestDi = Di;
          bestB = b;
        }
      }
    }
  }

  const residuals: number[] = [];
  const monthIndices: number[] = [];
  const fittedCurve: Array<{ month: number; production: number }> = [];

  for (let i = 0; i < n; i++) {
    const predicted = calculateArpsProduction(i + 1, bestQi, bestDi, bestB);
    residuals.push(historicalProduction[i] - predicted);
    monthIndices.push(i + 1);
    fittedCurve.push({ month: i + 1, production: predicted });
  }

  const regression = linearRegression(monthIndices, historicalProduction);
  const ssRes = residuals.reduce((acc, r) => acc + r * r, 0);
  const meanY =
    historicalProduction.reduce((acc, v) => acc + v, 0) / n;
  const ssTot = historicalProduction.reduce(
    (acc, v) => acc + (v - meanY) ** 2,
    0,
  );
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  const mae =
    residuals.reduce((acc, r) => acc + Math.abs(r), 0) / n;
  const variance = ssRes / (n - 3);
  const stdError = Math.sqrt(variance > 0 ? variance : 0);

  const forecast30d = calculateArpsProduction(1, bestQi, bestDi, bestB);
  const forecast90d = calculateArpsProduction(3, bestQi, bestDi, bestB);
  const forecast180d = calculateArpsProduction(6, bestQi, bestDi, bestB);

  void regression;

  return {
    qi: bestQi,
    Di: bestDi,
    b: bestB,
    r_squared: rSquared,
    mean_absolute_error: mae,
    forecast_30d: forecast30d,
    forecast_90d: forecast90d,
    forecast_180d: forecast180d,
    std_error: stdError,
    fitted_curve: fittedCurve,
  };
}

export const SAMPLE_ARPS_FITS: Record<
  string,
  {
    qi: number;
    Di: number;
    b: number;
    r_squared: number;
    mean_absolute_error: number;
    forecast_30d: number;
    forecast_90d: number;
    forecast_180d: number;
    std_error: number;
  }
> = {
  "MH-07": {
    qi: 1.95,
    Di: 0.035,
    b: 0.65,
    r_squared: 0.927,
    mean_absolute_error: 0.045,
    forecast_30d: 1.8837,
    forecast_90d: 1.7617,
    forecast_180d: 1.6016,
    std_error: 0.052,
  },
  "CB-12": {
    qi: 1.15,
    Di: 0.042,
    b: 0.58,
    r_squared: 0.912,
    mean_absolute_error: 0.052,
    forecast_30d: 1.1033,
    forecast_90d: 1.0183,
    forecast_180d: 0.909,
    std_error: 0.061,
  },
  "AS-09": {
    qi: 2.1,
    Di: 0.028,
    b: 0.72,
    r_squared: 0.935,
    mean_absolute_error: 0.038,
    forecast_30d: 2.0426,
    forecast_90d: 1.9355,
    forecast_180d: 1.792,
    std_error: 0.044,
  },
  "KG-03": {
    qi: 0.85,
    Di: 0.055,
    b: 0.45,
    r_squared: 0.891,
    mean_absolute_error: 0.068,
    forecast_30d: 0.8051,
    forecast_90d: 0.7249,
    forecast_180d: 0.6249,
    std_error: 0.078,
  },
  "RJ-04": {
    qi: 1.4,
    Di: 0.038,
    b: 0.62,
    r_squared: 0.918,
    mean_absolute_error: 0.048,
    forecast_30d: 1.3484,
    forecast_90d: 1.254,
    forecast_180d: 1.1311,
    std_error: 0.056,
  },
  "CB-991": {
    qi: 0.95,
    Di: 0.062,
    b: 0.4,
    r_squared: 0.885,
    mean_absolute_error: 0.072,
    forecast_30d: 0.8936,
    forecast_90d: 0.794,
    forecast_180d: 0.6716,
    std_error: 0.083,
  },
  "MH-12": {
    qi: 1.75,
    Di: 0.031,
    b: 0.68,
    r_squared: 0.942,
    mean_absolute_error: 0.032,
    forecast_30d: 1.6971,
    forecast_90d: 1.5991,
    forecast_180d: 1.4688,
    std_error: 0.038,
  },
  "CB-05": {
    qi: 1.05,
    Di: 0.045,
    b: 0.55,
    r_squared: 0.905,
    mean_absolute_error: 0.055,
    forecast_30d: 1.0043,
    forecast_90d: 0.9218,
    forecast_180d: 0.8163,
    std_error: 0.064,
  },
  "AS-03": {
    qi: 1.85,
    Di: 0.033,
    b: 0.7,
    r_squared: 0.931,
    mean_absolute_error: 0.04,
    forecast_30d: 1.7906,
    forecast_90d: 1.6811,
    forecast_180d: 1.5369,
    std_error: 0.047,
  },
  "RJ-07": {
    qi: 1.2,
    Di: 0.048,
    b: 0.5,
    r_squared: 0.898,
    mean_absolute_error: 0.06,
    forecast_30d: 1.1444,
    forecast_90d: 1.0442,
    forecast_180d: 0.9169,
    std_error: 0.07,
  },
};
