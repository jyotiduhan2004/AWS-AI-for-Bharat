/**
 * POST /api/upload/analyze — Trigger Step Functions video analysis pipeline.
 * Bypasses API Gateway (which rejects email-based JSON tokens).
 */
import { NextRequest, NextResponse } from 'next/server';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { query } from '@/lib/server-db';
import { getUserFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

const sfn = new SFNClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

const STATE_MACHINE_ARN =
  process.env.NEXT_PUBLIC_SFN_STATE_MACHINE_ARN ||
  'arn:aws:states:us-east-1:424040537460:stateMachine:Reachezy-MainWorkflow';

const S3_VIDEOS_BUCKET =
  process.env.NEXT_PUBLIC_S3_VIDEOS_BUCKET || 'reachezy-videos-424040537460';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { creator_id } = body;

    if (!creator_id) {
      return NextResponse.json({ error: 'Missing creator_id' }, { status: 400 });
    }

    // Fetch uploaded videos (exlucing 'processing' to avoid duplicate executions)
    const { rows: videos } = await query(
      `SELECT vu.id, vu.s3_key FROM video_uploads vu
       LEFT JOIN video_analyses va ON va.video_id = vu.id
       WHERE vu.creator_id = $1
         AND vu.status = 'uploaded'
         AND va.video_id IS NULL`,
      [creator_id]
    );

    if (!videos || videos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No uploaded videos found' },
        { status: 404 }
      );
    }

    // Start a separate Step Functions execution for each video (with per-video error handling)
    const executionArns: string[] = [];
    const startedVideoIds: string[] = [];
    const errors: string[] = [];

    for (const video of videos) {
      try {
        const executionName = `analysis-${video.id}-${Date.now()}`;
        const command = new StartExecutionCommand({
          stateMachineArn: STATE_MACHINE_ARN,
          name: executionName,
          input: JSON.stringify({
            source_bucket: S3_VIDEOS_BUCKET,
            s3_key: video.s3_key,
            video_id: video.id,
            creator_id,
          }),
        });

        const result = await sfn.send(command);
        executionArns.push(result.executionArn!);
        startedVideoIds.push(video.id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Ignore "already running" errors — EventBridge may have started it
        if (msg.includes('ExecutionAlreadyExists')) {
          startedVideoIds.push(video.id);
          continue;
        }
        errors.push(`video ${video.id}: ${msg}`);
      }
    }

    // Only mark successfully-started videos as processing
    if (startedVideoIds.length > 0) {
      await query(
        `UPDATE video_uploads SET status = 'processing'
         WHERE id = ANY($1::uuid[]) AND status = 'uploaded'`,
        [startedVideoIds]
      );
    }

    console.log(
      `Starting ${executionArns.length} pipeline execution(s) for creator ${creator_id}`,
      errors.length ? `Errors: ${errors.join(', ')}` : ''
    );

    return NextResponse.json({
      success: true,
      executions: executionArns.length,
      total_videos: videos.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (e) {
    console.error('Error in POST /api/upload/analyze:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
