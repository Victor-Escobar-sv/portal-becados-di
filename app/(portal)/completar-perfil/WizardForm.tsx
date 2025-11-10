'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import { guardarPerfilCompleto } from './actions';
import { useRouter } from 'next/navigation';
import datosElSalvador from '@/data/elsalvador.json';

// Tipos para los datos de El Salvador
type Departamento = {
  nombre: string;
  municipios: {
    nombre: string;
    distritos: string[];
  }[];
};

// Esquema de validación Zod para Paso 1: Datos Personales y Académicos
const paso1Schema = z.object({
  fecha_de_nacimiento: z
    .string()
    .min(1, 'La fecha de nacimiento es requerida')
    .refine((date) => {
      const fecha = new Date(date);
      const hoy = new Date();
      const edad = hoy.getFullYear() - fecha.getFullYear();
      return edad >= 16 && edad <= 100;
    }, 'Debes tener entre 16 y 100 años'),
  telefono_llamada: z
    .string()
    .min(8, 'El teléfono debe tener al menos 8 caracteres')
    .max(15, 'El teléfono no puede tener más de 15 caracteres')
    .regex(/^[0-9-+() ]+$/, 'El teléfono solo puede contener números y caracteres especiales'),
  telefono_whatsapp: z
    .string()
    .refine((val) => !val || val === '' || (val.length >= 8 && val.length <= 15 && /^[0-9-+() ]+$/.test(val)), {
      message: 'El teléfono de WhatsApp debe tener entre 8 y 15 caracteres y solo números',
    })
    .optional()
    .or(z.literal('')),
  id_becado_universidad: z
    .string()
    .min(1, 'El carnet/ID universitario es requerido'),
  correo_estudiantil: z
    .string()
    .min(1, 'El correo estudiantil es requerido')
    .email('Debe ser un correo electrónico válido'),
});

// Esquema de validación Zod para Paso 2: Ubicación
// NOTA: No existe columna 'direccion' en la BD, solo departamento, municipio, distrito
const paso2Schema = z.object({
  departamento: z.string().min(1, 'El departamento es requerido'),
  municipio: z.string().min(1, 'El municipio es requerido'),
  distrito: z.string().min(1, 'El distrito es requerido'),
});

// Esquema de validación Zod para Paso 3: Info Adicional
const paso3Schema = z.object({
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
  nombre_emergencia: z
    .string()
    .min(3, 'El nombre de contacto de emergencia debe tener al menos 3 caracteres'),
  telefono_emergencia: z
    .string()
    .min(8, 'El teléfono de emergencia debe tener al menos 8 caracteres')
    .max(15, 'El teléfono no puede tener más de 15 caracteres')
    .regex(/^[0-9-+() ]+$/, 'El teléfono solo puede contener números y caracteres especiales'),
  parentesco_emergencia: z.string().min(1, 'El parentesco es requerido'),
});

// Esquema completo del formulario
const formularioCompletoSchema = paso1Schema.merge(paso2Schema).merge(paso3Schema);

type FormularioCompleto = z.infer<typeof formularioCompletoSchema>;

interface WizardFormProps {
  datosEstudiante: {
    id_becado_interno?: string;
    nombre_completo_becado: string;
    correo_estudiantil: string;
    correo_personal: string;
    sexo: string | null;
    nombre_emergencia?: string;
    telefono_emergencia?: string;
    telefono_personal?: string;
    telefono_llamada?: string;
    telefono_whatsapp?: string;
    id_becado_universidad?: string;
    universidad?: string;
    carrera?: string;
    fecha_de_nacimiento?: string;
    departamento?: string;
    municipio?: string;
    distrito?: string;
    tiene_una_discapacidad?: boolean;
    detalle_discapacidad?: string;
    miembro_de_consejo?: string;
    becado_elite?: string;
    parentesco_emergencia?: string;
    [key: string]: any;
  };
}

