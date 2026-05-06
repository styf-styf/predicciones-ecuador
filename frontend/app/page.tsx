"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, Trophy, Flame, Globe, Mic2,
  Vote, Flag, Dumbbell, AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Market {
  id: number;
  question: string;
  yes: number;
  no: number;
  resolved: boolean;
  winner?: "yes" | "no";
  category?: string;
  created_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const API = "https://predicciones-ecuador.onrender.com";

const CATEGORIES = [
  { id: "all",        label: "Tendencias", icon: Flame,    color: "text-orange-400",  activeBg: "bg-orange-500"  },
  { id: "deporte",    label: "Deporte",    icon: Dumbbell, color: "text-sky-400",     activeBg: "bg-sky-500"     },
  { id: "farandula",  label: "Farándula",  icon: Mic2,     color: "text-pink-400",    activeBg: "bg-pink-500"    },
  { id: "politica",   label: "Política",   icon: Vote,     color: "text-violet-400",  activeBg: "bg-violet-500"  },
  { id: "elecciones", label: "Elecciones", icon: Flag,     color: "text-amber-400",   activeBg: "bg-amber-500"   },
  { id: "pais",       label: "País",       icon: Globe,    color: "text-emerald-400", activeBg: "bg-emerald-500" },
] as const;

const CATEGORY_COLORS: Record<string, { border: string; bg: string }> = {
  deporte:    { border: "hover:border-sky-400 dark:hover:border-sky-500",         bg: "bg-sky-500/[0.03] dark:bg-sky-500/[0.05]"     },
  farandula:  { border: "hover:border-pink-400 dark:hover:border-pink-500",       bg: "bg-pink-500/[0.03] dark:bg-pink-500/[0.05]"   },
  politica:   { border: "hover:border-violet-400 dark:hover:border-violet-500",   bg: "bg-violet-500/[0.03] dark:bg-violet-500/[0.05]"},
  elecciones: { border: "hover:border-amber-400 dark:hover:border-amber-500",     bg: "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]" },
  pais:       { border: "hover:border-emerald-400 dark:hover:border-emerald-500", bg: "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]"},
  general:    { border: "hover:border-slate-400 dark:hover:border-slate-500",     bg: ""                                              },
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

function useAuth() {
  const getToken = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  return { getToken };
}

function useMarkets() {
  const [markets, setMarkets]   = useState<Market[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API}/markets`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: Market[] = await res.json();
      const active   = data.filter((m) => !m.resolved);
      const resolved = data.filter((m) => m.resolved);
      // Shuffle activos una sola vez en fetch, no en cada render
      const shuffled = [...active].sort(() => Math.random() - 0.5);
      setMarkets([...shuffled, ...resolved]);
    } catch {
      setError("No se pudieron cargar los mercados. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { markets, loading, error, fetchMarkets };
}

function useFavorites() {
  const [favorites, setFavorites]   = useState<number[]>([]);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const { getToken }                = useAuth();

  const fetchFavorites = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/favorites`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.map((id: unknown) => Number(id)));
      }
    } catch {
      // No crítico, no rompe la UI
    }
  }, [getToken]);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent, marketId: number) => {
      e.preventDefault();
      e.stopPropagation();
      const token = getToken();
      if (!token) return false; // señal de "no autenticado"
      setTogglingId(marketId);
      try {
        const res = await fetch(`${API}/favorites/${marketId}`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
        });
        if (res.ok) await fetchFavorites();
      } catch {
        // silencioso
      } finally {
        setTogglingId(null);
      }
      return true;
    },
    [getToken, fetchFavorites]
  );

  return { favorites, togglingId, fetchFavorites, toggleFavorite };
}

