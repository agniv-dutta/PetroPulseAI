from typing import Literal

from pydantic import BaseModel, ConfigDict


class ForecastMetricsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    horizon: str
    mae: float
    rmse: float
    r2: float
    mape: float


class AnomalyMetricsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    precision: float
    recall: float
    f1: float
    accuracy: float
    roc_auc: float
    true_positives: int
    false_positives: int
    false_negatives: int
    true_negatives: int