import { NextRequest, NextResponse } from 'next/server';
import { sendPromotionInBackground } from '@/lib/promotions';

/**
 * Dispara el envío de una promoción.
 *
 * Para listas grandes (7k contactos) el envío puede durar horas debido al
 * patrón aleatorio antispam (delays de 15-45s entre mensajes + pausas largas).
 * Por eso lo lanzamos en background y respondemos inmediatamente.
 *
 * El progreso se puede consultar leyendo `promotion.sendCount` y los
 * `promotionSend` records de la DB.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    sendPromotionInBackground(params.id);

    return NextResponse.json({
      ok: true,
      message: 'Envío iniciado. Mira el progreso en la sección "Envíos".',
      promotionId: params.id,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
