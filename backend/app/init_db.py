"""Create the database tables.

Run from the backend folder, with .venv active:
    python -m app.init_db           creates any missing tables (safe to run again)
    python -m app.init_db --reset   DELETES all tables and data, then creates them again
"""
import sys

from app import models  # noqa: F401  (loads every table definition)
from app.database import Base, engine


def main() -> None:
    if "--reset" in sys.argv:
        answer = input("This DELETES all tables and data in your local database. Type yes to continue: ")
        if answer.strip().lower() != "yes":
            print("Cancelled - nothing was changed.")
            return
        Base.metadata.drop_all(engine)
        print("All tables deleted.")

    Base.metadata.create_all(engine)
    print("Tables are ready:", ", ".join(sorted(Base.metadata.tables)))


if __name__ == "__main__":
    main()