'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Server Action para iniciar sesión
 * Autentica al usuario con email y contraseña
 * Redirige según el rol: admin -> /admin/dashboard, estudiante -> /dashboard
 */
export async function iniciarSesion(
  email: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  // Validaciones básicas
  if (!email || !email.includes('@')) {
    return {
      success: false,
      message: 'Por favor, ingresa un correo electrónico válido',
    };
  }

  if (!password || password.length === 0) {
    return {
      success: false,
      message: 'Por favor, ingresa tu contraseña',
    };
  }

  try {
    const supabase = await createClient();

    // Intentar iniciar sesión
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (error) {
      return {
        success: false,
        message: error.message || 'Credenciales incorrectas',
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: 'No se pudo iniciar sesión',
      };
    }

    // Verificar si el usuario es admin
    const { data: adminData, error: adminError } = await (supabase as any)
      .from('usuarios_administrativos')
      .select('id')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    const isAdmin = !adminError && adminData !== null;

    // Revalidar rutas antes de redirect
    revalidatePath('/dashboard');
    revalidatePath('/admin/dashboard');
    revalidatePath('/login');

    // Redirigir según el rol
    if (isAdmin) {
      redirect('/admin/dashboard');
    } else {
      redirect('/dashboard');
    }
  } catch (error) {
    // Si el error es un redirect de Next.js, re-lanzarlo
    if (error && typeof error === 'object' && 'digest' in error && String(error.digest).includes('NEXT_REDIRECT')) {
      throw error;
    }

    console.error('Error inesperado en iniciarSesion:', error);
    return {
      success: false,
      message: 'Error inesperado. Por favor, intenta nuevamente.',
    };
  }
}

