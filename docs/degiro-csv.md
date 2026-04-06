# DEGIRO CSV Format

## How to Export

1. Log in to DEGIRO
2. Go to **Inbox → Activity → Account**
3. Select a date range and export as CSV — the file is named **Account.csv**

> **Note:** DEGIRO also offers a separate Transactions CSV export. This application uses the **Account CSV**, not the Transactions CSV.

## Account CSV Format

Delimiter: `,` — Encoding: `UTF-8`

The CSV has 12 columns. Two of them are unnamed (the amount columns for Mutatie and Saldo):

| # | Header name | Example | Notes |
|---|-------------|---------|-------|
| 0 | `Datum` | `01-04-2026` | Date in `DD-MM-YYYY` format |
| 1 | `Tijd` | `15:00` | Time in `HH:MM` |
| 2 | `Valutadatum` | `01-04-2026` | Settlement date |
| 3 | `Product` | `ASML HOLDING` | Product name, empty for non-trade rows |
| 4 | `ISIN` | `NL0010273215` | International identifier, empty for non-trade rows |
| 5 | `Omschrijving` | `Koop 10 @ 50,00 USD` | Description — encodes transaction type |
| 6 | `FX` | `1,1554` | FX rate (Dutch decimal format), empty if no conversion |
| 7 | `Mutatie` (currency) | `EUR` | Currency of the mutation |
| 8 | *(unnamed)* | `-500,00` | Amount of the mutation (Dutch decimal format) |
| 9 | `Saldo` (currency) | `EUR` | Currency of the running balance |
| 10 | *(unnamed)* | `981,63` | Running balance amount |
| 11 | `Order Id` | `9a4d9931-...` | DEGIRO order UUID, empty for non-trade rows |

## Row Types

Each trade generates a group of rows sharing the same `Order Id`. The `Omschrijving` column determines the row type:

| Omschrijving | Meaning |
|---|---|
| `Koop N @ price CUR` | Buy N shares at price in currency CUR |
| `Verkoop N @ price CUR` | Sell N shares at price in currency CUR |
| `Valuta Creditering` (with FX) | Receiving local currency (e.g. USD) for a trade |
| `Valuta Debitering` (with FX) | Paying local currency for an FX settlement |
| `Valuta Creditering` (no FX) | Receiving EUR proceeds from a sale |
| `Valuta Debitering` (no FX) | Paying EUR for a purchase |
| `DEGIRO Transactiekosten en/of kosten van derden` | Transaction cost in EUR |
| `iDEAL Deposit` | Cash deposit |
| `Degiro Cash Sweep Transfer` | Cash sweep to/from flatexDEGIRO Bank |
| `Dividend` | Dividend payment |
| `Dividendbelasting` | Dividend withholding tax |

## Trade Row Grouping

A single USD buy (e.g. 10 shares of ACME @ $50.00, FX rate 1.10):

```
Valuta Creditering  FX=1.10  USD  +500.00   ← receiving USD for the trade
Valuta Debitering            EUR  -454.55   ← paying EUR (= 500 / 1.10)
DEGIRO Transactiekosten      EUR  -2.00     ← brokerage cost
Koop 10 @ 50,00 USD          USD  -500.00   ← the actual trade
```

A partial fill produces multiple `Koop`/`Verkoop` rows under the same `Order Id`, each with a corresponding `Valuta` EUR row:

```
Valuta Creditering  FX=1.10  USD  +150.00   ← fill 1: USD
Valuta Debitering            EUR  -136.36   ← fill 1: EUR
Valuta Creditering  FX=1.10  USD  +350.00   ← fill 2: USD
Valuta Debitering            EUR  -318.18   ← fill 2: EUR
DEGIRO Transactiekosten      EUR  -2.00     ← one cost row shared
Koop 3 @ 50,00 USD           USD  -150.00   ← fill 1
Koop 7 @ 50,00 USD           USD  -350.00   ← fill 2
```

## Number Format

All amounts use Dutch formatting:
- `.` as thousands separator (e.g. `1.133,82` = 1133.82)
- `,` as decimal separator (e.g. `50,00` = 50.00)

The FX rate uses the same format: `1,1554` = 1.1554.

## Parsing Logic

The importer (`backend/app/services/importer/degiro.py`):

1. Reads rows using `csv.reader` (column-index based, not by name — the header has unnamed columns)
2. Groups all rows by `Order Id`; rows with no `Order Id` (deposits, sweeps, dividends) are ignored
3. For each order group, identifies `Koop`/`Verkoop` rows as trade executions
4. Matches EUR value rows (`Valuta Debitering/Creditering` in EUR with no FX) positionally to trade rows
5. Splits `DEGIRO Transactiekosten` equally across fills when there are multiple executions
6. Extracts FX rate from the first row in the group that has a value in the FX column
7. Parses quantity and price from the `Omschrijving` string using a regex
8. Stores each trade as a `Transaction` with idempotency via `(order_id, quantity, date)`

## Rows Ignored by the Importer

- iDEAL Deposit / Reservation iDEAL
- Degiro Cash Sweep Transfer / Overboeking
- Dividend / Dividendbelasting
- DEGIRO Aansluitingskosten (connectivity fees)
- Inkomsten uit Securities Lending
- Any row without an `Order Id`
