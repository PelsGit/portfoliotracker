from sqlalchemy import Date, DateTime, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EarningsDate(Base):
    __tablename__ = "earnings_dates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    isin: Mapped[str] = mapped_column(String(12), nullable=False)
    product_name: Mapped[str | None] = mapped_column(String(255))
    earnings_date: Mapped[Date] = mapped_column(Date, nullable=False)
    fetched_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("isin", "earnings_date", name="uq_earnings_isin_date"),)
