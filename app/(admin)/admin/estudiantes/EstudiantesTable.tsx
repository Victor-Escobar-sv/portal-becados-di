'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, X, Unlink } from 'lucide-react';
import { resetearPerfilEstudiante, desvincularCuentaEstudiante } from './actions';
import { useRouter } from 'next/navigation';

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

interface EstudiantesTableProps {
  estudiantes: Estudiante[];
}

/**
 * Determina el estado del perfil basado en las URLs de los documentos
 * 
 * Criterio:
 * - "Completo": Si al menos una de las URLs (carnet o expediente) tiene un valor (no es NULL)
 *   Esto incluye el caso de "PENDIENTE", que indica que el formulario fue completado
 *   pero los documentos están en proceso de generación
 * - "Pendiente": Si ambas URLs son NULL, lo que indica que el formulario no ha sido completado
 * 
 * @param urlCarnet - URL del carnet digital
 * @param urlExpediente - URL del expediente digital
 * @returns 'Completo' si al menos una URL tiene valor, 'Pendiente' si ambas son NULL
 */
function obtenerEstadoPerfil(
  urlCarnet: string | null | undefined,
  urlExpediente: string | null | undefined
): 'Completo' | 'Pendiente' {
  // Verificar si al menos una de las URLs tiene un valor (no es NULL)
  // Incluye el caso de "PENDIENTE" que indica que el formulario fue completado
  const tieneCarnet = urlCarnet !== null && urlCarnet !== undefined && urlCarnet.trim() !== '';
  const tieneExpediente = urlExpediente !== null && urlExpediente !== undefined && urlExpediente.trim() !== '';
  
  // El perfil está completo si al menos una de las URLs tiene un valor
  // (incluso si es "PENDIENTE", porque eso significa que el formulario fue completado)
  if (tieneCarnet || tieneExpediente) {
    return 'Completo';
  }
  
  // Si ambas URLs son NULL, el perfil está pendiente
  return 'Pendiente';
}

/**
 * Componente Client para mostrar la tabla de estudiantes con acciones
 */
