"""
Tests for parse_trading212_csv(), parse_trading212_dividends(),
import_trading212_transactions(), and import_trading212_dividends().

All fixtures are constructed from the public Trading 212 CSV spec:
  Action, Time, ISIN, Ticker, Name, No. of shares, Price / share,
  Currency (Price / share), Exchange rate, Result (EUR), Total (EUR),
  Withholding tax, Currency (Withholding tax), Charge amount (EUR),
  Deposit fee (EUR), Notes, ID, Currency conversion fee (EUR)

Numbers use standard decimal notation (dot separator).
Exchange rate = local currency units per 1 EUR.
Total (EUR) is negative for buys, positive for sells and dividends.
"""

from datetime import date, datetime, timezone
from decimal import Decimal

import pytest

from app.services.importer.trading212 import (
    import_trading212_dividends,
    import_trading212_transactions,
    parse_trading212_csv,
    parse_trading212_dividends,
)

T212_HEADER = (
    "Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,"
    "Currency (Price / share),Exchange rate,Result (EUR),Total (EUR),"
    "Withholding tax,Currency (Withholding tax),Charge amount (EUR),"
    "Deposit fee (EUR),Notes,ID,Currency conversion fee (EUR)\n"
)

# Market buy: 10 AAPL @ $100 USD, FX 1.25 (1 EUR = 1.25 USD)
# Total (EUR) = -(1000/1.25) - 2 charge = -800 - 2 = -802
SAMPLE_USD_BUY = (
    "Market buy,2024-01-15 14:30:00,US0378331005,AAPL,Apple Inc.,"
    "10,100.00,USD,1.25,,-802.00,,,2.00,,,-T212-BUY-001,\n"
)

# Market sell: 10 AAPL @ $110 USD, FX 1.25
# Total (EUR) = (1100/1.25) - 2 charge = 880 - 2 = 878
SAMPLE_USD_SELL = (
    "Market sell,2024-02-10 10:00:00,US0378331005,AAPL,Apple Inc.,"
    "10,110.00,USD,1.25,80.00,878.00,,,2.00,,,-T212-SELL-001,\n"
)

# EUR buy: 5 ASML @ €700, no FX conversion needed (exchange rate = 1)
# Total (EUR) = -(5 * 700) - 2 charge = -3500 - 2 = -3502
SAMPLE_EUR_BUY = (
    "Market buy,2024-01-20 09:00:00,NL0010273215,ASML,ASML Holding NV,"
    "5,700.00,EUR,1.00,,-3502.00,,,2.00,,,-T212-EUR-BUY,\n"
)

# USD dividend: $27.50 gross, 15% withholding ($3.30), net $24.20
# FX = 1.10 → withholding_tax_eur = 3.30 / 1.10 = 3.00, net EUR = 22.00
# gross_eur = 22.00 + 3.00 = 25.00, local_amount = 25.00 * 1.10 = 27.50
SAMPLE_USD_DIVIDEND = (
    "Dividend,2024-03-15 08:00:00,US0378331005,AAPL,Apple Inc.,"
    ",1.10,USD,1.10,22.00,22.00,3.30,USD,,,,T212-DIV-001,\n"
)

# EUR dividend: no withholding, net = gross = €15
SAMPLE_EUR_DIVIDEND = (
    "Dividend,2024-04-01 09:00:00,NL0010273215,ASML,ASML Holding NV,"
    ",1.50,EUR,1.00,15.00,15.00,,EUR,,,,T212-DIV-002,\n"
)

# Non-trade rows that must be skipped by parse_trading212_csv
SAMPLE_DEPOSIT = (
    "Deposit,2024-01-01 10:00:00,,,,,,EUR,,,"
    "1000.00,,,,,,-T212-DEP-001,\n"
)
SAMPLE_WITHDRAWAL = (
    "Withdrawal,2024-01-05 10:00:00,,,,,,EUR,,,"
    "-500.00,,,,,,-T212-WIT-001,\n"
)
SAMPLE_INTEREST = (
    "Interest on cash,2024-02-01 00:00:00,,,,,,EUR,,,"
    "0.50,,,,,,-T212-INT-001,\n"
)


