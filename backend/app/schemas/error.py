from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict


class ErrorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    error: str
    message: str
    status_code: int
    details: Optional[Dict[str, Any]] = None