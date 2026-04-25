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
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userBet, setUserBet] = useState<{ type: "yes" | "no"; amount: number } | null>(null);
  const [changeCount, setChangeCount] = useState(0);
  const MAX_CHANGES = 3;
  const [betConfig, setBetConfig] = useState({ min_bet: 1, max_bet: 10 });
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
  }
 }, [id]);

  useEffect(() => {
    if (token) {
        fetchMe();
        fetchUserBet();
    }
 }, [token]);

 const handleBet = async () => {
  if (!token) return alert("Debes iniciar sesión");
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt < betConfig.min_bet || amt > betConfig.max_bet) 
    return alert(`El monto debe ser entre ${betConfig.min_bet} y ${betConfig.max_bet} puntos`);
  const res = await fetch("https://predicciones-ecuador.onrender.com/bet", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ marketId: Number(id), type: betType, amount: amt }),
  });
  const data = await res.json();
  if (data.points !== undefined) {
    setPoints(data.points);
    setAmount("");
    setUserBet({ type: betType, amount: amt });
    setChangeCount((prev) => prev + (userBet ? 1 : 0)); // solo suma si ya había apuesta previa
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
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
      <p className="text-slate-400">Cargando mercado...</p>
    </div>
  );

  const total = (market.yes ?? 0) + (market.no ?? 0) || 1;
  const yesPct = ((market.yes / total) * 100).toFixed(0);
  const noPct = ((market.no / total) * 100).toFixed(0);

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
            <span className={`shrink-0 text-xs px-3 py-1 rounded-full ${market.resolved ? "bg-slate-700 text-white" : "bg-emerald-500/10 text-emerald-400"}`}>
              {market.resolved ? "Cerrado" : "En vivo"}
            </span>
          </div>

          {/* Barra */}
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex mb-2">
            <div className="bg-emerald-500 transition-all" style={{ width: `${yesPct}%` }} />
            <div className="bg-rose-500 transition-all" style={{ width: `${noPct}%` }} />
          </div>
          <div className="flex justify-between text-sm text-slate-400">
            <span className="text-emerald-400 font-semibold">Sí {yesPct}%</span>
            <span className="text-slate-400">{total} pts apostados</span>
            <span className="text-rose-400 font-semibold">No {noPct}%</span>
          </div>
        </div>

        {/* Apostar */}
        {!market.resolved && (
  <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
      <TrendingUp size={18} className="text-emerald-400" /> Realizar apuesta
    </h2>

    {points !== null && (
      <p className="text-sm text-slate-400 mb-4">
        Tu balance: <span className="text-white font-bold">{points} pts</span>
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
          <p className="text-sm text-slate-400 mt-1">{userBet.amount} pts apostados</p>
        </div>

        {changeCount < MAX_CHANGES ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 text-center">
              Cambios restantes: <span className="font-bold text-white">{MAX_CHANGES - changeCount}</span> de {MAX_CHANGES}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBetType("yes")}
                className={`py-3 rounded-xl font-bold text-sm transition ${betType === "yes" ? "bg-emerald-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-400"}`}
              >
                Sí — {yesPct}%
              </button>
              <button
                onClick={() => setBetType("no")}
                className={`py-3 rounded-xl font-bold text-sm transition ${betType === "no" ? "bg-rose-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"}`}
              >
                No — {noPct}%
              </button>
            </div>
            <div className="flex items-center gap-3 bg-slate-200 dark:bg-slate-800 rounded-xl px-4 py-3">
              <span className="text-slate-400 text-sm">pts</span>
              <input
                type="number" min="1" max="10" step="0.01"
                placeholder="Monto (1 - 10)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent outline-none w-full text-sm placeholder-slate-500"
              />
            </div>
            <button
              onClick={handleBet}
              className={`w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 ${betType === "yes" ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"}`}
            >
              Cambiar predicción — {betType === "yes" ? "Sí" : "No"}
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
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setBetType("yes")}
            className={`py-3 rounded-xl font-bold text-sm transition ${betType === "yes" ? "bg-emerald-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-400"}`}
          >
            Sí — {yesPct}%
          </button>
          <button
            onClick={() => setBetType("no")}
            className={`py-3 rounded-xl font-bold text-sm transition ${betType === "no" ? "bg-rose-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"}`}
          >
            No — {noPct}%
          </button>
        </div>
        <div className="flex items-center gap-3 bg-slate-200 dark:bg-slate-800 rounded-xl px-4 py-3 mb-4">
          <span className="text-slate-400 text-sm">pts</span>
          <input
            type="number" min={betConfig.min_bet} max={betConfig.max_bet} step="0.01"
            placeholder={`Monto (${betConfig.min_bet} - ${betConfig.max_bet})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-transparent outline-none w-full text-sm placeholder-slate-500"
          />
        </div>
        <button
          onClick={handleBet}
          className={`w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 ${betType === "yes" ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"}`}
        >
          Confirmar apuesta — {betType === "yes" ? "Sí" : "No"}
        </button>
      </div>
    )}
  </div>
 )}

        {/* Noticias */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Newspaper size={18} className="text-blue-400" /> Noticias relacionadas
          </h2>
          {loadingNews ? (
            <p className="text-slate-400 text-sm">Buscando noticias...</p>
          ) : news.length === 0 ? (
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
      </div>
    </main>
  );
}