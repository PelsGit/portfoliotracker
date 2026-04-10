BENCHMARKS = [
    {"ticker": "^GSPC",   "name": "S&P 500"},
    {"ticker": "VWCE.DE", "name": "FTSE All-World"},
    {"ticker": "^NDX",    "name": "Nasdaq 100"},
]

BENCHMARK_TICKERS = [b["ticker"] for b in BENCHMARKS]
BENCHMARK_NAME = {b["ticker"]: b["name"] for b in BENCHMARKS}
