"""Brand Search Lambda — AI-powered semantic creator search for brands.

Supports two AI providers (controlled by AI_PROVIDER env var):
  - "bedrock" : Amazon Bedrock Nova Lite (default, for production on AWS)
  - "groq"    : Groq inference API (for testing / fallback)
"""

import os
import json
import boto3
import requests as http_requests
from shared.db import get_db_connection
from shared.auth import require_brand

# --- Provider config ---
AI_PROVIDER = os.environ.get("AI_PROVIDER", "bedrock")  # "bedrock" or "groq"

# Bedrock config
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")

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
  "energy": "low, medium, or high" or null,
  "aesthetic": "minimal, vibrant, dark/moody, pastel, natural, luxury" or null,
  "topics": ["topic1", "topic2"] or [],
  "min_followers": number or null,
  "max_followers": number or null,
  "content_type": "reel, story, or post" or null
}

Rules:
- Match niche to the closest option from the list. "beauty" -> "Beauty/Cosmetics", "fitness" -> "Fitness/Health", etc.
- Extract city names as-is (e.g., "noida", "mumbai", "delhi")
- "chaotic" / "energetic" / "hype" -> energy: "high"
- "calm" / "chill" / "soothing" -> energy: "low"
- "aesthetic" / "clean" / "minimal" -> aesthetic: "minimal"
- "bold" / "colorful" / "vibrant" -> aesthetic: "vibrant"
- Extract any specific topics mentioned (e.g., "skincare", "tech reviews", "street food")
- "micro" influencer -> min_followers: 10000, max_followers: 50000
- "nano" influencer -> min_followers: 1000, max_followers: 10000
- Return ONLY valid JSON, no markdown, no explanation.

Query: """


def _parse_query_with_bedrock(query):
    """Use Amazon Bedrock Nova Lite to parse a natural language query."""
    try:
        bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

        guardrail_kwargs = {}
        guardrail_id = os.environ.get("GUARDRAIL_ID")
        guardrail_version = os.environ.get("GUARDRAIL_VERSION", "DRAFT")
        if guardrail_id:
            guardrail_kwargs["guardrailConfig"] = {
                "guardrailIdentifier": guardrail_id,
                "guardrailVersion": guardrail_version,
            }

        response = bedrock.converse(
            modelId=BEDROCK_MODEL_ID,
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
        return _extract_json(raw_text)

    except Exception as e:
        print(f"Bedrock parse error: {e}")
        return _basic_parse(query)


def _parse_query_with_groq(query):
    """Use Groq inference API to parse a natural language query."""
    try:
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
            print(f"Groq API error: {resp.status_code} {resp.text[:500]}")
            return _basic_parse(query)

        raw_text = resp.json()["choices"][0]["message"]["content"]
        return _extract_json(raw_text)

    except Exception as e:
        print(f"Groq parse error: {e}")
        return _basic_parse(query)


def _parse_query(query):
    """Route to the configured AI provider."""
    if AI_PROVIDER == "groq" and GROQ_API_KEY:
        print(f"Using Groq ({GROQ_MODEL}) for query parsing")
        return _parse_query_with_groq(query)
    else:
        print(f"Using Bedrock ({BEDROCK_MODEL_ID}) for query parsing")
        return _parse_query_with_bedrock(query)


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
        "fashion": "Fashion", "style": "Fashion",
        "fitness": "Fitness/Health", "health": "Fitness/Health", "gym": "Fitness/Health",
        "food": "Food", "cooking": "Food", "recipe": "Food",
        "tech": "Tech", "gadget": "Tech",
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

    if any(w in q for w in ["chaotic", "energetic", "hype", "high energy"]):
        result["energy"] = "high"
    elif any(w in q for w in ["calm", "chill", "soothing", "low energy"]):
        result["energy"] = "low"

    return result


def _build_search_query(parsed):
    """Build a dynamic SQL query from parsed search fields."""
    conditions = []
    params = []

    if parsed.get("niche"):
        conditions.append("c.niche ILIKE %s")
        params.append(f"%{parsed['niche']}%")

    if parsed.get("city"):
        conditions.append("c.city ILIKE %s")
        params.append(f"%{parsed['city']}%")

    if parsed.get("energy"):
        conditions.append("c.style_profile->>'dominant_energy' ILIKE %s")
        params.append(f"%{parsed['energy']}%")

    if parsed.get("aesthetic"):
        conditions.append("c.style_profile->>'dominant_aesthetic' ILIKE %s")
        params.append(f"%{parsed['aesthetic']}%")

    if parsed.get("min_followers"):
        conditions.append("c.followers_count >= %s")
        params.append(parsed["min_followers"])

    if parsed.get("max_followers"):
        conditions.append("c.followers_count <= %s")
        params.append(parsed["max_followers"])

    if parsed.get("topics"):
        topic_conditions = []
        for topic in parsed["topics"][:5]:
            topic_conditions.append("c.style_profile->'topics' @> %s::jsonb")
            params.append(json.dumps([topic]))
        if topic_conditions:
            conditions.append(f"({' OR '.join(topic_conditions)})")

    where_clause = " AND ".join(conditions) if conditions else "TRUE"

    sql = f"""
        SELECT c.id, c.username, c.display_name, c.bio, c.niche, c.city,
               c.followers_count, c.media_count, c.profile_picture_url,
               c.style_profile,
               r.reel_rate, r.story_rate, r.post_rate, r.accepts_barter
        FROM creators c
        LEFT JOIN rate_cards r ON r.creator_id = c.id
        WHERE {where_clause}
        ORDER BY c.followers_count DESC
        LIMIT 20
    """

    return sql, params


def handler(event, context):
    """POST /brand/search — semantic creator search for brands."""
    try:
        user = require_brand(event)

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

        sql, params = _build_search_query(parsed)
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall()

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
            }),
        }

    except ValueError as ve:
        status = 401 if "Unauthorized" in str(ve) else 403
        return {
            "statusCode": status,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(ve)}),
        }
    except Exception as e:
        print(f"Error in brand_search: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "Internal server error"}),
        }
