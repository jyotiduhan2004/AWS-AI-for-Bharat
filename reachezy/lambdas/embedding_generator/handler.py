import json
import boto3
from shared.db import get_db_connection

BEDROCK_EMBEDDING_MODEL = "amazon.titan-embed-text-v2:0"


def _build_embedding_text(analysis):
    """Build a text string from analysis fields for embedding generation."""
    parts = []

    if analysis.get("energy_level"):
        parts.append(f"Energy: {analysis['energy_level']}")
    if analysis.get("aesthetic"):
        parts.append(f"Aesthetic: {analysis['aesthetic']}")
    if analysis.get("content_type"):
        parts.append(f"Content type: {analysis['content_type']}")
    if analysis.get("setting"):
        parts.append(f"Setting: {analysis['setting']}")
    if analysis.get("production_quality"):
        parts.append(f"Production quality: {analysis['production_quality']}")

    topics = analysis.get("topics", [])
    if topics:
        parts.append(f"Topics: {', '.join(topics)}")

    face_visible = analysis.get("face_visible", False)
    parts.append(f"Face visible: {'yes' if face_visible else 'no'}")

    text_on_screen = analysis.get("text_on_screen", False)
    parts.append(f"Text on screen: {'yes' if text_on_screen else 'no'}")

    if analysis.get("summary"):
        parts.append(f"Summary: {analysis['summary']}")

    return ". ".join(parts)


def handler(event, context):
    """Generate embedding for a video analysis and store in pgvector.

    Receives:
        { video_id, creator_id, analysis: {...} }

    Returns:
        { video_id, creator_id, embedding_stored: True }
    """
    video_id = event["video_id"]
    creator_id = event["creator_id"]
    analysis = event["analysis"]

    # Build embedding text from analysis
    embedding_text = _build_embedding_text(analysis)

    # Call Bedrock Titan Embeddings v2
    bedrock = boto3.client("bedrock-runtime")
    request_body = json.dumps({
        "inputText": embedding_text,
        "dimensions": 1024,
        "normalize": True,
    })

    response = bedrock.invoke_model(
        modelId=BEDROCK_EMBEDDING_MODEL,
        contentType="application/json",
        accept="application/json",
        body=request_body,
    )

    response_body = json.loads(response["body"].read())
    embedding = response_body["embedding"]

    # Format embedding as pgvector-compatible string: "[0.1,0.2,...]"
    embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

    # Store embedding in video_embeddings table
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO video_embeddings (video_id, creator_id, embedding, is_creator_aggregate)
        VALUES (%s, %s, %s::vector, FALSE)
        ON CONFLICT (video_id, is_creator_aggregate) DO UPDATE SET
            embedding = EXCLUDED.embedding
        """,
        (video_id, creator_id, embedding_str),
    )
    conn.commit()

    return {
        "video_id": video_id,
        "creator_id": creator_id,
        "embedding_stored": True,
    }
