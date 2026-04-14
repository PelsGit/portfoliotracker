"""
Tests for parse_dividends_csv() and import_degiro_dividends().
"""

from decimal import Decimal

from tests.conftest import ACCOUNT_CSV_HEADER

from app.services.importer.degiro import import_degiro_dividends, parse_dividends_csv

# USD dividend with withholding tax (Dividendbelasting).
# The gross USD amount is 4.20, converted to EUR 3.82 (credit row).
# Withholding tax is 0.63 USD, EUR debit of 0.57.
# Net EUR = 3.82 - 0.57 = 3.25
SAMPLE_USD_DIVIDEND_ROWS = (
    '01-04-2026,07:21,01-04-2026,META PLATFORMS INC CLASS A,US30303M1027,Dividend,,USD,"4,20",USD,"4,20",\n'
    '01-04-2026,07:21,01-04-2026,META PLATFORMS INC CLASS A,US30303M1027,Valuta Creditering,,EUR,"3,82",EUR,"3,82",\n'
    '01-04-2026,07:21,01-04-2026,META PLATFORMS INC CLASS A,US30303M1027,Dividendbelasting,,USD,"-0,63",USD,"3,57",\n'
    '01-04-2026,07:21,01-04-2026,META PLATFORMS INC CLASS A,US30303M1027,Valuta Debitering,,EUR,"-0,57",EUR,"3,25",\n'
)

# EUR-denominated dividend — no Valuta rows, local currency IS EUR.
SAMPLE_EUR_DIVIDEND_ROWS = (
    '05-04-2026,08:00,05-04-2026,ASML HOLDING NV,NL0010273215,Dividend,,EUR,"6,50",EUR,"9,75",\n'
)

SAMPLE_USD_DIV_CSV = ACCOUNT_CSV_HEADER + SAMPLE_USD_DIVIDEND_ROWS
SAMPLE_EUR_DIV_CSV = ACCOUNT_CSV_HEADER + SAMPLE_EUR_DIVIDEND_ROWS
SAMPLE_BOTH_CSV = ACCOUNT_CSV_HEADER + SAMPLE_USD_DIVIDEND_ROWS + SAMPLE_EUR_DIVIDEND_ROWS


class TestParseDividendsCsv:
    def test_usd_dividend_parsed(self):
        rows = parse_dividends_csv(SAMPLE_USD_DIV_CSV)
        assert len(rows) == 1
        row = rows[0]
        assert row["isin"] == "US30303M1027"
        assert row["product_name"] == "META PLATFORMS INC CLASS A"
        assert row["local_currency"] == "USD"
        assert row["local_amount"] == Decimal("4.20")

    def test_usd_gross_eur_from_valuta_row(self):
        rows = parse_dividends_csv(SAMPLE_USD_DIV_CSV)
        assert rows[0]["gross_amount_eur"] == Decimal("3.82")

    def test_usd_withholding_tax_captured(self):
        rows = parse_dividends_csv(SAMPLE_USD_DIV_CSV)
        assert rows[0]["withholding_tax_eur"] == Decimal("0.57")

    def test_usd_net_amount_eur(self):
        rows = parse_dividends_csv(SAMPLE_USD_DIV_CSV)
        # net = gross_eur - tax_eur = 3.82 - 0.57 = 3.25
        assert rows[0]["amount_eur"] == Decimal("3.25")

    def test_eur_dividend_no_valuta_rows(self):
        rows = parse_dividends_csv(SAMPLE_EUR_DIV_CSV)
        assert len(rows) == 1
        row = rows[0]
        assert row["isin"] == "NL0010273215"
        assert row["local_currency"] == "EUR"
        assert row["local_amount"] == Decimal("6.50")
        assert row["gross_amount_eur"] == Decimal("6.50")
        assert row["withholding_tax_eur"] is None
        assert row["amount_eur"] == Decimal("6.50")

    def test_multiple_dividends(self):
        rows = parse_dividends_csv(SAMPLE_BOTH_CSV)
        assert len(rows) == 2
        isins = {r["isin"] for r in rows}
        assert isins == {"US30303M1027", "NL0010273215"}

    def test_trades_not_included(self):
        # A CSV with both trades and dividends — parse_dividends_csv must only return dividends
        from tests.conftest import SAMPLE_BUY_ROWS

        csv = ACCOUNT_CSV_HEADER + SAMPLE_BUY_ROWS + SAMPLE_USD_DIVIDEND_ROWS
        rows = parse_dividends_csv(csv)
        assert len(rows) == 1
        assert rows[0]["isin"] == "US30303M1027"

    def test_empty_csv_returns_empty_list(self):
        rows = parse_dividends_csv(ACCOUNT_CSV_HEADER)
        assert rows == []

    def test_bytes_input(self):
        rows = parse_dividends_csv(SAMPLE_USD_DIV_CSV.encode("utf-8"))
        assert len(rows) == 1

    def test_dividend_date_is_date_object(self):
        from datetime import date

        rows = parse_dividends_csv(SAMPLE_USD_DIV_CSV)
        assert isinstance(rows[0]["dividend_date"], date)
        assert rows[0]["dividend_date"].year == 2026
        assert rows[0]["dividend_date"].month == 4
        assert rows[0]["dividend_date"].day == 1


class TestImportDegiroDividends:
    def test_import_new(self, db_session):
        parsed = parse_dividends_csv(SAMPLE_USD_DIV_CSV)
        imported, skipped, dividends = import_degiro_dividends(db_session, parsed)
        assert imported == 1
        assert skipped == 0
        assert dividends[0].isin == "US30303M1027"

    def test_idempotent_import(self, db_session):
        parsed = parse_dividends_csv(SAMPLE_USD_DIV_CSV)
        import_degiro_dividends(db_session, parsed)

        parsed2 = parse_dividends_csv(SAMPLE_USD_DIV_CSV)
        imported, skipped, _ = import_degiro_dividends(db_session, parsed2)
        assert imported == 0
        assert skipped == 1

    def test_import_empty_list(self, db_session):
        imported, skipped, dividends = import_degiro_dividends(db_session, [])
        assert imported == 0
        assert skipped == 0
        assert dividends == []

    def test_import_multiple(self, db_session):
        parsed = parse_dividends_csv(SAMPLE_BOTH_CSV)
        imported, skipped, _ = import_degiro_dividends(db_session, parsed)
        assert imported == 2
        assert skipped == 0
