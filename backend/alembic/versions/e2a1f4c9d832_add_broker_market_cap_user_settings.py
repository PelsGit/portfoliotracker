"""add broker, market_cap, user_settings

Revision ID: e2a1f4c9d832
Revises: b3ceb67dbcd7
Create Date: 2026-04-18 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e2a1f4c9d832'
down_revision: Union[str, None] = 'b3ceb67dbcd7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('transactions', sa.Column('broker', sa.String(length=50), nullable=True))
    op.add_column('security_info', sa.Column('market_cap', sa.Numeric(precision=20, scale=2), nullable=True))
    op.create_table(
        'user_settings',
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('key'),
    )


def downgrade() -> None:
    op.drop_table('user_settings')
    op.drop_column('security_info', 'market_cap')
    op.drop_column('transactions', 'broker')
