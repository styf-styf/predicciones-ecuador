"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Search, TrendingUp, Trophy, Wallet, LogOut, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [winners, setWinners] = useState<any[]>([]);

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

  const loadMe = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const res = await fetch("https://predicciones-ecuador.onrender.com/me", {
        headers: { authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();

      if (data.role !== "admin") {
        window.location.href = "/";
        return;
      }

      setIsLogged(true);
      setIsAdmin(true);
      setPoints(data.points || 0);
      fetchWinners();
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
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}` || "",
      },
      body: JSON.stringify({ question: newQuestion }),
    });

    const data = await res.json();
    if (res.ok) {
      setNewQuestion("");
      fetchMarkets();
      fetchWinners();
    } else {
      alert(data.message || "Error al crear mercado");
    }
  };

  const handleDeleteMarket = async (id: any) => {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `https://predicciones-ecuador.onrender.com/admin/markets/${id}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` || "" },
      }
    );
    const data = await res.json();
    if (res.ok) {
      fetchMarkets();
      fetchWinners();
    } else {
      alert(data.message || "Error al eliminar");
    }
  };

  const resolveMarket = async (id: number, winner: "yes" | "no") => {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `https://predicciones-ecuador.onrender.com/admin/resolve/${id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}` || "",
        },
        body: JSON.stringify({ winner }),
      }
    );

    const data = await res.json();
    alert(data.message);
    fetchMarkets();
    fetchWinners();
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
              <Link
                href="/admin"
                className="px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-semibold"
              >
                Admin
              </Link>
            )}
            <Link href="/" className="px-4 py-2 rounded-2xl bg-slate-800 font-medium">
              Inicio
            </Link>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500 grid place-items-center font-bold text-slate-950">
              P
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin • Predicciones Ecuador</h1>
              <p className="text-xs text-slate-400">Centro de control y administración</p>
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
            <button className="p-2 rounded-xl bg-slate-900">
              <Bell size={18} />
            </button>
            {isLogged ? (
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("role");
                  localStorage.removeItem("points");
                  window.location.href = "/login";
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
        <section className="grid md:grid-cols-4 gap-4">
          <Card title="Balance" value={`${points ?? 0} pts`} icon={<Wallet size={18} />} />
          <Card title="Mercados" value={`${markets.length}`} icon={<TrendingUp size={18} />} />
          <Card title="Ganadores" value={`${winners.length}`} icon={<Trophy size={18} />} />
          <Card title="Estado" value={isLogged ? "Online" : "Invitado"} icon={<Bell size={18} />} />
        </section>

        {/* ======================= */}
        {/* 👑 GESTIÓN ADMIN */}
        {/* ======================= */}
        {isAdmin && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold">Gestión Administrativa</h2>
                <p className="text-sm text-slate-400">Crear y gestionar mercados</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-400">
                Administrador
              </span>
            </div>

            {/* Crear mercado */}
            <div className="grid md:grid-cols-3 gap-3">
              <input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Nueva pregunta de mercado..."
                className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none"
              />
              <button
                onClick={handleCreateMarket}
                className="bg-emerald-500 text-slate-950 font-bold rounded-xl px-4 py-3"
              >
                Crear mercado
              </button>
            </div>

            {/* Tabla de mercados */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Pregunta</th>
                    <th className="text-left py-2">Sí</th>
                    <th className="text-left py-2">No</th>
                    <th className="text-left py-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((m) => (
                    <tr key={m.id} className="border-b border-slate-900">
                      <td className="py-2">{m.id}</td>
                      <td className="py-2">{m.question}</td>
                      <td className="py-2">{m.yes}</td>
                      <td className="py-2">{m.no}</td>
                      <td className="py-2">
                        {m.resolved ? (
                          <div className="text-xs rounded-xl bg-slate-800 px-3 py-2 inline-block">
                            <p className="font-bold text-white">Mercado cerrado</p>
                            <p className="text-slate-300 mt-1">
                              Ganó:{" "}
                              <span className="text-emerald-400 font-bold">
                                {m.winner === "yes" ? "Sí" : "No"}
                              </span>
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleDeleteMarket(m.id)}
                              className="px-3 py-1 rounded-lg bg-rose-500 text-white text-xs"
                            >
                              Eliminar
                            </button>
                            <button
                              onClick={() => resolveMarket(m.id, "yes")}
                              className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold"
                            >
                              Ganó Sí
                            </button>
                            <button
                              onClick={() => resolveMarket(m.id, "no")}
                              className="px-3 py-1 rounded-lg bg-blue-500 text-white text-xs font-bold"
                            >
                              Ganó No
                            </button>
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

        {/* ======================= */}
        {/* 📊 VISTA PREVIA MERCADOS */}
        {/* ======================= */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Vista previa de mercados</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {markets.map((market) => {
              const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
              const yesPct = ((market.yes / total) * 100).toFixed(0);
              const noPct = ((market.no / total) * 100).toFixed(0);

              return (
                <div
                  key={market.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Mercado #{market.id}</p>
                      <h3 className="font-semibold text-lg mt-1">{market.question}</h3>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full ${
                        market.resolved
                          ? "bg-slate-700 text-white"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {market.resolved ? "Cerrado" : "En vivo"}
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
                    {market.resolved ? (
                      <div className="text-center text-sm px-3 py-2 rounded-xl bg-slate-800 text-white">
                        Ganó {market.winner === "yes" ? "Sí" : "No"}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => resolveMarket(market.id, "yes")}
                          className="bg-emerald-500 text-slate-950 font-bold rounded-xl py-2 text-sm"
                        >
                          Ganó Sí
                        </button>
                        <button
                          onClick={() => resolveMarket(market.id, "no")}
                          className="bg-blue-500 text-white font-bold rounded-xl py-2 text-sm"
                        >
                          Ganó No
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ======================= */}
        {/* 🏆 HISTORIAL GANADORES */}
        {/* ======================= */}
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
                    <td className="py-2 text-slate-400">
                      {new Date(w.created_at).toLocaleString()}
                    </td>
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