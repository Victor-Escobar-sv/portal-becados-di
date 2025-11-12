'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Crea una solicitud de horas de voluntariado con bitácora opcional
 * 
 * @param formData - FormData que incluye los campos del formulario y el archivo de bitácora
 * @returns Objeto con éxito y mensaje
 */
export async function crearSolicitudHoras(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
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
        message: 'Error de autenticación. Por favor, inicia sesión nuevamente.',
      };
    }

    // Extraer datos del FormData
    const fechaActividad = formData.get('fecha_actividad') as string;
    const nombreActividad = formData.get('nombre_actividad') as string;
    const cantidadHoras = formData.get('cantidad_horas') as string;
    const responsableEncargado = formData.get('responsable_encargado') as string;
    const bitacoraArchivo = formData.get('bitacora') as File | null;

    // Validaciones
    if (!fechaActividad || !nombreActividad || !cantidadHoras) {
      return {
        success: false,
        message: 'Por favor, completa todos los campos requeridos.',
      };
    }

    const horas = parseInt(cantidadHoras, 10);
    if (isNaN(horas) || horas < 1) {
      return {
        success: false,
        message: 'La cantidad de horas debe ser un número mayor a 0.',
      };
    }

    // Obtener el ID del estudiante
    const { data: estudianteData, error: estudianteError } = await (supabase as any)
      .from('estudiantes')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (estudianteError || !estudianteData) {
      console.error('Error al obtener ID del estudiante:', estudianteError);
      return {
        success: false,
        message: 'Error: No se pudo identificar tu cuenta. Por favor, recarga la página.',
      };
    }

    const estudianteId = estudianteData.id;

    // Variable para almacenar la URL de la bitácora
    let urlBitacora: string | null = null;

    // Si hay archivo, subirlo a Supabase Storage
    if (bitacoraArchivo && bitacoraArchivo.size > 0) {
      try {
        // Validar tamaño del archivo (máx. 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB en bytes
        if (bitacoraArchivo.size > maxSize) {
          return {
            success: false,
            message: 'El archivo es demasiado grande. El tamaño máximo es 10MB.',
          };
        }

        // Validar tipo de archivo
        const tipoArchivo = bitacoraArchivo.type;
        const tiposPermitidos = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'application/pdf',
        ];
        
        if (!tiposPermitidos.includes(tipoArchivo)) {
          return {
            success: false,
            message: 'Formato de archivo no permitido. Solo se aceptan JPEG, PNG y PDF.',
          };
        }

        // Generar nombre único para el archivo
        const timestamp = Date.now();
        const extension = bitacoraArchivo.name.split('.').pop() || 'pdf';
        const nombreArchivo = `${user.id}_${timestamp}.${extension}`;
        const rutaArchivo = `bitacoras/${nombreArchivo}`;

        // Convertir File a ArrayBuffer para subirlo
        const arrayBuffer = await bitacoraArchivo.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // IMPORTANTE: Usar cliente Admin para Storage para evitar problemas de RLS
        // El cliente Admin puede saltarse las políticas RLS de Storage
        const supabaseAdmin = createAdminClient();

        // Subir archivo a Supabase Storage usando cliente Admin
        const { error: uploadError } = await supabaseAdmin.storage
          .from('bitacoras')
          .upload(rutaArchivo, buffer, {
            contentType: tipoArchivo,
            upsert: false, // No sobrescribir si existe
          });

        if (uploadError) {
          console.error('Error al subir bitácora:', uploadError);
          return {
            success: false,
            message: 'Error al subir la bitácora. Por favor, intenta nuevamente.',
          };
        }

        // Obtener la URL pública del archivo (puede usar cualquier cliente)
        const { data: urlData } = supabaseAdmin.storage
          .from('bitacoras')
          .getPublicUrl(rutaArchivo);

        if (urlData?.publicUrl) {
          urlBitacora = urlData.publicUrl;
        } else {
          console.error('No se pudo obtener la URL pública del archivo');
          // Continuar sin la URL, pero registrar el error
        }
      } catch (error) {
        console.error('Error inesperado al procesar la bitácora:', error);
        // Si falla la subida del archivo, continuar sin él
        // pero informar al usuario
        return {
          success: false,
          message: 'Error al procesar la bitácora. Por favor, intenta nuevamente.',
        };
      }
    }

    // Verificar que user.id existe antes de insertar
    if (!user.id) {
      console.error('Error: user.id es null o undefined');
      return {
        success: false,
        message: 'Error de autenticación. Por favor, inicia sesión nuevamente.',
      };
    }

    // Insertar en la tabla solicitudes_horas
    // IMPORTANTE: auth_user_id DEBE estar presente para que RLS funcione
    const solicitudData = {
      estudiante_id: estudianteId,
      auth_user_id: user.id, // CRÍTICO: Necesario para RLS
      fecha_actividad: fechaActividad,
      nombre_actividad: nombreActividad,
      cantidad_horas: horas,
      responsable_encargado: responsableEncargado || 'N/A',
      url_bitacora: urlBitacora,
    };

    // Log para debugging (remover en producción si es necesario)
    console.log('[Crear Solicitud] Datos a insertar:', {
      estudiante_id: estudianteId,
      auth_user_id: user.id,
      fecha_actividad: fechaActividad,
      nombre_actividad: nombreActividad,
      tiene_bitacora: !!urlBitacora,
    });

    const { error: insertError } = await (supabase as any)
      .from('solicitudes_horas')
      .insert(solicitudData);

    if (insertError) {
      console.error('Error al enviar solicitud:', insertError);
      return {
        success: false,
        message: 'Error al enviar la solicitud. Por favor, intenta nuevamente.',
      };
    }

    // Revalidar la página de horas de voluntariado
    revalidatePath('/horas-voluntariado');

    return {
      success: true,
      message: 'Solicitud enviada correctamente.',
    };
  } catch (error) {
    console.error('Error inesperado al crear solicitud:', error);
    return {
      success: false,
      message: 'Error inesperado. Por favor, intenta nuevamente.',
    };
  }
}

