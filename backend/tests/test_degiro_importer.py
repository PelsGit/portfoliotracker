from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.services.importer.degiro import (
    parse_date,
    parse_degiro_csv,
    parse_dutch_number,
    strip_currency,
)


class TestStripCurrency:
    def test_standard(self):
        assert strip_currency("EUR 756,20") == "756,20"

    def test_negative(self):
        assert strip_currency("EUR -3.781,00") == "-3.781,00"

    def test_usd(self):
        assert strip_currency("USD 100,50") == "100,50"

    def test_empty(self):
        assert strip_currency("") == ""

    def test_no_currency(self):
        assert strip_currency("756,20") == "756,20"


class TestParseDutchNumber:
    def test_standard(self):
        assert parse_dutch_number("3.781,00") == Decimal("3781.00")

    def test_no_thousands(self):
        assert parse_dutch_number("756,20") == Decimal("756.20")

    def test_negative(self):
        assert parse_dutch_number("-3.781,00") == Decimal("-3781.00")

    def test_with_currency(self):
        assert parse_dutch_number("EUR 756,20") == Decimal("756.20")

    def test_with_currency_negative(self):
        assert parse_dutch_number("EUR -3.781,00") == Decimal("-3781.00")

    def test_empty(self):
        assert parse_dutch_number("") is None

    def test_whitespace(self):
        assert parse_dutch_number("   ") is None

    def test_integer(self):
        assert parse_dutch_number("5") == Decimal("5")


class TestParseDate:
    def test_amsterdam_to_utc(self):
        result = parse_date("13-03-2024", "10:32")
        assert result.tzinfo is not None
        assert result.tzname() == "UTC"
        # Amsterdam is CET (UTC+1) in March
        assert result == datetime(2024, 3, 13, 9, 32, tzinfo=timezone.utc)

    def test_summer_time(self):
        result = parse_date("15-07-2024", "14:00")
        # Amsterdam is CEST (UTC+2) in July
        assert result == datetime(2024, 7, 15, 12, 0, tzinfo=timezone.utc)


class TestParseDegiroCsv:
    def test_full_row(self, request):
        from tests.conftest import SAMPLE_CSV

        rows = parse_degiro_csv(SAMPLE_CSV)
        assert len(rows) == 1

        row = rows[0]
        assert row["isin"] == "NL0010273215"
        assert row["product_name"] == "ASML HOLDING"
        assert row["exchange"] == "XAMS"
        assert row["quantity"] == Decimal("5")
        assert row["price"] == Decimal("756.20")
        assert row["local_value"] == Decimal("-3781.00")
        assert row["value"] == Decimal("-3781.00")
        assert row["fx_rate"] is None
        assert row["costs"] == Decimal("-2.00")
        assert row["total"] == Decimal("-3783.00")
        assert row["order_id"] == "abc123"

    def test_sell_transaction(self):
        from tests.conftest import SAMPLE_CSV_SELL

        rows = parse_degiro_csv(SAMPLE_CSV_SELL)
        assert len(rows) == 1
        assert rows[0]["quantity"] == Decimal("-3")
        assert rows[0]["order_id"] == "def456"

    def test_empty_csv(self):
        header = (
            "Datum,Tijd,Valutadatum,Product,ISIN,Beurs,Uitvoeringsplaats,"
            "Aantal,Koers,Lokale waarde,Waarde,Wisselkoers,"
            "Transactiekosten en/of,Totaal,Order ID\n"
        )
        rows = parse_degiro_csv(header)
        assert rows == []

    def test_bytes_input(self):
        from tests.conftest import SAMPLE_CSV

        rows = parse_degiro_csv(SAMPLE_CSV.encode("utf-8"))
        assert len(rows) == 1

    def test_multi_row(self):
        from tests.conftest import SAMPLE_CSV

        second_row = (
            '14-03-2024,11:00,16-03-2024,SHELL PLC,GB00BP6MXD84,XAMS,XAMS,'
            '10,"EUR 30,50","EUR -305,00","EUR -305,00",,'
            '"EUR -2,00","EUR -307,00",ghi789\n'
        )
        csv_content = SAMPLE_CSV + second_row
        rows = parse_degiro_csv(csv_content)
        assert len(rows) == 2
        assert rows[0]["isin"] == "NL0010273215"
        assert rows[1]["isin"] == "GB00BP6MXD84"


class TestImportDegiroTransactions:
    def test_import_new(self, db_session):
        from tests.conftest import SAMPLE_CSV

        from app.services.importer.degiro import import_degiro_transactions

        parsed = parse_degiro_csv(SAMPLE_CSV)
        imported, skipped, transactions = import_degiro_transactions(db_session, parsed)
        assert imported == 1
        assert skipped == 0
        assert len(transactions) == 1
        assert transactions[0].isin == "NL0010273215"

    def test_idempotent_import(self, db_session):
        from tests.conftest import SAMPLE_CSV

        from app.services.importer.degiro import import_degiro_transactions

        parsed = parse_degiro_csv(SAMPLE_CSV)
        import_degiro_transactions(db_session, parsed)

        parsed2 = parse_degiro_csv(SAMPLE_CSV)
        imported, skipped, _ = import_degiro_transactions(db_session, parsed2)
        assert imported == 0
        assert skipped == 1
