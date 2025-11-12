'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Bell, Loader2, Trash2, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getMisNotificaciones,
  marcarNotificacionesComoLeidas,
  deleteUnaNotificacion,
  deleteAllMisNotificaciones,
} from '@/app/(portal)/notificaciones/actions';

/**
 * Función helper para resaltar palabras clave en el texto
 */
function resaltarPalabrasClave(texto: string): React.ReactNode {
  if (!texto) return texto;

  // Buscar "Motivo:" u "Observaciones:" en el texto
  const palabrasClave = ['Motivo:', 'Observaciones:'];
  const regex = new RegExp(`(${palabrasClave.join('|')})`, 'gi');
  const partes = texto.split(regex);

  return partes.map((parte, index) => {
    // Si la parte coincide con alguna palabra clave (case insensitive), ponerla en negrita
    if (palabrasClave.some((palabra) => parte.toLowerCase() === palabra.toLowerCase())) {
      return <strong key={index}>{parte}</strong>;
    }
    return <span key={index}>{parte}</span>;
  });
}

/**
 * Función helper para formatear "hace X tiempo"
 */
function formatearTiempoRelativo(fecha: string): string {
  try {
    const ahora = new Date();
    const fechaNotificacion = new Date(fecha);
    const diffMs = ahora.getTime() - fechaNotificacion.getTime();
    const diffSegundos = Math.floor(diffMs / 1000);
    const diffMinutos = Math.floor(diffSegundos / 60);
    const diffHoras = Math.floor(diffMinutos / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffSegundos < 60) {
      return 'hace unos segundos';
    } else if (diffMinutos < 60) {
      return `hace ${diffMinutos} ${diffMinutos === 1 ? 'minuto' : 'minutos'}`;
    } else if (diffHoras < 24) {
      return `hace ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`;
    } else if (diffDias < 7) {
      return `hace ${diffDias} ${diffDias === 1 ? 'día' : 'días'}`;
    } else {
      // Si es más de una semana, mostrar la fecha formateada
      return fechaNotificacion.toLocaleDateString('es-SV', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  } catch {
    return 'hace un tiempo';
  }
}

/**
 * Componente de campana de notificaciones
 */
export default function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Función para cargar notificaciones
  const fetchNotificaciones = () => {
    startTransition(async () => {
      const result = await getMisNotificaciones();
      setNotificaciones(result.notificaciones);
      setUnreadCount(result.unreadCount);
    });
  };

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    fetchNotificaciones();
  }, []);

  // Manejar apertura/cierre del dropdown
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    // Si se abre y hay notificaciones no leídas, marcarlas como leídas
    if (open && unreadCount > 0) {
      // Actualizar UI inmediatamente para feedback instantáneo
      setUnreadCount(0);

      // Actualizar backend (sin await para no bloquear)
      marcarNotificacionesComoLeidas().catch((error) => {
        console.error('Error al marcar notificaciones como leídas:', error);
        // Si falla, recargar para restaurar el conteo
        fetchNotificaciones();
      });
    }
  };

  // Manejar borrar todas las notificaciones
  const handleBorrarTodas = () => {
    if (isPending || notificaciones.length === 0) return;

    startTransition(async () => {
      const result = await deleteAllMisNotificaciones();
      if (result.success) {
        // Actualizar estado local para que desaparezcan de la vista
        setNotificaciones([]);
        setUnreadCount(0);
      } else {
        console.error('Error al borrar todas las notificaciones');
        // Recargar para sincronizar
        fetchNotificaciones();
      }
    });
  };

  // Manejar borrar una notificación específica
  const handleBorrarUna = (notificationId: number | bigint) => {
    if (isPending) return;

    startTransition(async () => {
      const result = await deleteUnaNotificacion(notificationId);
      if (result.success) {
        // Filtrar la notificación borrada del estado local
        setNotificaciones((prev) => prev.filter((n) => n.id !== notificationId));
        // Actualizar el conteo si era no leída
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        console.error('Error al borrar notificación');
        // Recargar para sincronizar
        fetchNotificaciones();
      }
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex items-center justify-center rounded-md bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && !isPending && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
        <div className="p-2">
          {/* Header con título y botón Borrar Todas */}
          {notificaciones.length > 0 && (
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
              <button
                onClick={handleBorrarTodas}
                disabled={isPending}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                title="Borrar todas las notificaciones"
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                <span>Borrar Todas</span>
              </button>
            </div>
          )}

          {isPending && notificaciones.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">Estás al día</p>
              <p className="mt-1 text-xs text-gray-400">
                No tienes notificaciones nuevas
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notificaciones.map((notificacion) => (
                <div
                  key={notificacion.id}
                  className="group relative rounded-lg border border-gray-200 bg-gray-50/50 p-3 transition-colors hover:bg-gray-100 hover:border-gray-300"
                >
                  {/* Botón de borrar individual */}
                  <button
                    onClick={() => handleBorrarUna(notificacion.id)}
                    disabled={isPending}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Borrar notificación"
                  >
                    {isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                    ) : (
                      <X className="h-3 w-3 text-red-600 hover:text-red-700" />
                    )}
                  </button>

                  <div className="flex flex-col gap-1 pr-6">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {notificacion.titulo || 'Notificación'}
                    </h4>
                    <p className="text-sm text-gray-600 whitespace-normal break-words">
                      {resaltarPalabrasClave(notificacion.contenido || '')}
                    </p>
                    {notificacion.creado_en && (
                      <p className="text-xs text-gray-400">
                        {formatearTiempoRelativo(notificacion.creado_en)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

