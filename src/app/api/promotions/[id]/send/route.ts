import { NextRequest, NextResponse } from 'next/server';
import { sendPromotion } from '@/lib/promotions';

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
    // Lanza el envío sin esperar (background)
    void sendPromotion(params.id).catch((e) => {
      console.error(`[send promo ${params.id}] error:`, e);
    });

    return NextResponse.json({
      ok: true,
      message: 'Envío iniciado en segundo plano. Refresca para ver el progreso.',
      promotionId: params.id,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
