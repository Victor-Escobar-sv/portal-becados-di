export default function DashboardFooter() {
  return (
    <footer className="border-t border-white/20 bg-[#101f60] px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-sm text-white/80">
          © 2025 Dirección de Integración. Todos los derechos reservados.
        </p>
        <div className="flex gap-4 text-sm">
          <a
            href="#"
            className="text-white/80 transition-colors hover:text-white"
          >
            Ayuda
          </a>
          <span className="text-white/40">|</span>
          <a
            href="#"
            className="text-white/80 transition-colors hover:text-white"
          >
            Contacto
          </a>
          <span className="text-white/40">|</span>
          <a
            href="#"
            className="text-white/80 transition-colors hover:text-white"
          >
            Términos de Servicio
          </a>
        </div>
      </div>
    </footer>
  );
}

