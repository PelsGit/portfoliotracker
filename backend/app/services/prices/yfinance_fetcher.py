import logging
from datetime import date, datetime, timezone

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.price import Price
from app.models.security_info import SecurityInfo
from app.services.prices.benchmarks import BENCHMARK_NAME, BENCHMARK_TICKERS

logger = logging.getLogger(__name__)

FX_ISIN = "EURUSD=X"
GBPEUR_ISIN = "GBPEUR=X"

# Tickers that are not stock ISINs — skip in fetch_prices_for_isins
_FX_ISINS = {FX_ISIN, GBPEUR_ISIN} | set(BENCHMARK_TICKERS)


def _fetch_fx(db: Session, ticker_symbol: str) -> None:
    """Fetch FX rate history and store by ticker symbol as ISIN key."""
    import yfinance as yf

    try:
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period="max")

        if hist.empty:
            logger.warning("No data found for %s", ticker_symbol)
            return

        for idx, row in hist.iterrows():
            price_date = idx.date() if isinstance(idx, datetime) else idx
            if isinstance(price_date, datetime):
                price_date = price_date.date()

            close = float(row["Close"])
            if close != close:  # NaN check
                continue

            stmt = pg_insert(Price.__table__).values(
                isin=ticker_symbol,
                date=price_date,
                close_price=round(close, 6),
                fetched_at=datetime.now(timezone.utc),
            )
            stmt = stmt.on_conflict_do_update(
                constraint="uq_prices_isin_date",
                set_={"close_price": round(close, 6), "fetched_at": datetime.now(timezone.utc)},
            )
            db.execute(stmt)

        db.commit()
        logger.info("Fetched %s rate history", ticker_symbol)
    except Exception:
        logger.exception("Failed to fetch %s rate", ticker_symbol)
        db.rollback()


def fetch_eurusd_rate(db: Session) -> None:
    _fetch_fx(db, FX_ISIN)


def fetch_gbpeur_rate(db: Session) -> None:
    _fetch_fx(db, GBPEUR_ISIN)


def _load_fx_history(db: Session, isin: str) -> dict[date, float]:
    rows = db.query(Price.date, Price.close_price).filter(Price.isin == isin).all()
    return {row.date: float(row.close_price) for row in rows if row.close_price}


def _nearest_rate(rate_map: dict[date, float], d: date) -> float | None:
    if not rate_map:
        return None
    if d in rate_map:
        return rate_map[d]
    # Walk backwards up to 10 days
    from datetime import timedelta
    for offset in range(1, 11):
        candidate = d - timedelta(days=offset)
        if candidate in rate_map:
            return rate_map[candidate]
    # Fall back to earliest available
    return rate_map[min(rate_map)]


def _logo_from_website(website: str | None) -> str | None:
    """Derive a Google favicon URL from a company website URL."""
    if not website:
        return None
    from urllib.parse import urlparse
    netloc = urlparse(website).netloc  # e.g. "www.meta.com"
    domain = netloc.removeprefix("www.")  # e.g. "meta.com"
    return f"https://www.google.com/s2/favicons?sz=64&domain={domain}" if domain else None


def _upsert_security_info(db: Session, isin: str, ticker) -> None:
    """Extract sector/country/asset_type from yfinance ticker.info and upsert."""
    try:
        info = ticker.info
        sector = info.get("sector")
        industry = info.get("industry")
        country = info.get("country")
        quote_type = info.get("quoteType")
        logo_url = info.get("logo_url") or _logo_from_website(info.get("website"))

        asset_type_map = {"EQUITY": "Stock", "ETF": "ETF", "MUTUALFUND": "Fund"}
        asset_type = asset_type_map.get(quote_type, quote_type)

        stmt = pg_insert(SecurityInfo.__table__).values(
            isin=isin,
            sector=sector,
            industry=industry,
            country=country,
            asset_type=asset_type,
            logo_url=logo_url,
            fetched_at=datetime.now(timezone.utc),
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["isin"],
            set_={
                "sector": sector,
                "industry": industry,
                "country": country,
                "asset_type": asset_type,
                "logo_url": logo_url,
                "fetched_at": datetime.now(timezone.utc),
            },
        )
        db.execute(stmt)
        db.commit()
        logger.info("Upserted security info for %s: sector=%s, country=%s, type=%s", isin, sector, country, asset_type)
    except Exception:
        logger.exception("Failed to fetch security info for %s", isin)
        db.rollback()


