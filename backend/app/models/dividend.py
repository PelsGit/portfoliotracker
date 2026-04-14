from sqlalchemy import Date, DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Dividend(Base):
    __tablename__ = "dividends"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    isin: Mapped[str] = mapped_column(String(12), nullable=False)
    product_name: Mapped[str | None] = mapped_column(String(255))
    dividend_date: Mapped[Date] = mapped_column(Date, nullable=False)
    local_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    local_amount: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    gross_amount_eur: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    withholding_tax_eur: Mapped[float | None] = mapped_column(Numeric(14, 2))
    amount_eur: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("isin", "dividend_date", name="uq_dividend_isin_date"),)
