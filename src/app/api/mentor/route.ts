import { NextRequest } from 'next/server';
import { POST as coachPost } from '@/app/api/coach/route';

/**
 * /api/mentor is maintained as a seamless backwards-compatible alias to /api/coach
 */
export async function POST(req: NextRequest) {
  return coachPost(req);
}
