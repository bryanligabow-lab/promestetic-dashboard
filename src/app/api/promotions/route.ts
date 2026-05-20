import { NextRequest, NextResponse } from 'next/server';
import { sheetsDb } from '@/lib/sheets-db';
import { schedulePromotionCron } from '@/lib/scheduler';
import { sendPromotion } from '@/lib/promotions';

export async function GET() {
  const items = await sheetsDb.promotion.findMany();
  items.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const promo = await sheetsDb.promotion.create({
    data: {
      title: body.title,
      message: body.message,
      imageUrl: body.imageUrl || null,
      active: body.active ?? true,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt).toISOString() : null,
      cronExpr: body.cronExpr || null,
      autoSendOnCreate: Boolean(body.autoSendOnCreate),
      targetTags: body.targetTags || '[]',
      sendCount: 0,
    },
  });

  if (promo.cronExpr && promo.active) {
    schedulePromotionCron(promo.id, promo.cronExpr);
  }

  if (body.autoSendOnCreate && promo.active) {
    // background — no esperar
    void sendPromotion(promo.id).catch((e) =>
      console.error(`[autoSend ${promo.id}]`, e)
    );
  }

  return NextResponse.json(promo);
}
