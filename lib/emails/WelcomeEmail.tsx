/**
 * Plantilla de correo de bienvenida para becarios
 * Retorna HTML inline para el correo electrónico
 */

interface WelcomeEmailProps {
  nombreCompleto: string;
}

export function getWelcomeEmailHTML({ nombreCompleto }: WelcomeEmailProps): string {
  // Extraer el primer nombre del nombre completo
  const primerNombre = nombreCompleto.split(' ')[0];

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a la Dirección de Integración</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header con Logo -->
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #101f60;">
              <img src="https://your-domain.com/logo-direccion-de-integracion.jpeg" alt="Logo Dirección de Integración" style="max-width: 300px; height: auto;" />
            </td>
          </tr>
          
          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="margin: 0 0 20px 0; color: #101f60; font-size: 24px; font-weight: bold;">
                ¡Bienvenido, ${primerNombre}!
              </h1>
              
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Nos complace darte la bienvenida a la <strong>Dirección de Integración</strong> y a tu Portal de Becado.
              </p>
              
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Tu cuenta ha sido activada exitosamente. Ahora puedes acceder a tu portal personalizado donde encontrarás toda la información relevante sobre tu beca, documentos importantes y novedades.
              </p>
              
              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Este correo será tu medio de comunicación oficial para recibir actualizaciones sobre tu beca. Te recomendamos mantenerlo actualizado en tu perfil.
              </p>
              
              <!-- Botón de Acceso -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://your-domain.com/login" style="display: inline-block; padding: 12px 30px; background-color: #101f60; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                      Acceder a mi Portal
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos a través de nuestro correo o teléfono.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px; text-align: center;">
                <strong>Dirección de Integración</strong>
              </p>
              <p style="margin: 0; color: #666666; font-size: 12px; text-align: center;">
                Este es un correo automático. Por favor, no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

