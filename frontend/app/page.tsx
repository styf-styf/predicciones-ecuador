"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Search, TrendingUp, Trophy, Wallet, LogOut, LogIn, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [betAmounts, setBetAmounts] = useState<{ [key: number]: string }>({});
  const notifRef = useRef<any>(null);

  // =======================
  // 🔧 FUNCIONES
  // =======================
  const fetchMarkets = async () => {
    const res = await fetch("https://predicciones-ecuador.onrender.com/markets");
    const data = await res.json();
    setMarkets(data);
  };

  const loadMe = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsLogged(false);
      setIsAdmin(false);
      setPoints(null);
      return;
    }

    try {
      const res = await fetch("https://predicciones-ecuador.onrender.com/me", {
        headers: { authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setPoints(data.points || 0);
      setIsAdmin(data.role === "admin");
      setIsLogged(true);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("points");
      setIsLogged(false);
      setIsAdmin(false);
      setPoints(null);
    }
  };

  const loadNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setNotifications([]);
      return;
    }

    try {
      const res = await fetch("https://predicciones-ecuador.onrender.com/notifications", {
        headers: { authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setNotifications([]);
        return;
      }

      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  };

  const handleBet = async (marketId: number, type: "yes" | "no") => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Debes iniciar sesión ❌");

    const amount = parseFloat(betAmounts[marketId] || "");

    if (isNaN(amount) || amount < 1 || amount > 10) {
      return alert("El monto debe ser entre 1 y 10 puntos");
    }

    const res = await fetch("https://predicciones-ecuador.onrender.com/bet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ marketId, type, amount }),
    });

    const data = await res.json();
    if (data.points !== undefined) {
      setPoints(data.points);
      setBetAmounts((prev) => ({ ...prev, [marketId]: "" }));
      fetchMarkets();
    } else {
      alert(data.message);
    }
  };

  // Top 3 mercados con mayor actividad (yes + no)
  const trendingMarkets = [...markets]
    .filter((m) => !m.resolved)
    .sort((a, b) => (b.yes + b.no) - (a.yes + a.no))
    .slice(0, 3);

  // =======================
  // 🔁 EFECTOS
  // =======================
  useEffect(() => {
    const init = async () => {
      await fetchMarkets();
      await loadMe();
      await loadNotifications();
    };

    init();

    const syncAuth = () => loadMe();
    window.addEventListener("auth-change", syncAuth);

    const handleClickOutside = (event: any) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const channel = supabase
      .channel("markets-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "markets" },
        () => fetchMarkets()
      )
      .subscribe();

    const notifChannel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => loadNotifications()
      )
      .subscribe();

    const userChannel = supabase
      .channel("user-points-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users" },
        () => loadMe()
      )
      .subscribe();

    return () => {
      window.removeEventListener("auth-change", syncAuth);
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.removeChannel(channel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(userChannel);
    };
  }, []);

  // =======================
  // 🎨 RENDER
  // =======================
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-semibold"
              >
                Admin
              </Link>
            )}

            <Link
              href="/panel"
              className="px-4 py-2 rounded-2xl bg-blue-500 font-semibold"
            >
              Panel
            </Link>

            <div className="h-10 w-10 rounded-2xl bg-emerald-500 grid place-items-center font-bold text-slate-950">
              P
            </div>
            <div>
              <h1 className="text-xl font-bold">Predicciones Ecuador</h1>
              <p className="text-xs text-slate-400">
                Mercados predictivos en tiempo real
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-2xl w-96">
            <Search size={18} className="text-slate-400" />
            <input
              placeholder="Buscar mercados..."
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* 🔔 Notificaciones */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={async () => {
                  const next = !showNotifications;
                  setShowNotifications(next);

                  if (next) {
                    await loadNotifications();

                    const token = localStorage.getItem("token");
                    await fetch(
                      "https://predicciones-ecuador.onrender.com/notifications/read",
                      {
                        method: "PUT",
                        headers: {
                          authorization: `Bearer ${token}` || "",
                        },
                      }
                    );

                    setNotifications((prev: any) =>
                      prev.map((n: any) => ({ ...n, read: true }))
                    );
                  }
                }}
                className="p-2 rounded-xl bg-slate-900 relative"
              >
                <Bell size={18} />
                {notifications.filter((n: any) => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1 rounded-full">
                    {notifications.filter((n: any) => !n.read).length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-14 w-96 max-h-[500px] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm">Notificaciones</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cerrar
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center">
                      No tienes notificaciones
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((n: any) => (
                        <div
                          key={n.id}
                          className={`p-3 rounded-xl border ${
                            n.read
                              ? "bg-slate-950 border-slate-800"
                              : "bg-emerald-500/10 border-emerald-500/30"
                          }`}
                        >
                          <p className="font-semibold text-sm">{n.title}</p>
                          <p className="text-xs text-slate-300 mt-1">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-2">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 🔐 Auth */}
            {isLogged ? (
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("role");
                  localStorage.removeItem("points");
                  setIsLogged(false);
                  setPoints(null);
                  setIsAdmin(false);
                }}
                className="px-4 py-2 rounded-2xl bg-rose-500 font-medium flex items-center gap-2"
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-2xl bg-emerald-500 text-slate-950 font-semibold flex items-center gap-2"
              >
                <LogIn size={16} /> Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 📊 Cards */}
        <section className="grid md:grid-cols-4 gap-4">
          <Card title="Balance" value={`${points ?? 0} pts`} icon={<Wallet size={18} />} />
          <Card title="Mercados" value={`${markets.length}`} icon={<TrendingUp size={18} />} />
          <Card title="Ranking" value="#12" icon={<Trophy size={18} />} />
          <Card title="Estado" value={isLogged ? "Online" : "Invitado"} icon={<Bell size={18} />} />
        </section>

        {/* 🔥 Tendencias */}
        {trendingMarkets.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame size={20} className="text-orange-400" />
              <h2 className="text-xl font-bold">Tendencias</h2>
              <span className="text-xs text-slate-400">Mercados con mayor actividad</span>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {trendingMarkets.map((market, index) => {
                const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
                const yesPct = ((market.yes / total) * 100).toFixed(0);
                const noPct = ((market.no / total) * 100).toFixed(0);

                return (
                  <div
                    key={market.id}
                    className="bg-slate-900 border border-orange-500/30 rounded-2xl p-4 flex items-center gap-4"
                  >
                    <span className="text-2xl font-black text-orange-400">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{market.question}</p>
                      <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500" style={{ width: `${yesPct}%` }} />
                        <div className="bg-rose-500" style={{ width: `${noPct}%` }} />
                      </div>
                      <p className="text-xs mt-1 text-slate-400">
                        {total} pts apostados • Sí {yesPct}% • No {noPct}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 📈 Mercados activos */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Mercados activos</h2>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {markets.map((market) => {
              const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
              const yesPct = ((market.yes / total) * 100).toFixed(0);
              const noPct = ((market.no / total) * 100).toFixed(0);
              const isResolved = market.resolved;

              return (
                <div
                  key={market.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400">
                        Mercado #{market.id}
                      </p>
                      <h3 className="font-semibold text-lg mt-1">
                        {market.question}
                      </h3>
                    </div>

                    <span
                      className={`text-xs px-3 py-1 rounded-full ${
                        isResolved
                          ? "bg-slate-700 text-white"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {isResolved ? "Cerrado" : "En vivo"}
                    </span>
                  </div>

                  <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500" style={{ width: `${yesPct}%` }} />
                    <div className="bg-rose-500" style={{ width: `${noPct}%` }} />
                  </div>

                  <p className="text-xs mt-2 text-slate-400">
                    Sí {yesPct}% • No {noPct}% • {total} pts
                  </p>

                  <div className="mt-4">
                    {isResolved ? (
                      <div className="text-center text-sm px-3 py-3 rounded-xl bg-slate-800 text-white">
                        <p className="font-bold">Mercado resuelto</p>
                        <p className="mt-1 text-slate-300">
                          Ganó{" "}
                          <span className="text-emerald-400 font-bold">
                            {market.winner === "yes" ? "Sí" : "No"}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2">
                          <span className="text-slate-400 text-xs">pts</span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            step="0.01"
                            placeholder="1.00 - 10.00"
                            value={betAmounts[market.id] || ""}
                            onChange={(e) =>
                              setBetAmounts((prev) => ({
                                ...prev,
                                [market.id]: e.target.value,
                              }))
                            }
                            className="bg-transparent outline-none w-full text-sm text-white placeholder-slate-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleBet(market.id, "yes")}
                            className="bg-emerald-500 text-slate-950 font-bold rounded-xl py-2 text-sm"
                          >
                            Comprar Sí
                          </button>
                          <button
                            onClick={() => handleBet(market.id, "no")}
                            className="bg-rose-500 text-white font-bold rounded-xl py-2 text-sm"
                          >
                            Comprar No
                          </button>
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center justify-between text-slate-400 text-sm">
        <span>{title}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}