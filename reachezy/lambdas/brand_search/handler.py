"""Brand Search Lambda — AI-powered semantic creator search for brands.

Search flow:
  1. Parse query with AI (Bedrock Nova / Groq / basic_parse)
  2. Embed query with Titan → pgvector cosine similarity against creator embeddings
  3. Apply hard filters (city, follower range)
  4. Fall back to text-based scoring if embedding fails

Fallback chain for parsing: Bedrock (Nova 2 → Nova v1) → Groq → basic_parse
"""

import os
import json
import hashlib
import math
import boto3
import requests as http_requests
from shared.db import get_db_connection
from shared.auth import get_user_from_token
from shared.bedrock_client import get_bedrock_client

# --- Provider config ---
AI_PROVIDER = os.environ.get("AI_PROVIDER", "bedrock")  # "bedrock" or "groq"

# --- OpenSearch config (experimental, feature-flagged) ---
OPENSEARCH_ENDPOINT = os.environ.get("OPENSEARCH_ENDPOINT", "")
OPENSEARCH_INDEX = os.environ.get("OPENSEARCH_INDEX", "creator-profiles")
OPENSEARCH_ENABLED = os.environ.get("OPENSEARCH_ENABLED", "false").lower() == "true"

# Bedrock config — Nova 2 Lite primary, Nova Lite v1 fallback
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "us.amazon.nova-2-lite-v1:0")
BEDROCK_MODEL_FALLBACKS = [
    BEDROCK_MODEL_ID,
    "amazon.nova-lite-v1:0",  # v1 fallback
]

# Groq config (OpenAI-compatible API)
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
}

PARSE_PROMPT = """You are a search query parser for an influencer discovery platform.
Given a natural language search query from a brand looking for creators/influencers,
extract structured fields as a JSON object.

Return exactly this format:
{
  "niche": "one of: Fashion, Beauty/Cosmetics, Fitness/Health, Food, Tech, Travel, Education, Comedy/Entertainment, Lifestyle, Parenting" or null,
  "city": "city name" or null,
  "energy": "calm, moderate, high, chaotic, or intense" or null,
  "aesthetic": "minimal, vibrant, dark, pastel, natural, luxury, corporate, or streetwear" or null,
  "topics": ["topic1", "topic2"] or [],
  "min_followers": number or null,
  "max_followers": number or null,
  "content_type": "reel, story, or post" or null
}

Rules:
- Match niche to the closest option from the list. "beauty" -> "Beauty/Cosmetics", "fitness" -> "Fitness/Health", etc.
- Extract city names as-is (e.g., "noida", "mumbai", "delhi")
- "chaotic" / "energetic" / "hype" -> energy: "chaotic"
- "high energy" / "fast-paced" -> energy: "high"
- "calm" / "chill" / "soothing" -> energy: "calm"
- "moderate" / "balanced" -> energy: "moderate"
- "intense" / "dramatic" -> energy: "intense"
- "aesthetic" / "clean" / "minimal" -> aesthetic: "minimal"
- "bold" / "colorful" / "vibrant" -> aesthetic: "vibrant"
- "moody" / "dark" / "cinematic" -> aesthetic: "dark"
- Extract any specific topics mentioned (e.g., "skincare", "tech reviews", "street food")
- "micro" influencer -> min_followers: 10000, max_followers: 50000
- "nano" influencer -> min_followers: 1000, max_followers: 10000
- Return ONLY valid JSON, no markdown, no explanation.

Query: """


def _parse_query_with_bedrock(query):
    """Use Amazon Bedrock with model fallback chain (Nova 2 → Nova v1)."""
    bedrock = get_bedrock_client(region=BEDROCK_REGION)

    guardrail_kwargs = {}
    guardrail_id = os.environ.get("GUARDRAIL_ID")
    guardrail_version = os.environ.get("GUARDRAIL_VERSION", "DRAFT")
    if guardrail_id:
        guardrail_kwargs["guardrailConfig"] = {
            "guardrailIdentifier": guardrail_id,
            "guardrailVersion": guardrail_version,
        }

    last_error = None
    for model_id in BEDROCK_MODEL_FALLBACKS:
        try:
            print(f"Trying Bedrock model: {model_id}")
            response = bedrock.converse(
                modelId=model_id,
                messages=[{
                    "role": "user",
                    "content": [{"text": PARSE_PROMPT + query}],
                }],
                inferenceConfig={
                    "maxTokens": 512,
                    "temperature": 0.1,
                },
                **guardrail_kwargs,
            )

            raw_text = response["output"]["message"]["content"][0]["text"]
            result = _extract_json(raw_text)
            print(f"Success with Bedrock model {model_id}")
            return result

        except Exception as e:
            last_error = e
            print(f"Bedrock model {model_id} failed: {e}")
            continue

    print(f"All Bedrock models failed, last error: {last_error}")
    raise last_error


