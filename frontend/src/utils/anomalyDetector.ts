export interface AnomalyScoreResult {
  anomaly_score: number;
  is_anomalous: boolean;
  anomaly_severity: "NORMAL" | "WATCH" | "ALERT" | "CRITICAL";
  contributing_features: Array<{
    feature: string;
    deviation_from_mean: number;
    rank: number;
  }>;
  explanation: string;
}

export interface IsolationForestConfig {
  num_trees: number;
  sample_size: number;
  contamination: number;
}

export interface TrainingData {
  timestamps: Date[];
  production: number[];
  pressure: number[];
  temperature: number[];
  flow_rate: number[];
}

export interface AnomalyDetectionMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  roc_auc: number;
}

export interface IsolationForestModel {
  score(observation: { production: number; pressure: number; temperature: number; flow_rate: number }): AnomalyScoreResult;
  retrain(newData: TrainingData): void;
}

interface IsolationTreeNode {
  feature?: number;
  split?: number;
  left?: IsolationTreeNode;
  right?: IsolationTreeNode;
  size?: number;
  depth?: number;
}

const DEFAULT_CONFIG: IsolationForestConfig = {
  num_trees: 100,
  sample_size: 256,
  contamination: 0.05,
};

function c(n: number): number {
  if (n <= 1) return 0;
  let harmonicSum = 0;
  for (let i = 1; i < n; i++) {
    harmonicSum += 1 / i;
  }
  return 2 * harmonicSum - (2 * (n - 1)) / n;
}

function buildIsolationTree(data: number[][], depth: number, maxDepth: number): IsolationTreeNode {
  if (data.length <= 1 || depth >= maxDepth) {
    return { size: data.length, depth };
  }

  const numFeatures = data[0].length;
  const featureIdx = Math.floor(Math.random() * numFeatures);

  const values = data.map((row) => row[featureIdx]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  if (minVal === maxVal) {
    return { size: data.length, depth };
  }

  const splitVal = minVal + Math.random() * (maxVal - minVal);

  const leftData: number[][] = [];
  const rightData: number[][] = [];

  for (const row of data) {
    if (row[featureIdx] < splitVal) {
      leftData.push(row);
    } else {
      rightData.push(row);
    }
  }

  if (leftData.length === 0 || rightData.length === 0) {
    return { size: data.length, depth };
  }

  return {
    feature: featureIdx,
    split: splitVal,
    left: buildIsolationTree(leftData, depth + 1, maxDepth),
    right: buildIsolationTree(rightData, depth + 1, maxDepth),
    size: data.length,
    depth,
  };
}

function getPathLength(tree: IsolationTreeNode, point: number[], depth: number): number {
  if (tree.feature === undefined || tree.split === undefined || tree.left === undefined || tree.right === undefined) {
    return depth;
  }

  if (point[tree.feature] < tree.split) {
    return getPathLength(tree.left, point, depth + 1);
  }
  return getPathLength(tree.right, point, depth + 1);
}

function getSeverityLevel(score: number): "NORMAL" | "WATCH" | "ALERT" | "CRITICAL" {
  if (score < 0.5) return "NORMAL";
  if (score < 0.7) return "WATCH";
  if (score < 0.85) return "ALERT";
  return "CRITICAL";
}

function generateExplanation(deviations: Record<string, number>, score: number): string {
  const severity = getSeverityLevel(score);
  const featureEntries = Object.entries(deviations)
    .map(([feature, deviation]) => ({ feature, deviation: Math.abs(deviation) }))
    .sort((a, b) => b.deviation - a.deviation);

  const topFeatures = featureEntries.filter((e) => e.deviation > 1.5);
  const featureNames = topFeatures.length > 0
    ? topFeatures.map((e) => e.feature).join(", ")
    : "multiple parameters";

  if (severity === "NORMAL") {
    return `Observation appears within normal operating ranges. No unusual patterns detected.`;
  }

  if (severity === "WATCH") {
    return `Slight deviations detected in ${featureNames}. Unusual pattern detected — monitor closely.`;
  }

  if (severity === "ALERT") {
    return `Notable deviations in ${featureNames}. Unusual pattern detected that warrants further investigation.`;
  }

  return `Significant deviations in ${featureNames}. Unusual pattern detected requiring immediate attention.`;
}

function extractFeatures(data: TrainingData): number[][] {
  const n = data.production.length;
  return Array.from({ length: n }, (_, i) => [
    data.production[i],
    data.pressure[i],
    data.temperature[i],
    data.flow_rate[i],
  ]);
}

function computeStats(features: number[][]): { mean: number[]; std: number[] } {
  const numFeatures = features[0].length;
  const n = features.length;
  const mean: number[] = [];
  const std: number[] = [];

  for (let f = 0; f < numFeatures; f++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += features[i][f];
    }
    mean.push(sum / n);

    let sqDiffSum = 0;
    for (let i = 0; i < n; i++) {
      const diff = features[i][f] - mean[f];
      sqDiffSum += diff * diff;
    }
    std.push(Math.sqrt(sqDiffSum / n) || 1);
  }

  return { mean, std };
}

