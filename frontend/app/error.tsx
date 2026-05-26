"use client";
import { useEffect } from "react";
import { RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reportar a Sentry si está disponible
    console.error("[Error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <p className="text-7xl mb-4">⚠️</p>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          Algo salió mal
        </h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-8">
          Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition cursor-pointer"
          >
            <RefreshCw size={15} /> Intentar de nuevo
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 font-medium px-5 py-2.5 rounded-xl text-sm transition cursor-pointer"
          >
            <Home size={15} /> Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
