"""Add decision domain to datasets.

Revision ID: 0003
Revises: 0002
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("datasets")}
    if "domain" not in columns:
        op.add_column("datasets", sa.Column("domain", sa.String(length=32), nullable=False, server_default="movie"))

    index_names = {index["name"] for index in sa.inspect(bind).get_indexes("datasets")}
    if "ix_datasets_domain" not in index_names:
        op.create_index("ix_datasets_domain", "datasets", ["domain"])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    index_names = {index["name"] for index in inspector.get_indexes("datasets")}
    if "ix_datasets_domain" in index_names:
        op.drop_index("ix_datasets_domain", table_name="datasets")
    columns = {column["name"] for column in sa.inspect(bind).get_columns("datasets")}
    if "domain" in columns:
        op.drop_column("datasets", "domain")
