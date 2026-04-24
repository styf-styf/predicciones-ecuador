export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-semibold text-slate-700 dark:text-white">
          Predicciones Ecuador 🇪🇨
        </p>
        <p className="text-xs">
          © {new Date().getFullYear()} Todos los derechos reservados
        </p>
        <div className="flex gap-4 text-xs">
          <a href="/terminos" className="hover:text-emerald-400 transition">Términos</a>
          <a href="/privacidad" className="hover:text-emerald-400 transition">Privacidad</a>
          <a href="/contacto" className="hover:text-emerald-400 transition">Contacto</a>
        </div>
      </div>
    </footer>
  );
}