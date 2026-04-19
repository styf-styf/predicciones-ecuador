"use client";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Wallet,
  Trophy,
  BarChart3,
  ArrowUpRight,
  Shield,
} from "lucide-react";

export default function PanelPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  loadPanel();

  const token = localStorage.getItem("token");
  if (!token || token === "google-login") return;
  const payload = JSON.parse(atob(token.split(".")[1]));
  const userId = payload.id;

  const usersChannel = supabase
    .channel("panel-users")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "users",
        filter: `id=eq.${userId}`,
      },
      () => loadPanel()
    )
    .subscribe();

  const betsChannel = supabase
    .channel("panel-bets")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bets",
        filter: `user_id=eq.${userId}`,
      },
      () => loadPanel()
    )
    .subscribe();

  const rankingChannel = supabase
    .channel("panel-ranking")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "users",
      },
      () => loadPanel()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(usersChannel);
    supabase.removeChannel(betsChannel);
    supabase.removeChannel(rankingChannel);
  };
 }, []);

  const loadPanel = async () => {
  const token = localStorage.getItem("token");

  try {
    // LOGIN NORMAL
    if (token && token !== "google-login") {
      const headers = { authorization: token };

      const [meRes, betsRes, rankRes] = await Promise.all([
        fetch("https://predicciones-ecuador.onrender.com/me", { headers }),
        fetch("https://predicciones-ecuador.onrender.com/my-bets", { headers }),
        fetch("https://predicciones-ecuador.onrender.com/ranking"),
      ]);

      const meData = await meRes.json();
      const betsData = await betsRes.json();
      const rankData = await rankRes.json();

      setUser(meData);
      setBets(betsData || []);
      setRanking(rankData || []);
      setLoading(false);
      return;
    }

    // LOGIN GOOGLE
    const { data } = await supabase.auth.getSession();

    if (data.session) {
      const email = data.session.user.email;

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      const { data: betsData } = await supabase
        .from("bets")
        .select("*, markets(question)")
        .eq("user_id", userData.id);

      const rankRes = await fetch("https://predicciones-ecuador.onrender.com/ranking");
      const rankData = await rankRes.json();

      setUser(userData);
      setBets(betsData || []);
      setRanking(rankData || []);
      setLoading(false);
      return;
    }

    router.push("/login");
  } catch (error) {
    console.error(error);
    setLoading(false);
  }
 };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white grid place-items-center">
        <p className="text-xl animate-pulse">Cargando panel...</p>
      </main>
    );
  }

  const totalBet = bets.reduce((acc, bet) => acc + bet.amount, 0);
  const totalBets = bets.length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500 text-slate-950 font-bold text-2xl grid place-items-center">
              {user.email?.charAt(0).toUpperCase()}
            </div>

            <div>
              <h1 className="text-3xl font-bold">Mi Panel</h1>
              <p className="text-slate-400">{user.email}</p>
            </div>
          </div>

          <Link
            href="/"
            className="bg-emerald-500 text-slate-950 px-5 py-3 rounded-2xl font-bold"
          >
            Volver al inicio
          </Link>
        </div>

        {/* Cards */}
        <section className="grid md:grid-cols-4 gap-4">
          <Card
            title="Puntos"
            value={user.points}
            icon={<Wallet size={18} />}
          />
          <Card
            title="Rol"
            value={user.role}
            icon={<Shield size={18} />}
          />
          <Card
            title="Apuestas"
            value={totalBets}
            icon={<BarChart3 size={18} />}
          />
          <Card
            title="Total Apostado"
            value={`${totalBet} pts`}
            icon={<ArrowUpRight size={18} />}
          />
        </section>

        {/* Main Grid */}
        <section className="grid lg:grid-cols-3 gap-6">

          {/* Historial */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-xl font-bold mb-4">Historial de Apuestas</h2>

            {bets.length === 0 ? (
              <p className="text-slate-400">Aún no tienes apuestas.</p>
            ) : (
              <div className="space-y-3">
                {bets.map((bet) => (
                  <div
                    key={bet.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4"
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="font-semibold">
                          {bet.markets?.question}
                        </p>
                        <p className="text-sm text-slate-400">
                          {bet.type === "yes" ? "Sí" : "No"} · {bet.amount} pts
                        </p>
                      </div>

                      <span className="text-xs text-slate-500">
                        {new Date(bet.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ranking */}
          <div className="space-y-4">

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-xl font-bold mb-4">Ranking Global</h2>

              <div className="space-y-3">
                {ranking.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between bg-slate-950 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">
                        #{index + 1}
                      </span>
                      <span className="text-sm truncate max-w-[140px]">
                        {item.email}
                      </span>
                    </div>

                    <span className="font-semibold">
                      {item.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-xl font-bold mb-3">Perfil</h2>

              <ul className="space-y-2 text-sm text-slate-300">
                <li>Email: {user.email}</li>
                <li>Rol: {user.role}</li>
                <li>Puntos: {user.points}</li>
                <li>Estado: Activo</li>
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex justify-between items-center text-slate-400 text-sm">
        <span>{title}</span>
        {icon}
      </div>

      <p className="text-2xl font-bold mt-3">{value}</p>
    </div>
  );
}