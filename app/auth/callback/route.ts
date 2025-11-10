import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Ruta de callback para la autenticación de Supabase
 * Maneja redirects de OAuth o Magic Links (si se usan en el futuro)
 * 
 * Nota: El flujo de activación ahora usa contraseña directa,
 * pero esta ruta se mantiene para casos futuros de OAuth.
 * 
 * Redirige según el rol: admin -> /admin/dashboard, estudiante -> /dashboard
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');

  // Si hay un error, redirigir a home
  if (error) {
    return NextResponse.redirect(
      `${requestUrl.origin}/?error=${encodeURIComponent(error)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    
    // Intercambiar el código por la sesión
    const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error al intercambiar código:', exchangeError);
      return NextResponse.redirect(
        `${requestUrl.origin}/?error=${encodeURIComponent('Error al autenticar. Por favor, intenta nuevamente.')}`
      );
    }

    // Verificar si el usuario es admin
    if (data?.user) {
      const { data: adminData, error: adminError } = await (supabase as any)
        .from('usuarios_administrativos')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      const isAdmin = !adminError && adminData !== null;

      // Redirigir según el rol
      if (isAdmin) {
        return NextResponse.redirect(`${requestUrl.origin}/admin/dashboard`);
      }
    }

    // Redirigir al dashboard de estudiante por defecto
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
  }

  // Si no hay código, redirigir a home
  return NextResponse.redirect(`${requestUrl.origin}/`);
}
