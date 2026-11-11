from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from .config import settings


def make_engine(url=None) -> Engine:
    return create_engine(url or settings.main_url, pool_pre_ping=True)


engine = make_engine()
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_session():
    with SessionLocal() as session:
        yield session
