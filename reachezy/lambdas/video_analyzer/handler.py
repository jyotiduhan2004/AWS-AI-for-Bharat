"""Video Analyzer Lambda — AI-powered video frame analysis.

Supports two AI providers (controlled by AI_PROVIDER env var):
  - "bedrock" : Amazon Bedrock Nova Lite (default, for production on AWS)
  - "groq"    : Groq inference API with Llama 4 Scout vision (for testing / fallback)
"""

import os
import json
import base64
import re
import boto3
import requests as http_requests
from shared.db import get_db_connection

# --- Provider config ---
AI_PROVIDER = os.environ.get("AI_PROVIDER", "bedrock")  # "bedrock" or "groq"

# Bedrock config
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")

# Groq config (OpenAI-compatible API)
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_VISION_MODEL = os.environ.get("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

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
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def _parse_analysis(raw_text):
    """Parse JSON from model response with fallback extraction."""
    cleaned_text = _clean_json_response(raw_text)

    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        json_match = re.search(r"\{[\s\S]*\}", raw_text)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

    return {
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


def _analyze_with_bedrock(frame_data_list, video_id):
    """Analyze frames using Amazon Bedrock Nova Lite Converse API."""
    bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

    content_blocks = []
    for i, frame_bytes in enumerate(frame_data_list):
        content_blocks.append({
            "text": f"Frame {i + 1} (at {int(i * 25)}% of video):"
        })
        content_blocks.append({
            "image": {
                "format": "jpeg",
                "source": {"bytes": frame_bytes},
            }
        })

    content_blocks.append({"text": ANALYSIS_PROMPT})

    guardrail_kwargs = {}
    guardrail_id = os.environ.get("GUARDRAIL_ID")
    guardrail_version = os.environ.get("GUARDRAIL_VERSION", "DRAFT")
    if guardrail_id:
        guardrail_kwargs["guardrailConfig"] = {
            "guardrailIdentifier": guardrail_id,
            "guardrailVersion": guardrail_version,
        }

    print(f"Calling Bedrock Converse API with model {BEDROCK_MODEL_ID} for video {video_id}")
    response = bedrock.converse(
        modelId=BEDROCK_MODEL_ID,
        messages=[{"role": "user", "content": content_blocks}],
        inferenceConfig={"maxTokens": 1024, "temperature": 0.1},
        **guardrail_kwargs,
    )

    raw_text = response["output"]["message"]["content"][0]["text"]
    print(f"Bedrock response length: {len(raw_text)} chars, stop reason: {response.get('stopReason')}")
    return raw_text


def _analyze_with_groq(frame_data_list, video_id):
    """Analyze frames using Groq API with Llama 4 Scout vision model."""
    # Build OpenAI-compatible content blocks with base64 images
    content_blocks = []
    for i, frame_bytes in enumerate(frame_data_list):
        content_blocks.append({
            "type": "text",
            "text": f"Frame {i + 1} (at {int(i * 25)}% of video):",
        })
        b64_data = base64.b64encode(frame_bytes).decode("utf-8")
        content_blocks.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{b64_data}",
            },
        })

    content_blocks.append({"type": "text", "text": ANALYSIS_PROMPT})

    print(f"Calling Groq API with model {GROQ_VISION_MODEL} for video {video_id}")
    resp = http_requests.post(
        GROQ_ENDPOINT,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": GROQ_VISION_MODEL,
            "max_tokens": 1024,
            "temperature": 0.1,
            "messages": [{"role": "user", "content": content_blocks}],
        },
        timeout=60,
    )

    if not resp.ok:
        raise RuntimeError(f"Groq API error: {resp.status_code} {resp.text[:500]}")

    raw_text = resp.json()["choices"][0]["message"]["content"]
    print(f"Groq response length: {len(raw_text)} chars")
    return raw_text


def handler(event, context):
    """Analyze video frames using AI (Bedrock or Groq).

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

    # Download all frames from S3
    frame_data_list = []
    for frame_key in frame_keys:
        response = s3.get_object(Bucket=frames_bucket, Key=frame_key)
        frame_data_list.append(response["Body"].read())

    # Route to the configured AI provider
    if AI_PROVIDER == "groq" and GROQ_API_KEY:
        raw_text = _analyze_with_groq(frame_data_list, video_id)
    else:
        raw_text = _analyze_with_bedrock(frame_data_list, video_id)

    analysis = _parse_analysis(raw_text)

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
