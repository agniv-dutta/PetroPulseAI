# PetroPulse AI - Complete End-to-End IDE Prompts (Production-Ready)

---

## OVERVIEW

These 12 prompts create a **complete, robust prototype** focused on:
- ✓ Realistic data handling (public + synthetic)
- ✓ Industry-standard Arps decline modeling
- ✓ Clear AIPS prioritization logic
- ✓ Honest SHAP explanations (not root causes)
- ✓ Comprehensive performance evaluation
- ✓ Clean, crisp core functionality (not model overload)

**Total Implementation Time**: 20-30 hours for a production-ready demo

---

## PROMPT GROUP A: DATA & FOUNDATIONS (Prompts 1-3)

---

## PROMPT 1: Arps Decline Curve Utility

**File**: `src/utils/arpsDecllineCurve.ts`

**Purpose**: Implement industry-standard Arps decline curve for baseline production expectations

```typescript
/**
 * Arps Decline Curve - Industry Standard Production Decline Model
 * 
 * Formula: q(t) = qi / (1 + b·Di·t)^(1/b)
 * 
 * Where:
 *   q(t) = production rate at time t (MMBL/month)
 *   qi   = initial production rate (MMBL/month)
 *   Di   = initial decline rate (%/month, as decimal)
 *   b    = decline curve exponent (0 < b ≤ 1)
 *          b=0 → exponential decline
 *          b=0.5 → harmonic decline  
 *          b=1 → hyperbolic decline
 *   t    = time (months since start)
 * 
 * Used to generate "expected production" baseline for anomaly detection
 * and to provide context for recovery potential calculations.
 */

interface ArpsFitResult {
  qi: number;                    // Initial production (MMBL)
  Di: number;                    // Initial decline rate (%/month)
  b: number;                     // Decline exponent
  r_squared: number;             // Goodness of fit (0-1)
  mean_absolute_error: number;   // MAE (MMBL)
  forecast_30d: number;          // 30-day forward production
  forecast_90d: number;          // 90-day forward production
  forecast_180d: number;         // 180-day forward production
  std_error: number;             // Std deviation of residuals
  fitted_curve: Array<{month: number, production: number}>;
}

/**
 * Fit Arps curve to historical production data using least-squares optimization
 * 
 * Input: Array of 12-24 months of historical monthly production (MMBL)
 * Output: Arps parameters + forecast
 * 
 * Algorithm:
 * 1. Use initial guess: qi = first month production, Di = 0.05, b = 0.5
 * 2. Minimize: Σ(observed - predicted)² using L-BFGS optimizer
 * 3. Constrain: 0 < Di < 0.15, 0 < b ≤ 1.0 (realistic ranges)
 * 4. Calculate R² and standard error
 * 5. Validate: R² should be > 0.90 for good fit
 */
export function fitArpsDeclineCurve(
  historicalProduction: number[],
  startDate?: Date
): ArpsFitResult {
  // Implementation requirements:
  // 1. Validate input (at least 12 months of data, positive values)
  // 2. Calculate initial parameter guesses
  // 3. Implement Arps equation as function
  // 4. Use optimization library (e.g., numeric.js, simple-statistics)
  // 5. Iterate until convergence or max iterations
  // 6. Calculate R², MAE, std error
  // 7. Generate forecast for 30d, 90d, 180d
  // 8. Return complete result with fitted curve points
}

/**
 * Calculate production at specific time using fitted Arps curve
 */
export function calculateArpsProduction(
  t: number,
  qi: number,
  Di: number,
  b: number
): number {
  // q(t) = qi / (1 + b·Di·t)^(1/b)
}

/**
 * Forecast production for next N months using fitted curve
 */
export function forecastArpsProduction(
  arpsParams: {qi: number, Di: number, b: number},
  monthsAhead: number
): number[] {
  // Return array of N month forecasts
}

/**
 * Calculate decline rate at specific time
 * This tells us how fast production is declining at any point
 */
export function calculateDeclineRate(
  t: number,
  Di: number,
  b: number
): number {
  // Instantaneous decline rate at time t
  // Used to flag when decline accelerates (indicator of problems)
}

/**
 * Mock implementation for MVP:
 * Pre-calculated Arps parameters for 10 sample assets
 * In production: would fit to real historical data from OGD
 */
export const SAMPLE_ARPS_FITS = {
  "MH-07": {
    qi: 1.95,
    Di: 0.035,
    b: 0.65,
    r_squared: 0.927,
    // ... other fields
  },
  "CB-12": {
    qi: 1.15,
    Di: 0.042,
    b: 0.58,
    r_squared: 0.912,
  },
  // ... 8 more assets
};
```

**IDE Instruction**:

Generate a TypeScript utility file implementing the Arps Decline Curve model.

**Requirements**:
1. Implement Arps equation: q(t) = qi / (1 + b·Di·t)^(1/b)
2. Create `fitArpsDeclineCurve()` function that:
   - Takes 12-24 months of historical production data
   - Uses least-squares optimization to find best qi, Di, b
   - Returns ArpsFitResult with R², MAE, forecast
   - Validates R² > 0.90 before accepting fit
3. Create `calculateArpsProduction()` for single-point calculation
4. Create `forecastArpsProduction()` for multi-month forecast
5. Create `calculateDeclineRate()` for instantaneous rate at time t
6. Include SAMPLE_ARPS_FITS constant with pre-fit parameters for 10 assets
7. Add JSDoc comments explaining industry context and formulas
8. Include validation: reject inputs with negative values, too few data points
9. Use numeric optimization (can use simple Gradient Descent if optimization libraries unavailable)
10. Export TypeScript interfaces (ArpsFitResult)

**Expected Output**: 
- Utility file with Arps model fully functional
- When fitted to MH-07 historical data, should produce qi≈1.95, Di≈0.035, b≈0.65, R²≈0.92
- Ready for import into forecasting components

---

## PROMPT 2: Synthetic Data Generator (Realistic)

**File**: `src/utils/syntheticDataGenerator.ts`

