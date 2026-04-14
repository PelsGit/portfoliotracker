from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.dividend import DividendOut, DividendSummaryOut
from app.schemas.portfolio import BreakdownOut, EarningsDateOut, HoldingOut, PerformanceOut, PortfolioSummaryOut
from app.services.breakdown import get_breakdown
from app.services.dividends import get_dividends, get_dividends_summary
from app.services.earnings import get_earnings
from app.services.performance import get_performance
from app.services.portfolio import get_holdings, get_summary

router = APIRouter()


@router.get("/portfolio/holdings", response_model=list[HoldingOut])
def portfolio_holdings(db: Session = Depends(get_db)):
    return get_holdings(db)


@router.get("/portfolio/summary", response_model=PortfolioSummaryOut)
def portfolio_summary(db: Session = Depends(get_db)):
    holdings = get_holdings(db)
    return get_summary(db, holdings)


@router.get("/portfolio/breakdown", response_model=BreakdownOut)
def portfolio_breakdown(db: Session = Depends(get_db)):
    return get_breakdown(db)


@router.get("/portfolio/performance", response_model=PerformanceOut)
def portfolio_performance(period: str = "ALL", db: Session = Depends(get_db)):
    return get_performance(db, period)


@router.get("/portfolio/earnings", response_model=list[EarningsDateOut])
def portfolio_earnings(db: Session = Depends(get_db)):
    return get_earnings(db)


@router.get("/portfolio/dividends", response_model=list[DividendOut])
def portfolio_dividends(db: Session = Depends(get_db)):
    return get_dividends(db)


@router.get("/portfolio/dividends/summary", response_model=DividendSummaryOut)
def portfolio_dividends_summary(db: Session = Depends(get_db)):
    return get_dividends_summary(db)
