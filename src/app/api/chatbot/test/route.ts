import { NextRequest, NextResponse } from 'next/server';
import { generateReply, isClaudeConfigured } from '@/lib/claude';

export async function POST(req: NextRequest) {
  if (!(await isClaudeConfigured())) {
    return NextResponse.json(
      { error: 'Falta API Key de Anthropic. Configúrala en Integraciones.' },
      { status: 400 }
    );
  }
  const { message } = await req.json();
  try {
    const reply = await generateReply({
      history: [],
      incoming: message,
      clientName: 'Cliente de prueba',
      clientPhone: '0000000000',
    });
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
