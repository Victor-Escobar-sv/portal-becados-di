'use server';

import { renderToBuffer } from '@react-pdf/renderer';
import { createAdminClient } from '@/lib/supabase/admin';
import ExpedienteDocument, { ExpedientePDFProps } from '@/components/pdf/ExpedientePDF';
import React from 'react';

/**
 * Obtiene la URL absoluta del logo para usar en el PDF
 * Si no se proporciona una URL, intenta construirla desde el dominio público
 */
function obtenerLogoUrl(logoUrl?: string): string | undefined {
  if (logoUrl) {
    // Si ya es una URL absoluta, retornarla tal cual
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      return logoUrl;
    }
    // Si es una ruta relativa, construir la URL absoluta
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || '';
    return `${baseUrl}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
  }
  return undefined;
}

/**
 * Sanea el nombre del archivo para evitar caracteres problemáticos en el sistema de archivos
 * Reemplaza caracteres especiales que pueden causar problemas y normaliza espacios
 * 
 * @param nombre - Nombre a sanear
 * @returns Nombre saneado listo para usar en nombres de archivo
 */
function sanearNombreArchivo(nombre: string): string {
  if (!nombre) return 'SinNombre';
  
  // Normalizar el nombre: trim, eliminar espacios múltiples
  let nombreSaneado = nombre.trim().replace(/\s+/g, ' ');
  
  // Reemplazar caracteres problemáticos comunes en nombres de archivo
  // Mantener: letras, números, espacios, guiones, guiones bajos, puntos
  // Reemplazar otros caracteres especiales con guiones
  nombreSaneado = nombreSaneado.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-');
  
  // Eliminar guiones múltiples consecutivos
  nombreSaneado = nombreSaneado.replace(/-+/g, '-');
  
  // Eliminar guiones al inicio y final
  nombreSaneado = nombreSaneado.replace(/^-+|-+$/g, '');
  
  // Limitar la longitud (Supabase Storage tiene límites, mantenerlo razonable)
  // 200 caracteres debería ser suficiente, pero cortamos a 150 para estar seguros
  if (nombreSaneado.length > 150) {
    nombreSaneado = nombreSaneado.substring(0, 150).trim();
  }
  
  // Si después de sanear queda vacío, usar un valor por defecto
  if (!nombreSaneado || nombreSaneado.length === 0) {
    return 'SinNombre';
  }
  
  return nombreSaneado;
}

// Tipo para los datos del estudiante (puede ser cualquier objeto con los campos necesarios)
export interface DatosEstudiante {
  id_becado_interno?: string;
  nombre_completo_becado?: string;
  fecha_de_nacimiento?: string;
  telefono_llamada?: string;
  telefono_whatsapp?: string;
  correo_personal?: string;
  universidad?: string;
  carrera?: string;
  id_becado_universidad?: string;
  correo_estudiantil?: string;
  departamento?: string;
  municipio?: string;
  distrito?: string;
  nombre_emergencia?: string;
  telefono_emergencia?: string;
  parentesco_emergencia?: string;
  [key: string]: any; // Permite campos adicionales
}

// Tipo de respuesta para las funciones de generación
export interface ResultadoGeneracion {
  success: boolean;
  url?: string;
  error?: string;
  message?: string;
}

/**
 * Genera el PDF del Expediente Digital y lo sube a Supabase Storage
 * 
 * @param estudiante - Objeto con los datos del estudiante
 * @param logoUrl - URL opcional del logo (debe ser una URL absoluta accesible públicamente)
 * @returns Resultado con la URL pública del PDF o error
 */
export async function generarExpediente(
  estudiante: DatosEstudiante,
  logoUrl?: string
): Promise<ResultadoGeneracion> {
  try {
    // Validar que existan los campos mínimos requeridos
    if (!estudiante.id_becado_interno) {
      return {
        success: false,
        error: 'Falta el ID del becado interno',
        message: 'No se puede generar el expediente sin el ID del becado interno',
      };
    }

    if (!estudiante.nombre_completo_becado) {
      return {
        success: false,
        error: 'Falta el nombre completo del becado',
        message: 'No se puede generar el expediente sin el nombre completo',
      };
    }

    // Obtener la URL del logo (convertir a URL absoluta si es necesario)
    const logoUrlAbsoluta = obtenerLogoUrl(logoUrl);

    // Preparar los datos para el componente PDF
    const datosPDF: ExpedientePDFProps = {
      nombreCompleto: estudiante.nombre_completo_becado,
      idBecado: estudiante.id_becado_interno,
      fechaNacimiento: estudiante.fecha_de_nacimiento,
      telefonoLlamada: estudiante.telefono_llamada,
      telefonoWhatsapp: estudiante.telefono_whatsapp,
      correoPersonal: estudiante.correo_personal,
      universidad: estudiante.universidad,
      carrera: estudiante.carrera,
      idBecadoUniversidad: estudiante.id_becado_universidad,
      correoEstudiantil: estudiante.correo_estudiantil,
      departamento: estudiante.departamento,
      municipio: estudiante.municipio,
      distrito: estudiante.distrito,
      nombreEmergencia: estudiante.nombre_emergencia,
      telefonoEmergencia: estudiante.telefono_emergencia,
      parentescoEmergencia: estudiante.parentesco_emergencia,
      logoUrl: logoUrlAbsoluta,
    };

    // Generar el PDF como buffer
    console.log('[Generar Expediente] Generando PDF para:', estudiante.id_becado_interno);
    const pdfBuffer = await renderToBuffer(React.createElement(ExpedienteDocument, datosPDF) as any);
    console.log('[Generar Expediente] PDF generado exitosamente, tamaño:', pdfBuffer.length, 'bytes');

    // Crear el cliente Admin de Supabase para subir el archivo
    const supabaseAdmin = createAdminClient();

    // Sanear el nombre completo para usar en el nombre del archivo
    const nombreCompletoSaneado = sanearNombreArchivo(estudiante.nombre_completo_becado);
    
    // Nombre del archivo: expedientes/Expediente Digital - [Nombre Completo].pdf
    const nombreArchivo = `expedientes/Expediente Digital - ${nombreCompletoSaneado}.pdf`;
    const bucket = 'documentos';

    // Subir el archivo a Supabase Storage
    // renderToBuffer retorna un Buffer de Node.js, que es compatible con Supabase Storage
    console.log('[Generar Expediente] Subiendo archivo a Storage:', nombreArchivo);
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(nombreArchivo, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Si el archivo existe, lo sobrescribe
      });

    if (uploadError) {
      console.error('[Generar Expediente] Error al subir archivo:', uploadError);
      return {
        success: false,
        error: uploadError.message,
        message: `Error al subir el expediente: ${uploadError.message}`,
      };
    }

    console.log('[Generar Expediente] Archivo subido exitosamente:', uploadData.path);

    // Obtener la URL pública del archivo
    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(nombreArchivo);

    if (!urlData?.publicUrl) {
      return {
        success: false,
        error: 'No se pudo obtener la URL pública',
        message: 'El archivo se subió pero no se pudo obtener la URL pública',
      };
    }

    console.log('[Generar Expediente] URL pública generada:', urlData.publicUrl);

    return {
      success: true,
      url: urlData.publicUrl,
      message: 'Expediente generado y subido exitosamente',
    };
  } catch (error) {
    console.error('[Generar Expediente] Error inesperado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      error: errorMessage,
      message: `Error al generar el expediente: ${errorMessage}`,
    };
  }
}

/**
 * Genera el PDF del Carnet Digital y lo sube a Supabase Storage
 * 
 * NOTA: Por ahora, esta función es un placeholder que genera un PDF simple
 * con el nombre del estudiante. Se puede mejorar más adelante con un diseño
 * más elaborado del carnet.
 * 
 * @param estudiante - Objeto con los datos del estudiante
 * @param logoUrl - URL opcional del logo (debe ser una URL absoluta accesible públicamente)
 * @returns Resultado con la URL pública del PDF o error
 */
export async function generarCarnet(
  estudiante: DatosEstudiante,
  logoUrl?: string
): Promise<ResultadoGeneracion> {
  try {
    // Validar que existan los campos mínimos requeridos
    if (!estudiante.id_becado_interno) {
      return {
        success: false,
        error: 'Falta el ID del becado interno',
        message: 'No se puede generar el carnet sin el ID del becado interno',
      };
    }

    if (!estudiante.nombre_completo_becado) {
      return {
        success: false,
        error: 'Falta el nombre completo del becado',
        message: 'No se puede generar el carnet sin el nombre completo',
      };
    }

    // Obtener la URL del logo (convertir a URL absoluta si es necesario)
    const logoUrlAbsoluta = obtenerLogoUrl(logoUrl);

    // Por ahora, usar el componente de Expediente como placeholder
    // TODO: Crear un componente CarnetPDF.tsx específico para el carnet
    const datosPDF: ExpedientePDFProps = {
      nombreCompleto: estudiante.nombre_completo_becado,
      idBecado: estudiante.id_becado_interno,
      fechaNacimiento: estudiante.fecha_de_nacimiento,
      telefonoLlamada: estudiante.telefono_llamada,
      telefonoWhatsapp: estudiante.telefono_whatsapp,
      correoPersonal: estudiante.correo_personal,
      universidad: estudiante.universidad,
      carrera: estudiante.carrera,
      idBecadoUniversidad: estudiante.id_becado_universidad,
      correoEstudiantil: estudiante.correo_estudiantil,
      departamento: estudiante.departamento,
      municipio: estudiante.municipio,
      distrito: estudiante.distrito,
      nombreEmergencia: estudiante.nombre_emergencia,
      telefonoEmergencia: estudiante.telefono_emergencia,
      parentescoEmergencia: estudiante.parentesco_emergencia,
      logoUrl: logoUrlAbsoluta,
    };

    // Generar el PDF como buffer (placeholder: usando ExpedienteDocument por ahora)
    console.log('[Generar Carnet] Generando PDF para:', estudiante.id_becado_interno);
    const pdfBuffer = await renderToBuffer(React.createElement(ExpedienteDocument, datosPDF) as any);
    console.log('[Generar Carnet] PDF generado exitosamente, tamaño:', pdfBuffer.length, 'bytes');

    // Crear el cliente Admin de Supabase para subir el archivo
    const supabaseAdmin = createAdminClient();

    // Sanear el nombre completo para usar en el nombre del archivo
    const nombreCompletoSaneado = sanearNombreArchivo(estudiante.nombre_completo_becado);
    
    // Nombre del archivo: carnets/Carnet Digital - [Nombre Completo].pdf
    // NOTA: Por ahora usamos .pdf ya que estamos usando ExpedienteDocument como placeholder
    // Cuando se implemente CarnetPDF.tsx, se puede cambiar a .png si es necesario
    const nombreArchivo = `carnets/Carnet Digital - ${nombreCompletoSaneado}.pdf`;
    const bucket = 'documentos';

    // Subir el archivo a Supabase Storage
    // renderToBuffer retorna un Buffer de Node.js, que es compatible con Supabase Storage
    console.log('[Generar Carnet] Subiendo archivo a Storage:', nombreArchivo);
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(nombreArchivo, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Si el archivo existe, lo sobrescribe
      });

    if (uploadError) {
      console.error('[Generar Carnet] Error al subir archivo:', uploadError);
      return {
        success: false,
        error: uploadError.message,
        message: `Error al subir el carnet: ${uploadError.message}`,
      };
    }

    console.log('[Generar Carnet] Archivo subido exitosamente:', uploadData.path);

    // Obtener la URL pública del archivo
    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(nombreArchivo);

    if (!urlData?.publicUrl) {
      return {
        success: false,
        error: 'No se pudo obtener la URL pública',
        message: 'El archivo se subió pero no se pudo obtener la URL pública',
      };
    }

    console.log('[Generar Carnet] URL pública generada:', urlData.publicUrl);

    return {
      success: true,
      url: urlData.publicUrl,
      message: 'Carnet generado y subido exitosamente',
    };
  } catch (error) {
    console.error('[Generar Carnet] Error inesperado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      error: errorMessage,
      message: `Error al generar el carnet: ${errorMessage}`,
    };
  }
}

/**
 * Genera tanto el expediente como el carnet en paralelo
 * 
 * @param estudiante - Objeto con los datos del estudiante
 * @param logoUrl - URL opcional del logo
 * @returns Resultado con las URLs de ambos documentos o errores
 */
export async function generarDocumentosCompletos(
  estudiante: DatosEstudiante,
  logoUrl?: string
): Promise<{
  expediente: ResultadoGeneracion;
  carnet: ResultadoGeneracion;
}> {
  // Ejecutar ambas generaciones en paralelo
  const [expediente, carnet] = await Promise.all([
    generarExpediente(estudiante, logoUrl),
    generarCarnet(estudiante, logoUrl),
  ]);

  return {
    expediente,
    carnet,
  };
}

