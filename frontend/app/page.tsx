"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, TrendingUp, Trophy, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

export default function Home() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [betAmounts, setBetAmounts] = useState<{ [key: number]: string }>({});
  const [carouselConfig, setCarouselConfig] = useState({ 
    trending_count: 1, 
    winners_count: 1, 
    autoplay_ms: 5000 
  });
  const marketRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [showResults, setShowResults] = useState(false);
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
    if (isNaN(amount) || amount < 1 || amount > 10) return alert("El monto debe ser entre 1 y 10 puntos");
    const res = await fetch("https://predicciones-ecuador.onrender.com/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ marketId, type, amount }),
    });
    const data = await res.json();
    if (data.points !== undefined) {
      
      setBetAmounts((prev) => ({ ...prev, [marketId]: "" }));
      fetchMarkets();
    } else { alert(data.message); }
  };


 

  const trendingMarkets = [...markets]
    .filter((m) => !m.resolved)
    .sort((a, b) => (b.yes + b.no) - (a.yes + a.no))
    .slice(0, 3);

  useEffect(() => {
  fetchMarkets();
  fetchCarouselConfig();
  const channel = supabase.channel("markets-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "markets" }, () => fetchMarkets())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">

      <Header />
      {/* ===== CONTENIDO ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card title="Mercados" value={`${markets.length}`} icon={<TrendingUp size={16} />} />
          <Card title="Activos" value={`${markets.filter((m) => !m.resolved).length}`} icon={<Flame size={16} />} />
          <Card title="Resueltos" value={`${markets.filter((m) => m.resolved).length}`} icon={<Trophy size={16} />} />
          <Card title="En vivo" value="Ahora" icon={<Bell size={16} />} />
        </section>

        {/* Tendencias - Slider */}
        {/* Carruseles lado a lado */}
{(trendingMarkets.length > 0 || markets.filter(m => m.resolved).length > 0) && (
  <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">

    {/* Carrusel Tendencias */}
    {trendingMarkets.length > 0 && (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Flame size={18} className="text-orange-400" />
          <h2 className="text-lg font-bold">Tendencias</h2>
        </div>
        <Carousel
        markets={trendingMarkets}
        autoplayMs={carouselConfig.autoplay_ms}
        visibleCount={carouselConfig.trending_count}
        renderCard={(market, index, globalIndex) => {
            const total = (market.yes ?? 0) + (market.no ?? 0);
            const yesPct = total === 0 ? 50 : ((market.yes / total) * 100).toFixed(0);
            const noPct = total === 0 ? 50 : ((market.no / total) * 100).toFixed(0);
            return (
              <Link key={market.id} href={`/market/${market.id}`}
                className="bg-slate-100 dark:bg-slate-900 border border-orange-500/30 rounded-2xl p-4 flex items-center gap-3 hover:border-orange-400 transition">
                <span className="text-2xl font-black text-orange-400 shrink-0">#{globalIndex + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{market.question}</p>
                  <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500" style={{ width: `${yesPct}%` }} />
                    <div className="bg-rose-500" style={{ width: `${noPct}%` }} />
                  </div>
                  <p className="text-xs mt-1 text-slate-400">{total} pts • Sí {yesPct}% • No {noPct}%</p>
                </div>
              </Link>
            );
          }}
        />
      </div>
    )}

    {/* Carrusel Ganadores */}
    {markets.filter(m => m.resolved).length > 0 && (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} className="text-yellow-400" />
          <h2 className="text-lg font-bold">Ganadores</h2>
        </div>
        <Carousel
        markets={markets.filter(m => m.resolved)}
        autoplayMs={carouselConfig.autoplay_ms}
        visibleCount={carouselConfig.winners_count}
        renderCard={(market, index, globalIndex) => {
            const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
            const yesPct = ((market.yes / total) * 100).toFixed(0);
            const noPct = ((market.no / total) * 100).toFixed(0);
            const wonYes = market.winner === "yes";
            return (
              <Link key={market.id} href={`/market/${market.id}`}
                className={`border rounded-2xl p-4 flex items-center gap-3 transition ${
                  wonYes
                    ? "bg-emerald-500/5 border-emerald-500/40 hover:border-emerald-400"
                    : "bg-rose-500/5 border-rose-500/40 hover:border-rose-400"
                }`}>
                <span className={`text-2xl font-black shrink-0 ${wonYes ? "text-emerald-400" : "text-rose-400"}`}>
                  {wonYes ? "✓" : "✗"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{market.question}</p>
                  <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500" style={{ width: `${yesPct}%` }} />
                    <div className="bg-rose-500" style={{ width: `${noPct}%` }} />
                  </div>
                  <p className={`text-xs mt-1 font-semibold ${wonYes ? "text-emerald-400" : "text-rose-400"}`}>
                    Ganó {wonYes ? "Sí" : "No"} • {total} pts apostados
                  </p>
                </div>
              </Link>
            );
          }}
        />
      </div>
    )}

  </section>
 )}

        {/* Mercados */}
        <section>
  <h2 className="text-xl sm:text-2xl font-bold mb-4">Mercados activos</h2>
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    {markets.map((market) => {
      const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
      const yesPct = ((market.yes / total) * 100).toFixed(0);
      const noPct = ((market.no / total) * 100).toFixed(0);
      const isResolved = market.resolved;

      return (
        <div
          key={market.id}
          className={`border rounded-2xl p-4 sm:p-5 transition ${
            isResolved
              ? market.winner === "yes"
                ? "bg-emerald-500/5 border-emerald-500/30"
                : "bg-rose-500/5 border-rose-500/30"
              : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          {/* Badge estado */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <Link href={`/market/${market.id}`}>
              <h3 className="font-semibold text-sm sm:text-base leading-snug hover:text-emerald-400 transition-colors cursor-pointer">
                {market.question}
              </h3>
            </Link>
            {isResolved ? (
              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                market.winner === "yes"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/20 text-rose-400"
              }`}>
                {market.winner === "yes" ? "Ganó Sí" : "Ganó No"}
              </span>
            ) : (
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                En vivo
              </span>
            )}
          </div>

          {/* Barra */}
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex mb-1">
            <div className="bg-emerald-500 transition-all" style={{ width: `${yesPct}%` }} />
            <div className="bg-rose-500 transition-all" style={{ width: `${noPct}%` }} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Sí {total === 0 ? "—" : `${yesPct}%`} • No {total === 0 ? "—" : `${noPct}%`} • {total} pts
          </p>

          {/* Acción */}
          {isResolved ? (
            <div className={`text-center text-sm px-3 py-3 rounded-xl font-bold ${
              market.winner === "yes"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-rose-500/10 text-rose-400"
            }`}>
              {market.winner === "yes" ? "✓ Sí ganó este mercado" : "✗ No ganó este mercado"}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/market/${market.id}?bet=yes`}
                className="bg-emerald-500 text-slate-950 font-bold rounded-xl py-2.5 text-sm text-center active:scale-95 transition-transform">
                Comprar Sí
              </Link>
              <Link href={`/market/${market.id}?bet=no`}
                className="bg-rose-500 text-white font-bold rounded-xl py-2.5 text-sm text-center active:scale-95 transition-transform">
                Comprar No
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

function Carousel({ markets, renderCard, autoplayMs = 5000, visibleCount = 1 }: {
  markets: any[];
  renderCard: (market: any, index: number, globalIndex: number) => React.ReactNode;
  autoplayMs?: number;
  visibleCount?: number;
}) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const maxIndex = Math.max(0, markets.length - visibleCount);

  const prev = () => setCurrent((c) => (c === 0 ? maxIndex : c - 1));
  const next = () => setCurrent((c) => (c === maxIndex ? 0 : c + 1));

  useEffect(() => {
    if (paused || markets.length <= visibleCount) return;
    const timer = setInterval(next, autoplayMs);
    return () => clearInterval(timer);
  }, [current, paused, autoplayMs, visibleCount, markets.length]);

  const visible = markets.slice(current, current + visibleCount);
  // wrap-around: si llegamos al final y visible está incompleto
  const wrapped = visible.length < visibleCount
    ? [...visible, ...markets.slice(0, visibleCount - visible.length)]
    : visible;

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex flex-col gap-3">
        {wrapped.map((market, index) => renderCard(market, index, current + index))}
      </div>

      {markets.length > visibleCount && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={prev}
            className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition text-lg">
            ‹
          </button>
          <div className="flex gap-1.5">
            {markets.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? "bg-orange-400 w-4" : "bg-slate-300 dark:bg-slate-700 w-1.5"}`}
              />
            ))}
          </div>
          <button onClick={next}
            className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition text-lg">
            ›
          </button>
        </div>
      )}

      {/* Barra de progreso autoplay */}
      {!paused && (
        <div className="mt-2 mx-auto w-16 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            key={current}
            className="h-full bg-orange-400 rounded-full"
            style={{ animation: `progress ${autoplayMs}ms linear` }}
          />
        </div>
      )}

      <style>{`@keyframes progress { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
 }

function Card({ title, value, icon }: any) {
  return (
    <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4">
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
        <span>{title}</span>
        {icon}
      </div>
      <p className="text-xl sm:text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}