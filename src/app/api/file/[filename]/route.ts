import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Sirve archivos del directorio /public/uploads en runtime.
 *
 * Necesario porque Next.js con output:'standalone' no sirve archivos
 * que se agregaron al volumen montado /public/uploads DESPUÉS del build.
 *
 * El middleware reescribe /uploads/X.png → /api/file/X.png.
 */
export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  const safe = path.basename(params.filename);
  if (safe !== params.filename) {
    return new NextResponse('forbidden', { status: 403 });
  }

  const filePath = path.join(UPLOAD_DIR, safe);

  try {
    const buf = await fs.readFile(filePath);
    const ext = path.extname(safe).toLowerCase();
    const mime =
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.gif' ? 'image/gif' :
      ext === '.webp' ? 'image/webp' :
      ext === '.svg' ? 'image/svg+xml' :
      'application/octet-stream';

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('not found', { status: 404 });
  }
}