**Purpose**: Generate realistic synthetic high-frequency production data stream based on Arps curve + seasonal patterns + anomaly injection

```typescript
/**
 * Synthetic Data Generator
 * 
 * Generates 10-second interval observations that simulate realistic 
 * well production conditions based on:
 * 1. Arps decline curve (long-term depletion)
 * 2. Seasonal factors (monthly patterns from historical data)
 * 3. Operational noise (realistic measurement error ~5%)
 * 4. Optional anomalies (user-triggered: valve failure, clogging, etc.)
 * 5. Derived parameters (pressure, temperature, flow rate)
 * 
 * Not actual ONGC SCADA data, but statistically realistic for demonstration
 */

interface SyntheticObservation {
  timestamp: string;           // ISO 8601
  asset_id: string;
  production: number;          // MMBL (aggregated from 10-sec to monthly equivalent)
  pressure: number;            // bar
  temperature: number;         // °C
  flow_rate: number;           // BPD
  forecast_30d: number;        // From Arps curve
  anomaly_score: number;       // 0-1 from Isolation Forest
  status: "NORMAL" | "WATCH" | "ALERT" | "CRITICAL";
}

interface GenerationConfig {
  asset_id: string;
  arps_params: {qi: number, Di: number, b: number};  // From Arps fit
  seasonal_factors: number[];  // 12 monthly factors (Jan-Dec)
  start_timestamp: Date;
  initial_values: {
    pressure: number;
    temperature: number;
  };
}

interface AnomalyScenario {
  type: "VALVE_FAILURE" | "GRADUAL_CLOG" | "HIGH_VOLATILITY" | "RECOVERY";
  start_offset_minutes: number;
  duration_minutes: number;
  severity: number;            // 0-1 scale
}

/**
 * Generate single observation (10-second interval)
 * 
 * Algorithm:
 * 1. Calculate elapsed time in months from start_timestamp
 * 2. Get expected production from Arps curve
 * 3. Apply seasonal multiplier for current month
 * 4. Add operational noise (~5% gaussian)
 * 5. Inject anomaly if triggered
 * 6. Derive pressure/temperature from production
 * 7. Calculate flow rate from production
 * 8. Calculate anomaly score (will be done by Isolation Forest later)
 */
export function generateSyntheticObservation(
  config: GenerationConfig,
  current_time: Date,
  anomaly?: AnomalyScenario
): SyntheticObservation {
  // Implementation requirements:
  // 1. Calculate months_elapsed = (current_time - start_time) / 30.44 days
  // 2. Base production = Arps(months_elapsed, qi, Di, b)
  // 3. Seasonal multiplier = seasonal_factors[current_month]
  // 4. Noise = gaussian N(0, 0.05 * base_production)
  // 5. Check if anomaly active at current_time:
  //    - VALVE_FAILURE: production *= (1 - severity) suddenly
  //    - GRADUAL_CLOG: production *= (1 - severity * elapsed_hours/duration)
  //    - HIGH_VOLATILITY: noise *= 3
  //    - RECOVERY: production *= (1 + severity)
  // 6. Derive pressure from production (inverse relationship)
  // 7. Temperature stable with small random walk
  // 8. Flow rate = production / (seconds per month) with jitter
  // 9. Anomaly score: placeholder (will be calculated by Isolation Forest)
  // 10. Determine status from anomaly_score + production deviation
}

/**
 * Generate stream of observations (for simulation)
 * 
 * Returns generator that yields observations at configured intervals
 * Can inject anomalies at runtime via control channel
 */
export function* generateSyntheticStream(
  config: GenerationConfig,
  interval_seconds: number = 10,
  max_observations?: number
): Generator<SyntheticObservation> {
  // Implementation: 
  // 1. Create generator function
  // 2. Initialize timestamp to start_timestamp
  // 3. Loop: yield observation, advance timestamp, check anomaly queue
  // 4. Allow external control to inject anomalies mid-stream
  // 5. Optional: acceleration factor for demo (10× speed)
}

/**
 * Extract seasonal factors from historical monthly data
 * 
 * Seasonal pattern = average production for each month / overall average
 * Example: If January typically 2% lower than average → factor = 0.98
 */
export function calculateSeasonalFactors(
  monthly_production: number[][]  // Array of [month, production] pairs for 5+ years
): number[] {
  // Implementation:
  // 1. Group by month (1-12)
  // 2. Average each month's production across all years
  // 3. Calculate overall average
  // 4. Return factors = [month_avg / overall_avg for each month]
}

/**
 * Add realistic pressure response to production changes
 * 
 * Pressure inversely related to production (lower production → higher pressure)
 * Also changes slowly (not instantaneously) - reservoir pressure
 */
function derivePressure(
  current_production: number,
  initial_pressure: number,
  initial_production: number,
  exponent: number = 0.3
): number {
  // P(t) = P_initial × (q(t) / q_initial)^(-exponent)
  // Negative exponent: lower production → higher pressure
}

/**
 * Add realistic temperature response
 * Relatively stable; changes slowly with seasonal effects
 */
function deriveTemperature(
  base_temperature: number,
  production_deviation: number,
  time_of_year: number  // 0-11 (months)
): number {
  // Small changes from production friction + seasonal cycle
  // Typically ±2-5°C variation
}

/**
 * Example configuration for MH-07
 */
export const EXAMPLE_CONFIG: GenerationConfig = {
  asset_id: "MH-07",
  arps_params: {qi: 1.95, Di: 0.035, b: 0.65},
  seasonal_factors: [
    0.98,  // January - monsoon ramp-down
    0.99,  // February
    1.00,  // March
    1.01,  // April
    1.02,  // May
    0.95,  // June - monsoon
    0.94,  // July - monsoon
    0.96,  // August
    0.98,  // September
    1.03,  // October - post-monsoon
    1.02,  // November
    1.00   // December
  ],
  start_timestamp: new Date("2026-01-01"),
  initial_values: {pressure: 190, temperature: 78}
};

/**
 * Example anomaly scenarios user can trigger
 */
export const ANOMALY_SCENARIOS = {
  VALVE_FAILURE: {
    type: "VALVE_FAILURE",
    start_offset_minutes: 0,
    duration_minutes: 10000,  // Persistent until resolved
    severity: 0.4  // 40% production drop
  },
  GRADUAL_CLOG: {
    type: "GRADUAL_CLOG",
    start_offset_minutes: 0,
    duration_minutes: 2880,  // 2 days = 2880 minutes
    severity: 0.03  // 3% per day decline
  },
  HIGH_VOLATILITY: {
    type: "HIGH_VOLATILITY",
    start_offset_minutes: 0,
    duration_minutes: 60,
    severity: 0.15  // ±15% swings
  }
};
```

