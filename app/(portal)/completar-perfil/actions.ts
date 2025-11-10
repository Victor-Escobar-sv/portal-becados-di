'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generarExpediente, generarCarnet, type DatosEstudiante } from '@/lib/generar-documentos';

// Esquema de validación para los datos del formulario
// NOTA: No incluir campos que no existen en la base de datos (ej. 'direccion')
const perfilCompletoSchema = z.object({
  fecha_de_nacimiento: z.string().min(1),
  telefono_llamada: z.string().min(8),
  telefono_whatsapp: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || (val.length >= 8 && val.length <= 15 && /^[0-9-+() ]+$/.test(val)), {
      message: 'El teléfono de WhatsApp debe tener entre 8 y 15 caracteres y solo números',
    })
    .or(z.literal('')),
  id_becado_universidad: z.string().min(1),
  correo_estudiantil: z.string().email().min(1),
  departamento: z.string().min(1),
  municipio: z.string().min(1),
  distrito: z.string().min(1),
  // direccion eliminado: la BD solo tiene departamento, municipio, distrito
  tiene_una_discapacidad: z.boolean(),
  detalle_discapacidad: z.string().optional(),
  miembro_de_consejo: z
    .string()
    .min(1, 'Debes seleccionar si eres miembro del consejo')
    .refine((val) => val === 'SÍ' || val === 'NO', {
      message: 'Debes seleccionar una opción válida',
    }),
  becado_elite: z
    .string()
    .min(1, 'Debes seleccionar si eres becado élite')
    .refine((val) => val === 'SÍ' || val === 'NO', {
      message: 'Debes seleccionar una opción válida',
    }),
  nombre_emergencia: z.string().min(3),
  telefono_emergencia: z.string().min(8),
  parentesco_emergencia: z.string().min(1),
});

type PerfilCompleto = z.infer<typeof perfilCompletoSchema>;

/**
 * Guarda el perfil completo del estudiante
 * 
 * Funcionalidad:
 * 1. Valida los datos del formulario con Zod
 * 2. Obtiene el auth_user_id de la sesión actual
 * 3. Obtiene los datos actuales del estudiante (para id_becado_interno, nombre_completo_becado, etc.)
 * 4. Actualiza la tabla estudiantes con todos los datos recibidos
 * 5. Genera los PDFs del expediente y carnet digital
 * 6. Actualiza las URLs de los documentos generados en la base de datos
 * 7. Revalida las rutas relevantes
 * 
 * @param datos - Datos del formulario validados con el esquema Zod
 * @returns { success: boolean, message: string } - Resultado de la operación
 */
