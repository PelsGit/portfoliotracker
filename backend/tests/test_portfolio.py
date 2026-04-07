from datetime import datetime, timezone
from decimal import Decimal

from app.models.price import Price
from app.models.transaction import Transaction
from app.services.portfolio import get_holdings, get_summary


def _add_buy(db, isin="US1234567890", product="TEST CORP", quantity=10, total=-456.55, date=None):
    txn = Transaction(
        isin=isin,
        product_name=product,
        date=date or datetime(2026, 4, 1, 15, 0, tzinfo=timezone.utc),
        quantity=quantity,
        total=total,
        order_id="order-1",
    )
    db.add(txn)
    db.commit()
    return txn


def _add_sell(db, isin="US1234567890", product="TEST CORP", quantity=-5, total=368.37, date=None):
    txn = Transaction(
        isin=isin,
        product_name=product,
        date=date or datetime(2026, 4, 2, 16, 0, tzinfo=timezone.utc),
        quantity=quantity,
        total=total,
        order_id="order-2",
    )
    db.add(txn)
    db.commit()
    return txn


def _add_price(db, isin="US1234567890", close_price=50.0, date=None):
    from datetime import date as date_type

    price = Price(
        isin=isin,
        date=date or date_type(2026, 4, 7),
        close_price=close_price,
    )
    db.add(price)
    db.commit()
    return price


# --- Service tests ---


def test_empty_portfolio(db_session):
    holdings = get_holdings(db_session)
    assert holdings == []


def test_single_buy(db_session):
    _add_buy(db_session, quantity=10, total=-456.55)
    _add_price(db_session, close_price=50.0)

    holdings = get_holdings(db_session)
    assert len(holdings) == 1
    h = holdings[0]
    assert h.isin == "US1234567890"
    assert h.shares == Decimal("10")
    assert h.avg_cost == Decimal("45.655")
    assert h.current_price == Decimal("50.0")
    assert h.value == Decimal("500.0")
    assert h.cost_basis == Decimal("456.55")
    assert h.return_eur == Decimal("43.45")
    assert h.weight == Decimal("100")


def test_buy_and_partial_sell(db_session):
    _add_buy(db_session, quantity=10, total=-456.55)
    _add_sell(db_session, quantity=-5, total=368.37)
    _add_price(db_session, close_price=50.0)

    holdings = get_holdings(db_session)
    assert len(holdings) == 1
    h = holdings[0]
    assert h.shares == Decimal("5")
    assert h.avg_cost == Decimal("45.655")
    assert h.cost_basis == Decimal("228.275")
    assert h.value == Decimal("250.0")


def test_fully_sold_excluded(db_session):
    _add_buy(db_session, quantity=10, total=-456.55)
    _add_sell(db_session, quantity=-10, total=500.00)

    holdings = get_holdings(db_session)
    assert len(holdings) == 0


def test_multiple_buys_weighted_average(db_session):
    _add_buy(db_session, quantity=5, total=-200.00, date=datetime(2026, 4, 1, tzinfo=timezone.utc))
    _add_buy(db_session, quantity=5, total=-300.00, date=datetime(2026, 4, 2, tzinfo=timezone.utc))
    _add_price(db_session, close_price=60.0)

    holdings = get_holdings(db_session)
    assert len(holdings) == 1
    h = holdings[0]
    assert h.shares == Decimal("10")
    assert h.avg_cost == Decimal("50")
    assert h.value == Decimal("600.0")


def test_missing_price(db_session):
    _add_buy(db_session)

    holdings = get_holdings(db_session)
    assert len(holdings) == 1
    h = holdings[0]
    assert h.current_price is None
    assert h.value is None
    assert h.return_eur is None
    assert h.return_pct is None
    assert h.weight is None


def test_multiple_isins_weights(db_session):
    from datetime import date as date_type

    _add_buy(db_session, isin="US1111111111", product="CORP A", quantity=10, total=-1000.00)
    _add_buy(db_session, isin="US2222222222", product="CORP B", quantity=10, total=-1000.00)
    _add_price(db_session, isin="US1111111111", close_price=150.0, date=date_type(2026, 4, 7))
    _add_price(db_session, isin="US2222222222", close_price=50.0, date=date_type(2026, 4, 7))

    holdings = get_holdings(db_session)
    assert len(holdings) == 2
    weights = {h.isin: h.weight for h in holdings}
    assert weights["US1111111111"] == Decimal("75")
    assert weights["US2222222222"] == Decimal("25")


# --- Summary tests ---


def test_summary_empty(db_session):
    summary = get_summary(db_session)
    assert summary.holdings_count == 0
    assert summary.total_cost == Decimal("0")
    assert summary.total_value is None


def test_summary_with_data(db_session):
    _add_buy(db_session, quantity=10, total=-456.55)
    _add_price(db_session, close_price=50.0)

    summary = get_summary(db_session)
    assert summary.holdings_count == 1
    assert summary.total_cost == Decimal("456.55")
    assert summary.total_value == Decimal("500.0")
    assert summary.total_return_eur == Decimal("43.45")
    assert summary.last_import_date is not None


# --- API tests ---


def test_holdings_endpoint_empty(client):
    response = client.get("/api/portfolio/holdings")
    assert response.status_code == 200
    assert response.json() == []


def test_holdings_endpoint_with_data(client, db_session):
    _add_buy(db_session, quantity=10, total=-456.55)
    _add_price(db_session, close_price=50.0)

    response = client.get("/api/portfolio/holdings")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["isin"] == "US1234567890"
    assert float(data[0]["shares"]) == 10.0


def test_summary_endpoint(client, db_session):
    _add_buy(db_session, quantity=10, total=-456.55)
    _add_price(db_session, close_price=50.0)

    response = client.get("/api/portfolio/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["holdings_count"] == 1
    assert float(data["total_value"]) == 500.0
