import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { schedulePromotionCron } from '@/lib/scheduler';
import { sendPromotion } from '@/lib/promotions';

export async function GET() {
  const items = await prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const promo = await prisma.promotion.create({
    data: {
      title: body.title,
      message: body.message,
      imageUrl: body.imageUrl || null,
      active: body.active ?? true,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      cronExpr: body.cronExpr || null,
      autoSendOnCreate: Boolean(body.autoSendOnCreate),
      targetTags: body.targetTags || '[]',
    },
  });

  if (promo.cronExpr && promo.active) {
    schedulePromotionCron(promo.id, promo.cronExpr);
  }

  let sendResult: unknown = null;
  if (body.autoSendOnCreate && promo.active) {
    try {
      sendResult = await sendPromotion(promo.id);
    } catch (e) {
      return NextResponse.json(
        { ...promo, autoSendError: e instanceof Error ? e.message : String(e) },
        { status: 201 }
      );
    }
  }

  return NextResponse.json({ ...promo, sendResult });
}
