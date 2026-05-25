"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, Trophy, Flame, Globe, Mic2,
  Vote, Flag, Dumbbell, AlertCircle,
} from "lucide-react";
import Header from "@/components/Header";
import { MarketCard, HeartIcon, type Market } from "@/components/MarketCard";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const API = "https://api.ecuapred.com";

const CATEGORIES = [
  { id: "all",        label: "Tendencias", icon: Flame,    color: "text-orange-400",  activeBg: "bg-orange-500"  },
  { id: "deporte",    label: "Deporte",    icon: Dumbbell, color: "text-sky-400",     activeBg: "bg-sky-500"     },
  { id: "farandula",  label: "Farándula",  icon: Mic2,     color: "text-pink-400",    activeBg: "bg-pink-500"    },
  { id: "politica",   label: "Política",   icon: Vote,     color: "text-violet-400",  activeBg: "bg-violet-500"  },
  { id: "elecciones", label: "Elecciones", icon: Flag,     color: "text-amber-400",   activeBg: "bg-amber-500"   },
  { id: "pais",       label: "País",       icon: Globe,    color: "text-emerald-400", activeBg: "bg-emerald-500" },
] as const;

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

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const range: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  if (start === 3) range.push(2);
  else if (start > 3) range.push("...");
  for (let i = start; i <= end; i++) range.push(i);
  if (end === total - 2) range.push(total - 1);
  else if (end < total - 2) range.push("...");
  range.push(total);
  return range;
}

function filterMarkets(markets: Market[], category: string, favorites: number[]): Market[] {
  switch (category) {
    case "all":
      return [...markets]
        .filter((m) => !m.resolved)
        .sort((a, b) => (b.yes + b.no) - (a.yes + a.no));
    case "mercados":
      return markets;
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
                    : `bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 ${
                      cat.id === "deporte"    ? "hover:border-sky-400 dark:hover:border-sky-500" :
                      cat.id === "farandula"  ? "hover:border-pink-400 dark:hover:border-pink-500" :
                      cat.id === "politica"   ? "hover:border-violet-400 dark:hover:border-violet-500" :
                      cat.id === "elecciones" ? "hover:border-amber-400 dark:hover:border-amber-500" :
                      cat.id === "pais"       ? "hover:border-emerald-400 dark:hover:border-emerald-500" :
                              "hover:border-orange-400 dark:hover:border-orange-500"
                            }`
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
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function HomeSkeleton() {
  // Anchos variados para que los pills parezcan reales
  const pillWidths = ["w-24", "w-20", "w-22", "w-20", "w-16", "w-20", "w-20", "w-24"];

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />

      {/* Barra de categorías skeleton */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1.5 sm:gap-2 py-2.5 overflow-hidden">
          {pillWidths.map((w, i) => (
            <div key={i} className={`h-[30px] ${w} rounded-full bg-slate-100 dark:bg-slate-800/70 animate-pulse shrink-0`} />
          ))}
          {/* "En vivo" pill — extremo derecho */}
          <div className="ml-auto h-[30px] w-20 rounded-full bg-slate-100 dark:bg-slate-800/70 animate-pulse shrink-0" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Título de sección */}
        <div className="mb-5">
          <div className="h-5 w-52 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>

        {/* Grid de tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3 sm:p-4 space-y-3"
            >
              {/* Badge categoría + corazón */}
              <div className="flex items-center justify-between">
                <div className="h-5 w-14 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>

              {/* Pregunta (2 líneas) */}
              <div className="space-y-1.5 mb-1">
                <div className="h-[13px] w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-[13px] w-4/5 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>

              {/* Meta (total + cierre) */}
              <div className="h-[11px] w-3/5 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />

              {/* Barra de voto fusionada */}
              <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const { toast, showToast, hideToast } = useToast();

  // Filtrado memoizado: no recalcula en cada render
  const filteredMarkets = useMemo(
  () => filterMarkets(markets, activeCategory, favorites),
  [markets, activeCategory, favorites]
 );

 const totalPages = Math.ceil(filteredMarkets.length / ITEMS_PER_PAGE);

 const visibleMarkets = useMemo(
  () => filteredMarkets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
  [filteredMarkets, currentPage]
 );
  // Wrapper con toast en lugar de alert()
  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent, marketId: number) => {
      const token = getToken();
      if (!token) {
        showToast("Debes iniciar sesión para guardar favoritos", "error");
        return;
      }
      const wasFavorite = favorites.includes(marketId);
      const ok = await toggleFavorite(e, marketId);
      if (ok) {
        showToast(
          wasFavorite ? "Eliminado de favoritos" : "Añadido a favoritos",
          wasFavorite ? "info" : "success"
        );
      }
    },
    [getToken, toggleFavorite, showToast, favorites]
  );

  useEffect(() => {
    fetchMarkets();
    fetchFavorites();

    const es = new EventSource("https://api.ecuapred.com/events");
    es.addEventListener("markets", () => fetchMarkets());
    return () => es.close();
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

      <CategoryBar active={activeCategory} onChange={(id) => { setActiveCategory(id); setCurrentPage(1); }} markets={markets} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-8 space-y-6 sm:space-y-8">
        <section>
          {/* Encabezado dinámico */}
          <div className="flex items-center gap-2 mb-4">
            <SectionHeader category={activeCategory} count={filteredMarkets.length} />
          </div>

          {/* Empty state */}
          {activeCategory === "favoritos" && !getToken() ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <HeartIcon size={40} />
              <p className="text-sm text-center max-w-xs text-slate-400">
                Inicia sesión para guardar y ver tus mercados favoritos
              </p>
              <Link href="/login" className="px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold text-sm rounded-xl hover:bg-emerald-600 active:scale-95 transition-all">
                Iniciar sesión
              </Link>
            </div>
          ) : visibleMarkets.length === 0 ? (
            <EmptyState category={activeCategory} />
          ) : null}

          {/* Grid */}
          <div key={`${activeCategory}-${currentPage}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fadein">
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
        {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ← Anterior
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers(currentPage, totalPages).map((page, i) =>
                  page === "..." ? (
                    <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-sm text-slate-400 select-none">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                        currentPage === page
                          ? "bg-emerald-500 text-white shadow-sm scale-[1.05]"
                          : "bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Siguiente →
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Toast global — reemplaza alert() */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </main>
  );
}