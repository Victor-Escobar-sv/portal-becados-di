'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Server Action para cerrar sesión
 * 
 * Realiza las siguientes acciones:
 * 1. Cierra la sesión en Supabase
 * 2. Limpia el caché de Next.js para todas las rutas relevantes
 * 3. Redirige al login explícitamente desde el servidor
 * 
 * Esto asegura que el usuario sea expulsado inmediatamente sin rebotes.
 */
export async function logout() {
  const supabase = await createClient();

  // Cerrar sesión en Supabase
  await supabase.auth.signOut();

  // Limpiar caché de Next.js para todas las rutas relevantes
  // Esto asegura que los datos de sesión no se queden en caché
  revalidatePath('/', 'layout'); // Limpia el layout raíz
  revalidatePath('/dashboard'); // Limpia el dashboard de estudiantes
  revalidatePath('/admin'); // Limpia las rutas administrativas
  revalidatePath('/horas-voluntariado'); // Limpia las rutas de estudiantes

  // Redirigir al login explícitamente desde el servidor
  // Esto evita que el middleware redirija de nuevo a rutas protegidas
  redirect('/login');
}

