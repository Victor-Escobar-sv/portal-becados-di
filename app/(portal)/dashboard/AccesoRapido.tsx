import { IdCard, FileText, Clock, BookOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AccesoRapidoProps {
  perfilCompleto: boolean;
  urlCarnet?: string | null;
  urlExpediente?: string | null;
}

export default function AccesoRapido({
  perfilCompleto,
  urlCarnet,
  urlExpediente,
}: AccesoRapidoProps) {
  // Determinar la lógica del carnet
  // Si tiene URL y NO es 'PENDIENTE' -> Ver Carnet (externo)
  // Si URL === 'PENDIENTE' -> Generando Carnet (deshabilitado, con spinner)
  // Si NO tiene URL y perfil NO completo -> Completar Perfil (interno)
  // Si NO tiene URL y perfil SÍ completo -> Solicitar Carnet (sin link por ahora, pero habilitado)
  const carnetEstaPendiente = urlCarnet === 'PENDIENTE';
  const carnetLink = urlCarnet && !carnetEstaPendiente ? urlCarnet : null;
  const carnetInternalLink = urlCarnet && !carnetEstaPendiente ? null : (perfilCompleto ? null : '/completar-perfil');
  const carnetTexto = carnetEstaPendiente
    ? 'Generando Carnet...'
    : urlCarnet 
      ? 'Ver Carnet' 
      : (perfilCompleto 
        ? 'Solicitar Carnet' 
        : 'Completar Perfil');
  const carnetEsExterno = !!urlCarnet && !carnetEstaPendiente;
  const carnetTieneLink = (!!urlCarnet && !carnetEstaPendiente) || (!perfilCompleto && !carnetEstaPendiente); // Tiene link si tiene URL válida o si necesita completar perfil
  const carnetEstaGenerando = carnetEstaPendiente;

  // Determinar la lógica del expediente
  // Si tiene URL y NO es 'PENDIENTE' -> Ver Expediente (externo)
  // Si URL === 'PENDIENTE' -> Generando Expediente (deshabilitado, con spinner)
  // Si NO tiene URL y perfil NO completo -> Completar Perfil (interno)
  // Si NO tiene URL y perfil SÍ completo -> Solicitar Expediente (sin link por ahora, pero habilitado)
  const expedienteEstaPendiente = urlExpediente === 'PENDIENTE';
  const expedienteLink = urlExpediente && !expedienteEstaPendiente ? urlExpediente : null;
  const expedienteInternalLink = urlExpediente && !expedienteEstaPendiente ? null : (perfilCompleto ? null : '/completar-perfil');
  const expedienteTexto = expedienteEstaPendiente
    ? 'Generando Expediente...'
    : urlExpediente 
      ? 'Ver Expediente' 
      : (perfilCompleto 
        ? 'Solicitar Expediente' 
        : 'Completar Perfil');
  const expedienteEsExterno = !!urlExpediente && !expedienteEstaPendiente;
  const expedienteTieneLink = (!!urlExpediente && !expedienteEstaPendiente) || (!perfilCompleto && !expedienteEstaPendiente); // Tiene link si tiene URL válida o si necesita completar perfil
  const expedienteEstaGenerando = expedienteEstaPendiente;

  const opciones = [
    {
      titulo: 'Mi Carnet Digital',
      icono: IdCard,
      descripcion: carnetEstaPendiente
        ? 'Tu carnet digital se está generando. Estará disponible pronto.'
        : urlCarnet 
          ? 'Accede a tu ID virtual de estudiante.' 
          : perfilCompleto 
            ? 'Solicita tu carnet digital de estudiante.'
            : 'Completa tu perfil para obtener tu carnet digital.',
      link: carnetLink,
      internalLink: carnetInternalLink,
      textoBoton: carnetTexto,
      esExterno: carnetEsExterno,
      habilitado: true,
      tieneLink: carnetTieneLink,
      estaGenerando: carnetEstaGenerando,
    },
    {
      titulo: 'Mi Expediente',
      icono: FileText,
      descripcion: expedienteEstaPendiente
        ? 'Tu expediente digital se está generando. Estará disponible pronto.'
        : urlExpediente 
          ? 'Consulta tus datos personales y académicos.' 
          : perfilCompleto 
            ? 'Solicita tu expediente digital.'
            : 'Completa tu perfil para generar tu expediente.',
      link: expedienteLink,
      internalLink: expedienteInternalLink,
      textoBoton: expedienteTexto,
      esExterno: expedienteEsExterno,
      habilitado: true,
      tieneLink: expedienteTieneLink,
      estaGenerando: expedienteEstaGenerando,
    },
    {
      titulo: 'Mis Horas',
      icono: Clock,
      descripcion: 'Revisa tu progreso de horas de voluntariado.',
      link: null,
      internalLink: '/horas-voluntariado',
      textoBoton: 'Ver Detalles',
      esExterno: false,
      habilitado: true,
      tieneLink: true,
      estaGenerando: false,
    },
    {
      titulo: 'Reglamento de Beca',
      icono: BookOpen,
      descripcion: 'Consulta tus derechos y deberes oficiales.',
      link: 'https://drive.google.com/file/d/1re1biPhFXCQH0BegBXE4Amzek4dklxuJ/view?usp=drive_link',
      internalLink: null,
      textoBoton: 'Abrir Reglamento',
      esExterno: true,
      habilitado: true,
      tieneLink: true,
      estaGenerando: false,
    },
  ];

  return (
    <section className="py-8">
      <h2 className="mb-6 text-2xl font-bold text-white md:text-3xl">
        Acceso Rápido
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {opciones.map((opcion) => {
          const Icono = opcion.icono;

          // Si está generando (PENDIENTE) -> Mostrar botón deshabilitado con spinner
          // Esta condición debe ir primero para evitar renderizar links cuando está en estado PENDIENTE
          if (opcion.estaGenerando) {
            return (
              <Card key={opcion.titulo} className="h-full transition-shadow">
                <CardHeader>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-lg bg-[#101f60] p-3">
                      <Icono className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{opcion.titulo}</CardTitle>
                  </div>
                  <CardDescription>{opcion.descripcion}</CardDescription>
                </CardHeader>
                <CardContent>
                  <button
                    disabled
                    className="w-full rounded-md bg-gray-400/50 px-4 py-2 text-center text-sm font-medium text-white cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {opcion.textoBoton}
                  </button>
                </CardContent>
              </Card>
            );
          }

          // Si tiene link externo (carnet o expediente con URL, o reglamento)
          if (opcion.link && opcion.esExterno && opcion.tieneLink) {
            return (
              <a
                key={opcion.titulo}
                href={opcion.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="h-full transition-shadow hover:shadow-lg cursor-pointer">
                  <CardHeader>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-lg bg-[#101f60] p-3">
                        <Icono className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">{opcion.titulo}</CardTitle>
                    </div>
                    <CardDescription>{opcion.descripcion}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full rounded-md bg-[#101f60] px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-[#0d1849]">
                      {opcion.textoBoton}
                    </div>
                  </CardContent>
                </Card>
              </a>
            );
          }

          // Si tiene link interno (navegación dentro de la app)
          if (opcion.internalLink && opcion.tieneLink) {
            return (
              <Link
                key={opcion.titulo}
                href={opcion.internalLink}
                className="block"
              >
                <Card className="h-full transition-shadow hover:shadow-lg cursor-pointer">
                  <CardHeader>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-lg bg-[#101f60] p-3">
                        <Icono className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">{opcion.titulo}</CardTitle>
                    </div>
                    <CardDescription>{opcion.descripcion}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full rounded-md bg-[#101f60] px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-[#0d1849]">
                      {opcion.textoBoton}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          }

          // Si no tiene link pero está habilitado (perfil completo pero sin URL)
          // Mostrar el botón con estilo normal pero sin link
          if (opcion.habilitado && !opcion.tieneLink) {
            return (
              <Card key={opcion.titulo} className="h-full transition-shadow">
                <CardHeader>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-lg bg-[#101f60] p-3">
                      <Icono className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{opcion.titulo}</CardTitle>
                  </div>
                  <CardDescription>{opcion.descripcion}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full rounded-md bg-[#101f60] px-4 py-2 text-center text-sm font-medium text-white">
                    {opcion.textoBoton}
                  </div>
                </CardContent>
              </Card>
            );
          }

          // Fallback: Si no tiene link y no está habilitado
          return (
            <Card key={opcion.titulo} className="transition-shadow">
              <CardHeader>
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-[#101f60] p-3">
                    <Icono className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{opcion.titulo}</CardTitle>
                </div>
                <CardDescription>{opcion.descripcion}</CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  disabled
                  className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
                >
                  Próximamente
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

