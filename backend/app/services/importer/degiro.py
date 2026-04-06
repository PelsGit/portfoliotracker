import csv
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation

import pytz

AMSTERDAM_TZ = pytz.timezone("Europe/Amsterdam")

COLUMN_MAP = {
    "Datum": "date_str",
    "Tijd": "time_str",
    "Product": "product_name",
    "ISIN": "isin",
    "Beurs": "exchange",
    "Aantal": "quantity",
    "Koers": "price",
    "Lokale waarde": "local_value",
    "Waarde": "value",
    "Wisselkoers": "fx_rate",
    "Transactiekosten en/of": "costs",
    "Totaal": "total",
    "Order ID": "order_id",
}


def strip_currency(value: str) -> str:
    if not value or not value.strip():
        return ""
    parts = value.strip().split(" ", 1)
    if len(parts) == 2 and parts[0].isalpha():
        return parts[1]
    return value.strip()


def parse_dutch_number(value: str) -> Decimal | None:
    cleaned = strip_currency(value)
    if not cleaned:
        return None
    cleaned = cleaned.replace(".", "").replace(",", ".")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def parse_date(date_str: str, time_str: str) -> datetime:
    dt_str = f"{date_str} {time_str}"
    naive = datetime.strptime(dt_str, "%d-%m-%Y %H:%M")
    localized = AMSTERDAM_TZ.localize(naive)
    return localized.astimezone(pytz.utc)


def parse_degiro_csv(file_content: bytes | str) -> list[dict]:
    if isinstance(file_content, bytes):
        file_content = file_content.decode("utf-8-sig")

    reader = csv.DictReader(io.StringIO(file_content))
    rows = []

    for row in reader:
        mapped = {}
        for csv_col, internal_name in COLUMN_MAP.items():
            mapped[internal_name] = row.get(csv_col, "")

        if not mapped.get("isin"):
            continue

        parsed = {
            "isin": mapped["isin"].strip(),
            "product_name": mapped["product_name"].strip() or None,
            "exchange": mapped["exchange"].strip() or None,
            "date": parse_date(mapped["date_str"], mapped["time_str"]),
            "quantity": parse_dutch_number(mapped["quantity"]),
            "price": parse_dutch_number(mapped["price"]),
            "local_value": parse_dutch_number(mapped["local_value"]),
            "value": parse_dutch_number(mapped["value"]),
            "fx_rate": parse_dutch_number(mapped["fx_rate"]),
            "costs": parse_dutch_number(mapped["costs"]),
            "total": parse_dutch_number(mapped["total"]),
            "order_id": mapped["order_id"].strip() or None,
        }
        rows.append(parsed)

    return rows


def import_degiro_transactions(db, parsed_rows: list[dict]) -> tuple[int, int, list]:
    from app.models.transaction import Transaction

    imported = 0
    skipped = 0
    transactions = []

    existing_order_ids = set()
    if parsed_rows:
        order_ids = [r["order_id"] for r in parsed_rows if r["order_id"]]
        if order_ids:
            existing = db.query(Transaction.order_id).filter(Transaction.order_id.in_(order_ids)).all()
            existing_order_ids = {row[0] for row in existing}

    for row in parsed_rows:
        if row["order_id"] and row["order_id"] in existing_order_ids:
            skipped += 1
            continue

        txn = Transaction(**row)
        db.add(txn)
        transactions.append(txn)
        imported += 1

    db.commit()
    for txn in transactions:
        db.refresh(txn)

    return imported, skipped, transactions
