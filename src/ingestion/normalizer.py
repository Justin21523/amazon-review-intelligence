"""Normalize raw Amazon review data into DB-ready DataFrames."""

from __future__ import annotations

import hashlib
import re

import pandas as pd

from src.utils.logging_config import get_logger

logger = get_logger(__name__)


def _make_review_id(asin: str, user_id: str, timestamp: int | float) -> str:
    key = f"{asin}:{user_id}:{int(timestamp)}"
    return hashlib.sha256(key.encode()).hexdigest()[:20]


def normalize_reviews(df: pd.DataFrame) -> pd.DataFrame:
    """Map raw/feature DataFrame columns → reviews table schema.

    Handles both raw JSONL format and pre-processed features parquet.
    """
    out = pd.DataFrame()

    # --- review_id ---
    if "review_id" in df.columns:
        out["review_id"] = df["review_id"].astype(str)
    else:
        out["review_id"] = df.apply(
            lambda r: _make_review_id(r["asin"], r.get("user_id", ""), r.get("timestamp", 0)),
            axis=1,
        )

    # --- asin / product_id ---
    if "product_id" in df.columns:
        out["asin"] = df["product_id"].astype(str)
    else:
        out["asin"] = df["asin"].astype(str)

    # --- user_id ---
    out["user_id"] = df.get("user_id", pd.Series(["unknown"] * len(df))).fillna("unknown").astype(str)

    # --- rating ---
    out["rating"] = pd.to_numeric(df["rating"], errors="coerce").fillna(0.0)

    # --- title ---
    title_col = "review_title" if "review_title" in df.columns else "title"
    out["title"] = df.get(title_col, pd.Series([""] * len(df))).fillna("").astype(str)

    # --- text ---
    text_col = "review_text" if "review_text" in df.columns else "text"
    out["text"] = df.get(text_col, pd.Series([""] * len(df))).fillna("").astype(str)

    # --- helpful_vote ---
    hv_col = "helpful_vote" if "helpful_vote" in df.columns else "helpful_votes"
    out["helpful_vote"] = pd.to_numeric(df.get(hv_col, 0), errors="coerce").fillna(0).astype(int)

    # --- verified_purchase ---
    vp_col = "verified_purchase" if "verified_purchase" in df.columns else "is_verified_purchase"
    out["verified_purchase"] = df.get(vp_col, False).fillna(False).astype(bool)

    # --- sentiment_label ---
    if "sentiment_label" in df.columns:
        out["sentiment_label"] = df["sentiment_label"].fillna("neutral").astype(str)
    else:
        out["sentiment_label"] = out["rating"].apply(
            lambda r: "positive" if r >= 4 else ("negative" if r <= 2 else "neutral")
        )

    # --- review lengths ---
    out["review_length"] = df.get("review_length", out["text"].str.len()).fillna(0).astype(int)
    out["word_count"] = df.get("word_count", out["text"].str.split().str.len()).fillna(0).astype(int)

    # --- timestamp / datetime ---
    if "review_timestamp" in df.columns:
        out["timestamp"] = df["review_timestamp"].fillna(0).astype(int)
    elif "timestamp" in df.columns:
        out["timestamp"] = df["timestamp"].fillna(0).astype(int)
    else:
        out["timestamp"] = 0

    if "review_datetime" in df.columns:
        out["review_datetime"] = pd.to_datetime(df["review_datetime"], errors="coerce")
    else:
        out["review_datetime"] = pd.to_datetime(out["timestamp"] // 1000, unit="s", errors="coerce")

    logger.info("Normalized %d reviews", len(out))
    return out.drop_duplicates(subset=["review_id"])


def normalize_products_from_reviews(reviews_df: pd.DataFrame) -> pd.DataFrame:
    """Derive a products table by aggregating per-product stats from reviews.

    Since the real data has no product metadata, we synthesize titles from
    the most common review title per product and compute aggregate stats.
    """
    asin_col = "asin" if "asin" in reviews_df.columns else "product_id"
    df = reviews_df.copy()
    df["_asin"] = df[asin_col].astype(str)

    title_col = "review_title" if "review_title" in df.columns else "title"
    text_col = "review_text" if "review_text" in df.columns else "text"

    # Aggregate per product
    agg = (
        df.groupby("_asin")
        .agg(
            review_count=("rating", "count"),
            avg_rating=("rating", "mean"),
            rating_std=("rating", "std"),
            total_helpful_vote=(
                "helpful_vote" if "helpful_vote" in df.columns else "helpful_votes",
                "sum",
            ),
        )
        .reset_index()
        .rename(columns={"_asin": "asin"})
    )

    # Best review title per product (highest helpful_vote)
    hv_col = "helpful_vote" if "helpful_vote" in df.columns else "helpful_votes"
    best_title = (
        df.sort_values(hv_col, ascending=False)
        .groupby("_asin")[title_col]
        .first()
        .reset_index()
        .rename(columns={"_asin": "asin", title_col: "title"})
    )
    agg = agg.merge(best_title, on="asin", how="left")

    # Parent asin fallback
    if "parent_product_id" in df.columns:
        parent = df.groupby("_asin")["parent_product_id"].first().reset_index()
        parent.columns = ["asin", "parent_asin"]
    elif "parent_asin" in df.columns:
        parent = df.groupby("_asin")["parent_asin"].first().reset_index()
        parent.columns = ["asin", "parent_asin"]
    else:
        parent = pd.DataFrame({"asin": agg["asin"], "parent_asin": agg["asin"]})

    agg = agg.merge(parent, on="asin", how="left")

    agg["main_category"] = "Home_and_Kitchen"
    agg["brand"] = None
    agg["description"] = None
    agg["price"] = None
    agg["negative_rate"] = (
        df.groupby("_asin")["rating"]
        .apply(lambda x: (x <= 2).mean())
        .reset_index(drop=True)
        .reindex(agg.index)
    )

    out = pd.DataFrame(
        {
            "asin": agg["asin"],
            "parent_asin": agg["parent_asin"].fillna(agg["asin"]),
            "title": agg["title"].fillna("(no title)"),
            "brand": agg.get("brand", None),
            "main_category": "Home_and_Kitchen",
            "description": "",
            "price": None,
            "avg_rating": agg["avg_rating"].round(3),
            "rating_number": agg["review_count"].astype(int),
            "rating_std": agg["rating_std"].fillna(0).round(3),
            "negative_rate": 0.0,
            "verified_ratio": 0.0,
            "helpful_vote_avg": 0.0,
            "reputation_score": agg["avg_rating"] * (agg["review_count"] ** 0.5),
        }
    )
    logger.info("Derived %d products from reviews", len(out))
    return out


def normalize_products_jsonl(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize product metadata from Amazon Reviews 2023 item JSON format."""
    out = pd.DataFrame()
    out["asin"] = df["asin"].astype(str)
    out["parent_asin"] = df.get("parent_asin", df["asin"]).fillna(df["asin"]).astype(str)
    out["title"] = df.get("title", "").fillna("").astype(str)
    out["brand"] = df.get("store", df.get("brand", "")).fillna("").astype(str)
    out["main_category"] = df.get("main_category", "Electronics").fillna("Electronics").astype(str)
    out["description"] = df.get("description", [""]).apply(
        lambda x: " ".join(x) if isinstance(x, list) else str(x or "")
    )
    out["price"] = pd.to_numeric(
        df.get("price", None).apply(
            lambda x: re.sub(r"[^\d.]", "", str(x)) if x else None
        ) if "price" in df.columns else None,
        errors="coerce",
    )
    out["avg_rating"] = pd.to_numeric(df.get("average_rating", 0), errors="coerce").fillna(0)
    out["rating_number"] = pd.to_numeric(df.get("rating_number", 0), errors="coerce").fillna(0).astype(int)
    out["rating_std"] = 0.0
    out["negative_rate"] = 0.0
    out["verified_ratio"] = 0.0
    out["helpful_vote_avg"] = 0.0
    out["reputation_score"] = out["avg_rating"] * (out["rating_number"] ** 0.5)
    logger.info("Normalized %d products from JSONL", len(out))
    return out.drop_duplicates(subset=["asin"])