class TestParseTrades:
    def test_usd_buy_quantity(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_BUY)
        assert len(rows) == 1
        assert rows[0]["quantity"] == Decimal("10")

    def test_usd_buy_isin(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_BUY)
        assert rows[0]["isin"] == "US0378331005"

    def test_usd_buy_local_currency(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_BUY)
        assert rows[0]["local_currency"] == "USD"

    def test_usd_buy_total_negative(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_BUY)
        assert rows[0]["total"] == Decimal("-802.00")

    def test_usd_buy_value_excludes_charge(self):
        """value should be pre-fee EUR amount: -802 + 2 = -800."""
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_BUY)
        assert rows[0]["value"] == Decimal("-800.00")

    def test_usd_buy_costs_negative(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_BUY)
        assert rows[0]["costs"] == Decimal("-2.00")

    def test_usd_buy_fx_rate(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_BUY)
        assert rows[0]["fx_rate"] == Decimal("1.25")

    def test_usd_buy_local_value(self):
        """local_value = -(quantity * price) = -(10 * 100) = -1000."""
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_BUY)
        assert rows[0]["local_value"] == Decimal("-1000.00")

    def test_usd_buy_date(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_BUY)
        expected = datetime(2024, 1, 15, 14, 30, 0, tzinfo=timezone.utc)
        assert rows[0]["date"] == expected

    def test_usd_buy_order_id(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_BUY)
        assert rows[0]["order_id"] == "-T212-BUY-001"

    def test_usd_sell_quantity_negative(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_SELL)
        assert rows[0]["quantity"] == Decimal("-10")

    def test_usd_sell_total_positive(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_SELL)
        assert rows[0]["total"] == Decimal("878.00")

    def test_usd_sell_value_includes_recovered_charge(self):
        """value = 878 + 2 = 880 (pre-fee proceeds)."""
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_SELL)
        assert rows[0]["value"] == Decimal("880.00")

    def test_eur_buy_fx_rate(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_EUR_BUY)
        assert rows[0]["fx_rate"] == Decimal("1.00")

    def test_eur_buy_local_value_equals_eur_value(self):
        """For EUR stocks local_value and value should both be -3500."""
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_EUR_BUY)
        assert rows[0]["local_value"] == Decimal("-3500.00")
        assert rows[0]["value"] == Decimal("-3500.00")

    def test_limit_buy_action_parsed(self):
        row = (
            "Limit buy,2024-05-01 11:00:00,US0378331005,AAPL,Apple Inc.,"
            "5,100.00,USD,1.25,,-500.00,,,,,,-T212-LMT-BUY,\n"
        )
        rows = parse_trading212_csv(T212_HEADER + row)
        assert len(rows) == 1
        assert rows[0]["quantity"] == Decimal("5")

    def test_stop_sell_action_parsed(self):
        row = (
            "Stop sell,2024-05-02 12:00:00,US0378331005,AAPL,Apple Inc.,"
            "5,95.00,USD,1.25,,375.00,,,,,,-T212-STP-SELL,\n"
        )
        rows = parse_trading212_csv(T212_HEADER + row)
        assert len(rows) == 1
        assert rows[0]["quantity"] == Decimal("-5")


class TestNonTradeRowsSkipped:
    def test_deposit_skipped(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_DEPOSIT)
        assert rows == []

    def test_withdrawal_skipped(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_WITHDRAWAL)
        assert rows == []

    def test_interest_skipped(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_INTEREST)
        assert rows == []

    def test_dividend_skipped_by_csv_parser(self):
        rows = parse_trading212_csv(T212_HEADER + SAMPLE_USD_DIVIDEND)
        assert rows == []


class TestMixedFile:
    def test_trades_only_from_mixed_file(self):
        mixed = T212_HEADER + SAMPLE_USD_BUY + SAMPLE_USD_SELL + SAMPLE_DEPOSIT + SAMPLE_USD_DIVIDEND
        trades = parse_trading212_csv(mixed)
        assert len(trades) == 2

    def test_dividends_only_from_mixed_file(self):
        mixed = T212_HEADER + SAMPLE_USD_BUY + SAMPLE_USD_DIVIDEND + SAMPLE_EUR_DIVIDEND + SAMPLE_DEPOSIT
        dividends = parse_trading212_dividends(mixed)
        assert len(dividends) == 2


