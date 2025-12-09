from fastapi import FastAPI

from app.api.routes import diseases, hospitals, search, stats
from app.deps import get_graphdb_client

app = FastAPI(
    title="Infection Insights API",
    version="0.1.0",
    description="Backend API for the infection insights frontend, backed by GraphDB.",
)


@app.on_event("shutdown")
async def shutdown_event():
    # Ensure httpx client is closed gracefully
    client = get_graphdb_client()
    await client.close()


# Register routers under /api
app.include_router(diseases.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(hospitals.router, prefix="/api")


@app.get("/health", tags=["internal"])
async def healthcheck():
    return {"status": "ok"}
