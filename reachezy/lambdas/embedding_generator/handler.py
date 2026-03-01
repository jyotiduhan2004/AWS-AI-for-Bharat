import json
import hashlib
import math
from shared.db import get_db_connection

EMBEDDING_DIM = 1024


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


def _generate_hash_embedding(text, dim=EMBEDDING_DIM):
    """Generate a deterministic embedding vector using chained SHA-512 hashes.

    Produces a normalized vector of `dim` dimensions from the input text.
    Same text always produces the same embedding. The vector is L2-normalized
    so cosine similarity works correctly.
    """
    values = []
    seed = text.encode("utf-8")
    while len(values) < dim:
        h = hashlib.sha512(seed).digest()
        # Each SHA-512 hash gives 64 bytes = 16 floats (4 bytes each)
        for j in range(0, 64, 4):
            if len(values) >= dim:
                break
            # Convert 4 bytes to an unsigned int, then map to [-1, 1]
            val = int.from_bytes(h[j:j + 4], "big")
            values.append((val / 2147483648.0) - 1.0)  # map [0, 2^32) to [-1, 1)
        # Chain: hash the previous hash to get more values
        seed = h

    # L2-normalize
    norm = math.sqrt(sum(v * v for v in values))
    if norm > 0:
        values = [v / norm for v in values]

    return values


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

    # Generate deterministic hash-based embedding
    embedding = _generate_hash_embedding(embedding_text)

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
