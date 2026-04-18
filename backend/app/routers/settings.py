from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.user_settings import get_holdings_columns, set_holdings_columns

router = APIRouter()


class HoldingsColumnsIn(BaseModel):
    columns: list[str]


class HoldingsColumnsOut(BaseModel):
    columns: list[str]


@router.get("/settings/holdings-columns", response_model=HoldingsColumnsOut)
def read_holdings_columns(db: Session = Depends(get_db)):
    return {"columns": get_holdings_columns(db)}


@router.put("/settings/holdings-columns", response_model=HoldingsColumnsOut)
def write_holdings_columns(body: HoldingsColumnsIn, db: Session = Depends(get_db)):
    return {"columns": set_holdings_columns(db, body.columns)}
