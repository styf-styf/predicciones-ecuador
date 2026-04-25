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

  useEffect(() => {
    fetchMarkets();
    fetchCarouselConfig();
    const channel = supabase.channel("markets-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "markets" }, () => fetchMarkets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const trendingMarkets = [...markets]
    .filter((m) => !m.resolved)
    .sort((a, b) => (b.yes + b.no) - (a.yes + a.no))
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-white dark:bg-[#0d0d0d] text-slate-900 dark:text-white">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Stats bar */}
        <div className="flex items-center gap-6 text-sm border-b border-slate-200 dark:border-white/[0.06] pb-4 overflow-x-auto">
          {[
            { label: "Mercados", value: markets.length },
            { label: "Activos", value: markets.filter(m => !m.resolved).length },
            { label: "Resueltos", value: markets.filter(m => m.resolved).length },
            { label: "Vol. total", value: `${markets.reduce((s, m) => s + (m.yes ?? 0) + (m.no ?? 0), 0).toFixed(0)} pts` },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400 dark:text-white/30">{s.label}</span>
              <span className="font-bold tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Carruseles */}
        {(trendingMarkets.length > 0 || markets.filter(m => m.resolved).length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trendingMarkets.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-white/30 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Flame size={13} className="text-orange-400" /> Tendencias
                </p>
                <Carousel
                  markets={trendingMarkets}
                  autoplayMs={carouselConfig.autoplay_ms}
                  visibleCount={carouselConfig.trending_count}
                  renderCard={(market, index, globalIndex) => {
                    const total = (market.yes ?? 0) + (market.no ?? 0);
                    const yesPct = total === 0 ? 50 : Math.round((market.yes / total) * 100);
                    return (
                      <Link key={market.id} href={`/market/${market.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#111] hover:border-slate-300 dark:hover:border-white/[0.12] transition">
                        <span className="text-lg font-black text-orange-400 w-7 shrink-0">#{globalIndex + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate leading-snug">{market.question}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex">
                              <div className="bg-emerald-500 h-full" style={{ width: `${yesPct}%` }} />
                              <div className="bg-rose-500 h-full" style={{ width: `${100 - yesPct}%` }} />
                            </div>
                            <span className="text-[11px] text-slate-400 dark:text-white/30 tabular-nums shrink-0">{total} pts</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-emerald-500 font-bold text-sm">{yesPct}%</p>
                          <p className="text-[10px] text-slate-400 dark:text-white/30">Sí</p>
                        </div>
                      </Link>
                    );
                  }}
                />
              </div>
            )}
            {markets.filter(m => m.resolved).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-white/30 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Trophy size={13} className="text-yellow-400" /> Resueltos
                </p>
                <Carousel
                  markets={markets.filter(m => m.resolved)}
                  autoplayMs={carouselConfig.autoplay_ms}
                  visibleCount={carouselConfig.winners_count}
                  renderCard={(market) => {
                    const total = (market.yes ?? 0) + (market.no ?? 0);
                    const wonYes = market.winner === "yes";
                    const pct = total === 0 ? 50 : Math.round((market.yes / total) * 100);
                    return (
                      <Link key={market.id} href={`/market/${market.id}`}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition ${wonYes ? "border-emerald-500/20 bg-emerald-500/[0.03] hover:border-emerald-500/40" : "border-rose-500/20 bg-rose-500/[0.03] hover:border-rose-500/40"}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${wonYes ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"}`}>
                          {wonYes ? "✓" : "✗"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate leading-snug">{market.question}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex">
                              <div className="bg-emerald-500 h-full" style={{ width: `${pct}%` }} />
                              <div className="bg-rose-500 h-full" style={{ width: `${100 - pct}%` }} />
                            </div>
                            <span className="text-[11px] text-slate-400 dark:text-white/30 tabular-nums shrink-0">{total} pts</span>
                          </div>
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${wonYes ? "text-emerald-500" : "text-rose-500"}`}>
                          Ganó {wonYes ? "Sí" : "No"}
                        </span>
                      </Link>
                    );
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Tabla mercados */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 dark:text-white/30 uppercase tracking-widest">Todos los mercados</p>
            <span className="text-xs text-slate-400 dark:text-white/20">{markets.filter(m => !m.resolved).length} activos</span>
          </div>
          <div className="hidden sm:grid grid-cols-12 text-[11px] text-slate-400 dark:text-white/25 uppercase tracking-widest px-4 pb-2 border-b border-slate-100 dark:border-white/[0.04]">
            <span className="col-span-5">Mercado</span>
            <span className="col-span-3 text-center">Probabilidad</span>
            <span className="col-span-2 text-right">Volumen</span>
            <span className="col-span-2 text-right">Acción</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {markets.map((market) => {
              const total = (market.yes ?? 0) + (market.no ?? 0);
              const yesPct = total === 0 ? 50 : Math.round((market.yes / total) * 100);
              const noPct = 100 - yesPct;
              const isResolved = market.resolved;
              return (
                <div key={market.id} className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                  <div className="sm:col-span-5 flex items-center gap-3 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isResolved ? "bg-slate-300 dark:bg-white/20" : "bg-emerald-500"}`} />
                    <Link href={`/market/${market.id}`} className="text-sm font-medium leading-snug hover:text-emerald-500 transition line-clamp-2 sm:line-clamp-1">
                      {market.question}
                    </Link>
                    {isResolved && (
                      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-bold ${market.winner === "yes" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                        {market.winner === "yes" ? "Sí ganó" : "No ganó"}
                      </span>
                    )}
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2 sm:justify-center">
                    <span className="text-emerald-500 font-bold text-sm tabular-nums w-8 text-right">{total === 0 ? "—" : `${yesPct}%`}</span>
                    <div className="flex-1 sm:w-24 sm:flex-none h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500 h-full transition-all" style={{ width: `${yesPct}%` }} />
                      <div className="bg-rose-500 h-full transition-all" style={{ width: `${noPct}%` }} />
                    </div>
                    <span className="text-rose-500 font-bold text-sm tabular-nums w-8">{total === 0 ? "—" : `${noPct}%`}</span>
                  </div>
                  <div className="sm:col-span-2 text-right">
                    <span className="text-sm tabular-nums text-slate-500 dark:text-white/40 font-medium">
                      {total === 0 ? "0 pts" : `${total} pts`}
                    </span>
                  </div>
                  <div className="sm:col-span-2 flex gap-1.5 sm:justify-end">
                    {isResolved ? (
                      <span className="text-[11px] text-slate-400 dark:text-white/20">Cerrado</span>
                    ) : (
                      <>
                        <Link href={`/market/${market.id}?bet=yes`}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs text-center transition">
                          Sí
                        </Link>
                        <Link href={`/market/${market.id}?bet=no`}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs text-center transition">
                          No
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
            className="w-7 h-7 rounded-full border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:border-slate-300 transition text-base">
            ‹
          </button>
          <div className="flex gap-1.5">
            {markets.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-1 rounded-full transition-all ${i === current ? "bg-orange-400 w-4" : "bg-slate-200 dark:bg-white/[0.08] w-1"}`}
              />
            ))}
          </div>
          <button onClick={next}
            className="w-7 h-7 rounded-full border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:border-slate-300 transition text-base">
            ›
          </button>
        </div>
      )}
      {!paused && markets.length > visibleCount && (
        <div className="mt-2 mx-auto w-12 h-px bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
          <div key={current} className="h-full bg-orange-400 rounded-full"
            style={{ animation: `progress ${autoplayMs}ms linear` }} />
        </div>
      )}
      <style>{`@keyframes progress { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
}