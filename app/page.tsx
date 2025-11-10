import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <main className="w-full max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          Portal de Becados DI
        </h1>
        <p className="mb-8 text-lg text-gray-600">
          Bienvenido al portal de gestión para becados del programa DI
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/activar"
            className="rounded-md border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Activar cuenta
          </Link>
        </div>
      </main>
    </div>
  );
}
