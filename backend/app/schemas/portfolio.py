from datetime import date, datetime
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
    logo_url: str | None = None
    is_cash: bool = False

    model_config = {"from_attributes": True}


class PortfolioSummaryOut(BaseModel):
    total_value: Decimal | None = None
    total_cost: Decimal
    total_return_eur: Decimal | None = None
    total_return_pct: Decimal | None = None
    holdings_count: int
    last_import_date: datetime | None = None


class PortfolioValuePoint(BaseModel):
    date: date
    value: Decimal


class BreakdownItem(BaseModel):
    name: str
    value: float
    weight: float
    holdings_count: int


class BreakdownOut(BaseModel):
    sector: list[BreakdownItem]
    region: list[BreakdownItem]
    asset_type: list[BreakdownItem]


class BenchmarkSeries(BaseModel):
    ticker: str
    name: str
    time_series: list[PortfolioValuePoint]


class PerformanceOut(BaseModel):
    time_series: list[PortfolioValuePoint]
    total_return_eur: Decimal | None = None
    total_return_pct: Decimal | None = None
    twr: Decimal | None = None
    twr_cumulative: Decimal | None = None
    irr: Decimal | None = None
    max_drawdown: Decimal | None = None
    benchmarks: list[BenchmarkSeries] = []
