import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Middleware para proteger rutas basado en roles (estudiante vs admin)
 * 
 * Lógica estricta:
 * 1. Verifica autenticación
 * 2. Consulta si el usuario es admin
 * 3. Aplica reglas de redirección según el rol
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas que no requieren autenticación
  // IMPORTANTE: Estas rutas deben poder accederse SIN autenticación
  const publicPaths = ['/activar', '/auth/callback', '/login', '/unauthorized'];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path)) || pathname === '/';

  // Actualizar sesión y obtener usuario (esto actualiza las cookies)
  const { response, supabase, user } = await updateSession(request);

  // CRÍTICO: Permitir rutas públicas SIN verificar autenticación
  // Esto previene bucles de redirección
  if (isPublicPath) {
    // Si está en una ruta pública, siempre permitir acceso
    // Incluso si hay un usuario autenticado, permitir acceso a estas rutas
    return response;
  }

  // ========== PASO 1: OBTENER USUARIO ==========
  // Si no hay usuario autenticado, redirigir a login
  if (!user) {
    // Evitar bucle: no redirigir si ya estamos en /login o en ruta pública
    if (!isPublicPath && pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  }

  // ========== PASO 2: DEFINIR RUTAS BASE ==========
  const isAdminRoute = pathname.startsWith('/admin');
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isRootOrAuth = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/auth');

  // ========== PASO 3: CONSULTAR ROL ADMIN ==========
  try {
    // Consultar si el usuario es admin
    const { data: adminData, error: adminError } = await (supabase as any)
      .from('usuarios_administrativos')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    // Si hay error al consultar, registrar para debugging
    if (adminError) {
      console.error('[Middleware] Error al consultar usuarios_administrativos:', {
        error: adminError,
        userId: user.id,
        pathname,
      });
    }

    const isAdmin = !adminError && adminData !== null;

    // Debug logging (remover en producción si es necesario)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Verificación de roles:', {
        userId: user.id,
        pathname,
        isAdmin,
        isAdminRoute,
        isDashboardRoute,
        adminData: adminData ? 'encontrado' : 'no encontrado',
      });
    }

    // ========== PASO 4: APLICAR REGLAS DE REDIRECCIÓN ==========

    // ========== SI ES ADMIN ==========
    if (isAdmin) {
      // Regla 1: Si intenta entrar a isDashboardRoute O isRootOrAuth -> REDIRIGIR a /admin/dashboard
      if (isDashboardRoute || isRootOrAuth) {
        // Solo redirigir si no está ya en /admin/dashboard
        if (pathname !== '/admin/dashboard') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url), {
            headers: response.headers,
          });
        }
        // Si ya está en /admin/dashboard, permitir
        return response;
      }

      // Regla 2: Si intenta entrar a isAdminRoute -> PERMITIR
      if (isAdminRoute) {
        return response;
      }

      // Para cualquier otra ruta (por seguridad), redirigir a /admin/dashboard
      // Solo si no está ya ahí
      if (pathname !== '/admin/dashboard') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url), {
          headers: response.headers,
        });
      }

      // Si ya está en /admin/dashboard, permitir
      return response;
    }

    // ========== SI NO ES ADMIN (Estudiante) ==========
    // Regla 1: Si intenta entrar a isAdminRoute -> REDIRIGIR a /dashboard
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url), {
        headers: response.headers,
      });
    }

    // Regla 2: Si intenta entrar a isDashboardRoute -> PERMITIR
    if (isDashboardRoute) {
      return response;
    }

    // Regla 3: Si intenta entrar a isRootOrAuth -> REDIRIGIR a /dashboard
    if (isRootOrAuth) {
      return NextResponse.redirect(new URL('/dashboard', request.url), {
        headers: response.headers,
      });
    }

    // Para otras rutas de estudiante (ej. /horas-voluntariado) -> PERMITIR
    // También permitir rutas públicas si el usuario está autenticado
    if (isPublicPath) {
      return response;
    }

    // Si no es una ruta conocida, permitir acceso (podría ser una ruta válida de estudiante)
    return response;

  } catch (error) {
    // Si hay un error al verificar roles, registrar el error
    console.error('[Middleware] Error al verificar roles:', {
      error,
      userId: user?.id,
      pathname,
    });

    // En caso de error, permitir acceso pero registrar (para evitar bloquear usuarios legítimos)
    // O redirigir a login si prefieres mayor seguridad
    // Por ahora, permitimos acceso si ya está autenticado
    if (isAdminRoute) {
      // Si hay error y está intentando acceder a admin, ser más estricto
      return NextResponse.redirect(new URL('/dashboard', request.url), {
        headers: response.headers,
      });
    }

    // Para otras rutas, permitir acceso si está autenticado
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
