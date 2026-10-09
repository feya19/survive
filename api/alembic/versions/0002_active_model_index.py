"""Enforce one active version per model family.

Revision ID: 0002
Revises: 0001
"""
from alembic import op
revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

def upgrade():
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_active_model_family ON model_versions (model_type) WHERE status = 'active'")

def downgrade():
    op.drop_index("uq_active_model_family", table_name="model_versions")
