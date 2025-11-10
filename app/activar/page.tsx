import { validarToken } from './actions';
import FormularioActivacion from './FormularioActivacion';
import Image from 'next/image';

interface PageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

/**
 * Página de activación de cuenta
 * Lee el token de la URL y muestra el formulario si es válido
 * Muestra nombre_completo_becado y correo_personal desde la BD
 */
export default async function ActivarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token;
  const error = params.error;

  // Si no hay token, mostrar mensaje
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: '#101f60' }}>
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Token requerido
          </h1>
          <p className="text-gray-600">
            Por favor, accede a esta página con un token de activación válido.
          </p>
        </div>
      </div>
    );
  }

  // Validar el token y obtener datos del estudiante
  const validacion = await validarToken(token);

  if (!validacion.success || !validacion.estudiante) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: '#101f60' }}>
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            Token inválido
          </h1>
          <p className="text-gray-600">{validacion.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: '#101f60' }}>
      <div className="mx-auto max-w-7xl">
        {/* Layout de dos columnas en desktop */}
        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          {/* COLUMNA IZQUIERDA - Informativa */}
          <div className="flex flex-col items-center justify-center space-y-6 text-white md:items-start">
            {/* Logo */}
            <div className="flex w-full max-w-md justify-center md:justify-start">
              <Image
                src="/logo-direccion-de-integracion.jpeg"
                alt="Logo Dirección de Integración"
                width={500}
                height={250}
                className="rounded-lg"
                priority
              />
            </div>

            {/* Título de bienvenida */}
            <h1 className="mt-8 text-center text-3xl font-bold md:text-left md:text-4xl">
              ¡Bienvenido a tu Portal de Becado!
            </h1>

            {/* Caja de información importante */}
            <div className="w-full rounded-lg bg-white/10 p-6 backdrop-blur-sm md:bg-white/5">
              <h2 className="mb-4 text-xl font-semibold">Información Importante</h2>
              <div className="space-y-4 text-sm leading-relaxed">
                <div>
                  <p className="mb-2 font-semibold">Verifica tus datos:</p>
                  <p>
                    Por favor revisa que tu nombre y correo sean correctos. Si el nombre tiene un error,{' '}
                    <strong>COMUNÍCALO INMEDIATAMENTE</strong> a{' '}
                    <a href="mailto:ejemplo@gmail.com" className="underline hover:text-blue-200">
                      ejemplo@gmail.com
                    </a>{' '}
                    o al{' '}
                    <a href="tel:+50363141521" className="underline hover:text-blue-200">
                      +503 6314 1521
                    </a>
                    .
                  </p>
                </div>
                <div>
                  <p className="mb-2 font-semibold">Sobre tu correo:</p>
                  <p>
                    El correo que ves es el que nos proporcionaste. Si aún tienes acceso a él, déjalo tal cual. Si deseas actualizarlo,{' '}
                    <strong>HAZLO AHORA</strong> en el formulario. Este correo será tu medio de comunicación oficial para novedades de tu beca.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA - Formulario */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                Activar Cuenta
              </h2>
              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">
                  <p className="text-sm">{error}</p>
                </div>
              )}
              <FormularioActivacion
                token={token}
                nombreCompleto={validacion.estudiante.nombre_completo_becado}
                correoPredeterminado={validacion.estudiante.correo_personal}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