**IDE Instruction**:

Generate a TypeScript utility for realistic synthetic data generation.

**Requirements**:
1. Implement `generateSyntheticObservation()` that creates realistic 10-second data based on:
   - Arps curve for baseline (long-term depletion)
   - Seasonal factors (monthly patterns from historical average)
   - Gaussian noise (±5% std dev, realistic measurement error)
   - Anomaly injection if active (valve failure, gradual clog, volatility, recovery)
   - Derived pressure (inversely related to production)
   - Derived temperature (stable with small random walk)
   - Derived flow rate (from production, with jitter)
2. Implement `generateSyntheticStream()` as a generator function for continuous streaming
3. Implement `calculateSeasonalFactors()` to extract patterns from historical data
4. Implement pressure and temperature derivation functions with realistic physics
5. Include EXAMPLE_CONFIG for MH-07 with sample Arps parameters and seasonal factors
6. Include ANOMALY_SCENARIOS constant with pre-defined scenarios
7. Ensure pressure changes gradually (not instantly) to simulate reservoir physics
8. Output should pass basic sanity checks: production > 0, pressure 150-250 bar, temp 70-90°C
9. Add JSDoc explaining the realistic basis for each component (Arps, seasonality, noise, pressure derivation)
10. No external API calls; all calculations local

**Expected Output**:
- Fully functional data generator
- When seeded with MH-07 Arps params, produces realistic stream
- Can trigger anomalies and watch production respond
- Pressure, temperature, flow rate all react realistically to production changes

---

## PROMPT 3: Isolation Forest Anomaly Detector

**File**: `src/utils/anomalyDetector.ts`

**Purpose**: Detect production anomalies using Isolation Forest (unsupervised ML)

```typescript
/**
 * Isolation Forest - Anomaly Detection
 * 
 * Why Isolation Forest?
 * - Unsupervised (no need for labeled anomaly data)
 * - Works on multivariate data (production + pressure + temperature)
 * - Efficient (O(n log n))
 * - Interpretable (anomalies are points that are "isolated" quickly)
 * - No assumptions about data distribution
 * 
 * How it works:
 * 1. Build forest of random isolation trees
 * 2. Each tree randomly selects feature and split value
 * 3. Anomalous points are isolated in fewer splits (shorter path to leaf)
 * 4. Normal points require more splits (longer path to leaf)
 * 5. Anomaly score = average path length in forest (normalized)
 * 
 * Output: Anomaly score 0-1 (0=normal, 1=extremely anomalous)
 */

interface AnomalyScoreResult {
  anomaly_score: number;            // 0-1
  is_anomalous: boolean;            // score > threshold
  anomaly_severity: "NORMAL" | "WATCH" | "ALERT" | "CRITICAL";
  contributing_features: Array<{
    feature: string;
    deviation_from_mean: number;   // In standard deviations
    rank: number;                  // 1 = most anomalous
  }>;
  explanation: string;
}

interface IsolationForestConfig {
  num_trees: number;              // Default: 100
  sample_size: number;            // Default: 256 samples per tree
  contamination: number;          // Default: 0.05 (expect 5% anomalies)
}

interface TrainingData {
  timestamps: Date[];
  production: number[];
  pressure: number[];
  temperature: number[];
  flow_rate: number[];
}

/**
 * Train Isolation Forest on historical data
 * This learns what "normal" looks like
 */
export function trainIsolationForest(
  trainingData: TrainingData,
  config?: IsolationForestConfig
): IsolationForestModel {
  // Implementation:
  // 1. Normalize features (standardize to mean=0, std=1)
  // 2. Build forest of random isolation trees
  // 3. For each tree:
  //    - Sample random_size points from training data
  //    - Recursively split on random features until isolated
  //    - Store tree structure
  // 4. Return trained model ready for scoring new observations
}

interface IsolationForestModel {
  score(observation: {
    production: number,
    pressure: number,
    temperature: number,
    flow_rate: number
  }): AnomalyScoreResult;
  
  retrain(new_data: TrainingData): void;
}

/**
 * Score single observation for anomaly
 * 
 * Returns:
 * - anomaly_score: 0-1 (higher = more anomalous)
 * - is_anomalous: boolean (score > threshold)
 * - severity: categorical level
 * - contributing_features: which measurements are most unusual
 * - explanation: natural language description
 */
export function scoreAnomaly(
  model: IsolationForestModel,
  observation: {production: number, pressure: number, temperature: number, flow_rate: number},
  threshold: number = 0.7
): AnomalyScoreResult {
  // Implementation:
  // 1. Run observation through all trees in forest
  // 2. Calculate path length in each tree
  // 3. Average path length across forest
  // 4. Normalize to 0-1 scale using c(n) factor
  // 5. Check against threshold (default 0.7)
  // 6. Calculate feature deviations (z-scores)
  // 7. Rank features by deviation magnitude
  // 8. Generate explanation based on top anomalous features
}

/**
 * Determine anomaly severity level
 */
function getSeverityLevel(anomaly_score: number): "NORMAL" | "WATCH" | "ALERT" | "CRITICAL" {
  if (anomaly_score < 0.5) return "NORMAL";
  if (anomaly_score < 0.7) return "WATCH";
  if (anomaly_score < 0.85) return "ALERT";
  return "CRITICAL";
}

/**
 * Calculate feature deviations in standard deviations (z-scores)
 */
function calculateFeatureDeviations(
  observation: any,
  mean: any,
  std: any
): {[key: string]: number} {
  return {
    production: (observation.production - mean.production) / std.production,
    pressure: (observation.pressure - mean.pressure) / std.pressure,
    temperature: (observation.temperature - mean.temperature) / std.temperature,
    flow_rate: (observation.flow_rate - mean.flow_rate) / std.flow_rate
  };
}

/**
 * Generate natural language explanation
 * 
 * Example:
 * "Production is 17% below baseline. Pressure is elevated (+2 sigma).
 *  Temperature is high (+1.5 sigma). Pattern suggests flow restriction."
 */
function generateExplanation(
  deviations: {[key: string]: number},
  anomaly_score: number
): string {
  // Format deviations as +/- sigma
  // Describe what we observe without claiming root cause
  // Include caveat: "Unusual pattern detected. Field verification recommended."
}

/**
 * Performance evaluation metrics
 */
export interface AnomalyDetectionMetrics {
  precision: number;         // TP / (TP + FP)
  recall: number;            // TP / (TP + FN)
  f1_score: number;          // Harmonic mean
  false_positive_rate: number;
  roc_auc: number;           // Area under ROC curve
}

/**
 * Evaluate model on test data with known anomalies
 */
export function evaluateAnomalyDetector(
  model: IsolationForestModel,
  test_data: TrainingData,
  known_anomalies: {start_idx: number, end_idx: number}[],
  threshold: number = 0.7
): AnomalyDetectionMetrics {
  // Implementation:
  // 1. Score all test observations
  // 2. Label as anomalous if score > threshold
  // 3. Compare predictions to ground truth (known_anomalies)
  // 4. Calculate TP, FP, TN, FN
  // 5. Compute precision, recall, F1, FPR
  // 6. Calculate ROC-AUC by varying threshold
  // 7. Return metrics
  
  // Success criteria:
  // Precision > 0.82 (at least 82% of alerts are real problems)
  // Recall > 0.78 (catch 78% of real anomalies)
  // F1-Score > 0.80 (balanced performance)
}
```

