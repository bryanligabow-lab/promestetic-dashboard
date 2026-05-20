import { NextRequest, NextResponse } from 'next/server';
import { sendPromotion } from '@/lib/promotions';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await sendPromotion(params.id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
