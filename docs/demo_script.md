# Demo Script

A step-by-step walkthrough for live demonstration (5 minutes).

## Setup (before demo)

```bash
make sample-data   # or use real data
make etl
make index
make api           # in one terminal
make app           # in another terminal
```

Open http://localhost:8501

---

## Scene 1: Search Demo (1 min)

1. Open the **Search** page
2. Type: `kitchen knife` → mode: `hybrid` → click Search
3. Show results: "Notice we get products ranked by a blend of keyword match and semantic similarity"
4. Switch mode to `bm25` → same query → compare results
5. Switch to `vector` → "Now we get purely semantic results — 'cutting board' appears even without the word 'knife'"
6. Adjust alpha slider: "α=0.8 leans semantic; α=0.2 leans keyword"

---

## Scene 2: Product Detail (1 min)

1. Click on a product from the search results → navigate to **Product Detail**
2. Show the rating distribution chart: "4-5 star skew typical for Amazon"
3. Show top reviews with sentiment indicators (🟢🔴)
4. Point out: "Each review has been pre-labeled for sentiment during ingestion"

---

## Scene 3: Review Summary + Pros/Cons (1 min)

1. Copy the ASIN from the Product Detail page
2. Navigate to **Review Summary** → paste ASIN
3. Show the generated summary sentence
4. Show Pros and Cons list: "Extracted using pattern-matching against known signal words"
5. Show the sentiment donut chart: "Built from per-review sentiment labels, not just star ratings"

---

## Scene 4: Similar Products (1 min)

1. Navigate to **Similar Products** → paste ASIN
2. Show the similarity scores: "These are cosine distances in 384-dimensional embedding space"
3. Pick one similar product → Select → navigate back to Product Detail
4. "Notice this product shares thematic content with the original — both are cutting tools"

---

## Scene 5: Recommendations + Analytics (1 min)

1. Navigate to **Recommendations**
2. Select `new_user_123` → Get Recommendations → "Cold start: popularity-based"
3. Select a real user ID → Get Recommendations → "Warm start: content-based from their history"
4. Navigate to **Analytics** → show brand/category bar charts
5. "This is the kind of dashboard a buyer or category manager would use"

---

## Key Talking Points

- **Not a toy demo** — this is a full data product with an API, evaluation, and documentation
- **Real data** — 100k reviews from Amazon Reviews 2023 Home & Kitchen category
- **Eval-first mindset** — every retrieval method has Recall@K, MRR, nDCG@K numbers
- **Extensible** — reranker interface is ready for cross-encoder; embeddings store is ready for pgvector
- **Portfolio-ready** — README has architecture diagram, data card, model card, and resume bullets
