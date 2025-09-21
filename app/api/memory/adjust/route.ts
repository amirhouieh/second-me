import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { learnings, recent } = await req.json();
  return NextResponse.json({
    explicit: learnings?.explicit ?? '',
    implicit: learnings?.implicit ?? '',
  });
}


