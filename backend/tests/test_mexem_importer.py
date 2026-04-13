import io
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.services.importer.mexem import parse_mexem_cash_balance, parse_mexem_xml

# ---------------------------------------------------------------------------
# Sample XML fragments
# ---------------------------------------------------------------------------

FLEX_WRAP_OPEN = """<?xml version="1.0" encoding="UTF-8"?>
<FlexQueryResponse queryName="PDT" type="AF">
  <FlexStatements count="1">
    <FlexStatement accountId="U12345678" fromDate="20240101" toDate="20241231">
      <Trades>
"""

FLEX_WRAP_CLOSE = """      </Trades>
    </FlexStatement>
  </FlexStatements>
</FlexQueryResponse>"""


def _wrap(trade_xml: str) -> str:
    return FLEX_WRAP_OPEN + trade_xml + FLEX_WRAP_CLOSE


# One USD buy: 10 shares of AAPL at 185.50 USD, commission -1.00 USD, fxRateToBase 0.92
# Real MEXEM: tradeMoney is POSITIVE for buys (negated by parser → local_value = -1855.00)
# dateTime uses no-colon HHMMSS format as seen in real exports
SAMPLE_BUY_TRADE = """
        <Trade
          accountId="U12345678"
          currency="USD"
          assetCategory="STK"
          symbol="AAPL"
          isin="US0378331005"
          description="APPLE INC"
          tradeID="111111"
          ibOrderID="999111"
          reportDate="20240115"
          tradeDate="20240115"
          dateTime="20240115;093000"
          exchange="NASDAQ"
          quantity="10"
          tradePrice="185.50"
          tradeMoney="1855.00"
          proceeds="-1855.00"
          ibCommission="-1.00"
          ibCommissionCurrency="USD"
          netCash="-1856.00"
          fxRateToBase="0.92"
          buySell="BUY"
          transactionType="ExchTrade"
        />
"""

# One USD sell: -5 shares of AAPL at 200.00 USD, commission -0.80 USD
# Real MEXEM: tradeMoney is NEGATIVE for sells (negated by parser → local_value = +1000.00)
SAMPLE_SELL_TRADE = """
        <Trade
          accountId="U12345678"
          currency="USD"
          assetCategory="STK"
          symbol="AAPL"
          isin="US0378331005"
          description="APPLE INC"
          tradeID="222222"
          ibOrderID="999222"
          reportDate="20240120"
          tradeDate="20240120"
          dateTime="20240120;101500"
          exchange="NASDAQ"
          quantity="-5"
          tradePrice="200.00"
          tradeMoney="-1000.00"
          proceeds="1000.00"
          ibCommission="-0.80"
          ibCommissionCurrency="USD"
          netCash="999.20"
          fxRateToBase="0.91"
          buySell="SELL"
          transactionType="ExchTrade"
        />
"""

# EUR-denominated ETF buy (VWCE.DE)
# Real MEXEM: tradeMoney positive for buy
SAMPLE_EUR_TRADE = """
        <Trade
          accountId="U12345678"
          currency="EUR"
          assetCategory="STK"
          symbol="VWCE"
          isin="IE00BK5BQT80"
          description="VANGUARD FTSE ALL-WORLD"
          tradeID="333333"
          ibOrderID="999333"
          reportDate="20240201"
          tradeDate="20240201"
          dateTime="20240201;140000"
          exchange="XETRA"
          quantity="5"
          tradePrice="110.20"
          tradeMoney="551.00"
          proceeds="-551.00"
          ibCommission="-2.00"
          ibCommissionCurrency="EUR"
          netCash="-553.00"
          fxRateToBase="1"
          buySell="BUY"
          transactionType="ExchTrade"
        />
"""

# Option trade — should be ignored
SAMPLE_OPTION_TRADE = """
        <Trade
          accountId="U12345678"
          currency="USD"
          assetCategory="OPT"
          symbol="AAPL 20240119C00185000"
          isin=""
          description="AAPL JAN2024 185 C"
          tradeID="444444"
          dateTime="20240110;10:00:00"
          quantity="1"
          tradePrice="3.50"
          tradeMoney="-350.00"
          ibCommission="-0.70"
          fxRateToBase="0.92"
          buySell="BUY"
          transactionType="ExchTrade"
        />
"""

# Trade without ISIN — should be ignored
SAMPLE_NO_ISIN_TRADE = """
        <Trade
          accountId="U12345678"
          currency="USD"
          assetCategory="STK"
          symbol="UNKN"
          isin=""
          description="UNKNOWN"
          tradeID="555555"
          dateTime="20240115;09:30:00"
          quantity="10"
          tradePrice="10.00"
          tradeMoney="-100.00"
          buySell="BUY"
          transactionType="ExchTrade"
        />
"""

CASH_REPORT_XML = """<?xml version="1.0" encoding="UTF-8"?>
<FlexQueryResponse queryName="PDT" type="AF">
  <FlexStatements count="1">
    <FlexStatement accountId="U12345678">
      <Trades/>
      <CashReport>
        <CashReportCurrency currency="BASE_SUMMARY" endingCash="12345.00"/>
        <CashReportCurrency currency="EUR" endingCash="9876.54"/>
        <CashReportCurrency currency="USD" endingCash="2468.46"/>
      </CashReport>
    </FlexStatement>
  </FlexStatements>
</FlexQueryResponse>"""


# ---------------------------------------------------------------------------
# Tests: parse_mexem_xml
# ---------------------------------------------------------------------------


