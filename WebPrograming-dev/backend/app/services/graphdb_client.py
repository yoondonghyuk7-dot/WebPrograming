from __future__ import annotations

from typing import Any, Dict, Optional

import httpx


class GraphDBClient:
    """
    Thin wrapper around the GraphDB SPARQL HTTP endpoint.
    Provides a single `query` method that can be expanded with prepared queries.
    """

    def __init__(self, endpoint: str, username: Optional[str] = None, password: Optional[str] = None):
        self._endpoint = endpoint.rstrip("/")
        self._auth = (username, password) if username and password else None
        self._client = httpx.AsyncClient(timeout=30.0)

    async def query(self, sparql: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute a SPARQL query and return parsed JSON results.
        `variables` is merged into the POST body to allow bindings.
        """
        payload: Dict[str, Any] = {"query": sparql}
        if variables:
            payload.update(variables)

        response = await self._client.post(
            self._endpoint,
            data=payload,
            headers={"Accept": "application/sparql-results+json"},
            auth=self._auth,
        )
        response.raise_for_status()
        return response.json()

    async def close(self) -> None:
        await self._client.aclose()
