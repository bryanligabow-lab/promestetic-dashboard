import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Archivo muy grande (max 8MB)' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo imágenes' }, { status: 400 });
  }

  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.name) || '.jpg';
  const safeExt = /^\.(jpg|jpeg|png|webp|gif|svg)$/i.test(ext) ? ext.toLowerCase() : '.jpg';
  const name = `${crypto.randomBytes(12).toString('hex')}${safeExt}`;
  const dest = path.join(UPLOAD_DIR, name);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(dest, buf);

  return NextResponse.json({ url: `/uploads/${name}` });
}
