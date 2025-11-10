'use client';

import { useState, useTransition } from 'react';
import { activarCuenta } from './actions';
import { z } from 'zod';

interface FormularioActivacionProps {
  token: string;
  nombreCompleto: string;
  correoPredeterminado: string;
}

// Esquema de validación Zod para contraseña
const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
  .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
  .regex(/[0-9]/, 'La contraseña debe contener al menos un número');

// Función para validar requisitos de contraseña
const validarRequisitosPassword = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
};

/**
 * Componente de formulario para activación de cuenta con contraseña
 * Maneja la creación de cuenta y activación inmediata
 */
export default function FormularioActivacion({
  token,
  nombreCompleto,
  correoPredeterminado,
}: FormularioActivacionProps) {
  const [correo, setCorreo] = useState(correoPredeterminado);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mensaje, setMensaje] = useState<{
    tipo: 'success' | 'error';
    texto: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensaje(null);

    // Validación de correo
    if (!correo || !correo.includes('@')) {
      setMensaje({
        tipo: 'error',
        texto: 'Por favor, ingresa un correo electrónico válido',
      });
      return;
    }

    // Validación de contraseña con Zod
    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      setMensaje({
        tipo: 'error',
        texto: passwordValidation.error.errors[0].message,
      });
      return;
    }

    if (password !== confirmPassword) {
      setMensaje({
        tipo: 'error',
        texto: 'Las contraseñas no coinciden',
      });
      return;
    }

    startTransition(async () => {
      const resultado = await activarCuenta(token, correo, password);

      if (!resultado.success) {
        setMensaje({
          tipo: 'error',
          texto: resultado.message,
        });
      }
      // Si es exitoso, la función activarCuenta redirige automáticamente
    });
  };

  // Calcular requisitos de contraseña para mostrar indicadores
  const requisitosPassword = validarRequisitosPassword(password);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Campo Nombre - READ ONLY */}
      <div>
        <label
          htmlFor="nombre"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Nombre completo
        </label>
        <input
          id="nombre"
          type="text"
          value={nombreCompleto}
          readOnly
          disabled
          className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 cursor-not-allowed"
        />
      </div>

      {/* Campo Correo - Pre-llenado pero EDITABLE */}
      <div>
        <label
          htmlFor="correo"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Correo electrónico
        </label>
        <input
          id="correo"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="tu@correo.com"
          required
          disabled={isPending}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">
          Este será tu usuario. Si lo cambias, asegúrate de tener acceso a él.
        </p>
      </div>

      {/* Campo Contraseña */}
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ingresa tu contraseña"
          required
          disabled={isPending}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        
        {/* Indicadores de requisitos de contraseña */}
        {password && (
          <div className="mt-2 space-y-1 rounded-md bg-gray-50 p-3 text-xs">
            <p className="mb-2 font-medium text-gray-700">Requisitos de contraseña:</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={requisitosPassword.minLength ? 'text-green-600' : 'text-gray-400'}>
                  {requisitosPassword.minLength ? '✓' : '○'}
                </span>
                <span className={requisitosPassword.minLength ? 'text-green-700' : 'text-gray-600'}>
                  Mínimo 8 caracteres
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={requisitosPassword.hasUpperCase ? 'text-green-600' : 'text-gray-400'}>
                  {requisitosPassword.hasUpperCase ? '✓' : '○'}
                </span>
                <span className={requisitosPassword.hasUpperCase ? 'text-green-700' : 'text-gray-600'}>
                  Al menos 1 letra mayúscula
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={requisitosPassword.hasLowerCase ? 'text-green-600' : 'text-gray-400'}>
                  {requisitosPassword.hasLowerCase ? '✓' : '○'}
                </span>
                <span className={requisitosPassword.hasLowerCase ? 'text-green-700' : 'text-gray-600'}>
                  Al menos 1 letra minúscula
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={requisitosPassword.hasNumber ? 'text-green-600' : 'text-gray-400'}>
                  {requisitosPassword.hasNumber ? '✓' : '○'}
                </span>
                <span className={requisitosPassword.hasNumber ? 'text-green-700' : 'text-gray-600'}>
                  Al menos 1 número
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={requisitosPassword.hasSpecialChar ? 'text-green-600' : 'text-gray-400'}>
                  {requisitosPassword.hasSpecialChar ? '✓' : '○'}
                </span>
                <span className={requisitosPassword.hasSpecialChar ? 'text-green-700' : 'text-gray-600'}>
                  Caracteres especiales (recomendado)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Campo Confirmar Contraseña */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repite tu contraseña"
          required
          disabled={isPending}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Mensajes de error */}
      {mensaje && (
        <div
          className={`rounded-md p-3 ${
            mensaje.tipo === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          <p className="text-sm">{mensaje.texto}</p>
        </div>
      )}

      {/* Botón de activación */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isPending ? 'Activando cuenta...' : 'Activar cuenta'}
      </button>
    </form>
  );
}
