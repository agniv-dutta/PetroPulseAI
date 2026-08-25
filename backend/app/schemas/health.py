from typing import Literal

from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: Literal["healthy", "unhealthy"]
    service: str
    version: str
    database_connected: bool
    redis_connected: bool
    timestamp: str
