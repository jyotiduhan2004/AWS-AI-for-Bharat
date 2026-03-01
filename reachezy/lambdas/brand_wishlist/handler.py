"""Brand Wishlist Lambda — CRUD for brand wishlists (save/unsave creators)."""

import json
from shared.db import get_db_connection
from shared.auth import require_brand

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
}


def _get_wishlist(user_id):
    """List all creators in the brand's wishlist with full profiles."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT c.id, c.username, c.display_name, c.bio, c.niche, c.city,
               c.followers_count, c.media_count, c.profile_picture_url,
               c.style_profile,
               r.reel_rate, r.story_rate, r.post_rate, r.accepts_barter,
               bw.created_at
        FROM brand_wishlists bw
        JOIN creators c ON bw.creator_id = c.id
        LEFT JOIN rate_cards r ON r.creator_id = c.id
        WHERE bw.user_id = %s
        ORDER BY bw.created_at DESC
        """,
        (str(user_id),),
    )
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
            "saved_at": row[14].isoformat() if row[14] else None,
        }
        if row[10] is not None:
            creator["rates"] = {
                "reel_rate": row[10],
                "story_rate": row[11],
                "post_rate": row[12],
                "accepts_barter": row[13],
            }
        creators.append(creator)

    return creators


def _add_to_wishlist(user_id, creator_id):
    """Add a creator to the brand's wishlist."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO brand_wishlists (user_id, creator_id)
        VALUES (%s, %s)
        ON CONFLICT (user_id, creator_id) DO NOTHING
        RETURNING id
        """,
        (str(user_id), str(creator_id)),
    )
    conn.commit()
    result = cur.fetchone()
    return result is not None


def _remove_from_wishlist(user_id, creator_id):
    """Remove a creator from the brand's wishlist."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        DELETE FROM brand_wishlists
        WHERE user_id = %s AND creator_id = %s
        """,
        (str(user_id), str(creator_id)),
    )
    deleted = cur.rowcount > 0
    conn.commit()
    return deleted


def handler(event, context):
    """GET/POST/DELETE /brand/wishlist — manage brand wishlists."""
    try:
        user = require_brand(event)
        user_id = user["user_id"]

        http_method = (
            event.get("httpMethod")
            or event.get("requestContext", {}).get("http", {}).get("method", "GET")
        )

        if http_method == "GET":
            creators = _get_wishlist(user_id)
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"wishlist": creators, "count": len(creators)}),
            }

        elif http_method == "POST":
            body = json.loads(event["body"]) if isinstance(event.get("body"), str) else event.get("body", {})
            creator_id = body.get("creator_id")
            if not creator_id:
                return {
                    "statusCode": 400,
                    "headers": CORS_HEADERS,
                    "body": json.dumps({"error": "creator_id is required"}),
                }
            added = _add_to_wishlist(user_id, creator_id)
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"added": added, "creator_id": creator_id}),
            }

        elif http_method == "DELETE":
            body = json.loads(event["body"]) if isinstance(event.get("body"), str) else event.get("body", {})
            creator_id = body.get("creator_id")
            if not creator_id:
                return {
                    "statusCode": 400,
                    "headers": CORS_HEADERS,
                    "body": json.dumps({"error": "creator_id is required"}),
                }
            removed = _remove_from_wishlist(user_id, creator_id)
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"removed": removed, "creator_id": creator_id}),
            }

        else:
            return {
                "statusCode": 405,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": f"Method {http_method} not allowed"}),
            }

    except ValueError as ve:
        status = 401 if "Unauthorized" in str(ve) else 403
        return {
            "statusCode": status,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(ve)}),
        }
    except Exception as e:
        print(f"Error in brand_wishlist: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "Internal server error"}),
        }
