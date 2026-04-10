from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.cash_balance import CashBalance
from app.models.price import Price
from app.models.security_info import SecurityInfo
from app.models.transaction import Transaction
from app.schemas.portfolio import HoldingOut, PortfolioSummaryOut


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

    security_info_map = {
        si.isin: si
        for si in db.query(SecurityInfo).filter(SecurityInfo.isin.in_(list(by_isin.keys()))).all()
    }

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

        # Prices are stored normalised to EUR by the fetcher
        raw_price = price_map.get(isin)
        current_price = _to_decimal(raw_price) if raw_price is not None else None

        if current_price is not None:
            value = net_shares * current_price
            return_eur = value - cost_basis
            return_pct = (return_eur / cost_basis * 100) if cost_basis else None
        else:
            value = None
            return_eur = None
            return_pct = None

        most_recent = max(txns, key=lambda t: t.date)
        si = security_info_map.get(isin)

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
            logo_url=si.logo_url if si else None,
        ))

    total_value = sum(h.value for h in holdings if h.value is not None)
    if total_value:
        for h in holdings:
            if h.value is not None:
                h.weight = h.value / total_value * 100

    # Append cash row and recalculate weights
    cash_row = db.query(CashBalance).first()
    if cash_row and _to_decimal(cash_row.amount_eur) > 0:
        cash_value = _to_decimal(cash_row.amount_eur)
        holdings.append(HoldingOut(
            isin="CASH",
            product_name="Cash",
            shares=Decimal(1),
            avg_cost=cash_value,
            current_price=cash_value,
            value=cash_value,
            cost_basis=cash_value,
            return_eur=Decimal(0),
            return_pct=Decimal(0),
            weight=None,
            is_cash=True,
        ))
        total_with_cash = sum(h.value for h in holdings if h.value is not None)
        if total_with_cash:
            for h in holdings:
                if h.value is not None:
                    h.weight = h.value / total_with_cash * 100

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
