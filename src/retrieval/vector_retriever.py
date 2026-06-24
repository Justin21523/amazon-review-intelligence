"""Dense vector retriever using product_embeddings stored in DuckDB."""

from __future__ import annotations

import numpy as np

from src.features.embedding_generator import EmbeddingGenerator
from src.utils.logging_config import get_logger

logger = get_logger(__name__)


class VectorRetriever:
    """Cosine similarity search over product embeddings in DuckDB."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self._gen = EmbeddingGenerator(model_name)
        self._embeddings: np.ndarray | None = None
        self._asins: list[str] = []

    def _ensure_loaded(self, conn) -> None:
        if self._embeddings is not None:
            return
        rows = conn.execute(
            "SELECT asin, embedding FROM product_embeddings ORDER BY asin"
        ).fetchall()
        if not rows:
            raise RuntimeError("No product embeddings found. Run `make index` first.")
        self._asins = [r[0] for r in rows]
        self._embeddings = np.array([r[1] for r in rows], dtype=np.float32)
        logger.info("Loaded %d product embeddings from DuckDB", len(self._asins))

    def search(self, query: str, k: int = 10, conn=None) -> list[dict]:
        """Return top-k products by cosine similarity.

        Returns:
            List of {"asin", "vector_score", "rank"} dicts.
        """
        if conn is None:
            from src.utils.db import get_connection
            conn = get_connection()
        self._ensure_loaded(conn)

        q_emb = self._gen.encode_query(query).astype(np.float32)
        # Embeddings are already normalized (normalize_embeddings=True during indexing)
        scores = self._embeddings @ q_emb
        ranked_idx = np.argsort(-scores)

        return [
            {
                "asin": self._asins[i],
                "vector_score": float(scores[i]),
                "rank": rank + 1,
            }
            for rank, i in enumerate(ranked_idx[:k])
        ]

    def is_ready(self, conn=None) -> bool:
        if conn is None:
            from src.utils.db import get_connection
            conn = get_connection()
        n = conn.execute("SELECT COUNT(*) FROM product_embeddings").fetchone()[0]
        return n > 0

    def reload(self) -> None:
        """Force re-load embeddings from DB on next search."""
        self._embeddings = None
        self._asins = []
