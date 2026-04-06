# DEGIRO CSV Format

## How to Export

1. Log in to DEGIRO
2. Go to **Inbox → Account Overview**
3. Select a date range and export as CSV

DEGIRO provides two separate CSV exports:
- **Transactions** (`Transactions.csv`) — all buy/sell activity
- **Account** (`Account.csv`) — cash movements, dividends, fees

The importer uses the **Transactions CSV** for v1.

## Transactions CSV Format

Delimiter: `,` — Encoding: `UTF-8`

| Column | Example | Notes |
|---|---|---|
| `Datum` | `13-03-2024` | Date in `DD-MM-YYYY` format |
| `Tijd` | `10:32` | Time in `HH:MM` (no seconds) |
| `Valutadatum` | `15-03-2024` | Settlement date |
| `Product` | `ASML HOLDING` | Full product name |
| `ISIN` | `NL0010273215` | International identifier — use this as primary key |
| `Beurs` | `XAMS` | Exchange MIC code |
| `Uitvoeringsplaats` | `XAMS` | Execution venue |
| `Aantal` | `5` | Number of shares (negative = sell) |
| `Koers` | `EUR 756.20` | Price per share including currency prefix |
| `Lokale waarde` | `EUR -3.781,00` | Local value including currency prefix |
| `Waarde` | `EUR -3.781,00` | Value in transaction currency |
| `Wisselkoers` | `` | FX rate (empty if base currency) |
| `Transactiekosten en/of` | `EUR -2,00` | Transaction costs |
| `Totaal` | `EUR -3.783,00` | Total including costs |
| `Order ID` | `abc123` | DEGIRO internal order ID |

## Parsing Notes

- Currency prefix (e.g. `EUR`) must be stripped before parsing numeric values
- Dutch number format uses `.` as thousands separator and `,` as decimal — convert to standard float
- Negative `Aantal` = sell transaction
- `ISIN` is the reliable identifier — `Product` names can vary
- Empty `Wisselkoers` means the transaction was in euros (no conversion needed)
- Date + Time should be combined and parsed as `Europe/Amsterdam` timezone then stored as UTC

## Importer Location

`backend/app/services/importer/degiro.py`

The importer should return a list of normalised `Transaction` model objects regardless of source broker — all broker importers share the same output schema.
