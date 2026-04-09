"""add logo_url to security_info and cash_balance table

Revision ID: c3e1f2a8b591
Revises: a74238d8834b
Create Date: 2026-04-09 10:00:00.000000

"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3e1f2a8b591"
down_revision: Union[str, None] = "a74238d8834b"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("security_info", sa.Column("logo_url", sa.String(500), nullable=True))
    op.create_table(
        "cash_balance",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("amount_eur", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("cash_balance")
    op.drop_column("security_info", "logo_url")
