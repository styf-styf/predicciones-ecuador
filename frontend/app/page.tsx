"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, TrendingUp, Trophy, Flame, Globe, Mic2, Vote, Flag, Dumbbell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

// ─── Categorías ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",       label: "Tendencias",  icon: Flame,      color: "text-orange-400",  activeBg: "bg-orange-500",    activeText: "text-white" },
  { id: "deporte",   label: "Deporte",     icon: Dumbbell,   color: "text-sky-400",     activeBg: "bg-sky-500",       activeText: "text-white" },
  { id: "farandula", label: "Farándula",   icon: Mic2,       color: "text-pink-400",    activeBg: "bg-pink-500",      activeText: "text-white" },
  { id: "politica",  label: "Política",    icon: Vote,       color: "text-violet-400",  activeBg: "bg-violet-500",    activeText: "text-white" },
  { id: "elecciones",label: "Elecciones",  icon: Flag,       color: "text-amber-400",   activeBg: "bg-amber-500",     activeText: "text-white" },
  { id: "pais",      label: "País",        icon: Globe,      color: "text-emerald-400", activeBg: "bg-emerald-500",   activeText: "text-white" },
];

function CategoryBar({ active, onChange, markets }: { active: string; onChange: (id: string) => void; markets: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const total = markets.length;
  const activos = markets.filter((m) => !m.resolved).length;
  const resueltos = markets.filter((m) => m.resolved).length;

  return (
    <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div
        ref={scrollRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-2.5"
        style={{ scrollbarWidth: "none" }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className={`
                flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] sm:text-[13px] font-medium
                transition-all duration-200 shrink-0 border
                ${isActive
                  ? `${cat.activeBg} text-white border-transparent shadow-sm scale-[1.03]`
                  : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                }
              `}
            >
              {cat.label}
            </button>
          );
        })}

        

        {/* Stats clickeables */}
        <button
          onClick={() => onChange("all")}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 shrink-0 transition"
        >
          <TrendingUp size={11} className="text-slate-400" />
          {total} mercados
        </button>
        <button
          onClick={() => onChange("all")}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:border-slate-300 dark:hover:border-slate-700 shrink-0 transition"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          {activos} activos
        </button>
        <button
          onClick={() => onChange("resueltos")}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 shrink-0 transition"
        >
          <Trophy size={11} className="text-amber-400" />
          {resueltos} resueltos
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function filterByCategory(markets: any[], category: string) {
  if (category === "all") return markets;
  return markets.filter((m) => (m.category ?? "").toLowerCase() === category);
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [betAmounts, setBetAmounts] = useState<{ [key: number]: string }>({});
  const [activeCategory, setActiveCategory] = useState("all");
  const [carouselConfig, setCarouselConfig] = useState({
    trending_count: 1,
    winners_count: 1,
    autoplay_ms: 5000,
  });
  const marketRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const fetchMarkets = async () => {
    const res = await fetch("https://predicciones-ecuador.onrender.com/markets");
    const data = await res.json();
    const active = data.filter((m: any) => !m.resolved);
    const resolved = data.filter((m: any) => m.resolved);
    const shuffled = active.sort(() => Math.random() - 0.5);
    setMarkets([...shuffled, ...resolved]);
  };

  const fetchCarouselConfig = async () => {
    const res = await fetch("https://predicciones-ecuador.onrender.com/carousel-config");
    if (res.ok) {
      const data = await res.json();
      setCarouselConfig(data);
    }
  };

  const handleBet = async (marketId: number, type: "yes" | "no") => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Debes iniciar sesión ❌");
    const amount = parseFloat(betAmounts[marketId] || "");
    if (isNaN(amount) || amount < 1 || amount > 10)
      return alert("El monto debe ser entre 1 y 10 puntos");
    const res = await fetch("https://predicciones-ecuador.onrender.com/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ marketId, type, amount }),
    });
    const data = await res.json();
    if (data.points !== undefined) {
      setBetAmounts((prev) => ({ ...prev, [marketId]: "" }));
      fetchMarkets();
    } else {
      alert(data.message);
    }
  };

  // Mercados filtrados por categoría
  const visibleMarkets = activeCategory === "all"
    ? [...markets].filter((m) => !m.resolved).sort((a, b) => (b.yes + b.no) - (a.yes + a.no))
    : activeCategory === "resueltos"
    ? [...markets].filter((m) => m.resolved)
    : filterByCategory(markets, activeCategory);
  useEffect(() => {
    fetchMarkets();
    fetchCarouselConfig();
    const channel = supabase
      .channel("markets-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "markets" }, () => fetchMarkets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (markets.length === 0)
    return (
      <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        <Header />
        {/* Category bar skeleton */}
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-2.5 px-4">
          <div className="flex gap-2">
            {CATEGORIES.map((c) => (
              <div key={c.id} className="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                      <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    </div>
                    <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
                  </div>
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                      <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                      <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    </div>
                    <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                    <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />

      {/* ── Barra de categorías ── */}
      <CategoryBar active={activeCategory} onChange={setActiveCategory} markets={markets} />

      {/* ── Contenido ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        

        
        {/* Mercados filtrados */}
        <section>
          {/* Encabezado dinámico según categoría */}
          <div className="flex items-center gap-2 mb-4">
            {activeCategory === "resueltos" ? (
              <>
                <Trophy size={18} className="text-amber-400" />
                <h2 className="text-xl sm:text-2xl font-bold">Resueltos</h2>
                <span className="ml-1 text-sm text-slate-400">({visibleMarkets.length})</span>
              </>
            ) : ((() => {
              const cat = CATEGORIES.find((c) => c.id === activeCategory)!;
              const Icon = cat.icon;
              return (
                <>
                  <Icon size={18} className={cat.color} />
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {activeCategory === "all" ? "Mercados activos" : cat.label}
                  </h2>
                  {activeCategory !== "all" && (
                    <span className="ml-1 text-sm text-slate-400">
                      ({visibleMarkets.filter((m) => !m.resolved).length} activos)
                    </span>
                  )}
                </>
              );
            })())}
          </div>

          {/* Empty state */}
          {visibleMarkets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              {activeCategory === "resueltos"
                ? <Trophy size={40} className="opacity-30" />
                : (() => {
                    const cat = CATEGORIES.find((c) => c.id === activeCategory)!;
                    const Icon = cat.icon;
                    return <Icon size={40} className="opacity-30" />;
                  })()
              }
              <p className="text-sm">No hay mercados en esta categoría aún.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {visibleMarkets.map((market) => {
              const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
              const yesPct = ((market.yes / total) * 100).toFixed(0);
              const isResolved = market.resolved;

              return (
                <div
                  key={market.id}
                  id={`market-${market.id}`}
                  className={`border rounded-2xl p-4 sm:p-5 transition transition-all duration-300 ${
                    isResolved
                      ? market.winner === "yes"
                        ? "bg-emerald-500/5 border-emerald-500/30"
                        : "bg-rose-500/5 border-rose-500/30"
                      : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Categoría badge */}
                  {market.category && (
                    <span className="inline-block mb-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {market.category}
                    </span>
                  )}

                  {/* Título + Círculo */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <Link href={`/market/${market.id}`}>
                      <h3 className="text-[14px] font-semibold leading-snug hover:text-emerald-400 transition-colors cursor-pointer">
                        {market.question}
                      </h3>
                    </Link>
                    {(() => {
                      const r = 22;
                      const circ = 2 * Math.PI * r;
                      const offset = circ - (circ * Number(yesPct)) / 100;
                      const color = Number(yesPct) >= 50 ? "#22c55e" : "#ef4444";
                      const label = Number(yesPct) >= 50 ? "Sí" : "No";
                      return (
                        <div className="relative w-14 h-14 shrink-0">
                          <svg viewBox="0 0 52 52" width="52" height="52">
                            <circle cx="26" cy="26" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
                            <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4"
                              strokeDasharray={circ} strokeDashoffset={offset}
                              strokeLinecap="round" transform="rotate(-90 26 26)" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">{yesPct}%</span>
                            <span className="text-[9px] text-slate-400">{label}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Acción */}
                  {isResolved ? (
                    <div className={`text-center text-sm px-3 py-3 rounded-xl font-bold ${
                      market.winner === "yes"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {market.winner === "yes" ? "Ganó SI" : "Ganó NO"}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link href={`/market/${market.id}?bet=yes`}
                        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium rounded-xl py-2.5 text-sm text-center active:scale-95 transition-transform">
                        Sí
                      </Link>
                      <Link href={`/market/${market.id}?bet=no`}
                        className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-medium rounded-xl py-2.5 text-sm text-center active:scale-95 transition-transform">
                        No
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

// ─── Carousel (sin cambios) ─────────────────────────────────────────────────────
function Carousel({ markets, autoplayMs = 5000 }: { markets: any[]; autoplayMs?: number }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragStart = useRef<number | null>(null);

  const prev = () => setCurrent((c) => (c === 0 ? markets.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === markets.length - 1 ? 0 : c + 1));

  useEffect(() => {
    if (paused || markets.length <= 1) return;
    const timer = setInterval(next, autoplayMs);
    return () => clearInterval(timer);
  }, [current, paused, autoplayMs, markets.length]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    dragStart.current = "touches" in e ? e.touches[0].clientX : e.clientX;
    setPaused(true);
  };
  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragStart.current === null) return;
    const endX = "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX;
    const diff = dragStart.current - endX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    dragStart.current = null;
    setPaused(false);
  };

  const market = markets[current];
  const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
  const yesPct = ((market.yes / total) * 100).toFixed(0);
  const isResolved = market.resolved;
  const wonYes = market.winner === "yes";

  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Number(yesPct)) / 100;
  const color = Number(yesPct) >= 50 ? "#22c55e" : "#ef4444";
  const label = Number(yesPct) >= 50 ? "Sí" : "No";

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onMouseDown={handleDragStart}
      onMouseUp={handleDragEnd}
      onTouchStart={handleDragStart}
      onTouchEnd={handleDragEnd}
      style={{ userSelect: "none", cursor: "grab" }}
    >
      <div
        onClick={() => {
          const el = document.getElementById(`market-${market.id}`);
          if (!el) return;
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-orange-400", "scale-[1.02]");
          setTimeout(() => { el.classList.remove("ring-2", "ring-orange-400", "scale-[1.02]"); }, 1000);
        }}
        style={{ cursor: "pointer" }}
      >
        <div className={`border rounded-2xl p-4 sm:p-5 transition ${
          isResolved
            ? wonYes ? "bg-emerald-500/5 border-emerald-500/30" : "bg-rose-500/5 border-rose-500/30"
            : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        }`}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <p className="text-[14px] font-semibold leading-snug">{market.question}</p>
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 52 52" width="52" height="52">
                <circle cx="26" cy="26" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4"
                  strokeDasharray={circ} strokeDashoffset={offset}
                  strokeLinecap="round" transform="rotate(-90 26 26)" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">{yesPct}%</span>
                <span className="text-[9px] text-slate-400">{label}</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 text-right">{total} $ apostados</div>
        </div>
      </div>

      {markets.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {markets.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? "bg-slate-500 dark:bg-slate-400 w-2 h-2" : "bg-slate-300 dark:bg-slate-700 w-1.5 h-1.5"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}