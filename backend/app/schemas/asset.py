from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class AssetBase(BaseModel):
    name: str = Field(..., max_length=100)
    field: str = Field(..., max_length=100)
    basin: str = Field(..., max_length=100)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    onstream_year: int = Field(..., ge=1900, le=2100)
    baseline_qi: float = Field(..., gt=0)
    baseline_di: float = Field(..., gt=0, le=1)
    baseline_b: float = Field(..., gt=0, le=2)
    operating_cost_usd_m: float = Field(default=1.0, ge=0)
    intervention_cost_usd_m: float = Field(default=1.0, ge=0)


class AssetCreate(AssetBase):
    id: str = Field(..., max_length=50)


class AssetUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    field: Optional[str] = Field(None, max_length=100)
    basin: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    status: Optional[str] = Field(None, pattern="^(ACTIVE|INACTIVE|SHUT_IN)$")
    baseline_qi: Optional[float] = Field(None, gt=0)
    baseline_di: Optional[float] = Field(None, gt=0, le=1)
    baseline_b: Optional[float] = Field(None, gt=0, le=2)
    operating_cost_usd_m: Optional[float] = Field(None, ge=0)
    intervention_cost_usd_m: Optional[float] = Field(None, ge=0)


class AssetResponse(AssetBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    created_at: str
    updated_at: str


class MonthlyProductionBase(BaseModel):
    period: date
    oil_bbl_d: float = Field(..., ge=0)
    expected_bbl_d: float = Field(..., ge=0)
    gas_mmcf_d: float = Field(default=0.0, ge=0)
    water_cut_pct: float = Field(default=0.0, ge=0, le=100)
    data_class: str = Field(default="SYNTHETIC", pattern="^(REAL|SYNTHETIC|DERIVED)$")
    provenance_source: Optional[str] = Field(None, max_length=200)


class MonthlyProductionCreate(MonthlyProductionBase):
    asset_id: str


class MonthlyProductionResponse(MonthlyProductionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: str
    created_at: str