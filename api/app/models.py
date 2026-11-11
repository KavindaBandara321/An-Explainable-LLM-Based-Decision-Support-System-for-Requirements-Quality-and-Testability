"""SQLAlchemy 2 models (SQL Server types). Keep in sync with alembic/versions."""

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    MetaData,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.mssql import DATETIME2, FLOAT, NVARCHAR
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

NAMING = {
    "ix": "IX_%(table_name)s_%(column_0_N_name)s",
    "uq": "UQ_%(table_name)s_%(column_0_N_name)s",
    "ck": "CK_%(table_name)s_%(constraint_name)s",
    "fk": "FK_%(table_name)s_%(column_0_N_name)s_%(referred_table_name)s",
    "pk": "PK_%(table_name)s",
}

ORIGINS = ("invented", "dev")
CONFIGURATIONS = ("rules_only", "aqusa", "llm_only", "H1", "H2", "H3")
DEFECTS = ("D1", "D2", "D3", "D4", "D5", "D6")
SOURCES = ("rule", "llm", "both")
CONFIDENCES = ("High", "Medium", "Low")
CONDITIONS = ("findings_only", "findings_plus_explanation")


def in_list(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)


class Story(Base):
    __tablename__ = "stories"
    __table_args__ = (CheckConstraint(in_list("origin", ORIGINS), name="origin"),)

    story_id: Mapped[str] = mapped_column(NVARCHAR(50), primary_key=True)
    text: Mapped[str] = mapped_column(NVARCHAR("max"))
    origin: Mapped[str] = mapped_column(NVARCHAR(10))


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"
    __table_args__ = (CheckConstraint(in_list("configuration", CONFIGURATIONS), name="configuration"),)

    run_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    configuration: Mapped[str] = mapped_column(NVARCHAR(20))
    model_name: Mapped[str | None] = mapped_column(NVARCHAR(100))
    model_version: Mapped[str | None] = mapped_column(NVARCHAR(100))
    temperature: Mapped[float | None] = mapped_column(FLOAT(53))
    prompt_hash: Mapped[str | None] = mapped_column(NVARCHAR(64))
    n_runs: Mapped[int]
    git_commit: Mapped[str] = mapped_column(NVARCHAR(40))
    run_at: Mapped[datetime] = mapped_column(DATETIME2, server_default=text("SYSUTCDATETIME()"))


class Finding(Base):
    __tablename__ = "findings"
    __table_args__ = (
        CheckConstraint(in_list("defect", DEFECTS), name="defect"),
        CheckConstraint(in_list("source", SOURCES), name="source"),
        CheckConstraint(in_list("confidence", CONFIDENCES), name="confidence"),
        CheckConstraint("span_start >= 0 AND span_end >= span_start", name="span"),
        CheckConstraint("llm_agreement IS NULL OR (llm_agreement >= 0 AND llm_agreement <= 1)", name="llm_agreement"),
        Index("IX_findings_run_id_story_id", "run_id", "story_id"),
    )

    finding_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("analysis_runs.run_id"))
    story_id: Mapped[str] = mapped_column(NVARCHAR(50), ForeignKey("stories.story_id"))
    defect: Mapped[str] = mapped_column(NVARCHAR(2))
    span_start: Mapped[int]
    span_end: Mapped[int]
    span_text: Mapped[str] = mapped_column(NVARCHAR("max"))
    source: Mapped[str] = mapped_column(NVARCHAR(4))
    rule_id: Mapped[str | None] = mapped_column(NVARCHAR(50))
    llm_agreement: Mapped[float | None] = mapped_column(FLOAT(53))
    confidence: Mapped[str] = mapped_column(NVARCHAR(6))
    label: Mapped[str] = mapped_column(NVARCHAR(30))
    evidence: Mapped[str] = mapped_column(NVARCHAR("max"))
    justification: Mapped[str | None] = mapped_column(NVARCHAR("max"))


class Improvement(Base):
    __tablename__ = "improvements"
    __table_args__ = (CheckConstraint("ISJSON(assumptions) = 1", name="assumptions_json"),)

    run_id: Mapped[int] = mapped_column(ForeignKey("analysis_runs.run_id"), primary_key=True)
    story_id: Mapped[str] = mapped_column(NVARCHAR(50), ForeignKey("stories.story_id"), primary_key=True)
    improved_text: Mapped[str] = mapped_column(NVARCHAR("max"))
    gherkin: Mapped[str] = mapped_column(NVARCHAR("max"))
    assumptions: Mapped[str] = mapped_column(NVARCHAR("max"))  # JSON array of strings


class StudyParticipant(Base):
    __tablename__ = "study_participants"
    __table_args__ = (
        # Pseudonymous codes only (P07, P123): no names or other personal data.
        CheckConstraint(
            "participant_code LIKE 'P[0-9][0-9]' OR participant_code LIKE 'P[0-9][0-9][0-9]'",
            name="participant_code",
        ),
    )

    participant_code: Mapped[str] = mapped_column(NVARCHAR(4), primary_key=True)
    consent_at: Mapped[datetime | None] = mapped_column(DATETIME2)  # NULL until consent is given


class StudyAssignment(Base):
    __tablename__ = "study_assignments"
    __table_args__ = (
        CheckConstraint(in_list("condition", CONDITIONS), name="condition"),
        CheckConstraint("order_no >= 1", name="order_no"),
        UniqueConstraint("participant_code", "order_no", "story_id", "condition"),
    )

    participant_code: Mapped[str] = mapped_column(
        NVARCHAR(4), ForeignKey("study_participants.participant_code"), primary_key=True
    )
    order_no: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    story_id: Mapped[str] = mapped_column(NVARCHAR(50), ForeignKey("stories.story_id"))
    condition: Mapped[str] = mapped_column(NVARCHAR(30))


class StudyResponse(Base):
    __tablename__ = "study_responses"
    __table_args__ = (
        CheckConstraint(in_list("condition", CONDITIONS), name="condition"),
        CheckConstraint("clarity BETWEEN 1 AND 5", name="clarity"),
        CheckConstraint("usefulness BETWEEN 1 AND 5", name="usefulness"),
        CheckConstraint("trust BETWEEN 1 AND 5", name="trust"),
        CheckConstraint("time_ms >= 0", name="time_ms"),
        # A response must match the assignment it answers (story and condition included).
        ForeignKeyConstraint(
            ["participant_code", "order_no", "story_id", "condition"],
            [
                "study_assignments.participant_code",
                "study_assignments.order_no",
                "study_assignments.story_id",
                "study_assignments.condition",
            ],
            name="FK_study_responses_assignment",
        ),
    )

    participant_code: Mapped[str] = mapped_column(
        NVARCHAR(4), ForeignKey("study_participants.participant_code"), primary_key=True
    )
    order_no: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    story_id: Mapped[str] = mapped_column(NVARCHAR(50), ForeignKey("stories.story_id"))
    condition: Mapped[str] = mapped_column(NVARCHAR(30))
    fixed_text: Mapped[str] = mapped_column(NVARCHAR("max"))
    time_ms: Mapped[int]
    clarity: Mapped[int]
    usefulness: Mapped[int]
    trust: Mapped[int]
    submitted_at: Mapped[datetime] = mapped_column(DATETIME2, server_default=text("SYSUTCDATETIME()"))
