"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routers import analytics, health, products, recommendations, search
from src.utils.config import get_settings
from src.utils.db import get_connection
from src.utils.logging_config import get_logger, setup_logging

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB and ML components at startup."""
    setup_logging(get_settings().log_level)
    logger.info("Starting Amazon Review Intelligence API …")
    get_connection()  # ensure DB + schema
    from src.api.state import init_state
    init_state()
    logger.info("API ready.")
    yield
    logger.info("Shutting down.")


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Product search, recommendation, and NLP API powered by Amazon Reviews 2023",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(search.router)
app.include_router(products.router)
app.include_router(recommendations.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
    }
