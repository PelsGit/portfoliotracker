from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.price import Price
from app.models.transaction import Transaction
from app.schemas.portfolio import HoldingOut, PortfolioSummaryOut
from app.services.prices.yfinance_fetcher import FX_ISIN


def _to_decimal(value) -> Decimal:
    if value is None:
        return Decimal(0)
    return Decimal(str(value))


def get_holdings(db: Session) -> list[HoldingOut]:
    transactions = db.query(Transaction).all()
    if not transactions:
        return []

    by_isin: dict[str, list] = {}
    for txn in transactions:
        by_isin.setdefault(txn.isin, []).append(txn)

    latest_date_subq = (
        db.query(Price.isin, func.max(Price.date).label("max_date"))
        .group_by(Price.isin)
        .subquery()
    )
    latest_prices = (
        db.query(Price.isin, Price.close_price)
        .join(
            latest_date_subq,
            (Price.isin == latest_date_subq.c.isin) & (Price.date == latest_date_subq.c.max_date),
        )
        .all()
    )
    price_map = {row.isin: row.close_price for row in latest_prices}

    eurusd_raw = price_map.get(FX_ISIN)
    eurusd_rate = _to_decimal(eurusd_raw) if eurusd_raw is not None else None

    holdings = []
    for isin, txns in by_isin.items():
        net_shares = sum(_to_decimal(t.quantity) for t in txns)
        if net_shares <= 0:
            continue

        buys = [t for t in txns if _to_decimal(t.quantity) > 0]
        total_bought_shares = sum(_to_decimal(t.quantity) for t in buys)
        # cost_basis in EUR: t.total is already the EUR amount paid/received
        total_bought_cost = sum(abs(_to_decimal(t.total)) for t in buys)
        avg_cost = total_bought_cost / total_bought_shares if total_bought_shares else Decimal(0)

        cost_basis = avg_cost * net_shares

        raw_price = price_map.get(isin)
        current_price_local = _to_decimal(raw_price) if raw_price is not None else None

        # Convert local price to EUR if stock is priced in USD
        local_currency = txns[0].local_currency if txns else None
        if current_price_local is not None:
            if local_currency == "USD" and eurusd_rate:
                current_price = current_price_local / eurusd_rate
            else:
                current_price = current_price_local
        else:
            current_price = None

        if current_price is not None:
            value = net_shares * current_price
            return_eur = value - cost_basis
            return_pct = (return_eur / cost_basis * 100) if cost_basis else None
        else:
            value = None
            return_eur = None
            return_pct = None

        most_recent = max(txns, key=lambda t: t.date)

        holdings.append(HoldingOut(
            isin=isin,
            product_name=most_recent.product_name,
            shares=net_shares,
            avg_cost=avg_cost,
            current_price=current_price,
            value=value,
            cost_basis=cost_basis,
            return_eur=return_eur,
            return_pct=return_pct,
            weight=None,
        ))

    total_value = sum(h.value for h in holdings if h.value is not None)
    if total_value:
        for h in holdings:
            if h.value is not None:
                h.weight = h.value / total_value * 100

    return holdings


def get_summary(db: Session, holdings: list[HoldingOut] | None = None) -> PortfolioSummaryOut:
    if holdings is None:
        holdings = get_holdings(db)

    total_value = sum(h.value for h in holdings if h.value is not None) or None
    total_cost = sum(h.cost_basis for h in holdings) if holdings else Decimal(0)
    total_return_eur = (total_value - total_cost) if total_value is not None else None
    total_return_pct = (
        (total_return_eur / total_cost * 100) if total_return_eur is not None and total_cost else None
    )

    last_import = db.query(func.max(Transaction.created_at)).scalar()

    return PortfolioSummaryOut(
        total_value=total_value,
        total_cost=total_cost,
        total_return_eur=total_return_eur,
        total_return_pct=total_return_pct,
        holdings_count=len(holdings),
        last_import_date=last_import,
    )
