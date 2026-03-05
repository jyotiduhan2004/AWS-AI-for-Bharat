/**
 * POST /api/upload/demo-analyze
 * Triggers the Step Functions analysis pipeline for ALL existing video_uploads
 * belonging to a creator — including seed demo rows (status='completed').
 *
 * Used by demo accounts that already have video records in the DB but haven't
 * run the AI analysis pipeline yet.
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
  'arn:aws:states:us-east-1:424040537460:stateMachine:Reachezy-DemoWorkflow';

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

    // Get ALL video_uploads for this creator (including demo seed rows, any status)
    const { rows: videos } = await query(
      `SELECT id, s3_key, status FROM video_uploads WHERE creator_id = $1`,
      [creator_id]
    );

    if (!videos || videos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No video records found for this creator' },
        { status: 404 }
      );
    }

    const executionArns: string[] = [];
    const errors: string[] = [];

    for (const video of videos) {
      try {
        const executionName = `demo-${video.id}-${Date.now()}`;
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Ignore "already running" errors — execution already started
        if (msg.includes('ExecutionAlreadyExists')) {
          continue;
        }
        errors.push(`video ${video.id}: ${msg}`);
      }
    }

    // Mark all videos as 'processing' so the dashboard shows the analyzing state
    await query(
      `UPDATE video_uploads SET status = 'processing' WHERE creator_id = $1`,
      [creator_id]
    );

    console.log(
      `Demo analysis: started ${executionArns.length} execution(s) for creator ${creator_id}`,
      errors.length ? `Errors: ${errors.join(', ')}` : ''
    );

    return NextResponse.json({
      success: true,
      executions: executionArns.length,
      total_videos: videos.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (e) {
    console.error('Error in POST /api/upload/demo-analyze:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
