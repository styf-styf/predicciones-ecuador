"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, MessageCircle, Send, Newspaper, Users, Clock, BarChart2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";


export default function MarketPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [market, setMarket] = useState<any>(null);
  const [betType, setBetType] = useState<"yes" | "no">(
    (searchParams.get("bet") as "yes" | "no") || "yes");
  const [amount, setAmount] = useState("");
  const [points, setPoints] = useState<number | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [news, setNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bettingLoading, setBettingLoading] = useState(false);
  const [betSuccess, setBetSuccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userBet, setUserBet] = useState<{ type: "yes" | "no"; amount: number } | null>(null);
  const [changeCount, setChangeCount] = useState(0);
  const MAX_CHANGES = 3;
  const [betConfig, setBetConfig] = useState({ min_bet: 1 });
  const [history, setHistory] = useState<any[]>([]);
  const [uniqueBettors, setUniqueBettors] = useState(0);
  const [topHolders, setTopHolders] = useState<any[]>([]);
  const [allMarkets, setAllMarkets] = useState<any[]>([]);
  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  const fetchMarket = async () => {
    const res = await fetch(`https://predicciones-ecuador.onrender.com/markets`);
    const data = await res.json();
    const found = data.find((m: any) => m.id === Number(id));
    setMarket(found || null);
  };

  const fetchMe = async () => {
    if (!token) return;
    const res = await fetch("https://predicciones-ecuador.onrender.com/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.ok) { const d = await res.json(); setPoints(d.points); }
  };

  const fetchComments = async () => {
    const res = await fetch(`https://predicciones-ecuador.onrender.com/markets/${id}/comments`);
    if (res.ok) setComments(await res.json());
  };

  const fetchNews = async () => {
    setLoadingNews(true);
    const res = await fetch(`https://predicciones-ecuador.onrender.com/markets/${id}/news`);
    if (res.ok) setNews(await res.json());
    setLoadingNews(false);
  };
  
  const fetchHistory = async () => {
  const { data } = await supabase
    .from("market_history")
    .select("yes_pct, no_pct, total, created_at")
    .eq("market_id", Number(id))
    .order("created_at", { ascending: true })
    .limit(50);
  setHistory(data || []);
};

const fetchTopHolders = async () => {
  const { data } = await supabase
    .from("bets")
    .select("amount, type, users(nombre, email)")
    .eq("market_id", Number(id))
    .order("amount", { ascending: false })
    .limit(5);
  setTopHolders(data || []);
};
const fetchUniqueBettors = async () => {
  const { count } = await supabase
    .from("bets")
    .select("*", { count: "exact", head: true })
    .eq("market_id", Number(id));
  setUniqueBettors(count || 0);
};

  const fetchBetConfig = async () => {
  const res = await fetch("https://predicciones-ecuador.onrender.com/config");
  if (res.ok) {
    const data = await res.json();
    setBetConfig({ min_bet: data.min_bet ?? 1 });
  }
 };

  const fetchUserBet = async () => {
  if (!token) return;
  const res = await fetch(`https://predicciones-ecuador.onrender.com/markets/${id}/my-bet`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    const data = await res.json();
    if (data.bet) {
      setUserBet({ type: data.bet.type, amount: data.bet.amount });
      setChangeCount(data.bet.changes ?? 0);
    }
  }
 };

  useEffect(() => {
  if (id) {
    fetchMarket();
    fetchComments();
    fetchNews();
    fetchBetConfig();
    fetchHistory();
    fetchUniqueBettors();
    fetchTopHolders();
    fetch("https://predicciones-ecuador.onrender.com/markets")
      .then((r) => r.json())
      .then((data) => setAllMarkets(data));
  }
 }, [id]);

  useEffect(() => {
    if (token) {
        fetchMe();
        fetchUserBet();
    }
 }, [token]);

 const handleBet = async () => {
  if (!token) { setShowLoginPrompt(true); return; }
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt < betConfig.min_bet)
  return alert(`El monto mínimo es ${betConfig.min_bet} punto`);
  if (points !== null && amt > points)
  return alert("No tienes suficientes puntos");
  setBettingLoading(true);
  const res = await fetch("https://predicciones-ecuador.onrender.com/bet", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ marketId: Number(id), type: betType, amount: amt }),
  });
  const data = await res.json();
  setBettingLoading(false);
  if (data.points !== undefined) {
    setPoints(data.points);
    setAmount("");
    setUserBet({ type: betType, amount: amt });
    setChangeCount((prev) => prev + (userBet ? 1 : 0));
    setBetSuccess(true);
    setTimeout(() => setBetSuccess(false), 3000);
    fetchMarket();
    fetchHistory();
  } else {
    alert(data.message);
  }
 };

  const handleComment = async () => {
  if (!token) {
    setShowLoginPrompt(true);
    return;
  }
  setShowLoginPrompt(false);
  if (!newComment.trim()) return;
  setSubmitting(true);
  const res = await fetch(`https://predicciones-ecuador.onrender.com/markets/${id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ content: newComment }),
  });
  const data = await res.json();
  if (res.ok) { setNewComment(""); fetchComments(); }
  else alert(data.message);
  setSubmitting(false);
 };

  if (!market) return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Back */}
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />

        {/* Header mercado */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-6 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse shrink-0" />
          </div>
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          <div className="flex justify-between">
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Apostar */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          </div>
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>

        
      

        {/* Noticias */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Comentarios */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
  const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
  const yesPct = ((market.yes / total) * 100).toFixed(0);
  const noPct = ((market.no / total) * 100).toFixed(0);
  const relatedMarkets = allMarkets.filter(
    (m) => m.category === market.category && m.id !== market.id && !m.resolved
  ).slice(0, 4);

 return (
  <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
    <Header />
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">

      {/* ===== MÓVIL ONLY ===== */}
      <div className="lg:hidden space-y-4">

        {/* 1. Pregunta */}
        <div className="bg-white dark:bg-slate-900 p-5">
          {market.category && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block">{market.category}</span>
          )}
          <h1 className="text-[14px] font-bold leading-snug">{market.question}</h1>
        </div>

        {/* 2. Panel de apuesta */}
        {!market.resolved && (
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" /> Realizar apuesta
            </h2>
            {!token && (
              <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
                <p className="text-sm text-slate-700 dark:text-slate-200">Inicia sesión para apostar</p>
                <Link href="/login" className="shrink-0 bg-emerald-500 text-slate-950 font-bold text-sm px-4 py-2 rounded-xl">Iniciar sesión</Link>
              </div>
            )}
            {betSuccess && (
              <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-sm font-semibold text-emerald-500 flex items-center justify-center gap-2">
                ✅ ¡Apuesta registrada exitosamente!
              </div>
            )}
            {points !== null && <p className="text-sm text-slate-400 mb-4">Tu balance: <span className="text-slate-900 dark:text-white font-bold">{points} $</span></p>}
            {userBet ? (
              <div className="space-y-4">
                <div className={`rounded-xl p-4 text-center border ${userBet.type === "yes" ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"}`}>
                  <p className="text-sm text-slate-400 mb-1">Tu predicción actual</p>
                  <p className={`text-2xl font-black ${userBet.type === "yes" ? "text-emerald-400" : "text-rose-400"}`}>{userBet.type === "yes" ? "✅ Sí" : "❌ No"}</p>
                  <p className="text-sm text-slate-400 mt-1">{userBet.amount} $ apostados</p>
                </div>
                {changeCount < MAX_CHANGES ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 text-center">Cambios restantes: <span className="font-bold text-white">{MAX_CHANGES - changeCount}</span> de {MAX_CHANGES}</p>
                    <div className="flex gap-6">
                      <button onClick={() => setBetType("yes")} className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${betType === "yes" ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-600"}`}>{betType === "yes" && <div className="w-2 h-2 rounded-full bg-white" />}</div>
                        <span className={`text-sm font-medium ${betType === "yes" ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"}`}>Sí — {yesPct}%</span>
                      </button>
                      <button onClick={() => setBetType("no")} className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${betType === "no" ? "border-rose-500 bg-rose-500" : "border-slate-300 dark:border-slate-600"}`}>{betType === "no" && <div className="w-2 h-2 rounded-full bg-white" />}</div>
                        <span className={`text-sm font-medium ${betType === "no" ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}`}>No — {noPct}%</span>
                      </button>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Monto</span>
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{amount ? `${amount} $` : "0 $"}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {[1, 5, 10, 50, 100].map((val) => (
                          <button key={val} onClick={() => { const current = parseFloat(amount) || 0; const max = points !== null ? points : 0; setAmount(String(Math.min(current + val, max))); }}
                            className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700">+{val}</button>
                        ))}
                        <button onClick={() => setAmount(String(points !== null ? points : 0))} className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700">Máx.</button>
                        {amount && <button onClick={() => setAmount("")} className="px-3 py-1.5 rounded-full text-sm font-medium bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/40 transition-colors border border-rose-200 dark:border-rose-800">Limpiar</button>}
                      </div>
                    </div>
                    <button onClick={handleBet} disabled={bettingLoading || !amount} className={`w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${betType === "yes" ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"}`}>
                      {bettingLoading ? "Procesando..." : `Cambiar predicción — ${betType === "yes" ? "Sí" : "No"}`}
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-sm text-slate-400 bg-slate-200 dark:bg-slate-800 rounded-xl py-3">🔒 Alcanzaste el límite de <span className="text-white font-bold">{MAX_CHANGES} cambios</span></p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-6 mb-4">
                  <button onClick={() => setBetType("yes")} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${betType === "yes" ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-600"}`}>{betType === "yes" && <div className="w-2 h-2 rounded-full bg-white" />}</div>
                    <span className={`text-sm font-medium ${betType === "yes" ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"}`}>Sí — {yesPct}%</span>
                  </button>
                  <button onClick={() => setBetType("no")} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${betType === "no" ? "border-rose-500 bg-rose-500" : "border-slate-300 dark:border-slate-600"}`}>{betType === "no" && <div className="w-2 h-2 rounded-full bg-white" />}</div>
                    <span className={`text-sm font-medium ${betType === "no" ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}`}>No — {noPct}%</span>
                  </button>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Monto</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{amount ? `${amount} $` : "0 $"}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 5, 10, 50, 100].map((val) => (
                      <button key={val} onClick={() => { const current = parseFloat(amount) || 0; const max = points !== null ? points : 0; setAmount(String(Math.min(current + val, max))); }}
                        className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700">+{val}</button>
                    ))}
                    <button onClick={() => setAmount(String(points !== null ? points : 0))} className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700">Máx.</button>
                    {amount && <button onClick={() => setAmount("")} className="px-3 py-1.5 rounded-full text-sm font-medium bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/40 transition-colors border border-rose-200 dark:border-rose-800">Limpiar</button>}
                  </div>
                </div>
                <button onClick={handleBet} disabled={bettingLoading || !amount} className={`w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${betType === "yes" ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"}`}>
                  {bettingLoading ? "Procesando..." : `Confirmar apuesta — ${betType === "yes" ? "Sí" : "No"}`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. Gráfico + Stats */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          {history.length > 1 && (
            <div className="p-5 pt-4">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-3">Evolución de probabilidad</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={history.map((h) => ({ time: new Date(h.created_at).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }), Sí: parseFloat(h.yes_pct), No: parseFloat(h.no_pct) }))}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#94a3b820" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} width={28} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "11px" }} labelStyle={{ color: "#94a3b8" }} />
                  <Line type="monotone" dataKey="Sí" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="No" stroke="#f43f5e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 flex items-center justify-between flex-wrap gap-3 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-4 flex-wrap">
              {[
                { icon: <BarChart2 size={12} />, label: "Total apostado", value: `$${(Number(market.yes) + Number(market.no)).toFixed(1)}` },
                { icon: <Users size={12} />, label: "Participantes", value: uniqueBettors },
                { icon: <Clock size={12} />, label: "Creado", value: new Date(market.created_at).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" }) },
                { icon: <TrendingUp size={12} />, label: "Estado", value: market.resolved ? `Ganó ${market.winner === "yes" ? "Sí" : "No"}` : "En vivo" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-1.5">
                  <span className="text-slate-400 dark:text-slate-500">{stat.icon}</span>
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-[12px] font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">Probabilidad actual</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-emerald-500">{yesPct}%</span>
                <span className="text-xl font-black text-rose-500">{noPct}%</span>
                <span className="text-xs text-slate-400">de que ocurra</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Top Predictores */}
        {topHolders.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-4">Top Predictores</p>
            <div className="space-y-3">
              {topHolders.map((h, i) => {
                const nombre = h.users?.nombre || h.users?.email?.split("@")[0] || "Anónimo";
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                    <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 grid place-items-center shrink-0">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{nombre.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{nombre}</p></div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${h.type === "yes" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400"}`}>{h.type === "yes" ? "Sí" : "No"}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">${h.amount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Noticias */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Newspaper size={18} className="text-blue-400" /> Noticia relacionada</h2>
          {market.news_title && (
            <div className="mb-4 space-y-3">
              {market.news_date && <span className="text-[10px] text-slate-400">{new Date(market.news_date).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}</span>}
              <p className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{market.news_title}</p>
              {market.news_summary && <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-l-2 border-blue-400 pl-3">{market.news_summary}</p>}
              <div className="flex items-center justify-between gap-2 pt-1">
                {market.news_source && <span className="text-[11px] text-slate-500 flex items-center gap-1">🌐 <span className="font-medium">{market.news_source}</span></span>}
                {market.news_url && <a href={market.news_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:underline">Ver noticia completa →</a>}
              </div>
            </div>
          )}
          {loadingNews ? <p className="text-slate-400 text-sm">Buscando noticias adicionales...</p> :
            news.length === 0 && !market.news_title ? <p className="text-slate-400 text-sm">No se encontraron noticias relacionadas.</p> :
            <div className="space-y-3">{news.map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-200 dark:bg-slate-800 rounded-xl p-4 hover:bg-slate-300 dark:hover:bg-slate-700 transition">
                <p className="font-semibold text-sm leading-snug">{n.title}</p>
                <p className="text-xs text-slate-400 mt-1">{n.source?.name} • {new Date(n.publishedAt).toLocaleDateString()}</p>
              </a>
            ))}</div>
          }
        </div>

        {/* 6. Comentarios */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><MessageCircle size={18} className="text-purple-400" /> Comentarios ({comments.length})</h2>
          <div className="flex gap-2 mb-5">
            <input placeholder="Escribe un comentario..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }} className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none placeholder-slate-500" />
            <button onClick={handleComment} disabled={submitting} className="bg-purple-500 text-white px-4 rounded-xl disabled:opacity-50 hover:bg-purple-600 transition"><Send size={16} /></button>
          </div>
          {showLoginPrompt && (
            <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
              <p className="text-sm text-slate-900 dark:text-slate-200">Debes iniciar sesión para comentar</p>
              <Link href="/login" className="shrink-0 bg-emerald-500 text-slate-950 font-bold text-sm px-4 py-2 rounded-xl">Iniciar sesión</Link>
            </div>
          )}
          {comments.length === 0 ? <p className="text-slate-400 text-sm text-center py-4">Sé el primero en comentar</p> :
            <div className="space-y-3">{comments.map((c) => (
              <div key={c.id} className="bg-slate-200 dark:bg-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-purple-400">{c.username}</span>
                  <span className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-900 dark:text-slate-200">{c.content}</p>
              </div>
            ))}</div>
          }
        </div>

      </div>{/* fin móvil */}

      {/* ===== DESKTOP ONLY ===== */}
      <div className="hidden lg:flex gap-6 items-start">

        {/* COLUMNA IZQUIERDA */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 sm:p-6">
              {market.category && <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block">{market.category}</span>}
              <h1 className="text-xl sm:text-2xl font-bold leading-snug">{market.question}</h1>
            </div>
            {history.length > 1 && (
              <div className="border-t border-slate-100 dark:border-slate-800 p-5 sm:p-6 pt-4">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-3">Evolución de probabilidad</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={history.map((h) => ({ time: new Date(h.created_at).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }), Sí: parseFloat(h.yes_pct), No: parseFloat(h.no_pct) }))}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#94a3b820" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} width={28} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "11px" }} labelStyle={{ color: "#94a3b8" }} />
                    <Line type="monotone" dataKey="Sí" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="No" stroke="#f43f5e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="border-t border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-3 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-5 flex-wrap">
                {[
                  { icon: <BarChart2 size={12} />, label: "Total apostado", value: `$${(Number(market.yes) + Number(market.no)).toFixed(1)}` },
                  { icon: <Users size={12} />, label: "Participantes", value: uniqueBettors },
                  { icon: <Clock size={12} />, label: "Creado", value: new Date(market.created_at).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" }) },
                  { icon: <TrendingUp size={12} />, label: "Estado", value: market.resolved ? `Ganó ${market.winner === "yes" ? "Sí" : "No"}` : "En vivo" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500">{stat.icon}</span>
                    <div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">Probabilidad actual</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-emerald-500">{yesPct}%</span>
                  <span className="text-xl font-black text-rose-500">{noPct}%</span>
                  <span className="text-xs text-slate-400">de que ocurra</span>
                </div>
              </div>
            </div>
          </div>

          {/* Noticias */}
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Newspaper size={18} className="text-blue-400" /> Noticia relacionada</h2>
            {market.news_title && (
              <div className="mb-4 space-y-3">
                {market.news_date && <span className="text-[10px] text-slate-400">{new Date(market.news_date).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}</span>}
                <p className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{market.news_title}</p>
                {market.news_summary && <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-l-2 border-blue-400 pl-3">{market.news_summary}</p>}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {market.news_source && <span className="text-[11px] text-slate-500 flex items-center gap-1">🌐 <span className="font-medium">{market.news_source}</span></span>}
                  {market.news_url && <a href={market.news_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:underline">Ver noticia completa →</a>}
                </div>
              </div>
            )}
            {loadingNews ? <p className="text-slate-400 text-sm">Buscando noticias adicionales...</p> :
              news.length === 0 && !market.news_title ? <p className="text-slate-400 text-sm">No se encontraron noticias relacionadas.</p> :
              <div className="space-y-3">{news.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-200 dark:bg-slate-800 rounded-xl p-4 hover:bg-slate-300 dark:hover:bg-slate-700 transition">
                  <p className="font-semibold text-sm leading-snug">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{n.source?.name} • {new Date(n.publishedAt).toLocaleDateString()}</p>
                </a>
              ))}</div>
            }
          </div>

          {/* Comentarios */}
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><MessageCircle size={18} className="text-purple-400" /> Comentarios ({comments.length})</h2>
            <div className="flex gap-2 mb-5">
              <input placeholder="Escribe un comentario..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }} className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none placeholder-slate-500" />
              <button onClick={handleComment} disabled={submitting} className="bg-purple-500 text-white px-4 rounded-xl disabled:opacity-50 hover:bg-purple-600 transition"><Send size={16} /></button>
            </div>
            {showLoginPrompt && (
              <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
                <p className="text-sm text-slate-900 dark:text-slate-200">Debes iniciar sesión para comentar</p>
                <Link href="/login" className="shrink-0 bg-emerald-500 text-slate-950 font-bold text-sm px-4 py-2 rounded-xl">Iniciar sesión</Link>
              </div>
            )}
            {comments.length === 0 ? <p className="text-slate-400 text-sm text-center py-4">Sé el primero en comentar</p> :
              <div className="space-y-3">{comments.map((c) => (
                <div key={c.id} className="bg-slate-200 dark:bg-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-purple-400">{c.username}</span>
                    <span className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-900 dark:text-slate-200">{c.content}</p>
                </div>
              ))}</div>
            }
          </div>

        </div>{/* fin columna izquierda desktop */}

        {/* COLUMNA DERECHA desktop */}
        <div className="w-[360px] shrink-0 sticky top-24 space-y-4">

          {/* Apostar */}
          {!market.resolved ? (
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-400" /> Realizar apuesta</h2>
              {!token && (
                <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-700 dark:text-slate-200">Inicia sesión para apostar</p>
                  <Link href="/login" className="shrink-0 bg-emerald-500 text-slate-950 font-bold text-sm px-4 py-2 rounded-xl">Iniciar sesión</Link>
                </div>
              )}
              {betSuccess && (
                <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-sm font-semibold text-emerald-500 flex items-center justify-center gap-2">✅ ¡Apuesta registrada exitosamente!</div>
              )}
              {points !== null && <p className="text-sm text-slate-400 mb-4">Tu balance: <span className="text-slate-900 dark:text-white font-bold">{points} $</span></p>}
              {userBet ? (
                <div className="space-y-4">
                  <div className={`rounded-xl p-4 text-center border ${userBet.type === "yes" ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"}`}>
                    <p className="text-sm text-slate-400 mb-1">Tu predicción actual</p>
                    <p className={`text-2xl font-black ${userBet.type === "yes" ? "text-emerald-400" : "text-rose-400"}`}>{userBet.type === "yes" ? "✅ Sí" : "❌ No"}</p>
                    <p className="text-sm text-slate-400 mt-1">{userBet.amount} $ apostados</p>
                  </div>
                  {changeCount < MAX_CHANGES ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 text-center">Cambios restantes: <span className="font-bold text-white">{MAX_CHANGES - changeCount}</span> de {MAX_CHANGES}</p>
                      <div className="flex gap-6">
                        <button onClick={() => setBetType("yes")} className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${betType === "yes" ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-600"}`}>{betType === "yes" && <div className="w-2 h-2 rounded-full bg-white" />}</div>
                          <span className={`text-sm font-medium ${betType === "yes" ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"}`}>Sí — {yesPct}%</span>
                        </button>
                        <button onClick={() => setBetType("no")} className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${betType === "no" ? "border-rose-500 bg-rose-500" : "border-slate-300 dark:border-slate-600"}`}>{betType === "no" && <div className="w-2 h-2 rounded-full bg-white" />}</div>
                          <span className={`text-sm font-medium ${betType === "no" ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}`}>No — {noPct}%</span>
                        </button>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-slate-500 dark:text-slate-400">Monto</span>
                          <span className="text-2xl font-bold text-slate-900 dark:text-white">{amount ? `${amount} $` : "0 $"}</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {[1, 5, 10, 50, 100].map((val) => (
                            <button key={val} onClick={() => { const current = parseFloat(amount) || 0; const max = points !== null ? points : 0; setAmount(String(Math.min(current + val, max))); }} className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700">+{val}</button>
                          ))}
                          <button onClick={() => setAmount(String(points !== null ? points : 0))} className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700">Máx.</button>
                          {amount && <button onClick={() => setAmount("")} className="px-3 py-1.5 rounded-full text-sm font-medium bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/40 transition-colors border border-rose-200 dark:border-rose-800">Limpiar</button>}
                        </div>
                      </div>
                      <button onClick={handleBet} disabled={bettingLoading || !amount} className={`w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${betType === "yes" ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"}`}>
                        {bettingLoading ? "Procesando..." : `Cambiar predicción — ${betType === "yes" ? "Sí" : "No"}`}
                      </button>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-slate-400 bg-slate-200 dark:bg-slate-800 rounded-xl py-3">🔒 Alcanzaste el límite de <span className="text-white font-bold">{MAX_CHANGES} cambios</span></p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-6 mb-4">
                    <button onClick={() => setBetType("yes")} className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${betType === "yes" ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-600"}`}>{betType === "yes" && <div className="w-2 h-2 rounded-full bg-white" />}</div>
                      <span className={`text-sm font-medium ${betType === "yes" ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"}`}>Sí — {yesPct}%</span>
                    </button>
                    <button onClick={() => setBetType("no")} className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${betType === "no" ? "border-rose-500 bg-rose-500" : "border-slate-300 dark:border-slate-600"}`}>{betType === "no" && <div className="w-2 h-2 rounded-full bg-white" />}</div>
                      <span className={`text-sm font-medium ${betType === "no" ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}`}>No — {noPct}%</span>
                    </button>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Monto</span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">{amount ? `${amount} $` : "0 $"}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 5, 10, 50, 100].map((val) => (
                        <button key={val} onClick={() => { const current = parseFloat(amount) || 0; const max = points !== null ? points : 0; setAmount(String(Math.min(current + val, max))); }} className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700">+{val}</button>
                      ))}
                      <button onClick={() => setAmount(String(points !== null ? points : 0))} className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700">Máx.</button>
                      {amount && <button onClick={() => setAmount("")} className="px-3 py-1.5 rounded-full text-sm font-medium bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/40 transition-colors border border-rose-200 dark:border-rose-800">Limpiar</button>}
                    </div>
                  </div>
                  <button onClick={handleBet} disabled={bettingLoading || !amount} className={`w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${betType === "yes" ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"}`}>
                    {bettingLoading ? "Procesando..." : `Confirmar apuesta — ${betType === "yes" ? "Sí" : "No"}`}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Top apostadores desktop */}
          {topHolders.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-4">Top Predictores</p>
              <div className="space-y-3">
                {topHolders.map((h, i) => {
                  const nombre = h.users?.nombre || h.users?.email?.split("@")[0] || "Anónimo";
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 grid place-items-center shrink-0">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{nombre.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{nombre}</p></div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${h.type === "yes" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400"}`}>{h.type === "yes" ? "Sí" : "No"}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">${h.amount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>{/* fin columna derecha desktop */}
      </div>{/* fin desktop */}

      {/* MERCADOS RELACIONADOS - ambos */}
      {relatedMarkets.length > 0 && (
        <div>
          <h2 className="font-bold text-xl mb-4">Más de {market.category}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {relatedMarkets.map((m) => {
              const t = (m.yes ?? 0) + (m.no ?? 0) || 1;
              const yPct = ((m.yes / t) * 100).toFixed(0);
              const nPct = ((m.no / t) * 100).toFixed(0);
              return (
                <div key={m.id} className="border rounded-xl p-3 sm:p-4 transition-all duration-300 hover:shadow-lg dark:hover:shadow-black/50 hover:-translate-y-0.5 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/50">
                  {m.category && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block w-fit">{m.category}</span>}
                  <Link href={`/market/${m.id}`}>
                    <h3 className="text-[13px] font-semibold leading-snug hover:text-emerald-400 transition-colors cursor-pointer mb-3">{m.question}</h3>
                  </Link>
                  <div className="flex justify-end text-[11px] text-slate-400 mb-3">
                    <span>{(Number(m.yes) + Number(m.no)).toFixed(1)} $ apostados</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href={`/market/${m.id}?bet=yes`} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium rounded-xl py-2.5 text-sm text-center active:scale-95 transition-transform flex flex-col items-center leading-tight">
                      <span className="text-[11px] opacity-70">Sí</span><span className="font-bold">{yPct}%</span>
                    </Link>
                    <Link href={`/market/${m.id}?bet=no`} className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-medium rounded-xl py-2.5 text-sm text-center active:scale-95 transition-transform flex flex-col items-center leading-tight">
                      <span className="text-[11px] opacity-70">No</span><span className="font-bold">{nPct}%</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  </main>
);
}