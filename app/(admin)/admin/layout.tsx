import Image from 'next/image';
import { LogOut, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/app/actions/auth';
import AdminNav from './layout/AdminNav';

/**
 * Layout para el Portal Administrativo
 * Agrupa todas las rutas administrativas bajo /admin
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#101f60] flex flex-col">
      {/* Navbar Superior */}
      <header className="border-b border-white/20 bg-[#101f60]">
        <div className="flex items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-direccion-de-integracion.jpeg"
              alt="Logo Dirección de Integración"
              width={120}
              height={60}
              className="rounded-lg"
              priority
            />
            <h1 className="text-xl font-bold text-white">
              Panel Administrativo
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Botón Configuración */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center rounded-md bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                >
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Configuración</span>
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
        </div>

        {/* Menú de Navegación */}
        <AdminNav />
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 text-white p-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/20 bg-[#101f60] px-4 py-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-white/80 text-center">
            © {currentYear} Dirección de Integración. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

