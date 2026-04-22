"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell, Search, TrendingUp, Trophy, Wallet,
  LogOut, LogIn, Users, Activity, DollarSign,
  BarChart2, ShieldCheck, ShieldOff, Plus, Minus
} from "lucide-react";

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

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/users", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setUsers(data);
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
      setIsLogged(true);
      setIsAdmin(true);
      setPoints(data.points || 0);
      fetchWinners();
      fetchStats();
      fetchUsers();
      fetchConfig();
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
    fetchMarkets();
    fetchWinners();
    fetchStats();
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
    if (res.ok) fetchUsers();
    else alert(data.message);
  };

  const handlePoints = async (userId: string, amount: number) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/users/${userId}/points`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ points: amount }),
    });
    const data = await res.json();
    if (res.ok) {
      fetchUsers();
      fetchStats();
      setPointsInput((prev) => ({ ...prev, [userId]: "" }));
    } else {
      alert(data.message);
    }
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
    if (res.ok) fetchUsers();
    else alert(data.message);
  };

  const [config, setConfig] = useState<any>(null);
const [settingsForm, setSettingsForm] = useState({
  min_bet: "",
  max_bet: "",
  commission: "",
  welcome_points: "",
});

const fetchSettings = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch("https://predicciones-ecuador.onrender.com/admin/settings", {
    headers: { authorization: `Bearer ${token}` || "" },
  });
  const data = await res.json();
  if (res.ok) {
    setConfig(data); // ✅
    setSettingsForm({
      min_bet: data.min_bet,
      max_bet: data.max_bet,
      commission: data.commission,
      welcome_points: data.welcome_points,
    });
  }
};

const handleSaveSettings = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch("https://predicciones-ecuador.onrender.com/admin/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}` || "",
    },
    body: JSON.stringify({
      min_bet: parseFloat(settingsForm.min_bet),
      max_bet: parseFloat(settingsForm.max_bet),
      commission: parseFloat(settingsForm.commission),
      welcome_points: parseFloat(settingsForm.welcome_points),
    }),
  });
  const data = await res.json();
  if (res.ok) {
    alert("✅ Configuración guardada");
    fetchSettings();
  } else {
    alert(data.message || "Error al guardar");
  }
};

  // =======================
  // 🔁 EFECTO
  // =======================
  useEffect(() => {
    fetchMarkets();
    loadMe();
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
              <Link href="/admin" className="px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-semibold">
                Admin
              </Link>
            )}
            <Link href="/" className="px-4 py-2 rounded-2xl bg-slate-800 font-medium">Inicio</Link>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500 grid place-items-center font-bold text-slate-950">P</div>
            <div>
              <h1 className="text-xl font-bold">Admin • Predicciones Ecuador</h1>
              <p className="text-xs text-slate-400">Centro de control y administración</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-2xl w-96">
            <Search size={18} className="text-slate-400" />
            <input placeholder="Buscar..." className="bg-transparent outline-none w-full text-sm" />
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl bg-slate-900"><Bell size={18} /></button>
            {isLogged ? (
              <button
                onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("points"); window.location.href = "/login"; }}
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

        {/* 📊 Cards */}
        <section className="grid md:grid-cols-4 gap-4">
          <Card title="Mi Balance" value={`${points ?? 0} pts`} icon={<Wallet size={18} />} />
          <Card title="Mercados" value={`${markets.length}`} icon={<TrendingUp size={18} />} />
          <Card title="Ganadores" value={`${winners.length}`} icon={<Trophy size={18} />} />
          <Card title="Usuarios" value={`${users.length}`} icon={<Users size={18} />} />
        </section>

        {/* 📈 ESTADÍSTICAS */}
        {stats && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-6">
              <BarChart2 size={20} className="text-emerald-400" />
              <h2 className="text-xl font-bold">Estadísticas generales</h2>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <StatCard title="Total usuarios" value={stats.totalUsers} sub={`+${stats.newUsersToday} hoy`} icon={<Users size={18} />} color="text-blue-400" />
              <StatCard title="Puntos en circulación" value={`${stats.totalPoints} pts`} sub="suma de todos los balances" icon={<Wallet size={18} />} color="text-emerald-400" />
              <StatCard title="Total apostado" value={`${stats.totalBetted} pts`} sub={`${stats.betsToday} apuestas hoy`} icon={<DollarSign size={18} />} color="text-amber-400" />
              <StatCard title="Mercados" value={`${stats.activeMarkets} activos`} sub={`${stats.closedMarkets} cerrados`} icon={<Activity size={18} />} color="text-rose-400" />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Mercados activos</span>
                <span>Mercados cerrados</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${((stats.activeMarkets ?? 0) / ((stats.activeMarkets ?? 0) + (stats.closedMarkets ?? 1))) * 100}%` }}
                />
                <div className="bg-slate-600 flex-1" />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-emerald-400">{stats.activeMarkets} activos</span>
                <span className="text-slate-400">{stats.closedMarkets} cerrados</span>
              </div>
            </div>
          </section>
        )}

        {/* ======================= */}
{/* ⚙️ CONFIGURACIÓN */}
{/* ======================= */}
{config && (
  <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
    <div className="flex items-center gap-2 mb-6">
      <Settings size={20} className="text-slate-400" />
      <h2 className="text-xl font-bold">Configuración de la plataforma</h2>
      {config.updated_at && (
        <span className="ml-auto text-xs text-slate-500">
          Última actualización: {new Date(config.updated_at).toLocaleString()}
        </span>
      )}
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      {/* Apuestas */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
        <h3 className="font-semibold text-sm text-slate-300 flex items-center gap-2">
          <DollarSign size={16} className="text-amber-400" />
          Límites de apuesta
        </h3>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Apuesta mínima (pts)</label>
          <input
            type="number"
            step="0.01"
            value={settingsForm.min_bet}
            onChange={(e) => setSettingsForm((prev) => ({ ...prev, min_bet: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 outline-none text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Apuesta máxima (pts)</label>
          <input
            type="number"
            step="0.01"
            value={settingsForm.max_bet}
            onChange={(e) => setSettingsForm((prev) => ({ ...prev, max_bet: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 outline-none text-sm"
          />
        </div>
      </div>

      {/* Comisión y puntos */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
        <h3 className="font-semibold text-sm text-slate-300 flex items-center gap-2">
          <Activity size={16} className="text-emerald-400" />
          Parámetros generales
        </h3>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Comisión plataforma (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={settingsForm.commission}
            onChange={(e) => setSettingsForm((prev) => ({ ...prev, commission: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 outline-none text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Puntos de bienvenida</label>
          <input
            type="number"
            step="1"
            min="0"
            value={settingsForm.welcome_points}
            onChange={(e) => setSettingsForm((prev) => ({ ...prev, welcome_points: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 outline-none text-sm"
          />
        </div>
      </div>
    </div>

    {/* Resumen actual */}
    <div className="mt-4 grid md:grid-cols-4 gap-3">
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
        <p className="text-xs text-slate-400">Apuesta mín.</p>
        <p className="text-lg font-bold text-amber-400">{config.min_bet} pts</p>
      </div>
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
        <p className="text-xs text-slate-400">Apuesta máx.</p>
        <p className="text-lg font-bold text-amber-400">{config.max_bet} pts</p>
      </div>
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
        <p className="text-xs text-slate-400">Comisión</p>
        <p className="text-lg font-bold text-emerald-400">{config.commission}%</p>
      </div>
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
        <p className="text-xs text-slate-400">Puntos bienvenida</p>
        <p className="text-lg font-bold text-blue-400">{config.welcome_points} pts</p>
      </div>
    </div>

    <button
      onClick={handleSaveSettings}
      className="mt-4 w-full bg-emerald-500 text-slate-950 font-bold rounded-xl py-3"
    >
      Guardar configuración
    </button>
  </section>
 )}

        {/* 👥 GESTIÓN DE USUARIOS */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-6">
            <Users size={20} className="text-blue-400" />
            <h2 className="text-xl font-bold">Gestión de usuarios</h2>
            <span className="ml-auto text-xs text-slate-400">{users.length} usuarios registrados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 border-b border-slate-800">
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
                  <tr key={u.id} className={`border-b border-slate-900 ${u.suspended ? "opacity-50" : ""}`}>
                    <td className="py-3 text-xs">{u.email}</td>
                    <td className="py-3 text-xs">{u.nombre} {u.apellido}</td>
                    <td className="py-3 text-amber-400 font-bold">{u.points}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-300"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.provider === "google" ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-300"}`}>
                        {u.provider}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.suspended ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                        {u.suspended ? "Suspendido" : "Activo"}
                      </span>
                    </td>

                    {/* ± Puntos */}
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="0"
                          value={pointsInput[u.id] || ""}
                          onChange={(e) => setPointsInput((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          className="w-16 bg-slate-800 rounded-lg px-2 py-1 text-xs outline-none"
                        />
                        <button
                          onClick={() => handlePoints(u.id, parseFloat(pointsInput[u.id] || "0"))}
                          className="p-1 rounded-lg bg-emerald-500 text-slate-950"
                          title="Dar puntos"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => handlePoints(u.id, -parseFloat(pointsInput[u.id] || "0"))}
                          className="p-1 rounded-lg bg-rose-500 text-white"
                          title="Quitar puntos"
                        >
                          <Minus size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleChangeRole(u.id, u.role)}
                          className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 transition"
                          title={u.role === "admin" ? "Quitar admin" : "Hacer admin"}
                        >
                          <ShieldCheck size={14} />
                        </button>
                        <button
                          onClick={() => handleSuspend(u.id, !u.suspended)}
                          className={`p-1.5 rounded-lg transition ${u.suspended ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40" : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/40"}`}
                          title={u.suspended ? "Activar" : "Suspender"}
                        >
                          <ShieldOff size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 👑 GESTIÓN DE MERCADOS */}
        {isAdmin && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold">Gestión de mercados</h2>
                <p className="text-sm text-slate-400">Crear y gestionar mercados</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-400">Administrador</span>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Nueva pregunta de mercado..."
                className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none"
              />
              <button onClick={handleCreateMarket} className="bg-emerald-500 text-slate-950 font-bold rounded-xl px-4 py-3">
                Crear mercado
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
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
          </section>
        )}

        {/* 📊 VISTA PREVIA MERCADOS */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Vista previa de mercados</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {markets.map((market) => {
              const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
              const yesPct = ((market.yes / total) * 100).toFixed(0);
              const noPct = ((market.no / total) * 100).toFixed(0);
              return (
                <div key={market.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-base">{market.question}</h3>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${market.resolved ? "bg-slate-700 text-white" : "bg-emerald-500/10 text-emerald-400"}`}>
                      {market.resolved ? "Cerrado" : "En vivo"}
                    </span>
                  </div>
                  <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500" style={{ width: `${yesPct}%` }} />
                    <div className="bg-rose-500" style={{ width: `${noPct}%` }} />
                  </div>
                  <p className="text-xs mt-2 text-slate-400">Sí {yesPct}% • No {noPct}% • {total} pts</p>
                  <div className="mt-4">
                    {market.resolved ? (
                      <div className="text-center text-sm px-3 py-2 rounded-xl bg-slate-800 text-white">
                        Ganó {market.winner === "yes" ? "Sí" : "No"}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => resolveMarket(market.id, "yes")} className="bg-emerald-500 text-slate-950 font-bold rounded-xl py-2 text-sm">Ganó Sí</button>
                        <button onClick={() => resolveMarket(market.id, "no")} className="bg-blue-500 text-white font-bold rounded-xl py-2 text-sm">Ganó No</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 🏆 HISTORIAL GANADORES */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-2xl font-bold mb-4">Historial de Ganadores</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 border-b border-slate-800">
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

function StatCard({ title, value, sub, icon, color }: any) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
      <div className={`flex items-center gap-2 ${color} mb-2`}>
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}