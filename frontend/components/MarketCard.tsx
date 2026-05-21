"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";

export interface Market {
  id: number;
  question: string;
  yes: number;
  no: number;
  resolved: boolean;
  winner?: "yes" | "no";
  category?: string;
  created_at?: string;
  closes_at?: string;
}

const CATEGORY_COLORS: Record<string, { border: string; bg: string }> = {
  deporte:    { border: "hover:border-sky-400 dark:hover:border-sky-500",         bg: "bg-sky-500/[0.03] dark:bg-sky-500/[0.05]"      },
  farandula:  { border: "hover:border-pink-400 dark:hover:border-pink-500",       bg: "bg-pink-500/[0.03] dark:bg-pink-500/[0.05]"    },
  politica:   { border: "hover:border-violet-400 dark:hover:border-violet-500",   bg: "bg-violet-500/[0.03] dark:bg-violet-500/[0.05]" },
  elecciones: { border: "hover:border-amber-400 dark:hover:border-amber-500",     bg: "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]"  },
  pais:       { border: "hover:border-emerald-400 dark:hover:border-emerald-500", bg: "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]"},
  general:    { border: "hover:border-slate-400 dark:hover:border-slate-500",     bg: ""                                               },
};

export function formatCountdown(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "Cerrado";
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  if (days > 0)  return `Cierra en ${days}d ${hours}h`;
  if (hours > 0) return `Cierra en ${hours}h ${mins}m`;
  return `Cierra en ${mins}m`;
}

export function HeartIcon({ filled = false, size = 14 }: { filled?: boolean; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size} height={size}
      viewBox="0 0 24 24"
      fill={filled ? "#f43f5e" : "none"}
      stroke="#f43f5e"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function MarketCard({
  market,
  isFavorite = false,
  isTogglingFavorite = false,
  onToggleFavorite,
}: {
  market: Market;
  isFavorite?: boolean;
  isTogglingFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent, id: number) => void;
}) {
  const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
  const isResolved = market.resolved;
  const isZero = market.yes === 0 && market.no === 0;

  const yesRaw = isZero ? 50 : (market.yes / total) * 100;
  const yesPct = Math.round(yesRaw);
  const noPct  = 100 - yesPct;

  const catColors = CATEGORY_COLORS[market.category ?? ""] ?? CATEGORY_COLORS.general;

  return (
    <div
      id={`market-${market.id}`}
      className={`border rounded-xl p-3 sm:p-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg dark:hover:shadow-black/40 cursor-pointer ${
        isResolved
          ? market.winner === "yes"
            ? "bg-emerald-500/5 border-emerald-500/30"
            : "bg-rose-500/5 border-rose-500/30"
          : `${catColors.bg} border-slate-200 dark:border-slate-800 ${catColors.border}`
      }`}
    >
      {/* Cabecera: badge de categoría + botón favorito */}
      <div className="flex items-center justify-between mb-1.5">
        {market.category ? (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {market.category}
          </span>
        ) : (
          <span />
        )}

        {onToggleFavorite && (
          <button
            onClick={(e) => onToggleFavorite(e, market.id)}
            disabled={isTogglingFavorite}
            aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            className={`ml-auto text-slate-300 dark:text-slate-600 hover:text-rose-400 transition-all ${
              isTogglingFavorite ? "opacity-40 cursor-not-allowed animate-pulse" : ""
            }`}
          >
            <HeartIcon filled={isFavorite} size={14} />
          </button>
        )}
      </div>

      {/* Pregunta */}
      <div className="mb-4">
        <Link href={`/market/${market.id}`}>
          <h3 className="text-[13px] font-semibold leading-snug hover:text-emerald-400 transition-colors cursor-pointer line-clamp-2">
            {market.question}
          </h3>
        </Link>
      </div>

      {/* Total apostado */}
      <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 mb-3">
        <span>{(Number(market.yes) + Number(market.no)).toFixed(1)} $ en predicciones</span>
        {market.closes_at && !market.resolved && (
          <span className={new Date(market.closes_at).getTime() - Date.now() < 3600000 ? "text-rose-400" : ""}>
            {formatCountdown(market.closes_at)}
          </span>
        )}
      </div>

      {/* Acción */}
      {isResolved ? (
        <div className={`px-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between gap-2 ${
          market.winner === "yes" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
        }`}>
          <div className="flex items-center gap-1.5">
            <Trophy size={13} />
            {market.winner === "yes" ? "Ganó SÍ" : "Ganó NO"}
          </div>
          <div className="flex items-center gap-1 text-xs font-medium">
            <span className={market.winner === "yes" ? "font-bold" : "text-slate-400"}>{yesPct}%</span>
            <span className="text-slate-400 font-normal">/</span>
            <span className={market.winner === "no" ? "font-bold" : "text-slate-400"}>{noPct}%</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/market/${market.id}?bet=yes`}
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium rounded-lg py-2 text-xs text-center transition-all flex items-center justify-center gap-1
              hover:bg-emerald-200 dark:hover:bg-emerald-900/60 hover:scale-[1.03]
              active:scale-95 active:bg-emerald-300 dark:active:bg-emerald-900/80"
          >
            <span className="opacity-70">Sí</span>
            <span className="font-bold">{yesPct}%</span>
          </Link>
          <Link
            href={`/market/${market.id}?bet=no`}
            className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-medium rounded-lg py-2 text-xs text-center transition-all flex items-center justify-center gap-1
              hover:bg-rose-200 dark:hover:bg-rose-900/60 hover:scale-[1.03]
              active:scale-95 active:bg-rose-300 dark:active:bg-rose-900/80"
          >
            <span className="opacity-70">No</span>
            <span className="font-bold">{noPct}%</span>
          </Link>
        </div>
      )}
    </div>
  );
}
