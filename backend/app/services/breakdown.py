from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.security_info import SecurityInfo
from app.models.transaction import Transaction
from app.services.portfolio import get_holdings

COUNTRY_TO_REGION = {
    "United States": "North America",
    "Canada": "North America",
    "United Kingdom": "Europe",
    "Germany": "Europe",
    "France": "Europe",
    "Netherlands": "Europe",
    "Switzerland": "Europe",
    "Ireland": "Europe",
    "Sweden": "Europe",
    "Italy": "Europe",
    "Spain": "Europe",
    "Belgium": "Europe",
    "Denmark": "Europe",
    "Finland": "Europe",
    "Norway": "Europe",
    "Austria": "Europe",
    "Portugal": "Europe",
    "Luxembourg": "Europe",
    "Japan": "Asia Pacific",
    "China": "Asia Pacific",
    "Hong Kong": "Asia Pacific",
    "South Korea": "Asia Pacific",
    "Taiwan": "Asia Pacific",
    "Australia": "Asia Pacific",
    "India": "Asia Pacific",
    "Singapore": "Asia Pacific",
    "Brazil": "Latin America",
    "Mexico": "Latin America",
    "Israel": "Middle East",
    "South Africa": "Africa",
}


def _get_region(country: str | None) -> str:
    if not country:
        return "Unknown"
    return COUNTRY_TO_REGION.get(country, "Other")


def _get_market_cap_bucket(market_cap) -> str:
    if market_cap is None:
        return "Unknown"
    mc = float(market_cap)
    if mc >= 200_000_000_000:
        return "Mega cap (>$200B)"
    if mc >= 10_000_000_000:
        return "Large cap ($10B–$200B)"
    if mc >= 2_000_000_000:
        return "Mid cap ($2B–$10B)"
    if mc >= 300_000_000:
        return "Small cap ($300M–$2B)"
    return "Micro cap (<$300M)"


def _primary_value(agg: dict, key: str) -> str:
    """Return the key with the highest value from a dict of {key: value}."""
    return max(agg, key=lambda k: agg[k], default=key)


def get_breakdown(db: Session) -> dict:
    holdings = get_holdings(db)
    if not holdings:
        return {
            "sector": [], "region": [], "asset_type": [],
            "industry": [], "market_cap": [], "exchange": [], "broker": [],
        }

    isins = [h.isin for h in holdings if not h.is_cash]
    infos = db.query(SecurityInfo).filter(SecurityInfo.isin.in_(isins)).all()
    info_map = {si.isin: si for si in infos}

    # Get primary exchange and broker per ISIN (by total EUR volume)
    txn_rows = (
        db.query(Transaction.isin, Transaction.exchange, Transaction.broker, Transaction.total)
        .filter(Transaction.isin.in_(isins))
        .all()
    )
    isin_exchange: dict[str, dict[str, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    isin_broker: dict[str, dict[str, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    for row in txn_rows:
        vol = abs(Decimal(str(row.total))) if row.total else Decimal(0)
        if row.exchange:
            isin_exchange[row.isin][row.exchange] += vol
        if row.broker:
            isin_broker[row.isin][row.broker] += vol

    def primary_label(isin_map, isin, fallback="Unknown") -> str:
        buckets = isin_map.get(isin)
        if not buckets:
            return fallback
        return max(buckets, key=lambda k: buckets[k])

    sector_agg = defaultdict(lambda: {"value": Decimal(0), "count": 0})
    region_agg = defaultdict(lambda: {"value": Decimal(0), "count": 0})
    asset_agg = defaultdict(lambda: {"value": Decimal(0), "count": 0})
    industry_agg = defaultdict(lambda: {"value": Decimal(0), "count": 0})
    market_cap_agg = defaultdict(lambda: {"value": Decimal(0), "count": 0})
    exchange_agg = defaultdict(lambda: {"value": Decimal(0), "count": 0})
    broker_agg = defaultdict(lambda: {"value": Decimal(0), "count": 0})

    for h in holdings:
        v = h.value or Decimal(0)
        if h.is_cash:
            sector_agg["Cash"]["value"] += v
            sector_agg["Cash"]["count"] += 1
            region_agg["Cash"]["value"] += v
            region_agg["Cash"]["count"] += 1
            asset_agg["Cash"]["value"] += v
            asset_agg["Cash"]["count"] += 1
            industry_agg["Cash"]["value"] += v
            industry_agg["Cash"]["count"] += 1
            market_cap_agg["Cash"]["value"] += v
            market_cap_agg["Cash"]["count"] += 1
            broker_agg["Cash"]["value"] += v
            broker_agg["Cash"]["count"] += 1
            exchange_agg["Cash"]["value"] += v
            exchange_agg["Cash"]["count"] += 1
            continue

        si = info_map.get(h.isin)
        sector = si.sector if si and si.sector else "Unknown"
        country = si.country if si else None
        region = _get_region(country)
        asset_type = si.asset_type if si and si.asset_type else "Unknown"
        industry = si.industry if si and si.industry else "Unknown"
        mc_bucket = _get_market_cap_bucket(si.market_cap if si else None)
        exchange = primary_label(isin_exchange, h.isin)
        broker = primary_label(isin_broker, h.isin)

        for agg, label in [
            (sector_agg, sector),
            (region_agg, region),
            (asset_agg, asset_type),
            (industry_agg, industry),
            (market_cap_agg, mc_bucket),
            (exchange_agg, exchange),
            (broker_agg, broker),
        ]:
            agg[label]["value"] += v
            agg[label]["count"] += 1

    total = sum(h.value for h in holdings if h.value) or Decimal(1)

    def to_items(agg):
        items = [
            {
                "name": k,
                "value": float(v["value"]),
                "weight": float(v["value"] / total * 100),
                "holdings_count": v["count"],
            }
            for k, v in agg.items()
        ]
        items.sort(key=lambda x: x["value"], reverse=True)
        return items

    return {
        "sector": to_items(sector_agg),
        "region": to_items(region_agg),
        "asset_type": to_items(asset_agg),
        "industry": to_items(industry_agg),
        "market_cap": to_items(market_cap_agg),
        "exchange": to_items(exchange_agg),
        "broker": to_items(broker_agg),
    }
