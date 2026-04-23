"use client";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Wallet, Trophy, BarChart3, ArrowUpRight, Shield,
  Bell, Search, LogOut, LogIn, Menu, X
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function PanelPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const notifRef = useRef<any>(null);
  const searchRef = useRef<any>(null);

  // =======================
  // 🔧 FUNCIONES
  // =======================
  const loadPanel = async () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const headers = { authorization: `Bearer ${token}` };
    try {
      const [meRes, betsRes, rankRes] = await Promise.all([
        fetch("https://predicciones-ecuador.onrender.com/me", { headers }),
        fetch("https://predicciones-ecuador.onrender.com/my-bets", { headers }),
        fetch("https://predicciones-ecuador.onrender.com/ranking"),
      ]);
      const meData = await meRes.json();
      const betsData = await betsRes.json();
      const rankData = await rankRes.json();
      setUser(meData);
      setIsAdmin(meData.role === "admin");
      setBets(betsData || []);
      setRanking(rankData || []);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) { setNotifications([]); return; }
    try {
      const res = await fetch("https://predicciones-ecuador.onrender.com/notifications", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setNotifications([]); return; }
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch { setNotifications([]); }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim() === "") { setSearchResults([]); setShowResults(false); return; }
    const token = localStorage.getItem("token");
    const res = await fetch(
      `https://predicciones-ecuador.onrender.com/markets/search?q=${encodeURIComponent(q)}`,
      { headers: token ? { authorization: `Bearer ${token}` } : {} }
    );
    const data = await res.json();
    setSearchResults(data);
    setShowResults(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("points");
    router.push("/login");
  };

  // =======================
  // 🔁 EFECTOS
  // =======================
  useEffect(() => {
    loadPanel();
    loadNotifications();

    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.id;

    const usersChannel = supabase.channel("panel-users")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${userId}` }, () => loadPanel())
      .subscribe();

    const betsChannel = supabase.channel("panel-bets")
      .on("postgres_changes", { event: "*", schema: "public", table: "bets", filter: `user_id=eq.${userId}` }, () => loadPanel())
      .subscribe();

    const handleClickOutside = (e: any) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener("mousedown", handleClickOutside);

    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim() !== "") handleSearch(searchQuery);
    }, 400);

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(betsChannel);
      document.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(debounceTimer);
    };
  }, [searchQuery]);

  // =======================
  // 🎨 RENDER
  // =======================
  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white grid place-items-center">
        <p className="text-xl animate-pulse">Cargando panel...</p>
      </main>
    );
  }

  const totalBet = bets.reduce((acc, bet) => acc + Number(bet.amount), 0);
  const totalBets = bets.length;
  const userRankIndex = ranking.findIndex((r) => r.email === user?.email);

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">

          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-2xl bg-emerald-500 grid place-items-center font-bold text-slate-950 text-sm">P</div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-bold leading-tight truncate">Predicciones Ecuador</h1>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Mi Panel</p>
            </div>
          </div>

          {/* Search desktop */}
          <div className="relative hidden md:block" ref={searchRef}>
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-2xl w-80 lg:w-96">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                placeholder="Buscar mercados..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="bg-transparent outline-none w-full text-sm text-slate-900 dark:text-white placeholder-slate-400"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSearchResults([]); setShowResults(false); }}>
                  <X size={14} className="text-slate-400" />
                </button>
              )}
            </div>
            {showResults && (
              <div className="absolute top-12 left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                {searchResults.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Sin resultados para "{searchQuery}"</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((m) => (
                      <Link
                        key={m.id}
                        href={`/?market=${m.id}`}
                        onClick={() => { setShowResults(false); setSearchQuery(""); }}
                        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <p className="text-sm font-medium truncate">{m.question}</p>
                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${m.resolved ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {m.resolved ? "Cerrado" : "En vivo"}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {/* Notificaciones */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={async () => {
                  const next = !showNotifications;
                  setShowNotifications(next);
                  if (next) {
                    await loadNotifications();
                    const token = localStorage.getItem("token");
                    await fetch("https://predicciones-ecuador.onrender.com/notifications/read", {
                      method: "PUT", headers: { authorization: `Bearer ${token}` || "" },
                    });
                    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                  }
                }}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 relative"
              >
                <Bell size={18} />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1 rounded-full">
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-14 w-80 sm:w-96 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm">Notificaciones</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white">Cerrar</button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center">No tienes notificaciones</p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((n) => (
                        <div key={n.id} className={`p-3 rounded-xl border ${n.read ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800" : "bg-emerald-500/10 border-emerald-500/30"}`}>
                          <p className="font-semibold text-sm">{n.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Links desktop */}
            <div className="hidden sm:flex items-center gap-2">
              {isAdmin && (
                <Link href="/admin" className="px-3 py-2 rounded-2xl bg-amber-500 text-slate-950 font-semibold text-sm">Admin</Link>
              )}
              <Link href="/" className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 font-medium text-sm">Inicio</Link>
              <button onClick={handleLogout} className="px-3 py-2 rounded-2xl bg-rose-500 text-white font-medium flex items-center gap-1.5 text-sm">
                <LogOut size={15} /> Salir
              </button>
            </div>

            {/* Hamburguesa móvil */}
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="sm:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900">
              {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {showMobileMenu && (
          <div className="sm:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-3">
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-4 py-2.5 rounded-2xl">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                placeholder="Buscar mercados..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="bg-transparent outline-none w-full text-sm text-slate-900 dark:text-white"
              />
            </div>
            {showResults && searchResults.length > 0 && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                {searchResults.map((m) => (
                  <Link
                    key={m.id}
                    href="/"
                    onClick={() => { setShowResults(false); setSearchQuery(""); setShowMobileMenu(false); }}
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <p className="text-sm font-medium truncate">{m.question}</p>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${m.resolved ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" : "bg-emerald-500/10 text-emerald-400"}`}>
                      {m.resolved ? "Cerrado" : "En vivo"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              {isAdmin && (
                <Link href="/admin" onClick={() => setShowMobileMenu(false)} className="px-4 py-3 rounded-2xl bg-amber-500 text-slate-950 font-semibold text-sm text-center">Admin</Link>
              )}
              <Link href="/" onClick={() => setShowMobileMenu(false)} className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 font-medium text-sm text-center">Inicio</Link>
              <button onClick={handleLogout} className="px-4 py-3 rounded-2xl bg-rose-500 text-white font-medium flex items-center justify-center gap-2 text-sm">
                <LogOut size={15} /> Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ===== CONTENIDO ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Hero usuario */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-emerald-500 text-slate-950 font-bold text-xl sm:text-2xl grid place-items-center shrink-0">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Mi Panel</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{user.email}</p>
            </div>
          </div>
          {userRankIndex !== -1 && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-2xl self-start sm:self-auto">
              <Trophy size={16} className="text-amber-400" />
              <span className="text-sm font-semibold">Ranking #{userRankIndex + 1}</span>
            </div>
          )}
        </div>

        {/* Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card title="Puntos" value={`${user.points} pts`} icon={<Wallet size={16} />} />
          <Card title="Rol" value={user.role} icon={<Shield size={16} />} />
          <Card title="Apuestas" value={totalBets} icon={<BarChart3 size={16} />} />
          <Card title="Total Apostado" value={`${totalBet.toFixed(2)} pts`} icon={<ArrowUpRight size={16} />} />
        </section>

        {/* Main Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Historial */}
          <div className="lg:col-span-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Historial de Apuestas</h2>
            {bets.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">Aún no tienes apuestas.</p>
            ) : (
              <div className="space-y-3">
                {bets.map((bet) => (
                  <div key={bet.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <div className="flex justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-snug truncate">{bet.markets?.question}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {bet.type === "yes" ? "✅ Sí" : "❌ No"} · {bet.amount} pts
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {new Date(bet.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Ranking */}
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Ranking Global</h2>
              <div className="space-y-2">
                {ranking.map((item, index) => {
                  const isMe = item.email === user?.email;
                  const nombre = item.nombre
                    ? `${item.nombre}${item.apellido ? " " + item.apellido : ""}`
                    : item.email;
                  return (
                    <div
                      key={index}
                      className={`flex justify-between rounded-xl px-4 py-3 ${isMe ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`font-bold shrink-0 ${index === 0 ? "text-amber-400" : index === 1 ? "text-slate-400" : index === 2 ? "text-amber-600" : "text-emerald-400"}`}>
                          #{index + 1}
                        </span>
                        <span className="text-sm truncate">
                          {nombre} {isMe && <span className="text-emerald-400 text-xs">(tú)</span>}
                        </span>
                      </div>
                      <span className="font-semibold text-sm shrink-0">{item.points} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Perfil */}
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
              <h2 className="text-lg sm:text-xl font-bold mb-3">Perfil</h2>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex justify-between"><span className="text-slate-400">Email</span><span className="truncate ml-2">{user.email}</span></li>
                <li className="flex justify-between"><span className="text-slate-400">Rol</span><span className="capitalize">{user.role}</span></li>
                <li className="flex justify-between"><span className="text-slate-400">Puntos</span><span className="text-emerald-400 font-bold">{user.points}</span></li>
                <li className="flex justify-between"><span className="text-slate-400">Estado</span><span className="text-emerald-400">Activo</span></li>
              </ul>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, value, icon }: any) {
  return (
    <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
        <span>{title}</span>
        {icon}
      </div>
      <p className="text-xl sm:text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}