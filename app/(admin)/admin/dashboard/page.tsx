import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SolicitudesTable from './SolicitudesTable';

/**
 * Tipo para las solicitudes de la vista
 */
type Solicitud = {
  id: string;
  fecha_solicitud: string;
  nombre_completo_becado?: string | null;
  nombre_actividad: string;
  fecha_actividad: string;
  cantidad_horas: number;
  responsable_encargado?: string | null;
};

/**
 * Página del Dashboard Administrativo
 * Muestra las solicitudes pendientes de horas de voluntariado
 */
export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Obtener el usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Consultar vista_solicitudes_admin
  // Filtrar por estado = 'pendiente'
  // Ordenar por fecha_solicitud ascendente (más antiguas primero)
  // NOTA: La vista puede usar 'solicitud_id' como nombre de columna para el ID
  const { data: solicitudes, error } = await (supabase as any)
    .from('vista_solicitudes_admin')
    .select('*')
    .eq('estado', 'pendiente')
    .order('fecha_solicitud', { ascending: true });

  if (error) {
    console.error('Error al obtener solicitudes:', error);
  }

  // Mapear los datos de la vista a nuestro tipo Solicitud
  // IMPORTANTE: La vista 'vista_solicitudes_admin' renombra 'id' a 'solicitud_id'
  // La tabla real 'solicitudes_horas' usa 'id' como PK
  // Por lo tanto, debemos mapear 'solicitud_id' (vista) -> 'id' (componente/acciones)
  const solicitudesData: Solicitud[] = (solicitudes || [])
    .map((s: any) => {
      // La vista usa 'solicitud_id' para el ID de la tabla 'solicitudes_horas'
      const solicitudId = s.solicitud_id;
      
      // Validar que el ID existe y no es undefined
      if (!solicitudId || solicitudId === 'undefined' || solicitudId === undefined) {
        console.error('⚠️ Solicitud sin ID válido encontrada. Campos disponibles:', Object.keys(s));
        console.error('Valores:', {
          solicitud_id: s.solicitud_id,
          estado: s.estado,
        });
        return null;
      }

      return {
        id: String(solicitudId), // Mapear solicitud_id (vista) -> id (componente)
        fecha_solicitud: s.fecha_solicitud || '',
        nombre_completo_becado: s.nombre_completo_becado || null,
        nombre_actividad: s.nombre_actividad || '',
        fecha_actividad: s.fecha_actividad || '',
        cantidad_horas: Number(s.cantidad_horas) || 0,
        responsable_encargado: s.responsable_encargado || null,
      };
    })
    .filter((s): s is Solicitud => s !== null && s.id !== undefined && s.id !== 'undefined');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Solicitudes Pendientes
        </h1>
        <p className="text-white/70">
          Gestiona las solicitudes de horas de voluntariado pendientes de revisión.
        </p>
      </div>

      {/* Tabla de Solicitudes */}
      <SolicitudesTable solicitudes={solicitudesData} />
    </div>
  );
}