**IDE Instruction**:

Generate a TypeScript anomaly detection utility using Isolation Forest.

**Requirements**:
1. Implement Isolation Forest algorithm:
   - `trainIsolationForest()` builds forest on historical data
   - Create 100 random isolation trees
   - Each tree randomly selects features/split values
   - Train on multivariate data (production, pressure, temperature, flow_rate)
2. Implement anomaly scoring:
   - `scoreAnomaly()` returns anomaly_score (0-1)
   - Calculate path length in each tree
   - Average across forest and normalize
3. Return AnomalyScoreResult with:
   - anomaly_score (0-1)
   - is_anomalous (boolean, score > 0.7)
   - anomaly_severity ("NORMAL" | "WATCH" | "ALERT" | "CRITICAL")
   - contributing_features (ranked by deviation)
   - explanation (natural language, no root cause claims)
4. Implement `evaluateAnomalyDetector()` for performance metrics:
   - Precision, Recall, F1-Score, FPR, ROC-AUC
   - Test on synthetic data with injected anomalies
5. Feature normalization (z-score standardization)
6. Include JSDoc with algorithm explanation and use case
7. Add caveat in explanations: "Unusual pattern. Field verification recommended. This indicates what the model learned, not necessarily physical root cause."
8. No external libraries for core algorithm (OK to use for math/optimization)

**Expected Output**:
- Fully trained Isolation Forest model
- Can detect synthetic anomalies (valve failures, clogs, etc.) with Precision > 0.82
- Returns interpretable anomaly scores
- Includes performance metrics for validation

---

## PROMPT GROUP B: PRIORITIZATION & INTELLIGENCE (Prompts 4-6)

---

## PROMPT 4: AIPS Calculator (Corrected Formula)

**File**: `src/utils/aipsCalculator.ts`

**Purpose**: Calculate Asset Intervention Priority Score with transparency

