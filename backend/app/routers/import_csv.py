import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cash_balance import CashBalance
from app.schemas.transaction import ImportConfirmResponse, ImportPreviewResponse, TransactionOut
from app.services.importer.degiro import import_degiro_transactions, parse_account_csv, parse_cash_balance
from app.services.prices.yfinance_fetcher import fetch_prices_for_isins

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/import/degiro/preview", response_model=ImportPreviewResponse)
async def import_degiro_preview(file: UploadFile):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    try:
        parsed = parse_account_csv(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}") from e

    transactions = [TransactionOut(**row) for row in parsed]
    return ImportPreviewResponse(count=len(transactions), transactions=transactions)


@router.post("/import/degiro/confirm", response_model=ImportConfirmResponse)
async def import_degiro_confirm(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    try:
        parsed = parse_account_csv(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}") from e

    imported, skipped, db_transactions = import_degiro_transactions(db, parsed)

    cash = parse_cash_balance(content)
    logger.info("Cash balance parsed from CSV: %s", cash)
    if cash is not None:
        try:
            db.query(CashBalance).delete()
            db.add(CashBalance(amount_eur=cash))
            db.commit()
            logger.info("Cash balance stored in DB: %s EUR", cash)
        except Exception:
            logger.exception("Failed to update cash balance")
            db.rollback()
    else:
        logger.warning("No EUR saldo found in CSV — cash balance not updated")

    isins = list({row["isin"] for row in parsed})
    if isins:
        background_tasks.add_task(fetch_prices_for_isins, db, isins)

    transactions = [TransactionOut.model_validate(txn) for txn in db_transactions]
    return ImportConfirmResponse(imported=imported, skipped=skipped, transactions=transactions)
