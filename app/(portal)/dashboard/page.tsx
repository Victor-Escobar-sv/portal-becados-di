import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardHeader from './DashboardHeader';
import HeroCarousel from './HeroCarousel';
import AccesoRapido from './AccesoRapido';
import Anuncios from './Anuncios';
import RedesSociales from './RedesSociales';
import DashboardFooter from './DashboardFooter';

/**
 * Página del dashboard (ruta privada)
 * Muestra información del usuario autenticado
 * 
 * VALIDACIÓN ESTRICTA: Solo estudiantes pueden acceder a esta página
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  // ========== PASO 1: OBTENER SESIÓN ACTUAL ==========
  // Obtener el usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si no hay usuario autenticado, redirigir a login
  if (!user) {
    redirect('/login');
  }

  // ========== PASO 2: VERIFICAR SI ES ESTUDIANTE ==========
  // Consultar la tabla estudiantes para verificar si existe un registro con el auth_user_id
  // IMPORTANTE: Solo consultar columnas que sabemos que existen
  // Si hay error, intentar consultar solo campos básicos primero
  let estudiante: any = null;
  let estudianteError: any = null;

  // Primero intentar consultar solo campos básicos que sabemos que existen
  const { data: estudianteBasico, error: errorBasico } = await supabase
    .from('estudiantes')
    .select('id, nombre_completo_becado, sexo')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  // Si hay un error y NO es "no encontrado" (PGRST116), es un error crítico
  if (errorBasico && errorBasico.code !== 'PGRST116') {
    console.error('[Dashboard] Error crítico al consultar estudiante:', errorBasico);
    estudianteError = errorBasico;
  } else if (estudianteBasico) {
    // Si se encontró el estudiante, usarlo como base
    estudiante = estudianteBasico;
    
    // Intentar consultar campos adicionales de forma segura
    // Si falla, simplemente ignorar y continuar con datos básicos
    // Usar consulta con select('*') y luego filtrar, o consultar campo por campo
    try {
      // Intentar consultar todos los campos posibles (Supabase devolverá solo los que existen)
      const { data: estudianteExtra, error: errorExtra } = await (supabase as any)
        .from('estudiantes')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      // Si no hay error, combinar los datos (estudianteExtra tendrá todos los campos disponibles)
      if (!errorExtra && estudianteExtra) {
        // Filtrar solo los campos que nos interesan
        const camposExtra = {
          nombre_emergencia: estudianteExtra.nombre_emergencia || null,
          url_carnet: estudianteExtra.url_carnet || estudianteExtra.url_carnet_digital || null,
          url_expediente: estudianteExtra.url_expediente || estudianteExtra.url_expediente_digital || null,
        };
        estudiante = { ...estudiante, ...camposExtra };
      } else if (errorExtra) {
        // Si hay error, verificar si es por columnas inexistentes
        // Errores como PGRST202 (columna no existe) o similares deben ignorarse
        const errorCode = errorExtra.code;
        const errorMessage = errorExtra.message || '';
        
        // Si es un error de columna no encontrada, ignorarlo (es normal)
        if (errorCode === 'PGRST202' || errorMessage.includes('column') || errorMessage.includes('does not exist')) {
          console.warn('[Dashboard] Algunas columnas no existen en la tabla (esto es normal):', errorMessage);
        } else {
          // Otros errores se registran pero no se propagan
          console.warn('[Dashboard] Error al consultar campos adicionales:', errorExtra);
        }
      }
    } catch (err: any) {
      // Ignorar errores al consultar campos adicionales
      // Estos errores no deben bloquear el acceso al dashboard
      console.warn('[Dashboard] No se pudieron obtener campos adicionales (continuando con datos básicos):', err?.message || err);
    }
  }
  // Si errorBasico es PGRST116 (no encontrado) o estudianteBasico es null, estudiante será null
  // Esto se maneja más abajo

  // Si no se encontró el estudiante O hay un error crítico, verificar si es admin
  if (!estudiante || estudianteError) {
    // ========== PASO 3: VERIFICAR SI ES ADMIN ==========
    // Consulta rápida para determinar si es admin
    const { data: adminData, error: adminError } = await (supabase as any)
      .from('usuarios_administrativos')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const isAdmin = !adminError && adminData !== null;

    // Si es admin, redirigir a /admin/dashboard
    if (isAdmin) {
      redirect('/admin/dashboard');
    }

    // Si hay un error crítico (no simplemente "no encontrado"), es un problema real
    if (estudianteError) {
      console.error('[Dashboard] Error crítico y no es admin. Redirigiendo a /unauthorized');
      redirect('/unauthorized');
    }

    // Si no es estudiante ni admin, redirigir a /unauthorized
    if (!estudiante) {
      redirect('/unauthorized');
    }
  }

  // ========== PASO 4: OBTENER INFORMACIÓN DEL ESTUDIANTE ==========
  // Si llegamos aquí, el usuario es un estudiante válido (estudiante no es null)
  // Usamos los datos ya obtenidos en la verificación

  // Type assertion: después de la validación, sabemos que estudiante no es null
  // Usar tipo más flexible para manejar campos que pueden no existir
  type EstudianteData = {
    id: number | string;
    nombre_completo_becado: string | null;
    sexo: string | null;
    nombre_emergencia?: string | null;
    url_carnet?: string | null;
    url_expediente?: string | null;
    url_carnet_digital?: string | null;
    url_expediente_digital?: string | null;
    [key: string]: any; // Permitir campos adicionales
  };
  const estudianteData = estudiante as EstudianteData;

  // Obtener datos del estudiante (ya validados arriba, estudiante no es null)
  const nombreCompleto = estudianteData.nombre_completo_becado || 'Becario';
  const sexo = estudianteData.sexo || null;

  // Verificar si el perfil está completo
  // Criterio: Si nombre_emergencia tiene datos, el perfil está completo
  // Usar valores por defecto seguros en caso de que el campo no exista
  const nombreEmergencia = estudianteData.nombre_emergencia || null;
  const perfilCompleto: boolean = Boolean(
    nombreEmergencia && typeof nombreEmergencia === 'string' && nombreEmergencia.trim() !== ''
  );

  // Obtener URLs de carnet y expediente
  // Intentar ambos nombres de campo (por si varían en la BD)
  const urlCarnet = estudianteData.url_carnet || estudianteData.url_carnet_digital || null;
  const urlExpediente = estudianteData.url_expediente || estudianteData.url_expediente_digital || null;

  // Lógica de saludo basado en el sexo
  // Si el sexo es "MUJER" (ignorando mayúsculas/minúsculas), usar "Bienvenida"
  // En cualquier otro caso (incluyendo null), usar "Bienvenido"
  const saludo = sexo?.toUpperCase() === 'MUJER' ? 'Bienvenida' : 'Bienvenido';

  return (
    <div className="min-h-screen bg-[#101f60]">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* Hero Carousel */}
        <section className="relative mb-12">
          <HeroCarousel />
          {/* Texto fijo sobre el carrusel */}
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white drop-shadow-lg md:text-4xl">
              ¡{saludo}, {nombreCompleto}!
            </h2>
            <p className="text-xl text-white drop-shadow-md md:text-2xl">
              Accede a tu información digital sobre tu beca.
            </p>
          </div>
        </section>

        {/* Acceso Rápido */}
        <AccesoRapido 
          perfilCompleto={perfilCompleto}
          urlCarnet={urlCarnet}
          urlExpediente={urlExpediente}
        />

        {/* Anuncios */}
        <Anuncios />

        {/* Redes Sociales */}
        <RedesSociales />
      </main>
      <DashboardFooter />
    </div>
  );
}

