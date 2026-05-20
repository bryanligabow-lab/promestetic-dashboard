'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  /** Tamaño del logo (lado del cuadrado en px). Default: 36 */
  size?: number;
  /** Mostrar nombre al lado del logo */
  showName?: boolean;
  /** Forzar fallback de ícono (útil mientras carga) */
  fallbackOnly?: boolean;
}

/**
 * Logo de la empresa. Lee de /api/company → logoUrl.
 * Si no hay logo subido, muestra ícono Sparkles + nombre.
 *
 * Cachea el resultado en window para no re-fetchear en cada render.
 */
let cached: { name: string; logoUrl: string | null } | null = null;

export function BrandLogo({ size = 36, showName = true, fallbackOnly = false }: Props) {
  const [data, setData] = useState<{ name: string; logoUrl: string | null } | null>(cached);

  useEffect(() => {
    if (fallbackOnly) return;
    if (cached) return;
    fetch('/api/company', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (!c) return;
        cached = { name: c.name ?? 'Promestetic', logoUrl: c.logoUrl ?? null };
        setData(cached);
      })
      .catch(() => {});
  }, [fallbackOnly]);

  const name = data?.name ?? 'Promestetic';
  const logoUrl = data?.logoUrl;

  return (
    <div className="flex items-center gap-2">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name}
          width={size}
          height={size}
          className="object-contain rounded"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-lg bg-primary flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <Sparkles className="text-primary-foreground" style={{ width: size * 0.55, height: size * 0.55 }} />
        </div>
      )}
      {showName && (
        <div>
          <p className="font-semibold text-base leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground">Dashboard</p>
        </div>
      )}
    </div>
  );
}
