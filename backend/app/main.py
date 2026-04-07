from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, import_csv, portfolio

app = FastAPI(title="Portfolio Tracker API")

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
