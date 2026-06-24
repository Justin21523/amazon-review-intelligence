"""DuckDB connection manager — singleton pattern."""

from __future__ import annotations

import threading
from pathlib import Path

import duckdb

from src.utils.logging_config import get_logger
from src.utils.paths import PROJECT_ROOT, SCHEMA_DIR

logger = get_logger(__name__)

_lock = threading.Lock()
_query_lock = threading.RLock()
_conn: "LockedDuckDBConnection | None" = None


class LockedDuckDBResult:
    """Hold the DuckDB lock until a result is consumed."""

    def __init__(self, result: duckdb.DuckDBPyConnection, lock: threading.RLock):
        self._result = result
        self._lock = lock
        self._released = False

    def _release(self) -> None:
        if not self._released:
            self._released = True
            self._lock.release()

    def fetchone(self):
        try:
            return self._result.fetchone()
        finally:
            self._release()

    def fetchall(self):
        try:
            return self._result.fetchall()
        finally:
            self._release()

    def fetchdf(self):
        try:
            return self._result.fetchdf()
        finally:
            self._release()

    def fetchnumpy(self):
        try:
            return self._result.fetchnumpy()
        finally:
            self._release()

    def __getattr__(self, name: str):
        return getattr(self._result, name)

    def __del__(self):
        self._release()


class LockedDuckDBConnection:
    """Serialize access to the shared DuckDB connection used by FastAPI threads."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self._conn = conn

    def execute(self, query: str, parameters=None):
        sql = query.lstrip().lower()
        holds_result = sql.startswith(("select", "with", "pragma", "show", "describe", "explain"))
        _query_lock.acquire()
        try:
            result = self._conn.execute(query, parameters)
        except Exception:
            _query_lock.release()
            raise
        if holds_result:
            return LockedDuckDBResult(result, _query_lock)
        _query_lock.release()
        return result

    def executemany(self, query: str, parameters=None):
        with _query_lock:
            return self._conn.executemany(query, parameters)

    def close(self) -> None:
        with _query_lock:
            self._conn.close()

    def __getattr__(self, name: str):
        return getattr(self._conn, name)


def get_connection(db_path: str | Path | None = None) -> LockedDuckDBConnection:
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
        raw_conn = duckdb.connect(str(path))
        _apply_schema(raw_conn)
        _conn = LockedDuckDBConnection(raw_conn)
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
