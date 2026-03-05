import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side image proxy for PDF generation.
 * Fetches an external image (S3 presigned URL, CDN, etc.) and returns the raw
 * bytes as a same-origin response — bypassing browser CORS restrictions.
 *
 * Guards:
 *  - Rejects non-image content-types (e.g. video/mp4) immediately
 *  - 15 s AbortController timeout so a slow/missing asset doesn't stall the PDF
 *
 * Usage: GET /api/proxy-image?url=<encoded_url>
 */

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'];
const IMAGE_CONTENT_TYPE_PREFIX = 'image/';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Reject video file URLs immediately — they can't be used as images
  try {
    const parsedPath = new URL(url).pathname.toLowerCase();
    if (VIDEO_EXTENSIONS.some((ext) => parsedPath.endsWith(ext))) {
      return NextResponse.json({ error: 'Video files cannot be proxied as images' }, { status: 415 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // If upstream serves a video mime type, bail out right away without buffering it
    if (!contentType.startsWith(IMAGE_CONTENT_TYPE_PREFIX)) {
      return NextResponse.json(
        { error: `Unexpected content type: ${contentType}` },
        { status: 415 }
      );
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    console.error('[proxy-image] Failed to fetch:', err);
    return NextResponse.json(
      { error: isAbort ? 'Upstream timed out' : 'Failed to fetch image' },
      { status: isAbort ? 504 : 500 }
    );
  }
}
