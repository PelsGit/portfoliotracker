from sqlalchemy import DateTime, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    isin: Mapped[str] = mapped_column(String(12), nullable=False)
    product_name: Mapped[str | None] = mapped_column(String(255))
    exchange: Mapped[str | None] = mapped_column(String(10))
    local_currency: Mapped[str | None] = mapped_column(String(3))
    date: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    price: Mapped[float | None] = mapped_column(Numeric(12, 4))
    local_value: Mapped[float | None] = mapped_column(Numeric(14, 2))
    value: Mapped[float | None] = mapped_column(Numeric(14, 2))
    fx_rate: Mapped[float | None] = mapped_column(Numeric(10, 6))
    costs: Mapped[float | None] = mapped_column(Numeric(10, 2))
    total: Mapped[float | None] = mapped_column(Numeric(14, 2))
    order_id: Mapped[str | None] = mapped_column(String(50))
    broker: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_transactions_isin", "isin"),)