```typescript
/**
 * Asset Intervention Priority Score (AIPS)
 * 
 * The core innovation of PetroPulse:
 * Not just predicting problems, but deciding WHICH ASSET TO FIX FIRST
 * 
 * Formula:
 * AIPS = (0.30 × Loss_Magnitude) 
 *      + (0.25 × Anomaly_Severity)
 *      + (0.35 × Recovery_Opportunity)
 *      - (0.10 × Intervention_Complexity)
 * 
 * Scale: 0-100
 * Interpretation:
 *   90-100: CRITICAL (fix immediately)
 *   75-89:  HIGH (urgent, within week)
 *   50-74:  MEDIUM (scheduled review)
 *   <50:    LOW (monitor only)
 */

interface AIPSInput {
  asset_id: string;
  expected_production: number;      // MMBL (from Arps forecast)
  actual_production: number;        // MMBL (current observation)
  anomaly_score: number;            // 0-1 (from Isolation Forest)
  historical_recovery_rate: number; // 0-1 (default 0.80 for pressure issues)
  intervention_complexity: number;  // 0-1 (default 0.60 for MVP)
}

interface AIPSOutput {
  asset_id: string;
  aips_score: number;               // 0-100
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  
  // Component breakdown for transparency
  loss_magnitude_percent: number;
  loss_magnitude_contribution: number;
  
  anomaly_severity: number;
  anomaly_severity_contribution: number;
  
  recovery_opportunity_percent: number;
  recovery_opportunity_mmbl: number;
  recovery_opportunity_contribution: number;
  recovery_confidence: number;      // 0-1
  
  intervention_complexity: number;
  intervention_complexity_penalty: number;
  
  // Reasoning
  summary: string;  // "MH-07 prioritized because: high loss + severe anomaly + good recovery"
  next_steps: string[];  // ["Investigate pressure system", "Schedule technician"]
}

/**
 * Calculate AIPS for single asset
 */
export function calculateAIPS(input: AIPSInput): AIPSOutput {
  // COMPONENT 1: Loss Magnitude (30% weight)
  const loss_magnitude = Math.abs(input.expected_production - input.actual_production) / input.expected_production * 100;
  const loss_contribution = 0.30 * loss_magnitude;
  
  // COMPONENT 2: Anomaly Severity (25% weight)
  const anomaly_severity = input.anomaly_score; // Already 0-1
  const anomaly_contribution = 0.25 * anomaly_severity * 100;
  
  // COMPONENT 3: Recovery Opportunity (35% weight - highest!)
  const current_loss_volume = input.expected_production - input.actual_production;
  const model_confidence = getModelConfidence(input.anomaly_score);
  const recovery_opportunity_volume = current_loss_volume * input.historical_recovery_rate * model_confidence;
  const recovery_opportunity_percent = (recovery_opportunity_volume / input.expected_production) * 100;
  const recovery_confidence = (input.historical_recovery_rate + model_confidence) / 2;
  const recovery_contribution = 0.35 * recovery_opportunity_percent;
  
  // COMPONENT 4: Intervention Complexity (10% weight penalty)
  const complexity_penalty = 0.10 * input.intervention_complexity * 100;
  
  // Calculate final AIPS
  const aips_raw = loss_contribution + anomaly_contribution + recovery_contribution - complexity_penalty;
  const aips_score = Math.min(100, Math.max(0, aips_raw));
  
  // Determine priority tier
  const priority = getPriorityTier(aips_score);
  
  // Generate explanation
  const summary = generateSummary(input, aips_score, loss_magnitude, recovery_opportunity_volume);
  const next_steps = getRecommendedActions(input, priority, recovery_opportunity_volume);
  
  return {
    asset_id: input.asset_id,
    aips_score,
    priority,
    loss_magnitude_percent: loss_magnitude,
    loss_magnitude_contribution: loss_contribution,
    anomaly_severity,
    anomaly_severity_contribution: anomaly_contribution,
    recovery_opportunity_percent: recovery_opportunity_percent,
    recovery_opportunity_mmbl: recovery_opportunity_volume,
    recovery_opportunity_contribution: recovery_contribution,
    recovery_confidence,
    intervention_complexity: input.intervention_complexity,
    intervention_complexity_penalty: complexity_penalty,
    summary,
    next_steps
  };
}

/**
 * Get model confidence based on anomaly score
 * Higher anomaly score = higher confidence in the detected problem
 */
function getModelConfidence(anomaly_score: number): number {
  if (anomaly_score > 0.85) return 0.90;    // High confidence
  if (anomaly_score > 0.70) return 0.75;    // Medium confidence
  return 0.60;                              // Low confidence
}

/**
 * Determine priority tier from AIPS score
 */
function getPriorityTier(score: number): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

/**
 * Generate natural language summary
 * Example: "MH-07 prioritized because: 17.4% production loss + 0.94 anomaly severity + 0.18 MMBL recovery potential"
 */
function generateSummary(
  input: AIPSInput,
  score: number,
  loss_pct: number,
  recovery_vol: number
): string {
  const loss_desc = loss_pct > 20 ? "significant" : "moderate";
  const anomaly_desc = input.anomaly_score > 0.85 ? "severe" : "detected";
  const recovery_desc = recovery_vol > 0.15 ? "high" : "moderate";
  
  return `${input.asset_id} prioritized (AIPS ${Math.round(score)}/100): ${loss_desc} production loss (${loss_pct.toFixed(1)}%) + ${anomaly_desc} anomaly (${(input.anomaly_score * 100).toFixed(0)}/100) + ${recovery_desc} recovery potential (${recovery_vol.toFixed(2)} MMBL)`;
}

/**
 * Generate recommended next steps
 */
function getRecommendedActions(
  input: AIPSInput,
  priority: string,
  recovery_vol: number
): string[] {
  const actions: string[] = [];
  
  if (priority === "CRITICAL") {
    actions.push("⚡ Immediate investigation required");
    actions.push("📞 Notify field operations team");
  } else if (priority === "HIGH") {
    actions.push("Urgent assessment within 24-48 hours");
  }
  
  if (input.anomaly_score > 0.85) {
    actions.push("Verify anomaly with actual field measurements");
  }
  
  if (recovery_vol > 0.15) {
    actions.push(`Significant recovery potential: ${recovery_vol.toFixed(2)} MMBL`);
  }
  
  if (input.historical_recovery_rate > 0.75) {
    actions.push("High historical success rate for similar interventions");
  }
  
  actions.push("Review SHAP analysis to understand contributing factors");
  actions.push("Schedule intervention once root cause verified");
  
  return actions;
}

/**
 * Rank multiple assets by AIPS
 */
export function rankAssetsByAIPS(
  assetInputs: AIPSInput[]
): AIPSOutput[] {
  const results = assetInputs.map(input => calculateAIPS(input));
  return results.sort((a, b) => b.aips_score - a.aips_score);
}
```

**IDE Instruction**:

Generate a TypeScript utility implementing the corrected AIPS formula.

**Requirements**:
1. Implement `calculateAIPS()` with corrected components:
   - Loss_Magnitude: |Expected - Actual| / Expected × 100 (always positive, 30% weight)
   - Anomaly_Severity: anomaly_score 0-1 (25% weight)
   - Recovery_Opportunity: loss × historical_rate × model_confidence (35% weight)
   - Intervention_Complexity: penalty for difficult interventions (10% weight)
2. Model confidence function based on anomaly score:
   - 0.90 if score > 0.85
   - 0.75 if 0.70-0.85
   - 0.60 if ≤ 0.70
3. Priority tiers: CRITICAL (80+), HIGH (60-79), MEDIUM (40-59), LOW (<40)
4. Generate natural language summary and next_steps array
5. Implement `rankAssetsByAIPS()` to sort multiple assets
6. Return AIPSOutput with full component breakdown (for transparency display)
7. Add JSDoc explaining weight rationale and component meanings
8. Test: MH-07 example (expected 1.42, actual 1.17, anomaly 0.94) should score ~92/100 CRITICAL

