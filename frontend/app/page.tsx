
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Search, TrendingUp, Trophy, Wallet, LogOut, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<any>(null);

const loadNotifications = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    setNotifications([]);
    return;
  }

  try {
    const res = await fetch("https://predicciones-ecuador.onrender.com/notifications", {
      headers: { authorization: token },
    });

    if (!res.ok) {
      setNotifications([]);
      return;
    }

    const data = await res.json();
    setNotifications(Array.isArray(data) ? data : []);
  } catch (err) {
    setNotifications([]);
  }
 };

  const fetchMarkets = async () => {
    const res = await fetch("https://predicciones-ecuador.onrender.com/markets");
    const data = await res.json();
    setMarkets(data);
  };

  const handleBet = async (marketId: number, type: "yes" | "no") => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Debes iniciar sesión ❌");

    const res = await fetch("https://predicciones-ecuador.onrender.com/bet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: token,
      },
      body: JSON.stringify({ marketId, type }),
    });

    const data = await res.json();
    if (data.points !== undefined) {
      setPoints(data.points);
      fetchMarkets();
    } else {
      alert(data.message);
    }
  };

  const loadMe = async () => {
  const token = localStorage.getItem("token");

  // 1. Intentar login normal (JWT backend)
  if (token) {
    try {
      const res = await fetch("https://predicciones-ecuador.onrender.com/me", {
        headers: { authorization: token },
      });

      if (res.ok) {
        const data = await res.json();

        setPoints(data.points || 0);
        setIsAdmin(data.role === "admin");
        setIsLogged(true);
        return;
      }
    } catch (error) {
      console.log("No es token backend");
    }
  }

  // 2. Intentar login Google
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    const email = data.session.user.email;

    const { data: userData } = await supabase
      .from("users")
      .select("points, role")
      .eq("email", email)
      .single();

    setPoints(userData?.points || 0);
    setIsAdmin(userData?.role === "admin");
    setIsLogged(true);
    return;
  }

  // 3. No hay sesión
  setIsLogged(false);
  setIsAdmin(false);
  setPoints(null);
 };

  useEffect(() => {
  const init = async () => {
    await fetchMarkets();
    await loadMe();
    await loadNotifications();
  };

  init();

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
      {
        event: "*",
        schema: "public",
        table: "markets",
      },
      () => fetchMarkets()
    )
    .subscribe();

  const notifChannel = supabase
    .channel("notifications-live")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      },
      () => loadNotifications()
    )
    .subscribe();

  const userChannel = supabase
    .channel("user-points-live")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "users",
      },
      () => loadMe()
    )
    .subscribe();

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
    supabase.removeChannel(channel);
    supabase.removeChannel(notifChannel);
    supabase.removeChannel(userChannel);
  };
}, []);

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
            <div className="h-10 w-10 rounded-2xl bg-emerald-500 grid place-items-center font-bold text-slate-950">P</div>
            <div>
              <h1 className="text-xl font-bold">Predicciones Ecuador</h1>
              <p className="text-xs text-slate-400">Mercados predictivos en tiempo real</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-2xl w-96">
            <Search size={18} className="text-slate-400" />
            <input placeholder="Buscar mercados..." className="bg-transparent outline-none w-full text-sm" />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={notifRef}>
  <button
  onClick={async () => {
    const next = !showNotifications;
    setShowNotifications(next);

    if (next) {
      await loadNotifications();

      const token = localStorage.getItem("token");

      await fetch("https://predicciones-ecuador.onrender.com/notifications/read", {
        method: "PUT",
        headers: {
          authorization: token || "",
        },
      });

      setNotifications((prev:any) =>
        prev.map((n:any) => ({ ...n, read: true }))
      );
    }
  }}
    className="p-2 rounded-xl bg-slate-900 relative"
  >
    <Bell size={18} />

    {notifications.filter((n:any) => !n.read).length > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1 rounded-full">
        {notifications.filter((n:any) => !n.read).length}
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
          {notifications.map((n:any) => (
            <div
              key={n.id}
              className={`p-3 rounded-xl border ${
                n.read
                  ? "bg-slate-950 border-slate-800"
                  : "bg-emerald-500/10 border-emerald-500/30"
              }`}
            >
              <p className="font-semibold text-sm">{n.title}</p>
              <p className="text-xs text-slate-300 mt-1">{n.message}</p>
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
            {isLogged ? (
              <button
                onClick={async () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("points");

  await supabase.auth.signOut();

  setIsLogged(false);
  setPoints(null);
  setIsAdmin(false);
 }}
                className="px-4 py-2 rounded-2xl bg-rose-500 font-medium flex items-center gap-2"
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            ) : (
              <Link href="/login" className="px-4 py-2 rounded-2xl bg-emerald-500 text-slate-950 font-semibold flex items-center gap-2">
                <LogIn size={16} /> Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="grid md:grid-cols-4 gap-4">
          <Card title="Balance" value={`${points ?? 0} pts`} icon={<Wallet size={18} />} />
          <Card title="Mercados" value={`${markets.length}`} icon={<TrendingUp size={18} />} />
          <Card title="Ranking" value="#12" icon={<Trophy size={18} />} />
          <Card title="Estado" value={isLogged ? "Online" : "Invitado"} icon={<Bell size={18} />} />
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
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
          {/* Header */}
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

          {/* Barra */}
          <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500"
              style={{ width: `${yesPct}%` }}
            />
            <div
              className="bg-rose-500"
              style={{ width: `${noPct}%` }}
            />
          </div>

          {/* Info */}
          <p className="text-xs mt-2 text-slate-400">
            Sí {yesPct}% • No {noPct}% • {total} pts
          </p>

          {/* Botones */}
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
            )}
          </div>
        </div>
      );
    })}
  </div>
</div>
          <aside className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">Resumen</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>Mercados abiertos: {markets.length}</li>
                <li>Sesión: {isLogged ? "Activa" : "No iniciada"}</li>
                <li>Puntos: {points ?? 0}</li>
                <li>API conectada correctamente</li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">Tendencias</h3>
              <p className="text-sm text-slate-400">Los mercados con mayor actividad aparecerán aquí.</p>
            </div>
          </aside>
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