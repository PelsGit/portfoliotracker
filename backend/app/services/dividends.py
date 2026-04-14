from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.dividend import Dividend
from app.models.transaction import Transaction


def get_dividends(db: Session) -> list[Dividend]:
    return db.query(Dividend).order_by(Dividend.dividend_date.desc()).all()


def get_dividends_summary(db: Session) -> dict:
    rows = db.query(Dividend).all()

    total_eur = sum((r.amount_eur for r in rows), Decimal(0))
    this_year = sum(
        (r.amount_eur for r in rows if r.dividend_date.year == _current_year()),
        Decimal(0),
    )

    # Monthly buckets (rolling all time, grouped by YYYY-MM)
    monthly: dict[str, Decimal] = {}
    for r in rows:
        key = r.dividend_date.strftime("%Y-%m")
        monthly[key] = monthly.get(key, Decimal(0)) + r.amount_eur
    monthly_list = [{"month": k, "amount_eur": v} for k, v in sorted(monthly.items())]

    months_with_income = len(monthly_list)
    monthly_avg = (total_eur / months_with_income).quantize(Decimal("0.01")) if months_with_income else Decimal(0)

    # Per-holding totals
    by_isin: dict[str, dict] = {}
    for r in rows:
        entry = by_isin.setdefault(r.isin, {"isin": r.isin, "product_name": r.product_name, "total_eur": Decimal(0)})
        entry["total_eur"] += r.amount_eur
        if r.product_name and not entry["product_name"]:
            entry["product_name"] = r.product_name

    # Cost basis per ISIN (sum of |total| for buy transactions)
    cost_by_isin: dict[str, Decimal] = {}
    for isin in by_isin:
        txns = db.query(Transaction.total, Transaction.quantity).filter(Transaction.isin == isin).all()
        cost = sum((abs(t.total) for t in txns if t.quantity and t.quantity > 0 and t.total), Decimal(0))
        cost_by_isin[isin] = cost

    by_holding = []
    for isin, entry in by_isin.items():
        cost = cost_by_isin.get(isin, Decimal(0))
        yield_on_cost = (entry["total_eur"] / cost * 100).quantize(Decimal("0.01")) if cost else None
        by_holding.append({
            "isin": isin,
            "product_name": entry["product_name"],
            "total_eur": entry["total_eur"],
            "yield_on_cost": yield_on_cost,
        })
    by_holding.sort(key=lambda x: x["total_eur"], reverse=True)

    return {
        "total_eur": total_eur,
        "this_year_eur": this_year,
        "monthly_avg_eur": monthly_avg,
        "paying_holdings": len(by_isin),
        "monthly": monthly_list,
        "by_holding": by_holding,
    }


def _current_year() -> int:
    from datetime import date
    return date.today().year
