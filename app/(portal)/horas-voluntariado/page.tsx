'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import DashboardHeader from '../dashboard/DashboardHeader';
import DashboardFooter from '../dashboard/DashboardFooter';
import { Clock, Calendar, User, Award, ArrowLeft, ArrowUpDown, Loader2, HelpCircle, X, CheckCircle2 } from 'lucide-react';
import { crearSolicitudHoras } from './actions';

/**
 * Tipo para los registros de horas de voluntariado
 */
type HorasRegistro = {
  auth_user_id?: string;
  fecha_actividad?: string;
  nombre_actividad?: string;
  responsable_encargado?: string;
  cantidad_horas?: number;
  horas_acumuladas?: number;
};

/**
 * Página de Mis Horas Sociales (ruta privada)
 * Muestra el historial de horas de voluntariado del estudiante
 */
export default function HorasVoluntariadoPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [registros, setRegistros] = useState<HorasRegistro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ordenAscendente, setOrdenAscendente] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estudianteId, setEstudianteId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Estados para el modal de solicitud
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<'formulario' | 'enviando' | 'exito'>('formulario');
  const [mensajeSolicitud, setMensajeSolicitud] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState(15);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados para el formulario
  const [fechaActividad, setFechaActividad] = useState('');
  const [nombreActividad, setNombreActividad] = useState('');
  const [cantidadHoras, setCantidadHoras] = useState('');
  const [responsableEncargado, setResponsableEncargado] = useState('');
  const [bitacoraArchivo, setBitacoraArchivo] = useState<File | null>(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    async function cargarDatos() {
      try {
        setCargando(true);
        setError(null);

        // Obtener el usuario actual
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push('/login');
          return;
        }

        setUserId(user.id);

        // Obtener el ID del estudiante de la tabla estudiantes
        const { data: estudianteData, error: estudianteError } = await supabase
          .from('estudiantes')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (estudianteError) {
          console.error('Error al obtener ID del estudiante:', estudianteError);
        } else if (estudianteData) {
          // Type assertion para el ID del estudiante
          type EstudianteData = { id: number | string } | null;
          const estudiante = estudianteData as EstudianteData;
          if (estudiante && estudiante.id) {
            setEstudianteId(typeof estudiante.id === 'number' ? estudiante.id : parseInt(String(estudiante.id), 10));
          }
        }

        // Consultar la vista de horas acumuladas
        // Ordenamos por fecha ascendente por defecto (más antiguo a más nuevo)
        const { data: horasData, error: horasError } = await supabase
          .from('vista_horas_acumuladas')
          .select('*')
          .eq('auth_user_id', user.id)
          .order('fecha_actividad', { ascending: true });

        if (horasError) {
          console.error('Error al obtener horas de voluntariado:', horasError);
          setError('Error al cargar los datos. Por favor, intenta nuevamente.');
          setRegistros([]);
        } else {
          setRegistros((horasData as HorasRegistro[] | null) || []);
        }
      } catch (err) {
        console.error('Error inesperado:', err);
        setError('Error inesperado al cargar los datos.');
        setRegistros([]);
      } finally {
        setCargando(false);
      }
    }

    cargarDatos();
  }, [supabase, router]);

  // Función para formatear fecha (dd/MM/yyyy) sin problemas de zona horaria
  // Si la fecha viene como 'YYYY-MM-DD' desde Supabase, la formateamos directamente
  const formatearFecha = (fecha: string | null | undefined): string => {
    if (!fecha) return 'N/A';
    
    // Si la fecha viene en formato 'YYYY-MM-DD', la formateamos directamente
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      // Extraemos las partes y las reordenamos: YYYY-MM-DD -> DD/MM/YYYY
      const partes = fecha.split('-');
      if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
    }
    
    // Fallback: intentar con Date si el formato no es el esperado
    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return 'N/A';
    }
  };

  // Calcular el total de horas sumando todas las cantidad_horas
  const totalHoras = registros.reduce((suma, registro) => {
    return suma + (registro.cantidad_horas || 0);
  }, 0);

  // Ordenar registros según el estado de ordenAscendente
  const registrosOrdenados = [...registros].sort((a, b) => {
    if (!a.fecha_actividad || !b.fecha_actividad) return 0;
    
    const fechaA = a.fecha_actividad;
    const fechaB = b.fecha_actividad;
    
    if (ordenAscendente) {
      // ASC: más antiguo a más nuevo
      return fechaA.localeCompare(fechaB);
    } else {
      // DESC: más nuevo a más antiguo
      return fechaB.localeCompare(fechaA);
    }
  });

  // Función para alternar el orden
  const alternarOrden = () => {
    setOrdenAscendente(!ordenAscendente);
  };

  // Función para abrir el modal
  const abrirModal = () => {
    setModalAbierto(true);
    setModoModal('formulario');
    setMensajeSolicitud(null);
    setSegundosRestantes(15);
    // Resetear formulario
    setFechaActividad('');
    setNombreActividad('');
    setCantidadHoras('');
    setResponsableEncargado('');
    setBitacoraArchivo(null);
    // Limpiar timeouts si existen
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  };

  // Función para cerrar el modal
  const cerrarModal = () => {
    // Limpiar timeouts antes de cerrar
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
    setModalAbierto(false);
    setModoModal('formulario');
    setMensajeSolicitud(null);
    setSegundosRestantes(15);
    // Resetear formulario
    setFechaActividad('');
    setNombreActividad('');
    setCantidadHoras('');
    setResponsableEncargado('');
    setBitacoraArchivo(null);
  };

  // Efecto para manejar el temporizador cuando el modal está en estado 'exito'
  useEffect(() => {
    if (modoModal === 'exito' && modalAbierto) {
      // Reiniciar contador
      setSegundosRestantes(15);

      // Crear intervalo para actualizar el contador cada segundo
      intervaloRef.current = setInterval(() => {
        setSegundosRestantes((prev) => {
          if (prev <= 1) {
            if (intervaloRef.current) {
              clearInterval(intervaloRef.current);
              intervaloRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Crear timeout para cerrar el modal después de 15 segundos
      timeoutRef.current = setTimeout(() => {
        // Limpiar timeouts
        if (intervaloRef.current) {
          clearInterval(intervaloRef.current);
          intervaloRef.current = null;
        }
        // Cerrar modal y resetear estado
        setModalAbierto(false);
        setModoModal('formulario');
        setMensajeSolicitud(null);
        setSegundosRestantes(15);
    // Resetear formulario
    setFechaActividad('');
    setNombreActividad('');
    setCantidadHoras('');
    setResponsableEncargado('');
    setBitacoraArchivo(null);
        // Recargar los datos después de cerrar
        window.location.reload();
      }, 15000);

      // Cleanup function
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (intervaloRef.current) {
          clearInterval(intervaloRef.current);
          intervaloRef.current = null;
        }
      };
    }
  }, [modoModal, modalAbierto]);

  // Función para enviar la solicitud
  const enviarSolicitud = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModoModal('enviando');
    setMensajeSolicitud(null);

    try {
      // Validaciones básicas en el cliente
      if (!fechaActividad || !nombreActividad || !cantidadHoras) {
        setModoModal('formulario');
        setMensajeSolicitud({
          tipo: 'error',
          texto: 'Por favor, completa todos los campos requeridos.',
        });
        return;
      }

      const horas = parseInt(cantidadHoras, 10);
      if (isNaN(horas) || horas < 1) {
        setModoModal('formulario');
        setMensajeSolicitud({
          tipo: 'error',
          texto: 'La cantidad de horas debe ser un número mayor a 0.',
        });
        return;
      }

      // Crear FormData para enviar a la Server Action
      const formData = new FormData();
      formData.append('fecha_actividad', fechaActividad);
      formData.append('nombre_actividad', nombreActividad);
      formData.append('cantidad_horas', cantidadHoras);
      formData.append('responsable_encargado', responsableEncargado || 'N/A');
      
      // Agregar el archivo si existe
      if (bitacoraArchivo) {
        formData.append('bitacora', bitacoraArchivo);
      }

      // Llamar a la Server Action
      const resultado = await crearSolicitudHoras(formData);

      if (!resultado.success) {
        setModoModal('formulario');
        setMensajeSolicitud({
          tipo: 'error',
          texto: resultado.message,
        });
        return;
      }

      // Éxito: Cambiar a modo 'exito' (el useEffect manejará el temporizador)
      setModoModal('exito');
    } catch (err) {
      console.error('Error inesperado al enviar solicitud:', err);
      setModoModal('formulario');
      setMensajeSolicitud({
        tipo: 'error',
        texto: 'Error inesperado. Por favor, intenta nuevamente.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#101f60]">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* Botón de regreso */}
        <Link
          href="/dashboard"
          className="mb-6 flex items-center text-white/70 hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Inicio
        </Link>

        {/* Encabezado */}
        <div className="mb-8 flex items-center gap-3">
          <Clock className="h-8 w-8 text-white" />
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            Mis Horas de Voluntariado
          </h1>
        </div>

        {/* Tarjeta Resumen Hero */}
        <div className="mb-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-2 text-lg text-white/80">Total de Horas Acumuladas</p>
              {cargando ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                  <p className="text-2xl text-white/60">Cargando...</p>
                </div>
              ) : (
                <>
                  <p className="text-5xl font-bold text-blue-400 md:text-6xl">
                    {totalHoras.toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-white/60">horas de servicio de voluntariado</p>
                </>
              )}
            </div>
            <div className="hidden md:block">
              <Award className="h-20 w-20 text-blue-400/50" />
            </div>
          </div>
        </div>

        {/* Tabla de Historial */}
        <div className="rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl overflow-hidden">
          <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Historial de Actividades</h2>
            {!cargando && registros.length > 0 && (
              <button
                onClick={alternarOrden}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
                Cambiar Orden {ordenAscendente ? '↓' : '↑'}
              </button>
            )}
          </div>

          {cargando ? (
            /* Estado de carga */
            <div className="p-12 text-center">
              <Loader2 className="mx-auto h-12 w-12 text-white/40 mb-4 animate-spin" />
              <p className="text-lg font-medium text-white/80">
                Cargando registros...
              </p>
            </div>
          ) : error ? (
            /* Estado de error */
            <div className="p-12 text-center">
              <Calendar className="mx-auto h-16 w-16 text-red-400/40 mb-4" />
              <p className="text-lg font-medium text-white/80 mb-2">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : registrosOrdenados.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center">
              <Calendar className="mx-auto h-16 w-16 text-white/40 mb-4" />
              <p className="text-lg font-medium text-white/80 mb-2">
                No hay registros de horas de voluntariado
              </p>
              <p className="text-sm text-white/60">
                Tus actividades de servicio social aparecerán aquí cuando sean registradas.
              </p>
            </div>
          ) : (
            /* Tabla con datos */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fecha
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                      Actividad
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Responsable
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                      Horas Asignadas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {registrosOrdenados.map((registro, index) => (
                    <tr
                      key={index}
                      className="even:bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-white/90">
                        {formatearFecha(registro.fecha_actividad)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/90">
                        {registro.nombre_actividad || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/90">
                        {registro.responsable_encargado || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-blue-400">
                        {registro.cantidad_horas?.toLocaleString() || '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Botón para solicitar horas faltantes */}
        {!cargando && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={abrirModal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              ¿No ves tus horas? Solicitarlas aquí
            </button>
          </div>
        )}

        {/* Modal de Solicitud */}
        {modalAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-[#101f60] border border-white/20 shadow-2xl p-6 text-white">
              {/* Botón cerrar - Solo visible si no está enviando o en éxito */}
              {modoModal !== 'enviando' && modoModal !== 'exito' && (
                <button
                  onClick={cerrarModal}
                  className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Contenido según el modo del modal */}
              {modoModal === 'formulario' && (
                <>
                  {/* Título */}
                  <h2 className="text-2xl font-bold mb-2 pr-8">Solicitud de Horas No Registradas</h2>
                  <p className="text-sm text-white/70 mb-6">
                    Usa este formulario SOLO si asististe a una actividad y no aparece después de 48 horas.
                  </p>

                  {/* Formulario */}
                  <form onSubmit={enviarSolicitud} encType="multipart/form-data" className="space-y-4">
                    {/* Campo Fecha */}
                    <div>
                      <label htmlFor="fecha" className="block text-sm font-medium text-white/90 mb-2">
                        Fecha <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="fecha"
                        type="date"
                        value={fechaActividad}
                        onChange={(e) => setFechaActividad(e.target.value)}
                        required
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    {/* Campo Nombre Actividad */}
                    <div>
                      <label htmlFor="nombre_actividad" className="block text-sm font-medium text-white/90 mb-2">
                        Nombre Actividad <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="nombre_actividad"
                        type="text"
                        value={nombreActividad}
                        onChange={(e) => setNombreActividad(e.target.value)}
                        required
                        placeholder="Ej: Limpieza de playa en San Miguel"
                        className="w-full rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    {/* Campo Horas */}
                    <div>
                      <label htmlFor="cantidad_horas" className="block text-sm font-medium text-white/90 mb-2">
                        Horas <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="cantidad_horas"
                        type="number"
                        value={cantidadHoras}
                        onChange={(e) => setCantidadHoras(e.target.value)}
                        required
                        min="1"
                        placeholder="Ej: 4"
                        className="w-full rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    {/* Campo Responsable */}
                    <div>
                      <label htmlFor="responsable" className="block text-sm font-medium text-white/90 mb-2">
                        Responsable
                      </label>
                      <input
                        id="responsable"
                        type="text"
                        value={responsableEncargado}
                        onChange={(e) => setResponsableEncargado(e.target.value)}
                        placeholder="Si no sabes, pon N/A"
                        className="w-full rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    {/* Campo Bitácora */}
                    <div>
                      <label htmlFor="bitacora" className="block text-sm font-medium text-white/90 mb-2">
                        Adjunta tu bitácora (Foto o PDF)
                      </label>
                      <input
                        id="bitacora"
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,.pdf,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setBitacoraArchivo(file);
                        }}
                        className="w-full rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 file:cursor-pointer"
                      />
                      <p className="mt-1 text-xs text-white/60">
                        Formatos aceptados: JPEG, PNG, PDF (máx. 10MB)
                      </p>
                      {bitacoraArchivo && (
                        <p className="mt-1 text-xs text-blue-400">
                          Archivo seleccionado: {bitacoraArchivo.name}
                        </p>
                      )}
                    </div>

                    {/* Mensaje de error (si existe) */}
                    {mensajeSolicitud && mensajeSolicitud.tipo === 'error' && (
                      <div className="rounded-md p-3 backdrop-blur-sm border bg-red-500/20 border-red-400/30 text-red-100">
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4" />
                          <p className="text-sm">{mensajeSolicitud.texto}</p>
                        </div>
                      </div>
                    )}

                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={cerrarModal}
                        className="flex-1 rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
                      >
                        Enviar Solicitud
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Estado: Enviando */}
              {modoModal === 'enviando' && (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto h-12 w-12 text-blue-400 mb-4 animate-spin" />
                  <h2 className="text-2xl font-bold mb-2">Enviando solicitud...</h2>
                  <p className="text-sm text-white/70">
                    Por favor, espera mientras procesamos tu solicitud.
                  </p>
                </div>
              )}

              {/* Estado: Éxito */}
              {modoModal === 'exito' && (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto h-16 w-16 text-green-400 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">¡Solicitud Enviada!</h2>
                  <p className="text-sm text-white/70 mb-6">
                    Un técnico revisará tu solicitud pronto.
                  </p>
                  <p className="text-sm text-white/60 mb-6">
                    Esta ventana se cerrará automáticamente en{' '}
                    <span className="font-bold text-blue-400">{segundosRestantes}</span> segundos...
                  </p>
                  <button
                    onClick={() => {
                      // Limpiar timeouts
                      if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                        timeoutRef.current = null;
                      }
                      if (intervaloRef.current) {
                        clearInterval(intervaloRef.current);
                        intervaloRef.current = null;
                      }
                      // Cerrar modal
                      setModalAbierto(false);
                      setModoModal('formulario');
                      setMensajeSolicitud(null);
                      setSegundosRestantes(15);
        // Resetear formulario
        setFechaActividad('');
        setNombreActividad('');
        setCantidadHoras('');
        setResponsableEncargado('');
        setBitacoraArchivo(null);
        // Recargar los datos
                      window.location.reload();
                    }}
                    className="rounded-md bg-blue-500 px-6 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
                  >
                    Cerrar ahora
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <DashboardFooter />
    </div>
  );
}
