import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Anuncios() {
  const anuncios = [
    '¡Nuevas oportunidades de voluntariado en San Miguel!',
    'Fecha límite para entrega de notas: 15 de Diciembre.',
    'Taller de Liderazgo: Inscripciones Abiertas (Cupos Limitados).',
    'Recordatorio: Actualiza tus datos de contacto en "Mi Expediente".',
  ];

  return (
    <section className="py-8">
      <h2 className="mb-6 text-2xl font-bold text-white md:text-3xl">
        Anuncios Importantes
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {anuncios.map((anuncio, index) => (
          <Card key={index} className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg">{anuncio}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Publicado el {new Date().toLocaleDateString('es-SV')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

