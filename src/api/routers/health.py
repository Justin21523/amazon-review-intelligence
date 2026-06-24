"""Health check endpoint."""

from fastapi import APIRouter

from src.api.schemas import HealthResponse
from src.utils.config import get_settings
from src.utils.db import get_connection

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Return API health status and basic DB stats."""
    settings = get_settings()
    conn = get_connection()
    try:
        products_count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        reviews_count = conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
        db_status = "connected"
    except Exception as e:
        products_count = 0
        reviews_count = 0
        db_status = f"error: {e}"

    return HealthResponse(
        status="ok",
        version=settings.app_version,
        duckdb=db_status,
        products_count=products_count,
        reviews_count=reviews_count,
    )
