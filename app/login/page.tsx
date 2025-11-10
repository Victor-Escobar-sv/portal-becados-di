import Image from 'next/image';
import FormularioLogin from './FormularioLogin';

interface PageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

/**
 * Página de inicio de sesión
 * Permite a los usuarios autenticarse con email y contraseña
 */
export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error;
  const message = params.message;

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#101f60] px-4 py-8">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/logo-direccion-de-integracion.jpeg"
          alt="Logo Dirección de Integración"
          width={300}
          height={100}
          className="h-auto"
          priority
        />
      </div>

      {/* Burbuja Glassmorphism - Form Container */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl border border-white/10 shadow-2xl p-8 text-white">
        <h1 className="mb-2 text-3xl font-bold text-center">
          Iniciar Sesión
        </h1>
        <p className="mb-6 text-center text-white/80">
          Ingresa tus credenciales para acceder al portal.
        </p>
        
        {/* Mostrar mensaje de error si existe */}
        {error && (
          <div className="mb-4 rounded-md bg-red-500/20 backdrop-blur-sm border border-red-400/30 p-3 text-red-100">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Mostrar mensaje informativo si existe */}
        {message && (
          <div className="mb-4 rounded-md bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 p-3 text-blue-100">
            <p className="text-sm">{message}</p>
          </div>
        )}

        <FormularioLogin />
      </div>

      {/* Footer Institucional */}
      <footer className="mt-12 text-center">
        <p className="text-white/40 text-xs">
          © {currentYear} Dirección de Integración. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}

