from datetime import datetime, timezone
from decimal import Decimal

from tests.conftest import (
    SAMPLE_CSV,
    SAMPLE_CSV_MULTI,
    SAMPLE_CSV_PARTIAL,
    SAMPLE_CSV_SELL,
)

from app.services.importer.degiro import (
    parse_account_csv,
    parse_date,
    parse_dutch_number,
)


class TestParseDutchNumber:
    def test_standard(self):
        assert parse_dutch_number("3.781,00") == Decimal("3781.00")

    def test_no_thousands(self):
        assert parse_dutch_number("500,00") == Decimal("500.00")

    def test_negative(self):
        assert parse_dutch_number("-454,55") == Decimal("-454.55")

    def test_integer(self):
        assert parse_dutch_number("36") == Decimal("36")

    def test_fx_rate(self):
        assert parse_dutch_number("1,1554") == Decimal("1.1554")

    def test_empty(self):
        assert parse_dutch_number("") is None

    def test_whitespace(self):
        assert parse_dutch_number("   ") is None


class TestParseDate:
    def test_amsterdam_to_utc_winter(self):
        result = parse_date("01-04-2026", "15:00")
        assert result.tzinfo is not None
        assert result.tzname() == "UTC"
        # Amsterdam is CEST (UTC+2) in April
        assert result == datetime(2026, 4, 1, 13, 0, tzinfo=timezone.utc)

    def test_amsterdam_to_utc_summer(self):
        result = parse_date("15-07-2026", "10:00")
        # Amsterdam is CEST (UTC+2) in July
        assert result == datetime(2026, 7, 15, 8, 0, tzinfo=timezone.utc)


class TestParseAccountCsv:
    def test_buy_transaction(self):
        rows = parse_account_csv(SAMPLE_CSV)
        assert len(rows) == 1

        row = rows[0]
        assert row["isin"] == "US1234567890"
        assert row["product_name"] == "TEST CORP"
        assert row["quantity"] == Decimal("10")
        assert row["price"] == Decimal("50.00")
        assert row["local_currency"] == "USD"
        assert row["local_value"] == Decimal("-500.00")
        assert row["value"] == Decimal("-454.55")
        assert row["fx_rate"] == Decimal("1.10")
        assert row["costs"] == Decimal("-2.00")
        assert row["order_id"] == "aaa-111"
        assert row["exchange"] is None

    def test_buy_total(self):
        rows = parse_account_csv(SAMPLE_CSV)
        row = rows[0]
        # total = EUR value + costs = -454.55 + -2.00
        assert row["total"] == Decimal("-456.55")

    def test_sell_transaction(self):
        rows = parse_account_csv(SAMPLE_CSV_SELL)
        assert len(rows) == 1

        row = rows[0]
        assert row["quantity"] == Decimal("-5")  # negative for sell
        assert row["price"] == Decimal("80.00")
        assert row["local_value"] == Decimal("400.00")  # positive for sell
        assert row["value"] == Decimal("370.37")
        assert row["fx_rate"] == Decimal("1.08")

    def test_partial_fills(self):
        rows = parse_account_csv(SAMPLE_CSV_PARTIAL)
        assert len(rows) == 2

        # First fill: 3 shares
        assert rows[0]["quantity"] == Decimal("3")
        assert rows[0]["local_value"] == Decimal("-150.00")
        assert rows[0]["value"] == Decimal("-136.36")
        assert rows[0]["costs"] == Decimal("-1.00")  # -2.00 split between 2 fills
        assert rows[0]["order_id"] == "ccc-333"

        # Second fill: 7 shares
        assert rows[1]["quantity"] == Decimal("7")
        assert rows[1]["local_value"] == Decimal("-350.00")
        assert rows[1]["value"] == Decimal("-318.18")
        assert rows[1]["costs"] == Decimal("-1.00")
        assert rows[1]["order_id"] == "ccc-333"

    def test_non_trade_rows_ignored(self):
        rows = parse_account_csv(SAMPLE_CSV_MULTI)
        # Only the buy and sell should be returned — deposits, sweeps, dividends ignored
        assert len(rows) == 2
        isins = {r["isin"] for r in rows}
        assert isins == {"US1234567890"}

    def test_bytes_input(self):
        rows = parse_account_csv(SAMPLE_CSV.encode("utf-8"))
        assert len(rows) == 1

    def test_empty_csv(self):
        from tests.conftest import ACCOUNT_CSV_HEADER

        rows = parse_account_csv(ACCOUNT_CSV_HEADER)
        assert rows == []

    def test_date_is_utc(self):
        rows = parse_account_csv(SAMPLE_CSV)
        assert rows[0]["date"].tzname() == "UTC"

    def test_price_with_three_decimals(self):
        from tests.conftest import ACCOUNT_CSV_HEADER

        csv_content = (
            ACCOUNT_CSV_HEADER
            + '01-04-2026,10:00,01-04-2026,SOME CORP,US0000000001,Valuta Creditering,"1,10",USD,"933,21",USD,"0,00",ddd-444\n'
            '01-04-2026,10:00,01-04-2026,SOME CORP,US0000000001,Valuta Debitering,,EUR,"-848,37",EUR,"0,00",ddd-444\n'
            '01-04-2026,10:00,01-04-2026,SOME CORP,US0000000001,DEGIRO Transactiekosten en/of kosten van derden,,EUR,"-2,00",EUR,"0,00",ddd-444\n'
            '01-04-2026,10:00,01-04-2026,SOME CORP,US0000000001,"Koop 9 @ 103,69 USD",,USD,"-933,21",USD,"-933,21",ddd-444\n'
        )
        rows = parse_account_csv(csv_content)
        assert len(rows) == 1
        assert rows[0]["price"] == Decimal("103.69")
        assert rows[0]["quantity"] == Decimal("9")


class TestImportDegiroTransactions:
    def test_import_new(self, db_session):
        from app.services.importer.degiro import import_degiro_transactions

        parsed = parse_account_csv(SAMPLE_CSV)
        imported, skipped, transactions = import_degiro_transactions(db_session, parsed)
        assert imported == 1
        assert skipped == 0
        assert transactions[0].isin == "US1234567890"
        assert transactions[0].local_currency == "USD"

    def test_idempotent_import(self, db_session):
        from app.services.importer.degiro import import_degiro_transactions

        parsed = parse_account_csv(SAMPLE_CSV)
        import_degiro_transactions(db_session, parsed)

        parsed2 = parse_account_csv(SAMPLE_CSV)
        imported, skipped, _ = import_degiro_transactions(db_session, parsed2)
        assert imported == 0
        assert skipped == 1

    def test_partial_fills_imported(self, db_session):
        from app.services.importer.degiro import import_degiro_transactions

        parsed = parse_account_csv(SAMPLE_CSV_PARTIAL)
        imported, skipped, _ = import_degiro_transactions(db_session, parsed)
        assert imported == 2
        assert skipped == 0
