"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, MessageCircle, Send, Newspaper } from "lucide-react";
import Header from "@/components/Header";


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
  const [betConfig, setBetConfig] = useState({ min_bet: 1, max_bet: 10 });
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

  const fetchBetConfig = async () => {
  const res = await fetch("https://predicciones-ecuador.onrender.com/config");
  if (res.ok) {
    const data = await res.json();
    setBetConfig({ min_bet: data.min_bet ?? 1, max_bet: data.max_bet ?? 10 });
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
  if (isNaN(amt) || amt < betConfig.min_bet || amt > betConfig.max_bet)
    return alert(`El monto debe ser entre ${betConfig.min_bet} y ${betConfig.max_bet} puntos`);
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
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Back */}
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
          <ArrowLeft size={16} /> Volver a mercados
        </Link>

        {/* Header mercado */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h1 className="text-xl sm:text-2xl font-bold leading-snug">{market.question}</h1>

          </div>

          {/* Barra de progreso */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm font-bold mb-1">
              <span className="text-emerald-500">Sí {yesPct}%</span>
              <span className="text-rose-500">No {noPct}%</span>
            </div>
            <div className="w-full h-4 rounded-full bg-rose-200 dark:bg-rose-900/40 overflow-hidden shadow-inner">
  <div
    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out relative"
    style={{ width: `${yesPct}%` }}
  >
    <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
  </div>
</div>
<div className="flex justify-between text-xs text-slate-400 mt-1">
  <span>{market.yes} $ · Sí</span>
  <span className="font-bold text-slate-500 dark:text-slate-300">{(Number(market.yes) + Number(market.no)).toFixed(1)} $ total</span>
  <span>{market.no} $ · No</span>
</div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>{market.yes} $ apostados a Sí</span>
              <span>{market.no} $ apostados a No</span>
            </div>
          </div>
        </div>

        {/* Apostar */}
        {!market.resolved && (
  <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
      <TrendingUp size={18} className="text-emerald-400" /> Realizar apuesta
    </h2>

    {/* Prompt login si no está logueado */}
    {!token && (
      <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
        <p className="text-sm text-slate-700 dark:text-slate-200">Inicia sesión para apostar</p>
        <Link href="/login" className="shrink-0 bg-emerald-500 text-slate-950 font-bold text-sm px-4 py-2 rounded-xl">
          Iniciar sesión
        </Link>
      </div>
    )}

    {/* Confirmación exitosa */}
    {betSuccess && (
      <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-sm font-semibold text-emerald-500 flex items-center justify-center gap-2">
        ✅ ¡Apuesta registrada exitosamente!
      </div>
    )}

    {points !== null && (
      <p className="text-sm text-slate-400 mb-4">
        Tu balance: <span className="text-slate-900 dark:text-white font-bold">{points} $</span>
      </p>
    )}

    {/* Ya apostó */}
    {userBet ? (
      <div className="space-y-4">
        <div className={`rounded-xl p-4 text-center border ${userBet.type === "yes" ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"}`}>
          <p className="text-sm text-slate-400 mb-1">Tu predicción actual</p>
          <p className={`text-2xl font-black ${userBet.type === "yes" ? "text-emerald-400" : "text-rose-400"}`}>
            {userBet.type === "yes" ? "✅ Sí" : "❌ No"}
          </p>
          <p className="text-sm text-slate-400 mt-1">{userBet.amount} $ apostados</p>
        </div>

        {changeCount < MAX_CHANGES ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 text-center">
              Cambios restantes: <span className="font-bold text-white">{MAX_CHANGES - changeCount}</span> de {MAX_CHANGES}
            </p>
            <div className="flex gap-6">
              <button
                onClick={() => setBetType("yes")}
                className="flex items-center gap-2.5 group"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  betType === "yes"
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-slate-300 dark:border-slate-600"
                }`}>
                  {betType === "yes" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className={`text-sm font-medium transition-colors ${
                  betType === "yes" ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"
                }`}>Sí — {yesPct}%</span>
              </button>

              <button
                onClick={() => setBetType("no")}
                className="flex items-center gap-2.5 group"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  betType === "no"
                    ? "border-rose-500 bg-rose-500"
                    : "border-slate-300 dark:border-slate-600"
                }`}>
                  {betType === "no" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className={`text-sm font-medium transition-colors ${
                  betType === "no" ? "text-rose-500" : "text-slate-500 dark:text-slate-400"
                }`}>No — {noPct}%</span>
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">Monto</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {amount ? `${amount} $` : "0 $"}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[1, 5, 10, 50, 100].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      const current = parseFloat(amount) || 0;
                      const next = Math.min(current + val, betConfig.max_bet);
                      setAmount(String(next));
                    }}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700"
                  >
                    +{val}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const max = points !== null
                      ? Math.min(points, betConfig.max_bet)
                      : betConfig.max_bet;
                    setAmount(String(max));
                  }}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700"
                >
                  Máx.
                </button>
                {amount && (
                  <button
                    onClick={() => setAmount("")}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/40 transition-colors border border-rose-200 dark:border-rose-800"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
            <button
  onClick={handleBet}
  disabled={bettingLoading || !amount}
  className={`w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${betType === "yes" ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"}`}
>
  {bettingLoading ? "Procesando..." : `Cambiar predicción — ${betType === "yes" ? "Sí" : "No"}`}
</button>
          </div>
        ) : (
          <p className="text-center text-sm text-slate-400 bg-slate-200 dark:bg-slate-800 rounded-xl py-3">
            🔒 Alcanzaste el límite de <span className="text-white font-bold">{MAX_CHANGES} cambios</span>
          </p>
        )}
      </div>
    ) : (
      /* No ha apostado aún */
      <div className="space-y-2">
        <div className="flex gap-6 mb-4">
          <button onClick={() => setBetType("yes")} className="flex items-center gap-2.5">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              betType === "yes" ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-600"
            }`}>
              {betType === "yes" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <span className={`text-sm font-medium transition-colors ${
              betType === "yes" ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"
            }`}>Sí — {yesPct}%</span>
          </button>

          <button onClick={() => setBetType("no")} className="flex items-center gap-2.5">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              betType === "no" ? "border-rose-500 bg-rose-500" : "border-slate-300 dark:border-slate-600"
            }`}>
              {betType === "no" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <span className={`text-sm font-medium transition-colors ${
              betType === "no" ? "text-rose-500" : "text-slate-500 dark:text-slate-400"
            }`}>No — {noPct}%</span>
          </button>
        </div>
        <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">Monto</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {amount ? `${amount} $` : "0 $"}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[1, 5, 10, 50, 100].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      const current = parseFloat(amount) || 0;
                      const next = Math.min(current + val, betConfig.max_bet);
                      setAmount(String(next));
                    }}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700"
                  >
                    +{val}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const max = points !== null
                      ? Math.min(points, betConfig.max_bet)
                      : betConfig.max_bet;
                    setAmount(String(max));
                  }}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700"
                >
                  Máx.
                </button>
                {amount && (
                  <button
                    onClick={() => setAmount("")}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/40 transition-colors border border-rose-200 dark:border-rose-800"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
        <button
  onClick={handleBet}
  disabled={bettingLoading || !amount}
  className={`w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${betType === "yes" ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"}`}
>
  {bettingLoading ? "Procesando..." : `Confirmar apuesta — ${betType === "yes" ? "Sí" : "No"}`}
</button>
      </div>
    )}
  </div>
 )}

        {/* Noticias */}
