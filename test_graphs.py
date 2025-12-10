import urllib.request
import urllib.parse
import json

# GraphDB SPARQL endpoint
graphdb_url = "http://localhost:7200/repositories/infections"

# Query to list all named graphs
sparql_query = """
SELECT DISTINCT ?g WHERE {
  GRAPH ?g { ?s ?p ?o }
}
"""

# Prepare request
params = urllib.parse.urlencode({'query': sparql_query})
headers = {'Accept': 'application/sparql-results+json'}

try:
    req = urllib.request.Request(f"{graphdb_url}?{params}", headers=headers)
    response = urllib.request.urlopen(req)
    data = json.load(response)

    print("GraphDB에 로드된 그래프 목록:\n")
    graphs = data.get("results", {}).get("bindings", [])

    if graphs:
        for g in graphs:
            graph_uri = g.get("g", {}).get("value", "")
            print(f"  - {graph_uri}")
    else:
        print("  (named graph 없음 - 모두 default graph에 있음)")

except Exception as e:
    print(f"에러: {e}")
