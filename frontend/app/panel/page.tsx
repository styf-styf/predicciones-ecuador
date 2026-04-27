"use client";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet, Trophy, BarChart3, ArrowUpRight, Shield
} from "lucide-react";
import Header from "@/components/Header";

export default function PanelPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  
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

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(betsChannel);
    };
  }, []);

  // =======================
  // 🎨 RENDER
  // =======================
  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-2">
              <div className="h-7 w-40 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const totalBet = bets.reduce((acc, bet) => acc + Number(bet.amount), 0);
  const totalBets = bets.length;
  const userRankIndex = ranking.findIndex((r) => r.email === user?.email);

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">

      {/* ===== HEADER ===== */}
      <Header />

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