import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import SessionLocal
from app.routers import health, import_csv, portfolio, prices
from app.services.earnings import fetch_earnings_dates
from app.services.price_refresh import scheduled_refresh
from app.services.prices.yfinance_fetcher import fetch_benchmark_prices

logger = logging.getLogger(__name__)


def _startup_fetch_benchmarks() -> None:
    db = SessionLocal()
    try:
        fetch_benchmark_prices(db)
    except Exception:
        logger.exception("Startup benchmark fetch failed")
    finally:
        db.close()


def _startup_fetch_earnings() -> None:
    db = SessionLocal()
    try:
        fetch_earnings_dates(db)
    except Exception:
        logger.exception("Startup earnings fetch failed")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio

    asyncio.get_event_loop().run_in_executor(None, _startup_fetch_benchmarks)
    asyncio.get_event_loop().run_in_executor(None, _startup_fetch_earnings)

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        scheduled_refresh,
        CronTrigger(hour=18, minute=30),
        id="daily_price_refresh",
        replace_existing=True,
    )
    scheduler.add_job(
        _startup_fetch_benchmarks,
        CronTrigger(hour=18, minute=45),
        id="daily_benchmark_refresh",
        replace_existing=True,
    )
    scheduler.add_job(
        _startup_fetch_earnings,
        CronTrigger(hour=19, minute=0),
        id="daily_earnings_refresh",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduled daily: price 18:30, benchmarks 18:45, earnings 19:00 UTC")
    yield
    scheduler.shutdown()


app = FastAPI(title="Portfolio Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(import_csv.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")
app.include_router(prices.router, prefix="/api")
