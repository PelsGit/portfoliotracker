from decimal import Decimal

from sqlalchemy import DateTime, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CashBalance(Base):
    __tablename__ = "cash_balance"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    amount_eur: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
