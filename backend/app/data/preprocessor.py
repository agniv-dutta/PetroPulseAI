"""Data preprocessor for cleaning and transforming production data."""

import numpy as np
import pandas as pd
from typing import Optional, Tuple

from app.utils.logger import logger


class DataPreprocessor:
    """Preprocessor for production data cleaning and transformation."""

    @staticmethod
    def clean_production_data(df: pd.DataFrame) -> pd.DataFrame:
        """Clean production data by handling missing values and outliers."""
        if df.empty:
            return df
        
        df_clean = df.copy()
        
        # Handle missing values
        df_clean["oil_bbl_d"] = df_clean["oil_bbl_d"].fillna(0)
        df_clean["expected_bbl_d"] = df_clean["expected_bbl_d"].fillna(df_clean["oil_bbl_d"])
        df_clean["gas_mmcf_d"] = df_clean["gas_mmcf_d"].fillna(0)
        df_clean["water_cut_pct"] = df_clean["water_cut_pct"].fillna(0)
        
        # Remove negative values (physically impossible)
        df_clean["oil_bbl_d"] = df_clean["oil_bbl_d"].clip(lower=0)
        df_clean["gas_mmcf_d"] = df_clean["gas_mmcf_d"].clip(lower=0)
        df_clean["water_cut_pct"] = df_clean["water_cut_pct"].clip(lower=0, upper=100)
        
        # Handle extreme outliers using IQR method
        for col in ["oil_bbl_d", "gas_mmcf_d"]:
            if col in df_clean.columns:
                Q1 = df_clean[col].quantile(0.25)
                Q3 = df_clean[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 3 * IQR
                upper_bound = Q3 + 3 * IQR
                df_clean[col] = df_clean[col].clip(lower=lower_bound, upper=upper_bound)
        
        logger.info(f"Cleaned production data: {len(df_clean)} records")
        return df_clean

    @staticmethod
    def add_derived_features(df: pd.DataFrame) -> pd.DataFrame:
        """Add derived features for ML models."""
        if df.empty:
            return df
        
        df_features = df.copy()
        
        # Sort by period to ensure correct lag calculations
        df_features = df_features.sort_values("period")
        
        # Time-based features
        df_features["month"] = df_features["period"].dt.month
        df_features["quarter"] = df_features["period"].dt.quarter
        df_features["year"] = df_features["period"].dt.year
        
        # Production change features
        df_features["production_change"] = df_features["oil_bbl_d"].pct_change()
        df_features["production_change_abs"] = df_features["oil_bbl_d"].diff()
        
        # Rolling statistics
        df_features["rolling_mean_3"] = df_features["oil_bbl_d"].rolling(window=3, min_periods=1).mean()
        df_features["rolling_mean_6"] = df_features["oil_bbl_d"].rolling(window=6, min_periods=1).mean()
        df_features["rolling_std_3"] = df_features["oil_bbl_d"].rolling(window=3, min_periods=1).std()
        
        # Gap between actual and expected
        df_features["production_gap"] = (
            (df_features["oil_bbl_d"] - df_features["expected_bbl_d"]) / 
            df_features["expected_bbl_d"].replace(0, np.nan)
        )
        
        # Water cut change
        df_features["water_cut_change"] = df_features["water_cut_pct"].diff()
        
        # Fill NaN values created by lag/diff operations
        df_features = df_features.fillna(method="bfill").fillna(method="ffill")
        
        logger.info(f"Added derived features to {len(df_features)} records")
        return df_features

    @staticmethod
    def normalize_features(df: pd.DataFrame, feature_columns: list[str]) -> Tuple[pd.DataFrame, dict]:
        """Normalize specified features using min-max scaling."""
        if df.empty:
            return df, {}
        
        df_normalized = df.copy()
        scaling_params = {}
        
        for col in feature_columns:
            if col in df_normalized.columns:
                min_val = df_normalized[col].min()
                max_val = df_normalized[col].max()
                
                if max_val - min_val > 0:
                    df_normalized[f"{col}_normalized"] = (
                        (df_normalized[col] - min_val) / (max_val - min_val)
                    )
                    scaling_params[col] = {"min": min_val, "max": max_val}
                else:
                    df_normalized[f"{col}_normalized"] = 0.0
                    scaling_params[col] = {"min": min_val, "max": max_val}
        
        logger.info(f"Normalized {len(feature_columns)} features")
        return df_normalized, scaling_params

    @staticmethod
    def create_lag_features(df: pd.DataFrame, lags: list[int] = [1, 2, 3, 6, 12]) -> pd.DataFrame:
        """Create lag features for time series analysis."""
        if df.empty:
            return df
        
        df_lags = df.copy()
        df_lags = df_lags.sort_values("period")
        
        for lag in lags:
            df_lags[f"oil_bbl_d_lag_{lag}"] = df_lags["oil_bbl_d"].shift(lag)
            df_lags[f"production_gap_lag_{lag}"] = df_lags.get("production_gap", pd.Series()).shift(lag)
        
        # Fill NaN values created by shifting
        df_lags = df_lags.fillna(method="bfill").fillna(method="ffill")
        
        logger.info(f"Created lag features for lags: {lags}")
        return df_lags

    @staticmethod
    def filter_by_date_range(
        df: pd.DataFrame,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> pd.DataFrame:
        """Filter DataFrame by date range."""
        if df.empty:
            return df
        
        df_filtered = df.copy()
        
        if start_date:
            df_filtered = df_filtered[df_filtered["period"] >= pd.to_datetime(start_date)]
        if end_date:
            df_filtered = df_filtered[df_filtered["period"] <= pd.to_datetime(end_date)]
        
        logger.info(f"Filtered data to {len(df_filtered)} records by date range")
        return df_filtered

    @staticmethod
    def aggregate_to_monthly(df: pd.DataFrame) -> pd.DataFrame:
        """Aggregate daily data to monthly averages."""
        if df.empty:
            return df
        
        # Ensure period column is datetime
        df["period"] = pd.to_datetime(df["period"])
        
        # Create month identifier
        df["year_month"] = df["period"].dt.to_period("M")
        
        # Aggregate
        df_monthly = df.groupby("year_month").agg({
            "oil_bbl_d": "mean",
            "expected_bbl_d": "mean",
            "gas_mmcf_d": "mean",
            "water_cut_pct": "mean",
        }).reset_index()
        
        # Convert back to date
        df_monthly["period"] = df_monthly["year_month"].dt.to_timestamp()
        df_monthly = df_monthly.drop(columns=["year_month"])
        
        logger.info(f"Aggregated to {len(df_monthly)} monthly records")
        return df_monthly

    @staticmethod
    def handle_missing_periods(df: pd.DataFrame, freq: str = "MS") -> pd.DataFrame:
        """Fill missing periods with interpolated values."""
        if df.empty:
            return df
        
        df_complete = df.copy()
        df_complete = df_complete.sort_values("period")
        
        # Create complete date range
        date_range = pd.date_range(
            start=df_complete["period"].min(),
            end=df_complete["period"].max(),
            freq=freq,
        )
        
        # Reindex to include all periods
        df_complete = df_complete.set_index("period").reindex(date_range)
        
        # Interpolate missing values
        numeric_columns = df_complete.select_dtypes(include=[np.number]).columns
        df_complete[numeric_columns] = df_complete[numeric_columns].interpolate(method="linear")
        
        # Reset index
        df_complete = df_complete.reset_index().rename(columns={"index": "period"})
        
        logger.info(f"Filled missing periods: {len(df_complete)} total records")
        return df_complete
