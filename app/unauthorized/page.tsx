import Link from 'next/link';
import { ShieldX } from 'lucide-react';

/**
 * Página de acceso no autorizado
 * Se muestra cuando un usuario intenta acceder a una ruta para la que no tiene permisos
 */
export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#101f60] px-4">
      <div className="max-w-md w-full text-center">
        {/* Icono */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-500/20 p-4">
            <ShieldX className="h-16 w-16 text-red-400" />
          </div>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-white mb-4">
          Acceso No Autorizado
        </h1>

        {/* Mensaje */}
        <p className="text-lg text-white/80 mb-2">
          No tienes permisos para acceder a esta página.
        </p>
        <p className="text-sm text-white/60 mb-8">
          Si crees que esto es un error, por favor contacta al administrador del sistema.
        </p>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-md bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            Ir al Dashboard
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-md bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

