import logging
from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.price import Price

logger = logging.getLogger(__name__)

FX_ISIN = "EURUSD=X"


def fetch_eurusd_rate(db: Session) -> None:
    """Fetch EUR/USD exchange rate history and store with isin='EURUSD=X'."""
    import yfinance as yf

    try:
        ticker = yf.Ticker(FX_ISIN)
        hist = ticker.history(period="max")

        if hist.empty:
            logger.warning("No data found for EURUSD=X")
            return

        for idx, row in hist.iterrows():
            price_date = idx.date() if isinstance(idx, datetime) else idx
            if isinstance(price_date, datetime):
                price_date = price_date.date()

            stmt = pg_insert(Price.__table__).values(
                isin=FX_ISIN,
                date=price_date,
                close_price=round(float(row["Close"]), 6),
                fetched_at=datetime.now(timezone.utc),
            )
            stmt = stmt.on_conflict_do_nothing(constraint="uq_prices_isin_date")
            db.execute(stmt)

        db.commit()
        logger.info("Fetched EURUSD=X rate history")
    except Exception:
        logger.exception("Failed to fetch EURUSD=X rate")
        db.rollback()


def fetch_prices_for_isins(db: Session, isins: list[str]) -> None:
    import yfinance as yf

    for isin in isins:
        try:
            ticker = yf.Ticker(isin)
            hist = ticker.history(period="max")

            if hist.empty:
                logger.warning("No price data found for ISIN %s", isin)
                continue

            for idx, row in hist.iterrows():
                price_date = idx.date() if isinstance(idx, datetime) else idx
                if isinstance(price_date, datetime):
                    price_date = price_date.date()

                stmt = pg_insert(Price.__table__).values(
                    isin=isin,
                    date=price_date,
                    close_price=round(float(row["Close"]), 4),
                    fetched_at=datetime.now(timezone.utc),
                )
                stmt = stmt.on_conflict_do_nothing(constraint="uq_prices_isin_date")
                db.execute(stmt)

            db.commit()
            logger.info("Fetched %d price records for ISIN %s", len(hist), isin)

        except Exception:
            logger.exception("Failed to fetch prices for ISIN %s", isin)
            db.rollback()
