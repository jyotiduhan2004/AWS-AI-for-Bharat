/**
 * POST /api/upload/presign — Generate S3 presigned PUT URL for video upload.
 * Bypasses API Gateway (which rejects email-based JSON tokens).
 */
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { query } from '@/lib/server-db';
import { getUserFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_VIDEOS_BUCKET || 'reachezy-videos-424040537460';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { creator_id, filename, content_type } = body;

    if (!creator_id || !filename || !content_type) {
      return NextResponse.json(
        { error: 'Missing creator_id, filename, or content_type' },
        { status: 400 }
      );
    }

    const s3Key = `uploads/${creator_id}/${Date.now()}_${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: content_type,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 600 });

    // Record upload in video_uploads table
    try {
      await query(
        `INSERT INTO video_uploads (creator_id, s3_key, status, created_at)
         VALUES ($1, $2, 'uploaded', NOW())
         ON CONFLICT DO NOTHING`,
        [creator_id, s3Key]
      );
    } catch (dbErr) {
      console.warn('Could not record upload in DB (table may not exist):', dbErr);
    }

    return NextResponse.json({ url, s3_key: s3Key });
  } catch (e) {
    console.error('Error in POST /api/upload/presign:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
