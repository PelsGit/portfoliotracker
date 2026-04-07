from datetime import date, datetime, timezone
from decimal import Decimal

from app.models.price import Price
from app.models.transaction import Transaction
from app.services.performance import get_performance, _xirr, _compute_max_drawdown
from app.schemas.portfolio import PortfolioValuePoint


def _buy(db, isin="US1234567890", product="TEST CORP", quantity=10, total=-1000.0, txn_date=None):
    txn = Transaction(
        isin=isin,
        product_name=product,
        date=txn_date or datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc),
        quantity=quantity,
        total=total,
        order_id="order-buy",
    )
    db.add(txn)
    db.commit()
    return txn


def _sell(db, isin="US1234567890", product="TEST CORP", quantity=-5, total=600.0, txn_date=None):
    txn = Transaction(
        isin=isin,
        product_name=product,
        date=txn_date or datetime(2026, 1, 10, 12, 0, tzinfo=timezone.utc),
        quantity=quantity,
        total=total,
        order_id="order-sell",
    )
    db.add(txn)
    db.commit()
    return txn


def _price(db, isin="US1234567890", close=100.0, d=None):
    p = Price(isin=isin, date=d or date(2026, 1, 1), close_price=close)
    db.add(p)
    db.commit()
    return p


# --- Time Series Tests ---


def test_empty_portfolio(db_session):
    result = get_performance(db_session)
    assert result.time_series == []
    assert result.twr is None
    assert result.irr is None
    assert result.max_drawdown is None


def test_single_buy_time_series(db_session):
    _buy(db_session, quantity=10, total=-1000.0, txn_date=datetime(2026, 1, 1, tzinfo=timezone.utc))
    _price(db_session, close=100.0, d=date(2026, 1, 1))
    _price(db_session, close=110.0, d=date(2026, 1, 2))
    _price(db_session, close=105.0, d=date(2026, 1, 3))

    result = get_performance(db_session)
    assert len(result.time_series) == 3
    assert result.time_series[0].value == Decimal("1000.0")
    assert result.time_series[1].value == Decimal("1100.0")
    assert result.time_series[2].value == Decimal("1050.0")


def test_buy_then_sell(db_session):
    _buy(db_session, quantity=10, total=-1000.0, txn_date=datetime(2026, 1, 1, tzinfo=timezone.utc))
    _sell(db_session, quantity=-5, total=550.0, txn_date=datetime(2026, 1, 3, tzinfo=timezone.utc))
    _price(db_session, close=100.0, d=date(2026, 1, 1))
    _price(db_session, close=110.0, d=date(2026, 1, 2))
    _price(db_session, close=110.0, d=date(2026, 1, 3))
    _price(db_session, close=120.0, d=date(2026, 1, 4))

    result = get_performance(db_session)
    assert result.time_series[0].value == Decimal("1000.0")
    assert result.time_series[1].value == Decimal("1100.0")
    assert result.time_series[2].value == Decimal("550.0")
    assert result.time_series[3].value == Decimal("600.0")


def test_multiple_isins(db_session):
    _buy(db_session, isin="US1111111111", quantity=10, total=-1000.0,
         txn_date=datetime(2026, 1, 1, tzinfo=timezone.utc))
    _buy(db_session, isin="US2222222222", quantity=5, total=-500.0,
         txn_date=datetime(2026, 1, 1, tzinfo=timezone.utc))
    _price(db_session, isin="US1111111111", close=100.0, d=date(2026, 1, 1))
    _price(db_session, isin="US2222222222", close=100.0, d=date(2026, 1, 1))

    result = get_performance(db_session)
    assert result.time_series[0].value == Decimal("1500.0")


def test_forward_fill_gaps(db_session):
    _buy(db_session, isin="US1111111111", quantity=10, total=-1000.0,
         txn_date=datetime(2026, 1, 1, tzinfo=timezone.utc))
    _buy(db_session, isin="US2222222222", quantity=5, total=-500.0,
         txn_date=datetime(2026, 1, 1, tzinfo=timezone.utc))
    _price(db_session, isin="US1111111111", close=100.0, d=date(2026, 1, 1))
    _price(db_session, isin="US2222222222", close=100.0, d=date(2026, 1, 1))
    _price(db_session, isin="US1111111111", close=110.0, d=date(2026, 1, 2))
    # US2222222222 has no price on day 2 — should forward-fill from day 1

    result = get_performance(db_session)
    assert len(result.time_series) == 2
    # day 2: 10*110 + 5*100(forward-filled) = 1600
    assert result.time_series[1].value == Decimal("1600.0")


