from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.portfolio import HoldingOut, PerformanceOut, PortfolioSummaryOut
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


@router.get("/portfolio/performance", response_model=PerformanceOut)
def portfolio_performance(period: str = "ALL", db: Session = Depends(get_db)):
    return get_performance(db, period)
