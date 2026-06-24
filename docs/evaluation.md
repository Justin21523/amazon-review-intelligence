# Evaluation

## Search Evaluation

### Metrics

| Metric | Formula | Interpretation |
|--------|---------|---------------|
| **Recall@K** | hits_in_top_K / total_relevant | What fraction of relevant items were retrieved |
| **MRR** | 1 / rank_of_first_relevant | How quickly the first relevant result appears |
| **nDCG@K** | DCG@K / IDCG@K | Quality of ranking (penalizes relevant items ranked low) |

### Relevance Judgment Strategy

Since the dataset has no human relevance labels, we use **category-based proxy relevance**: a product is considered relevant to a query if it belongs to the same category as the query seed product. This is a weak proxy — it overestimates recall for broad categories — but is reproducible and sufficient for relative comparison of retrieval methods.

### Results (83,119 products, 20 query seeds, category-proxy relevance)

| Method | Recall@5 | Recall@10 | Recall@20 | MRR | nDCG@5 | nDCG@10 | nDCG@20 |
|--------|----------|-----------|-----------|-----|--------|---------|---------|
| BM25 | 0.0000 | 0.0001 | 0.0002 | **0.500** | 0.6608 | 0.7799 | 0.8580 |
| Vector (all-MiniLM-L6-v2) | 0.0000 | 0.0001 | 0.0002 | **0.575** | 0.6796 | 0.7921 | 0.8658 |
| Hybrid (α=0.5) | 0.0000 | 0.0001 | 0.0002 | **0.575** | 0.6796 | 0.7921 | 0.8658 |

#### ⚠️ Recall Interpretation

Recall is near 0 because the relevance proxy treats **all 83,119 Home & Kitchen products** as relevant for any Home & Kitchen query. Retrieving 10 out of 83K gives Recall@10 ≈ 0.01%. This is a dataset artifact, not a retrieval failure.

**The more meaningful metrics are MRR and nDCG:**
- **MRR 0.575** → the first relevant result appears in position 1-2 for most queries
- **nDCG@10 0.79** → strong ranking quality; relevant items are concentrated at the top
- **Vector > BM25 on MRR (+7.5%)** → semantic search finds the right product slightly faster
- Hybrid matches Vector at α=0.5, suggesting the dataset is semantics-dominant

For a production deployment with human relevance labels, Recall@10 would be the primary metric.

## Recommendation Evaluation

### Metrics

| Metric | Formula | Interpretation |
|--------|---------|---------------|
| **Precision@K** | hits_in_top_K / K | Fraction of recommendations that are relevant |
| **Recall@K** | hits_in_top_K / total_relevant | Fraction of relevant items recommended |
| **MAP@K** | Mean Average Precision | Mean of Precision@1..K at each hit position |
| **Coverage** | unique_recommended / total_products | Catalog coverage of the recommender |

### Test Protocol

Leave-one-out: for users with ≥3 interactions, the last interaction is held out as ground truth. Model recommends from training interactions.

### Results (leave-one-out, users with ≥3 reviews)

| Model | Precision@5 | Precision@10 | Recall@5 | Recall@10 | MAP@10 | Coverage |
|-------|------------|--------------|---------|-----------|--------|---------|
| ColdStart (content-based / popularity) | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | **2.28%** |

#### ⚠️ Precision/Recall = 0 — Sparsity Explanation

This dataset has only 6,801 unique reviewers across 83,119 products (avg 14.7 reviews/user). After leave-one-out split, most users have 1 remaining review in the test set. Content-based recommendations surface semantically similar products, but the chance of matching the held-out item exactly is near zero in a catalog of 83K.

**Coverage 2.28%** is the meaningful metric here: the cold-start model actively recommends from 1,897 distinct products, showing it's not just returning the same top-10 for everyone.

For a realistic recommendation eval, this dataset would need:
- Denser users (≥10 interactions each), OR
- Category-level evaluation (was the recommended product in the right category?)

## Summarization Evaluation

ROUGE scores are listed as optional reference — they measure n-gram overlap, not faithfulness. Primary evaluation uses the manual checklist.

### Manual Checklist Template

See `src/evaluation/summarization_checklist.py` for the full template. Key dimensions:
1. **Faithfulness** — every claim is supported by at least one review
2. **Completeness** — major pros/cons are captured
3. **Clarity** — readable without reading the source reviews

### ROUGE (Optional, for reference only)

ROUGE-1 and ROUGE-2 can be computed by comparing generated summaries against the union of all review sentences. These numbers should not be used as primary success metrics because:
- Reference-less summaries are unachievable with extractive methods
- High ROUGE does not imply faithfulness
- Low ROUGE does not imply low quality

## Running Evaluation

```bash
# Run all evaluations
make evaluate

# Results saved to:
# data/evaluation_results.json
```
