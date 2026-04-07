from sqlalchemy import Date, DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Price(Base):
    __tablename__ = "prices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    isin: Mapped[str] = mapped_column(String(12), nullable=False)
    date: Mapped[str] = mapped_column(Date, nullable=False)
    close_price: Mapped[float | None] = mapped_column(Numeric(12, 4))
    fetched_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("isin", "date", name="uq_prices_isin_date"),)
