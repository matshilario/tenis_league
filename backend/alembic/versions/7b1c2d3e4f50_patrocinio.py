"""patrocínio dos torneios: cotas e patrocinadores

Revision ID: 7b1c2d3e4f50
Revises: 42cd39166770
Create Date: 2026-11-17 11:30:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "7b1c2d3e4f50"
down_revision: Union[str, None] = "42cd39166770"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("seasons") as b:
        b.add_column(sa.Column("sponsor_slug", sa.String(length=40), nullable=True))
        b.add_column(sa.Column("sponsor_open", sa.Boolean(), nullable=False,
                               server_default=sa.false()))
        b.add_column(sa.Column("sponsor_pitch", sa.Text(), nullable=True))
        b.add_column(sa.Column("sponsor_payment", sa.Text(), nullable=True))
        b.create_unique_constraint("uq_seasons_sponsor_slug", ["sponsor_slug"])

    op.create_table(
        "sponsor_tiers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("season_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("tagline", sa.String(length=160), nullable=True),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("slots", sa.Integer(), nullable=True),
        sa.Column("visibility_days", sa.Integer(), nullable=False),
        sa.Column("perks", sa.JSON(), nullable=True),
        sa.Column("weight", sa.Integer(), nullable=False),
        sa.Column("sort", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sponsor_tiers_season_id", "sponsor_tiers", ["season_id"])

    op.create_table(
        "sponsors",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("season_id", sa.Uuid(), nullable=False),
        sa.Column("tier_id", sa.Uuid(), nullable=True),
        sa.Column("company", sa.String(length=120), nullable=False),
        sa.Column("contact_name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("website", sa.String(length=255), nullable=True),
        sa.Column("instagram", sa.String(length=80), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("logo", sa.LargeBinary(), nullable=True),
        sa.Column("logo_mime", sa.String(length=40), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("visible_until", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tier_id"], ["sponsor_tiers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sponsors_season_id", "sponsors", ["season_id"])


def downgrade() -> None:
    op.drop_index("ix_sponsors_season_id", table_name="sponsors")
    op.drop_table("sponsors")
    op.drop_index("ix_sponsor_tiers_season_id", table_name="sponsor_tiers")
    op.drop_table("sponsor_tiers")
    with op.batch_alter_table("seasons") as b:
        b.drop_constraint("uq_seasons_sponsor_slug", type_="unique")
        b.drop_column("sponsor_payment")
        b.drop_column("sponsor_pitch")
        b.drop_column("sponsor_open")
        b.drop_column("sponsor_slug")
