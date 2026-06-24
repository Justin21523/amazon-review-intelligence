# Model Card

## Embedding Model

| Field | Value |
|-------|-------|
| **Model** | `sentence-transformers/all-MiniLM-L6-v2` |
| **Dimensions** | 384 |
| **Max tokens** | 256 (text truncated to 2,000 chars before encoding) |
| **Normalization** | L2-normalized outputs (cosine similarity = dot product) |
| **Training data** | 1B+ sentence pairs (MS MARCO, NLI, etc.) |
| **License** | Apache 2.0 |
| **Latency** | ~2ms per batch of 64 on CPU |

**Why this model:** Best balance of quality and speed for semantic search over product descriptions. Small enough to run on CPU, large enough to capture semantic relationships.

**Limitations:** Not fine-tuned on Amazon product data; may miss domain-specific synonyms (e.g. "cast iron skillet" vs "frying pan").

## BM25

| Field | Value |
|-------|-------|
| **Implementation** | `rank-bm25` (BM25Okapi) |
| **Parameters** | k1=1.5, b=0.75 (library defaults) |
| **Corpus** | Product title + description tokens |
| **Tokenization** | Whitespace split after HTML cleanup + lowercasing |

**Strengths:** Exact keyword matching, interpretable scores, no GPU needed.

**Limitations:** No semantic understanding; "couch" and "sofa" are unrelated tokens.

## Hybrid Ranker

Combines BM25 and vector scores with min-max normalization and linear blending:

```
hybrid_score = (1 - alpha) * bm25_normalized + alpha * vector_normalized
```

Default `alpha=0.5`. Range [0.0, 1.0].

## Reranker (SimpleReranker)

MVP reranker boosts retrieval scores by product reputation:

```
rerank_score = base_score * (1 + log(1 + rating_count) * avg_rating / 10)
```

**Upgrade path:** Replace with `cross-encoder/ms-marco-MiniLM-L-6-v2` via the `RerankerInterface`.

## Recommender Models

| Model | Strategy | Cold-start? |
|-------|----------|-------------|
| `PopularityModel` | `avg_rating × sqrt(review_count)` | ✅ Yes |
| `ContentBasedModel` | Product embedding cosine similarity | ❌ No (needs product embedding) |
| `ItemItemModel` | Adjusted cosine on user-item rating matrix | ❌ No (needs ≥2 reviews) |
| `ColdStartModel` | ContentBased if user has history, else Popularity | ✅ Yes |

## Aspect Extractor

Rule-based pattern matching (no ML model):
- Pro signals: `love, excellent, amazing, perfect, great, best, outstanding, …`
- Con signals: `bad, terrible, poor, broken, disappointed, issue, stopped working, …`
- Selection: top-3 sentences by signal word frequency

**Known limitations:** Sarcasm detection not implemented; may occasionally misclassify ironic reviews.

## Evaluation Methodology

See `docs/evaluation.md` for metric definitions and results.
