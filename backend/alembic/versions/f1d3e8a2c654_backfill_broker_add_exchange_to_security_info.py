"""backfill broker, add exchange to security_info

Revision ID: f1d3e8a2c654
Revises: e2a1f4c9d832
Create Date: 2026-04-18 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f1d3e8a2c654'
down_revision: Union[str, None] = 'e2a1f4c9d832'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('security_info', sa.Column('exchange', sa.String(length=50), nullable=True))

    # Backfill broker for existing transactions imported before the broker column existed:
    # DEGIRO always leaves exchange NULL; MEXEM provides exchange codes.
    op.execute("UPDATE transactions SET broker = 'DEGIRO' WHERE broker IS NULL AND exchange IS NULL")
    op.execute("UPDATE transactions SET broker = 'MEXEM' WHERE broker IS NULL AND exchange IS NOT NULL")


def downgrade() -> None:
    op.drop_column('security_info', 'exchange')
