/**
 * Server-side proxy for Chess.com's live-game callback endpoint.
 *
 * Chess.com's undocumented callback endpoint does not send
 * Access-Control-Allow-Origin headers, so browsers block direct client-side
 * fetches to it. This route re-fetches the same JSON from the server (where
 * CORS doesn't apply) and forwards it back to the client unchanged, so the
 * existing status-code handling in lib/chess/pgn/fetcher.ts keeps working.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

const GAME_ID_PATTERN = /^\d+$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
): Promise<NextResponse> {
  const { gameId } = await params;

  if (!GAME_ID_PATTERN.test(gameId)) {
    return NextResponse.json(
      { error: 'Invalid Chess.com game ID' },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `https://www.chess.com/callback/live/game/${gameId}`,
      { headers: { Accept: 'application/json' } },
    );

    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Failed to proxy Chess.com game request', error, { gameId });
    return NextResponse.json(
      { error: 'Failed to reach Chess.com' },
      { status: 502 },
    );
  }
}
