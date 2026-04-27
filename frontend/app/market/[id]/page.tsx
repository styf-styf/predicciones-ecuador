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
            {(() => {
              const r = 22;
              const circ = 2 * Math.PI * r;
              const offset = circ - (circ * Number(yesPct)) / 100;
              const color = Number(yesPct) >= 50 ? "#22c55e" : "#ef4444";
              const label = Number(yesPct) >= 50 ? "Sí" : "No";
              return (
                <div className="relative w-14 h-14 shrink-0">
                  <svg viewBox="0 0 52 52" width="52" height="52">
                    <circle cx="26" cy="26" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4"/>
                    <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4"
                      strokeDasharray={circ} strokeDashoffset={offset}
                      strokeLinecap="round" transform="rotate(-90 26 26)"/>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">{yesPct}%</span>
                    <span className="text-[9px] text-slate-400">{label}</span>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="flex justify-end mt-2">
            <span className="text-xs text-slate-400">{total} pts apostados</span>
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
        Tu balance: <span className="text-slate-900 dark:text-white font-bold">{points} pts</span>
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Monto</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {amount ? `${amount} pts` : "0 pts"}
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
                    className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                  >
                    +{val}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const max = Math.min(points ?? 0, betConfig.max_bet);
                    setAmount(String(max));
                  }}
                  className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                >
                  Máx.
                </button>
              </div>
              <button
                onClick={() => setAmount("")}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                Limpiar
              </button> 
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