def _parse_query_with_groq(query):
    """Use Groq inference API to parse a natural language query."""
    resp = http_requests.post(
        GROQ_ENDPOINT,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": GROQ_MODEL,
            "max_tokens": 512,
            "temperature": 0.1,
            "messages": [{"role": "user", "content": PARSE_PROMPT + query}],
        },
        timeout=30,
    )

    if not resp.ok:
        raise RuntimeError(f"Groq API error: {resp.status_code} {resp.text[:500]}")

    raw_text = resp.json()["choices"][0]["message"]["content"]
    return _extract_json(raw_text)


def _parse_query(query):
    """Route to AI provider with automatic fallback chain:
    Bedrock (Nova 2 → v1) → Groq → basic_parse
    """
    # Try Bedrock first (if configured as primary)
    if AI_PROVIDER != "groq":
        try:
            print(f"Attempting Bedrock for query parsing")
            return _parse_query_with_bedrock(query)
        except Exception as e:
            print(f"Bedrock failed entirely: {e}, trying Groq fallback")

    # Try Groq as fallback (or primary if AI_PROVIDER=groq)
    if GROQ_API_KEY:
        try:
            print(f"Attempting Groq ({GROQ_MODEL}) for query parsing")
            return _parse_query_with_groq(query)
        except Exception as e:
            print(f"Groq failed: {e}, falling back to basic_parse")

    # Last resort: keyword-based parsing
    print("All AI providers failed, using basic_parse")
    return _basic_parse(query)


