"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Search, LogOut, LogIn, Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
  const [points, setPoints] = useState<number | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mounted, setMounted] = useState(false);
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
      setUserName(data.nombre || data.email || null);
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
    loadMe().then(() => setMounted(true));
    loadNotifications();
    const syncAuth = () => loadMe();
    window.addEventListener("auth-change", syncAuth);
    const handleClickOutside = (e: any) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("auth-change", syncAuth);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const es = new EventSource("https://predicciones-ecuador.onrender.com/events");
    es.addEventListener("notifications", () => loadNotifications());
    es.addEventListener("bets", () => loadMe());
    es.addEventListener("transactions", () => { loadMe(); loadNotifications(); });
    return () => es.close();
  }, []);

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    
    <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link href="/" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-2xl bg-emerald-500 grid place-items-center font-bold text-slate-950 text-sm sm:text-base">P</div>
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-base sm:text-xl font-bold leading-tight truncate">Predicciones Ecuador</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">Mercados predictivos en tiempo real</p>
          </div>
        </Link>

        {/* Search desktop */}
        <div className="relative hidden md:block" ref={searchRef}>
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-4 py-3 rounded-2xl w-96 lg:w-[480px]">
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
          <div className="hidden sm:block"><ThemeToggle /></div>

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
              <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-20 sm:top-14 sm:w-96 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50">
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

          {/* Auth */}
          <div className="flex items-center gap-4">
            {!mounted ? (
              <div className="w-8 h-8 sm:w-20 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
            ) : !isLogged ? (
              <Link href="/login" className="hidden sm:flex text-sm font-semibold text-emerald-500 hover:text-emerald-400 transition-colors items-center gap-1.5">
                <LogIn size={15} /> Login
              </Link>
            ) : (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl hover:border-emerald-500/50 transition-all"
                >
                  {points !== null && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{points} $</span>
                  )}
                  <div className="h-6 w-6 rounded-full bg-emerald-500 text-white text-xs font-bold grid place-items-center shrink-0">
                    {userName?.charAt(0).toUpperCase() || "U"}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50"
                    style={{ animation: "slideDown 0.15s ease" }}>
                    <div className="py-1">
                      <Link href="/panel" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        <span>👤</span> Mi panel
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition">
                          <span>⚙️</span> Admin
                        </Link>
                      )}
                      <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                        <button
                          onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("points"); setIsLogged(false); setPoints(null); setIsAdmin(false); setShowUserMenu(false); window.location.href = "/"; }}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition w-full text-left"
                        >
                          <LogOut size={14} /> Cerrar sesión
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hamburguesa móvil */}
          <button onClick={() => { setShowMobileSearch(!showMobileSearch); setShowMobileMenu(false); }} className="sm:hidden p-2 rounded-xl bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-white">
            <Search size={18} />
          </button>
          <button onClick={() => { setShowMobileMenu(!showMobileMenu); setShowMobileSearch(false); }} className="sm:hidden p-2 rounded-xl bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-white">
            {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Búsqueda móvil inline */}
      {showMobileSearch && (
        <div className="sm:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3">
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-4 py-2.5 rounded-2xl">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              autoFocus
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
          {showResults && searchResults.length > 0 && (
            <div className="mt-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              {searchResults.map((m) => (
                <Link key={m.id} href={`/market/${m.id}`}
                  onClick={() => { setShowResults(false); setSearchQuery(""); setShowMobileSearch(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center justify-between gap-3">
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

      {/* Menú móvil */}
      {showMobileMenu && (
        <div className="sm:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-3"
          style={{ animation: "slideDown 0.15s ease" }}>

          {/* Modo claro/oscuro */}
          <div className="flex justify-center">
            <ThemeToggle />
          </div>

          {/* Links */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            {isLogged && (
              <Link href="/panel" onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition border-b border-slate-100 dark:border-slate-800">
                <span>👤</span> Mi panel
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition border-b border-slate-100 dark:border-slate-800">
                <span>⚙️</span> Admin
              </Link>
            )}
            {isLogged ? (
              <button
                onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("points"); setIsLogged(false); setPoints(null); setIsAdmin(false); setShowMobileMenu(false); window.location.href = "/"; }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition w-full">
                <LogOut size={15} /> Cerrar sesión
              </button>
            ) : (
              <Link href="/login" onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition">
                <LogIn size={15} /> Iniciar sesión
              </Link>
            )}
          </div>

        </div>
      )}
  </header>
    </>
  );
}