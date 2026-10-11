"""Adds columns that were added to a table AFTER it was first created.

create_all() makes missing tables but never changes a table that already exists, so a column added later would
be missing from an existing database ("Invalid column name"). This adds such columns without deleting any data.
It is safe to run again: a column that is already there is skipped.

It runs automatically at the end of:  python -m app.init_db
"""
from sqlalchemy import Engine, inspect, text

# (table, column, SQL type). New table columns go here, with the same column added to the model.
NEW_COLUMNS = [
    ("Payments", "reference", "NVARCHAR(50) NULL"),  # mobile wallet transaction ID
]


def add_missing_columns(engine: Engine) -> list[str]:
    """Adds every column in NEW_COLUMNS that is missing. Returns what it added, e.g. ["Payments.reference"]."""
    added: list[str] = []
    inspector = inspect(engine)
    with engine.begin() as connection:
        for table, column, sql_type in NEW_COLUMNS:
            if table not in inspector.get_table_names():
                continue  # create_all() will build the whole table with the column in it
            if column in {existing["name"] for existing in inspector.get_columns(table)}:
                continue
            connection.execute(text(f"ALTER TABLE [{table}] ADD [{column}] {sql_type}"))
            added.append(f"{table}.{column}")
    return added