class TestParseMexemXmlBuy:
    def test_returns_one_transaction(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        assert len(rows) == 1

    def test_isin(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        assert rows[0]["isin"] == "US0378331005"

    def test_product_name(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        assert rows[0]["product_name"] == "APPLE INC"

    def test_quantity_positive_for_buy(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        assert rows[0]["quantity"] == Decimal("10")

    def test_price(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        assert rows[0]["price"] == Decimal("185.50")

    def test_local_value(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        assert rows[0]["local_value"] == Decimal("-1855.00")

    def test_local_currency(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        assert rows[0]["local_currency"] == "USD"

    def test_eur_value_computed_from_fx(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        # -1855.00 * 0.92 = -1706.60
        assert rows[0]["value"] == Decimal("-1706.60")

    def test_costs_in_eur(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        # -1.00 * 0.92 = -0.92
        assert rows[0]["costs"] == Decimal("-0.92")

    def test_total(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        assert rows[0]["total"] == Decimal("-1707.52")

    def test_order_id_is_trade_id(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        assert rows[0]["order_id"] == "111111"

    def test_exchange(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        assert rows[0]["exchange"] == "NASDAQ"

    def test_date_is_utc(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE))
        assert rows[0]["date"] == datetime(2024, 1, 15, 9, 30, 0, tzinfo=timezone.utc)

    def test_date_with_colon_format(self):
        # Ensure the colon-separated time format also works
        xml = _wrap(SAMPLE_BUY_TRADE.replace('dateTime="20240115;093000"', 'dateTime="20240115;09:30:00"'))
        rows = parse_mexem_xml(xml)
        assert rows[0]["date"] == datetime(2024, 1, 15, 9, 30, 0, tzinfo=timezone.utc)


class TestParseMexemXmlSell:
    def test_quantity_negative_for_sell(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_SELL_TRADE))
        assert rows[0]["quantity"] == Decimal("-5")

    def test_local_value_positive_for_sell(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_SELL_TRADE))
        assert rows[0]["local_value"] == Decimal("1000.00")

    def test_eur_value_positive_for_sell(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_SELL_TRADE))
        # 1000.00 * 0.91 = 910.00
        assert rows[0]["value"] == Decimal("910.00")


class TestParseMexemXmlEurTrade:
    def test_eur_trade_value_equals_local_value(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_EUR_TRADE))
        assert rows[0]["value"] == Decimal("-551.00")

    def test_eur_trade_no_stored_fx(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_EUR_TRADE))
        assert rows[0]["fx_rate"] is None

    def test_eur_trade_costs_in_eur(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_EUR_TRADE))
        assert rows[0]["costs"] == Decimal("-2.00")

    def test_eur_trade_total(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_EUR_TRADE))
        assert rows[0]["total"] == Decimal("-553.00")


class TestParseMexemXmlFiltering:
    def test_option_trades_ignored(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_OPTION_TRADE))
        assert rows == []

    def test_no_isin_ignored(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_NO_ISIN_TRADE))
        assert rows == []

    def test_multiple_trades(self):
        xml = _wrap(SAMPLE_BUY_TRADE + SAMPLE_SELL_TRADE + SAMPLE_EUR_TRADE + SAMPLE_OPTION_TRADE)
        rows = parse_mexem_xml(xml)
        assert len(rows) == 3

    def test_bytes_input(self):
        rows = parse_mexem_xml(_wrap(SAMPLE_BUY_TRADE).encode("utf-8"))
        assert len(rows) == 1

    def test_invalid_xml_raises(self):
        with pytest.raises(ValueError, match="Invalid XML"):
            parse_mexem_xml(b"not xml at all")

    def test_empty_trades_section(self):
        xml = _wrap("")
        rows = parse_mexem_xml(xml)
        assert rows == []


class TestParseMexemCashBalance:
    def test_returns_eur_ending_cash(self):
        balance = parse_mexem_cash_balance(CASH_REPORT_XML)
        assert balance == Decimal("9876.54")

    def test_returns_none_when_no_cash_report(self):
        xml = _wrap(SAMPLE_BUY_TRADE)
        assert parse_mexem_cash_balance(xml) is None

    def test_bytes_input(self):
        balance = parse_mexem_cash_balance(CASH_REPORT_XML.encode("utf-8"))
        assert balance == Decimal("9876.54")

    def test_invalid_xml_returns_none(self):
        assert parse_mexem_cash_balance(b"not xml") is None


class TestMexemImportEndpoints:
    def test_preview_endpoint(self, client):
        xml = _wrap(SAMPLE_BUY_TRADE).encode("utf-8")
        response = client.post(
            "/api/import/mexem/preview",
            files={"file": ("export.xml", io.BytesIO(xml), "application/xml")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert data["transactions"][0]["isin"] == "US0378331005"

    def test_preview_rejects_non_xml(self, client):
        response = client.post(
            "/api/import/mexem/preview",
            files={"file": ("export.csv", io.BytesIO(b"a,b,c"), "text/csv")},
        )
        assert response.status_code == 400

    def test_confirm_endpoint_imports(self, client):
        xml = _wrap(SAMPLE_BUY_TRADE).encode("utf-8")
        response = client.post(
            "/api/import/mexem/confirm",
            files={"file": ("export.xml", io.BytesIO(xml), "application/xml")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["imported"] == 1
        assert data["skipped"] == 0

    def test_confirm_idempotent(self, client):
        xml = _wrap(SAMPLE_BUY_TRADE).encode("utf-8")
        client.post(
            "/api/import/mexem/confirm",
            files={"file": ("export.xml", io.BytesIO(xml), "application/xml")},
        )
        response = client.post(
            "/api/import/mexem/confirm",
            files={"file": ("export.xml", io.BytesIO(xml), "application/xml")},
        )
        data = response.json()
        assert data["imported"] == 0
        assert data["skipped"] == 1