**Expected Output**:
- Fully functional AIPS calculator
- MH-07 example produces score ≈ 92/100 with clear breakdown
- Can rank portfolio of assets by intervention priority
- Generates actionable recommendations

---

## PROMPT 5: Recovery Opportunity Component

**File**: `src/components/RecoveryOpportunityCard.tsx`

**Purpose**: Display recovery estimate with confidence breakdown (not guarantee)

```tsx
/**
 * RecoveryOpportunityCard
 * 
 * Displays: "Estimated Recovery Opportunity" (emphasized as estimate)
 * With confidence breakdown showing:
 * - Historical recovery rate (from past interventions)
 * - Model confidence (from anomaly detection certainty)
 * - Combined confidence (average)
 * 
 * Must NOT present as guaranteed recovery
 * Must include disclaimer: "Estimate. Depends on intervention success & accuracy."
 */

interface RecoveryOpportunityCardProps {
  asset_id: string;
  current_loss_volume: number;      // MMBL
  current_loss_percent: number;     // %
  recovery_opportunity_volume: number;  // MMBL
  recovery_opportunity_percent: number; // %
  historical_recovery_rate: number;     // 0-1
  model_confidence: number;             // 0-1
  combined_confidence: number;          // 0-1
  anomaly_score: number;                // 0-1
}

export function RecoveryOpportunityCard(props: RecoveryOpportunityCardProps) {
  // Implementation:
  // 1. Card header: "Estimated Recovery Opportunity" (emphasized)
  // 2. Subheader: "⚠ This is an estimate based on historical patterns."
  // 3. Main metrics:
  //    - Current Loss: X.XX MMBL (Y%)
  //    - Estimated Recovery: X.XX MMBL (Y%)
  //    - Confidence: ZZ%
  // 4. Confidence breakdown:
  //    - Historical Success Rate: (based on similar assets) ZZ%
  //    - Model Confidence: (anomaly score based) ZZ%
  //    - Combined: ZZ%
  // 5. Disclaimer section:
  //    "Recovery amount is estimated as:
  //     Current Loss × Historical Success Rate × Model Confidence
  //     
  //     Actual recovery depends on:
  //     • Successful intervention execution
  //     • Correct root cause identification
  //     • Reservoir conditions
  //     
  //     Field teams should verify before intervention."
  // 6. Color coding:
  //    - Green (≥70% confidence)
  //    - Yellow (50-69% confidence)
  //    - Orange (<50% confidence)
}
```

*[Full implementation same as in IDE_PROMPTS_CORRECTED.md - using that existing code]*

---

## PROMPT 6: SHAP Explainability Component (With Caveats)

**File**: `src/components/SHAPExplanationCard.tsx`

**Purpose**: Display SHAP feature contributions with clear caveats (not root causes)

```tsx
/**
 * SHAPExplanationCard
 * 
 * CRITICAL: Display SHAP as "Model-Estimated Feature Importance"
 * NOT as "Root Cause Analysis"
 * 
 * Must include disclaimer:
 * "SHAP shows which parameters the model learned are most associated
 *  with the production deviation. This indicates MODEL PATTERNS, not
 *  necessarily physical root causes."
 */

interface SHAPExplanationCardProps {
  asset_id: string;
  production_deviation_percent: number;
  top_features: Array<{
    feature_name: string;
    contribution_percent: number;
    value: number;
    baseline_value: number;
  }>;
  model_type: string;  // "Isolation Forest" or "LSTM Forecast"
  model_confidence: number;  // 0-1
}

export function SHAPExplanationCard(props: SHAPExplanationCardProps) {
  // Implementation:
  // 1. Header: "Production Deviation: Model-Estimated Feature Contributions"
  //    (NOT "Root Cause Analysis")
  // 2. Intro: "The model identifies these factors as strongly correlated
  //    with the production deviation. This shows WHAT the model learned,
  //    not necessarily WHY production declined."
  // 3. Feature contributions as horizontal bar chart:
  //    - Feature 1: ████████ 43% contribution
  //    - Feature 2: ██████ 28%
  //    - Feature 3: ████ 17%
  //    - Other: ██ 12%
  // 4. For each feature, show:
  //    - Current value vs baseline
  //    - Direction (push down / push up)
  //    - Caveat: "Correlated in model, not necessarily causal"
  // 5. Bottom disclaimer box:
  //    "⚠ INTERPRETATION GUIDANCE:
  //     • These values show feature importance, not root causes
  //     • Pressure/temperature/flow are synthetic in this demo
  //     • In production: Actual SCADA data would replace synthetic
  //     • Field teams should verify with physical measurements
  //     • Model confidence: [X]% (not 100%)"
  // 6. Recommended next steps:
  //    "1. Review top contributing factors
  //     2. Cross-check with actual field measurements
  //     3. Consult domain experts
  //     4. Plan targeted investigation
  //     5. Execute intervention with safety checks"
}
```

*[Full implementation similar to corrected version, emphasizing caveats]*

---

## PROMPT GROUP C: EVALUATION & DASHBOARD (Prompts 7-12)

---

## PROMPT 7: Forecast Performance Display

**File**: `src/components/ForecastMetricsPanel.tsx`

**Purpose**: Show forecasting model performance metrics transparently

