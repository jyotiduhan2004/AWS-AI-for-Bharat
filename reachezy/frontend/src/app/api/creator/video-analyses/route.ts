/**
 * GET    /api/creator/video-analyses — Returns per-video analysis breakdowns for the logged-in creator.
 * DELETE /api/creator/video-analyses — Deletes a video analysis and re-aggregates the style profile.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/server-db';
import { getUserFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.creator_id) {
      return NextResponse.json({ error: 'Not a creator account' }, { status: 403 });
    }

    const result = await dbQuery(
      `SELECT va.video_id, va.energy_level, va.aesthetic, va.setting,
              va.production_quality, va.content_type, va.topics,
              va.dominant_colors, va.has_text_overlay, va.face_visible,
              va.summary, va.analyzed_at,
              vu.s3_key, vu.duration_seconds, vu.created_at AS uploaded_at
       FROM video_analyses va
       JOIN video_uploads vu ON va.video_id = vu.id
       WHERE va.creator_id = $1
       ORDER BY vu.created_at DESC`,
      [user.creator_id]
    );

    const analyses = result.rows.map((row: Record<string, unknown>, index: number) => ({
      video_number: result.rows.length - index,
      video_id: row.video_id,
      energy_level: row.energy_level,
      aesthetic: row.aesthetic,
      setting: row.setting,
      production_quality: row.production_quality,
      content_type: row.content_type,
      topics: row.topics,
      dominant_colors: row.dominant_colors,
      has_text_overlay: row.has_text_overlay,
      face_visible: row.face_visible,
      summary: row.summary,
      analyzed_at: row.analyzed_at,
      s3_key: row.s3_key,
      duration_seconds: row.duration_seconds,
      uploaded_at: row.uploaded_at,
    }));

    return NextResponse.json({ analyses, count: analyses.length });
  } catch (e) {
    console.error('Error in GET /api/creator/video-analyses:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function mode(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }
  let best = values[0];
  let bestCount = 0;
  for (const [val, cnt] of Object.entries(counts)) {
    if (cnt > bestCount) { best = val; bestCount = cnt; }
  }
  return best;
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.creator_id) {
      return NextResponse.json({ error: 'Not a creator account' }, { status: 403 });
    }

    const body = await req.json();
    const videoId = body.video_id;
    if (!videoId) {
      return NextResponse.json({ error: 'video_id is required' }, { status: 400 });
    }

    // Verify the video belongs to this creator
    const ownership = await dbQuery(
      `SELECT id FROM video_uploads WHERE id = $1 AND creator_id = $2`,
      [videoId, user.creator_id]
    );
    if (ownership.rows.length === 0) {
      return NextResponse.json({ error: 'Video not found or not yours' }, { status: 404 });
    }

    // Delete from video_uploads (cascades to video_analyses and video_embeddings)
    await dbQuery(`DELETE FROM video_uploads WHERE id = $1`, [videoId]);

    // Re-aggregate style profile from remaining analyses
    const remaining = await dbQuery(
      `SELECT va.energy_level, va.aesthetic, va.setting,
              va.production_quality, va.content_type, va.topics,
              va.has_text_overlay, va.face_visible, va.summary
       FROM video_analyses va
       JOIN video_uploads vu ON va.video_id = vu.id
       WHERE va.creator_id = $1
       ORDER BY vu.created_at DESC`,
      [user.creator_id]
    );

    if (remaining.rows.length === 0) {
      // No analyses left — clear style profile
      await dbQuery(
        `UPDATE creators SET style_profile = NULL, updated_at = NOW() WHERE id = $1`,
        [user.creator_id]
      );
      return NextResponse.json({ success: true, remaining_count: 0 });
    }

    // Rebuild aggregate style profile
    const rows = remaining.rows as Record<string, unknown>[];
    const total = rows.length;

    const energies = rows.map(r => r.energy_level as string).filter(Boolean);
    const aesthetics = rows.map(r => r.aesthetic as string).filter(Boolean);
    const contentTypes = rows.map(r => r.content_type as string).filter(Boolean);
    const settings = rows.map(r => r.setting as string).filter(Boolean);

    const allTopics = Array.from(new Set(rows.flatMap(r => {
      const t = r.topics;
      return Array.isArray(t) ? t as string[] : [];
    })));

    const faceCount = rows.filter(r => r.face_visible).length;
    const textCount = rows.filter(r => r.has_text_overlay).length;

    const dominantEnergy = mode(energies) || 'medium';
    const dominantAesthetic = mode(aesthetics);
    const primaryContentType = mode(contentTypes);

    const energyMap: Record<string, number> = {
      high: 80, chaotic: 90, medium: 55, moderate: 55, low: 30, calm: 25,
    };
    const energyScore = energyMap[dominantEnergy] ?? 50;

    // Settings breakdown
    const settingCounts: Record<string, number> = {};
    for (const s of settings) { settingCounts[s] = (settingCounts[s] || 0) + 1; }
    const settingsBreakdown = Object.entries(settingCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, pct: Math.round((count / total) * 100) }));

    // Consistency score
    let consistencyScore = 100;
    if (total > 1) {
      const fields = [energies, aesthetics, settings,
        rows.map(r => r.production_quality as string).filter(Boolean),
        contentTypes];
      const fieldScores: number[] = [];
      for (const vals of fields) {
        if (vals.length === 0) continue;
        const cnts: Record<string, number> = {};
        for (const v of vals) { cnts[v] = (cnts[v] || 0) + 1; }
        const max = Math.max(...Object.values(cnts));
        fieldScores.push(max / vals.length);
      }
      consistencyScore = fieldScores.length > 0
        ? Math.round((fieldScores.reduce((a, b) => a + b, 0) / fieldScores.length) * 100)
        : 50;
    }

    // Composite summary
    const parts: string[] = [];
    if (primaryContentType) parts.push(primaryContentType);
    if (dominantAesthetic) parts.push(dominantAesthetic);
    if (dominantEnergy) parts.push(dominantEnergy);
    const styleDesc = parts.length > 0 ? parts.join(', ') : 'mixed-style';
    const topicStr = allTopics.length > 0 ? allTopics.slice(0, 5).join(', ') : 'various subjects';
    const styleSummary = total === 1
      ? `Creator produces ${styleDesc} content focused on ${topicStr}.`
      : `Across ${total} videos: Creator produces ${styleDesc} content focused on ${topicStr}.`;

    const styleProfile = {
      dominant_energy: dominantEnergy,
      energy_score: energyScore,
      dominant_aesthetic: dominantAesthetic,
      primary_content_type: primaryContentType,
      topics: allTopics,
      face_visible_pct: total > 0 ? Math.round((faceCount / total) * 1000) / 10 : 0,
      text_overlay_pct: total > 0 ? Math.round((textCount / total) * 1000) / 10 : 0,
      settings: settingsBreakdown,
      style_summary: styleSummary,
      video_count: total,
      consistency_score: consistencyScore,
    };

    await dbQuery(
      `UPDATE creators SET style_profile = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(styleProfile), user.creator_id]
    );

    return NextResponse.json({ success: true, remaining_count: total });
  } catch (e) {
    console.error('Error in DELETE /api/creator/video-analyses:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
