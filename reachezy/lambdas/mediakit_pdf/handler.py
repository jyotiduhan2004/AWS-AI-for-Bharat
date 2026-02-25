import os
import json
import boto3
from weasyprint import HTML
from shared.db import get_db_connection
from shared.models import get_follower_bucket

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "template.html")


def _fetch_creator_data(creator_id):
    """Fetch all data needed for the media kit PDF."""
    conn = get_db_connection()
    cur = conn.cursor()

    # Fetch creator + rate card
    cur.execute(
        """
        SELECT c.ig_username, c.full_name, c.bio, c.followers_count,
               c.media_count, c.profile_pic_url, c.niche, c.city,
               c.style_profile,
               rc.reel_rate, rc.story_rate, rc.post_rate, rc.accepts_barter
        FROM creators c
        LEFT JOIN rate_cards rc ON c.creator_id = rc.creator_id
        WHERE c.creator_id = %s
        """,
        (creator_id,),
    )
    row = cur.fetchone()
    if not row:
        return None

    style_profile = row[8]
    if isinstance(style_profile, str):
        style_profile = json.loads(style_profile)
    elif style_profile is None:
        style_profile = {}

    data = {
        "username": row[0] or "",
        "full_name": row[1] or "",
        "bio": row[2] or "",
        "followers_count": _format_number(row[3]),
        "media_count": str(row[4] or 0),
        "profile_pic_url": row[5] or "",
        "niche": row[6] or "Not specified",
        "city": row[7] or "Not specified",
        "energy": style_profile.get("dominant_energy", "N/A"),
        "aesthetic": style_profile.get("dominant_aesthetic", "N/A"),
        "content_format": style_profile.get("dominant_content_type", "N/A"),
        "production": style_profile.get("dominant_production", "N/A"),
        "topics": ", ".join(style_profile.get("all_topics", [])) or "N/A",
        "consistency_score": str(style_profile.get("consistency_score", "N/A")),
        "video_count": str(style_profile.get("video_count", 0)),
        "face_percentage": str(style_profile.get("face_percentage", 0)),
        "reel_rate": _format_currency(row[9]),
        "story_rate": _format_currency(row[10]),
        "post_rate": _format_currency(row[11]),
        "accepts_barter": "Yes" if row[12] else "No",
        "follower_bucket": get_follower_bucket(row[3]),
    }

    return data


def _format_number(n):
    """Format a number for display (e.g., 12500 -> '12.5K')."""
    if n is None:
        return "0"
    if n >= 1000000:
        return f"{n / 1000000:.1f}M"
    if n >= 1000:
        return f"{n / 1000:.1f}K"
    return str(n)


def _format_currency(amount):
    """Format currency for INR display."""
    if amount is None:
        return "Not set"
    amount = float(amount)
    if amount >= 100000:
        return f"Rs. {amount / 100000:.1f}L"
    if amount >= 1000:
        return f"Rs. {amount / 1000:.1f}K"
    return f"Rs. {amount:.0f}"


def _render_template(data):
    """Load template.html and replace {{placeholders}} with data."""
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        html = f.read()

    for key, value in data.items():
        html = html.replace("{{" + key + "}}", str(value))

    return html


def handler(event, context):
    """Generate a media kit PDF.

    POST /creator/mediakit/pdf
    Body: { creator_id } or { html }
    """
    try:
        body = json.loads(event["body"]) if isinstance(event.get("body"), str) else event.get("body", {})

        creator_id = body.get("creator_id")
        raw_html = body.get("html")

        if not creator_id and not raw_html:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
                "body": json.dumps({"error": "creator_id or html is required"}),
            }

        # Generate HTML content
        if raw_html:
            html_content = raw_html
        else:
            data = _fetch_creator_data(creator_id)
            if not data:
                return {
                    "statusCode": 404,
                    "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
                    "body": json.dumps({"error": "Creator not found"}),
                }
            html_content = _render_template(data)

        # Convert HTML to PDF using WeasyPrint
        pdf_bytes = HTML(string=html_content).write_pdf()

        # Upload PDF to MEDIAKITS_BUCKET
        mediakits_bucket = os.environ["MEDIAKITS_BUCKET"]
        s3_key = f"{creator_id}/mediakit.pdf" if creator_id else "temp/mediakit.pdf"

        s3 = boto3.client("s3")
        s3.put_object(
            Bucket=mediakits_bucket,
            Key=s3_key,
            Body=pdf_bytes,
            ContentType="application/pdf",
        )

        # Generate presigned GET URL (1 hour expiry)
        pdf_url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": mediakits_bucket, "Key": s3_key},
            ExpiresIn=3600,
        )

        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"pdf_url": pdf_url}),
        }

    except Exception as e:
        print(f"Error in mediakit_pdf: {e}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": "Internal server error"}),
        }
