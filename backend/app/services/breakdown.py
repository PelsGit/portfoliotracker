from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.security_info import SecurityInfo
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


def get_breakdown(db: Session) -> dict:
    holdings = get_holdings(db)
    if not holdings:
        return {"sector": [], "region": [], "asset_type": []}

    isins = [h.isin for h in holdings]
    infos = db.query(SecurityInfo).filter(SecurityInfo.isin.in_(isins)).all()
    info_map = {si.isin: si for si in infos}

    sector_agg = defaultdict(lambda: {"value": Decimal(0), "count": 0})
    region_agg = defaultdict(lambda: {"value": Decimal(0), "count": 0})
    asset_agg = defaultdict(lambda: {"value": Decimal(0), "count": 0})

    for h in holdings:
        v = h.value or Decimal(0)
        if h.is_cash:
            sector = "Cash"
            region = "Cash"
            asset_type = "Cash"
        else:
            si = info_map.get(h.isin)
            sector = si.sector if si and si.sector else "Unknown"
            country = si.country if si else None
            region = _get_region(country)
            asset_type = si.asset_type if si and si.asset_type else "Unknown"

        sector_agg[sector]["value"] += v
        sector_agg[sector]["count"] += 1
        region_agg[region]["value"] += v
        region_agg[region]["count"] += 1
        asset_agg[asset_type]["value"] += v
        asset_agg[asset_type]["count"] += 1

    total = sum(h.value for h in holdings if h.value) or Decimal(1)

    def to_items(agg):
        items = [
            {
                "name": k,
                "value": v["value"],
                "weight": v["value"] / total * 100,
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
    }
