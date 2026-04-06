import io
from unittest.mock import patch

from tests.conftest import SAMPLE_CSV


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_import_degiro_preview(client):
    file = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    response = client.post("/api/import/degiro/preview", files={"file": ("transactions.csv", file, "text/csv")})
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    assert len(data["transactions"]) == 1
    assert data["transactions"][0]["isin"] == "NL0010273215"


def test_import_degiro_preview_invalid_extension(client):
    file = io.BytesIO(b"not a csv")
    response = client.post("/api/import/degiro/preview", files={"file": ("data.txt", file, "text/plain")})
    assert response.status_code == 400


@patch("app.routers.import_csv.fetch_prices_for_isins")
def test_import_degiro_confirm(mock_fetch, client):
    file = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    response = client.post("/api/import/degiro/confirm", files={"file": ("transactions.csv", file, "text/csv")})
    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 1
    assert data["skipped"] == 0
    assert len(data["transactions"]) == 1


@patch("app.routers.import_csv.fetch_prices_for_isins")
def test_import_degiro_confirm_idempotent(mock_fetch, client):
    file1 = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    client.post("/api/import/degiro/confirm", files={"file": ("transactions.csv", file1, "text/csv")})

    file2 = io.BytesIO(SAMPLE_CSV.encode("utf-8"))
    response = client.post("/api/import/degiro/confirm", files={"file": ("transactions.csv", file2, "text/csv")})
    data = response.json()
    assert data["imported"] == 0
    assert data["skipped"] == 1
