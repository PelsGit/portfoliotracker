from datetime import datetime, timezone
from unittest.mock import patch

from app.models.transaction import Transaction
from app.services import price_refresh


def test_refresh_starts_background_task(client, db_session):
    db_session.add(Transaction(isin="US1234567890", date=datetime(2026, 4, 1, tzinfo=timezone.utc), quantity=10))
    db_session.commit()

    price_refresh._refresh_state["refreshing"] = False
    price_refresh._refresh_state["last_refresh"] = None

    with patch("app.services.price_refresh.fetch_prices_for_isins"):
        resp = client.post("/api/prices/refresh")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "started"
    assert data["securities_count"] == 1


def test_refresh_no_transactions(client):
    price_refresh._refresh_state["refreshing"] = False

    resp = client.post("/api/prices/refresh")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "started"
    assert data["securities_count"] == 0


def test_refresh_already_running(client, db_session):
    db_session.add(Transaction(isin="US1234567890", date=datetime(2026, 4, 1, tzinfo=timezone.utc), quantity=10))
    db_session.commit()

    price_refresh._refresh_state["refreshing"] = True

    resp = client.post("/api/prices/refresh")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "already_refreshing"
    assert data["securities_count"] == 1

    price_refresh._refresh_state["refreshing"] = False


def test_status_default(client):
    price_refresh._refresh_state["refreshing"] = False
    price_refresh._refresh_state["last_refresh"] = None

    resp = client.get("/api/prices/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["refreshing"] is False
    assert data["last_refresh"] is None


def test_status_shows_last_refresh(client):
    now = datetime(2026, 4, 8, 18, 30, 0, tzinfo=timezone.utc)
    price_refresh._refresh_state["refreshing"] = False
    price_refresh._refresh_state["last_refresh"] = now

    resp = client.get("/api/prices/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["refreshing"] is False
    assert data["last_refresh"] is not None
    assert "2026-04-08" in data["last_refresh"]

    price_refresh._refresh_state["last_refresh"] = None
