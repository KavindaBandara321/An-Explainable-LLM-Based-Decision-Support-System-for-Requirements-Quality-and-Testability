"""Settings and DB connection strings. Secrets come only from api/.env (or real environment variables)."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

API_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=API_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    db_server: str = "127.0.0.1,1433"
    db_user: str = ""
    db_password: str = ""
    db_driver: str = "ODBC Driver 18 for SQL Server"
    db_trust_server_certificate: str = "yes"
    db_name: str = "story_quality"
    db_test_name: str = "story_quality_test"
    cors_origin: str = "http://localhost:4200"

    def odbc_connect(self, database: str) -> str:
        parts = [
            f"DRIVER={{{self.db_driver}}}",
            f"SERVER={self.db_server}",
            f"DATABASE={database}",
        ]
        if self.db_user:
            parts += [f"UID={self.db_user}", f"PWD={{{self.db_password.replace('}', '}}')}}}"]
        else:
            parts.append("Trusted_Connection=yes")
        if self.db_trust_server_certificate:
            parts.append(f"TrustServerCertificate={self.db_trust_server_certificate}")
        return ";".join(parts)

    def url(self, database: str | None = None) -> URL:
        return URL.create("mssql+pyodbc", query={"odbc_connect": self.odbc_connect(database or self.db_name)})

    @property
    def main_url(self) -> URL:
        return self.url(self.db_name)

    @property
    def test_url(self) -> URL:
        if not self.db_test_name.endswith("_test") or self.db_test_name == self.db_name:
            raise ValueError("DB_TEST_NAME must end in '_test' and differ from DB_NAME.")
        return self.url(self.db_test_name)


settings = Settings()