class TestParseDividends:
    def test_usd_dividend_isin(self):
        rows = parse_trading212_dividends(T212_HEADER + SAMPLE_USD_DIVIDEND)
        assert len(rows) == 1
        assert rows[0]["isin"] == "US0378331005"

    def test_usd_dividend_amount_eur(self):
        rows = parse_trading212_dividends(T212_HEADER + SAMPLE_USD_DIVIDEND)
        assert rows[0]["amount_eur"] == Decimal("22.00")

    def test_usd_dividend_withholding_tax(self):
        """3.30 USD / 1.10 = 3.00 EUR."""
        rows = parse_trading212_dividends(T212_HEADER + SAMPLE_USD_DIVIDEND)
        assert rows[0]["withholding_tax_eur"] == Decimal("3.00")

    def test_usd_dividend_gross_eur(self):
        """gross = net + tax = 22.00 + 3.00 = 25.00."""
        rows = parse_trading212_dividends(T212_HEADER + SAMPLE_USD_DIVIDEND)
        assert rows[0]["gross_amount_eur"] == Decimal("25.00")

    def test_usd_dividend_local_amount(self):
        """local = gross_eur * exchange_rate = 25.00 * 1.10 = 27.50."""
        rows = parse_trading212_dividends(T212_HEADER + SAMPLE_USD_DIVIDEND)
        assert rows[0]["local_amount"] == Decimal("27.50")

    def test_usd_dividend_local_currency(self):
        rows = parse_trading212_dividends(T212_HEADER + SAMPLE_USD_DIVIDEND)
        assert rows[0]["local_currency"] == "USD"

    def test_usd_dividend_date(self):
        rows = parse_trading212_dividends(T212_HEADER + SAMPLE_USD_DIVIDEND)
        assert rows[0]["dividend_date"] == date(2024, 3, 15)

    def test_eur_dividend_no_withholding(self):
        rows = parse_trading212_dividends(T212_HEADER + SAMPLE_EUR_DIVIDEND)
        assert rows[0]["withholding_tax_eur"] is None

    def test_eur_dividend_gross_equals_net(self):
        rows = parse_trading212_dividends(T212_HEADER + SAMPLE_EUR_DIVIDEND)
        assert rows[0]["gross_amount_eur"] == rows[0]["amount_eur"]

    def test_deposit_skipped_by_dividend_parser(self):
        rows = parse_trading212_dividends(T212_HEADER + SAMPLE_DEPOSIT)
        assert rows == []

    def test_trade_skipped_by_dividend_parser(self):
        rows = parse_trading212_dividends(T212_HEADER + SAMPLE_USD_BUY)
        assert rows == []


class TestEmptyCsv:
    def test_empty_csv_returns_no_trades(self):
        rows = parse_trading212_csv(T212_HEADER)
        assert rows == []

    def test_empty_csv_returns_no_dividends(self):
        rows = parse_trading212_dividends(T212_HEADER)
        assert rows == []


class TestDeduplication:
    def test_same_trade_imported_once(self, db_session):
        parsed = parse_trading212_csv(T212_HEADER + SAMPLE_USD_BUY)
        imported, skipped, _ = import_trading212_transactions(db_session, parsed)
        assert imported == 1
        assert skipped == 0

    def test_same_trade_skipped_on_second_import(self, db_session):
        parsed = parse_trading212_csv(T212_HEADER + SAMPLE_USD_BUY)
        import_trading212_transactions(db_session, parsed)
        imported2, skipped2, _ = import_trading212_transactions(db_session, parsed)
        assert imported2 == 0
        assert skipped2 == 1

    def test_same_dividend_imported_once(self, db_session):
        parsed = parse_trading212_dividends(T212_HEADER + SAMPLE_USD_DIVIDEND)
        imported, skipped, _ = import_trading212_dividends(db_session, parsed)
        assert imported == 1
        assert skipped == 0

    def test_same_dividend_skipped_on_second_import(self, db_session):
        parsed = parse_trading212_dividends(T212_HEADER + SAMPLE_USD_DIVIDEND)
        import_trading212_dividends(db_session, parsed)
        imported2, skipped2, _ = import_trading212_dividends(db_session, parsed)
        assert imported2 == 0
        assert skipped2 == 1