<div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
  <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
    <Newspaper size={18} className="text-blue-400" /> Noticia relacionada
  </h2>

  {/* Noticia de la plataforma (origen del mercado) */}
  {market.news_title && (
    <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-blue-400 uppercase tracking-widest font-semibold">📰 Noticia origen del mercado</span>
        {market.news_date && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {new Date(market.news_date).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        )}
      </div>

      <p className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{market.news_title}</p>

      {market.news_summary && (
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-l-2 border-blue-400 pl-3">
          {market.news_summary}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        {market.news_source && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            🌐 <span className="font-medium">{market.news_source}</span>
          </span>
        )}
        {market.news_url && (
          <a href={market.news_url} target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline transition flex items-center gap-1">
            Ver noticia completa →
          </a>
        )}
      </div>
    </div>
  )}

  {/* Noticias adicionales de NewsAPI */}
  {loadingNews ? (
    <p className="text-slate-400 text-sm">Buscando noticias adicionales...</p>
  ) : news.length === 0 && !market.news_title ? (
    <p className="text-slate-400 text-sm">No se encontraron noticias relacionadas.</p>
  ) : (
    <div className="space-y-3">
      {news.map((n, i) => (
        <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
          className="block bg-slate-200 dark:bg-slate-800 rounded-xl p-4 hover:bg-slate-300 dark:hover:bg-slate-700 transition">
          <p className="font-semibold text-sm leading-snug">{n.title}</p>
          <p className="text-xs text-slate-400 mt-1">{n.source?.name} • {new Date(n.publishedAt).toLocaleDateString()}</p>
        </a>
      ))}
    </div>
  )}
 </div>

        {/* Comentarios */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <MessageCircle size={18} className="text-purple-400" /> Comentarios ({comments.length})
          </h2>

          {/* Input */}
          <div className="flex gap-2 mb-5">
  <input
    placeholder="Escribe un comentario..."
    value={newComment}
    onChange={(e) => setNewComment(e.target.value)}
    onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }}
    className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none placeholder-slate-500"
  />
  <button onClick={handleComment} disabled={submitting}
    className="bg-purple-500 text-white px-4 rounded-xl disabled:opacity-50 hover:bg-purple-600 transition">
    <Send size={16} />
  </button>
 </div>

 {showLoginPrompt && (
  <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
    <p className="text-sm text-slate-900 dark:text-slate-200">Debes iniciar sesión para comentar</p>
    <Link href="/login" className="shrink-0 bg-emerald-500 text-slate-950 font-bold text-sm px-4 py-2 rounded-xl">
      Iniciar sesión
    </Link>
  </div>
 )}

          {/* Lista */}
          {comments.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Sé el primero en comentar</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="bg-slate-200 dark:bg-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-purple-400">{c.username}</span>
                    <span className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-900 dark:text-slate-200">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Mercados relacionados */}
        {relatedMarkets.length > 0 && (
          <div>
            <h2 className="font-bold text-xl mb-4">Más de {market.category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
              {relatedMarkets.map((m) => {
                const t = (m.yes ?? 0) + (m.no ?? 0) || 1;
                const yPct = ((m.yes / t) * 100).toFixed(0);
                const nPct = ((m.no / t) * 100).toFixed(0);
                return (
                  <div key={m.id} className="border rounded-xl p-3 sm:p-4 transition-all duration-300 hover:shadow-lg dark:hover:shadow-black/50 hover:-translate-y-0.5 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/50">
                    {m.category && (
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          {m.category}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <Link href={`/market/${m.id}`}>
                        <h3 className="text-[13px] font-semibold leading-snug hover:text-emerald-400 transition-colors cursor-pointer">
                          {m.question}
                        </h3>
                      </Link>
                    </div>
                    <div className="flex justify-end text-[11px] text-slate-400 mb-3">
                      <span>{(Number(m.yes) + Number(m.no)).toFixed(1)} $ apostados</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href={`/market/${m.id}?bet=yes`}
                        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium rounded-xl py-2.5 text-sm text-center active:scale-95 transition-transform flex flex-col items-center leading-tight">
                        <span className="text-[11px] opacity-70">Sí</span>
                        <span className="font-bold">{yPct}%</span>
                      </Link>
                      <Link href={`/market/${m.id}?bet=no`}
                        className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-medium rounded-xl py-2.5 text-sm text-center active:scale-95 transition-transform flex flex-col items-center leading-tight">
                        <span className="text-[11px] opacity-70">No</span>
                        <span className="font-bold">{nPct}%</span>
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