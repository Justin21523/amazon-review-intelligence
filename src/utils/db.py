"""DuckDB connection manager — singleton pattern."""

from __future__ import annotations

import threading
from pathlib import Path

import duckdb

from src.utils.logging_config import get_logger
from src.utils.paths import PROJECT_ROOT, SCHEMA_DIR

logger = get_logger(__name__)

_lock = threading.Lock()
_conn: duckdb.DuckDBPyConnection | None = None


def get_connection(db_path: str | Path | None = None) -> duckdb.DuckDBPyConnection:
    """Return (or create) the shared DuckDB connection.

    On first call the schema DDL is applied so all tables exist.
    """
    global _conn
    if _conn is not None:
        return _conn

    with _lock:
        if _conn is not None:
            return _conn

        from src.utils.config import get_settings

        path = Path(db_path or get_settings().duckdb_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        logger.info("Opening DuckDB at %s", path)
        _conn = duckdb.connect(str(path))
        _apply_schema(_conn)
    return _conn


def _apply_schema(conn: duckdb.DuckDBPyConnection) -> None:
    """Execute all DDL files in data/schema/ in order."""
    ddl_dir = SCHEMA_DIR
    ddl_files = sorted(ddl_dir.glob("*.sql")) if ddl_dir.exists() else []
    for ddl_file in ddl_files:
        logger.debug("Applying schema: %s", ddl_file.name)
        conn.executemany("", [])  # no-op flush
        sql = ddl_file.read_text()
        # Execute each statement separately
        for stmt in sql.split(";"):
            stmt = stmt.strip()
            if stmt:
                try:
                    conn.execute(stmt)
                except duckdb.CatalogException:
                    pass  # table already exists
    logger.debug("Schema applied")


def reset_connection() -> None:
    """Close and reset the singleton (useful for tests)."""
    global _conn
    with _lock:
        if _conn is not None:
            _conn.close()
            _conn = None
