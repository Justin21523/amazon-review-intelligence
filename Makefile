.PHONY: sample-data etl index evaluate api app test docker-up docker-down lint format install clean

PYTHON := python
UV := uv
# Force HuggingFace to use Linux path (avoids NTFS lock issues on WSL)
export HF_HOME := $(HOME)/.cache/huggingface

install:
	$(UV) sync --extra dev

sample-data:
	$(PYTHON) -m src.ingestion.sample_generator

etl:
	$(PYTHON) -m src.ingestion.pipeline

index:
	$(PYTHON) -m src.features.build_index

evaluate:
	$(PYTHON) -m src.evaluation.run_all

api:
	uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

app:
	streamlit run src/app/main.py --server.port 8501

test:
	pytest tests/ -v

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

lint:
	ruff check src/ tests/

format:
	ruff format src/ tests/

clean:
	rm -rf data/amazon_reviews.duckdb data/bm25_index.joblib data/sample/*.jsonl
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; true
	find . -type f -name "*.pyc" -delete 2>/dev/null; true

all: sample-data etl index
