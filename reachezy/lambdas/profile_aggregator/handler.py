import json
import math
from collections import Counter
from shared.db import get_db_connection


def _mode(values):
    """Return the most common value from a list. Returns None if list is empty."""
    if not values:
        return None
    counter = Counter(values)
    return counter.most_common(1)[0][0]


def _compute_consistency_score(analyses):
    """Compute a consistency score (0-100) based on tag variance.

    Higher score = more consistent style across videos.
    """
    if len(analyses) <= 1:
        return 100

    fields = ["energy_level", "aesthetic", "setting", "production_quality", "content_type"]
    field_scores = []

    for field in fields:
        values = [a.get(field) for a in analyses if a.get(field)]
        if not values:
            continue
        counter = Counter(values)
        most_common_count = counter.most_common(1)[0][1]
        # Ratio of the most common value to total values
        consistency = most_common_count / len(values)
        field_scores.append(consistency)

    if not field_scores:
        return 50

    # Average consistency across all fields, scaled to 0-100
    return round((sum(field_scores) / len(field_scores)) * 100)


def _normalize_vector(vec):
    """L2 normalize a vector using pure Python."""
    magnitude = math.sqrt(sum(v * v for v in vec))
    if magnitude == 0:
        return vec
    return [v / magnitude for v in vec]


def _average_embeddings(embeddings):
    """Compute element-wise average of multiple embedding vectors, then L2 normalize."""
    if not embeddings:
        return None

    dim = len(embeddings[0])
    count = len(embeddings)

    # Element-wise sum
    avg = [0.0] * dim
    for emb in embeddings:
        for i in range(dim):
            avg[i] += emb[i]

    # Element-wise average
    avg = [v / count for v in avg]

    # L2 normalize
    return _normalize_vector(avg)


def handler(event, context):
    """Aggregate style profile and embeddings for a creator.

    Receives:
        { video_id, creator_id }

    Returns:
        { creator_id, style_profile }
    """
    video_id = event["video_id"]
    creator_id = event["creator_id"]

    conn = get_db_connection()
    cur = conn.cursor()

    # Fetch ALL video analyses for this creator
    cur.execute(
        """
        SELECT va.video_id, va.energy_level, va.aesthetic, va.setting,
               va.production_quality, va.content_type, va.topics,
               va.dominant_colors, va.has_text_overlay, va.face_visible, va.summary
        FROM video_analyses va
        JOIN video_uploads vu ON va.video_id = vu.id
        WHERE va.creator_id = %s
        ORDER BY vu.created_at DESC
        """,
        (creator_id,),
    )
    rows = cur.fetchall()

    if not rows:
        return {
            "creator_id": creator_id,
            "style_profile": {"error": "No video analyses found"},
        }

    analyses = []
    for row in rows:
        topics = row[6]
        if isinstance(topics, str):
            topics = json.loads(topics)

        analyses.append({
            "video_id": str(row[0]),
            "energy_level": row[1],
            "aesthetic": row[2],
            "setting": row[3],
            "production_quality": row[4],
            "content_type": row[5],
            "topics": topics or [],
            "has_text_overlay": row[8],
            "face_visible": row[9],
            "summary": row[10],
        })

    # Compute aggregate style profile
    all_topics = []
    for a in analyses:
        all_topics.extend(a.get("topics", []))
    all_topics = list(set(all_topics))  # deduplicate

    face_count = sum(1 for a in analyses if a.get("face_visible"))
    text_count = sum(1 for a in analyses if a.get("has_text_overlay"))
    total = len(analyses)

    style_profile = {
        "dominant_energy": _mode([a["energy_level"] for a in analyses if a.get("energy_level")]),
        "dominant_aesthetic": _mode([a["aesthetic"] for a in analyses if a.get("aesthetic")]),
        "dominant_setting": _mode([a["setting"] for a in analyses if a.get("setting")]),
        "dominant_production": _mode([a["production_quality"] for a in analyses if a.get("production_quality")]),
        "dominant_content_type": _mode([a["content_type"] for a in analyses if a.get("content_type")]),
        "all_topics": all_topics,
        "face_percentage": round((face_count / total) * 100, 1) if total > 0 else 0,
        "text_overlay_percentage": round((text_count / total) * 100, 1) if total > 0 else 0,
        "style_summary": analyses[0].get("summary", ""),  # latest video summary (ordered DESC)
        "video_count": total,
        "consistency_score": _compute_consistency_score(analyses),
    }

    # Compute creator aggregate embedding (average of all video embeddings)
    cur.execute(
        """
        SELECT embedding::text
        FROM video_embeddings
        WHERE creator_id = %s AND is_creator_aggregate = FALSE
        """,
        (creator_id,),
    )
    embedding_rows = cur.fetchall()

    embeddings = []
    for erow in embedding_rows:
        raw = erow[0]
        # Parse pgvector string format "[0.1,0.2,...]"
        raw = raw.strip("[]")
        vec = [float(v) for v in raw.split(",")]
        embeddings.append(vec)

    if embeddings:
        aggregate_embedding = _average_embeddings(embeddings)
        embedding_str = "[" + ",".join(str(v) for v in aggregate_embedding) + "]"

        # Upsert the creator aggregate embedding
        cur.execute(
            """
            INSERT INTO video_embeddings (video_id, creator_id, embedding, is_creator_aggregate)
            VALUES (%s, %s, %s::vector, TRUE)
            ON CONFLICT (creator_id, is_creator_aggregate)
                WHERE is_creator_aggregate = TRUE
            DO UPDATE SET
                embedding = EXCLUDED.embedding
            """,
            (video_id, creator_id, embedding_str),
        )

    # Update creators.style_profile JSONB
    cur.execute(
        """
        UPDATE creators
        SET style_profile = %s::jsonb, updated_at = NOW()
        WHERE id = %s
        """,
        (json.dumps(style_profile), creator_id),
    )

    # Update all video_uploads status to 'completed' for this creator
    cur.execute(
        """
        UPDATE video_uploads
        SET status = 'completed'
        WHERE creator_id = %s AND status IN ('uploaded', 'processing')
        """,
        (creator_id,),
    )

    conn.commit()

    return {
        "creator_id": creator_id,
        "style_profile": style_profile,
    }
