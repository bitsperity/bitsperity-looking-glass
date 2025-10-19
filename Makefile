PY=python3
PIP=pip3

.PHONY: install api ingest

install:
	$(PIP) install -r requirements.txt

api:
	uvicorn apps.satbase_api.main:app --host 0.0.0.0 --port 8080 --reload

ingest:
	$(PY) -m libs.satbase_core.ingest.run_daily

