"""patrocinadores: versão da logo gravada na escrita (listas não carregam o binário)

Revision ID: 8c2d3e4f5061
Revises: 7b1c2d3e4f50
Create Date: 2026-11-20 10:00:00

"""
import zlib
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "8c2d3e4f5061"
down_revision: Union[str, None] = "7b1c2d3e4f50"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("sponsors") as b:
        b.add_column(sa.Column("logo_version", sa.String(length=16), nullable=True))
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, logo FROM sponsors WHERE logo IS NOT NULL")).all()
    for sid, logo in rows:
        conn.execute(sa.text("UPDATE sponsors SET logo_version = :v WHERE id = :id"),
                     {"v": format(zlib.crc32(bytes(logo)), "x"), "id": sid})


def downgrade() -> None:
    with op.batch_alter_table("sponsors") as b:
        b.drop_column("logo_version")
