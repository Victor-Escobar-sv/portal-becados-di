'use client';

import Image from 'next/image';
import { LogOut, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/app/actions/auth';
import NotificationBell from '@/components/portal/NotificationBell';

export default function DashboardHeader() {
  return (
    <header className="flex items-center justify-between border-b border-white/20 bg-[#101f60] px-4 py-4 md:px-8">
      <div className="flex items-center gap-4">
        <Image
          src="/logo-direccion-de-integracion.jpeg"
          alt="Logo Dirección de Integración"
          width={120}
          height={60}
          className="rounded-lg"
          priority
        />
      </div>
      <div className="flex items-center gap-3">
        {/* Campana de Notificaciones */}
        <NotificationBell />

        {/* Menú de Ajustes */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-center rounded-md bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Ajustes</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem disabled>Restablecer Contraseña</DropdownMenuItem>
            <DropdownMenuItem disabled>Editar Perfil</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Botón Cerrar Sesión */}
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Cerrar Sesión</span>
          </button>
        </form>
      </div>
    </header>
  );
}

