"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Search, TrendingUp, Trophy, Wallet, LogOut, LogIn, Flame, Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import Header from "@/components/Header";

export default function Home() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [betAmounts, setBetAmounts] = useState<{ [key: number]: string }>({});
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
    const init = async () => { await fetchMarkets(); };
    init();
    
  
    const handleClickOutside = (event: any) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    const channel = supabase.channel("markets-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "markets" }, () => fetchMarkets())
      .subscribe();
    const notifChannel = supabase.channel("notifications-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => loadNotifications())
      .subscribe();
    const userChannel = supabase.channel("user-points-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users" }, () => loadMe())
      .subscribe();
    return () => {
      window.removeEventListener("auth-change", syncAuth);
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.removeChannel(channel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(userChannel);
    };

    // Cerrar resultados al hacer click fuera
 const handleClickOutsideSearch = (e: any) => {
  if (searchRef.current && !searchRef.current.contains(e.target)) {
    setShowResults(false);
  }
 };
 document.addEventListener("mousedown", handleClickOutsideSearch);

 // Debounce búsqueda
 const debounceTimer = setTimeout(() => {
  if (searchQuery.trim() !== "") handleSearch(searchQuery);
 }, 400);

 return () => {
  // ...los removes que ya tienes...
  document.removeEventListener("mousedown", handleClickOutsideSearch);
  clearTimeout(debounceTimer);
 };
  }, []);

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">

      <Header />
      {/* ===== CONTENIDO ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card title="Balance" value={`${points ?? 0} pts`} icon={<Wallet size={16} />} />
          <Card title="Mercados" value={`${markets.length}`} icon={<TrendingUp size={16} />} />
          <Card title="Ranking" value="#12" icon={<Trophy size={16} />} />
          <Card title="Estado" value={isLogged ? "Online" : "Invitado"} icon={<Bell size={16} />} />
        </section>

        {/* Tendencias */}
        {trendingMarkets.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame size={18} className="text-orange-400" />
              <h2 className="text-lg sm:text-xl font-bold">Tendencias</h2>
              <span className="text-xs text-slate-400 hidden sm:inline">Mercados con mayor actividad</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {trendingMarkets.map((market, index) => {
                const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
                const yesPct = ((market.yes / total) * 100).toFixed(0);
                const noPct = ((market.no / total) * 100).toFixed(0);
                return (
                  <button
                    key={market.id}
                    onClick={() => scrollToMarket(market.id)}
                    className="bg-slate-100 dark:bg-slate-900 border border-orange-500/30 rounded-2xl p-4 flex items-center gap-3 hover:border-orange-400 transition text-left w-full"
                  >
                    <span className="text-xl sm:text-2xl font-black text-orange-400 shrink-0">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{market.question}</p>
                      <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500" style={{ width: `${yesPct}%` }} />
                        <div className="bg-rose-500" style={{ width: `${noPct}%` }} />
                      </div>
                      <p className="text-xs mt-1 text-slate-400">{total} pts • Sí {yesPct}% • No {noPct}%</p>
                    </div>
                  </button>
                );
              })}
            </div>
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
                  ref={(el) => { marketRefs.current[market.id] = el; }}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-sm sm:text-base mt-0.5 leading-snug">{market.question}</h3>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${isResolved ? "bg-slate-700 text-white" : "bg-emerald-500/10 text-emerald-400"}`}>
                      {isResolved ? "Cerrado" : "En vivo"}
                    </span>
                  </div>

                  <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500" style={{ width: `${yesPct}%` }} />
                    <div className="bg-rose-500" style={{ width: `${noPct}%` }} />
                  </div>
                  <p className="text-xs mt-2 text-slate-500 dark:text-slate-400">Sí {yesPct}% • No {noPct}% • {total} pts</p>

                  <div className="mt-4">
                    {isResolved ? (
                      <div className="text-center text-sm px-3 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white">
                        <p className="font-bold">Mercado resuelto</p>
                        <p className="mt-1 text-slate-300">
                          Ganó <span className="text-emerald-400 font-bold">{market.winner === "yes" ? "Sí" : "No"}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
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
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
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