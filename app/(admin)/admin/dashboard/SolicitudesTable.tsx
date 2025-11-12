'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Loader2 } from 'lucide-react';
import { aprobarSolicitud, rechazarSolicitud } from '../solicitudes/actions';
import { useRouter } from 'next/navigation';

/**
 * Tipo para las solicitudes
 */
type Solicitud = {
  id: string;
  fecha_solicitud: string;
  nombre_completo_becado?: string | null;
  nombre_actividad: string;
  fecha_actividad: string;
  cantidad_horas: number;
  responsable_encargado?: string | null;
  url_bitacora?: string | null;
};

interface SolicitudesTableProps {
  solicitudes: Solicitud[];
}

/**
 * Componente Client para mostrar la tabla de solicitudes con acciones
 */
export default function SolicitudesTable({ solicitudes }: SolicitudesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Estado para el modal de aprobación
  const [solicitudAprobando, setSolicitudAprobando] = useState<Solicitud | null>(null);
  const [horasEditadas, setHorasEditadas] = useState<string>('');
  const [observacionesAprobacion, setObservacionesAprobacion] = useState<string>('');
  const [isAprobando, setIsAprobando] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Estado para el modal de rechazo
  const [solicitudRechazando, setSolicitudRechazando] = useState<Solicitud | null>(null);
  const [razonRechazo, setRazonRechazo] = useState<string>('');
  const [isRechazando, setIsRechazando] = useState(false);

  // Verificar que el componente está montado para usar Portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Limpiar processingId si la solicitud ya no está en la lista
  useEffect(() => {
    if (processingId && !solicitudes.find((s) => s.id === processingId)) {
      setProcessingId(null);
    }
  }, [solicitudes, processingId]);

  // Función para formatear fechas
  const formatearFecha = (fecha: string) => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-SV', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return fecha;
    }
  };

  // Cerrar modal de aprobación
  const handleCerrarModalAprobacion = useCallback(() => {
    if (isAprobando) return; // No cerrar si está procesando
    setSolicitudAprobando(null);
    setHorasEditadas('');
    setObservacionesAprobacion('');
  }, [isAprobando]);

  // Cerrar modal de rechazo
  const handleCerrarModalRechazo = useCallback(() => {
    if (isRechazando) return; // No cerrar si está procesando
    setSolicitudRechazando(null);
    setRazonRechazo('');
  }, [isRechazando]);

  // Abrir modal de aprobación
  const handleAbrirModalAprobacion = (solicitud: Solicitud) => {
    // Log de desempate: verificar qué datos recibe el modal
    console.log('Datos de la solicitud para el modal:', solicitud);
    
    if (processingId || isPending) return;
    setSolicitudAprobando(solicitud);
    setHorasEditadas(solicitud.cantidad_horas.toString());
  };

  // Inicializar horasEditadas cuando se abre el modal
  useEffect(() => {
    if (solicitudAprobando) {
      setHorasEditadas(solicitudAprobando.cantidad_horas.toString());
    }
  }, [solicitudAprobando]);

  // Cerrar modal con tecla Escape
  useEffect(() => {
    if (!solicitudAprobando && !solicitudRechazando) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (solicitudAprobando && !isAprobando) {
          handleCerrarModalAprobacion();
        } else if (solicitudRechazando && !isRechazando) {
          handleCerrarModalRechazo();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [solicitudAprobando, solicitudRechazando, isAprobando, isRechazando, handleCerrarModalAprobacion, handleCerrarModalRechazo]);

  // Confirmar aprobación
  const handleConfirmarAprobacion = () => {
    if (!solicitudAprobando || isAprobando) return;

    // Validar horas
    const horas = parseFloat(horasEditadas);
    if (isNaN(horas) || horas <= 0) {
      alert('Por favor, ingresa una cantidad de horas válida mayor a 0.');
      return;
    }

    setIsAprobando(true);
    setProcessingId(solicitudAprobando.id);

    startTransition(async () => {
      try {
        const result = await aprobarSolicitud(solicitudAprobando.id, horas, observacionesAprobacion);
        if (result.success) {
          // Limpiar estados antes de refrescar
          setSolicitudAprobando(null);
          setHorasEditadas('');
          setObservacionesAprobacion('');
          setIsAprobando(false);
          setProcessingId(null);
          router.refresh();
        } else {
          alert(result.message);
          setIsAprobando(false);
          setProcessingId(null);
        }
      } catch (error) {
        console.error('Error al aprobar solicitud:', error);
        alert('Error inesperado al aprobar la solicitud.');
        setIsAprobando(false);
        setProcessingId(null);
      }
    });
  };

  // Abrir modal de rechazo
  const handleAbrirModalRechazo = (solicitud: Solicitud) => {
    // Log de desempate: verificar qué datos recibe el modal
    console.log('Datos de la solicitud para el modal:', solicitud);
    
    if (processingId || isPending) return;
    setSolicitudRechazando(solicitud);
    setRazonRechazo('');
  };

  // Confirmar rechazo
  const handleConfirmarRechazo = async () => {
    if (!solicitudRechazando || isRechazando) return;

    // Validar que la razón no esté vacía
    if (!razonRechazo.trim()) {
      alert('Debes ingresar una razón.');
      return;
    }

    setIsRechazando(true);
    setProcessingId(solicitudRechazando.id);

    startTransition(async () => {
      try {
        const result = await rechazarSolicitud(solicitudRechazando.id, razonRechazo);
        if (result.success) {
          // Limpiar estados antes de refrescar
          setSolicitudRechazando(null);
          setRazonRechazo('');
          setIsRechazando(false);
          setProcessingId(null);
          router.refresh();
        } else {
          alert(result.message);
          setIsRechazando(false);
          setProcessingId(null);
        }
      } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        alert('Error inesperado al rechazar la solicitud.');
        setIsRechazando(false);
        setProcessingId(null);
      }
    });
  };

  if (solicitudes.length === 0) {
    return (
      <div className="rounded-lg bg-white/10 backdrop-blur-lg border border-white/20 p-8 text-center">
        <p className="text-white/80 text-lg">
          No hay solicitudes pendientes en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white/10 backdrop-blur-lg border border-white/20 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider">
                Fecha Solicitud
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider">
                Becado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider">
                Actividad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider">
                Fecha Actividad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider">
                Horas
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-white/90 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {solicitudes.map((solicitud) => {
              const isProcessing = processingId === solicitud.id;
              return (
                <tr key={solicitud.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">
                    {formatearFecha(solicitud.fecha_solicitud)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">
                    {solicitud.nombre_completo_becado || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-white/90">
                    {solicitud.nombre_actividad}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">
                    {formatearFecha(solicitud.fecha_actividad)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">
                    {solicitud.cantidad_horas}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <div className="flex items-center justify-center gap-2">
                      {/* Botón Aprobar */}
                      <button
                        onClick={() => handleAbrirModalAprobacion(solicitud)}
                        disabled={isProcessing || isPending}
                        className="inline-flex items-center justify-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed"
                        title="Aprobar solicitud"
                      >
                        <Check className="h-4 w-4" />
                      </button>

                      {/* Botón Rechazar */}
                      <button
                        onClick={() => handleAbrirModalRechazo(solicitud)}
                        disabled={isProcessing || isPending}
                        className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed"
                        title="Rechazar solicitud"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Confirmación de Aprobación - Renderizado con Portal en nivel superior */}
      {isMounted && solicitudAprobando && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleCerrarModalAprobacion}
        >
          <div 
            className="w-full max-w-md rounded-lg bg-[#101f60] border border-white/20 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">
              Confirmar Aprobación
            </h2>
            
            <div className="space-y-4 mb-6">
              {/* Información de la solicitud */}
              <div className="space-y-2">
                <p className="text-sm text-white/80">
                  <span className="font-medium text-white">Becado:</span>{' '}
                  {solicitudAprobando.nombre_completo_becado || 'N/A'}
                </p>
                <p className="text-sm text-white/80">
                  <span className="font-medium text-white">Actividad:</span>{' '}
                  {solicitudAprobando.nombre_actividad}
                </p>
                <p className="text-sm text-white/80">
                  <span className="font-medium text-white">Fecha de Actividad:</span>{' '}
                  {formatearFecha(solicitudAprobando.fecha_actividad)}
                </p>
              </div>

              {/* Bitácora adjunta */}
              {solicitudAprobando.url_bitacora && (
                <div className="rounded-md border border-white/20 bg-white/5 p-3">
                  <a
                    href={solicitudAprobando.url_bitacora}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                  >
                    Ver Bitácora Adjunta
                  </a>
                </div>
              )}

              {/* Input de horas */}
              <div>
                <label htmlFor="horas-editadas" className="block text-sm font-medium text-white mb-2">
                  Cantidad de Horas
                </label>
                <input
                  id="horas-editadas"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={horasEditadas}
                  onChange={(e) => setHorasEditadas(e.target.value)}
                  disabled={isAprobando}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-white/5 disabled:cursor-not-allowed"
                  placeholder="Ingresa la cantidad de horas"
                />
                <p className="mt-1 text-xs text-white/60">
                  Horas originales: {solicitudAprobando.cantidad_horas}
                </p>
              </div>

              {/* Textarea de observaciones */}
              <div>
                <label htmlFor="observaciones-aprobacion" className="block text-sm font-medium text-white mb-2">
                  Notas u Observaciones (Opcional)
                </label>
                <textarea
                  id="observaciones-aprobacion"
                  value={observacionesAprobacion}
                  onChange={(e) => setObservacionesAprobacion(e.target.value)}
                  disabled={isAprobando}
                  rows={3}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-white/5 disabled:cursor-not-allowed resize-none"
                  placeholder="Ingresa notas u observaciones sobre la aprobación (opcional)"
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCerrarModalAprobacion}
                disabled={isAprobando}
                className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarAprobacion}
                disabled={isAprobando}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed"
              >
                {isAprobando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar Aprobación'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Confirmación de Rechazo - Renderizado con Portal en nivel superior */}
      {isMounted && solicitudRechazando && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleCerrarModalRechazo}
        >
          <div 
            className="w-full max-w-md rounded-lg bg-[#101f60] border border-white/20 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">
              Confirmar Rechazo
            </h2>
            
            <div className="space-y-4 mb-6">
              {/* Información de la solicitud */}
              <div className="space-y-2">
                <p className="text-sm text-white/80">
                  <span className="font-medium text-white">Becado:</span>{' '}
                  {solicitudRechazando.nombre_completo_becado || 'N/A'}
                </p>
                <p className="text-sm text-white/80">
                  <span className="font-medium text-white">Actividad:</span>{' '}
                  {solicitudRechazando.nombre_actividad}
                </p>
                <p className="text-sm text-white/80">
                  <span className="font-medium text-white">Fecha de Actividad:</span>{' '}
                  {formatearFecha(solicitudRechazando.fecha_actividad)}
                </p>
              </div>

              {/* Bitácora adjunta */}
              {solicitudRechazando.url_bitacora && (
                <div className="rounded-md border border-white/20 bg-white/5 p-3">
                  <a
                    href={solicitudRechazando.url_bitacora}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                  >
                    Ver Bitácora Adjunta
                  </a>
                </div>
              )}

              {/* Textarea de razón de rechazo */}
              <div>
                <label htmlFor="razon-rechazo" className="block text-sm font-medium text-white mb-2">
                  Razón del Rechazo (Obligatorio)
                </label>
                <textarea
                  id="razon-rechazo"
                  value={razonRechazo}
                  onChange={(e) => setRazonRechazo(e.target.value)}
                  disabled={isRechazando}
                  rows={4}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-white/5 disabled:cursor-not-allowed resize-none"
                  placeholder="Ingresa la razón del rechazo (obligatorio)"
                  required
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCerrarModalRechazo}
                disabled={isRechazando}
                className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRechazo}
                disabled={isRechazando}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed"
              >
                {isRechazando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar Rechazo'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

