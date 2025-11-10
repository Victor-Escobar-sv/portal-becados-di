import { Instagram, Facebook, Twitter, Music } from 'lucide-react';

export default function RedesSociales() {
  const redes = [
    {
      nombre: 'Instagram',
      icono: Instagram,
      url: 'https://www.instagram.com/integracion_sv/',
      gradiente: 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500',
    },
    {
      nombre: 'TikTok',
      icono: Music,
      url: 'https://www.tiktok.com/@integracionsv',
      gradiente: 'bg-gradient-to-r from-cyan-400 via-red-500 to-gray-900',
    },
    {
      nombre: 'Facebook',
      icono: Facebook,
      url: 'https://www.facebook.com/integracionsv',
      gradiente: 'bg-blue-600',
    },
    {
      nombre: 'X',
      icono: Twitter,
      url: 'https://x.com/integracionsv',
      gradiente: 'bg-black',
    },
  ];

  return (
    <section className="py-8">
      <h2 className="mb-6 text-2xl font-bold text-white md:text-3xl">
        Síguenos en nuestras redes OFICIALES
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {redes.map((red) => {
          const Icono = red.icono;
          return (
            <a
              key={red.nombre}
              href={red.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${red.gradiente} flex flex-col items-center justify-center gap-2 rounded-lg p-6 text-white transition-transform hover:scale-105`}
            >
              <Icono className="h-8 w-8" />
              <span className="font-semibold">{red.nombre}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

