"""Generate sentence-transformer embeddings and store in DuckDB."""

from __future__ import annotations

import numpy as np
import pandas as pd
from tqdm import tqdm

from src.preprocessing.text_cleaner import clean_text
from src.utils.logging_config import get_logger

logger = get_logger(__name__)


class EmbeddingGenerator:
    """Batch-encode texts with sentence-transformers and write to DuckDB."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self._model_name = model_name
        self._model = None

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading embedding model: %s", self._model_name)
            self._model = SentenceTransformer(self._model_name)
        return self._model

    def encode_products(self, conn, batch_size: int = 64) -> int:
        """Encode all products and write to product_embeddings table."""
        rows = conn.execute(
            "SELECT asin, title, COALESCE(description, '') FROM products ORDER BY asin"
        ).fetchall()
        if not rows:
            logger.warning("No products found to encode.")
            return 0

        model = self._get_model()
        asins = [r[0] for r in rows]
        texts = [clean_text(f"{r[1]} {r[2]}") for r in rows]

        logger.info("Encoding %d products (batch_size=%d) …", len(texts), batch_size)
        embeddings = model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=True,
            normalize_embeddings=True,
        )

        df = pd.DataFrame(
            {
                "asin": asins,
                "embedding": list(embeddings.tolist()),
                "model_name": self._model_name,
                "created_at": pd.Timestamp.now(),
            }
        )
        conn.register("_emb_df", df)
        conn.execute("INSERT OR REPLACE INTO product_embeddings SELECT * FROM _emb_df")
        conn.unregister("_emb_df")
        logger.info("Stored %d product embeddings.", len(df))
        return len(df)

    def encode_reviews(self, conn, batch_size: int = 64, limit: int = 5000) -> int:
        """Encode up to `limit` reviews and write to review_embeddings table.

        Reviews are sampled by highest helpful_vote to keep the most useful ones.
        """
        rows = conn.execute(
            f"""
            SELECT review_id, text FROM reviews
            ORDER BY helpful_vote DESC
            LIMIT {limit}
            """
        ).fetchall()
        if not rows:
            logger.warning("No reviews found to encode.")
            return 0

        model = self._get_model()
        ids = [r[0] for r in rows]
        texts = [clean_text(r[1] or "") for r in rows]

        logger.info("Encoding %d reviews …", len(texts))
        embeddings = model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=True,
            normalize_embeddings=True,
        )

        df = pd.DataFrame(
            {
                "review_id": ids,
                "embedding": list(embeddings.tolist()),
                "model_name": self._model_name,
                "created_at": pd.Timestamp.now(),
            }
        )
        conn.register("_remb_df", df)
        conn.execute("INSERT OR REPLACE INTO review_embeddings SELECT * FROM _remb_df")
        conn.unregister("_remb_df")
        logger.info("Stored %d review embeddings.", len(df))
        return len(df)

    def encode_query(self, query: str) -> np.ndarray:
        """Encode a single search query and return normalized embedding."""
        model = self._get_model()
        return model.encode([clean_text(query)], normalize_embeddings=True)[0]
