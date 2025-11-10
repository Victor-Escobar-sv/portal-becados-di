'use client';

import { useState, useTransition } from 'react';
import { iniciarSesion } from './actions';

/**
 * Componente de formulario para inicio de sesión
 * Maneja la autenticación con email y contraseña
 */
export default function FormularioLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState<{
    tipo: 'success' | 'error';
    texto: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensaje(null);

    // Validaciones
    if (!email || !email.includes('@')) {
      setMensaje({
        tipo: 'error',
        texto: 'Por favor, ingresa un correo electrónico válido',
      });
      return;
    }

    if (!password) {
      setMensaje({
        tipo: 'error',
        texto: 'Por favor, ingresa tu contraseña',
      });
      return;
    }

    startTransition(async () => {
      const resultado = await iniciarSesion(email, password);

      if (!resultado.success) {
        setMensaje({
          tipo: 'error',
          texto: resultado.message,
        });
      }
      // Si es exitoso, la función iniciarSesion redirige automáticamente
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campo Email */}
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-white/90"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          required
          disabled={isPending}
          autoComplete="email"
          className="w-full bg-transparent border-b-2 border-white/50 px-3 py-2 text-white placeholder-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
      </div>

      {/* Campo Contraseña */}
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-white/90"
        >
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Tu contraseña"
          required
          disabled={isPending}
          autoComplete="current-password"
          className="w-full bg-transparent border-b-2 border-white/50 px-3 py-2 text-white placeholder-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
        {/* Link Olvidé mi contraseña */}
        <div className="mt-2 text-right">
          <a
            href="#"
            className="text-xs text-white/70 hover:text-white hover:underline transition-colors"
          >
            Olvidé mi contraseña
          </a>
        </div>
      </div>

      {/* Mensajes de error */}
      {mensaje && (
        <div
          className={`rounded-md p-3 backdrop-blur-sm border ${
            mensaje.tipo === 'success'
              ? 'bg-green-500/20 border-green-400/30 text-green-100'
              : 'bg-red-500/20 border-red-400/30 text-red-100'
          }`}
        >
          <p className="text-sm">{mensaje.texto}</p>
        </div>
      )}

      {/* Botón de login */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-white text-[#101f60] px-4 py-3 font-medium transition-colors hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent disabled:bg-white/50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
}