export default function WizardForm({ datosEstudiante }: WizardFormProps) {
  const router = useRouter();
  const [pasoActual, setPasoActual] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [departamentos] = useState<Departamento[]>(datosElSalvador as Departamento[]);
  const [municipiosDisponibles, setMunicipiosDisponibles] = useState<{ nombre: string; distritos: string[] }[]>([]);
  const [distritosDisponibles, setDistritosDisponibles] = useState<string[]>([]);
  const [mismoTelefonoWhatsApp, setMismoTelefonoWhatsApp] = useState(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    trigger,
    watch,
    setValue,
  } = useForm<FormularioCompleto>({
    resolver: zodResolver(formularioCompletoSchema),
    mode: 'onChange',
    defaultValues: {
      fecha_de_nacimiento: datosEstudiante.fecha_de_nacimiento || '',
      telefono_llamada: datosEstudiante.telefono_llamada || datosEstudiante.telefono_personal || '',
      telefono_whatsapp: datosEstudiante.telefono_whatsapp || '',
      id_becado_universidad: datosEstudiante.id_becado_universidad || '',
      correo_estudiantil: datosEstudiante.correo_estudiantil || '',
      departamento: datosEstudiante.departamento || '',
      municipio: datosEstudiante.municipio || '',
      distrito: datosEstudiante.distrito || '',
      tiene_una_discapacidad: datosEstudiante.tiene_una_discapacidad || false,
      detalle_discapacidad: datosEstudiante.detalle_discapacidad || '',
      miembro_de_consejo: datosEstudiante.miembro_de_consejo || '',
      becado_elite: datosEstudiante.becado_elite || '',
      nombre_emergencia: datosEstudiante.nombre_emergencia || '',
      telefono_emergencia: datosEstudiante.telefono_emergencia || '',
      parentesco_emergencia: datosEstudiante.parentesco_emergencia || '',
    },
  });

  // Observar cambios en telefono_llamada para sincronizar con WhatsApp si el checkbox está activado
  const telefonoLlamada = watch('telefono_llamada');
  
  useEffect(() => {
    if (mismoTelefonoWhatsApp && telefonoLlamada) {
      setValue('telefono_whatsapp', telefonoLlamada);
    }
  }, [mismoTelefonoWhatsApp, telefonoLlamada, setValue]);

  // Observar cambios en departamento y municipio para actualizar opciones
  const departamentoSeleccionado = watch('departamento');
  const municipioSeleccionado = watch('municipio');

  // Inicializar municipios y distritos si hay datos pre-existentes al montar
  useEffect(() => {
    const departamentoInicial = datosEstudiante.departamento;
    const municipioInicial = datosEstudiante.municipio;

    if (departamentoInicial) {
      const departamento = departamentos.find((d) => d.nombre === departamentoInicial);
      if (departamento) {
        setMunicipiosDisponibles(departamento.municipios);

        if (municipioInicial) {
          const municipio = departamento.municipios.find((m) => m.nombre === municipioInicial);
          if (municipio) {
            setDistritosDisponibles(municipio.distritos);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar con datos iniciales

  useEffect(() => {
    if (departamentoSeleccionado) {
      const departamento = departamentos.find((d) => d.nombre === departamentoSeleccionado);
      if (departamento) {
        setMunicipiosDisponibles(departamento.municipios);
        
        // Si el municipio actual no está en los nuevos municipios disponibles, resetear
        const municipioActual = watch('municipio');
        const municipioExiste = departamento.municipios.some((m) => m.nombre === municipioActual);
        
        if (!municipioExiste) {
          setValue('municipio', '');
          setValue('distrito', '');
          setDistritosDisponibles([]);
        }
      }
    } else {
      setMunicipiosDisponibles([]);
      setDistritosDisponibles([]);
    }
  }, [departamentoSeleccionado, departamentos, setValue, watch]);

  useEffect(() => {
    if (municipioSeleccionado && municipiosDisponibles.length > 0) {
      const municipio = municipiosDisponibles.find((m) => m.nombre === municipioSeleccionado);
      if (municipio) {
        setDistritosDisponibles(municipio.distritos);
        
        // Si el distrito actual no está en los nuevos distritos disponibles, resetear
        const distritoActual = watch('distrito');
        const distritoExiste = municipio.distritos.includes(distritoActual);
        
        if (!distritoExiste) {
          setValue('distrito', '');
        }
      }
    } else {
      setDistritosDisponibles([]);
    }
  }, [municipioSeleccionado, municipiosDisponibles, setValue, watch]);

  // Validar paso actual antes de avanzar
  const validarPaso = async (numeroPaso: number): Promise<boolean> => {
    let camposAValidar: (keyof FormularioCompleto)[] = [];

    switch (numeroPaso) {
      case 1:
        camposAValidar = ['fecha_de_nacimiento', 'telefono_llamada', 'id_becado_universidad', 'correo_estudiantil'];
        break;
      case 2:
        camposAValidar = ['departamento', 'municipio', 'distrito'];
        break;
      case 3:
        camposAValidar = ['miembro_de_consejo', 'becado_elite', 'nombre_emergencia', 'telefono_emergencia', 'parentesco_emergencia'];
        break;
    }

    const resultado = await trigger(camposAValidar);
    return resultado;
  };

  const handleSiguiente = async () => {
    const esValido = await validarPaso(pasoActual);
    if (esValido && pasoActual < 3) {
      setPasoActual(pasoActual + 1);
    }
  };

  const handleAnterior = () => {
    if (pasoActual > 1) {
      setPasoActual(pasoActual - 1);
    }
  };

  // Efecto para manejar la cuenta regresiva y redirección automática después del éxito
  useEffect(() => {
    // Solo ejecutar si isSuccess es true
    if (!isSuccess) {
      // Si isSuccess es false, limpiar todo y salir
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
      return;
    }

    // Limpiar interval y timeout anteriores si existen
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    // Asegurar que el countdown esté en 15 al iniciar
    setCountdown(15);
    
    // Iniciar interval para decrementar el contador cada segundo
    // IMPORTANTE: No usar delay, iniciar inmediatamente para garantizar los 15 segundos completos
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        // Si el valor actual es 0 o menor, no hacer nada más (ya se redirigió)
        if (prev <= 0) {
          return 0;
        }
        
        const nuevoValor = prev - 1;
        
        // Cuando el contador llegue a 0, ejecutar la redirección y limpiar
        if (nuevoValor <= 0) {
          // Limpiar el interval antes de redirigir
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          // Ejecutar la redirección SOLO cuando countdown llegue a 0
          router.push('/dashboard');
          return 0;
        }
        
        return nuevoValor;
      });
    }, 1000);

    // Limpiar interval y timeout al desmontar el componente o cuando isSuccess cambie
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [isSuccess, router]);

  const handleIrAlDashboard = () => {
    // Limpiar interval y timeout si el usuario hace clic manualmente
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
    // Solo redirigir, NO refrescar
    router.push('/dashboard');
  };

  const onSubmit = async (data: FormularioCompleto) => {
    setIsSubmitting(true);
    try {
      const resultado = await guardarPerfilCompleto({
        fecha_de_nacimiento: data.fecha_de_nacimiento,
        telefono_llamada: data.telefono_llamada,
        telefono_whatsapp: data.telefono_whatsapp || '',
        id_becado_universidad: data.id_becado_universidad,
        correo_estudiantil: data.correo_estudiantil,
        departamento: data.departamento,
        municipio: data.municipio,
        distrito: data.distrito,
        tiene_una_discapacidad: data.tiene_una_discapacidad,
        detalle_discapacidad: data.detalle_discapacidad,
        miembro_de_consejo: data.miembro_de_consejo,
        becado_elite: data.becado_elite,
        nombre_emergencia: data.nombre_emergencia,
        telefono_emergencia: data.telefono_emergencia,
        parentesco_emergencia: data.parentesco_emergencia,
      });
      if (resultado.success) {
        // IMPORTANTE: Solo cambiar el estado local, NO hacer refresh ni redirección aquí
        // El useEffect manejará la cuenta regresiva y la redirección automática
        setIsSubmitting(false);
        setIsSuccess(true);
        // Reiniciar countdown a 15 cuando se establece el éxito
        setCountdown(15);
      } else {
        alert(resultado.message || 'Error al guardar el perfil. Por favor, intenta nuevamente.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error al enviar formulario:', error);
      alert('Error inesperado. Por favor, intenta nuevamente.');
      setIsSubmitting(false);
    }
  };

  // Renderizar pantalla de éxito si el formulario se guardó exitosamente
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6 text-center px-4">
        {/* Icono de check verde grande */}
        <div className="flex items-center justify-center">
          <CheckCircle className="h-24 w-24 text-green-500" strokeWidth={1.5} />
        </div>

        {/* Título */}
        <h2 className="text-3xl font-bold text-white">¡Expediente Actualizado!</h2>

        {/* Texto descriptivo */}
        <div className="space-y-3 max-w-md">
          <p className="text-lg text-white/90">
            Tus datos se han guardado correctamente. Estamos generando tus documentos digitales.
          </p>
          <p className="text-base text-white/80 font-semibold">
            Serás redirigido al Dashboard en{' '}
            <span className="text-blue-400 font-bold text-2xl mx-1">{countdown}</span>{' '}
            {countdown === 1 ? 'segundo' : 'segundos'}...
          </p>
        </div>

        {/* Botón manual para ir al Dashboard */}
        <button
          type="button"
          onClick={handleIrAlDashboard}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#101f60]"
        >
          Volver al Dashboard ahora
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Indicador de Pasos */}
      <div className="mb-8 flex items-center justify-center space-x-4">
        {[1, 2, 3].map((paso) => (
          <div key={paso} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                paso === pasoActual
                  ? 'border-blue-400 bg-blue-400 text-white'
                  : paso < pasoActual
                    ? 'border-green-400 bg-green-400 text-white'
                    : 'border-white/30 bg-transparent text-white/60'
              }`}
            >
              {paso}
            </div>
            {paso < 3 && (
              <div
                className={`h-1 w-16 ${
                  paso < pasoActual ? 'bg-green-400' : 'bg-white/30'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Paso 1: Datos Personales y Académicos */}
      {pasoActual === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Paso 1: Datos Personales y Académicos</h2>

          {/* Sección Personal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white/90 border-b border-white/20 pb-2">
              Información Personal
            </h3>

            {/* Campos de Solo Lectura - Información Personal */}
            <div className="rounded-lg bg-white/5 p-4 space-y-2">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={datosEstudiante.nombre_completo_becado || 'N/A'}
                  disabled
                  className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white/60 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Campos Editables - Información Personal */}
            <div className="space-y-4">
              <div>
                <label htmlFor="fecha_de_nacimiento" className="block text-sm font-medium text-white mb-2">
                  Fecha de Nacimiento <span className="text-red-400">*</span>
                </label>
                <input
                  id="fecha_de_nacimiento"
                  type="date"
                  {...register('fecha_de_nacimiento')}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.fecha_de_nacimiento && (
                  <p className="mt-1 text-sm text-red-400">{errors.fecha_de_nacimiento.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="telefono_llamada" className="block text-sm font-medium text-white mb-2">
                  Teléfono (Llamadas) <span className="text-red-400">*</span>
                </label>
                <input
                  id="telefono_llamada"
                  type="tel"
                  placeholder="7000-0000"
                  {...register('telefono_llamada')}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.telefono_llamada && (
                  <p className="mt-1 text-sm text-red-400">{errors.telefono_llamada.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="mismo_telefono_whatsapp"
                    checked={mismoTelefonoWhatsApp}
                    onChange={(e) => {
                      setMismoTelefonoWhatsApp(e.target.checked);
                      if (e.target.checked && telefonoLlamada) {
                        setValue('telefono_whatsapp', telefonoLlamada);
                      }
                    }}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-400 focus:ring-2 focus:ring-blue-400"
                  />
                  <label htmlFor="mismo_telefono_whatsapp" className="text-sm font-medium text-white/80">
                    Mismo que teléfono de llamadas
                  </label>
                </div>
                <label htmlFor="telefono_whatsapp" className="block text-sm font-medium text-white mb-2">
                  Teléfono (WhatsApp)
                </label>
                <input
                  id="telefono_whatsapp"
                  type="tel"
                  placeholder="7000-0000"
                  {...register('telefono_whatsapp')}
                  disabled={mismoTelefonoWhatsApp}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-white/5 disabled:cursor-not-allowed"
                />
                {errors.telefono_whatsapp && (
                  <p className="mt-1 text-sm text-red-400">{errors.telefono_whatsapp.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sección Académica */}
          <div className="space-y-4 border-t border-white/20 pt-6">
            <h3 className="text-lg font-semibold text-white/90 border-b border-white/20 pb-2">
              Información Académica
            </h3>

            {/* Campos de Solo Lectura - Información Académica */}
            <div className="rounded-lg bg-white/5 p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Universidad</label>
                <input
                  type="text"
                  value={datosEstudiante.universidad || 'N/A'}
                  disabled
                  className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white/60 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Carrera</label>
                <input
                  type="text"
                  value={datosEstudiante.carrera || 'N/A'}
                  disabled
                  className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white/60 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Campos Editables - Información Académica */}
            <div className="space-y-4">
              <div>
                <label htmlFor="id_becado_universidad" className="block text-sm font-medium text-white mb-2">
                  Carnet/ID Universitario <span className="text-red-400">*</span>
                </label>
                <input
                  id="id_becado_universidad"
                  type="text"
                  placeholder="Ej: U12345678"
                  {...register('id_becado_universidad')}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.id_becado_universidad && (
                  <p className="mt-1 text-sm text-red-400">{errors.id_becado_universidad.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="correo_estudiantil" className="block text-sm font-medium text-white mb-2">
                  Correo Institucional/Universitario <span className="text-red-400">*</span>
                </label>
                <input
                  id="correo_estudiantil"
                  type="email"
                  placeholder="ejemplo@universidad.edu.sv"
                  {...register('correo_estudiantil')}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.correo_estudiantil && (
                  <p className="mt-1 text-sm text-red-400">{errors.correo_estudiantil.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paso 2: Ubicación */}
      {pasoActual === 2 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Paso 2: Ubicación</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="departamento" className="block text-sm font-medium text-white mb-2">
                Departamento <span className="text-red-400">*</span>
              </label>
              <select
                id="departamento"
                {...register('departamento')}
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Selecciona un departamento</option>
                {departamentos.map((depto) => (
                  <option key={depto.nombre} value={depto.nombre} className="bg-[#101f60]">
                    {depto.nombre}
                  </option>
                ))}
              </select>
              {errors.departamento && (
                <p className="mt-1 text-sm text-red-400">{errors.departamento.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="municipio" className="block text-sm font-medium text-white mb-2">
                Municipio <span className="text-red-400">*</span>
              </label>
              <select
                id="municipio"
                {...register('municipio')}
                disabled={!departamentoSeleccionado}
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-white/5 disabled:cursor-not-allowed"
              >
                <option value="">Selecciona un municipio</option>
                {municipiosDisponibles.map((municipio) => (
                  <option key={municipio.nombre} value={municipio.nombre} className="bg-[#101f60]">
                    {municipio.nombre}
                  </option>
                ))}
              </select>
              {errors.municipio && (
                <p className="mt-1 text-sm text-red-400">{errors.municipio.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="distrito" className="block text-sm font-medium text-white mb-2">
                Distrito <span className="text-red-400">*</span>
              </label>
              <select
                id="distrito"
                {...register('distrito')}
                disabled={!municipioSeleccionado}
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-white/5 disabled:cursor-not-allowed"
              >
                <option value="">Selecciona un distrito</option>
                {distritosDisponibles.map((distrito) => (
                  <option key={distrito} value={distrito} className="bg-[#101f60]">
                    {distrito}
                  </option>
                ))}
              </select>
              {errors.distrito && (
                <p className="mt-1 text-sm text-red-400">{errors.distrito.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: Info Adicional */}
      {pasoActual === 3 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Paso 3: Información Adicional</h2>

          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register('tiene_una_discapacidad')}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-400 focus:ring-2 focus:ring-blue-400"
                />
                <span className="text-sm font-medium text-white">¿Tiene alguna discapacidad?</span>
              </label>
            </div>

            {watch('tiene_una_discapacidad') && (
              <div>
                <label htmlFor="detalle_discapacidad" className="block text-sm font-medium text-white mb-2">
                  Detalle de Discapacidad
                </label>
                <input
                  id="detalle_discapacidad"
                  type="text"
                  placeholder="Describe el detalle de la discapacidad"
                  {...register('detalle_discapacidad')}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            )}

            <div className="border-t border-white/20 pt-4 space-y-4">
              <div>
                <label htmlFor="miembro_de_consejo" className="block text-sm font-medium text-white mb-2">
                  ¿Eres miembro del consejo? <span className="text-red-400">*</span>
                </label>
                <select
                  id="miembro_de_consejo"
                  {...register('miembro_de_consejo')}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Selecciona una opción</option>
                  <option value="SÍ" className="bg-[#101f60]">SÍ</option>
                  <option value="NO" className="bg-[#101f60]">NO</option>
                </select>
                {errors.miembro_de_consejo && (
                  <p className="mt-1 text-sm text-red-400">{errors.miembro_de_consejo.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="becado_elite" className="block text-sm font-medium text-white mb-2">
                  ¿Eres becado élite? <span className="text-red-400">*</span>
                </label>
                <select
                  id="becado_elite"
                  {...register('becado_elite')}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Selecciona una opción</option>
                  <option value="SÍ" className="bg-[#101f60]">SÍ</option>
                  <option value="NO" className="bg-[#101f60]">NO</option>
                </select>
                {errors.becado_elite && (
                  <p className="mt-1 text-sm text-red-400">{errors.becado_elite.message}</p>
                )}
              </div>
            </div>

            <div className="border-t border-white/20 pt-4">
              <h3 className="text-lg font-semibold text-white mb-4">Contacto de Emergencia</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="nombre_emergencia" className="block text-sm font-medium text-white mb-2">
                    Nombre Completo <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="nombre_emergencia"
                    type="text"
                    placeholder="Nombre completo del contacto"
                    {...register('nombre_emergencia')}
                    className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {errors.nombre_emergencia && (
                    <p className="mt-1 text-sm text-red-400">{errors.nombre_emergencia.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="telefono_emergencia" className="block text-sm font-medium text-white mb-2">
                    Teléfono <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="telefono_emergencia"
                    type="tel"
                    placeholder="7000-0000"
                    {...register('telefono_emergencia')}
                    className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {errors.telefono_emergencia && (
                    <p className="mt-1 text-sm text-red-400">{errors.telefono_emergencia.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="parentesco_emergencia" className="block text-sm font-medium text-white mb-2">
                    Parentesco <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="parentesco_emergencia"
                    {...register('parentesco_emergencia')}
                    className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Selecciona un parentesco</option>
                    <option value="Padre" className="bg-[#101f60]">Padre</option>
                    <option value="Madre" className="bg-[#101f60]">Madre</option>
                    <option value="Hermano/a" className="bg-[#101f60]">Hermano/a</option>
                    <option value="Esposo/a" className="bg-[#101f60]">Esposo/a</option>
                    <option value="Hijo/a" className="bg-[#101f60]">Hijo/a</option>
                    <option value="Tío/a" className="bg-[#101f60]">Tío/a</option>
                    <option value="Primo/a" className="bg-[#101f60]">Primo/a</option>
                    <option value="Otro" className="bg-[#101f60]">Otro</option>
                  </select>
                  {errors.parentesco_emergencia && (
                    <p className="mt-1 text-sm text-red-400">{errors.parentesco_emergencia.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones de Navegación */}
      <div className="flex items-center justify-between pt-6 border-t border-white/20">
        <button
          type="button"
          onClick={handleAnterior}
          disabled={pasoActual === 1}
          className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed disabled:text-white/40"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        {pasoActual < 3 ? (
          <button
            type="button"
            onClick={handleSiguiente}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar y Generar Expediente'
            )}
          </button>
        )}
      </div>
    </form>
  );
}
