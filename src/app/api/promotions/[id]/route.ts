import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { schedulePromotionCron, cancelPromotionCron } from '@/lib/scheduler';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const promo = await prisma.promotion.update({
    where: { id: params.id },
    data: {
      title: body.title,
      message: body.message,
      imageUrl: body.imageUrl || null,
      active: body.active ?? true,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      cronExpr: body.cronExpr || null,
      targetTags: body.targetTags || '[]',
    },
  });

  cancelPromotionCron(promo.id);
  if (promo.cronExpr && promo.active) {
    schedulePromotionCron(promo.id, promo.cronExpr);
  }

  return NextResponse.json(promo);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  cancelPromotionCron(params.id);
  await prisma.promotion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
