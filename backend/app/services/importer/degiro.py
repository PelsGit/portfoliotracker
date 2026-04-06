"""
DEGIRO Account CSV importer.

The Account CSV (Account.csv) is exported from DEGIRO via:
  Inbox → Activity → Account

Each trade generates multiple rows sharing the same Order Id:
  - Valuta Creditering/Debitering (with FX)  — local currency conversion
  - Valuta Creditering/Debitering (no FX)    — EUR debit/credit
  - DEGIRO Transactiekosten                  — transaction costs in EUR
  - Koop/Verkoop N @ price CUR               — the actual trade execution

Partial fills produce multiple Koop/Verkoop rows per Order Id.
EUR value rows are matched positionally to trade rows (same order in the file).
"""

import csv
import io
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

import pytz

AMSTERDAM_TZ = pytz.timezone("Europe/Amsterdam")

# Column indices (csv.reader, not DictReader — header has two unnamed columns)
COL_DATUM = 0
COL_TIJD = 1
COL_PRODUCT = 3
COL_ISIN = 4
COL_OMSCHRIJVING = 5
COL_FX = 6
COL_MUTATIE_CUR = 7
COL_MUTATIE_AMT = 8
COL_ORDER_ID = 11

TRADE_RE = re.compile(r"^(Koop|Verkoop)\s+(\d+(?:[.,]\d+)?)\s+@\s+([\d,]+)\s+(\w+)$")


def parse_dutch_number(value: str) -> Decimal | None:
    cleaned = value.strip()
    if not cleaned:
        return None
    # Remove thousands separator (period), replace decimal comma with dot
    cleaned = cleaned.replace(".", "").replace(",", ".")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def parse_date(date_str: str, time_str: str) -> datetime:
    naive = datetime.strptime(f"{date_str} {time_str}", "%d-%m-%Y %H:%M")
    localized = AMSTERDAM_TZ.localize(naive)
    return localized.astimezone(pytz.utc)


def _read_rows(file_content: bytes | str) -> list[list[str]]:
    if isinstance(file_content, bytes):
        file_content = file_content.decode("utf-8-sig")
    reader = csv.reader(io.StringIO(file_content))
    rows = list(reader)
    if not rows:
        return []
    return rows[1:]  # skip header


def _is_trade(row: list[str]) -> bool:
    return bool(TRADE_RE.match(row[COL_OMSCHRIJVING]))


def _is_eur_valuta(row: list[str]) -> bool:
    """Valuta row in EUR without FX rate — this is the EUR cost/proceeds of the trade."""
    omschrijving = row[COL_OMSCHRIJVING]
    return (
        (omschrijving.startswith("Valuta Debitering") or omschrijving.startswith("Valuta Creditering"))
        and row[COL_MUTATIE_CUR] == "EUR"
        and not row[COL_FX].strip()
    )


def _is_costs(row: list[str]) -> bool:
    return row[COL_OMSCHRIJVING].startswith("DEGIRO Transactiekosten")


def _parse_trade(row: list[str]) -> tuple[str, Decimal, Decimal, str]:
    """Returns (side, quantity, price, local_currency)."""
    match = TRADE_RE.match(row[COL_OMSCHRIJVING])
    side = match.group(1)  # "Koop" or "Verkoop"
    qty = parse_dutch_number(match.group(2))
    price = parse_dutch_number(match.group(3))
    currency = match.group(4)
    if side == "Verkoop":
        qty = -qty
    return side, qty, price, currency


def parse_account_csv(file_content: bytes | str) -> list[dict]:
    """
    Parse a DEGIRO Account CSV and return a list of transaction dicts.
    Only buy/sell transactions are returned — deposits, transfers, dividends are ignored.
    """
    raw_rows = _read_rows(file_content)

    # Group rows by Order Id, preserving insertion order
    orders: dict[str, list[list[str]]] = {}
    for row in raw_rows:
        if len(row) <= COL_ORDER_ID:
            continue
        order_id = row[COL_ORDER_ID].strip()
        if not order_id:
            continue
        if order_id not in orders:
            orders[order_id] = []
        orders[order_id].append(row)

    transactions = []

    for order_id, order_rows in orders.items():
        trade_rows = [r for r in order_rows if _is_trade(r)]
        if not trade_rows:
            continue

        eur_valuta_rows = [r for r in order_rows if _is_eur_valuta(r)]
        costs_rows = [r for r in order_rows if _is_costs(r)]

        # Total costs in EUR for this order, split equally across fills
        total_costs = sum(parse_dutch_number(r[COL_MUTATIE_AMT]) or Decimal(0) for r in costs_rows)
        cost_per_fill = (total_costs / len(trade_rows)).quantize(Decimal("0.01")) if trade_rows else Decimal(0)

        # FX rate: use the first row that has one (same rate for all fills in an order)
        fx_rate = None
        for r in order_rows:
            fx_str = r[COL_FX].strip()
            if fx_str:
                fx_rate = parse_dutch_number(fx_str)
                break

        # Match each trade row positionally to a EUR valuta row
        for i, trade_row in enumerate(trade_rows):
            side, quantity, price, local_currency = _parse_trade(trade_row)

            local_value = parse_dutch_number(trade_row[COL_MUTATIE_AMT])

            # EUR value: positional match to EUR valuta rows
            eur_value = None
            if i < len(eur_valuta_rows):
                eur_value = parse_dutch_number(eur_valuta_rows[i][COL_MUTATIE_AMT])

            # For EUR-denominated trades there are no Valuta rows — local_value IS the EUR value
            if eur_value is None and local_currency == "EUR":
                eur_value = local_value

            total = (eur_value or Decimal(0)) + cost_per_fill

            transactions.append(
                {
                    "isin": trade_row[COL_ISIN].strip(),
                    "product_name": trade_row[COL_PRODUCT].strip() or None,
                    "exchange": None,
                    "local_currency": local_currency,
                    "date": parse_date(trade_row[COL_DATUM], trade_row[COL_TIJD]),
                    "quantity": quantity,
                    "price": price,
                    "local_value": local_value,
                    "value": eur_value,
                    "fx_rate": fx_rate,
                    "costs": cost_per_fill if cost_per_fill else None,
                    "total": total,
                    "order_id": order_id,
                }
            )

    return transactions


def import_degiro_transactions(db, parsed_rows: list[dict]) -> tuple[int, int, list]:
    from app.models.transaction import Transaction

    imported = 0
    skipped = 0
    transactions = []

    existing_order_ids: set[str] = set()
    if parsed_rows:
        order_ids = [r["order_id"] for r in parsed_rows if r["order_id"]]
        if order_ids:
            existing = db.query(Transaction.order_id).filter(Transaction.order_id.in_(order_ids)).all()
            # For partial fills, the same order_id can appear multiple times — track by (order_id, quantity, date)
            existing_order_ids = {row[0] for row in existing}

    # For partial fills within one import: track by (order_id, quantity, date) to avoid skipping valid fills
    seen: set[tuple] = set()
    for row in parsed_rows:
        key = (row["order_id"], str(row["quantity"]), str(row["date"]))
        if row["order_id"] in existing_order_ids or key in seen:
            skipped += 1
            continue

        seen.add(key)
        txn = Transaction(**row)
        db.add(txn)
        transactions.append(txn)
        imported += 1

    db.commit()
    for txn in transactions:
        db.refresh(txn)

    return imported, skipped, transactions
