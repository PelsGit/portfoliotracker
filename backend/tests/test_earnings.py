from datetime import datetime, timezone

from app.models.earnings import EarningsDate
from app.models.transaction import Transaction
from app.services.earnings import get_earnings


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
