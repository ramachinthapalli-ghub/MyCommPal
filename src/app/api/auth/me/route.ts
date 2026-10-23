import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('mycommpal_user')?.value;
  if (!cookie) {
    return NextResponse.json({ user: null });
  }

  try {
    const user = JSON.parse(cookie);
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json({ user: null });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('mycommpal_user');
  return response;
}
