'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, Bot, Image as ImageIcon,
  Megaphone, Users, MessageSquare, Smartphone, Plug, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from './BrandLogo';

const nav = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/dashboard/configuracion', label: 'Empresa', icon: Building2 },
  { href: '/dashboard/chatbot', label: 'Chatbot', icon: Bot },
  { href: '/dashboard/catalogo', label: 'Catálogo', icon: ImageIcon },
  { href: '/dashboard/promociones', label: 'Promociones', icon: Megaphone },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/conversaciones', label: 'Conversaciones', icon: MessageSquare },
  { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: Smartphone },
  { href: '/dashboard/integraciones', label: 'Integraciones', icon: Plug },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="p-6 border-b">
        <BrandLogo size={40} showName />
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
        <p className="text-xs text-muted-foreground px-3">v0.1.0</p>
      </div>
    </aside>
  );
}
