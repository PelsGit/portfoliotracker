from datetime import datetime, timezone
from unittest.mock import MagicMock, PropertyMock, patch

from app.models.earnings import EarningsDate
from app.models.transaction import Transaction
from app.services.earnings import fetch_earnings_dates, get_earnings


def _buy(db, isin="US1234567890", product="TEST CORP", quantity=10, total=-1000.0):
    txn = Transaction(
        isin=isin,
        product_name=product,
        date=datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc),
        quantity=quantity,
        total=total,
        order_id=f"order-{isin}",
    )
    db.add(txn)
    db.commit()
    return txn


def _earning(db, isin, product, d):
    from datetime import date
    e = EarningsDate(isin=isin, product_name=product, earnings_date=d)
    db.add(e)
    db.commit()
    return e


def test_get_earnings_returns_only_held_isins(db_session):
    from datetime import date

    _buy(db_session, isin="US1111111111", product="Held Corp")
    # Sold-out position (net shares = 0)
    _buy(db_session, isin="US2222222222", product="Sold Corp", quantity=10, total=-500.0)
    db_session.add(Transaction(
        isin="US2222222222", product_name="Sold Corp",
        date=datetime(2026, 2, 1, 12, 0, tzinfo=timezone.utc),
        quantity=-10, total=600.0, order_id="order-sell",
    ))
    db_session.commit()

    _earning(db_session, "US1111111111", "Held Corp", date(2026, 5, 1))
    _earning(db_session, "US2222222222", "Sold Corp", date(2026, 5, 5))

    result = get_earnings(db_session)
    isins = [r["isin"] for r in result]
    assert "US1111111111" in isins
    assert "US2222222222" not in isins


def test_get_earnings_empty_when_no_holdings(db_session):
    result = get_earnings(db_session)
    assert result == []


def test_get_earnings_sorted_by_date(db_session):
    from datetime import date

    _buy(db_session, isin="US1111111111", product="Alpha")
    _buy(db_session, isin="US2222222222", product="Beta")

    _earning(db_session, "US2222222222", "Beta", date(2026, 5, 10))
    _earning(db_session, "US1111111111", "Alpha", date(2026, 5, 3))

    result = get_earnings(db_session)
    dates = [r["earnings_date"] for r in result]
    assert dates == sorted(dates)


def test_fetch_earnings_logs_exception_on_yfinance_failure(db_session):
    """yfinance failure must be logged — not silently swallowed."""
    _buy(db_session, isin="US1234567890", product="Fail Corp")

    mock_ticker = MagicMock()
    type(mock_ticker).earnings_dates = PropertyMock(side_effect=RuntimeError("network timeout"))

    with patch("yfinance.Ticker", return_value=mock_ticker), \
         patch("app.services.earnings.logger") as mock_logger:
        fetch_earnings_dates(db_session)

    mock_logger.exception.assert_called_once()
    args = mock_logger.exception.call_args[0]
    assert "Failed to fetch earnings for" in args[0]


def test_fetch_earnings_handles_invalid_isin_at_construction():
    """ValueError raised by yf.Ticker(isin) itself (e.g. GB ISINs that fail checksum)
    must be caught, logged, and must not abort fetching the remaining ISINs."""
    import pandas as pd
    from decimal import Decimal

    ok_df = pd.DataFrame(
        index=pd.to_datetime(["2026-06-01"], utc=True),
        data={"EPS Estimate": [1.0]},
    )

    def make_ticker(isin):
        if isin == "GB00B10RZP78":
            # Simulates yfinance raising at Ticker.__init__ for unsupported ISINs
            raise ValueError(f"Invalid ISIN number: {isin}")
        t = MagicMock()
        type(t).earnings_dates = PropertyMock(return_value=ok_df)
        return t

    # Mock DB: return two holdings, track DB writes
    mock_query = MagicMock()
    mock_query.all.return_value = [
        ("GB00B10RZP78", "UK Corp", Decimal("10")),
        ("US1234567890", "US Corp", Decimal("5")),
    ]
    stored = []
    mock_db = MagicMock()
    mock_db.query.return_value = mock_query
    mock_db.execute.side_effect = lambda *a, **kw: stored.append(a[0]) or MagicMock()

    with patch("yfinance.Ticker", side_effect=make_ticker), \
         patch("app.services.earnings.logger") as mock_logger:
        fetch_earnings_dates(mock_db)

    # GB ISIN failure was logged, not re-raised
    logged_isins = [call[0][1] for call in mock_logger.exception.call_args_list]
    assert "GB00B10RZP78" in logged_isins

    # US ISIN still produced a DB write despite GB failure
    assert len(stored) == 1


def test_fetch_earnings_continues_after_per_isin_failure():
    """When one ISIN fails, the rest are still processed."""
    import pandas as pd
    from decimal import Decimal

    ok_df = pd.DataFrame(
        index=pd.to_datetime(["2026-06-01"], utc=True),
        data={"EPS Estimate": [1.0]},
    )

    def make_ticker(isin):
        t = MagicMock()
        if isin == "US1111111111":
            type(t).earnings_dates = PropertyMock(side_effect=RuntimeError("boom"))
        else:
            type(t).earnings_dates = PropertyMock(return_value=ok_df)
        return t

    # Fake query chain: return two holdings from _current_holding_isins
    mock_query = MagicMock()
    mock_query.all.return_value = [
        ("US1111111111", "Fail Corp", Decimal("10")),
        ("US2222222222", "OK Corp", Decimal("5")),
    ]
    stored = []
    mock_db = MagicMock()
    mock_db.query.return_value = mock_query
    mock_db.execute.side_effect = lambda *a, **kw: stored.append(a[0]) or MagicMock()

    with patch("yfinance.Ticker", side_effect=make_ticker), \
         patch("app.services.earnings.logger") as mock_logger:
        fetch_earnings_dates(mock_db)

    # Failing ISIN logged, not re-raised
    mock_logger.exception.assert_called_once()

    # Successful ISIN still produced a DB write
    assert len(stored) == 1


def test_earnings_endpoint(client, db_session):
    from datetime import date

    _buy(db_session, isin="US1234567890", product="Test Corp")
    _earning(db_session, "US1234567890", "Test Corp", date(2026, 6, 15))

    response = client.get("/api/portfolio/earnings")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["isin"] == "US1234567890"
    assert data[0]["earnings_date"] == "2026-06-15"
