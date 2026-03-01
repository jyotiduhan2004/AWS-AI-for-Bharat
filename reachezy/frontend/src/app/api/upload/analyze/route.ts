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
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const STATE_MACHINE_ARN =
  process.env.SFN_STATE_MACHINE_ARN ||
  'arn:aws:states:us-east-1:424040537460:stateMachine:reachezy-video-analysis';

const S3_VIDEOS_BUCKET =
  process.env.S3_VIDEOS_BUCKET || 'reachezy-videos-424040537460';

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

    // Fetch all uploaded (not yet analyzed) videos for this creator
    const { rows: videos } = await query(
      `SELECT id, s3_key FROM video_uploads WHERE creator_id = $1 AND status = 'uploaded'`,
      [creator_id]
    );

    if (!videos || videos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No uploaded videos found' },
        { status: 404 }
      );
    }

    // Start a separate Step Functions execution for each video
    const executionArns: string[] = [];
    for (const video of videos) {
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
    }

    // Mark those videos as processing
    await query(
      `UPDATE video_uploads SET status = 'processing' WHERE creator_id = $1 AND status = 'uploaded'`,
      [creator_id]
    );

    console.log(`Starting ${videos.length} pipeline execution(s) for creator ${creator_id}`);

    return NextResponse.json({
      success: true,
      executions: videos.length,
      execution_arns: executionArns,
    });
  } catch (e) {
    console.error('Error in POST /api/upload/analyze:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
