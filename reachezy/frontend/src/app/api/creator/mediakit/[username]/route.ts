/**
 * GET /api/creator/mediakit/[username]
 *
 * Local proxy replacing the AWS Lambda endpoint for media kit data.
 * No auth required — this powers both the creator's own dashboard preview
 * and the public /{username} share page.
 *
 * Thumbnails are JPEG frames extracted by the frame_extractor Lambda and stored
 * in the frames bucket at the key: {creator_id}/{video_id}/frame_0.jpg
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server-db';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';

// Bucket where frame_extractor Lambda stores JPEG frames
const FRAMES_BUCKET = process.env.S3_FRAMES_BUCKET || 'reachezy-frames-424040537460';

const s3 = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

interface RouteParams {
  params: { username: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { username } = params;

  if (username === 'favicon.ico') {
    return new NextResponse(null, { status: 404 });
  }

  try {
    // 1. Creator profile + rate card in one query (matching the Lambda approach)
    const creatorResult = await query(
      `SELECT
         c.id AS creator_id,
         c.username,
         COALESCE(c.display_name, c.username) AS full_name,
         COALESCE(c.bio, '') AS biography,
         COALESCE(c.profile_picture_url, '') AS profile_picture_url,
         COALESCE(c.followers_count, 0) AS followers_count,
         COALESCE(c.media_count, 0) AS media_count,
         COALESCE(c.niche, 'General') AS niche,
         COALESCE(c.city, '') AS city,
         c.style_profile,
         rc.reel_rate, rc.story_rate, rc.post_rate, rc.accepts_barter
       FROM creators c
       LEFT JOIN rate_cards rc ON c.id = rc.creator_id
       WHERE c.username = $1`,
      [username]
    );

    if (creatorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const cr = creatorResult.rows[0] as Record<string, unknown>;
    const creatorId = cr.creator_id as string;

    const rateCard = cr.reel_rate != null ? {
      reel_rate: Number(cr.reel_rate),
      story_rate: Number(cr.story_rate),
      post_rate: Number(cr.post_rate),
      accepts_barter: cr.accepts_barter as boolean,
    } : null;

    // 2. Videos that have been analysed — get video_id so we can build the frame key
    const videoResult = await query(
      `SELECT va.video_id, vu.created_at
       FROM video_analyses va
       JOIN video_uploads vu ON va.video_id = vu.id
       WHERE va.creator_id = $1
       ORDER BY vu.created_at DESC
       LIMIT 6`,
      [creatorId]
    );

    const videoRows = videoResult.rows as Record<string, unknown>[];

    // 3. Generate presigned URLs for the JPEG frames stored in frames bucket
    //    Key pattern (same as frame_extractor Lambda): {creator_id}/{video_id}/frame_0.jpg
    const thumbnailUrls: string[] = [];
    const videos: { id: string; thumbnail_url: string; title: string }[] = [];

    await Promise.all(
      videoRows.map(async (row, idx) => {
        const videoId = row.video_id as string;
        const frameKey = `${creatorId}/${videoId}/frame_0.jpg`;

        try {
          const cmd = new GetObjectCommand({ Bucket: FRAMES_BUCKET, Key: frameKey });
          const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
          thumbnailUrls[idx] = url;
          videos[idx] = { id: videoId, thumbnail_url: url, title: `Video ${idx + 1}` };
        } catch {
          // Frame not yet extracted for this video — skip silently
        }
      })
    );

    // 4. Benchmarks — the Lambda queries a rate_benchmarks table; return null for now
    const benchmarks = null;

    return NextResponse.json({
      creator: {
        username: cr.username,
        full_name: cr.full_name,
        biography: cr.biography,
        profile_picture_url: cr.profile_picture_url,
        followers_count: cr.followers_count,
        media_count: cr.media_count,
        niche: cr.niche,
        city: cr.city,
        style_profile: cr.style_profile ?? null,
        rate_card: rateCard,
      },
      benchmarks,
      videos: videos.filter(Boolean),
      thumbnail_urls: thumbnailUrls.filter(Boolean),
    });
  } catch (e) {
    console.error(`Error in GET /api/creator/mediakit/${username}:`, e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