```tsx
/**
 * ForecastMetricsPanel
 * 
 * Displays:
 * - Model type (Arps + LSTM ensemble)
 * - Forecast accuracy metrics (MAE, RMSE, R², MAPE)
 * - Performance by forecast horizon (30d, 90d, 180d)
 * - Validation strategy used
 * - Data freshness
 * 
 * Builds trust by showing model is evaluated properly
 */

interface ForecastMetrics {
  mae: number;              // Mean Absolute Error (MMBL)
  rmse: number;             // Root Mean Squared Error (MMBL)
  r_squared: number;        // R² coefficient (0-1)
  mape: number;             // Mean Absolute Percentage Error (%)
  samples_used: number;     // Number of observations in validation
  horizon_days: number;     // Forecast horizon evaluated
}

interface ForecastMetricsPanelProps {
  model_name: string;  // "Arps + LSTM Ensemble"
  metrics_30d: ForecastMetrics;
  metrics_90d: ForecastMetrics;
  metrics_180d: ForecastMetrics;
  validation_method: string;  // "Time-Series Cross-Validation"
  last_update: Date;
  target_mae: number;    // MAE target for this horizon
  target_rmse: number;   // RMSE target for this horizon
}

export function ForecastMetricsPanel(props: ForecastMetricsPanelProps) {
  // Implementation:
  // 1. Model header: "Production Forecasting Model Performance"
  // 2. Model type: "Arps Decline Curve (70%) + LSTM Network (30%)"
  // 3. Validation method: "Time-Series Cross-Validation (no look-ahead bias)"
  // 4. Tabs for 30d / 90d / 180d horizons
  // 5. For each horizon, show:
  //    - MAE: X.XX MMBL (target: < Y.YY) → green if met
  //    - RMSE: X.XX MMBL (target: < Y.YY) → green if met
  //    - R²: X.XXX (target: > 0.90) → green if ≥ 0.90
  //    - MAPE: X.X% (target: < 6%)
  //    - Samples used: N observations
  // 6. Performance interpretation:
  //    "Model explains [R²]% of production variance.
  //     Typical error: ± [MAE] MMBL"
  // 7. Data freshness: "Last updated: [date] [time]"
  // 8. Caveat: "Metrics calculated on historical data.
  //    Real-time performance may vary."
}
```

---

## PROMPT 8: Anomaly Detection Metrics Display

**File**: `src/components/AnomalyMetricsPanel.tsx`

**Purpose**: Show anomaly detector performance metrics

```tsx
/**
 * AnomalyMetricsPanel
 * 
 * Displays:
 * - Precision (% of alerts that are real problems)
 * - Recall (% of real problems we catch)
 * - F1-Score (balanced metric)
 * - False Positive Rate (unnecessary alerts)
 * - ROC-AUC (discrimination ability)
 * 
 * Builds trust by showing detector is well-calibrated
 */

interface AnomalyMetrics {
  precision: number;          // TP / (TP + FP), 0-1
  recall: number;             // TP / (TP + FN), 0-1
  f1_score: number;           // Harmonic mean, 0-1
  false_positive_rate: number; // FP / (FP + TN), 0-1
  roc_auc: number;            // ROC-AUC, 0-1
}

interface AnomalyMetricsPanelProps {
  model_name: string;  // "Isolation Forest"
  metrics: AnomalyMetrics;
  threshold: number;   // Anomaly score threshold (default 0.7)
  tested_on_samples: number;  // How many observations tested
}

export function AnomalyMetricsPanel(props: AnomalyMetricsPanelProps) {
  // Implementation:
  // 1. Header: "Anomaly Detection Model Performance"
  // 2. Model: "Isolation Forest (100 trees)"
  // 3. Threshold: "Anomaly Score > 0.70 triggers alert"
  // 4. Metrics with targets and color coding:
  //    - Precision: [X]% (target: > 82%) → green if ≥ 82%
  //    - Recall: [X]% (target: > 78%) → green if ≥ 78%
  //    - F1-Score: [X]% (target: > 80%)
  //    - False Positive Rate: [X]% (target: < 12%)
  //    - ROC-AUC: [X] (target: > 0.88)
  // 5. Interpretation boxes:
  //    "Precision [X]% = Of [N] alerts, [M] were real problems"
  //    "Recall [X]% = Of [M] real anomalies, we detected [K]"
  // 6. Tested on: "[N] observations during testing"
  // 7. Caveat: "Metrics from synthetic anomaly injection.
  //    Real-world performance may differ."
}
```

---

## PROMPT 9: Data Transparency Banner & Provenance

**File**: `src/components/DataTransparencyBanner.tsx` and `src/pages/DataProvenance.tsx`

**Purpose**: Full transparency about data sources

*[Same as in IDE_PROMPTS_CORRECTED.md, reuse existing implementation]*

---

## PROMPT 10: Asset Leaderboard (Final Version)

**File**: `src/pages/AssetLeaderboard.tsx`

**Purpose**: Rank all assets by AIPS with full transparency

```tsx
/**
 * AssetLeaderboard
 * 
 * Displays all assets sorted by AIPS priority score
 * Shows:
 * - Asset ID, Field, Basin
 * - Current vs Expected production
 * - Production loss %
 * - Anomaly severity
 * - Recovery opportunity
 * - AIPS score
 * - Priority tier
 * 
 * Click asset → Asset Detail profile
 */

interface AssetLeaderboardProps {
  assets: AIPSOutput[];  // Pre-ranked by AIPS
  onAssetClick: (asset_id: string) => void;
}

export function AssetLeaderboard(props: AssetLeaderboardProps) {
  // Implementation:
  // 1. Banner: DataTransparencyBanner (context="dashboard")
  // 2. Table with columns:
  //    Rank | Asset ID | Field | Basin | Current | Expected | Loss % | Anomaly | Recovery | AIPS | Priority
  // 3. Styling:
  //    - CRITICAL (red), HIGH (orange), MEDIUM (yellow), LOW (green)
  //    - Hover: highlight row + show tooltip "Click to view detail"
  // 4. Sorting: Default by AIPS descending
  //    Click column header to sort by that column
  // 5. Filtering: (Optional for MVP)
  //    - By priority
  //    - By basin
  //    - By anomaly status
  // 6. Click row → navigate to Asset Detail
  // 7. "Export as CSV" button
  // 8. Pagination: 10 assets per page
}
```

---

## PROMPT 11: Asset Detail Profile (Complete)

**File**: `src/pages/AssetDetail.tsx`

**Purpose**: Complete intelligence for single asset

