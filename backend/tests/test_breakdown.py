from datetime import date, datetime, timezone
from decimal import Decimal

import pytest

from app.models.price import Price
from app.models.security_info import SecurityInfo
from app.models.transaction import Transaction
from app.services.breakdown import get_breakdown


def _add_holding(db, isin, product, quantity, total, close_price, sector=None, country=None, asset_type=None):
    """Add a transaction, price, and optionally security info for a test holding."""
    db.add(Transaction(
        isin=isin,
        product_name=product,
        date=datetime(2026, 4, 1, tzinfo=timezone.utc),
        quantity=quantity,
        total=total,
        order_id=f"order-{isin}",
    ))
    db.add(Price(isin=isin, date=date(2026, 4, 7), close_price=close_price))
    if sector or country or asset_type:
        db.add(SecurityInfo(
            isin=isin, sector=sector, country=country, asset_type=asset_type,
        ))
    db.commit()


def test_breakdown_empty(db_session):
    result = get_breakdown(db_session)
    assert result == {
        "sector": [], "region": [], "asset_type": [],
        "industry": [], "market_cap": [], "exchange": [], "broker": [],
    }


def test_breakdown_single_holding(db_session):
    _add_holding(db_session, "US1111111111", "TECH CORP", 10, -1000, 150.0,
                 sector="Technology", country="United States", asset_type="Stock")

    result = get_breakdown(db_session)
    assert len(result["sector"]) == 1
    assert result["sector"][0]["name"] == "Technology"
    assert result["sector"][0]["value"] == pytest.approx(1500.0)
    assert result["sector"][0]["weight"] == pytest.approx(100.0)
    assert result["sector"][0]["holdings_count"] == 1

    assert len(result["region"]) == 1
    assert result["region"][0]["name"] == "North America"

    assert len(result["asset_type"]) == 1
    assert result["asset_type"][0]["name"] == "Stock"


def test_breakdown_multiple_sectors(db_session):
    _add_holding(db_session, "US1111111111", "TECH CORP", 10, -1000, 100.0,
                 sector="Technology", country="United States", asset_type="Stock")
    _add_holding(db_session, "US2222222222", "HEALTH CORP", 10, -1000, 200.0,
                 sector="Healthcare", country="United States", asset_type="Stock")

    result = get_breakdown(db_session)
    assert len(result["sector"]) == 2
    # Sorted by value descending
    assert result["sector"][0]["name"] == "Healthcare"
    assert result["sector"][1]["name"] == "Technology"

    # Region aggregated (both US)
    assert len(result["region"]) == 1
    assert result["region"][0]["name"] == "North America"
    assert result["region"][0]["holdings_count"] == 2


def test_breakdown_missing_security_info(db_session):
    _add_holding(db_session, "US1111111111", "UNKNOWN CORP", 10, -1000, 100.0)

    result = get_breakdown(db_session)
    assert result["sector"][0]["name"] == "Unknown"
    assert result["region"][0]["name"] == "Unknown"
    assert result["asset_type"][0]["name"] == "Unknown"


def test_breakdown_weights(db_session):
    _add_holding(db_session, "US1111111111", "BIG CORP", 10, -1000, 300.0,
                 sector="Technology", country="United States", asset_type="Stock")
    _add_holding(db_session, "US2222222222", "SMALL CORP", 10, -1000, 100.0,
                 sector="Finance", country="United Kingdom", asset_type="Stock")

    result = get_breakdown(db_session)
    tech = next(s for s in result["sector"] if s["name"] == "Technology")
    finance = next(s for s in result["sector"] if s["name"] == "Finance")
    assert tech["weight"] == pytest.approx(75.0)
    assert finance["weight"] == pytest.approx(25.0)


def test_breakdown_api_endpoint(client, db_session):
    _add_holding(db_session, "US1111111111", "TECH CORP", 10, -1000, 100.0,
                 sector="Technology", country="United States", asset_type="Stock")

    response = client.get("/api/portfolio/breakdown")
    assert response.status_code == 200
    data = response.json()
    assert len(data["sector"]) == 1
    assert data["sector"][0]["name"] == "Technology"
    assert len(data["region"]) == 1
    assert len(data["asset_type"]) == 1


def test_breakdown_api_empty(client):
    response = client.get("/api/portfolio/breakdown")
    assert response.status_code == 200
    data = response.json()
    assert data == {
        "sector": [], "region": [], "asset_type": [],
        "industry": [], "market_cap": [], "exchange": [], "broker": [],
    }
