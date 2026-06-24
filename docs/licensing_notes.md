# Licensing Notes

## Amazon Reviews 2023 Dataset

**Source:** McAuley Lab, UC San Diego — https://amazon-reviews-2023.github.io/

**Licensing status:** The Amazon Reviews 2023 dataset does not carry an explicit open-source license. The dataset page states it is provided for research and educational use. Key restrictions (from dataset terms and Amazon's usage policies):

- **Do not redistribute raw review dumps** in whole or in part
- **Do not use for commercial purposes** without explicit permission
- **No mass scraping** or reproduction of Amazon content at scale

## What This Repo Contains

| Artifact | Included? | Rationale |
|----------|-----------|-----------|
| Raw `.jsonl` review files | ❌ No | Would constitute redistribution of raw Amazon content |
| Full product metadata dumps | ❌ No | Same reason |
| Sample JSONL (synthetic) | ✅ Yes | Synthetically generated, not Amazon data |
| Derived aggregated statistics | ✅ Yes | Aggregate stats (avg_rating, counts) are derived facts |
| DuckDB file (built locally) | ❌ No (gitignored) | Contains review text; not committed |
| BM25 index | ❌ No (gitignored) | Derived from raw text; not committed |
| Embeddings | ❌ No (gitignored) | Derived numeric vectors |
| Evaluation metrics (JSON) | ✅ Yes | Aggregate numbers, no review text |
| Code to reproduce everything | ✅ Yes | ETL scripts, model code, evaluation code |

## Public Demo Limitation

Any public demo of this project:
- Must use the synthetic sample data OR a category subset loaded by the end user from the official source
- Must not display full review text scraped en masse
- Must credit the data source

## Attribution

> He, Ruining, et al. "Ups and Downs: Modeling the Visual Evolution of Fashion Trends with One-Class Collaborative Filtering." WWW, 2016.
> 
> Hou, Yupeng et al. "Bridging Language and Items for Retrieval and Recommendation." ArXiv, 2024.

If you use this data in academic work, please cite the original McAuley Lab papers.
