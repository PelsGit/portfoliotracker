from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class DividendOut(BaseModel):
    id: int | None = None
    isin: str
    product_name: str | None = None
    dividend_date: date
    local_currency: str
    local_amount: Decimal
    gross_amount_eur: Decimal
    withholding_tax_eur: Decimal | None = None
    amount_eur: Decimal

    model_config = {"from_attributes": True}


class DividendSummaryHolding(BaseModel):
    isin: str
    product_name: str | None = None
    total_eur: Decimal
    yield_on_cost: Decimal | None = None


class DividendMonthly(BaseModel):
    month: str  # "YYYY-MM"
    amount_eur: Decimal


class DividendSummaryOut(BaseModel):
    total_eur: Decimal
    this_year_eur: Decimal
    monthly_avg_eur: Decimal
    paying_holdings: int
    monthly: list[DividendMonthly]
    by_holding: list[DividendSummaryHolding]
