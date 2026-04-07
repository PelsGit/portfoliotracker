from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.price import Price
from app.models.transaction import Transaction
from app.schemas.portfolio import PerformanceOut, PortfolioValuePoint


def _to_decimal(value) -> Decimal:
    if value is None:
        return Decimal(0)
    return Decimal(str(value))


def _period_start(period: str) -> date:
    today = date.today()
    mapping = {
        "1M": today - timedelta(days=30),
        "3M": today - timedelta(days=90),
        "6M": today - timedelta(days=180),
        "1Y": today - timedelta(days=365),
        "YTD": date(today.year, 1, 1),
    }
    return mapping.get(period, date(1970, 1, 1))


def _build_time_series(
    db: Session, start_date: date, end_date: date
) -> tuple[list[PortfolioValuePoint], list[Transaction]]:
    transactions = db.query(Transaction).order_by(Transaction.date).all()
    if not transactions:
        return [], []

    isins = list({t.isin for t in transactions})

    prices = (
        db.query(Price)
        .filter(Price.isin.in_(isins), Price.date >= start_date, Price.date <= end_date)
        .order_by(Price.date)
        .all()
    )
    if not prices:
        return [], transactions

    price_map: dict[date, dict[str, Decimal]] = {}
    for p in prices:
        price_map.setdefault(p.date, {})[p.isin] = _to_decimal(p.close_price)

    calendar = sorted(price_map.keys())

    txn_idx = 0
    shares_held: dict[str, Decimal] = {}
    last_known_price: dict[str, Decimal] = {}
    series = []

    for d in calendar:
        while txn_idx < len(transactions):
            txn_date = transactions[txn_idx].date
            if hasattr(txn_date, "date"):
                txn_date = txn_date.date()
            if txn_date > d:
                break
            isin = transactions[txn_idx].isin
            shares_held[isin] = shares_held.get(isin, Decimal(0)) + _to_decimal(
                transactions[txn_idx].quantity
            )
            txn_idx += 1

        day_prices = price_map.get(d, {})
        for isin in day_prices:
            last_known_price[isin] = day_prices[isin]

        portfolio_value = Decimal(0)
        for isin, shares in shares_held.items():
            if shares <= 0:
                continue
            price = day_prices.get(isin) or last_known_price.get(isin)
            if price is not None:
                portfolio_value += shares * price

        series.append(PortfolioValuePoint(date=d, value=portfolio_value))

    return series, transactions


def _compute_twr(
    series: list[PortfolioValuePoint], transactions: list[Transaction], start_date: date
) -> tuple[Decimal | None, Decimal | None]:
    if len(series) < 2:
        return None, None

    cf_dates: dict[date, Decimal] = {}
    for txn in transactions:
        txn_date = txn.date
        if hasattr(txn_date, "date"):
            txn_date = txn_date.date()
        if txn_date < start_date:
            continue
        net_inflow = -_to_decimal(txn.total)
        cf_dates[txn_date] = cf_dates.get(txn_date, Decimal(0)) + net_inflow

    value_map = {p.date: p.value for p in series}

    split_dates = sorted(d for d in cf_dates if d in value_map)

    sub_period_boundaries = [series[0].date] + split_dates + [series[-1].date]
    sub_period_boundaries = sorted(set(sub_period_boundaries))

    product = Decimal(1)
    prev_start_value = value_map.get(sub_period_boundaries[0], Decimal(0))

    for i in range(1, len(sub_period_boundaries)):
        end_d = sub_period_boundaries[i]
        end_value = value_map.get(end_d, Decimal(0))

        if prev_start_value > 0:
            end_before_cf = end_value
            if end_d in cf_dates:
                end_before_cf = end_value - cf_dates[end_d]
                if end_before_cf < 0:
                    end_before_cf = Decimal(0)

            hpr = end_before_cf / prev_start_value
            product *= hpr

        prev_start_value = value_map.get(end_d, Decimal(0))

    twr_cumulative = (product - Decimal(1)) * Decimal(100)

    total_days = (series[-1].date - series[0].date).days
    if total_days > 365 and product > 0:
        exponent = Decimal(str(365.0 / total_days))
        twr_annual = (product ** exponent - Decimal(1)) * Decimal(100)
    else:
        twr_annual = twr_cumulative

    return twr_annual, twr_cumulative


def _xirr(cash_flows: list[tuple[date, Decimal]], max_iter: int = 100) -> Decimal | None:
    if len(cash_flows) < 2:
        return None

    d0 = cash_flows[0][0]
    years = [(cf_date - d0).days / 365.0 for cf_date, _ in cash_flows]
    amounts = [float(amt) for _, amt in cash_flows]

    rate = 0.1
    for _ in range(max_iter):
        npv = sum(amt / (1 + rate) ** yr for amt, yr in zip(amounts, years))
        dnpv = sum(-yr * amt / (1 + rate) ** (yr + 1) for amt, yr in zip(amounts, years))

        if abs(dnpv) < 1e-12:
            return None

        new_rate = rate - npv / dnpv

        if new_rate <= -1:
            return None

        if abs(new_rate - rate) < 1e-9:
            return Decimal(str(round(new_rate * 100, 4)))

        rate = new_rate

    return None


def _compute_irr(
    series: list[PortfolioValuePoint], transactions: list[Transaction]
) -> Decimal | None:
    if not series or not transactions:
        return None

    cash_flows: list[tuple[date, Decimal]] = []

    for txn in transactions:
        txn_date = txn.date
        if hasattr(txn_date, "date"):
            txn_date = txn_date.date()
        if txn_date <= series[-1].date:
            cash_flows.append((txn_date, _to_decimal(txn.total)))

    final_value = series[-1].value
    if final_value <= 0:
        return None

    cash_flows.append((series[-1].date, final_value))
    cash_flows.sort(key=lambda x: x[0])

    return _xirr(cash_flows)


def _compute_max_drawdown(series: list[PortfolioValuePoint]) -> Decimal | None:
    if len(series) < 2:
        return None

    running_max = Decimal(0)
    max_drawdown = Decimal(0)

    for point in series:
        if point.value > running_max:
            running_max = point.value
        if running_max > 0:
            drawdown = (point.value - running_max) / running_max * Decimal(100)
            if drawdown < max_drawdown:
                max_drawdown = drawdown

    return max_drawdown


def get_performance(db: Session, period: str = "ALL") -> PerformanceOut:
    start_date = _period_start(period)
    end_date = date.today()

    if period == "ALL":
        earliest = db.query(func.min(Transaction.date)).scalar()
        if earliest:
            if hasattr(earliest, "date"):
                start_date = earliest.date()
            else:
                start_date = earliest

    series, transactions = _build_time_series(db, start_date, end_date)

    if not series:
        return PerformanceOut(time_series=[])

    first_value = series[0].value
    last_value = series[-1].value
    total_return_eur = last_value - first_value if first_value else None
    total_return_pct = (
        (total_return_eur / first_value * Decimal(100))
        if total_return_eur is not None and first_value
        else None
    )

    twr, twr_cumulative = _compute_twr(series, transactions, start_date)
    irr = _compute_irr(series, transactions)
    max_drawdown = _compute_max_drawdown(series)

    return PerformanceOut(
        time_series=series,
        total_return_eur=total_return_eur,
        total_return_pct=total_return_pct,
        twr=twr,
        twr_cumulative=twr_cumulative,
        irr=irr,
        max_drawdown=max_drawdown,
    )
