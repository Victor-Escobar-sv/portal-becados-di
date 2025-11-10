import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import WizardForm from './WizardForm';

/**
 * Página para completar el perfil del estudiante
 * 
 * VALIDACIÓN:
 * - Solo estudiantes autenticados pueden acceder
 * - Si el perfil ya está completo, redirige a /dashboard
 * - Si no está completo, muestra el formulario
 */
export default async function CompletarPerfilPage() {
  const supabase = await createClient();

  // ========== PASO 1: OBTENER SESIÓN ACTUAL ==========
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si no hay usuario autenticado, redirigir a login
  if (!user) {
    redirect('/login');
  }

  // ========== PASO 2: VERIFICAR SI ES ESTUDIANTE ==========
  // Consultar la tabla estudiantes para obtener todos los datos
  const { data: estudiante, error: estudianteError } = await (supabase as any)
    .from('estudiantes')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  // Si NO es estudiante (no existe el registro o hay error)
  if (estudianteError || !estudiante) {
    // Verificar si es admin
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

    // Si no es ni estudiante ni admin, redirigir a /unauthorized
    redirect('/unauthorized');
  }

  // ========== PASO 3: VERIFICAR SI EL PERFIL ESTÁ COMPLETO ==========
  // Criterio: Si nombre_emergencia tiene datos (no es null ni string vacío),
  // asumimos que el perfil está completo
  const nombreEmergencia = estudiante.nombre_emergencia;
  
  // Verificar si el perfil está completo
  const perfilCompleto = 
    nombreEmergencia && nombreEmergencia.trim() !== '';

  // ========== PASO 4: REDIRECCIÓN SI ESTÁ COMPLETO ==========
  // Si el perfil ya está completo, redirigir a /dashboard
  if (perfilCompleto) {
    redirect('/dashboard');
  }

  // ========== PASO 5: PREPARAR DATOS PARA EL FORMULARIO ==========
  // Si llegamos aquí, el perfil NO está completo
  // Preparar los datos actuales del estudiante para pre-llenar el formulario
  const datosEstudiante = {
    id_becado_interno: estudiante.id_becado_interno || estudiante.id || '',
    nombre_completo_becado: estudiante.nombre_completo_becado || '',
    correo_estudiantil: estudiante.correo_estudiantil || '',
    correo_personal: estudiante.correo_personal || user.email || '',
    sexo: estudiante.sexo || null,
    // Agregar otros campos que puedan existir
    nombre_emergencia: estudiante.nombre_emergencia || '',
    telefono_emergencia: estudiante.telefono_emergencia || '',
    telefono_personal: estudiante.telefono_personal || '',
    telefono_llamada: estudiante.telefono_llamada || estudiante.telefono_personal || '',
    telefono_whatsapp: estudiante.telefono_whatsapp || '',
    id_becado_universidad: estudiante.id_becado_universidad || '',
    universidad: estudiante.universidad || '',
    carrera: estudiante.carrera || '',
    fecha_de_nacimiento: estudiante.fecha_de_nacimiento || estudiante.fecha_nacimiento || '',
    departamento: estudiante.departamento || '',
    municipio: estudiante.municipio || '',
    distrito: estudiante.distrito || '',
    tiene_una_discapacidad: estudiante.tiene_una_discapacidad || false,
    detalle_discapacidad: estudiante.detalle_discapacidad || '',
    miembro_de_consejo: estudiante.miembro_de_consejo || '',
    becado_elite: estudiante.becado_elite || '',
    parentesco_emergencia: estudiante.parentesco_emergencia || '',
    // Cualquier otro campo que pueda existir
  };

  return (
    <div className="min-h-screen bg-[#101f60]">
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
        {/* Título */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            Completa tu Expediente Digital
          </h1>
          <p className="mt-2 text-lg text-white/80">
            Por favor, completa la siguiente información para continuar.
          </p>
        </div>

        {/* Formulario Wizard */}
        <div className="rounded-lg bg-white/10 backdrop-blur-lg border border-white/20 p-6 md:p-8">
          <WizardForm datosEstudiante={datosEstudiante} />
        </div>
      </div>
    </div>
  );
}

