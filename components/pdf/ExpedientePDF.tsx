import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

// Registrar fuentes (opcional, si quieres usar fuentes personalizadas)
// Por defecto, @react-pdf/renderer usa Helvetica, Times-Roman y Courier

// Estilos del documento
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#101f60',
    borderBottomStyle: 'solid',
    paddingBottom: 15,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 150,
    height: 50,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#101f60',
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#101f60',
    marginBottom: 10,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#101f60',
    borderBottomStyle: 'solid',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
    width: '40%',
    marginRight: 10,
  },
  value: {
    fontSize: 10,
    color: '#000000',
    width: '60%',
    flexWrap: 'wrap',
  },
  fullRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 4,
  },
  fullLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
    width: '25%',
    marginRight: 10,
  },
  fullValue: {
    fontSize: 10,
    color: '#000000',
    width: '75%',
    flexWrap: 'wrap',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666666',
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
    borderTopStyle: 'solid',
    paddingTop: 10,
  },
  emptyValue: {
    fontSize: 10,
    color: '#999999',
    fontStyle: 'italic',
  },
});

// Interface para las props del componente
export interface ExpedientePDFProps {
  // Datos del Estudiante
  nombreCompleto: string;
  idBecado: string;
  fechaNacimiento?: string;
  telefonoLlamada?: string;
  telefonoWhatsapp?: string;
  correoPersonal?: string;
  
  // Información Académica
  universidad?: string;
  carrera?: string;
  idBecadoUniversidad?: string;
  correoEstudiantil?: string;
  
  // Información Adicional
  departamento?: string;
  municipio?: string;
  distrito?: string;
  nombreEmergencia?: string;
  telefonoEmergencia?: string;
  parentescoEmergencia?: string;
  
  // Opcional: URL del logo (si está disponible públicamente)
  logoUrl?: string;
}

// Función helper para formatear fechas
const formatearFecha = (fecha?: string): string => {
  if (!fecha) return 'No especificado';
  
  try {
    // Si la fecha viene en formato YYYY-MM-DD, convertirla a DD/MM/YYYY
    if (fecha.includes('-')) {
      const [year, month, day] = fecha.split('-');
      return `${day}/${month}/${year}`;
    }
    return fecha;
  } catch (error) {
    return fecha;
  }
};

// Función helper para mostrar valor o texto por defecto
const mostrarValor = (valor?: string | null, textoDefecto: string = 'No especificado'): string => {
  if (!valor || valor.trim() === '') {
    return textoDefecto;
  }
  return valor;
};

/**
 * Componente principal del documento PDF del Expediente Digital
 */
const ExpedienteDocument: React.FC<ExpedientePDFProps> = ({
  nombreCompleto,
  idBecado,
  fechaNacimiento,
  telefonoLlamada,
  telefonoWhatsapp,
  correoPersonal,
  universidad,
  carrera,
  idBecadoUniversidad,
  correoEstudiantil,
  departamento,
  municipio,
  distrito,
  nombreEmergencia,
  telefonoEmergencia,
  parentescoEmergencia,
  logoUrl,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {logoUrl ? (
              <Image src={logoUrl} style={styles.logo} />
            ) : (
              <Text style={[styles.title, { fontSize: 14, marginBottom: 0 }]}>
                Dirección de Integración
              </Text>
            )}
          </View>
          <Text style={styles.title}>EXPEDIENTE DIGITAL DE BECARIO</Text>
        </View>

        {/* Sección 1: Datos del Estudiante */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Datos del Estudiante</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Nombre Completo:</Text>
            <Text style={styles.value}>{mostrarValor(nombreCompleto)}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>ID Becario (BDI):</Text>
            <Text style={styles.value}>{mostrarValor(idBecado)}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Fecha de Nacimiento:</Text>
            <Text style={styles.value}>{formatearFecha(fechaNacimiento)}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Teléfono (Llamadas):</Text>
            <Text style={styles.value}>{mostrarValor(telefonoLlamada)}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Teléfono (WhatsApp):</Text>
            <Text style={styles.value}>{mostrarValor(telefonoWhatsapp)}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Correo Personal:</Text>
            <Text style={styles.value}>{mostrarValor(correoPersonal)}</Text>
          </View>
        </View>

        {/* Sección 2: Información Académica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Información Académica</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Universidad:</Text>
            <Text style={styles.value}>{mostrarValor(universidad)}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Carrera:</Text>
            <Text style={styles.value}>{mostrarValor(carrera)}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>ID Estudiantil:</Text>
            <Text style={styles.value}>{mostrarValor(idBecadoUniversidad)}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Correo Institucional:</Text>
            <Text style={styles.value}>{mostrarValor(correoEstudiantil)}</Text>
          </View>
        </View>

        {/* Sección 3: Información Adicional */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Información Adicional</Text>
          
          <View style={styles.fullRow}>
            <Text style={styles.fullLabel}>Ubicación:</Text>
            <Text style={styles.fullValue}>
              {departamento || municipio || distrito
                ? [
                    mostrarValor(departamento, ''),
                    mostrarValor(municipio, ''),
                    mostrarValor(distrito, ''),
                  ]
                    .filter((v) => v !== '' && v !== 'No especificado')
                    .join(', ') || 'No especificado'
                : 'No especificado'}
            </Text>
          </View>
          
          <View style={styles.fullRow}>
            <Text style={styles.fullLabel}>Contacto de Emergencia:</Text>
            <Text style={styles.fullValue}>
              {nombreEmergencia && nombreEmergencia.trim() !== ''
                ? `${nombreEmergencia}${parentescoEmergencia && parentescoEmergencia.trim() !== '' ? ` (${parentescoEmergencia})` : ''}${telefonoEmergencia && telefonoEmergencia.trim() !== '' ? ` - ${telefonoEmergencia}` : ''}`
                : 'No especificado'}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Documento generado el {new Date().toLocaleDateString('es-SV', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })} - Dirección de Integración
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ExpedienteDocument;