def fetch_prices_for_isins(db: Session, isins: list[str]) -> None:
    """
    Fetch price history for each ISIN and store prices normalised to EUR.
    Currency detection uses yfinance ticker metadata:
      - USD  → divide by EUR/USD rate
      - GBp  → divide by 100 (pence→GBP), then multiply by GBP/EUR rate
      - GBP  → multiply by GBP/EUR rate
      - EUR  → stored as-is
    """
    import yfinance as yf

    # Ensure FX rates are in DB before fetching stock prices
    fetch_eurusd_rate(db)
    fetch_gbpeur_rate(db)

    eurusd = _load_fx_history(db, FX_ISIN)    # date → EUR/USD rate
    gbpeur = _load_fx_history(db, GBPEUR_ISIN)  # date → GBP/EUR rate

    for isin in isins:
        if isin in _FX_ISINS:
            continue
        try:
            ticker = yf.Ticker(isin)
            _upsert_security_info(db, isin, ticker)
            hist = ticker.history(period="max")

            if hist.empty:
                logger.warning("No price data found for ISIN %s", isin)
                continue

            # Detect the currency yfinance uses for this ticker
            try:
                yf_currency = ticker.fast_info.currency or "EUR"
            except Exception:
                yf_currency = "EUR"

            logger.info("ISIN %s: yfinance currency=%s", isin, yf_currency)

            for idx, row in hist.iterrows():
                price_date = idx.date() if isinstance(idx, datetime) else idx
                if isinstance(price_date, datetime):
                    price_date = price_date.date()

                raw_price = float(row["Close"])
                if raw_price != raw_price:  # NaN check
                    continue

                # Normalise to EUR
                if yf_currency == "USD":
                    rate = _nearest_rate(eurusd, price_date)
                    eur_price = raw_price / rate if rate else raw_price
                elif yf_currency == "GBp":
                    rate = _nearest_rate(gbpeur, price_date)
                    eur_price = (raw_price / 100) * rate if rate else raw_price / 100
                elif yf_currency == "GBP":
                    rate = _nearest_rate(gbpeur, price_date)
                    eur_price = raw_price * rate if rate else raw_price
                else:
                    # EUR or unknown — store as-is
                    eur_price = raw_price

                stmt = pg_insert(Price.__table__).values(
                    isin=isin,
                    date=price_date,
                    close_price=round(eur_price, 4),
                    fetched_at=datetime.now(timezone.utc),
                )
                # Use do_update so re-fetching corrects previously wrong prices
                stmt = stmt.on_conflict_do_update(
                    constraint="uq_prices_isin_date",
                    set_={"close_price": round(eur_price, 4), "fetched_at": datetime.now(timezone.utc)},
                )
                db.execute(stmt)

            db.commit()
            logger.info("Fetched %d price records for ISIN %s (currency=%s)", len(hist), isin, yf_currency)

        except Exception:
            logger.exception("Failed to fetch prices for ISIN %s", isin)
            db.rollback()


def fetch_benchmark_prices(db: Session) -> None:
    """Fetch price history for benchmark indices/ETFs and store normalised to EUR."""
    import yfinance as yf

    # Ensure EUR/USD rates are available for conversion
    fetch_eurusd_rate(db)
    eurusd = _load_fx_history(db, FX_ISIN)

    for ticker in BENCHMARK_TICKERS:
        try:
            t = yf.Ticker(ticker)
            hist = t.history(period="max")

            if hist.empty:
                logger.warning("No benchmark data for %s", ticker)
                continue

            try:
                yf_currency = t.fast_info.currency or "EUR"
            except Exception:
                yf_currency = "EUR"

            logger.info(
                "Benchmark %s (%s): currency=%s, %d rows",
                ticker, BENCHMARK_NAME[ticker], yf_currency, len(hist),
            )

            for idx, row in hist.iterrows():
                price_date = idx.date() if isinstance(idx, datetime) else idx
                if isinstance(price_date, datetime):
                    price_date = price_date.date()

                raw_price = float(row["Close"])
                if raw_price != raw_price:  # NaN check
                    continue

                if yf_currency == "USD":
                    rate = _nearest_rate(eurusd, price_date)
                    eur_price = raw_price / rate if rate else raw_price
                else:
                    eur_price = raw_price

                stmt = pg_insert(Price.__table__).values(
                    isin=ticker,
                    date=price_date,
                    close_price=round(eur_price, 4),
                    fetched_at=datetime.now(timezone.utc),
                )
                stmt = stmt.on_conflict_do_update(
                    constraint="uq_prices_isin_date",
                    set_={"close_price": round(eur_price, 4), "fetched_at": datetime.now(timezone.utc)},
                )
                db.execute(stmt)

            db.commit()
            logger.info("Stored benchmark prices for %s", ticker)

        except Exception:
            logger.exception("Failed to fetch benchmark %s", ticker)
            db.rollback()
