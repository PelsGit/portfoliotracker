from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portfolio_goal import PortfolioGoal
from app.schemas.dividend import DividendOut, DividendSummaryOut
from app.schemas.portfolio import (
    BreakdownOut,
    EarningsDateOut,
    GoalIn,
    GoalOut,
    GoalsOut,
    HoldingOut,
    PerformanceOut,
    PortfolioSummaryOut,
)
from app.services.breakdown import get_breakdown
from app.services.dividends import get_dividends, get_dividends_summary
from app.services.earnings import get_earnings
from app.services.performance import get_performance
from app.services.portfolio import get_holdings, get_summary

VALID_DIMENSIONS = {"sector", "region", "asset_type"}

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


@router.get("/portfolio/goals", response_model=GoalsOut)
def get_goals(db: Session = Depends(get_db)):
    rows = db.query(PortfolioGoal).all()
    grouped: dict[str, list[GoalOut]] = {"sector": [], "region": [], "asset_type": []}
    for row in rows:
        if row.dimension in grouped:
            grouped[row.dimension].append(GoalOut.model_validate(row))
    return GoalsOut(**grouped)


@router.put("/portfolio/goals/{dimension}", response_model=list[GoalOut])
def set_goals(dimension: str, goals: list[GoalIn], db: Session = Depends(get_db)):
    if dimension not in VALID_DIMENSIONS:
        valid = sorted(VALID_DIMENSIONS)
        raise HTTPException(status_code=422, detail=f"Invalid dimension '{dimension}'. Must be one of: {valid}")
    for g in goals:
        if not (0 <= g.target_weight <= 100):
            raise HTTPException(status_code=422, detail=f"target_weight must be 0–100, got {g.target_weight}")

    db.query(PortfolioGoal).filter(PortfolioGoal.dimension == dimension).delete()
    new_rows = [PortfolioGoal(dimension=dimension, name=g.name, target_weight=g.target_weight) for g in goals]
    db.add_all(new_rows)
    db.commit()
    for row in new_rows:
        db.refresh(row)
    return [GoalOut.model_validate(row) for row in new_rows]
