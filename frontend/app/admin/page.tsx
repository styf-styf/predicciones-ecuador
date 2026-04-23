"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell, Search, TrendingUp, Trophy, Wallet,
  LogOut, LogIn, Users, Activity, DollarSign,
  BarChart2, ShieldCheck, ShieldOff, Plus, Minus,
  Settings, Menu, X
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [winners, setWinners] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pointsInput, setPointsInput] = useState<{ [key: string]: string }>({});
  const [charts, setCharts] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    min_bet: "", max_bet: "", commission: "", welcome_points: "",
  });

  // =======================
  // 🔧 FUNCIONES
  // =======================
  const fetchMarkets = async () => {
    const res = await fetch("https://predicciones-ecuador.onrender.com/markets");
    const data = await res.json();
    setMarkets(data);
  };

  const fetchWinners = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/winners", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setWinners(data);
  };

  const fetchStats = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/stats", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setStats(data);
  };

  const fetchCharts = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/charts", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setCharts(data);
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/users", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setUsers(data);
  };

  const fetchSettings = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/settings", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) {
      setConfig(data);
      setSettingsForm({
        min_bet: data.min_bet, max_bet: data.max_bet,
        commission: data.commission, welcome_points: data.welcome_points,
      });
    }
  };

  const handleSaveSettings = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({
        min_bet: parseFloat(settingsForm.min_bet),
        max_bet: parseFloat(settingsForm.max_bet),
        commission: parseFloat(settingsForm.commission),
        welcome_points: parseFloat(settingsForm.welcome_points),
      }),
    });
    const data = await res.json();
    if (res.ok) { alert("✅ Configuración guardada"); fetchSettings(); }
    else alert(data.message || "Error al guardar");
  };

  const loadMe = async () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }
    try {
      const res = await fetch("https://predicciones-ecuador.onrender.com/me", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.role !== "admin") { window.location.href = "/"; return; }
      setIsLogged(true); setIsAdmin(true); setPoints(data.points || 0);
      fetchWinners(); fetchStats(); fetchUsers(); fetchSettings(); fetchCharts();
    } catch {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  const handleCreateMarket = async () => {
    const token = localStorage.getItem("token");
    if (!newQuestion.trim()) return;
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/markets", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ question: newQuestion }),
    });
    const data = await res.json();
    if (res.ok) { setNewQuestion(""); fetchMarkets(); fetchStats(); }
    else alert(data.message || "Error al crear mercado");
  };

  const handleDeleteMarket = async (id: any) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/markets/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) { fetchMarkets(); fetchStats(); }
    else alert(data.message || "Error al eliminar");
  };

  const resolveMarket = async (id: number, winner: "yes" | "no") => {
    const token = localStorage.getItem("token");
    const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/resolve/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ winner }),
    });
    const data = await res.json();
    alert(data.message);
    fetchMarkets(); fetchWinners(); fetchStats();
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!confirm(`¿Cambiar rol a ${newRole}?`)) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/users/${userId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (res.ok) fetchUsers(); else alert(data.message);
  };

  const handlePoints = async (userId: string, amount: number) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/users/${userId}/points`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ points: amount }),
    });
    const data = await res.json();
    if (res.ok) { fetchUsers(); fetchStats(); setPointsInput((prev) => ({ ...prev, [userId]: "" })); }
    else alert(data.message);
  };

  const handleSuspend = async (userId: string, suspended: boolean) => {
    if (!confirm(suspended ? "¿Suspender usuario?" : "¿Activar usuario?")) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/users/${userId}/suspend`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ suspended }),
    });
    const data = await res.json();
    if (res.ok) fetchUsers(); else alert(data.message);
  };

  // =======================
  // 🔁 EFECTO
  // =======================
  useEffect(() => { fetchMarkets(); loadMe(); }, []);

  // =======================
  // 🎨 RENDER
  // =======================
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">

          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-2xl bg-emerald-500 grid place-items-center font-bold text-slate-950 text-sm">P</div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-bold leading-tight truncate">Admin • Predicciones EC</h1>
              <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">Centro de control y administración</p>
            </div>
          </div>

          {/* Search — solo desktop */}
          <div className="hidden md:flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-2xl w-80 lg:w-96">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input placeholder="Buscar..." className="bg-transparent outline-none w-full text-sm" />
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button className="p-2 rounded-xl bg-slate-900"><Bell size={18} /></button>

            {/* Auth — desktop */}
            <div className="hidden sm:flex items-center gap-2">
              {isAdmin && (
                <Link href="/admin" className="px-3 py-2 rounded-2xl bg-amber-500 text-slate-950 font-semibold text-sm">Admin</Link>
              )}
              <Link href="/" className="px-3 py-2 rounded-2xl bg-slate-800 font-medium text-sm">Inicio</Link>
              {isLogged ? (
                <button
                  onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("points"); window.location.href = "/login"; }}
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

            {/* Hamburguesa — móvil */}
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
              <input placeholder="Buscar..." className="bg-transparent outline-none w-full text-sm" />
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/" onClick={() => setShowMobileMenu(false)} className="px-4 py-3 rounded-2xl bg-slate-800 font-medium text-sm text-center">Inicio</Link>
              {isLogged ? (
                <button
                  onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("points"); window.location.href = "/login"; }}
                  className="px-4 py-3 rounded-2xl bg-rose-500 font-medium flex items-center justify-center gap-2 text-sm"
                >
                  <LogOut size={15} /> Cerrar sesión
                </button>
              ) : (
                <Link href="/login" className="px-4 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-semibold flex items-center justify-center gap-2 text-sm">
                  <LogIn size={15} /> Login
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* 📊 Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card title="Mi Balance" value={`${points ?? 0} pts`} icon={<Wallet size={16} />} />
          <Card title="Mercados" value={`${markets.length}`} icon={<TrendingUp size={16} />} />
          <Card title="Ganadores" value={`${winners.length}`} icon={<Trophy size={16} />} />
          <Card title="Usuarios" value={`${users.length}`} icon={<Users size={16} />} />
        </section>

        {/* 📈 ESTADÍSTICAS */}
        {stats && (
          <section className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <BarChart2 size={18} className="text-emerald-400" />
              <h2 className="text-lg sm:text-xl font-bold">Estadísticas generales</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <StatCard title="Total usuarios" value={stats.totalUsers} sub={`+${stats.newUsersToday} hoy`} icon={<Users size={16} />} color="text-blue-400" />
              <StatCard title="Puntos en circulación" value={`${stats.totalPoints} pts`} sub="suma de todos" icon={<Wallet size={16} />} color="text-emerald-400" />
              <StatCard title="Total apostado" value={`${stats.totalBetted} pts`} sub={`${stats.betsToday} hoy`} icon={<DollarSign size={16} />} color="text-amber-400" />
              <StatCard title="Mercados" value={`${stats.activeMarkets} activos`} sub={`${stats.closedMarkets} cerrados`} icon={<Activity size={16} />} color="text-rose-400" />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Mercados activos</span>
                <span>Mercados cerrados</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 transition-all"
                  style={{ width: `${((stats.activeMarkets ?? 0) / ((stats.activeMarkets ?? 0) + (stats.closedMarkets ?? 1))) * 100}%` }} />
                <div className="bg-slate-600 flex-1" />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-emerald-400">{stats.activeMarkets} activos</span>
                <span className="text-slate-400">{stats.closedMarkets} cerrados</span>
              </div>
            </div>
          </section>
        )}

        {/* 📈 GRÁFICAS */}
        {charts.length > 0 && (
          <section className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <TrendingUp size={18} className="text-emerald-400" />
              <h2 className="text-lg sm:text-xl font-bold">Actividad últimos 7 días</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">Apuestas por día</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={charts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} width={30} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px" }} labelStyle={{ color: "#fff" }} />
                    <Bar dataKey="apuestas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">Volumen apostado (pts)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={charts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} width={30} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px" }} labelStyle={{ color: "#fff" }} />
                    <Line type="monotone" dataKey="volumen" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">Nuevos usuarios por día</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={charts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} width={30} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px" }} labelStyle={{ color: "#fff" }} />
                    <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                    <Bar dataKey="usuarios" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Nuevos usuarios" />
                    <Bar dataKey="apuestas" fill="#10b981" radius={[4, 4, 0, 0]} name="Apuestas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* ⚙️ CONFIGURACIÓN */}
        {config && (
          <section className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6">
              <Settings size={18} className="text-slate-400" />
              <h2 className="text-lg sm:text-xl font-bold">Configuración de la plataforma</h2>
              {config.updated_at && (
                <span className="text-xs text-slate-500 sm:ml-auto w-full sm:w-auto">
                  Actualizado: {new Date(config.updated_at).toLocaleString()}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h3 className="font-semibold text-sm text-slate-300 flex items-center gap-2">
                  <DollarSign size={15} className="text-amber-400" /> Límites de apuesta
                </h3>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Apuesta mínima (pts)</label>
                  <input type="number" step="0.01" value={settingsForm.min_bet}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, min_bet: e.target.value }))}
                    className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Apuesta máxima (pts)</label>
                  <input type="number" step="0.01" value={settingsForm.max_bet}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, max_bet: e.target.value }))}
                    className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-sm text-slate-900 dark:text-white" />
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h3 className="font-semibold text-sm text-slate-300 flex items-center gap-2">
                  <Activity size={15} className="text-emerald-400" /> Parámetros generales
                </h3>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Comisión plataforma (%)</label>
                  <input type="number" step="0.1" min="0" max="100" value={settingsForm.commission}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, commission: e.target.value }))}
                    className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Puntos de bienvenida</label>
                  <input type="number" step="1" min="0" value={settingsForm.welcome_points}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, welcome_points: e.target.value }))}
                    className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-sm text-slate-900 dark:text-white" />
                </div>
              </div>
            </div>

            {/* Resumen actual */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Apuesta mín.", value: `${config.min_bet} pts`, color: "text-amber-400" },
                { label: "Apuesta máx.", value: `${config.max_bet} pts`, color: "text-amber-400" },
                { label: "Comisión", value: `${config.commission}%`, color: "text-emerald-400" },
                { label: "Puntos bienvenida", value: `${config.welcome_points} pts`, color: "text-blue-400" },
              ].map((item) => (
                <div key={item.label} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <button onClick={handleSaveSettings} className="mt-4 w-full bg-emerald-500 text-slate-950 font-bold rounded-xl py-3 active:scale-95 transition-transform">
              Guardar configuración
            </button>
          </section>
        )}

        {/* 👥 GESTIÓN DE USUARIOS */}
        <section className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Users size={18} className="text-blue-400" />
            <h2 className="text-lg sm:text-xl font-bold">Gestión de usuarios</h2>
            <span className="ml-auto text-xs text-slate-400">{users.length} usuarios</span>
          </div>

          {/* Tabla desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Nombre</th>
                  <th className="text-left py-2">Puntos</th>
                  <th className="text-left py-2">Rol</th>
                  <th className="text-left py-2">Proveedor</th>
                  <th className="text-left py-2">Estado</th>
                  <th className="text-left py-2">Puntos ±</th>
                  <th className="text-left py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={`border-b border-slate-100 dark:border-slate-900 ${u.suspended ? "opacity-50" : ""}`}>
                    <td className="py-3 text-xs">{u.email}</td>
                    <td className="py-3 text-xs">{u.nombre} {u.apellido}</td>
                    <td className="py-3 text-amber-400 font-bold">{u.points}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-300"}`}>{u.role}</span>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.provider === "google" ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-300"}`}>{u.provider}</span>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.suspended ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>{u.suspended ? "Suspendido" : "Activo"}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <input type="number" placeholder="0" value={pointsInput[u.id] || ""}
                          onChange={(e) => setPointsInput((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          className="w-16 bg-slate-200 dark:bg-slate-800 rounded-lg px-2 py-1 text-xs outline-none text-slate-900 dark:text-white" />
                        <button onClick={() => handlePoints(u.id, parseFloat(pointsInput[u.id] || "0"))} className="p-1 rounded-lg bg-emerald-500 text-slate-950"><Plus size={12} /></button>
                        <button onClick={() => handlePoints(u.id, -parseFloat(pointsInput[u.id] || "0"))} className="p-1 rounded-lg bg-rose-500 text-white"><Minus size={12} /></button>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleChangeRole(u.id, u.role)} className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 transition" title={u.role === "admin" ? "Quitar admin" : "Hacer admin"}>
                          <ShieldCheck size={14} />
                        </button>
                        <button onClick={() => handleSuspend(u.id, !u.suspended)} className={`p-1.5 rounded-lg transition ${u.suspended ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40" : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/40"}`} title={u.suspended ? "Activar" : "Suspender"}>
                          <ShieldOff size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards móvil — reemplaza la tabla */}
          <div className="sm:hidden space-y-3">
            {users.map((u) => (
              <div key={u.id} className={`bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 ${u.suspended ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{u.nombre} {u.apellido}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${u.suspended ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                    {u.suspended ? "Suspendido" : "Activo"}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-amber-400 font-bold text-sm">{u.points} pts</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-300"}`}>{u.role}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.provider === "google" ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-300"}`}>{u.provider}</span>
                </div>

                <div className="flex items-center gap-2">
                  <input type="number" placeholder="pts" value={pointsInput[u.id] || ""}
                    onChange={(e) => setPointsInput((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    className="w-20 bg-slate-200 dark:bg-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none text-slate-900 dark:text-white" />
                  <button onClick={() => handlePoints(u.id, parseFloat(pointsInput[u.id] || "0"))} className="p-1.5 rounded-lg bg-emerald-500 text-slate-950"><Plus size={13} /></button>
                  <button onClick={() => handlePoints(u.id, -parseFloat(pointsInput[u.id] || "0"))} className="p-1.5 rounded-lg bg-rose-500 text-white"><Minus size={13} /></button>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => handleChangeRole(u.id, u.role)} className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400"><ShieldCheck size={14} /></button>
                    <button onClick={() => handleSuspend(u.id, !u.suspended)} className={`p-1.5 rounded-lg ${u.suspended ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}><ShieldOff size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 👑 GESTIÓN DE MERCADOS */}
        {isAdmin && (
          <section className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold">Gestión de mercados</h2>
                <p className="text-xs sm:text-sm text-slate-400">Crear y gestionar mercados</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 shrink-0">Administrador</span>
            </div>

            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3">
              <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Nueva pregunta de mercado..."
                className="sm:col-span-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-sm text-slate-900 dark:text-white" />
              <button onClick={handleCreateMarket} className="bg-emerald-500 text-slate-950 font-bold rounded-xl px-4 py-3 text-sm active:scale-95 transition-transform">
                Crear mercado
              </button>
            </div>

            {/* Tabla desktop */}
            <div className="hidden sm:block mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Pregunta</th>
                    <th className="text-left py-2">Sí (pts)</th>
                    <th className="text-left py-2">No (pts)</th>
                    <th className="text-left py-2">Total</th>
                    <th className="text-left py-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((m) => (
                    <tr key={m.id} className="border-b border-slate-900">
                      <td className="py-2">{m.id}</td>
                      <td className="py-2">{m.question}</td>
                      <td className="py-2 text-emerald-400">{m.yes}</td>
                      <td className="py-2 text-rose-400">{m.no}</td>
                      <td className="py-2 text-amber-400 font-bold">{(Number(m.yes) + Number(m.no)).toFixed(2)}</td>
                      <td className="py-2">
                        {m.resolved ? (
                          <div className="text-xs rounded-xl bg-slate-800 px-3 py-2 inline-block">
                            <p className="font-bold text-white">Cerrado</p>
                            <p className="text-slate-300 mt-1">Ganó: <span className="text-emerald-400 font-bold">{m.winner === "yes" ? "Sí" : "No"}</span></p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => handleDeleteMarket(m.id)} className="px-3 py-1 rounded-lg bg-rose-500 text-white text-xs">Eliminar</button>
                            <button onClick={() => resolveMarket(m.id, "yes")} className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold">Ganó Sí</button>
                            <button onClick={() => resolveMarket(m.id, "no")} className="px-3 py-1 rounded-lg bg-blue-500 text-white text-xs font-bold">Ganó No</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards móvil para mercados */}
            <div className="sm:hidden mt-4 space-y-3">
              {markets.map((m) => (
                <div key={m.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-snug flex-1">{m.question}</p>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${m.resolved ? "bg-slate-700 text-white" : "bg-emerald-500/10 text-emerald-400"}`}>
                      {m.resolved ? "Cerrado" : "En vivo"}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-emerald-400">Sí: {m.yes}</span>
                    <span className="text-rose-400">No: {m.no}</span>
                    <span className="text-amber-400 font-bold">Total: {(Number(m.yes) + Number(m.no)).toFixed(2)}</span>
                  </div>
                  {m.resolved ? (
                    <div className="text-xs rounded-xl bg-slate-800 px-3 py-2 text-center">
                      Cerrado · Ganó <span className="text-emerald-400 font-bold">{m.winner === "yes" ? "Sí" : "No"}</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => handleDeleteMarket(m.id)} className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold">Eliminar</button>
                      <button onClick={() => resolveMarket(m.id, "yes")} className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold">Ganó Sí</button>
                      <button onClick={() => resolveMarket(m.id, "no")} className="flex-1 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold">Ganó No</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 📊 VISTA PREVIA MERCADOS */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Vista previa de mercados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {markets.map((market) => {
              const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
              const yesPct = ((market.yes / total) * 100).toFixed(0);
              const noPct = ((market.no / total) * 100).toFixed(0);
              return (
                <div key={market.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-sm sm:text-base leading-snug">{market.question}</h3>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${market.resolved ? "bg-slate-700 text-white" : "bg-emerald-500/10 text-emerald-400"}`}>
                      {market.resolved ? "Cerrado" : "En vivo"}
                    </span>
                  </div>
                  <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500" style={{ width: `${yesPct}%` }} />
                    <div className="bg-rose-500" style={{ width: `${noPct}%` }} />
                  </div>
                  <p className="text-xs mt-2 text-slate-500 dark:text-slate-400">Sí {yesPct}% • No {noPct}% • {total} pts</p>
                  <div className="mt-4">
                    {market.resolved ? (
                      <div className="text-center text-sm px-3 py-2 rounded-xl bg-slate-800 text-white">
                        Ganó {market.winner === "yes" ? "Sí" : "No"}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => resolveMarket(market.id, "yes")} className="bg-emerald-500 text-slate-950 font-bold rounded-xl py-2.5 text-sm active:scale-95 transition-transform">Ganó Sí</button>
                        <button onClick={() => resolveMarket(market.id, "no")} className="bg-blue-500 text-white font-bold rounded-xl py-2.5 text-sm active:scale-95 transition-transform">Ganó No</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 🏆 HISTORIAL GANADORES */}
        <section className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg sm:text-2xl font-bold mb-4">Historial de Ganadores</h2>

          {/* Tabla desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="text-left py-2">Usuario</th>
                  <th className="text-left py-2">Mercado</th>
                  <th className="text-left py-2">Predicción</th>
                  <th className="text-left py-2">Premio</th>
                  <th className="text-left py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {winners.map((w) => (
                  <tr key={w.id} className="border-b border-slate-800">
                    <td className="py-2">{w.users?.email}</td>
                    <td className="py-2">{w.markets?.question}</td>
                    <td className="py-2">{w.prediction === "yes" ? "Sí" : "No"}</td>
                    <td className="py-2 text-amber-400 font-bold">+{w.reward}</td>
                    <td className="py-2 text-slate-400">{new Date(w.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards móvil para ganadores */}
          <div className="sm:hidden space-y-3">
            {winners.map((w) => (
              <div key={w.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 truncate flex-1">{w.users?.email}</p>
                  <span className="text-amber-400 font-bold text-sm shrink-0 ml-2">+{w.reward} pts</span>
                </div>
                <p className="text-sm font-semibold leading-snug">{w.markets?.question}</p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Predicción: <span className="text-emerald-400 font-semibold">{w.prediction === "yes" ? "Sí" : "No"}</span></span>
                  <span>{new Date(w.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
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
        <span>{title}</span>{icon}
      </div>
      <p className="text-xl sm:text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function StatCard({ title, value, sub, icon, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4">
      <div className={`flex items-center gap-2 ${color} mb-2`}>
        {icon}<span className="text-xs sm:text-sm font-medium">{title}</span>
      </div>
      <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}