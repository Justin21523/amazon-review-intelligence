"""One-time script: compute UMAP 2D projection of product embeddings.

Run AFTER stopping the backend (DuckDB cannot be opened concurrently):
    python -m src.features.compute_umap

Output: data/umap_2d.json  — [{asin, x, y, title, category, avg_rating, rating_number}, ...]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import duckdb
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = PROJECT_ROOT / "data" / "amazon_reviews.duckdb"
OUT_PATH = PROJECT_ROOT / "data" / "umap_2d.json"


def main() -> None:
    print("Connecting to DuckDB (read-only)…")
    conn = duckdb.connect(str(DB_PATH), read_only=True)

    print("Loading embeddings…")
    rows = conn.execute(
        "SELECT asin, embedding FROM product_embeddings WHERE embedding IS NOT NULL"
    ).fetchall()

    if not rows:
        print("ERROR: No embeddings found in product_embeddings table.", file=sys.stderr)
        sys.exit(1)

    asins = [r[0] for r in rows]
    embeddings = np.array([r[1] for r in rows], dtype=np.float32)
    print(f"Loaded {len(asins)} embeddings of dim {embeddings.shape[1]}")

    print("Running UMAP (n_neighbors=15, min_dist=0.1, metric=cosine)…")
    try:
        import umap  # type: ignore
        reducer = umap.UMAP(
            n_components=2,
            n_neighbors=15,
            min_dist=0.1,
            metric="cosine",
            random_state=42,
            low_memory=True,
            verbose=True,
        )
        coords = reducer.fit_transform(embeddings)
    except ImportError:
        print("umap-learn not found, falling back to scikit-learn TSNE (slower)…", file=sys.stderr)
        from sklearn.manifold import TSNE  # noqa: PLC0415
        coords = TSNE(n_components=2, metric="cosine", random_state=42, n_iter=1000).fit_transform(embeddings)

    print("Fetching product metadata…")
    asin_list = ", ".join(f"'{a}'" for a in asins)
    meta_rows = conn.execute(
        f"""
        SELECT p.asin, p.title, p.main_category, p.avg_rating, p.rating_number
        FROM products p
        WHERE p.asin IN ({asin_list})
        """
    ).fetchall()
    conn.close()

    meta = {r[0]: {"title": r[1], "category": r[2], "avg_rating": r[3], "rating_number": r[4]} for r in meta_rows}

    records = []
    for i, asin in enumerate(asins):
        m = meta.get(asin, {})
        records.append({
            "asin": asin,
            "x": float(coords[i, 0]),
            "y": float(coords[i, 1]),
            "title": m.get("title"),
            "category": m.get("category"),
            "avg_rating": float(m["avg_rating"]) if m.get("avg_rating") is not None else None,
            "rating_number": int(m["rating_number"]) if m.get("rating_number") is not None else None,
        })

    # Sort by rating_number descending so top-N filtering returns most-reviewed
    records.sort(key=lambda r: r.get("rating_number") or 0, reverse=True)

    print(f"Writing {len(records)} records to {OUT_PATH}…")
    OUT_PATH.write_text(json.dumps(records, ensure_ascii=False))
    print("Done.")


if __name__ == "__main__":
    main()