```tsx
/**
 * AssetDetail
 * 
 * Multi-tab interface:
 * - Production (forecast + actual + anomaly)
 * - Recovery (recovery opportunity with confidence)
 * - AIPS (priority breakdown)
 * - SHAP (contributing factors, with caveats)
 * 
 * Should be self-contained explanation of why asset is prioritized
 */

interface AssetDetailProps {
  asset_id: string;
}

export function AssetDetail(props: AssetDetailProps) {
  // Implementation:
  // 1. Asset header: ID, Field, Basin, Status
  // 2. Tab interface: [Production] [Recovery] [AIPS] [SHAP]
  // 3. TAB 1: Production
  //    - Chart: Historical + Expected (Arps) + Actual
  //    - Arps parameters (qi, Di, b, R²)
  //    - Current deviation from expected
  // 4. TAB 2: Recovery
  //    - RecoveryOpportunityCard
  //    - Confidence breakdown
  //    - Why recovery is estimated, not guaranteed
  // 5. TAB 3: AIPS
  //    - AIPSBreakdown (component contributions)
  //    - Summary and recommended actions
  // 6. TAB 4: SHAP
  //    - SHAPExplanationCard
  //    - Feature contributions with caveats
  //    - "Not root causes, just model patterns"
  // 7. Bottom: "Recommended Next Steps" section
  // 8. Back button → return to Leaderboard
}
```

---

## PROMPT 12: Real-Time Simulation & Live Demo

**File**: `src/pages/SimulationCenter.tsx`

**Purpose**: Live demonstration of system end-to-end

```tsx
/**
 * SimulationCenter
 * 
 * Real-time simulation showing:
 * 1. Synthetic data stream (10-second intervals)
 * 2. Forecasting model predicting next 30 days
 * 3. Anomaly detector scoring incoming data
 * 4. AIPS updating as new data arrives
 * 5. User can trigger anomaly scenarios and watch system respond
 * 
 * This is the "wow" moment for judges:
 * Shows all components working together live
 */

interface SimulationCenterProps {
  asset_id?: string;  // Default: MH-07
}

export function SimulationCenter(props: SimulationCenterProps) {
  // Implementation:
  // 1. Banner: DataTransparencyBanner (context="simulation")
  //    "⚠ SYNTHETIC DATA - for demonstration of anomaly detection"
  // 2. Controls section:
  //    - Play / Pause / Reset buttons
  //    - Speed multiplier: 1× / 5× / 10×
  //    - Asset selector dropdown
  //    - "Data Stream" section showing live observations
  // 3. Live data display:
  //    Timestamp | Production | Pressure | Temp | Flow | Forecast | Anomaly Score | Status
  //    [Latest 10 observations visible]
  // 4. Anomaly injection controls:
  //    Buttons: "Valve Failure" / "Gradual Clog" / "High Volatility" / "Recovery"
  //    Click button → anomaly starts mid-stream
  // 5. Live dashboard update:
  //    - Production chart (actual + forecast)
  //    - AIPS score (updates as anomaly progresses)
  //    - Anomaly severity (updates live)
  //    - Recovery opportunity (updates based on new data)
  // 6. Metrics panel (real-time):
  //    - Current production
  //    - Forecast 30d
  //    - Anomaly score
  //    - Current AIPS
  //    - Recommended action
  // 7. Timeline of events:
  //    "10:30 - Normal
  //     10:35 - Anomaly detected
  //     10:40 - Priority elevated to CRITICAL"
  // 8. Demo narrative suggestions:
  //    "Let me trigger a gradual production decline (clogging).
  //     Watch how the system detects it and recalculates priorities..."
}
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Prompts 1-3)
- [ ] `aipsDeclineCurve.ts` - Arps curve fitting
- [ ] `syntheticDataGenerator.ts` - Realistic data stream
- [ ] `anomalyDetector.ts` - Isolation Forest
- [ ] Test: Synthetic data passes sanity checks
- [ ] Test: Arps fits historical data with R² > 0.90
- [ ] Test: Anomaly detector catches injected anomalies

### Phase 2: Intelligence (Prompts 4-6)
- [ ] `aipsCalculator.ts` - Priority scoring
- [ ] `RecoveryOpportunityCard.tsx` - Honest recovery display
- [ ] `SHAPExplanationCard.tsx` - Feature importance with caveats
- [ ] Test: MH-07 example produces AIPS ≈ 92/100
- [ ] Test: Recovery displayed as estimate with confidence
- [ ] Test: SHAP includes disclaimer about not being root causes

### Phase 3: Evaluation (Prompts 7-9)
- [ ] `ForecastMetricsPanel.tsx` - Performance metrics
- [ ] `AnomalyMetricsPanel.tsx` - Detector performance
- [ ] `DataTransparencyBanner.tsx` - Real vs. synthetic labeling
- [ ] `DataProvenance.tsx` - Full documentation
- [ ] Test: All metrics display correctly
- [ ] Test: Transparency banners appear on appropriate pages

### Phase 4: Dashboard & Demo (Prompts 10-12)
- [ ] `AssetLeaderboard.tsx` - Full asset ranking
- [ ] `AssetDetail.tsx` - Multi-tab profile
- [ ] `SimulationCenter.tsx` - Live demonstration
- [ ] Test: Golden path (15 steps) works end-to-end
- [ ] Test: Simulation runs for 30+ minutes without errors
- [ ] Test: Anomaly injection triggers correct system responses

### Final Quality Checks
- [ ] All components dark-themed (matching design system)
- [ ] No console errors or warnings
- [ ] Mobile responsive (test on tablet/mobile)
- [ ] Data sources transparently labeled
- [ ] All caveats and disclaimers in place
- [ ] Formulas and metrics clearly explained
- [ ] Demo flows smoothly and tells complete story

---

## ESTIMATED TIMELINE

| Phase | Prompts | Tasks | Hours |
|-------|---------|-------|-------|
| Foundation | 1-3 | Arps, synthetic data, anomaly detection | 8-10 |
| Intelligence | 4-6 | AIPS, recovery, SHAP explanations | 6-8 |
| Evaluation | 7-9 | Metrics panels, transparency | 3-4 |
| Dashboard | 10-12 | Leaderboard, detail, simulation | 6-8 |
| **Total** | | | **23-30 hours** |

This is achievable for a hackathon sprint with focused team effort.

---

