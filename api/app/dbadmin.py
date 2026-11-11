"""Create databases when missing (used by README setup and by the test suite)."""

import pyodbc

from .config import settings


def ensure_database(name: str) -> None:
    if not name.replace("_", "").isalnum():
        raise ValueError(f"Unsafe database name: {name!r}")
    conn = pyodbc.connect(settings.odbc_connect("master"), autocommit=True)
    try:
        conn.execute(f"IF DB_ID(N'{name}') IS NULL CREATE DATABASE [{name}]")
    finally:
        conn.close()


def drop_database(name: str) -> None:
    if not name.endswith("_test"):
        raise ValueError("Refusing to drop a database whose name does not end in '_test'.")
    conn = pyodbc.connect(settings.odbc_connect("master"), autocommit=True)
    try:
        conn.execute(
            f"IF DB_ID(N'{name}') IS NOT NULL BEGIN "
            f"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}]; END"
        )
    finally:
        conn.close()
