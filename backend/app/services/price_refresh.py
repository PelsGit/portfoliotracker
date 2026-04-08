from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.price import Price
from app.models.transaction import Transaction
from app.services.prices.yfinance_fetcher import fetch_prices_for_isins

_refresh_state = {
    "refreshing": False,
    "last_refresh": None,
}


def get_all_isins(db: Session) -> list[str]:
    rows = db.query(Transaction.isin).distinct().all()
    return [r.isin for r in rows]


def start_refresh(db: Session, background_tasks) -> dict:
    if _refresh_state["refreshing"]:
        isins = get_all_isins(db)
        return {"status": "already_refreshing", "securities_count": len(isins)}

    isins = get_all_isins(db)
    if not isins:
        return {"status": "started", "securities_count": 0}

    _refresh_state["refreshing"] = True
    background_tasks.add_task(_do_refresh, db, isins)
    return {"status": "started", "securities_count": len(isins)}


def _do_refresh(db: Session, isins: list[str]):
    try:
        fetch_prices_for_isins(db, isins)
    finally:
        _refresh_state["refreshing"] = False
        _refresh_state["last_refresh"] = datetime.now(timezone.utc)


def get_status(db: Session) -> dict:
    if _refresh_state["last_refresh"] is None:
        row = db.query(func.max(Price.fetched_at)).scalar()
        if row is not None:
            _refresh_state["last_refresh"] = row

    isins = get_all_isins(db)
    return {
        "refreshing": _refresh_state["refreshing"],
        "last_refresh": _refresh_state["last_refresh"],
        "securities_count": len(isins),
    }


def scheduled_refresh():
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        isins = get_all_isins(db)
        if isins:
            _refresh_state["refreshing"] = True
            try:
                fetch_prices_for_isins(db, isins)
            finally:
                _refresh_state["refreshing"] = False
                _refresh_state["last_refresh"] = datetime.now(timezone.utc)
    finally:
        db.close()
