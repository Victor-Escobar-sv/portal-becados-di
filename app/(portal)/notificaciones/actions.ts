'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Obtiene las notificaciones del usuario autenticado
 * 
 * @returns Objeto con las notificaciones y el conteo de no leídas
 */
export async function getMisNotificaciones(): Promise<{
  notificaciones: any[];
  unreadCount: number;
}> {
  try {
    const supabase = await createClient();

    // Obtener el usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error al obtener usuario:', userError);
      return {
        notificaciones: [],
        unreadCount: 0,
      };
    }

    // Query 1: Obtener las últimas 10 notificaciones ordenadas por fecha (más recientes primero)
    const { data: notificaciones, error: notificacionesError } = await (supabase as any)
      .from('notificaciones')
      .select('*')
      .eq('receptor_id', user.id)
      .order('creado_en', { ascending: false })
      .limit(10);

    if (notificacionesError) {
      console.error('Error al obtener notificaciones:', notificacionesError);
      // Continuar con el conteo aunque falle la query de notificaciones
    }

    // Query 2: Contar las notificaciones no leídas
    const { count, error: countError } = await (supabase as any)
      .from('notificaciones')
      .select('id', { count: 'exact', head: true })
      .eq('receptor_id', user.id)
      .eq('leido', false);

    if (countError) {
      console.error('Error al contar notificaciones no leídas:', countError);
    }

    return {
      notificaciones: notificaciones || [],
      unreadCount: count || 0,
    };
  } catch (error) {
    console.error('Error inesperado al obtener notificaciones:', error);
    return {
      notificaciones: [],
      unreadCount: 0,
    };
  }
}

/**
 * Marca todas las notificaciones no leídas del usuario como leídas
 * 
 * @returns Objeto con éxito de la operación
 */
export async function marcarNotificacionesComoLeidas(): Promise<{
  success: boolean;
}> {
  try {
    const supabase = await createClient();

    // Obtener el usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error al obtener usuario:', userError);
      return {
        success: false,
      };
    }

    // Actualizar todas las notificaciones no leídas del usuario
    const { error: updateError } = await (supabase as any)
      .from('notificaciones')
      .update({ leido: true })
      .eq('receptor_id', user.id)
      .eq('leido', false);

    if (updateError) {
      console.error('Error al marcar notificaciones como leídas:', updateError);
      return {
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error inesperado al marcar notificaciones como leídas:', error);
    return {
      success: false,
    };
  }
}

/**
 * Borra una notificación específica del usuario autenticado
 * 
 * @param notificationId - ID de la notificación a borrar
 * @returns Objeto con éxito de la operación
 */
export async function deleteUnaNotificacion(
  notificationId: number | bigint
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();

    // Obtener el usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error al obtener usuario:', userError);
      return {
        success: false,
      };
    }

    // Borrar la notificación solo si pertenece al usuario actual
    const { error: deleteError } = await (supabase as any)
      .from('notificaciones')
      .delete()
      .eq('id', notificationId)
      .eq('receptor_id', user.id);

    if (deleteError) {
      console.error('Error al borrar notificación:', deleteError);
      return {
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error inesperado al borrar notificación:', error);
    return {
      success: false,
    };
  }
}

/**
 * Borra todas las notificaciones del usuario autenticado
 * 
 * @returns Objeto con éxito de la operación
 */
export async function deleteAllMisNotificaciones(): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();

    // Obtener el usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error al obtener usuario:', userError);
      return {
        success: false,
      };
    }

    // Borrar todas las notificaciones del usuario actual
    const { error: deleteError } = await (supabase as any)
      .from('notificaciones')
      .delete()
      .eq('receptor_id', user.id);

    if (deleteError) {
      console.error('Error al borrar todas las notificaciones:', deleteError);
      return {
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error inesperado al borrar todas las notificaciones:', error);
    return {
      success: false,
    };
  }
}

