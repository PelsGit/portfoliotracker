from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.prices import PriceRefreshResponse, PriceStatusResponse
from app.services.price_refresh import get_status, start_refresh

router = APIRouter()


@router.post("/prices/refresh", response_model=PriceRefreshResponse)
def refresh_prices(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    return start_refresh(db, background_tasks)


@router.get("/prices/status", response_model=PriceStatusResponse)
def price_status(db: Session = Depends(get_db)):
    return get_status(db)
