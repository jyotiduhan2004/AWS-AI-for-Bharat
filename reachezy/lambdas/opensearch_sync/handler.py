"""OpenSearch Sync Lambda — indexes creator profiles + embeddings into OpenSearch Serverless.

Triggered after profile_aggregator completes. Indexes the creator's style_profile
and embedding vector into OpenSearch for k-NN similarity search.

Feature-flagged: only runs if OPENSEARCH_ENDPOINT is set.
"""

import os
import json
import boto3
import requests as http_requests
from requests_aws4auth import AWS4Auth
from shared.db import get_db_connection

OPENSEARCH_ENDPOINT = os.environ.get("OPENSEARCH_ENDPOINT", "")
OPENSEARCH_INDEX = os.environ.get("OPENSEARCH_INDEX", "creator-profiles")
REGION = os.environ.get("AWS_REGION", "us-east-1")


def _get_auth():
    """Get AWS4Auth for OpenSearch Serverless."""
    credentials = boto3.Session().get_credentials().get_frozen_credentials()
    return AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        REGION,
        "aoss",
        session_token=credentials.token,
    )


def _ensure_index(auth):
    """Create the k-NN index if it doesn't exist."""
    url = f"{OPENSEARCH_ENDPOINT}/{OPENSEARCH_INDEX}"
    resp = http_requests.head(url, auth=auth, timeout=10)
    if resp.status_code == 200:
        return

    index_body = {
        "settings": {
            "index": {
                "knn": True,
                "knn.algo_param.ef_search": 100,
            }
        },
        "mappings": {
            "properties": {
                "creator_id": {"type": "keyword"},
                "username": {"type": "keyword"},
                "display_name": {"type": "text"},
                "niche": {"type": "keyword"},
                "city": {"type": "keyword"},
                "followers_count": {"type": "integer"},
                "dominant_energy": {"type": "keyword"},
                "dominant_aesthetic": {"type": "keyword"},
                "primary_content_type": {"type": "keyword"},
                "topics": {"type": "keyword"},
                "style_summary": {"type": "text"},
                "consistency_score": {"type": "float"},
                "embedding": {
                    "type": "knn_vector",
                    "dimension": 1024,
                    "method": {
                        "name": "hnsw",
                        "space_type": "cosinesimil",
                        "engine": "nmslib",
                    },
                },
            }
        },
    }

    resp = http_requests.put(
        url,
        auth=auth,
        json=index_body,
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    print(f"Index creation response: {resp.status_code} {resp.text[:200]}")


def handler(event, context):
    """Index a creator's profile + embedding into OpenSearch.

    Receives:
        { creator_id: str }

    Silently skips if OPENSEARCH_ENDPOINT is not configured.
    """
    if not OPENSEARCH_ENDPOINT:
        print("OPENSEARCH_ENDPOINT not set, skipping sync")
        return {"status": "skipped", "reason": "opensearch not configured"}

    creator_id = event.get("creator_id")
    if not creator_id:
        return {"status": "error", "reason": "creator_id required"}

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Fetch creator data + embedding
        cur.execute(
            """
            SELECT c.id, c.username, c.display_name, c.niche, c.city,
                   c.followers_count, c.style_profile, c.embedding
            FROM creators c
            WHERE c.id = %s
            """,
            (creator_id,),
        )
        row = cur.fetchone()
        if not row:
            return {"status": "error", "reason": f"creator {creator_id} not found"}

        style = row[6] or {}
        if isinstance(style, str):
            style = json.loads(style)

        embedding = row[7]
        if embedding is None:
            print(f"No embedding for creator {creator_id}, skipping OpenSearch sync")
            return {"status": "skipped", "reason": "no embedding"}

        # Convert pgvector list to Python list if needed
        if isinstance(embedding, str):
            embedding = json.loads(embedding)
        embedding = list(embedding)

        auth = _get_auth()
        _ensure_index(auth)

        # Index the document
        doc = {
            "creator_id": str(row[0]),
            "username": row[1],
            "display_name": row[2],
            "niche": row[3],
            "city": row[4],
            "followers_count": row[5],
            "dominant_energy": style.get("dominant_energy"),
            "dominant_aesthetic": style.get("dominant_aesthetic"),
            "primary_content_type": style.get("primary_content_type"),
            "topics": style.get("topics", []),
            "style_summary": style.get("style_summary", ""),
            "consistency_score": style.get("consistency_score", 0),
            "embedding": embedding,
        }

        url = f"{OPENSEARCH_ENDPOINT}/{OPENSEARCH_INDEX}/_doc/{creator_id}"
        resp = http_requests.put(
            url,
            auth=auth,
            json=doc,
            headers={"Content-Type": "application/json"},
            timeout=15,
        )

        print(f"Indexed creator {creator_id}: {resp.status_code}")
        return {"status": "indexed", "creator_id": creator_id}

    except Exception as e:
        # Fail silently — OpenSearch is experimental, don't break the pipeline
        print(f"OpenSearch sync error for creator {creator_id}: {e}")
        return {"status": "error", "reason": str(e)}
