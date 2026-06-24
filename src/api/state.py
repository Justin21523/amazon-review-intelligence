"""Application state: lazy-initialized ML components shared across requests."""

from __future__ import annotations

from dataclasses import dataclass, field

from src.utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class AppState:
    """Container for expensive components loaded at startup."""
    bm25: "BM25Retriever | None" = field(default=None)  # type: ignore[type-arg]
    vector: "VectorRetriever | None" = field(default=None)  # type: ignore[type-arg]
    hybrid: "HybridRanker | None" = field(default=None)  # type: ignore[type-arg]
    content_based: "ContentBasedModel | None" = field(default=None)  # type: ignore[type-arg]
    cold_start: "ColdStartModel | None" = field(default=None)  # type: ignore[type-arg]


_state: AppState | None = None


def get_state() -> AppState:
    global _state
    if _state is None:
        _state = AppState()
    return _state


def init_state() -> AppState:
    """Initialize all ML components. Called once at FastAPI startup."""
    from src.models.cold_start import ColdStartModel
    from src.models.content_based import ContentBasedModel
    from src.retrieval.bm25_retriever import BM25Retriever
    from src.retrieval.hybrid_ranker import HybridRanker
    from src.retrieval.vector_retriever import VectorRetriever
    from src.utils.config import get_settings

    settings = get_settings()
    state = get_state()

    logger.info("Initializing BM25 retriever …")
    state.bm25 = BM25Retriever()

    logger.info("Initializing vector retriever …")
    state.vector = VectorRetriever(settings.embeddings_model)

    logger.info("Initializing hybrid ranker …")
    state.hybrid = HybridRanker(bm25_retriever=state.bm25, vector_retriever=state.vector)

    logger.info("Initializing content-based model …")
    state.content_based = ContentBasedModel()

    logger.info("Initializing cold-start model …")
    state.cold_start = ColdStartModel()
    state.cold_start._cb = state.content_based  # share the same instance

    logger.info("App state initialized.")
    return state
