import os
import json
import base64
import re
import boto3
from shared.db import get_db_connection

BEDROCK_MODEL_ID = "us.amazon.nova-lite-v1:0"

ANALYSIS_PROMPT = """You are an expert content analyst for social media creators. Analyze these 4 frames extracted from a single video (taken at 0%, 25%, 50%, and 75% through the video).

Provide your analysis as a JSON object with exactly these fields:

{
  "energy_level": "low" | "medium" | "high",
  "aesthetic": "minimal" | "vibrant" | "dark/moody" | "pastel" | "natural" | "luxury" | "streetwear" | "corporate",
  "setting": "indoor" | "outdoor" | "studio" | "mixed",
  "production_quality": "low" | "medium" | "high" | "professional",
  "content_type": "reel" | "story" | "post",
  "topics": ["topic1", "topic2", ...],
  "dominant_colors": ["color1", "color2", "color3"],
  "text_on_screen": true | false,
  "face_visible": true | false,
  "summary": "A 1-2 sentence summary of the video content and style."
}

Rules:
- energy_level: Based on movement, cuts, transitions, and overall pace.
- aesthetic: The dominant visual style across all frames.
- setting: Where the content was filmed.
- production_quality: Based on lighting, framing, and overall polish.
- content_type: Best guess based on aspect ratio and style — "reel" for vertical short-form, "story" for ephemeral-looking, "post" for polished feed content.
- topics: 2-5 relevant topic tags (e.g., "skincare", "travel", "cooking", "fashion haul").
- dominant_colors: Top 3 colors visible across the frames.
- text_on_screen: Whether any text overlays or captions are visible.
- face_visible: Whether a human face is clearly visible in any frame.
- summary: Brief, descriptive summary of the content and creator's style.

Return ONLY the JSON object. No additional text, no markdown formatting, no code fences."""


def _clean_json_response(text):
    """Strip markdown code fences and extra whitespace from model response."""
    text = text.strip()
    # Remove ```json ... ``` or ``` ... ```
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def handler(event, context):
    """Analyze video frames using Claude 3.5 Sonnet via Bedrock.

    Receives:
        { video_id, creator_id, frame_keys, duration_seconds }

    Returns:
        { video_id, creator_id, analysis: {...} }
    """
    video_id = event["video_id"]
    creator_id = event["creator_id"]
    frame_keys = event["frame_keys"]
    duration_seconds = event.get("duration_seconds")

    frames_bucket = os.environ["FRAMES_BUCKET"]
    s3 = boto3.client("s3")
    bedrock = boto3.client("bedrock-runtime")

    # Download and base64 encode all frames
    image_content = []
    for i, frame_key in enumerate(frame_keys):
        response = s3.get_object(Bucket=frames_bucket, Key=frame_key)
        frame_bytes = response["Body"].read()
        b64_data = base64.b64encode(frame_bytes).decode("utf-8")

        image_content.append({
            "type": "text",
            "text": f"Frame {i + 1} (at {int(i * 25)}% of video):",
        })
        image_content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": b64_data,
            },
        })

    # Add the analysis prompt after all images
    image_content.append({
        "type": "text",
        "text": ANALYSIS_PROMPT,
    })

    # Call Bedrock with Amazon Nova Lite
    request_body = json.dumps({
        "messages": [
            {
                "role": "user",
                "content": image_content,
            }
        ],
        "inferenceConfig": {
            "maxTokens": 1024,
        },
    })

    bedrock_response = bedrock.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=request_body,
    )

    response_body = json.loads(bedrock_response["body"].read())
    raw_text = response_body["output"]["message"]["content"][0]["text"]

    # Parse JSON response with retry/fallback
    cleaned_text = _clean_json_response(raw_text)
    analysis = None

    try:
        analysis = json.loads(cleaned_text)
    except json.JSONDecodeError:
        # Retry: attempt to extract JSON from the raw text
        json_match = re.search(r"\{[\s\S]*\}", raw_text)
        if json_match:
            try:
                analysis = json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

    if analysis is None:
        # Fallback: create a default analysis
        analysis = {
            "energy_level": "medium",
            "aesthetic": "natural",
            "setting": "mixed",
            "production_quality": "medium",
            "content_type": "reel",
            "topics": [],
            "dominant_colors": [],
            "text_on_screen": False,
            "face_visible": False,
            "summary": f"Analysis could not be parsed. Raw response: {raw_text[:200]}",
        }

    # Insert into video_analyses table
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO video_analyses (
            video_id, creator_id, energy_level, aesthetic, setting,
            production_quality, content_type, topics, dominant_colors,
            has_text_overlay, face_visible, summary
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (video_id) DO UPDATE SET
            energy_level = EXCLUDED.energy_level,
            aesthetic = EXCLUDED.aesthetic,
            setting = EXCLUDED.setting,
            production_quality = EXCLUDED.production_quality,
            content_type = EXCLUDED.content_type,
            topics = EXCLUDED.topics,
            dominant_colors = EXCLUDED.dominant_colors,
            has_text_overlay = EXCLUDED.has_text_overlay,
            face_visible = EXCLUDED.face_visible,
            summary = EXCLUDED.summary,
            analyzed_at = NOW()
        """,
        (
            video_id,
            creator_id,
            analysis.get("energy_level", "medium"),
            analysis.get("aesthetic", "natural"),
            analysis.get("setting", "mixed"),
            analysis.get("production_quality", "medium"),
            analysis.get("content_type", "reel"),
            json.dumps(analysis.get("topics", [])),
            json.dumps(analysis.get("dominant_colors", [])),
            analysis.get("text_on_screen", False),
            analysis.get("face_visible", False),
            analysis.get("summary", ""),
        ),
    )
    conn.commit()

    return {
        "video_id": video_id,
        "creator_id": creator_id,
        "analysis": analysis,
    }
