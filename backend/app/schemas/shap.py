from typing import List

from pydantic import BaseModel, ConfigDict


class SHAPFeature(BaseModel):
    feature: str
    value: float
    importance: float


class SHAPExplanationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    forecast_run_id: int
    shap_values: List[SHAPFeature]
    feature_names: List[str]
    base_value: float