from __future__ import annotations

from typing import Any, Dict, Optional

import httpx


class GraphDBClient:
    """
    Thin wrapper around the GraphDB SPARQL HTTP endpoint.
    Provides a single `query` method that can be expanded with prepared queries.
    """

    def __init__(self, endpoint: str, username: Optional[str] = None, password: Optional[str] = None):
        """
        endpoint: full SPARQL endpoint URL including /repositories/{repo}
        """
        self._endpoint = endpoint.rstrip("/")
        self._auth = (username, password) if username and password else None
        self._client = httpx.AsyncClient(timeout=30.0)

    async def query(self, sparql: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute a SPARQL query and return parsed JSON results.
        Raise a descriptive error if GraphDB responds with non-200.
        """
        payload: Dict[str, Any] = {"query": sparql}
        if variables:
            payload.update(variables)

        resp = await self._client.post(
            self._endpoint,
            data=payload,
            headers={"Accept": "application/sparql-results+json"},
            auth=self._auth,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"GraphDB query failed: {resp.status_code} {resp.text}")
        return resp.json()

    async def close(self) -> None:
        await self._client.aclose()
