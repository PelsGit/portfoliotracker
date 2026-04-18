"""
Trading 212 CSV importer.

The Trading 212 activity CSV is exported from the app via:
  History → Export → All time → CSV

One row per event. The `Action` column identifies the event type:
  Trade rows:    "Market buy", "Market sell", "Limit buy", "Limit sell",
                 "Stop buy", "Stop sell"
  Dividend rows: "Dividend"
  Skipped rows:  "Deposit", "Withdrawal", "Interest on cash",
                 "Currency conversion", etc.

All EUR values are pre-computed in the file — no multi-row grouping needed.
The `Exchange rate` column stores local currency units per 1 EUR.
The `ID` column is unique per row and is used as order_id for deduplication.
"""

import csv
import io
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

TRADE_ACTIONS = frozenset(
    {
        "market buy",
        "market sell",
        "limit buy",
        "limit sell",
        "stop buy",
        "stop sell",
    }
)


def _parse_decimal(value: str) -> Decimal | None:
    s = (value or "").strip()
    if not s:
        return None
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def _parse_date(time_str: str) -> datetime:
    """Parse "2024-01-15 14:30:15" as a UTC-aware datetime."""
    return datetime.strptime(time_str.strip(), "%Y-%m-%d %H:%M:%S").replace(
        tzinfo=timezone.utc
    )


def _is_trade(action: str) -> bool:
    return action.strip().lower() in TRADE_ACTIONS


def _read_rows(content: bytes | str) -> list[dict]:
    if isinstance(content, bytes):
        content = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    return list(reader)


def parse_trading212_csv(content: bytes | str) -> list[dict]:
    """
    Parse a Trading 212 CSV and return a list of transaction dicts (trade rows only).
    Non-trade rows (Deposit, Dividend, Withdrawal, etc.) are silently skipped.
    """
    transactions = []

    for row in _read_rows(content):
        action = row.get("Action", "").strip()
        if not _is_trade(action):
            continue

        isin = row.get("ISIN", "").strip()
        if not isin:
            continue

        shares = _parse_decimal(row.get("No. of shares", ""))
        if shares is None:
            continue

        price = _parse_decimal(row.get("Price / share", ""))

        is_sell = action.lower().endswith("sell")
        qty_sign = Decimal(-1) if is_sell else Decimal(1)
        quantity = qty_sign * shares

        local_currency = row.get("Currency (Price / share)", "").strip() or None

        # Exchange rate: local currency units per 1 EUR (same convention as DeGiro)
        exchange_rate = _parse_decimal(row.get("Exchange rate", ""))
        fx_rate = exchange_rate if exchange_rate else None

        total = _parse_decimal(row.get("Total (EUR)", ""))
        if total is None:
            continue

        # Fees: T212 reports them as positive numbers; store as negative (outflows)
        charge = _parse_decimal(row.get("Charge amount (EUR)", "")) or Decimal(0)
        conv_fee = _parse_decimal(row.get("Currency conversion fee (EUR)", "")) or Decimal(0)
        fees_total = charge + conv_fee
        costs = -fees_total if fees_total else None

        # Pure EUR value of shares before fees.
        # total = value + costs  →  value = total - costs = total + fees_total
        value = total + fees_total if fees_total else total

        # Local currency value of the trade (negative for buys, positive for sells)
        local_value = -quantity * price if price is not None else None

        try:
            date = _parse_date(row.get("Time", ""))
        except Exception:
            continue

        transactions.append(
            {
                "isin": isin,
                "product_name": row.get("Name", "").strip() or None,
                "exchange": row.get("Ticker", "").strip() or None,
                "broker": "Trading212",
                "local_currency": local_currency,
                "date": date,
                "quantity": quantity,
                "price": price,
                "local_value": local_value,
                "value": value,
                "fx_rate": fx_rate,
                "costs": costs,
                "total": total,
                "order_id": row.get("ID", "").strip() or None,
            }
        )

    return transactions


def parse_trading212_dividends(content: bytes | str) -> list[dict]:
    """
    Parse a Trading 212 CSV and return a list of dividend dicts (Dividend rows only).
    """
    dividends = []

    for row in _read_rows(content):
        action = row.get("Action", "").strip()
        if action.lower() != "dividend":
            continue

        isin = row.get("ISIN", "").strip()
        if not isin:
            continue

        local_currency = row.get("Currency (Price / share)", "").strip() or "EUR"
        exchange_rate = _parse_decimal(row.get("Exchange rate", "")) or Decimal(1)

        # Total (EUR) is the net dividend amount actually received
        amount_eur = _parse_decimal(row.get("Total (EUR)", ""))
        if amount_eur is None:
            continue

        # Withholding tax is reported in local currency as a positive number
        wh_tax_local = _parse_decimal(row.get("Withholding tax", "")) or Decimal(0)
        withholding_tax_eur = (
            (wh_tax_local / exchange_rate) if wh_tax_local else None
        )

        gross_amount_eur = amount_eur + (withholding_tax_eur or Decimal(0))

        # Local gross amount: convert gross EUR back to local currency
        local_amount = gross_amount_eur * exchange_rate

        try:
            dividend_date = _parse_date(row.get("Time", "")).date()
        except Exception:
            continue

        dividends.append(
            {
                "isin": isin,
                "product_name": row.get("Name", "").strip() or None,
                "dividend_date": dividend_date,
                "local_currency": local_currency,
                "local_amount": local_amount,
                "gross_amount_eur": gross_amount_eur,
                "withholding_tax_eur": withholding_tax_eur,
                "amount_eur": amount_eur,
            }
        )

    return dividends


def import_trading212_transactions(db, parsed: list[dict]) -> tuple[int, int, list]:
    """Persist Trading 212 trade rows. Deduplicates on order_id (T212 ID column)."""
    from app.services.importer.degiro import import_degiro_transactions

    return import_degiro_transactions(db, parsed)


def import_trading212_dividends(db, parsed: list[dict]) -> tuple[int, int, list]:
    """Persist Trading 212 dividend rows. Deduplicates on (isin, dividend_date)."""
    from app.services.importer.degiro import import_degiro_dividends

    return import_degiro_dividends(db, parsed)
