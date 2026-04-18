"""
Tests for GET /portfolio/goals and PUT /portfolio/goals/{dimension}.
"""

import pytest


class TestGetGoals:
    def test_get_goals_empty(self, client):
        res = client.get("/api/portfolio/goals")
        assert res.status_code == 200
        data = res.json()
        assert data == {"sector": [], "region": [], "asset_type": []}

    def test_get_goals_returns_saved(self, client):
        client.put("/api/portfolio/goals/sector", json=[
            {"name": "Technology", "target_weight": 30},
            {"name": "Finance", "target_weight": 20},
        ])
        res = client.get("/api/portfolio/goals")
        assert res.status_code == 200
        sector = res.json()["sector"]
        names = {g["name"] for g in sector}
        assert names == {"Technology", "Finance"}

    def test_get_goals_other_dimensions_empty_if_not_set(self, client):
        client.put("/api/portfolio/goals/sector", json=[{"name": "Technology", "target_weight": 30}])
        res = client.get("/api/portfolio/goals")
        assert res.json()["region"] == []
        assert res.json()["asset_type"] == []


class TestPutGoals:
    def test_put_sector_stores_correctly(self, client):
        res = client.put("/api/portfolio/goals/sector", json=[
            {"name": "Technology", "target_weight": 40.5},
        ])
        assert res.status_code == 200
        row = res.json()[0]
        assert row["name"] == "Technology"
        assert row["target_weight"] == 40.5
        assert row["dimension"] == "sector"
        assert "id" in row

    def test_put_replaces_not_appends(self, client):
        client.put("/api/portfolio/goals/sector", json=[{"name": "Technology", "target_weight": 30}])
        client.put("/api/portfolio/goals/sector", json=[{"name": "Finance", "target_weight": 20}])
        res = client.get("/api/portfolio/goals")
        sector = res.json()["sector"]
        names = [g["name"] for g in sector]
        assert "Finance" in names
        assert "Technology" not in names

    def test_put_empty_list_clears_dimension(self, client):
        client.put("/api/portfolio/goals/sector", json=[{"name": "Technology", "target_weight": 30}])
        client.put("/api/portfolio/goals/sector", json=[])
        res = client.get("/api/portfolio/goals")
        assert res.json()["sector"] == []

    def test_put_invalid_dimension_returns_422(self, client):
        res = client.put("/api/portfolio/goals/invalid_dim", json=[{"name": "X", "target_weight": 10}])
        assert res.status_code == 422

    def test_put_target_weight_over_100_returns_422(self, client):
        res = client.put("/api/portfolio/goals/sector", json=[{"name": "X", "target_weight": 150}])
        assert res.status_code == 422

    def test_put_target_weight_negative_returns_422(self, client):
        res = client.put("/api/portfolio/goals/sector", json=[{"name": "X", "target_weight": -5}])
        assert res.status_code == 422

    def test_put_region_and_asset_type(self, client):
        res_r = client.put("/api/portfolio/goals/region", json=[{"name": "Europe", "target_weight": 50}])
        res_a = client.put("/api/portfolio/goals/asset_type", json=[{"name": "Stock", "target_weight": 80}])
        assert res_r.status_code == 200
        assert res_a.status_code == 200
        data = client.get("/api/portfolio/goals").json()
        assert data["region"][0]["name"] == "Europe"
        assert data["asset_type"][0]["name"] == "Stock"
