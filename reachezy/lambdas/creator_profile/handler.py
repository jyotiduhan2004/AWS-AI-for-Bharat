import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
from shared.db import get_db_connection
from shared.models import NICHES


def _get_cognito_sub(event):
    """Extract cognito_sub from API Gateway JWT authorizer claims."""
    try:
        return event["requestContext"]["authorizer"]["claims"]["sub"]
    except (KeyError, TypeError):
        pass
    try:
        return event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]
    except (KeyError, TypeError):
        pass
    # Fallback for direct invocation / testing
    params = event.get("queryStringParameters") or {}
    return params.get("cognito_sub")


def _get_creator(cognito_sub):
    """Fetch creator profile by cognito_sub."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT creator_id, cognito_sub, ig_user_id, ig_username, full_name,
               bio, followers_count, media_count, profile_pic_url,
               niche, niche_is_custom, city, style_profile, created_at, updated_at
        FROM creators
        WHERE cognito_sub = %s
        """,
        (cognito_sub,),
    )
    row = cur.fetchone()
    if not row:
        return None

    return {
        "creator_id": str(row[0]),
        "cognito_sub": row[1],
        "ig_user_id": row[2],
        "ig_username": row[3],
        "full_name": row[4],
        "bio": row[5],
        "followers_count": row[6],
        "media_count": row[7],
        "profile_pic_url": row[8],
        "niche": row[9],
        "niche_is_custom": row[10],
        "city": row[11],
        "style_profile": row[12],
        "created_at": row[13].isoformat() if row[13] else None,
        "updated_at": row[14].isoformat() if row[14] else None,
    }


def _update_creator(cognito_sub, niche, city):
    """Update niche and city on the creators table."""
    niche_is_custom = niche not in NICHES

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE creators
        SET niche = %s, niche_is_custom = %s, city = %s, updated_at = NOW()
        WHERE cognito_sub = %s
        RETURNING creator_id
        """,
        (niche, niche_is_custom, city, cognito_sub),
    )
    result = cur.fetchone()
    conn.commit()
    return result is not None


def handler(event, context):
    """GET: fetch creator profile. PUT: update niche and city."""
    try:
        http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "GET")
        cognito_sub = _get_cognito_sub(event)

        if not cognito_sub:
            return {
                "statusCode": 401,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json",
                },
                "body": json.dumps({"error": "Unauthorized: cognito_sub not found in claims"}),
            }

        if http_method == "GET":
            creator = _get_creator(cognito_sub)
            if not creator:
                return {
                    "statusCode": 404,
                    "headers": {
                        "Access-Control-Allow-Origin": "*",
                        "Content-Type": "application/json",
                    },
                    "body": json.dumps({"error": "Creator not found"}),
                }

            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json",
                },
                "body": json.dumps(creator),
            }

        elif http_method == "PUT":
            body = json.loads(event["body"]) if isinstance(event.get("body"), str) else event.get("body", {})

            niche = body.get("niche")
            city = body.get("city")

            if not niche:
                return {
                    "statusCode": 400,
                    "headers": {
                        "Access-Control-Allow-Origin": "*",
                        "Content-Type": "application/json",
                    },
                    "body": json.dumps({"error": "niche is required"}),
                }

            updated = _update_creator(cognito_sub, niche, city)
            if not updated:
                return {
                    "statusCode": 404,
                    "headers": {
                        "Access-Control-Allow-Origin": "*",
                        "Content-Type": "application/json",
                    },
                    "body": json.dumps({"error": "Creator not found"}),
                }

            # Return the updated profile
            creator = _get_creator(cognito_sub)
            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json",
                },
                "body": json.dumps(creator),
            }

        else:
            return {
                "statusCode": 405,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json",
                },
                "body": json.dumps({"error": f"Method {http_method} not allowed"}),
            }

    except Exception as e:
        print(f"Error in creator_profile: {e}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            "body": json.dumps({"error": "Internal server error"}),
        }
