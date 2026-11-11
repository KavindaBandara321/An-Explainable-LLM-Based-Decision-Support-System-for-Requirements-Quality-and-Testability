"""Create the application database if it does not exist yet: python -m scripts.create_db"""

from app.config import settings
from app.dbadmin import ensure_database

if __name__ == "__main__":
    ensure_database(settings.db_name)
    print(f"Database '{settings.db_name}' is ready.")
