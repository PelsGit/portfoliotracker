from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SecurityInfo(Base):
    __tablename__ = "security_info"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    isin: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    sector: Mapped[str | None] = mapped_column(String(100))
    industry: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100))
    asset_type: Mapped[str | None] = mapped_column(String(50))
    fetched_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
