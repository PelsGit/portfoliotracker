from sqlalchemy import DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PortfolioGoal(Base):
    __tablename__ = "portfolio_goals"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    dimension: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    target_weight: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("dimension", "name", name="uq_goal_dimension_name"),
    )
