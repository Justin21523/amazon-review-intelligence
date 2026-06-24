.PHONY: sample-data etl index evaluate api app frontend-install frontend-dev frontend-build dev test docker-up docker-down lint format install clean

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
	cd frontend && npm run dev

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

dev:
	@echo "Starting FastAPI (port 8001) and Next.js (port 3000)..."
	@HF_HOME=$(HOME)/.cache/huggingface uvicorn src.api.main:app --host 0.0.0.0 --port 8001 &
	@sleep 6 && cd frontend && npm run dev

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