function normalizeFeatures(features: number[][], mean: number[], std: number[]): number[][] {
  const normalized: number[][] = [];
  for (let i = 0; i < features.length; i++) {
    const row: number[] = [];
    for (let f = 0; f < features[i].length; f++) {
      row.push((features[i][f] - mean[f]) / std[f]);
    }
    normalized.push(row);
  }
  return normalized;
}

function buildForest(normalizedData: number[][], sampleSize: number, numTrees: number): IsolationTreeNode[] {
  const trees: IsolationTreeNode[] = [];
  const n = normalizedData.length;
  const maxDepth = Math.ceil(Math.log2(Math.min(sampleSize, n)));

  for (let t = 0; t < numTrees; t++) {
    const sample: number[][] = [];
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * n);
      sample.push([...normalizedData[idx]]);
    }
    trees.push(buildIsolationTree(sample, 0, maxDepth));
  }

  return trees;
}

function computeAnomalyScore(
  trees: IsolationTreeNode[],
  normalizedPoint: number[],
  n: number,
): number {
  let totalPathLength = 0;

  for (const tree of trees) {
    totalPathLength += getPathLength(tree, normalizedPoint, 0);
  }

  const avgPathLength = totalPathLength / trees.length;
  const cn = c(n);

  if (cn === 0) return 0;

  return Math.pow(2, -avgPathLength / cn);
}

function computeFeatureDeviations(
  observation: number[],
  mean: number[],
  std: number[],
): Record<string, number> {
  const featureNames = ["production", "pressure", "temperature", "flow_rate"];
  const deviations: Record<string, number> = {};

  for (let f = 0; f < featureNames.length; f++) {
    deviations[featureNames[f]] = (observation[f] - mean[f]) / std[f];
  }

  return deviations;
}

function computeContributingFeatures(
  deviations: Record<string, number>,
): Array<{ feature: string; deviation_from_mean: number; rank: number }> {
  const entries = Object.entries(deviations).map(([feature, deviation]) => ({
    feature,
    deviation_from_mean: deviation,
    absDeviation: Math.abs(deviation),
  }));

  entries.sort((a, b) => b.absDeviation - a.absDeviation);

  return entries.map((entry, idx) => ({
    feature: entry.feature,
    deviation_from_mean: entry.deviation_from_mean,
    rank: idx + 1,
  }));
}

function validateTrainingData(data: TrainingData): void {
  const n = data.timestamps.length;
  if (
    data.production.length !== n ||
    data.pressure.length !== n ||
    data.temperature.length !== n ||
    data.flow_rate.length !== n
  ) {
    throw new Error("All fields in TrainingData must have the same length");
  }

  if (n === 0) {
    throw new Error("TrainingData must contain at least one observation");
  }
}

function normalizeObservation(
  observation: { production: number; pressure: number; temperature: number; flow_rate: number },
  mean: number[],
  std: number[],
): number[] {
  const features = [observation.production, observation.pressure, observation.temperature, observation.flow_rate];
  return features.map((val, f) => (val - mean[f]) / std[f]);
}

