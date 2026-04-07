from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class HoldingOut(BaseModel):
    isin: str
    product_name: str | None = None
    shares: Decimal
    avg_cost: Decimal
    current_price: Decimal | None = None
    value: Decimal | None = None
    cost_basis: Decimal
    return_eur: Decimal | None = None
    return_pct: Decimal | None = None
    weight: Decimal | None = None

    model_config = {"from_attributes": True}


class PortfolioSummaryOut(BaseModel):
    total_value: Decimal | None = None
    total_cost: Decimal
    total_return_eur: Decimal | None = None
    total_return_pct: Decimal | None = None
    holdings_count: int
    last_import_date: datetime | None = None
