# Backend API (FastAPI + GraphDB)

This folder contains a new backend service that will power the existing frontend. It is a FastAPI app prepared to call a GraphDB SPARQL endpoint and expose REST endpoints for the frontend pages.

## Folder layout
- `backend/`
  - `app/`
    - `main.py` — FastAPI entrypoint.
    - `core/config.py` — settings and environment loading.
    - `services/graphdb_client.py` — shared GraphDB HTTP client.
    - `api/routes/` — route modules:
      - `diseases.py` → `GET /api/diseases`
      - `search.py` → `GET /api/search/symptoms`
      - `stats.py` → `GET /api/stats/incidence`
      - `hospitals.py` → `GET /api/hospitals`
  - `.env.example` — sample environment values.
  - `requirements.txt` — Python dependencies.

## Running locally
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate          # Windows
pip install -r requirements.txt

# copy .env.example to .env and fill values
uvicorn app.main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`. Frontend can call it under `/api/...` as defined in each router.
