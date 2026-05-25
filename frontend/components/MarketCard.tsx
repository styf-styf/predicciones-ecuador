"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { useRef, useEffect, useCallback } from "react";

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
  deporte:    { border: "hover:border-sky-400 dark:hover:border-sky-500",         bg: "bg-sky-500/[0.03] dark:bg-sky-500/[0.05]"       },
  farandula:  { border: "hover:border-pink-400 dark:hover:border-pink-500",       bg: "bg-pink-500/[0.03] dark:bg-pink-500/[0.05]"     },
  politica:   { border: "hover:border-violet-400 dark:hover:border-violet-500",   bg: "bg-violet-500/[0.03] dark:bg-violet-500/[0.05]" },
  elecciones: { border: "hover:border-amber-400 dark:hover:border-amber-500",     bg: "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]"   },
  pais:       { border: "hover:border-emerald-400 dark:hover:border-emerald-500", bg: "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]"},
  general:    { border: "hover:border-slate-400 dark:hover:border-slate-500",     bg: ""                                                },
};

// Paleta del diseño original
const SI_COLOR:  [number, number, number] = [168, 230, 192]; // verde pastel
const NO_COLOR:  [number, number, number] = [244, 169, 168]; // rosa pastel

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/** Barra fusionada Sí/No con gradiente canvas (fiel al diseño original) */
function VoteBar({ yesPct, noPct, marketId }: { yesPct: number; noPct: number; marketId: number }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect    = container.getBoundingClientRect();
    canvas.width  = rect.width  || 340;
    canvas.height = rect.height || 40;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const siC = SI_COLOR;
    const noC = NO_COLOR;

    const splitX     = w * (yesPct / 100);
    const blendW     = w * 0.18;
    const blendStart = Math.max(0, (splitX - blendW) / w);
    const blendEnd   = Math.min(1, (splitX + blendW) / w);

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0,          `rgb(${siC[0]},${siC[1]},${siC[2]})`);
    grad.addColorStop(blendStart, `rgb(${siC[0]},${siC[1]},${siC[2]})`);
    const midR = Math.round(lerp(siC[0], noC[0], 0.5));
    const midG = Math.round(lerp(siC[1], noC[1], 0.5));
    const midB = Math.round(lerp(siC[2], noC[2], 0.5));
    grad.addColorStop((blendStart + blendEnd) / 2, `rgb(${midR},${midG},${midB})`);
    grad.addColorStop(blendEnd, `rgb(${noC[0]},${noC[1]},${noC[2]})`);
    grad.addColorStop(1,        `rgb(${noC[0]},${noC[1]},${noC[2]})`);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, [yesPct]);

  useEffect(() => {
    draw();
    const observer = new ResizeObserver(draw);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [draw]);

  // Posición de las etiquetas (igual que el original): mínimo 14% desde cada borde
  const siLeft  = `${Math.max(yesPct * 0.5, 14)}%`;
  const noRight = `${Math.max(noPct  * 0.5, 14)}%`;

  // Color del texto: versión oscurecida de cada color base
  const siTextColor = `rgb(${Math.round(SI_COLOR[0] * 0.35)},${Math.round(SI_COLOR[1] * 0.35)},${Math.round(SI_COLOR[2] * 0.45)})`;
  const noTextColor = `rgb(${Math.round(NO_COLOR[0] * 0.45)},${Math.round(NO_COLOR[1] * 0.28)},${Math.round(NO_COLOR[2] * 0.28)})`;

  return (
    <div ref={containerRef} className="relative h-10 rounded-lg overflow-hidden">
      {/* Canvas con el gradiente */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Zona clic Sí (mitad izquierda) */}
      <Link
        href={`/market/${marketId}?bet=yes`}
        className="absolute inset-y-0 left-0 w-1/2 z-[3]"
        onClick={(e) => e.stopPropagation()}
        aria-label="Votar Sí"
      />
      {/* Zona clic No (mitad derecha) */}
      <Link
        href={`/market/${marketId}?bet=no`}
        className="absolute inset-y-0 right-0 w-1/2 z-[3]"
        onClick={(e) => e.stopPropagation()}
        aria-label="Votar No"
      />

      {/* Etiqueta Sí */}
      <span
        className="absolute top-1/2 z-[4] pointer-events-none whitespace-nowrap font-semibold text-[13px] transition-[left] duration-500"
        style={{ left: siLeft, transform: "translate(-50%, -50%)", color: siTextColor }}
      >
        Sí {yesPct}%
      </span>

      {/* Etiqueta No */}
      <span
        className="absolute top-1/2 z-[4] pointer-events-none whitespace-nowrap font-semibold text-[13px] transition-[right] duration-500"
        style={{ right: noRight, transform: "translate(50%, -50%)", color: noTextColor }}
      >
        No {noPct}%
      </span>
    </div>
  );
}

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
      fill={filled ? "#e02060" : "#bbb"}
      stroke={filled ? "#e02060" : "#bbb"}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
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
  const total      = (market.yes ?? 0) + (market.no ?? 0) || 1;
  const isResolved = market.resolved;
  const isZero     = market.yes === 0 && market.no === 0;

  const yesPct = Math.round(isZero ? 50 : (market.yes / total) * 100);
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
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em]">
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

      {/* Meta: total apostado + cierre */}
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
        <VoteBar yesPct={yesPct} noPct={noPct} marketId={market.id} />
      )}
    </div>
  );
}
