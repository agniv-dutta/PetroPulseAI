"""Performance metrics calculation for ML models."""

import numpy as np
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    mean_absolute_percentage_error,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
)


class PerformanceMetrics:
    """Calculator for ML model performance metrics."""

    @staticmethod
    def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
        """Calculate regression metrics."""
        return {
            "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 4),
            "r2": round(float(r2_score(y_true, y_pred)), 4),
            "mape": round(float(mean_absolute_percentage_error(y_true, y_pred) * 100), 4),
            "max_error": round(float(np.max(np.abs(y_true - y_pred))), 4),
            "mean_error": round(float(np.mean(y_true - y_pred)), 4),
        }

    @staticmethod
    def classification_metrics(
        y_true: np.ndarray,
        y_pred: np.ndarray,
        y_scores: np.ndarray | None = None,
    ) -> dict[str, float]:
        """Calculate classification metrics."""
        metrics = {
            "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
        }

        if y_scores is not None:
            try:
                metrics["roc_auc"] = round(float(roc_auc_score(y_true, y_scores)), 4)
            except ValueError:
                metrics["roc_auc"] = 0.5

        # Confusion matrix
        cm = confusion_matrix(y_true, y_pred)
        if cm.shape == (2, 2):
            tn, fp, fn, tp = cm.ravel()
            metrics["true_negatives"] = int(tn)
            metrics["false_positives"] = int(fp)
            metrics["false_negatives"] = int(fn)
            metrics["true_positives"] = int(tp)
            metrics["accuracy"] = round(float((tp + tn) / (tp + tn + fp + fn)), 4)
            metrics["false_positive_rate"] = round(float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0, 4)

        return metrics

    @staticmethod
    def forecast_accuracy(
        actual: list[float],
        forecast: list[float],
        horizons_days: list[int] = [30, 90, 180],
    ) -> dict[str, dict[str, float]]:
        """Calculate forecast accuracy at different horizons."""
        results = {}
        days_per_month = 30.44

        for horizon in horizons_days:
            months = max(1, round(horizon / days_per_month))
            if len(forecast) >= months and len(actual) >= months:
                actual_slice = actual[:months]
                forecast_slice = forecast[:months]
                metrics = PerformanceMetrics.regression_metrics(
                    np.array(actual_slice),
                    np.array(forecast_slice),
                )
                results[f"{horizon}d"] = metrics

        return results

    @staticmethod
    def anomaly_detection_metrics(
        true_anomalies: list[bool],
        predicted_anomalies: list[bool],
        anomaly_scores: list[float] | None = None,
    ) -> dict[str, float]:
        """Calculate anomaly detection metrics."""
        y_true = np.array(true_anomalies, dtype=int)
        y_pred = np.array(predicted_anomalies, dtype=int)

        metrics = PerformanceMetrics.classification_metrics(
            y_true,
            y_pred,
            np.array(anomaly_scores) if anomaly_scores else None,
        )

        return metrics

    @staticmethod
    def calculate_residuals(actual: list[float], predicted: list[float]) -> dict[str, float]:
        """Calculate residual statistics."""
        residuals = np.array(actual) - np.array(predicted)
        return {
            "mean": round(float(np.mean(residuals)), 4),
            "std": round(float(np.std(residuals)), 4),
            "min": round(float(np.min(residuals)), 4),
            "max": round(float(np.max(residuals)), 4),
            "median": round(float(np.median(residuals)), 4),
            "q25": round(float(np.percentile(residuals, 25)), 4),
            "q75": round(float(np.percentile(residuals, 75)), 4),
        }

    @staticmethod
    def calculate_bias(actual: list[float], predicted: list[float]) -> dict[str, float]:
        """Calculate forecast bias metrics."""
        actual_arr = np.array(actual)
        predicted_arr = np.array(predicted)
        
        percentage_errors = ((predicted_arr - actual_arr) / np.maximum(actual_arr, 1e-9)) * 100
        
        return {
            "mean_bias_pct": round(float(np.mean(percentage_errors)), 4),
            "median_bias_pct": round(float(np.median(percentage_errors)), 4),
            "positive_bias_pct": round(float(np.sum(percentage_errors > 0) / len(percentage_errors) * 100), 4),
            "negative_bias_pct": round(float(np.sum(percentage_errors < 0) / len(percentage_errors) * 100), 4),
        }
