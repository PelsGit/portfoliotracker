"""
MEXEM (Interactive Brokers) Activity Flex Query XML importer.

Export via MEXEM:
  Performance & Reports → Flex Queries → Activity Flex Query
  Sections: Trades (all sub-options), Cash Transactions
  Format: XML

Each <Trade> element with assetCategory="STK" and transactionType="ExchTrade"
maps to one transaction.  tradeID is used as order_id for deduplication.

fxRateToBase converts trade currency → account base currency (assumed EUR).
"""

import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation


def _parse_decimal(value: str | None) -> Decimal | None:
    if not value:
        return None
    cleaned = value.strip()
    if cleaned in ("", "--", "N/A"):
        return None
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def _parse_datetime(dt_str: str | None) -> datetime | None:
    """Parse IB/MEXEM datetime strings.

    Observed formats:
      'YYYYMMDD;HHMMSS'   — actual MEXEM exports (no colons in time)
      'YYYYMMDD;HH:MM:SS' — documented format (colons in time)
      'YYYYMMDD'          — date-only fallback
    """
    if not dt_str:
        return None
    s = dt_str.strip()
    if not s or s in ("--", "N/A"):
        return None
    try:
        if ";" in s:
            date_part, time_part = s.split(";", 1)
            if ":" in time_part:
                return datetime.strptime(f"{date_part};{time_part}", "%Y%m%d;%H:%M:%S").replace(tzinfo=timezone.utc)
            else:
                return datetime.strptime(f"{date_part};{time_part}", "%Y%m%d;%H%M%S").replace(tzinfo=timezone.utc)
        return datetime.strptime(s, "%Y%m%d").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def parse_mexem_xml(file_content: bytes | str) -> list[dict]:
    """
    Parse a MEXEM Activity Flex Query XML and return a list of transaction dicts.

    Only equity trades (assetCategory=STK) with transactionType=ExchTrade are
    returned.  Corporate actions, options, forex, and bonds are ignored.
    """
    if isinstance(file_content, bytes):
        file_content = file_content.decode("utf-8-sig")

    try:
        root = ET.fromstring(file_content)
    except ET.ParseError as e:
        raise ValueError(f"Invalid XML: {e}") from e

    transactions = []

    for trade in root.iter("Trade"):
        asset_category = trade.get("assetCategory", "")
        if asset_category not in ("STK", "ETF", ""):
            continue

        transaction_type = trade.get("transactionType", "ExchTrade")
        if transaction_type not in ("ExchTrade", ""):
            continue

        isin = trade.get("isin", "").strip()
        if not isin:
            continue

        dt = _parse_datetime(trade.get("dateTime") or trade.get("tradeDate"))
        if dt is None:
            continue

        quantity = _parse_decimal(trade.get("quantity"))
        if quantity is None:
            continue

        # Normalise sign using buySell in case quantity arrives unsigned
        buy_sell = trade.get("buySell", "").upper()
        if buy_sell == "SELL" and quantity > 0:
            quantity = -quantity
        elif buy_sell == "BUY" and quantity < 0:
            quantity = -quantity

        price = _parse_decimal(trade.get("tradePrice"))
        # MEXEM tradeMoney: positive for buys, negative for sells.
        # Negate to match DEGIRO convention (negative=buy/cash out, positive=sell/cash in).
        _trade_money = _parse_decimal(trade.get("tradeMoney"))
        local_value = -_trade_money if _trade_money is not None else None
        commission = _parse_decimal(trade.get("ibCommission"))  # usually negative
        local_currency = trade.get("currency", "").strip() or None

        # fxRateToBase: how many base-currency units equal 1 local-currency unit.
        # Assumed base currency is EUR.
        fx_rate = _parse_decimal(trade.get("fxRateToBase"))

        # Compute EUR value
        if local_currency == "EUR":
            value = local_value
            stored_fx = None
        elif fx_rate and local_value is not None:
            value = (local_value * fx_rate).quantize(Decimal("0.01"))
            stored_fx = fx_rate
        else:
            value = None
            stored_fx = fx_rate  # store even if we can't compute value

        # Costs in EUR
        if commission is not None:
            if local_currency == "EUR":
                costs = commission
            elif fx_rate:
                costs = (commission * fx_rate).quantize(Decimal("0.01"))
            else:
                costs = commission
        else:
            costs = None

        total = None
        if value is not None and costs is not None:
            total = (value + costs).quantize(Decimal("0.01"))
        elif value is not None:
            total = value

        trade_id = trade.get("tradeID") or trade.get("ibOrderID")

        transactions.append(
            {
                "isin": isin,
                "product_name": trade.get("description", "").strip() or None,
                "exchange": trade.get("exchange", "").strip() or None,
                "local_currency": local_currency,
                "date": dt,
                "quantity": quantity,
                "price": price,
                "local_value": local_value,
                "value": value,
                "fx_rate": stored_fx,
                "costs": costs,
                "total": total,
                "order_id": str(trade_id) if trade_id else None,
            }
        )

    return transactions


def parse_mexem_cash_balance(file_content: bytes | str) -> Decimal | None:
    """
    Attempt to extract the EUR cash balance from a MEXEM Flex Query XML.

    Looks for CashReportCurrency with currency=EUR → endingCash attribute.
    Returns None if the section is not present (it requires the CashReport
    section to be included in the Flex Query configuration).
    """
    if isinstance(file_content, bytes):
        file_content = file_content.decode("utf-8-sig")

    try:
        root = ET.fromstring(file_content)
    except ET.ParseError:
        return None

    for row in root.iter("CashReportCurrency"):
        if row.get("currency", "").upper() == "EUR":
            balance = _parse_decimal(row.get("endingCash"))
            if balance is not None:
                return balance

    return None
