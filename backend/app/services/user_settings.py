import json

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.user_settings import UserSettings

DEFAULT_HOLDINGS_COLUMNS = ["value", "return_eur", "weight"]


def get_holdings_columns(db: Session) -> list[str]:
    row = db.query(UserSettings).filter(UserSettings.key == "holdings_columns").first()
    if row is None or row.value is None:
        return DEFAULT_HOLDINGS_COLUMNS
    try:
        return json.loads(row.value)
    except (json.JSONDecodeError, TypeError):
        return DEFAULT_HOLDINGS_COLUMNS


def set_holdings_columns(db: Session, columns: list[str]) -> list[str]:
    stmt = pg_insert(UserSettings.__table__).values(
        key="holdings_columns",
        value=json.dumps(columns),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["key"],
        set_={"value": json.dumps(columns)},
    )
    db.execute(stmt)
    db.commit()
    return columns
