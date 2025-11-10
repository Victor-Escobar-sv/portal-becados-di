'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Rechaza una solicitud de horas de voluntariado
 * 
 * @param solicitudId - ID de la solicitud a rechazar
 * @returns Objeto con éxito y mensaje
 */
export async function rechazarSolicitud(
  solicitudId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Validar que el ID existe y no es undefined
    if (!solicitudId || solicitudId === 'undefined' || solicitudId === undefined) {
      console.error('Error: Intento de rechazar solicitud con ID inválido:', solicitudId);
      return {
        success: false,
        message: 'ID de solicitud inválido.',
      };
    }

    const supabase = await createClient();

    // Actualizar el estado de la solicitud a 'rechazado'
    // IMPORTANTE: La tabla 'solicitudes_horas' usa 'id' como PK (NO 'solicitud_id')
    // El 'solicitudId' que recibimos viene del componente y ya fue mapeado correctamente
    const { error } = await (supabase as any)
      .from('solicitudes_horas')
      .update({ estado: 'rechazado' })
      .eq('id', solicitudId); // La tabla real usa 'id', NO 'solicitud_id'

    if (error) {
      console.error('Error al rechazar solicitud:', error);
      return {
        success: false,
        message: 'Error al rechazar la solicitud. Por favor, intenta nuevamente.',
      };
    }

    // Revalidar el dashboard administrativo
    revalidatePath('/admin/dashboard');

    return {
      success: true,
      message: 'Solicitud rechazada correctamente.',
    };
  } catch (error) {
    console.error('Error inesperado al rechazar solicitud:', error);
    return {
      success: false,
      message: 'Error inesperado. Por favor, intenta nuevamente.',
    };
  }
}

/**
 * Aprueba una solicitud de horas de voluntariado
 * 
 * Flujo:
 * 1. Obtiene la solicitud por ID
 * 2. Obtiene el id_becado_interno y nombre_completo_becado de la tabla estudiantes usando estudiante_id
 * 3. Inserta en horas_voluntariados con los datos de la solicitud (incluyendo nombre y horas editadas si aplica)
 * 4. Actualiza el estado de la solicitud a 'aprobado'
 * 
 * @param solicitudId - ID de la solicitud a aprobar
 * @param horasAprobadas - (Opcional) Cantidad de horas aprobadas. Si no se proporciona, usa la cantidad de la solicitud
 * @returns Objeto con éxito y mensaje
 */
export async function aprobarSolicitud(
  solicitudId: string,
  horasAprobadas?: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Validar que el ID existe y no es undefined
    if (!solicitudId || solicitudId === 'undefined' || solicitudId === undefined) {
      console.error('Error: Intento de aprobar solicitud con ID inválido:', solicitudId);
      return {
        success: false,
        message: 'ID de solicitud inválido.',
      };
    }

    const supabase = await createClient();

    // Paso 1: Obtener la solicitud por ID
    // IMPORTANTE: La tabla 'solicitudes_horas' usa 'id' como PK (NO 'solicitud_id')
    // El 'solicitudId' que recibimos viene del componente y ya fue mapeado correctamente
    const { data: solicitud, error: solicitudError } = await (supabase as any)
      .from('solicitudes_horas')
      .select('*')
      .eq('id', solicitudId) // La tabla real usa 'id', NO 'solicitud_id'
      .single();

    if (solicitudError || !solicitud) {
      console.error('Error al obtener solicitud:', solicitudError);
      console.error('ID usado en la búsqueda:', solicitudId);
      return {
        success: false,
        message: 'No se pudo encontrar la solicitud.',
      };
    }

    // Verificar que la solicitud no esté ya procesada
    if (solicitud.estado === 'aprobado' || solicitud.estado === 'rechazado') {
      return {
        success: false,
        message: 'Esta solicitud ya ha sido procesada.',
      };
    }

    // Paso 2: Obtener el id_becado_interno y nombre_completo_becado de la tabla estudiantes
    const { data: estudiante, error: estudianteError } = await supabase
      .from('estudiantes')
      .select('id_becado_interno, nombre_completo_becado')
      .eq('id', solicitud.estudiante_id)
      .single();

    if (estudianteError || !estudiante) {
      console.error('Error al obtener estudiante:', estudianteError);
      return {
        success: false,
        message: 'No se pudo encontrar el estudiante asociado a esta solicitud.',
      };
    }

    if (!estudiante.id_becado_interno) {
      return {
        success: false,
        message: 'El estudiante no tiene un ID de becado interno asignado.',
      };
    }

    // Validar que el nombre completo exista
    if (!estudiante.nombre_completo_becado || estudiante.nombre_completo_becado.trim() === '') {
      console.error('Error: El estudiante no tiene un nombre completo asignado.');
      return {
        success: false,
        message: 'El estudiante no tiene un nombre completo asignado.',
      };
    }

    // Determinar la cantidad de horas a usar:
    // Si se proporcionó horasAprobadas (editadas por admin), usarlas
    // Si no, usar la cantidad original de la solicitud
    const cantidadHorasFinal = horasAprobadas !== undefined && horasAprobadas !== null
      ? horasAprobadas
      : solicitud.cantidad_horas;

    // Validar que las horas sean un número válido y positivo
    if (isNaN(cantidadHorasFinal) || cantidadHorasFinal <= 0) {
      return {
        success: false,
        message: 'La cantidad de horas debe ser un número mayor a 0.',
      };
    }

    // Paso 3: Insertar en horas_voluntariados
    const horasData = {
      id_becado_interno: estudiante.id_becado_interno,
      nombre_completo_becado: estudiante.nombre_completo_becado,
      fecha_actividad: solicitud.fecha_actividad,
      nombre_actividad: solicitud.nombre_actividad,
      cantidad_horas: cantidadHorasFinal,
      responsable_encargado: solicitud.responsable_encargado || 'N/A',
      estado: 'validado',
    };

    const { error: insertError } = await (supabase as any)
      .from('horas_voluntariados')
      .insert(horasData);

    if (insertError) {
      console.error('Error al insertar horas de voluntariado:', insertError);
      return {
        success: false,
        message: 'Error al registrar las horas de voluntariado. Por favor, intenta nuevamente.',
      };
    }

    // Paso 4: Actualizar el estado de la solicitud a 'aprobado'
    const { error: updateError } = await (supabase as any)
      .from('solicitudes_horas')
      .update({ estado: 'aprobado' })
      .eq('id', solicitudId);

    if (updateError) {
      console.error('Error al actualizar solicitud:', updateError);
      // Nota: Las horas ya se insertaron, pero la solicitud no se marcó como aprobada
      // Esto es un estado inconsistente, pero mejor que perder las horas
      return {
        success: false,
        message: 'Las horas se registraron, pero hubo un error al actualizar el estado de la solicitud.',
      };
    }

    // Paso 5: Revalidar el dashboard administrativo
    revalidatePath('/admin/dashboard');

    return {
      success: true,
      message: 'Solicitud aprobada y horas registradas correctamente.',
    };
  } catch (error) {
    console.error('Error inesperado al aprobar solicitud:', error);
    return {
      success: false,
      message: 'Error inesperado. Por favor, intenta nuevamente.',
    };
  }
}

