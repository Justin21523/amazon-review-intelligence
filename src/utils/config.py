"""Application configuration via pydantic-settings."""

from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from src.utils.paths import PROJECT_ROOT


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "Amazon Review Intelligence"
    app_version: str = "0.1.0"

    # Paths
    duckdb_path: str = str(PROJECT_ROOT / "data" / "amazon_reviews.duckdb")
    data_dir: str = str(PROJECT_ROOT / "data")
    sample_data_dir: str = str(PROJECT_ROOT / "data" / "sample")
    bm25_index_path: str = str(PROJECT_ROOT / "data" / "bm25_index.joblib")

    # Models
    embeddings_model: str = "all-MiniLM-L6-v2"
    embeddings_batch_size: int = 64
    embeddings_dim: int = 384

    # Search
    default_k: int = 10
    default_mode: str = "hybrid"
    default_alpha: float = 0.5
    max_k: int = 100

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_base_url: str = "http://localhost:8000"

    # Logging
    log_level: str = "INFO"

    @field_validator("duckdb_path", "bm25_index_path", mode="before")
    @classmethod
    def resolve_path(cls, v: str) -> str:
        p = Path(v)
        if not p.is_absolute():
            return str(PROJECT_ROOT / p)
        return v


def _load_yaml_defaults() -> dict:
    cfg_path = PROJECT_ROOT / "configs" / "config.yaml"
    if cfg_path.exists():
        with open(cfg_path) as f:
            raw = yaml.safe_load(f)
        flat: dict = {}
        for section in raw.values():
            if isinstance(section, dict):
                flat.update(section)
        return flat
    return {}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
