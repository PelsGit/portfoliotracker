from datetime import datetime

from pydantic import BaseModel


class PriceRefreshResponse(BaseModel):
    status: str
    securities_count: int


class PriceStatusResponse(BaseModel):
    refreshing: bool
    last_refresh: datetime | None
    securities_count: int
