import logging
from datetime import date, datetime, timezone

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.earnings import EarningsDate
from app.models.security_info import SecurityInfo
from app.models.transaction import Transaction

logger = logging.getLogger(__name__)


def _current_holding_isins(db: Session) -> dict[str, str]:
    """Return {isin: product_name} for all currently held positions (net shares > 0)."""
    from decimal import Decimal

    txns = db.query(Transaction.isin, Transaction.product_name, Transaction.quantity).all()
    shares: dict[str, Decimal] = {}
    names: dict[str, str] = {}
    for isin, product_name, qty in txns:
        shares[isin] = shares.get(isin, Decimal(0)) + Decimal(str(qty))
        if product_name:
            names[isin] = product_name
    return {isin: names.get(isin, isin) for isin, qty in shares.items() if qty > 0}


def fetch_earnings_dates(db: Session) -> None:
    """Fetch upcoming earnings dates for all current holdings via yfinance."""
    import yfinance as yf

    holdings = _current_holding_isins(db)
    if not holdings:
        logger.info("No holdings — skipping earnings fetch")
        return

    for isin, product_name in holdings.items():
        try:
            ticker = yf.Ticker(isin)
            df = ticker.earnings_dates
            if df is None or df.empty:
                logger.info("No earnings dates for %s", isin)
                continue

            count = 0
            for idx in df.index:
                # idx is a Timestamp (tz-aware)
                ed: date = idx.date() if hasattr(idx, "date") else idx
                if not isinstance(ed, date):
                    continue

                stmt = pg_insert(EarningsDate.__table__).values(
                    isin=isin,
                    product_name=product_name,
                    earnings_date=ed,
                    fetched_at=datetime.now(timezone.utc),
                )
                stmt = stmt.on_conflict_do_update(
                    constraint="uq_earnings_isin_date",
                    set_={
                        "product_name": product_name,
                        "fetched_at": datetime.now(timezone.utc),
                    },
                )
                db.execute(stmt)
                count += 1

            db.commit()
            logger.info("Stored %d earnings dates for %s", count, isin)

        except Exception:
            logger.exception("Failed to fetch earnings for %s", isin)
            db.rollback()


def get_earnings(db: Session) -> list[dict]:
    """Return earnings dates for currently-held ISINs only, sorted by date."""
    holdings = _current_holding_isins(db)
    if not holdings:
        return []

    rows = (
        db.query(EarningsDate, SecurityInfo.logo_url)
        .outerjoin(SecurityInfo, SecurityInfo.isin == EarningsDate.isin)
        .filter(EarningsDate.isin.in_(list(holdings.keys())))
        .order_by(EarningsDate.earnings_date)
        .all()
    )
    return [
        {
            "isin": r.isin,
            "product_name": r.product_name or holdings.get(r.isin, r.isin),
            "earnings_date": r.earnings_date.isoformat(),
            "logo_url": logo_url,
        }
        for r, logo_url in rows
    ]