def _extract_json(text):
    """Extract JSON from model response, stripping markdown fences if present."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    return json.loads(text)


def _basic_parse(query):
    """Fallback keyword-based parser when AI providers are unavailable."""
    q = query.lower()
    result = {"niche": None, "city": None, "energy": None, "aesthetic": None,
              "topics": [], "min_followers": None, "max_followers": None, "content_type": None}

    niche_map = {
        "beauty": "Beauty/Cosmetics", "cosmetic": "Beauty/Cosmetics", "skincare": "Beauty/Cosmetics",
        "skin care": "Beauty/Cosmetics", "makeup": "Beauty/Cosmetics",
        "fashion": "Fashion", "style": "Fashion",
        "fitness": "Fitness/Health", "health": "Fitness/Health", "gym": "Fitness/Health",
        "food": "Food", "cooking": "Food", "recipe": "Food",
        "tech": "Tech", "gadget": "Tech", "technology": "Tech",
        "travel": "Travel",
        "education": "Education", "study": "Education",
        "comedy": "Comedy/Entertainment", "funny": "Comedy/Entertainment",
        "lifestyle": "Lifestyle",
        "parenting": "Parenting", "mom": "Parenting",
    }
    for keyword, niche in niche_map.items():
        if keyword in q:
            result["niche"] = niche
            break

    cities = ["mumbai", "delhi", "bangalore", "bengaluru", "chennai", "kolkata",
              "hyderabad", "pune", "ahmedabad", "jaipur", "noida", "gurugram",
              "gurgaon", "lucknow", "chandigarh", "indore", "kochi", "surat"]
    for city in cities:
        if city in q:
            result["city"] = city.title()
            break

    if any(w in q for w in ["chaotic", "energetic", "hype"]):
        result["energy"] = "chaotic"
    elif any(w in q for w in ["high energy", "fast-paced", "fast paced"]):
        result["energy"] = "high"
    elif any(w in q for w in ["intense", "dramatic"]):
        result["energy"] = "intense"
    elif any(w in q for w in ["calm", "chill", "soothing", "low energy"]):
        result["energy"] = "calm"
    elif any(w in q for w in ["moderate", "balanced"]):
        result["energy"] = "moderate"

    return result


def _build_search_embedding_text(parsed, raw_query):
    """Build text for embedding in the same format as embedding_generator.

    This mirrors _build_embedding_text() in embedding_generator/handler.py
    so the query embedding lives in the same vector space as creator embeddings.
    """
    parts = []
    if parsed.get("energy"):
        parts.append(f"Energy: {parsed['energy']}")
    if parsed.get("aesthetic"):
        parts.append(f"Aesthetic: {parsed['aesthetic']}")
    if parsed.get("content_type"):
        parts.append(f"Content type: {parsed['content_type']}")
    if parsed.get("niche"):
        parts.append(f"Content type: {parsed['niche']}")
    if parsed.get("topics"):
        parts.append(f"Topics: {', '.join(parsed['topics'])}")
    # Include raw query for additional semantic context
    parts.append(f"Summary: {raw_query}")
    return ". ".join(parts)


def _generate_query_embedding(text):
    """Generate a Titan embedding for the search query.

    Uses same model + dimensions as embedding_generator (Titan V2, 1024d).
    Falls back to hash-based embedding if Titan is unavailable.
    """
    embedding_dim = 1024
    embedding_model = "amazon.titan-embed-text-v2:0"

    try:
        bedrock = get_bedrock_client(region=BEDROCK_REGION)
        response = bedrock.invoke_model(
            modelId=embedding_model,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "inputText": text,
                "dimensions": embedding_dim,
                "normalize": True,
            }),
        )
        result = json.loads(response["body"].read())
        print("Query embedding generated via Titan")
        return result["embedding"]
    except Exception as e:
        print(f"Titan embedding failed ({e}), using hash-based fallback")
        return _hash_embedding(text, embedding_dim)


def _hash_embedding(text, dim=1024):
    """Deterministic hash-based embedding fallback (mirrors embedding_generator)."""
    values = []
    seed = text.encode("utf-8")
    while len(values) < dim:
        h = hashlib.sha512(seed).digest()
        for j in range(0, 64, 4):
            if len(values) >= dim:
                break
            val = int.from_bytes(h[j:j + 4], "big")
            values.append((val / 2147483648.0) - 1.0)
        seed = h
    norm = math.sqrt(sum(v * v for v in values))
    if norm > 0:
        values = [v / norm for v in values]
    return values


def _build_semantic_query(parsed, query_embedding):
    """Build pgvector cosine similarity search query.

    Uses the <=> operator (cosine distance) against creator aggregate embeddings.
    Hard filters (city, followers) are applied as WHERE clauses.
    """
    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"
    params = [embedding_str, embedding_str]  # once for SELECT, once for ORDER BY

    hard_conditions = ["ve.embedding IS NOT NULL"]
    if parsed.get("city"):
        hard_conditions.append("c.city ILIKE %s")
        params.append(f"%{parsed['city']}%")
    if parsed.get("min_followers"):
        hard_conditions.append("c.followers_count >= %s")
        params.append(parsed["min_followers"])
    if parsed.get("max_followers"):
        hard_conditions.append("c.followers_count <= %s")
        params.append(parsed["max_followers"])

    where_clause = " AND ".join(hard_conditions)

    sql = f"""
        SELECT c.id, c.username, c.display_name, c.bio, c.niche, c.city,
               c.followers_count, c.media_count, c.profile_picture_url,
               c.style_profile,
               r.reel_rate, r.story_rate, r.post_rate, r.accepts_barter,
               1 - (ve.embedding <=> %s::vector) AS similarity
        FROM creators c
        LEFT JOIN rate_cards r ON r.creator_id = c.id
        JOIN video_embeddings ve ON ve.creator_id = c.id
             AND ve.is_creator_aggregate = TRUE
        WHERE {where_clause}
        ORDER BY ve.embedding <=> %s::vector ASC
        LIMIT 50
    """
    return sql, params


def _build_text_fallback_query(parsed):
    """Text-based fallback when embedding search is unavailable."""
    conditions = []
    params = []

    if parsed.get("niche"):
        conditions.append("(c.niche ILIKE %s OR COALESCE(c.style_profile::text, '') ILIKE %s OR COALESCE(c.bio, '') ILIKE %s)")
        params.extend([f"%{parsed['niche']}%"] * 3)
    if parsed.get("city"):
        conditions.append("c.city ILIKE %s")
        params.append(f"%{parsed['city']}%")
    if parsed.get("energy"):
        conditions.append("c.style_profile->>'dominant_energy' ILIKE %s")
        params.append(f"%{parsed['energy']}%")
    if parsed.get("aesthetic"):
        conditions.append("c.style_profile->>'dominant_aesthetic' ILIKE %s")
        params.append(f"%{parsed['aesthetic']}%")
    if parsed.get("content_type"):
        conditions.append("c.style_profile->>'primary_content_type' ILIKE %s")
        params.append(f"%{parsed['content_type']}%")
    if parsed.get("min_followers"):
        conditions.append("c.followers_count >= %s")
        params.append(parsed["min_followers"])
    if parsed.get("max_followers"):
        conditions.append("c.followers_count <= %s")
        params.append(parsed["max_followers"])
    if parsed.get("topics"):
        topic_conds = []
        for topic in parsed["topics"][:5]:
            topic_conds.append("c.style_profile->'topics' @> %s::jsonb")
            params.append(json.dumps([topic]))
        if topic_conds:
            conditions.append(f"({' OR '.join(topic_conds)})")

    where_clause = " OR ".join(conditions) if conditions else "TRUE"

    sql = f"""
        SELECT c.id, c.username, c.display_name, c.bio, c.niche, c.city,
               c.followers_count, c.media_count, c.profile_picture_url,
               c.style_profile,
               r.reel_rate, r.story_rate, r.post_rate, r.accepts_barter
        FROM creators c
        LEFT JOIN rate_cards r ON r.creator_id = c.id
        WHERE {where_clause}
        ORDER BY c.followers_count DESC
        LIMIT 50
    """
    return sql, params


def handler(event, context):
    """POST /brand/search — semantic creator search for brands."""
    try:
        # Lenient auth for demo — allow anonymous search if token is invalid
        user = get_user_from_token(event)
        if not user:
            user = {"user_id": "anonymous", "role": "guest"}
            print("Auth failed, allowing anonymous search for demo")

        body = json.loads(event["body"]) if isinstance(event.get("body"), str) else event.get("body", {})
        query = body.get("query", "").strip()

        if not query:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "query is required"}),
            }

        parsed = _parse_query(query)
        print(f"Parsed query: {json.dumps(parsed)}")

        conn = get_db_connection()
        cur = conn.cursor()
        search_method = "text"

        # Try embedding-based semantic search first
        try:
            embedding_text = _build_search_embedding_text(parsed, query)
            query_embedding = _generate_query_embedding(embedding_text)
            sql, params = _build_semantic_query(parsed, query_embedding)
            cur.execute(sql, params)
            rows = cur.fetchall()
            search_method = "embedding"
            print(f"Embedding search returned {len(rows)} results")
        except Exception as e:
            print(f"Embedding search failed ({e}), falling back to text search")
            sql, params = _build_text_fallback_query(parsed)
            cur.execute(sql, params)
            rows = cur.fetchall()
            print(f"Text fallback returned {len(rows)} results")

        creators = []
        for row in rows:
            style = row[9] or {}
            if isinstance(style, str):
                style = json.loads(style)

            creator = {
                "creator_id": str(row[0]),
                "username": row[1],
                "display_name": row[2],
                "bio": row[3],
                "niche": row[4],
                "city": row[5],
                "followers_count": row[6],
                "media_count": row[7],
                "profile_picture_url": row[8],
                "style_profile": style,
                "rates": None,
            }
            if row[10] is not None:
                creator["rates"] = {
                    "reel_rate": row[10],
                    "story_rate": row[11],
                    "post_rate": row[12],
                    "accepts_barter": row[13],
                }
            creators.append(creator)

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "query": query,
                "parsed": parsed,
                "results": creators,
                "count": len(creators),
                "search_method": search_method,
            }),
        }

    except Exception as e:
        print(f"Error in brand_search: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "Internal server error"}),
        }