export default function EstudiantesTable({ estudiantes }: EstudiantesTableProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [estudianteAResetear, setEstudianteAResetear] = useState<Estudiante | null>(null);
  const [isReseteando, setIsReseteando] = useState(false);
  const [estudianteADesvincular, setEstudianteADesvincular] = useState<Estudiante | null>(null);
  const [isDesvinculando, setIsDesvinculando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Verificar que el componente está montado para usar Portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Limpiar mensajes después de 5 segundos
  useEffect(() => {
    if (mensajeExito) {
      const timeout = setTimeout(() => {
        setMensajeExito(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [mensajeExito]);

  useEffect(() => {
    if (mensajeError) {
      const timeout = setTimeout(() => {
        setMensajeError(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [mensajeError]);

  // Abrir modal de confirmación
  const handleAbrirModalResetear = (estudiante: Estudiante) => {
    // Validar que el ID existe
    if (!estudiante.id || estudiante.id === 'undefined' || estudiante.id === undefined) {
      console.error('Error: Intento de resetear perfil con ID inválido:', estudiante.id);
      setMensajeError('Error: ID de estudiante inválido.');
      return;
    }

    if (isReseteando) return;
    
    setEstudianteAResetear(estudiante);
  };

  // Cerrar modal de confirmación
  const handleCerrarModal = useCallback(() => {
    if (isReseteando) return; // No permitir cerrar durante el proceso
    setEstudianteAResetear(null);
  }, [isReseteando]);

  // Manejar escape key para cerrar modal de resetear
  useEffect(() => {
    if (!estudianteAResetear || isReseteando) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCerrarModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [estudianteAResetear, isReseteando, handleCerrarModal]);

  // Abrir modal de desvinculación
  const handleAbrirModalDesvincular = (estudiante: Estudiante) => {
    // Validar que el ID existe
    if (!estudiante.id || estudiante.id === 'undefined' || estudiante.id === undefined) {
      console.error('Error: Intento de desvincular cuenta con ID inválido:', estudiante.id);
      setMensajeError('Error: ID de estudiante inválido.');
      return;
    }

    // Validar que el estudiante tiene una cuenta activa
    if (!estudiante.auth_user_id) {
      setMensajeError('Este estudiante no tiene una cuenta activa para desvincular.');
      return;
    }

    if (isDesvinculando) return;
    
    setEstudianteADesvincular(estudiante);
  };

  // Cerrar modal de desvinculación
  const handleCerrarModalDesvincular = useCallback(() => {
    if (isDesvinculando) return; // No permitir cerrar durante el proceso
    setEstudianteADesvincular(null);
  }, [isDesvinculando]);

  // Manejar escape key para cerrar modal de desvinculación
  useEffect(() => {
    if (!estudianteADesvincular || isDesvinculando) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCerrarModalDesvincular();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [estudianteADesvincular, isDesvinculando, handleCerrarModalDesvincular]);

  // Confirmar desvincular cuenta
  const handleConfirmarDesvincular = async () => {
    if (!estudianteADesvincular || isDesvinculando) return;

    setIsDesvinculando(true);
    setProcessingId(estudianteADesvincular.id);

    try {
      const result = await desvincularCuentaEstudiante(estudianteADesvincular.id);
      
      if (result.success) {
        // Cerrar el modal
        setEstudianteADesvincular(null);
        // Mostrar mensaje de éxito
        setMensajeExito(result.message);
        // Refrescar la tabla
        router.refresh();
      } else {
        // Mostrar error como toast
        setMensajeError(result.message);
      }
    } catch (error) {
      console.error('Error al desvincular cuenta:', error);
      setMensajeError('Error inesperado al desvincular la cuenta del estudiante.');
    } finally {
      setIsDesvinculando(false);
      setProcessingId(null);
    }
  };

  // Confirmar resetear perfil
  const handleConfirmarResetear = async () => {
    if (!estudianteAResetear || isReseteando) return;

    setIsReseteando(true);
    setProcessingId(estudianteAResetear.id);

    try {
      const result = await resetearPerfilEstudiante(estudianteAResetear.id);
      
      if (result.success) {
        // Cerrar el modal
        setEstudianteAResetear(null);
        // Mostrar mensaje de éxito
        setMensajeExito(result.message);
        // Refrescar la tabla
        router.refresh();
      } else {
        // Mostrar error como toast
        setMensajeError(result.message);
      }
    } catch (error) {
      console.error('Error al resetear perfil:', error);
      setMensajeError('Error inesperado al resetear el perfil del estudiante.');
    } finally {
      setIsReseteando(false);
      setProcessingId(null);
    }
  };

  if (estudiantes.length === 0) {
    return (
      <div className="rounded-lg bg-white/10 backdrop-blur-lg border border-white/20 p-8 text-center">
        <p className="text-white/80 text-lg">
          No hay estudiantes registrados en el sistema.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mensaje de éxito temporal */}
      {mensajeExito && isMounted && createPortal(
        <div className="fixed top-4 right-4 z-[70] rounded-lg bg-green-600 px-4 py-3 text-white shadow-lg animate-in slide-in-from-top-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{mensajeExito}</span>
            <button
              onClick={() => setMensajeExito(null)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Cerrar mensaje"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Mensaje de error temporal */}
      {mensajeError && isMounted && createPortal(
        <div className="fixed top-4 right-4 z-[70] rounded-lg bg-red-600 px-4 py-3 text-white shadow-lg animate-in slide-in-from-top-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{mensajeError}</span>
            <button
              onClick={() => setMensajeError(null)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Cerrar mensaje"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Confirmación de Resetear Perfil - Renderizado con Portal en nivel superior */}
      {isMounted && estudianteAResetear && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleCerrarModal}
        >
          <div 
            className="w-full max-w-md rounded-lg bg-[#101f60] border border-red-500/30 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-500/20 p-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  ¿Estás absolutamente seguro?
                </h2>
              </div>
              {!isReseteando && (
                <button
                  onClick={handleCerrarModal}
                  className="text-white/60 hover:text-white transition-colors"
                  aria-label="Cerrar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            {/* Descripción */}
            <div className="mb-6 space-y-3">
              <p className="text-sm text-white/90 leading-relaxed">
                Esta acción borrará los datos de perfil de{' '}
                <span className="font-semibold text-white">
                  {estudianteAResetear.nombre_completo_becado || estudianteAResetear.id_becado_interno || 'este estudiante'}
                </span>{' '}
                e invalidará sus documentos actuales.
              </p>
              <p className="text-sm text-white/80 leading-relaxed">
                El estudiante tendrá que volver a llenar el formulario. Esta acción{' '}
                <span className="font-semibold text-red-400">NO se puede deshacer</span>.
              </p>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCerrarModal}
                disabled={isReseteando}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isReseteando
                    ? 'bg-white/5 text-white/30 cursor-not-allowed'
                    : 'bg-white/10 text-white/90 hover:bg-white/20'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarResetear}
                disabled={isReseteando}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isReseteando
                    ? 'bg-red-600/50 text-white/50 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#101f60]'
                }`}
              >
                {isReseteando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reseteando...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    Sí, resetear perfil
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Confirmación de Desvincular Cuenta - Renderizado con Portal en nivel superior */}
      {isMounted && estudianteADesvincular && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleCerrarModalDesvincular}
        >
          <div 
            className="w-full max-w-md rounded-lg bg-[#101f60] border border-gray-800/50 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-gray-800/50 p-2">
                  <Unlink className="h-5 w-5 text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  ¿Desvincular cuenta de acceso?
                </h2>
              </div>
              {!isDesvinculando && (
                <button
                  onClick={handleCerrarModalDesvincular}
                  className="text-white/60 hover:text-white transition-colors"
                  aria-label="Cerrar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            {/* Descripción */}
            <div className="mb-6 space-y-3">
              <p className="text-sm text-white/90 leading-relaxed">
                <span className="font-semibold text-red-400">ADVERTENCIA:</span> Esto{' '}
                <span className="font-semibold text-red-400">BORRARÁ PERMANENTEMENTE</span> la cuenta de acceso de{' '}
                <span className="font-semibold text-white">
                  {estudianteADesvincular.nombre_completo_becado || estudianteADesvincular.id_becado_interno || 'este estudiante'}
                </span>.
              </p>
              <p className="text-sm text-white/80 leading-relaxed">
                El estudiante perderá acceso inmediato y tendrá que volver a activar su cuenta con un nuevo token. Esta acción{' '}
                <span className="font-semibold text-red-400">NO se puede deshacer</span>.
              </p>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCerrarModalDesvincular}
                disabled={isDesvinculando}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isDesvinculando
                    ? 'bg-white/5 text-white/30 cursor-not-allowed'
                    : 'bg-white/10 text-white/90 hover:bg-white/20'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarDesvincular}
                disabled={isDesvinculando}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isDesvinculando
                    ? 'bg-gray-900/50 text-white/50 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 focus:ring-offset-[#101f60]'
                }`}
              >
                {isDesvinculando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Desvinculando...
                  </>
                ) : (
                  <>
                    <Unlink className="h-4 w-4" />
                    Sí, borrar cuenta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="rounded-lg bg-white/10 backdrop-blur-lg border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider">
                  BDI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider">
                  Nombre Completo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider">
                  Universidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider">
                  Estado Perfil
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/90 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {estudiantes.map((estudiante) => {
                const estadoPerfil = obtenerEstadoPerfil(
                  estudiante.url_carnet_digital,
                  estudiante.url_expediente_digital
                );
                const isProcessing = processingId === estudiante.id;
                const estaProcesando = isProcessing || isReseteando || isDesvinculando;
                const tieneCuentaActiva = estudiante.auth_user_id !== null && estudiante.auth_user_id !== undefined;

                return (
                  <tr key={estudiante.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {estudiante.id_becado_interno || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white/90">
                        {estudiante.nombre_completo_becado || 'Sin nombre'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white/80">
                        {estudiante.universidad || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          estadoPerfil === 'Completo'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}
                      >
                        {estadoPerfil}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botón Resetear Perfil */}
                        <button
                          type="button"
                          onClick={() => handleAbrirModalResetear(estudiante)}
                          disabled={estaProcesando}
                          className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            estaProcesando
                              ? 'bg-red-600/50 text-white/50 cursor-not-allowed'
                              : 'bg-red-600/80 text-white hover:bg-red-600'
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Resetear Perfil
                        </button>

                        {/* Botón Desvincular - Solo si tiene cuenta activa */}
                        {tieneCuentaActiva && (
                          <button
                            type="button"
                            onClick={() => handleAbrirModalDesvincular(estudiante)}
                            disabled={estaProcesando}
                            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                              estaProcesando
                                ? 'bg-gray-800/50 text-white/50 cursor-not-allowed'
                                : 'bg-gray-800 text-white hover:bg-gray-900'
                            }`}
                          >
                            <Unlink className="h-3 w-3" />
                            Desvincular
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Información de total */}
        <div className="bg-white/5 px-6 py-3 border-t border-white/10">
          <p className="text-sm text-white/70">
            Total de estudiantes: <span className="font-medium text-white">{estudiantes.length}</span>
          </p>
        </div>
      </div>
    </>
  );
}

