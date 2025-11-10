'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users } from 'lucide-react';

/**
 * Componente de navegación para el panel administrativo
 * Muestra los enlaces y resalta la página activa
 */
export default function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/admin/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/admin/estudiantes',
      label: 'Directorio de Estudiantes',
      icon: Users,
    },
  ];

  return (
    <nav className="border-t border-white/10 bg-[#0d1849] px-4 md:px-8">
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-white bg-white/10 border-white/50'
                  : 'text-white/80 hover:bg-white/10 hover:text-white border-transparent hover:border-white/30'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

