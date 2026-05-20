import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { schedulePromotionCron, cancelPromotionCron } from '@/lib/scheduler';
import { normalizeTags } from '@/lib/tags';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  try {
    const promo = await prisma.promotion.update({
      where: { id: params.id },
      data: {
        title: body.title,
        message: body.message,
        imageUrl: body.imageUrl || null,
        active: body.active ?? true,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        cronExpr: body.cronExpr || null,
        targetTags: normalizeTags(body.targetTags),
      },
    });

    cancelPromotionCron(promo.id);
    if (promo.cronExpr && promo.active) {
      schedulePromotionCron(promo.id, promo.cronExpr);
    }

    return NextResponse.json(promo);
  } catch (err) {
    console.error('[promotions.PUT]', err);
    return NextResponse.json({ error: 'Error al actualizar promoción' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    cancelPromotionCron(params.id);
    await prisma.promotion.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[promotions.DELETE]', err);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