# --- TWR Tests ---


def test_twr_no_cash_flow(db_session):
    _buy(db_session, quantity=10, total=-1000.0, txn_date=datetime(2026, 1, 1, tzinfo=timezone.utc))
    _price(db_session, close=100.0, d=date(2026, 1, 1))
    _price(db_session, close=120.0, d=date(2026, 1, 10))

    result = get_performance(db_session)
    # Simple return: (1200 - 1000) / 1000 = 20%
    assert result.twr_cumulative is not None
    assert abs(result.twr_cumulative - Decimal("20")) < Decimal("0.1")


# --- Max Drawdown Tests ---


def test_max_drawdown_monotonic_increase(db_session):
    _buy(db_session, quantity=10, total=-1000.0, txn_date=datetime(2026, 1, 1, tzinfo=timezone.utc))
    _price(db_session, close=100.0, d=date(2026, 1, 1))
    _price(db_session, close=110.0, d=date(2026, 1, 2))
    _price(db_session, close=120.0, d=date(2026, 1, 3))

    result = get_performance(db_session)
    assert result.max_drawdown == Decimal("0")


def test_max_drawdown_known_value(db_session):
    _buy(db_session, quantity=10, total=-1000.0, txn_date=datetime(2026, 1, 1, tzinfo=timezone.utc))
    _price(db_session, close=100.0, d=date(2026, 1, 1))
    _price(db_session, close=110.0, d=date(2026, 1, 2))
    _price(db_session, close=90.0, d=date(2026, 1, 3))
    _price(db_session, close=95.0, d=date(2026, 1, 4))

    result = get_performance(db_session)
    # Peak = 1100 (day 2), trough = 900 (day 3)
    # Drawdown = (900 - 1100) / 1100 = -18.18%
    assert result.max_drawdown is not None
    assert abs(result.max_drawdown - Decimal("-18.18")) < Decimal("0.1")


# --- IRR Tests ---


def test_xirr_simple():
    cash_flows = [
        (date(2026, 1, 1), Decimal("-1000")),
        (date(2027, 1, 1), Decimal("1100")),
    ]
    irr = _xirr(cash_flows)
    assert irr is not None
    assert abs(irr - Decimal("10")) < Decimal("0.5")


def test_xirr_insufficient_data():
    result = _xirr([(date(2026, 1, 1), Decimal("100"))])
    assert result is None


# --- API Tests ---


def test_performance_endpoint_empty(client):
    response = client.get("/api/portfolio/performance?period=ALL")
    assert response.status_code == 200
    data = response.json()
    assert data["time_series"] == []
    assert data["twr"] is None


def test_performance_endpoint_with_data(client, db_session):
    _buy(db_session, quantity=10, total=-1000.0, txn_date=datetime(2026, 1, 1, tzinfo=timezone.utc))
    _price(db_session, close=100.0, d=date(2026, 1, 1))
    _price(db_session, close=120.0, d=date(2026, 1, 10))

    response = client.get("/api/portfolio/performance?period=ALL")
    assert response.status_code == 200
    data = response.json()
    assert len(data["time_series"]) == 2
    assert data["max_drawdown"] is not None


def test_max_drawdown_unit():
    series = [
        PortfolioValuePoint(date=date(2026, 1, 1), value=Decimal("1000")),
        PortfolioValuePoint(date=date(2026, 1, 2), value=Decimal("1100")),
        PortfolioValuePoint(date=date(2026, 1, 3), value=Decimal("900")),
        PortfolioValuePoint(date=date(2026, 1, 4), value=Decimal("950")),
    ]
    dd = _compute_max_drawdown(series)
    # (900 - 1100) / 1100 * 100 = -18.18...
    assert dd is not None
    assert abs(dd - Decimal("-18.18")) < Decimal("0.1")