function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);
  const showToast = useCallback((message: string, type: "error" | "success" | "info" = "info") => {
    setToast({ message, type });
  }, []);
  const hideToast = useCallback(() => setToast(null), []);
  return { toast, showToast, hideToast };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function filterMarkets(markets: Market[], category: string, favorites: number[]): Market[] {
  switch (category) {
    case "all":
      return [...markets]
        .filter((m) => !m.resolved)
        .sort((a, b) => (b.yes + b.no) - (a.yes + a.no));
    case "mercados":
      return markets.filter((m) => !m.resolved);
    case "resueltos":
      return markets.filter((m) => m.resolved);
    case "favoritos":
      return markets.filter((m) => favorites.includes(m.id));
    default:
      return markets.filter((m) => (m.category ?? "").toLowerCase() === category);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function HeartIcon({ filled = false, size = 14 }: { filled?: boolean; size?: number }) {
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

function Toast({
  message,
  type = "info",
  onClose,
}: {
  message: string;
  type?: "error" | "success" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    error:   "bg-rose-500 text-white",
    success: "bg-emerald-500 text-white",
    info:    "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900",
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl
        text-sm font-medium whitespace-nowrap ${colors[type]}`}
      style={{ animation: "fadeSlideUp 0.25s ease" }}
    >
      {message}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0);    }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY BAR
// ─────────────────────────────────────────────────────────────────────────────

function CategoryBar({
  active,
  onChange,
  markets,
}: {
  active: string;
  onChange: (id: string) => void;
  markets: Market[];
}) {
  const total     = markets.length;
  const activos   = markets.filter((m) => !m.resolved).length;
  const resueltos = markets.filter((m) => m.resolved).length;

  return (
    <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="relative">
        {/* Gradientes laterales: indican que hay más contenido al hacer scroll */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-8 z-10 bg-gradient-to-r from-white dark:from-slate-950 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 z-10 bg-gradient-to-l from-white dark:from-slate-950 to-transparent" />

        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1.5 sm:gap-2 overflow-x-auto py-2.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Categorías principales */}
          {CATEGORIES.map((cat) => {
            const isActive = active === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onChange(cat.id)}
                className={`
                  flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5
                  text-[12px] sm:text-[13px] font-medium transition-all duration-200 shrink-0 border
                  ${isActive
                    ? `${cat.activeBg} text-white border-transparent shadow-sm scale-[1.03]`
                    : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                  }
                `}
              >
                <cat.icon size={13} />
                {cat.label}
              </button>
            );
          })}

          {/* Stats clickeables */}
         <button
  onClick={() => onChange("mercados")}
  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium shrink-0 transition border
    ${active === "mercados"
      ? "bg-slate-600 text-white border-transparent shadow-sm scale-[1.03]"
      : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600"
    }`}
>
  <TrendingUp size={11} />
  {total} mercados
</button>

<button
  onClick={() => onChange("resueltos")}
  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium shrink-0 transition border
    ${active === "resueltos"
      ? "bg-amber-500 text-white border-transparent shadow-sm scale-[1.03]"
      : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-300 dark:hover:border-amber-700"
    }`}
>
  <Trophy size={11} className={active === "resueltos" ? "text-white" : "text-amber-400"} />
  {resueltos} resueltos
</button>

         <button
  onClick={() => onChange("favoritos")}
  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium shrink-0 transition border
    ${active === "favoritos"
      ? "bg-rose-500 text-white border-transparent shadow-sm scale-[1.03]"
      : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-rose-400 hover:border-rose-300 dark:hover:border-rose-700"
    }`}
>
  <HeartIcon filled={active === "favoritos"} size={11} />
  Favoritos
</button>

          {/* Indicador en vivo */}
          <div className="ml-auto shrink-0 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full px-3.5 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[12px] font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
              {activos} En vivo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKET CARD
// ─────────────────────────────────────────────────────────────────────────────

function MarketCard({
  market,
  isFavorite,
  isTogglingFavorite,
  onToggleFavorite,
}: {
  market: Market;
  isFavorite: boolean;
  isTogglingFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent, id: number) => void;
}) {
  const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
  const isResolved = market.resolved;
  const isZero = market.yes === 0 && market.no === 0;

  // Porcentajes calculados de forma independiente para evitar errores de redondeo
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
      </div>

      {/* Pregunta */}
      <div className="mb-4">
        <Link href={`/market/${market.id}`}>
          <h3 className="text-[13px] font-semibold leading-snug hover:text-emerald-400 transition-colors cursor-pointer">
            {market.question}
          </h3>
        </Link>
      </div>

      {/* Total apostado */}
      <div className="flex justify-end text-[11px] text-slate-400 dark:text-slate-500 mb-3">
        <span>{(Number(market.yes) + Number(market.no)).toFixed(1)} $ en predicciones</span>
      </div>

      {/* Acción */}
      {isResolved ? (
        <div
          className={`text-center text-sm px-3 py-3 rounded-xl font-bold flex items-center justify-center gap-1.5 ${
            market.winner === "yes"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-rose-500/10 text-rose-400"
          }`}
        >
          <Trophy size={14} />
          {market.winner === "yes" ? "Ganó SÍ" : "Ganó NO"}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/market/${market.id}?bet=yes`}
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium rounded-xl py-2.5 text-sm text-center transition-all flex flex-col items-center leading-tight
    hover:bg-emerald-200 dark:hover:bg-emerald-900/60 hover:scale-[1.03]
    active:scale-95 active:bg-emerald-300 dark:active:bg-emerald-900/80"
          >
            <span className="text-[11px] opacity-70">Sí</span>
            <span className="font-bold">{yesPct}%</span>
          </Link>
          <Link
            href={`/market/${market.id}?bet=no`}
            className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-medium rounded-xl py-2.5 text-sm text-center transition-all flex flex-col items-center leading-tight
    hover:bg-rose-200 dark:hover:bg-rose-900/60 hover:scale-[1.03]
    active:scale-95 active:bg-rose-300 dark:active:bg-rose-900/80"
          >
            <span className="text-[11px] opacity-70">No</span>
            <span className="font-bold">{noPct}%</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function HomeSkeleton() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md py-2.5 px-4">
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ category, count }: { category: string; count: number }) {
  if (category === "resueltos") {
    return (
      <>
        <Trophy size={18} className="text-amber-400" />
        <h2 className="text-xl sm:text-2xl font-bold">Resueltos</h2>
        <span className="ml-1 text-sm text-slate-400">({count})</span>
      </>
    );
  }
  if (category === "favoritos") {
    return (
      <>
        <HeartIcon filled size={18} />
        <h2 className="text-xl sm:text-2xl font-bold">Favoritos</h2>
        <span className="ml-1 text-sm text-slate-400">({count})</span>
      </>
    );
  }
  if (category === "mercados") {
    return (
      <>
        <TrendingUp size={18} className="text-slate-400" />
        <h2 className="text-xl sm:text-2xl font-bold">Todos los mercados</h2>
        <span className="ml-1 text-sm text-slate-400">({count})</span>
      </>
    );
  }
  const cat = CATEGORIES.find((c) => c.id === category)!;
  const Icon = cat.icon;
  return (
    <>
      <Icon size={18} className={cat.color} />
      <h2 className="text-xl sm:text-2xl font-bold">
        {category === "all" ? "Tendencias": cat.label}
      </h2>
      <span className="ml-1 text-sm text-slate-400">({count} activos)</span>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ category }: { category: string }) {
  const messages: Record<string, string> = {
    favoritos: "Aún no tienes favoritos. Toca el ❤️ en cualquier mercado para añadirlo.",
    resueltos: "No hay mercados resueltos todavía.",
  };
  const message = messages[category] ?? "No hay mercados en esta categoría aún.";

  const cat = CATEGORIES.find((c) => c.id === category);
  const Icon = cat?.icon ?? Flame;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      {category === "favoritos"
        ? <HeartIcon size={40} />
        : <Icon size={40} className="opacity-30" />
      }
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const { markets, loading, error, fetchMarkets } = useMarkets();
  const { favorites, togglingId, fetchFavorites, toggleFavorite } = useFavorites();
  const { getToken } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");
  const { toast, showToast, hideToast } = useToast();

  // Filtrado memoizado: no recalcula en cada render
  const visibleMarkets = useMemo(
    () => filterMarkets(markets, activeCategory, favorites),
    [markets, activeCategory, favorites]
  );

  // Wrapper con toast en lugar de alert()
  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent, marketId: number) => {
      const token = getToken();
      if (!token) {
        showToast("Debes iniciar sesión para guardar favoritos", "error");
        return;
      }
      await toggleFavorite(e, marketId);
    },
    [getToken, toggleFavorite, showToast]
  );

  useEffect(() => {
    fetchMarkets();
    fetchFavorites();

    const channel = supabase
      .channel("markets-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "markets" }, fetchMarkets)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMarkets, fetchFavorites]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return <HomeSkeleton />;

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        <Header />
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
          <AlertCircle size={48} className="text-rose-400 opacity-70" />
          <p className="text-base font-medium text-slate-600 dark:text-slate-300">{error}</p>
          <button
            onClick={fetchMarkets}
            className="mt-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 active:scale-95 transition-all"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />

      <CategoryBar active={activeCategory} onChange={setActiveCategory} markets={markets} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <section>
          {/* Encabezado dinámico */}
          <div className="flex items-center gap-2 mb-4">
            <SectionHeader category={activeCategory} count={visibleMarkets.length} />
          </div>

          {/* Empty state */}
          {visibleMarkets.length === 0 && <EmptyState category={activeCategory} />}

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                isFavorite={favorites.includes(market.id)}
                isTogglingFavorite={togglingId === market.id}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Toast global — reemplaza alert() */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </main>
  );
}