export async function guardarPerfilCompleto(
  datos: PerfilCompleto
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();

    // ========== PASO 1: OBTENER USUARIO AUTENTICADO ==========
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

    // ========== PASO 2: VALIDAR DATOS CON ZOD ==========
    const validacion = perfilCompletoSchema.safeParse(datos);
    if (!validacion.success) {
      console.error('Error de validación:', validacion.error.issues);
      const primerError = validacion.error.issues[0];
      return {
        success: false,
        message: `Error de validación: ${primerError?.message || 'Los datos del formulario no son válidos'}`,
      };
    }

    const datosValidados = validacion.data;

    // ========== PASO 2.5: OBTENER DATOS ACTUALES DEL ESTUDIANTE ==========
    // Necesitamos obtener id_becado_interno, nombre_completo_becado, universidad, carrera, etc.
    // para generar los documentos PDF
    const { data: estudianteActual, error: estudianteError } = await (supabase as any)
      .from('estudiantes')
      .select('id_becado_interno, nombre_completo_becado, universidad, carrera, correo_personal')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (estudianteError || !estudianteActual) {
      console.error('Error al obtener datos del estudiante:', estudianteError);
      return {
        success: false,
        message: 'Error al obtener los datos del estudiante. Por favor, contacta al administrador.',
      };
    }

    if (!estudianteActual.id_becado_interno || !estudianteActual.nombre_completo_becado) {
      console.error('Faltan datos críticos del estudiante:', {
        id_becado_interno: estudianteActual.id_becado_interno,
        nombre_completo_becado: estudianteActual.nombre_completo_becado,
      });
      return {
        success: false,
        message: 'Faltan datos críticos del estudiante. Por favor, contacta al administrador.',
      };
    }

    // Preparar los datos para actualizar (SIN las URLs todavía)
    // IMPORTANTE: Solo incluir columnas que existen en la base de datos
    // La dirección está dividida en: departamento, municipio, distrito (NO existe columna 'direccion')
    const datosUpdate: Record<string, any> = {
      // Datos personales
      fecha_de_nacimiento: datosValidados.fecha_de_nacimiento,
      telefono_llamada: datosValidados.telefono_llamada,
      telefono_whatsapp: datosValidados.telefono_whatsapp || null,
      // Datos académicos
      id_becado_universidad: datosValidados.id_becado_universidad,
      correo_estudiantil: datosValidados.correo_estudiantil,
      // Ubicación (NO incluir 'direccion' - no existe en la BD)
      departamento: datosValidados.departamento,
      municipio: datosValidados.municipio,
      distrito: datosValidados.distrito,
      // Discapacidad
      tiene_una_discapacidad: datosValidados.tiene_una_discapacidad,
      detalle_discapacidad: datosValidados.tiene_una_discapacidad
        ? datosValidados.detalle_discapacidad || null
        : null,
      // Membresía y categoría
      miembro_de_consejo: datosValidados.miembro_de_consejo,
      becado_elite: datosValidados.becado_elite,
      // Contacto de emergencia
      nombre_emergencia: datosValidados.nombre_emergencia,
      telefono_emergencia: datosValidados.telefono_emergencia,
      parentesco_emergencia: datosValidados.parentesco_emergencia,
    };

    // ========== PASO 3: ACTUALIZAR TABLA ESTUDIANTES (sin las URLs todavía) ==========
    // Actualizar la tabla estudiantes con todos los datos del formulario
    const { error: updateError, data: updateData } = await (supabase as any)
      .from('estudiantes')
      .update(datosUpdate)
      .eq('auth_user_id', user.id)
      .select();

    if (updateError) {
      console.error('Error al actualizar perfil:', updateError);
      console.error('Datos que se intentaron actualizar:', datosUpdate);
      console.error('Código de error:', updateError.code);
      console.error('Mensaje de error:', updateError.message);
      console.error('auth_user_id usado:', user.id);
      
      // Si el error es por columna inexistente, proporcionar mensaje más específico
      if (updateError.code === 'PGRST202' || updateError.message?.includes('column') || updateError.message?.includes('does not exist')) {
        return {
          success: false,
          message: `Error: Una o más columnas no existen en la base de datos. Por favor, contacta al administrador. Detalles: ${updateError.message}`,
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
        message: `Error al guardar el perfil: ${updateError.message || 'Error desconocido'}. Por favor, intenta nuevamente.`,
      };
    }

    // Verificar que se actualizó al menos un registro
    if (!updateData || updateData.length === 0) {
      console.error('No se actualizó ningún registro. Verificar que el estudiante existe en la base de datos.');
      return {
        success: false,
        message: 'Error: No se encontró el registro del estudiante. Por favor, contacta al administrador.',
      };
    }

    console.log('Perfil actualizado exitosamente:', {
      estudianteId: updateData[0]?.id,
      authUserId: user.id,
      camposActualizados: Object.keys(datosUpdate),
    });

    // ========== PASO 4: PREPARAR DATOS COMPLETOS PARA GENERAR DOCUMENTOS ==========
    // Preparar objeto con todos los datos necesarios para generar los PDFs
    const datosEstudianteCompletos: DatosEstudiante = {
      id_becado_interno: estudianteActual.id_becado_interno,
      nombre_completo_becado: estudianteActual.nombre_completo_becado,
      fecha_de_nacimiento: datosValidados.fecha_de_nacimiento,
      telefono_llamada: datosValidados.telefono_llamada,
      telefono_whatsapp: datosValidados.telefono_whatsapp || undefined,
      correo_personal: estudianteActual.correo_personal || user.email || undefined,
      universidad: estudianteActual.universidad || undefined,
      carrera: estudianteActual.carrera || undefined,
      id_becado_universidad: datosValidados.id_becado_universidad,
      correo_estudiantil: datosValidados.correo_estudiantil,
      departamento: datosValidados.departamento,
      municipio: datosValidados.municipio,
      distrito: datosValidados.distrito,
      nombre_emergencia: datosValidados.nombre_emergencia,
      telefono_emergencia: datosValidados.telefono_emergencia,
      parentesco_emergencia: datosValidados.parentesco_emergencia,
    };

    // Obtener la URL del logo (opcional: puede venir de una variable de entorno)
    const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || '/logo-direccion-de-integracion.jpeg';

    // ========== PASO 5: GENERAR DOCUMENTOS PDF ==========
    console.log('Generando documentos PDF para:', estudianteActual.id_becado_interno);
    
    const [resultadoExpediente, resultadoCarnet] = await Promise.all([
      generarExpediente(datosEstudianteCompletos, logoUrl),
      generarCarnet(datosEstudianteCompletos, logoUrl),
    ]);

    // Verificar si hubo errores en la generación
    const erroresGeneracion: string[] = [];
    if (!resultadoExpediente.success) {
      console.error('Error al generar expediente:', resultadoExpediente.error);
      erroresGeneracion.push(`Expediente: ${resultadoExpediente.message || resultadoExpediente.error}`);
    }
    if (!resultadoCarnet.success) {
      console.error('Error al generar carnet:', resultadoCarnet.error);
      erroresGeneracion.push(`Carnet: ${resultadoCarnet.message || resultadoCarnet.error}`);
    }

    // ========== PASO 6: ACTUALIZAR URLs EN LA BASE DE DATOS ==========
    // Actualizar las URLs de los documentos generados
    // Si hubo errores, establecer "PENDIENTE" como fallback
    const urlsUpdate: Record<string, any> = {
      url_expediente_digital: resultadoExpediente.success ? resultadoExpediente.url : 'PENDIENTE',
      url_carnet_digital: resultadoCarnet.success ? resultadoCarnet.url : 'PENDIENTE',
    };

    const { error: urlsUpdateError } = await (supabase as any)
      .from('estudiantes')
      .update(urlsUpdate)
      .eq('auth_user_id', user.id);

    if (urlsUpdateError) {
      console.error('Error al actualizar URLs de documentos:', urlsUpdateError);
      // No fallar completamente, pero registrar el error
    } else {
      console.log('URLs de documentos actualizadas exitosamente:', urlsUpdate);
    }

    // ========== PASO 7: REVALIDAR RUTAS ==========
    // Revalidar las rutas relevantes para reflejar los cambios
    revalidatePath('/dashboard');
    revalidatePath('/completar-perfil');

    // Retornar resultado
    if (erroresGeneracion.length > 0) {
      // Si hubo errores, retornar advertencia pero considerar éxito parcial
      return {
        success: true,
        message: `Perfil guardado exitosamente. Advertencia: ${erroresGeneracion.join('; ')}`,
      };
    }

    return {
      success: true,
      message: 'Perfil guardado exitosamente. Tu carnet y expediente digital han sido generados.',
    };
  } catch (error) {
    console.error('Error inesperado al guardar perfil:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      message: `Error inesperado: ${errorMessage}. Por favor, intenta nuevamente.`,
    };
  }
}

