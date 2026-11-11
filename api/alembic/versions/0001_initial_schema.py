"""initial schema: stories, analysis runs, findings, improvements, study tables

Revision ID: 0001
Revises:
Create Date: 2026-10-31
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import mssql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

CONDITIONS = "'findings_only', 'findings_plus_explanation'"


def upgrade() -> None:
    op.create_table(
        "stories",
        sa.Column("story_id", mssql.NVARCHAR(50), nullable=False),
        sa.Column("text", mssql.NVARCHAR("max"), nullable=False),
        sa.Column("origin", mssql.NVARCHAR(10), nullable=False),
        sa.PrimaryKeyConstraint("story_id", name="PK_stories"),
        sa.CheckConstraint("origin IN ('invented', 'dev')", name=op.f("CK_stories_origin")),
    )

    op.create_table(
        "analysis_runs",
        sa.Column("run_id", sa.Integer(), sa.Identity(start=1), nullable=False),
        sa.Column("configuration", mssql.NVARCHAR(20), nullable=False),
        sa.Column("model_name", mssql.NVARCHAR(100), nullable=True),
        sa.Column("model_version", mssql.NVARCHAR(100), nullable=True),
        sa.Column("temperature", mssql.FLOAT(53), nullable=True),
        sa.Column("prompt_hash", mssql.NVARCHAR(64), nullable=True),
        sa.Column("n_runs", sa.Integer(), nullable=False),
        sa.Column("git_commit", mssql.NVARCHAR(40), nullable=False),
        sa.Column("run_at", mssql.DATETIME2(), server_default=sa.text("SYSUTCDATETIME()"), nullable=False),
        sa.PrimaryKeyConstraint("run_id", name="PK_analysis_runs"),
        sa.CheckConstraint(
            "configuration IN ('rules_only', 'aqusa', 'llm_only', 'H1', 'H2', 'H3')",
            name=op.f("CK_analysis_runs_configuration"),
        ),
    )

    op.create_table(
        "findings",
        sa.Column("finding_id", sa.Integer(), sa.Identity(start=1), nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=False),
        sa.Column("story_id", mssql.NVARCHAR(50), nullable=False),
        sa.Column("defect", mssql.NVARCHAR(2), nullable=False),
        sa.Column("span_start", sa.Integer(), nullable=False),
        sa.Column("span_end", sa.Integer(), nullable=False),
        sa.Column("span_text", mssql.NVARCHAR("max"), nullable=False),
        sa.Column("source", mssql.NVARCHAR(4), nullable=False),
        sa.Column("rule_id", mssql.NVARCHAR(50), nullable=True),
        sa.Column("llm_agreement", mssql.FLOAT(53), nullable=True),
        sa.Column("confidence", mssql.NVARCHAR(6), nullable=False),
        sa.Column("label", mssql.NVARCHAR(30), nullable=False),
        sa.Column("evidence", mssql.NVARCHAR("max"), nullable=False),
        sa.Column("justification", mssql.NVARCHAR("max"), nullable=True),
        sa.PrimaryKeyConstraint("finding_id", name="PK_findings"),
        sa.ForeignKeyConstraint(["run_id"], ["analysis_runs.run_id"], name="FK_findings_run_id_analysis_runs"),
        sa.ForeignKeyConstraint(["story_id"], ["stories.story_id"], name="FK_findings_story_id_stories"),
        sa.CheckConstraint("defect IN ('D1', 'D2', 'D3', 'D4', 'D5', 'D6')", name=op.f("CK_findings_defect")),
        sa.CheckConstraint("source IN ('rule', 'llm', 'both')", name=op.f("CK_findings_source")),
        sa.CheckConstraint("confidence IN ('High', 'Medium', 'Low')", name=op.f("CK_findings_confidence")),
        sa.CheckConstraint("span_start >= 0 AND span_end >= span_start", name=op.f("CK_findings_span")),
        sa.CheckConstraint(
            "llm_agreement IS NULL OR (llm_agreement >= 0 AND llm_agreement <= 1)", name=op.f("CK_findings_llm_agreement")
        ),
    )
    op.create_index("IX_findings_run_id_story_id", "findings", ["run_id", "story_id"])

    op.create_table(
        "improvements",
        sa.Column("run_id", sa.Integer(), nullable=False),
        sa.Column("story_id", mssql.NVARCHAR(50), nullable=False),
        sa.Column("improved_text", mssql.NVARCHAR("max"), nullable=False),
        sa.Column("gherkin", mssql.NVARCHAR("max"), nullable=False),
        sa.Column("assumptions", mssql.NVARCHAR("max"), nullable=False),
        sa.PrimaryKeyConstraint("run_id", "story_id", name="PK_improvements"),
        sa.ForeignKeyConstraint(["run_id"], ["analysis_runs.run_id"], name="FK_improvements_run_id_analysis_runs"),
        sa.ForeignKeyConstraint(["story_id"], ["stories.story_id"], name="FK_improvements_story_id_stories"),
        sa.CheckConstraint("ISJSON(assumptions) = 1", name=op.f("CK_improvements_assumptions_json")),
    )

    op.create_table(
        "study_participants",
        sa.Column("participant_code", mssql.NVARCHAR(4), nullable=False),
        sa.Column("consent_at", mssql.DATETIME2(), nullable=True),
        sa.PrimaryKeyConstraint("participant_code", name="PK_study_participants"),
        sa.CheckConstraint(
            "participant_code LIKE 'P[0-9][0-9]' OR participant_code LIKE 'P[0-9][0-9][0-9]'",
            name=op.f("CK_study_participants_participant_code"),
        ),
    )

    op.create_table(
        "study_assignments",
        sa.Column("participant_code", mssql.NVARCHAR(4), nullable=False),
        sa.Column("order_no", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("story_id", mssql.NVARCHAR(50), nullable=False),
        sa.Column("condition", mssql.NVARCHAR(30), nullable=False),
        sa.PrimaryKeyConstraint("participant_code", "order_no", name="PK_study_assignments"),
        sa.ForeignKeyConstraint(
            ["participant_code"],
            ["study_participants.participant_code"],
            name="FK_study_assignments_participant_code_study_participants",
        ),
        sa.ForeignKeyConstraint(["story_id"], ["stories.story_id"], name="FK_study_assignments_story_id_stories"),
        sa.UniqueConstraint(
            "participant_code", "order_no", "story_id", "condition", name="UQ_study_assignments_participant_code_order_no_story_id_condition"
        ),
        sa.CheckConstraint(f"condition IN ({CONDITIONS})", name=op.f("CK_study_assignments_condition")),
        sa.CheckConstraint("order_no >= 1", name=op.f("CK_study_assignments_order_no")),
    )

    op.create_table(
        "study_responses",
        sa.Column("participant_code", mssql.NVARCHAR(4), nullable=False),
        sa.Column("order_no", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("story_id", mssql.NVARCHAR(50), nullable=False),
        sa.Column("condition", mssql.NVARCHAR(30), nullable=False),
        sa.Column("fixed_text", mssql.NVARCHAR("max"), nullable=False),
        sa.Column("time_ms", sa.Integer(), nullable=False),
        sa.Column("clarity", sa.Integer(), nullable=False),
        sa.Column("usefulness", sa.Integer(), nullable=False),
        sa.Column("trust", sa.Integer(), nullable=False),
        sa.Column("submitted_at", mssql.DATETIME2(), server_default=sa.text("SYSUTCDATETIME()"), nullable=False),
        sa.PrimaryKeyConstraint("participant_code", "order_no", name="PK_study_responses"),
        sa.ForeignKeyConstraint(
            ["participant_code"],
            ["study_participants.participant_code"],
            name="FK_study_responses_participant_code_study_participants",
        ),
        sa.ForeignKeyConstraint(["story_id"], ["stories.story_id"], name="FK_study_responses_story_id_stories"),
        sa.ForeignKeyConstraint(
            ["participant_code", "order_no", "story_id", "condition"],
            [
                "study_assignments.participant_code",
                "study_assignments.order_no",
                "study_assignments.story_id",
                "study_assignments.condition",
            ],
            name="FK_study_responses_assignment",
        ),
        sa.CheckConstraint(f"condition IN ({CONDITIONS})", name=op.f("CK_study_responses_condition")),
        sa.CheckConstraint("clarity BETWEEN 1 AND 5", name=op.f("CK_study_responses_clarity")),
        sa.CheckConstraint("usefulness BETWEEN 1 AND 5", name=op.f("CK_study_responses_usefulness")),
        sa.CheckConstraint("trust BETWEEN 1 AND 5", name=op.f("CK_study_responses_trust")),
        sa.CheckConstraint("time_ms >= 0", name=op.f("CK_study_responses_time_ms")),
    )


def downgrade() -> None:
    for table in (
        "study_responses",
        "study_assignments",
        "study_participants",
        "improvements",
        "findings",
        "analysis_runs",
        "stories",
    ):
        op.drop_table(table)
