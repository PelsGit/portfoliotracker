"""add earnings_dates table

Revision ID: d4e5f6a7b890
Revises: c3e1f2a8b591
Branch Labels: None
Depends On: None

"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b890"
down_revision: Union[str, None] = "c3e1f2a8b591"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.create_table(
        "earnings_dates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("isin", sa.String(12), nullable=False),
        sa.Column("product_name", sa.String(255), nullable=True),
        sa.Column("earnings_date", sa.Date(), nullable=False),
        sa.Column(
            "fetched_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("isin", "earnings_date", name="uq_earnings_isin_date"),
    )


def downgrade() -> None:
    op.drop_table("earnings_dates")
