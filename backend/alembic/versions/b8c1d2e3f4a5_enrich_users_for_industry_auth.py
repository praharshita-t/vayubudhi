"""enrich_users_for_industry_auth

Revision ID: b8c1d2e3f4a5
Revises: 3f707710077c
Create Date: 2026-09-26 02:35:00.000000

Adds industry-grade profile and audit-lite fields to users:
phone, assigned_city, last_login_at, updated_at.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8c1d2e3f4a5"
down_revision: Union[str, Sequence[str], None] = "3f707710077c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("phone", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("assigned_city", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("last_login_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("updated_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("updated_at")
        batch_op.drop_column("last_login_at")
        batch_op.drop_column("assigned_city")
        batch_op.drop_column("phone")
