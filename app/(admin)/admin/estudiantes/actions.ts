'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

/**
 * Resetea el perfil de un estudiante, eliminando los datos editables del wizard
 * para permitir que el estudiante vuelva a completar el formulario
 * 
 * Seguridad:
 * - Verifica que el usuario que llama a la acción sea ADMIN
 * - Solo resetea campos editables del wizard, mantiene datos críticos
 * 
 * @param estudianteId - ID del estudiante a resetear (puede ser el ID numérico o id_becado_interno)
 * @returns Objeto con éxito y mensaje
 */
export async function resetearPerfilEstudiante(
  estudianteId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // ========== PASO 1: VALIDAR ENTRADA ==========
    if (!estudianteId || estudianteId.trim() === '') {
      return {
        success: false,
        message: 'ID de estudiante inválido.',
      };
    }

    const supabase = await createClient();

    // ========== PASO 2: VERIFICAR USUARIO AUTENTICADO ==========
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error al obtener usuario:', userError);
      return {
        success: false,
        message: 'No hay usuario autenticado. Por favor, inicia sesión nuevamente.',
      };
    }

    // ========== PASO 3: VERIFICAR QUE EL USUARIO SEA ADMIN ==========
    const { data: adminData, error: adminError } = await (supabase as any)
      .from('usuarios_administrativos')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const isAdmin = !adminError && adminData !== null;

    if (!isAdmin) {
      console.error('Intento de resetear perfil por usuario no admin:', user.id);
      return {
        success: false,
        message: 'No tienes permisos para realizar esta acción. Solo los administradores pueden resetear perfiles.',
      };
    }

    // ========== PASO 4: VERIFICAR QUE EL ESTUDIANTE EXISTA ==========
    // Intentar buscar por ID numérico primero, luego por id_becado_interno
    const { data: estudiante, error: estudianteError } = await (supabase as any)
      .from('estudiantes')
      .select('id, id_becado_interno, nombre_completo_becado')
      .or(`id.eq.${estudianteId},id_becado_interno.eq.${estudianteId}`)
      .maybeSingle();

    if (estudianteError || !estudiante) {
      console.error('Error al buscar estudiante:', estudianteError);
      return {
        success: false,
        message: 'No se pudo encontrar el estudiante especificado.',
      };
    }

    const estudianteIdNumero = estudiante.id;

    // ========== PASO 5: ACTUALIZAR CAMPOS EDITABLES A NULL ==========
    // Solo resetear campos editables del wizard, mantener datos críticos
    const datosReset = {
      // Datos personales editables
      fecha_de_nacimiento: null,
      telefono_llamada: null,
      telefono_whatsapp: null,
      // DUI (si existiera, aunque no lo usamos actualmente)
      // dui: null, // Descomentar si el campo existe en la BD
      
      // Datos académicos editables
      id_becado_universidad: null,
      correo_estudiantil: null,
      
      // Ubicación (editables)
      departamento: null,
      municipio: null,
      distrito: null,
      
      // Contacto de emergencia (editables)
      nombre_emergencia: null,
      telefono_emergencia: null,
      parentesco_emergencia: null,
      
      // Información adicional (editables)
      tiene_una_discapacidad: null,
      detalle_discapacidad: null,
      miembro_de_consejo: null,
      becado_elite: null,
      
      // URLs de documentos (importantes: resetear para forzar regeneración)
      url_carnet_digital: null,
      url_expediente_digital: null,
    };

    // ========== PASO 6: EJECUTAR UPDATE ==========
    const { error: updateError, data: updateData } = await (supabase as any)
      .from('estudiantes')
      .update(datosReset)
      .eq('id', estudianteIdNumero)
      .select();

    if (updateError) {
      console.error('Error al resetear perfil:', updateError);
      console.error('Código de error:', updateError.code);
      console.error('Mensaje de error:', updateError.message);
      console.error('Estudiante ID usado:', estudianteIdNumero);
      
      // Si el error es por columna inexistente, proporcionar mensaje más específico
      if (updateError.code === 'PGRST202' || updateError.message?.includes('column') || updateError.message?.includes('does not exist')) {
        return {
          success: false,
          message: `Error: Una o más columnas no existen en la base de datos. Por favor, contacta al administrador del sistema. Detalles: ${updateError.message}`,
        };
      }
      
      // Si el error es por RLS (Row Level Security), proporcionar mensaje más específico
      if (updateError.code === 'PGRST301' || updateError.message?.includes('permission') || updateError.message?.includes('policy')) {
        return {
          success: false,
          message: 'Error de permisos: No tienes permiso para actualizar este perfil. Por favor, contacta al administrador.',
        };
      }
      
      return {
        success: false,
        message: `Error al resetear el perfil: ${updateError.message || 'Error desconocido'}. Por favor, intenta nuevamente.`,
      };
    }

    // Verificar que se actualizó al menos un registro
    if (!updateData || updateData.length === 0) {
      console.error('No se actualizó ningún registro. Verificar que el estudiante existe.');
      return {
        success: false,
        message: 'Error: No se encontró el registro del estudiante. Por favor, verifica el ID.',
      };
    }

    console.log('Perfil reseteado exitosamente:', {
      estudianteId: estudianteIdNumero,
      idBecadoInterno: estudiante.id_becado_interno,
      nombreCompleto: estudiante.nombre_completo_becado,
      camposReseteados: Object.keys(datosReset),
      adminUserId: user.id,
    });

    // ========== PASO 7: REVALIDAR RUTAS ==========
    // Revalidar las rutas relevantes para reflejar los cambios
    revalidatePath('/admin/estudiantes');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Perfil de ${estudiante.nombre_completo_becado || estudiante.id_becado_interno || 'estudiante'} reseteado exitosamente. El estudiante podrá completar el formulario nuevamente.`,
    };
  } catch (error) {
    console.error('Error inesperado al resetear perfil:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      message: `Error inesperado: ${errorMessage}. Por favor, intenta nuevamente.`,
    };
  }
}

/**
 * Desvincula completamente la cuenta de acceso de un estudiante
 * 
 * Esta acción realiza un BORRADO TOTAL de la cuenta:
 * 1. Desvincula el estudiante en la base de datos (auth_user_id = null, genera nuevo token)
 * 2. Elimina el usuario de Supabase Auth definitivamente
 * 
 * Seguridad:
 * - Verifica que el usuario que llama a la acción sea ADMIN
 * - Usa cliente Admin para borrar usuarios de Auth (requiere SERVICE_ROLE_KEY)
 * 
 * IMPORTANTE: Esta acción es IRREVERSIBLE. El estudiante perderá acceso completo
 * y necesitará un nuevo token de activación para crear una nueva cuenta.
 * 
 * @param estudianteId - ID del estudiante a desvincular (puede ser el ID numérico o id_becado_interno)
 * @returns Objeto con éxito y mensaje
 */
export async function desvincularCuentaEstudiante(
  estudianteId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // ========== PASO 1: VALIDAR ENTRADA ==========
    if (!estudianteId || estudianteId.trim() === '') {
      return {
        success: false,
        message: 'ID de estudiante inválido.',
      };
    }

    const supabase = await createClient();

    // ========== PASO 2: VERIFICAR USUARIO AUTENTICADO ==========
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error al obtener usuario:', userError);
      return {
        success: false,
        message: 'No hay usuario autenticado. Por favor, inicia sesión nuevamente.',
      };
    }

    // ========== PASO 3: VERIFICAR QUE EL USUARIO SEA ADMIN ==========
    const { data: adminData, error: adminError } = await (supabase as any)
      .from('usuarios_administrativos')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const isAdmin = !adminError && adminData !== null;

    if (!isAdmin) {
      console.error('Intento de desvincular cuenta por usuario no admin:', user.id);
      return {
        success: false,
        message: 'No tienes permisos para realizar esta acción. Solo los administradores pueden desvincular cuentas.',
      };
    }

    // ========== PASO 4: OBTENER AUTH_USER_ID DEL ESTUDIANTE ==========
    // Intentar buscar por ID numérico primero, luego por id_becado_interno
    const { data: estudiante, error: estudianteError } = await (supabase as any)
      .from('estudiantes')
      .select('id, id_becado_interno, nombre_completo_becado, auth_user_id')
      .or(`id.eq.${estudianteId},id_becado_interno.eq.${estudianteId}`)
      .maybeSingle();

    if (estudianteError || !estudiante) {
      console.error('Error al buscar estudiante:', estudianteError);
      return {
        success: false,
        message: 'No se pudo encontrar el estudiante especificado.',
      };
    }

    const estudianteIdNumero = estudiante.id;
    const authUserId = estudiante.auth_user_id;

    // ========== PASO 5: DESVINCULAR EN DB (PRIMERO) ==========
    // Generar un nuevo UUID para el onboarding_token
    const nuevoOnboardingToken = randomUUID();

    // Actualizar la tabla estudiantes para desvincular la cuenta
    // IMPORTANTE: Hacer esto PRIMERO para evitar problemas de FK si el usuario se borra antes
    const datosDesvinculacion = {
      auth_user_id: null,
      ha_completado_onboarding: false,
      onboarding_token: nuevoOnboardingToken,
    };

    const { error: updateError, data: updateData } = await (supabase as any)
      .from('estudiantes')
      .update(datosDesvinculacion)
      .eq('id', estudianteIdNumero)
      .select();

    if (updateError) {
      console.error('Error al desvincular estudiante en DB:', updateError);
      console.error('Código de error:', updateError.code);
      console.error('Mensaje de error:', updateError.message);
      console.error('Estudiante ID usado:', estudianteIdNumero);
      
      // Si el error es por columna inexistente, proporcionar mensaje más específico
      if (updateError.code === 'PGRST202' || updateError.message?.includes('column') || updateError.message?.includes('does not exist')) {
        return {
          success: false,
          message: `Error: Una o más columnas no existen en la base de datos. Por favor, contacta al administrador del sistema. Detalles: ${updateError.message}`,
        };
      }
      
      // Si el error es por RLS (Row Level Security), proporcionar mensaje más específico
      if (updateError.code === 'PGRST301' || updateError.message?.includes('permission') || updateError.message?.includes('policy')) {
        return {
          success: false,
          message: 'Error de permisos: No tienes permiso para actualizar este registro. Por favor, contacta al administrador.',
        };
      }
      
      return {
        success: false,
        message: `Error al desvincular el estudiante en la base de datos: ${updateError.message || 'Error desconocido'}. Por favor, intenta nuevamente.`,
      };
    }

    // Verificar que se actualizó al menos un registro
    if (!updateData || updateData.length === 0) {
      console.error('No se actualizó ningún registro. Verificar que el estudiante existe.');
      return {
        success: false,
        message: 'Error: No se encontró el registro del estudiante. Por favor, verifica el ID.',
      };
    }

    console.log('Estudiante desvinculado en DB exitosamente:', {
      estudianteId: estudianteIdNumero,
      idBecadoInterno: estudiante.id_becado_interno,
      nombreCompleto: estudiante.nombre_completo_becado,
      nuevoOnboardingToken: nuevoOnboardingToken,
      adminUserId: user.id,
    });

    // ========== PASO 6: BORRAR DE AUTH (SEGUNDO) ==========
    // Solo borrar de Auth si existe un auth_user_id
    if (authUserId) {
      try {
        // Usar cliente Admin para borrar el usuario de Auth
        // Este cliente tiene permisos de superusuario y puede borrar usuarios
        const supabaseAdmin = createAdminClient();

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

        if (deleteError) {
          console.error('Error al borrar usuario de Auth:', deleteError);
          console.error('Código de error:', deleteError.code);
          console.error('Mensaje de error:', deleteError.message);
          console.error('Auth User ID:', authUserId);
          
          // Aunque falle el borrado de Auth, la desvinculación en DB ya se hizo
          // Registramos el error pero consideramos la operación parcialmente exitosa
          console.warn('⚠️ ADVERTENCIA: El estudiante fue desvinculado en DB, pero el usuario de Auth no pudo ser borrado. Auth User ID:', authUserId);
          
          // Opcional: Podríamos revertir la desvinculación en DB si falla el borrado de Auth
          // Por ahora, dejamos que el admin sepa que hubo un problema
          return {
            success: false,
            message: `El estudiante fue desvinculado en la base de datos, pero hubo un error al borrar el usuario de Auth: ${deleteError.message || 'Error desconocido'}. Por favor, contacta al administrador del sistema.`,
          };
        }

        console.log('Usuario de Auth borrado exitosamente:', {
          authUserId: authUserId,
          estudianteId: estudianteIdNumero,
        });
      } catch (authError) {
        console.error('Error inesperado al borrar usuario de Auth:', authError);
        const errorMessage = authError instanceof Error ? authError.message : 'Error desconocido';
        return {
          success: false,
          message: `El estudiante fue desvinculado en la base de datos, pero hubo un error inesperado al borrar el usuario de Auth: ${errorMessage}. Por favor, contacta al administrador del sistema.`,
        };
      }
    } else {
      // Si no hay auth_user_id, el estudiante ya estaba desvinculado
      console.log('El estudiante no tenía auth_user_id, solo se actualizó el onboarding_token:', {
        estudianteId: estudianteIdNumero,
        nuevoOnboardingToken: nuevoOnboardingToken,
      });
    }

    // ========== PASO 7: REVALIDAR RUTAS ==========
    // Revalidar las rutas relevantes para reflejar los cambios
    revalidatePath('/admin/estudiantes');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Cuenta de ${estudiante.nombre_completo_becado || estudiante.id_becado_interno || 'estudiante'} desvinculada exitosamente. El usuario de Auth ha sido eliminado y se ha generado un nuevo token de activación.`,
    };
  } catch (error) {
    console.error('Error inesperado al desvincular cuenta:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      message: `Error inesperado: ${errorMessage}. Por favor, intenta nuevamente.`,
    };
  }
}

