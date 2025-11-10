'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Resend } from 'resend';
import { getWelcomeEmailHTML } from '@/lib/emails/WelcomeEmail';

// Esquema de validación Zod para contraseña (debe coincidir con el del cliente)
const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
  .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
  .regex(/[0-9]/, 'La contraseña debe contener al menos un número');

/**
 * Valida si el token de onboarding existe y no ha sido usado
 * 
 * Usa el cliente Admin para saltarse RLS, ya que el usuario aún es anónimo
 * y no puede leer la tabla estudiantes con las políticas de seguridad activas.
 * 
 * Retorna los datos necesarios para mostrar en el formulario:
 * - nombre_completo_becado
 * - correo_personal
 */
export async function validarToken(token: string) {
  // Usamos el cliente Admin porque el usuario aún no está autenticado
  // y las políticas RLS bloquearían la lectura
  const supabase = createAdminClient();

  const { data, error } = await (supabase as any)
    .from('estudiantes')
    .select('id, nombre_completo_becado, correo_personal, ha_completado_onboarding, onboarding_token')
    .eq('onboarding_token', token)
    .single();

  if (error || !data) {
    return {
      success: false,
      message: 'Token inválido o no encontrado',
      estudiante: null,
    };
  }

  if (data.ha_completado_onboarding) {
    return {
      success: false,
      message: 'Este token ya ha sido utilizado',
      estudiante: null,
    };
  }

  if (!data.nombre_completo_becado || !data.correo_personal) {
    return {
      success: false,
      message: 'Faltan datos requeridos en el registro del estudiante',
      estudiante: null,
    };
  }

  return {
    success: true,
    estudiante: {
      nombre_completo_becado: data.nombre_completo_becado,
      correo_personal: data.correo_personal,
    },
  };
}

/**
 * Activa la cuenta del estudiante con contraseña
 * 
 * Flujo:
 * 1. Valida el token con Admin Client
 * 2. Crea el usuario en Supabase Auth usando Admin Client
 * 3. Actualiza la tabla estudiantes (vincula auth_user_id, quema el token)
 * 4. Inicia sesión automáticamente
 * 5. Redirige al dashboard
 * 
 * NOTA: El redirect debe estar FUERA del try/catch porque Next.js redirect()
 * funciona lanzando un error especial (NEXT_REDIRECT).
 */
export async function activarCuenta(
  token: string,
  email: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();

  // Paso 0: Validar el token nuevamente
  const validacion = await validarToken(token);
  if (!validacion.success) {
    return {
      success: false,
      message: validacion.message || 'Error al validar el token',
    };
  }

  // Validar contraseña con Zod (mismos requisitos que en el cliente)
  const passwordValidation = passwordSchema.safeParse(password);
  if (!passwordValidation.success) {
    return {
      success: false,
      message: passwordValidation.error.issues[0].message,
    };
  }

  let authUserId: string | null = null;
  let tokenQuemado = false;
  let debeRedirigirALogin = false;

  try {
    // Paso 1: Crear usuario en Supabase Auth usando Admin Client
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true, // Confirmar email automáticamente
    });

    if (createUserError || !authUser.user) {
      console.error('Error al crear usuario:', createUserError);
      return {
        success: false,
        message: createUserError?.message || 'Error al crear la cuenta. El correo podría estar en uso.',
      };
    }

    authUserId = authUser.user.id;

    // Paso 2: Actualizar la tabla estudiantes con Admin Client
    // IMPORTANTE: Quemar el token estableciéndolo en NULL
    const { error: updateError } = await (supabaseAdmin as any)
      .from('estudiantes')
      .update({
        auth_user_id: authUser.user.id,
        correo_personal: email.trim().toLowerCase(),
        ha_completado_onboarding: true,
        onboarding_token: null, // ¡QUEMAR EL TOKEN!
      })
      .eq('onboarding_token', token);

    if (updateError) {
      console.error('Error al actualizar estudiante:', updateError);
      // Si falla la actualización, intentar eliminar el usuario creado
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      return {
        success: false,
        message: 'Error al vincular la cuenta. Por favor, intenta nuevamente.',
      };
    }

    // Token quemado exitosamente
    tokenQuemado = true;

    // Paso 2.5: Enviar correo de bienvenida
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Obtener el nombre completo del estudiante para personalizar el correo
      const { data: estudianteData } = await (supabaseAdmin as any)
        .from('estudiantes')
        .select('nombre_completo_becado')
        .eq('auth_user_id', authUser.user.id)
        .single();

      const nombreCompleto = estudianteData?.nombre_completo_becado || 'Becario';

      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email.trim().toLowerCase(),
        subject: '¡Bienvenido a la Dirección de Integración!',
        html: getWelcomeEmailHTML({ nombreCompleto }),
      });
    } catch (emailError) {
      // No fallar la activación si el correo falla, solo loguear el error
      console.error('Error al enviar correo de bienvenida:', emailError);
    }

    // Paso 3: Auto-login usando el cliente estándar para establecer cookies
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (signInError) {
      console.error('Error al iniciar sesión:', signInError);
      // El usuario ya está creado y vinculado, pero no pudo iniciar sesión
      // Como el token ya se quemó, debemos redirigir a login manual
      debeRedirigirALogin = true;
      revalidatePath('/activar');
      revalidatePath('/login');
    } else {
      // Verificar si el usuario es admin (aunque en este flujo no debería serlo)
      const { data: adminData, error: adminError } = await (supabase as any)
        .from('usuarios_administrativos')
        .select('id')
        .eq('auth_user_id', authUser.user.id)
        .maybeSingle();

      const isAdmin = !adminError && adminData !== null;

      // Revalidar rutas antes de redirect exitoso
      revalidatePath('/activar');
      revalidatePath('/dashboard');
      revalidatePath('/admin/dashboard');

      // Almacenar el rol para la redirección fuera del try/catch
      // Usamos una variable en el scope superior
      if (isAdmin) {
        // Si es admin, redirigir a /admin/dashboard
        redirect('/admin/dashboard');
      }
    }
  } catch (error) {
    // Si el error es un redirect de Next.js, re-lanzarlo
    if (error && typeof error === 'object' && 'digest' in error && String(error.digest).includes('NEXT_REDIRECT')) {
      throw error;
    }

    console.error('Error inesperado en activarCuenta:', error);
    
    // Si el token ya se quemó, debemos redirigir a login aunque haya habido un error
    if (tokenQuemado) {
      debeRedirigirALogin = true;
      revalidatePath('/activar');
      revalidatePath('/login');
    } else {
      return {
        success: false,
        message: 'Error inesperado. Por favor, intenta nuevamente.',
      };
    }
  }

  // Redirecciones FUERA del try/catch
  if (debeRedirigirALogin) {
    redirect('/login?error=' + encodeURIComponent('Cuenta creada. Por favor, inicia sesión.'));
  }

  // Paso 4: Redirigir al dashboard (solo si todo salió bien)
  // Por defecto, redirigir a /dashboard (estudiantes)
  redirect('/dashboard');
}
