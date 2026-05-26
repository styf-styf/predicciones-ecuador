"use client";
import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <p className="text-8xl font-black text-emerald-500 mb-2">404</p>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          Página no encontrada
        </h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-8">
          La página que buscas no existe o fue movida.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition cursor-pointer"
          >
            <Home size={15} /> Ir al inicio
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 font-medium px-5 py-2.5 rounded-xl text-sm transition cursor-pointer"
          >
            <Search size={15} /> Ver mercados
          </Link>
        </div>
      </div>
    </div>
  );
}
