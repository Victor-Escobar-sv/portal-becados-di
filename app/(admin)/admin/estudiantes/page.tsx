import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EstudiantesTable from './EstudiantesTable';

/**
 * Tipo para los estudiantes
 */
type Estudiante = {
  id: string;
  id_becado_interno?: string | null;
  nombre_completo_becado?: string | null;
  universidad?: string | null;
  url_carnet_digital?: string | null;
  url_expediente_digital?: string | null;
  auth_user_id?: string | null;
};

/**
 * Página del Directorio de Estudiantes
 * Muestra todos los estudiantes registrados con opción de resetear perfiles
 */
export default async function EstudiantesPage() {
  const supabase = await createClient();

  // ========== PASO 1: VERIFICAR AUTENTICACIÓN ==========
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ========== PASO 2: VERIFICAR QUE EL USUARIO SEA ADMIN ==========
  const { data: adminData, error: adminError } = await (supabase as any)
    .from('usuarios_administrativos')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const isAdmin = !adminError && adminData !== null;

  if (!isAdmin) {
    redirect('/dashboard');
  }

  // ========== PASO 3: OBTENER TODOS LOS ESTUDIANTES ==========
  const { data: estudiantes, error } = await (supabase as any)
    .from('estudiantes')
    .select('id, id_becado_interno, nombre_completo_becado, universidad, url_carnet_digital, url_expediente_digital, auth_user_id')
    .order('nombre_completo_becado', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error al obtener estudiantes:', error);
  }

  // Mapear los datos a nuestro tipo Estudiante
  const estudiantesData: Estudiante[] = (estudiantes || []).map((est: any) => ({
    id: String(est.id),
    id_becado_interno: est.id_becado_interno || null,
    nombre_completo_becado: est.nombre_completo_becado || null,
    universidad: est.universidad || null,
    url_carnet_digital: est.url_carnet_digital || null,
    url_expediente_digital: est.url_expediente_digital || null,
    auth_user_id: est.auth_user_id || null,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Directorio de Estudiantes
        </h1>
        <p className="text-white/70">
          Gestiona los perfiles de los estudiantes registrados en el sistema.
        </p>
      </div>

      {/* Tabla de Estudiantes */}
      <EstudiantesTable estudiantes={estudiantesData} />
    </div>
  );
}

