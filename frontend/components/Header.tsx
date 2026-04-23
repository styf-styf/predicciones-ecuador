"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Search, LogOut, LogIn, Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
  const [points, setPoints] = useState<number | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const notifRef = useRef<any>(null);
  const searchRef = useRef<any>(null);

  const loadMe = async () => {
    const token = localStorage.getItem("token");
    if (!token) { setIsLogged(false); setIsAdmin(false); setPoints(null); return; }
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
      setIsLogged(false); setIsAdmin(false); setPoints(null);
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

  useEffect(() => {
    loadMe();
    loadNotifications();
    const syncAuth = () => loadMe();
    window.addEventListener("auth-change", syncAuth);
    const handleClickOutside = (e: any) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    const userChannel = supabase.channel("header-user-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users" }, () => loadMe())
      .subscribe();
    const notifChannel = supabase.channel("header-notif-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => loadNotifications())
      .subscribe();
    return () => {
      window.removeEventListener("auth-change", syncAuth);
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.removeChannel(userChannel);
      supabase.removeChannel(notifChannel);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">

        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-2xl bg-emerald-500 grid place-items-center font-bold text-slate-950 text-sm sm:text-base">P</div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold leading-tight truncate">Predicciones Ecuador</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">Mercados predictivos en tiempo real</p>
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
                <X size={14} className="text-slate-400 hover:text-slate-200" />
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
                    <Link key={m.id} href={`/market/${m.id}`}
                      onClick={() => { setShowResults(false); setSearchQuery(""); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium truncate">{m.question}</p>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${m.resolved ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-white" : "bg-emerald-500/10 text-emerald-400"}`}>
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
                  setNotifications((prev: any) => prev.map((n: any) => ({ ...n, read: true })));
                }
              }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 relative"
            >
              <Bell size={18} />
              {notifications.filter((n: any) => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1 rounded-full">
                  {notifications.filter((n: any) => !n.read).length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-14 w-80 sm:w-96 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">Notificaciones</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-xs text-slate-400 hover:text-white">Cerrar</button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">No tienes notificaciones</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((n: any) => (
                      <div key={n.id} className={`p-3 rounded-xl border ${n.read ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800" : "bg-emerald-500/10 border-emerald-500/30"}`}>
                        <p className="font-semibold text-sm">{n.title}</p>
                        <p className="text-xs text-slate-300 mt-1">{n.message}</p>
                        <p className="text-[10px] text-slate-500 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Auth desktop */}
          <div className="hidden sm:flex items-center gap-2">
            {isAdmin && <Link href="/admin" className="px-3 py-2 rounded-2xl bg-amber-500 text-slate-950 font-semibold text-sm">Admin</Link>}
            <Link href="/panel" className="px-3 py-2 rounded-2xl bg-blue-500 font-semibold text-sm">Panel</Link>
            {isLogged ? (
              <button
                onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("points"); setIsLogged(false); setPoints(null); setIsAdmin(false); }}
                className="px-3 py-2 rounded-2xl bg-rose-500 font-medium flex items-center gap-1.5 text-sm"
              >
                <LogOut size={15} /> Salir
              </button>
            ) : (
              <Link href="/login" className="px-3 py-2 rounded-2xl bg-emerald-500 text-slate-950 font-semibold flex items-center gap-1.5 text-sm">
                <LogIn size={15} /> Login
              </Link>
            )}
          </div>

          {/* Hamburguesa móvil */}
          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="sm:hidden p-2 rounded-xl bg-slate-900">
            {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {showMobileMenu && (
        <div className="sm:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-3">
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-4 py-2.5 rounded-2xl">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input placeholder="Buscar mercados..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-sm text-slate-900 dark:text-white" />
          </div>
          {showResults && searchResults.length > 0 && (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              {searchResults.map((m) => (
                <Link key={m.id} href={`/market/${m.id}`}
                  onClick={() => { setShowResults(false); setSearchQuery(""); setShowMobileMenu(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium truncate">{m.question}</p>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${m.resolved ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {m.resolved ? "Cerrado" : "En vivo"}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2">
            {isAdmin && <Link href="/admin" onClick={() => setShowMobileMenu(false)} className="px-4 py-3 rounded-2xl bg-amber-500 text-slate-950 font-semibold text-sm text-center">Admin</Link>}
            <Link href="/panel" onClick={() => setShowMobileMenu(false)} className="px-4 py-3 rounded-2xl bg-blue-500 font-semibold text-sm text-center">Panel</Link>
            {isLogged ? (
              <button onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("points"); setIsLogged(false); setPoints(null); setIsAdmin(false); setShowMobileMenu(false); }}
                className="px-4 py-3 rounded-2xl bg-rose-500 font-medium flex items-center justify-center gap-2 text-sm w-full">
                <LogOut size={15} /> Cerrar sesión
              </button>
            ) : (
              <Link href="/login" onClick={() => setShowMobileMenu(false)} className="px-4 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-semibold flex items-center justify-center gap-2 text-sm">
                <LogIn size={15} /> Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}