export function trainIsolationForest(
  trainingData: TrainingData,
  config: IsolationForestConfig = DEFAULT_CONFIG,
): IsolationForestModel {
  validateTrainingData(trainingData);

  const features = extractFeatures(trainingData);
  const { mean, std } = computeStats(features);
  const normalizedData = normalizeFeatures(features, mean, std);
  const n = normalizedData.length;
  const sampleSize = Math.min(config.sample_size, n);
  let trees = buildForest(normalizedData, sampleSize, config.num_trees);

  const model: IsolationForestModel = {
    score(observation: { production: number; pressure: number; temperature: number; flow_rate: number }): AnomalyScoreResult {
      const normalizedPoint = normalizeObservation(observation, mean, std);
      const anomalyScore = computeAnomalyScore(trees, normalizedPoint, n);
      const isAnomalous = anomalyScore >= config.contamination;
      const severity = getSeverityLevel(anomalyScore);

      const obsFeatures = [observation.production, observation.pressure, observation.temperature, observation.flow_rate];
      const deviations = computeFeatureDeviations(obsFeatures, mean, std);
      const contributingFeatures = computeContributingFeatures(deviations);
      const explanation = generateExplanation(deviations, anomalyScore);

      return {
        anomaly_score: anomalyScore,
        is_anomalous: isAnomalous,
        anomaly_severity: severity,
        contributing_features: contributingFeatures,
        explanation,
      };
    },

    retrain(newData: TrainingData): void {
      validateTrainingData(newData);

      const newFeatures = extractFeatures(newData);
      const newN = newFeatures.length;
      const newMean: number[] = [];
      const newStd: number[] = [];

      for (let f = 0; f < 4; f++) {
        let sum = 0;
        for (let i = 0; i < newN; i++) {
          sum += newFeatures[i][f];
        }
        newMean.push(sum / newN);

        let sqDiffSum = 0;
        for (let i = 0; i < newN; i++) {
          const diff = newFeatures[i][f] - newMean[f];
          sqDiffSum += diff * diff;
        }
        newStd.push(Math.sqrt(sqDiffSum / newN) || 1);
      }

      const newNormalized = normalizeFeatures(newFeatures, newMean, newStd);
      const newSampleSize = Math.min(config.sample_size, newN);
      trees = buildForest(newNormalized, newSampleSize, config.num_trees);
    },
  };

  return model;
}

export function scoreAnomaly(
  model: IsolationForestModel,
  observation: { production: number; pressure: number; temperature: number; flow_rate: number },
  threshold: number = 0.7,
): AnomalyScoreResult {
  const result = model.score(observation);
  return {
    ...result,
    is_anomalous: result.anomaly_score >= threshold,
  };
}

export function evaluateAnomalyDetector(
  model: IsolationForestModel,
  testData: TrainingData,
  knownAnomalies: Array<{ startIdx: number; endIdx: number }>,
  threshold: number = 0.7,
): AnomalyDetectionMetrics {
  validateTrainingData(testData);

  const n = testData.production.length;
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  const isAnomaly = (idx: number): boolean => {
    for (const window of knownAnomalies) {
      if (idx >= window.startIdx && idx <= window.endIdx) return true;
    }
    return false;
  };

  for (let i = 0; i < n; i++) {
    const result = model.score({
      production: testData.production[i],
      pressure: testData.pressure[i],
      temperature: testData.temperature[i],
      flow_rate: testData.flow_rate[i],
    });

    const predicted = result.anomaly_score >= threshold;
    const actual = isAnomaly(i);

    if (predicted && actual) tp++;
    else if (predicted && !actual) fp++;
    else if (!predicted && !actual) tn++;
    else fn++;
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const falsePositiveRate = fp + tn > 0 ? fp / (fp + tn) : 0;

  const numSteps = 50;
  const tprPoints: Array<{ tpr: number; fpr: number }> = [];

  for (let step = 0; step <= numSteps; step++) {
    const t = step / numSteps;
    let stepTp = 0;
    let stepFp = 0;
    let stepFn = 0;
    let stepTn = 0;

    for (let i = 0; i < n; i++) {
      const result = model.score({
        production: testData.production[i],
        pressure: testData.pressure[i],
        temperature: testData.temperature[i],
        flow_rate: testData.flow_rate[i],
      });

      const predicted = result.anomaly_score >= t;
      const actual = isAnomaly(i);

      if (predicted && actual) stepTp++;
      else if (predicted && !actual) stepFp++;
      else if (!predicted && !actual) stepTn++;
      else stepFn++;
    }

    const tpr = stepTp + stepFn > 0 ? stepTp / (stepTp + stepFn) : 0;
    const fpr = stepFp + stepTn > 0 ? stepFp / (stepFp + stepTn) : 0;
    tprPoints.push({ tpr, fpr });
  }

  tprPoints.sort((a, b) => a.fpr - b.fpr);

  let rocAuc = 0;
  for (let i = 1; i < tprPoints.length; i++) {
    const dx = tprPoints[i].fpr - tprPoints[i - 1].fpr;
    const avgY = (tprPoints[i].tpr + tprPoints[i - 1].tpr) / 2;
    rocAuc += dx * avgY;
  }

  return {
    precision,
    recall,
    f1_score: f1Score,
    false_positive_rate: falsePositiveRate,
    roc_auc: rocAuc,
  };
}
