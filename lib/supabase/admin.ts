import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

/**
 * Cliente Admin de Supabase que usa SERVICE_ROLE_KEY
 * 
 * ⚠️ ADVERTENCIA: Este cliente puede saltarse RLS (Row Level Security)
 * 
 * USO APROPIADO:
 * - Solo en Server Actions/Server Components (nunca en Client Components)
 * - Solo para operaciones antes del login (validación de tokens, etc.)
 * - Para operaciones administrativas que requieren bypass de RLS
 * 
 * SEGURIDAD:
 * - La variable SUPABASE_SERVICE_ROLE_KEY NO debe tener prefijo NEXT_PUBLIC_
 * - Nunca exponer este cliente al cliente (browser)
 * - Usar con precaución y solo cuando sea absolutamente necesario
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

