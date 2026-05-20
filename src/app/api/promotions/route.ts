import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { schedulePromotionCron } from '@/lib/scheduler';
import { sendPromotion } from '@/lib/promotions';
import { normalizeTags } from '@/lib/tags';

export async function GET() {
  const items = await prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title || !body.message) {
    return NextResponse.json({ error: 'title y message son obligatorios' }, { status: 400 });
  }

  let promo;
  try {
    promo = await prisma.promotion.create({
      data: {
        title: body.title,
        message: body.message,
        imageUrl: body.imageUrl || null,
        active: body.active ?? true,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        cronExpr: body.cronExpr || null,
        autoSendOnCreate: Boolean(body.autoSendOnCreate),
        targetTags: normalizeTags(body.targetTags),
      },
    });
  } catch (err) {
    console.error('[promotions.POST]', err);
    return NextResponse.json({ error: 'Error al crear promoción' }, { status: 500 });
  }

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
