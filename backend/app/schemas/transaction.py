from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class TransactionOut(BaseModel):
    id: int | None = None
    isin: str
    product_name: str | None = None
    exchange: str | None = None
    local_currency: str | None = None
    date: datetime
    quantity: Decimal
    price: Decimal | None = None
    local_value: Decimal | None = None
    value: Decimal | None = None
    fx_rate: Decimal | None = None
    costs: Decimal | None = None
    total: Decimal | None = None
    order_id: str | None = None

    model_config = {"from_attributes": True}


class ImportPreviewResponse(BaseModel):
    count: int
    transactions: list[TransactionOut]


class ImportConfirmResponse(BaseModel):
    imported: int
    skipped: int
    transactions: list[TransactionOut]
