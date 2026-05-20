import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { apiUrl, apiKey, instance } = await req.json();
  if (!apiUrl || !apiKey) {
    return NextResponse.json({ error: 'Falta URL o API key' }, { status: 400 });
  }
  try {
    const res = await fetch(`${apiUrl}/instance/fetchInstances`, {
      headers: { apikey: apiKey },
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `HTTP ${res.status}`, body: data });
    }
    const instances = Array.isArray(data)
      ? data.map((x: any) => ({ name: x.name, status: x.connectionStatus, number: x.number }))
      : [];
    const found = instance ? instances.find((i) => i.name === instance) : null;
    return NextResponse.json({
      ok: true,
      total: instances.length,
      instances: instances.slice(0, 20),
      requestedInstance: instance ?? null,
      foundInstance: found,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) });
  }
}
