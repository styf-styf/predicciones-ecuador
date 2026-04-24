"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search, TrendingUp, Trophy, Wallet,
  LogOut, Users, Activity, DollarSign,
  ShieldCheck, ShieldOff, Plus, Minus,
  Settings, X, LayoutDashboard, ChevronRight,
  ArrowUpRight, ArrowDownRight, Circle, Zap
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ThemeToggle from "@/components/ThemeToggle";

type Section = "overview" | "markets" | "users" | "settings" | "winners";

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
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    min_bet: "", max_bet: "", commission: "", welcome_points: "",
  });
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => { fetchMarkets(); loadMe(); }, []);

  const filteredMarkets = markets.filter(m =>
    m.question.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.nombre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navItems = [
    { id: "overview", label: "Resumen", icon: <LayoutDashboard size={15} /> },
    { id: "markets", label: "Mercados", icon: <TrendingUp size={15} />, badge: markets.filter(m => !m.resolved).length },
    { id: "users", label: "Usuarios", icon: <Users size={15} />, badge: users.length },
    { id: "winners", label: "Ganadores", icon: <Trophy size={15} /> },
    { id: "settings", label: "Configuración", icon: <Settings size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex" style={{ fontFamily: "'DM Mono', 'Fira Code', monospace" }}>

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-60 bg-white dark:bg-[#111111] border-r border-slate-200 dark:border-white/[0.06] z-50 flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 py-5 border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-500 grid place-items-center text-black font-black text-xs">P</div>
            <div>
              <p className="text-[11px] font-bold text-slate-900 dark:text-white tracking-wider uppercase">Predicciones</p>
              <p className="text-[9px] text-slate-400 dark:text-white/30 tracking-widest uppercase">Admin Console</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-700 dark:text-white/30 dark:hover:text-white">
            <X size={14} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id as Section); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                activeSection === item.id
                  ? "bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5 text-[13px]">
                <span className={activeSection === item.id ? "text-emerald-500 dark:text-emerald-400" : ""}>{item.icon}</span>
                {item.label}
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="text-[10px] bg-slate-100 dark:bg-white/[0.08] text-slate-500 dark:text-white/50 px-1.5 py-0.5 rounded-md tabular-nums">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-200 dark:border-white/[0.06] space-y-1">
          <Link href="/" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition text-[13px]">
            <ArrowUpRight size={15} /> Ir al sitio
          </Link>
          <button
            onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("points"); window.location.href = "/login"; }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-rose-500 dark:text-rose-400/70 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/[0.08] transition text-[13px]"
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-slate-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur border-b border-slate-200 dark:border-white/[0.06] px-4 sm:px-6 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white">
            <LayoutDashboard size={18} />
          </button>

          <div className="flex items-center gap-1.5 text-[12px] text-slate-400 dark:text-white/30">
            <span>Admin</span>
            <ChevronRight size={12} />
            <span className="text-slate-700 dark:text-white/70">{navItems.find(n => n.id === activeSection)?.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-2 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 w-48 sm:w-64">
            <Search size={13} className="text-slate-400 dark:text-white/30 shrink-0" />
            <input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none w-full text-[12px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20"
            />
            {searchQuery && <button onClick={() => setSearchQuery("")}><X size={12} className="text-slate-400 dark:text-white/30" /></button>}
          </div>

          <ThemeToggle />

          <div className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 grid place-items-center shrink-0">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">A</span>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 space-y-6 overflow-auto">

          {/* OVERVIEW */}
          {activeSection === "overview" && (
            <>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Resumen general</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">Métricas en tiempo real</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Usuarios totales", value: stats?.totalUsers ?? "—", sub: `+${stats?.newUsersToday ?? 0} hoy`, icon: <Users size={13} />, color: "text-blue-500 dark:text-blue-400", up: true },
                  { label: "Puntos circulando", value: stats?.totalPoints ?? "—", sub: "suma total", icon: <Wallet size={13} />, color: "text-emerald-500 dark:text-emerald-400", up: true },
                  { label: "Total apostado", value: stats?.totalBetted ?? "—", sub: `${stats?.betsToday ?? 0} hoy`, icon: <DollarSign size={13} />, color: "text-amber-500 dark:text-amber-400", up: true },
                  { label: "Mercados activos", value: stats?.activeMarkets ?? "—", sub: `${stats?.closedMarkets ?? 0} cerrados`, icon: <Activity size={13} />, color: "text-rose-500 dark:text-rose-400", up: false },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 hover:border-slate-300 dark:hover:border-white/[0.12] transition">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`${kpi.color} opacity-70`}>{kpi.icon}</span>
                      {kpi.up ? <ArrowUpRight size={12} className="text-emerald-500/50" /> : <ArrowDownRight size={12} className="text-rose-500/50" />}
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
                    <p className="text-[11px] text-slate-500 dark:text-white/30 mt-1">{kpi.label}</p>
                    <p className="text-[10px] text-slate-400 dark:text-white/20 mt-0.5">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {charts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70">Apuestas / día</p>
                        <p className="text-[10px] text-slate-400 dark:text-white/25 mt-0.5">Últimos 7 días</p>
                      </div>
                      <Zap size={13} className="text-emerald-500/50" />
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={charts} barSize={16}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#94a3b820" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
                        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "11px" }} />
                        <Bar dataKey="apuestas" fill="#10b981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70">Volumen (pts)</p>
                        <p className="text-[10px] text-slate-400 dark:text-white/25 mt-0.5">Últimos 7 días</p>
                      </div>
                      <TrendingUp size={13} className="text-amber-500/50" />
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={charts}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#94a3b820" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
                        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "11px" }} />
                        <Line type="monotone" dataKey="volumen" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70">Ganadores recientes</p>
                  <button onClick={() => setActiveSection("winners")} className="text-[11px] text-slate-400 dark:text-white/25 hover:text-slate-600 dark:hover:text-white/50 transition flex items-center gap-1">
                    Ver todos <ChevronRight size={11} />
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {winners.slice(0, 5).map((w) => (
                    <div key={w.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[12px] text-slate-600 dark:text-white/60 truncate">{w.users?.email}</p>
                        <p className="text-[11px] text-slate-400 dark:text-white/25 truncate mt-0.5">{w.markets?.question}</p>
                      </div>
                      <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums shrink-0">+{w.reward} pts</span>
                    </div>
                  ))}
                  {winners.length === 0 && <p className="px-5 py-8 text-[12px] text-slate-400 dark:text-white/20 text-center">Sin ganadores aún</p>}
                </div>
              </div>
            </>
          )}

          {/* MERCADOS */}
          {activeSection === "markets" && (
            <>
              <div>
                <h1 className="text-lg font-bold">Mercados</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">{markets.filter(m => !m.resolved).length} activos · {markets.filter(m => m.resolved).length} cerrados</p>
              </div>

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4">
                <p className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest mb-3">Nuevo mercado</p>
                <div className="flex gap-2">
                  <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateMarket(); }}
                    placeholder="¿Cuál es la pregunta del mercado?"
                    className="flex-1 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2.5 outline-none text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:border-emerald-500/60 transition" />
                  <button onClick={handleCreateMarket} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg px-5 py-2.5 text-[13px] transition active:scale-95">Crear</button>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] hidden sm:block">
                  <div className="grid grid-cols-12 text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest">
                    <span className="col-span-1">#</span>
                    <span className="col-span-5">Pregunta</span>
                    <span className="col-span-2 text-center">Sí / No</span>
                    <span className="col-span-1 text-center">Total</span>
                    <span className="col-span-3 text-right">Acciones</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                  {filteredMarkets.map((m) => (
                    <div key={m.id} className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                      <div className="hidden sm:grid grid-cols-12 items-center gap-2">
                        <span className="col-span-1 text-[11px] text-slate-300 dark:text-white/20 tabular-nums">{m.id}</span>
                        <div className="col-span-5 flex items-center gap-2 min-w-0">
                          <Circle size={6} className={m.resolved ? "text-slate-300 dark:text-white/20 shrink-0" : "text-emerald-500 dark:text-emerald-400 shrink-0"} fill="currentColor" />
                          <p className="text-[12px] text-slate-600 dark:text-white/70 truncate">{m.question}</p>
                        </div>
                        <div className="col-span-2 flex justify-center gap-1 text-[11px] tabular-nums">
                          <span className="text-emerald-600 dark:text-emerald-400">{m.yes}</span>
                          <span className="text-slate-300 dark:text-white/20">/</span>
                          <span className="text-rose-500 dark:text-rose-400">{m.no}</span>
                        </div>
                        <span className="col-span-1 text-center text-[11px] text-amber-500 dark:text-amber-400 tabular-nums font-bold">{(Number(m.yes) + Number(m.no)).toFixed(1)}</span>
                        <div className="col-span-3 flex justify-end gap-1.5">
                          {m.resolved ? (
                            <span className="text-[10px] text-slate-400 dark:text-white/25 bg-slate-100 dark:bg-white/[0.04] px-2 py-1 rounded-md">Ganó {m.winner === "yes" ? "Sí ✓" : "No ✗"}</span>
                          ) : (
                            <>
                              <button onClick={() => resolveMarket(m.id, "yes")} className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-md transition">Sí gana</button>
                              <button onClick={() => resolveMarket(m.id, "no")} className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 px-2.5 py-1 rounded-md transition">No gana</button>
                              <button onClick={() => handleDeleteMarket(m.id)} className="text-[10px] bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 px-2 py-1 rounded-md transition">✕</button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Mobile */}
                      <div className="sm:hidden space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] text-slate-700 dark:text-white/70 leading-snug flex-1">{m.question}</p>
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md ${m.resolved ? "bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/30" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                            {m.resolved ? "Cerrado" : "En vivo"}
                          </span>
                        </div>
                        <div className="flex gap-3 text-[11px]">
                          <span className="text-emerald-600 dark:text-emerald-400">Sí: {m.yes}</span>
                          <span className="text-rose-500 dark:text-rose-400">No: {m.no}</span>
                          <span className="text-amber-500 dark:text-amber-400 font-bold">Total: {(Number(m.yes) + Number(m.no)).toFixed(1)}</span>
                        </div>
                        {!m.resolved && (
                          <div className="flex gap-1.5">
                            <button onClick={() => resolveMarket(m.id, "yes")} className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[11px] font-bold">Sí gana</button>
                            <button onClick={() => resolveMarket(m.id, "no")} className="flex-1 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-[11px] font-bold">No gana</button>
                            <button onClick={() => handleDeleteMarket(m.id)} className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[11px]">✕</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* USUARIOS */}
          {activeSection === "users" && (
            <>
              <div>
                <h1 className="text-lg font-bold">Usuarios</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">{users.length} registrados</p>
              </div>

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] hidden sm:block">
                  <div className="grid grid-cols-12 text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest">
                    <span className="col-span-3">Email</span>
                    <span className="col-span-2">Nombre</span>
                    <span className="col-span-1 text-center">Pts</span>
                    <span className="col-span-1 text-center">Rol</span>
                    <span className="col-span-1 text-center">Estado</span>
                    <span className="col-span-2 text-center">Ajustar pts</span>
                    <span className="col-span-2 text-right">Acciones</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className={`px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition ${u.suspended ? "opacity-40" : ""}`}>
                      <div className="hidden sm:grid grid-cols-12 items-center gap-2">
                        <p className="col-span-3 text-[12px] text-slate-500 dark:text-white/60 truncate">{u.email}</p>
                        <p className="col-span-2 text-[12px] text-slate-500 dark:text-white/50 truncate">{u.nombre} {u.apellido}</p>
                        <p className="col-span-1 text-center text-[12px] text-amber-500 dark:text-amber-400 font-bold tabular-nums">{u.points}</p>
                        <div className="col-span-1 flex justify-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${u.role === "admin" ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/30"}`}>{u.role}</span>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${u.suspended ? "bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400" : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"}`}>
                            {u.suspended ? "Susp." : "Activo"}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <input type="number" placeholder="0" value={pointsInput[u.id] || ""}
                            onChange={(e) => setPointsInput((prev) => ({ ...prev, [u.id]: e.target.value }))}
                            className="w-14 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-md px-2 py-1 text-[11px] outline-none text-slate-900 dark:text-white text-center" />
                          <button onClick={() => handlePoints(u.id, parseFloat(pointsInput[u.id] || "0"))} className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition"><Plus size={11} /></button>
                          <button onClick={() => handlePoints(u.id, -parseFloat(pointsInput[u.id] || "0"))} className="p-1 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-500/30 transition"><Minus size={11} /></button>
                        </div>
                        <div className="col-span-2 flex justify-end gap-1.5">
                          <button onClick={() => handleChangeRole(u.id, u.role)} className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition"><ShieldCheck size={12} /></button>
                          <button onClick={() => handleSuspend(u.id, !u.suspended)} className={`p-1.5 rounded-md transition ${u.suspended ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400"}`}><ShieldOff size={12} /></button>
                        </div>
                      </div>
                      {/* Mobile */}
                      <div className="sm:hidden space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[12px] text-slate-700 dark:text-white/70 font-medium truncate">{u.nombre} {u.apellido}</p>
                            <p className="text-[11px] text-slate-400 dark:text-white/30 truncate">{u.email}</p>
                          </div>
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md ${u.suspended ? "bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400" : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"}`}>
                            {u.suspended ? "Susp." : "Activo"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500 dark:text-amber-400 font-bold text-[12px]">{u.points} pts</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${u.role === "admin" ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/30"}`}>{u.role}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="number" placeholder="pts" value={pointsInput[u.id] || ""}
                            onChange={(e) => setPointsInput((prev) => ({ ...prev, [u.id]: e.target.value }))}
                            className="w-16 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-md px-2 py-1.5 text-[11px] outline-none text-slate-900 dark:text-white text-center" />
                          <button onClick={() => handlePoints(u.id, parseFloat(pointsInput[u.id] || "0"))} className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"><Plus size={12} /></button>
                          <button onClick={() => handlePoints(u.id, -parseFloat(pointsInput[u.id] || "0"))} className="p-1.5 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400"><Minus size={12} /></button>
                          <div className="ml-auto flex gap-1.5">
                            <button onClick={() => handleChangeRole(u.id, u.role)} className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400"><ShieldCheck size={13} /></button>
                            <button onClick={() => handleSuspend(u.id, !u.suspended)} className={`p-1.5 rounded-md ${u.suspended ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400"}`}><ShieldOff size={13} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* GANADORES */}
          {activeSection === "winners" && (
            <>
              <div>
                <h1 className="text-lg font-bold">Ganadores</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">{winners.length} registros</p>
              </div>
              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] hidden sm:block">
                  <div className="grid grid-cols-12 text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest">
                    <span className="col-span-3">Usuario</span>
                    <span className="col-span-5">Mercado</span>
                    <span className="col-span-1 text-center">Pred.</span>
                    <span className="col-span-2 text-right">Premio</span>
                    <span className="col-span-1 text-right">Fecha</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                  {winners.map((w) => (
                    <div key={w.id} className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                      <div className="hidden sm:grid grid-cols-12 items-center gap-2">
                        <p className="col-span-3 text-[12px] text-slate-500 dark:text-white/50 truncate">{w.users?.email}</p>
                        <p className="col-span-5 text-[12px] text-slate-600 dark:text-white/60 truncate">{w.markets?.question}</p>
                        <div className="col-span-1 flex justify-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${w.prediction === "yes" ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400"}`}>
                            {w.prediction === "yes" ? "Sí" : "No"}
                          </span>
                        </div>
                        <p className="col-span-2 text-right text-[12px] text-amber-500 dark:text-amber-400 font-bold tabular-nums">+{w.reward} pts</p>
                        <p className="col-span-1 text-right text-[10px] text-slate-400 dark:text-white/20">{new Date(w.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="sm:hidden space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12px] text-slate-500 dark:text-white/50 truncate">{w.users?.email}</p>
                          <span className="text-[12px] text-amber-500 dark:text-amber-400 font-bold shrink-0">+{w.reward} pts</span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-white/30 truncate">{w.markets?.question}</p>
                      </div>
                    </div>
                  ))}
                  {winners.length === 0 && <p className="px-5 py-10 text-[12px] text-slate-400 dark:text-white/20 text-center">Sin ganadores registrados</p>}
                </div>
              </div>
            </>
          )}

          {/* CONFIGURACIÓN */}
          {activeSection === "settings" && config && (
            <>
              <div>
                <h1 className="text-lg font-bold">Configuración</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                  {config.updated_at ? `Actualizado ${new Date(config.updated_at).toLocaleString()}` : "Parámetros de la plataforma"}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Apuesta mín.", value: `${config.min_bet} pts`, color: "text-amber-500 dark:text-amber-400" },
                  { label: "Apuesta máx.", value: `${config.max_bet} pts`, color: "text-amber-500 dark:text-amber-400" },
                  { label: "Comisión", value: `${config.commission}%`, color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Pts bienvenida", value: `${config.welcome_points}`, color: "text-blue-500 dark:text-blue-400" },
                ].map((item) => (
                  <div key={item.label} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 text-center">
                    <p className="text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest mb-2">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color} tabular-nums`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "min_bet", label: "Apuesta mínima (pts)", step: "0.01" },
                  { key: "max_bet", label: "Apuesta máxima (pts)", step: "0.01" },
                  { key: "commission", label: "Comisión (%)", step: "0.1" },
                  { key: "welcome_points", label: "Puntos de bienvenida", step: "1" },
                ].map((field) => (
                  <div key={field.key} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 space-y-2">
                    <label className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest block">{field.label}</label>
                    <input type="number" step={field.step}
                      value={(settingsForm as any)[field.key]}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2.5 outline-none text-[14px] text-slate-900 dark:text-white focus:border-emerald-500/60 transition tabular-nums" />
                  </div>
                ))}
              </div>

              // Dentro del formulario de settings del admin
<div className="border-t border-slate-200 dark:border-slate-800 pt-6 mt-6">
  <h3 className="font-bold text-base mb-4">Configuración de carruseles</h3>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div>
      <label className="text-sm text-slate-400 mb-1 block">Cards tendencias</label>
      <input type="number" min="1" max="5"
        value={settings.trending_count ?? 1}
        onChange={(e) => setSettings({ ...settings, trending_count: Number(e.target.value) })}
        className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none"
      />
    </div>
    <div>
      <label className="text-sm text-slate-400 mb-1 block">Cards ganadores</label>
      <input type="number" min="1" max="5"
        value={settings.winners_count ?? 1}
        onChange={(e) => setSettings({ ...settings, winners_count: Number(e.target.value) })}
        className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none"
      />
    </div>
    <div>
      <label className="text-sm text-slate-400 mb-1 block">Autoplay (ms)</label>
      <input type="number" min="1000" step="500"
        value={settings.autoplay_ms ?? 5000}
        onChange={(e) => setSettings({ ...settings, autoplay_ms: Number(e.target.value) })}
        className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none"
      />
    </div>
  </div>
 </div>

              <button onClick={handleSaveSettings} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl py-3 text-[13px] transition active:scale-[0.99]">
                Guardar configuración
              </button>
            </>
          )}

        </main>
      </div>
    </div>
  );
}