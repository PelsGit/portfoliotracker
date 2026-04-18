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


class EarningsDateOut(BaseModel):
    isin: str
    product_name: str
    earnings_date: str  # ISO date string


class GoalIn(BaseModel):
    name: str
    target_weight: float  # 0–100


class GoalOut(GoalIn):
    id: int
    dimension: str

    model_config = {"from_attributes": True}


class GoalsOut(BaseModel):
    sector: list[GoalOut]
    region: list[GoalOut]
    asset_type: list[GoalOut]


class PerformanceOut(BaseModel):
    time_series: list[PortfolioValuePoint]
    twr_series: list[PortfolioValuePoint] = []  # daily cumulative TWR in % (cash-flow adjusted)
    total_return_eur: Decimal | None = None
    total_return_pct: Decimal | None = None
    twr: Decimal | None = None
    twr_cumulative: Decimal | None = None
    irr: Decimal | None = None
    max_drawdown: Decimal | None = None
    benchmarks: list[BenchmarkSeries] = []
