"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TrendingUp, MessageCircle, Send, Newspaper, Users, Clock, BarChart2, Share2, Link2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Header from "@/components/Header";



const MAX_CHANGES = 3;

function BetPanel({
  betType, setBetType, amount, setAmount, points, userBet, changeCount,
  yesPct, noPct, betConfig, marketYes, marketNo, token, bettingLoading, betSuccess, handleBet,
}: {
  betType: "yes" | "no";
  setBetType: (t: "yes" | "no") => void;
  amount: string;
  setAmount: (a: string) => void;
  points: number | null;
  userBet: { type: "yes" | "no"; amount: number; payout?: number } | null;
  changeCount: number;
  yesPct: string;
  noPct: string;
  betConfig: { min_bet: number; commission: number };
  marketYes: number;
  marketNo: number;
  token: string | null;
  bettingLoading: boolean;
  betSuccess: boolean;
  handleBet: () => void;
}) {
  const amt = parseFloat(amount) || (userBet ? userBet.amount : 0);
  const prevAmt = userBet ? userBet.amount : 0;
  const prevType = userBet ? userBet.type : null;
  const baseYes = prevType === "yes" ? marketYes - prevAmt : marketYes;
  const baseNo  = prevType === "no"  ? marketNo  - prevAmt : marketNo;
  const yesPool = betType === "yes" ? baseYes + amt : baseYes;
  const noPool  = betType === "no"  ? baseNo  + amt : baseNo;
  const myPool  = betType === "yes" ? yesPool : noPool;
  const oppPool = betType === "yes" ? noPool  : yesPool;
  const grossProfit = myPool > 0 ? oppPool * (amt / myPool) : 0;
  const commission  = grossProfit * ((betConfig.commission ?? 3) / 100);
  const estimatedTotal = amt + grossProfit - commission;

  const radioButtons = (
    <div className="flex gap-6">
      {(["yes", "no"] as const).map((t) => (
        <button key={t} onClick={() => setBetType(t)} className="flex items-center gap-2.5">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${betType === t ? (t === "yes" ? "border-emerald-500 bg-emerald-500" : "border-rose-500 bg-rose-500") : "border-slate-300 dark:border-slate-600"}`}>
            {betType === t && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <span className={`text-sm font-medium ${betType === t ? (t === "yes" ? "text-emerald-500" : "text-rose-500") : "text-slate-500 dark:text-slate-400"}`}>
            {t === "yes" ? "Sí" : "No"} — {t === "yes" ? yesPct : noPct}%
          </span>
        </button>
      ))}
    </div>
  );

  const amountButtons = (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">Monto</span>
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{amount ? `${amount} $` : "0 $"}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[1, 5, 10, 50, 100].map((val) => (
          <button key={val} onClick={() => { const cur = parseFloat(amount) || 0; const max = points !== null ? points : Infinity; setAmount(String(Math.min(cur + val, max))); }}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700">+{val}</button>
        ))}
        <button onClick={() => setAmount(String(points !== null ? points : 0))} className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700">Máx.</button>
        {amount && <button onClick={() => setAmount("")} className="px-3 py-1.5 rounded-full text-sm font-medium bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/40 transition-colors border border-rose-200 dark:border-rose-800">Limpiar</button>}
      </div>
    </div>
  );

  const estimatedCard = (amt > 0 || userBet) ? (
    <div className={`rounded-xl p-3 text-center border ${betType === "yes" ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Ganancia estimada si aciertas</p>
      <p className={`text-xl font-black ${betType === "yes" ? "text-emerald-400" : "text-rose-400"}`}>+{estimatedTotal.toFixed(2)} $</p>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {token && betSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-sm font-semibold text-emerald-500 flex items-center justify-center gap-2">
          ✅ ¡Predicción registrada exitosamente!
        </div>
      )}
      {token && points !== null && (
        <p className="text-sm text-slate-400">Tu balance: <span className="text-slate-900 dark:text-white font-bold">{points} $</span></p>
      )}
      {token && userBet ? (
        <div className="space-y-4">
          <div className={`rounded-xl p-4 text-center border ${userBet.type === "yes" ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"}`}>
            <p className="text-sm text-slate-400 mb-1">Tu predicción actual</p>
            <p className={`text-2xl font-black ${userBet.type === "yes" ? "text-emerald-400" : "text-rose-400"}`}>{userBet.type === "yes" ? "✅ Sí" : "❌ No"}</p>
            <p className="text-sm text-slate-400 mt-1">{userBet.amount} $ en predicciones</p>
          </div>
          {changeCount < MAX_CHANGES ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 text-center">Cambios restantes: <span className="font-bold text-slate-900 dark:text-white">{MAX_CHANGES - changeCount}</span> de {MAX_CHANGES}</p>
              {radioButtons}
              {amountButtons}
              {estimatedCard}
              <button onClick={handleBet} disabled={bettingLoading || !amount} className={`w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${betType === "yes" ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"}`}>
                {bettingLoading ? "Procesando..." : `Cambiar predicción — ${betType === "yes" ? "Sí" : "No"}`}
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-slate-400 bg-slate-200 dark:bg-slate-800 rounded-xl py-3">🔒 Alcanzaste el límite de <span className="text-white font-bold">{MAX_CHANGES} cambios</span></p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {radioButtons}
          {amountButtons}
          {estimatedCard}
          {!token ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
              <p className="text-sm text-slate-700 dark:text-slate-200">Inicia sesión para comenzar</p>
              <Link href="/login" className="shrink-0 bg-emerald-500 text-slate-950 font-bold text-sm px-4 py-2 rounded-xl">Iniciar sesión</Link>
            </div>
          ) : (
            <button onClick={handleBet} disabled={bettingLoading || !amount} className={`w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${betType === "yes" ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"}`}>
              {bettingLoading ? "Procesando..." : `Confirmar predicción — ${betType === "yes" ? "Sí" : "No"}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatCountdown(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "Cerrado";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `Cierra en ${d}d ${h}h`;
  if (h > 0) return `Cierra en ${h}h ${m}m`;
  return `Cierra en ${m}m`;
}

export default function MarketPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();

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
  const [token, setToken] = useState<string | null>(null);
  const [userBet, setUserBet] = useState<{ type: "yes" | "no"; amount: number; payout?: number; commission_paid?: number } | null>(null);
  const [changeCount, setChangeCount] = useState(0);
  const [betConfig, setBetConfig] = useState({ min_bet: 1, commission: 3 });
  const [history, setHistory] = useState<any[]>([]);
  const [uniqueBettors, setUniqueBettors] = useState(0);
  const [topHolders, setTopHolders] = useState<any[]>([]);
  const [allMarkets, setAllMarkets] = useState<any[]>([]);
  const [closingNews, setClosingNews] = useState<any[]>([]);
  const [toast, setToast] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [showShare, setShowShare] = useState(false);
  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);


  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setShowShare(false);
    setToast({ text: "¡Enlace copiado!", type: "success" });
  };

  const handleShare = async () => {
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
    if (isMobile && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: market?.question ?? "", url: window.location.href });
      } catch {
        // usuario canceló
      }
    } else {
      setShowShare(s => !s);
    }
  };

  const fetchMarket = async () => {
    const res = await fetch(`https://predicciones-ecuador.onrender.com/markets`);
    const data = await res.json();
    setAllMarkets(data);
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

  const fetchClosingNews = async () => {
    const res = await fetch(`https://predicciones-ecuador.onrender.com/markets/${id}/news-closing`);
    if (res.ok) setClosingNews(await res.json());
  };
  
  const fetchHistory = async () => {
    const res = await fetch(`https://predicciones-ecuador.onrender.com/markets/${id}/history`);
    if (res.ok) setHistory(await res.json());
  };

  const fetchTopHolders = async () => {
    const res = await fetch(`https://predicciones-ecuador.onrender.com/markets/${id}/top-holders`);
    if (res.ok) setTopHolders(await res.json());
  };

  const fetchUniqueBettors = async () => {
    const res = await fetch(`https://predicciones-ecuador.onrender.com/markets/${id}/bettors-count`);
    if (res.ok) { const d = await res.json(); setUniqueBettors(d.count || 0); }
  };
  

  const fetchBetConfig = async () => {
  const res = await fetch("https://predicciones-ecuador.onrender.com/config");
  if (res.ok) {
    const data = await res.json();
    setBetConfig({ min_bet: data.min_bet ?? 1, commission: data.commission ?? 3 });
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
      setUserBet({ type: data.bet.type, amount: data.bet.amount, payout: data.bet.payout ?? undefined, commission_paid: data.bet.commission_paid ?? undefined });
      setChangeCount(data.bet.changes ?? 0);
      setBetType(data.bet.type);
    } else {
      setUserBet(null);
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
    fetchClosingNews();
  }
 }, [id]);

  useEffect(() => {
    if (token) {
        fetchMe();
        fetchUserBet();
    }
 }, [token]);

  useEffect(() => {
    if (!id) return;
    const es = new EventSource("https://predicciones-ecuador.onrender.com/events");
    es.addEventListener("bets", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (d.market_id === Number(id)) {
        fetchMarket();
        fetchTopHolders();
        fetchUniqueBettors();
      }
    });
    es.addEventListener("market_history", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      if (d.market_id === Number(id)) fetchHistory();
    });
    return () => es.close();
  }, [id]);

 const handleBet = async () => {
  if (!token) return;
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt < betConfig.min_bet) {
    setToast({ text: `Monto mínimo: ${betConfig.min_bet} $`, type: "error" });
    return;
  }
  if (points !== null && amt > points) {
    setToast({ text: "Saldo insuficiente", type: "error" });
    return;
  }
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
    setToast({ text: data.message || "Error al procesar la predicción", type: "error" });
  }
 };

  const handleComment = async () => {
  if (!token) return;
  if (!newComment.trim()) return;
  setSubmitting(true);
  const res = await fetch(`https://predicciones-ecuador.onrender.com/markets/${id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ content: newComment }),
  });
  const data = await res.json();
  if (res.ok) { setNewComment(""); fetchComments(); }
  else setToast({ text: data.message || "Error al enviar el comentario", type: "error" });
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
const isZero = market.yes === 0 && market.no === 0;
const yesPct = isZero ? "50" : ((market.yes / total) * 100).toFixed(0);
const noPct = isZero ? "50" : ((market.no / total) * 100).toFixed(0);
  const relatedMarkets = allMarkets.filter(
    (m) => m.category === market.category && m.id !== market.id && !m.resolved
  ).slice(0, 4);

 const isInResolution = !market.resolved && !!market.closes_at && new Date(market.closes_at) <= new Date();

 // Ganancia estimada si el usuario gana (con el pool actual)
 const estimatedWinnings = (() => {
   if (!userBet) return null;
   const myPool  = userBet.type === "yes" ? Number(market.yes) : Number(market.no);
   const oppPool = userBet.type === "yes" ? Number(market.no) : Number(market.yes);
   const grossProfit = myPool > 0 ? oppPool * (userBet.amount / myPool) : 0;
   const commission  = grossProfit * ((betConfig.commission ?? 3) / 100);
   return (userBet.amount + grossProfit - commission);
 })();

 const resolutionBanner = isInResolution ? (
   <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
     <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0 text-lg">⏳</div>
     <div>
       <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-widest font-semibold mb-0.5">Mercado en resolución</p>
       <p className="text-sm font-semibold text-slate-800 dark:text-white">El resultado puede tardar hasta 24h en confirmarse</p>
     </div>
   </div>
 ) : null;

 const resolutionUserPanel = isInResolution && token && userBet ? (
   <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
     <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Tu predicción</p>
     <div className={`rounded-xl p-4 border ${userBet.type === "yes" ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
       <div className="flex items-center justify-between mb-3">
         <span className={`text-lg font-black ${userBet.type === "yes" ? "text-emerald-500" : "text-rose-500"}`}>
           {userBet.type === "yes" ? "✅ Sí" : "❌ No"}
         </span>
         <span className="text-sm font-bold text-slate-900 dark:text-white">{userBet.amount} $ apostados</span>
       </div>
       {estimatedWinnings !== null && (
         <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-1.5 text-sm">
           <div className="flex justify-between text-slate-400">
             <span>Si ganas recibirías</span>
             <span className="font-bold text-emerald-500">+{estimatedWinnings.toFixed(2)} $</span>
           </div>
           <div className="flex justify-between text-slate-400">
             <span>Ganancia neta estimada</span>
             <span className="font-bold text-emerald-500">+{(estimatedWinnings - userBet.amount).toFixed(2)} $</span>
           </div>
         </div>
       )}
     </div>
     <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">Las predicciones están bloqueadas mientras se verifica el resultado</p>
   </div>
 ) : null;

 const resolvedBanner = market.resolved ? (
  <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-xl ${market.winner === "yes" ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>
        {market.winner === "yes" ? "✅" : "❌"}
      </div>
      <div>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">Mercado cerrado</p>
        <p className="text-base font-bold text-slate-900 dark:text-white">
          Ganó:{" "}
          <span className={market.winner === "yes" ? "text-emerald-500" : "text-rose-500"}>
            {market.winner === "yes" ? "Sí" : "No"}
          </span>
        </p>
      </div>
    </div>
    <div className="text-right shrink-0">
      <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">Resultado final</p>
      <div className="flex items-baseline gap-1.5 justify-end">
        <span className="text-2xl font-black text-emerald-500">{yesPct}%</span>
        <span className="text-lg font-black text-rose-500">{noPct}%</span>
      </div>
    </div>
  </div>
) : null;

 return (
  <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
    <Header />
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">

      {/* ===== MÓVIL ONLY ===== */}
      <div className="lg:hidden space-y-2">

        {/* 1. Pregunta */}
        <div className="sticky top-[57px] z-10 -mx-4 px-4 py-2 bg-white dark:bg-slate-950">
          {market.category && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 block">
              {market.category}
            </span>
          )}
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-[14px] font-bold leading-snug flex-1">{market.question}</h1>
            <div className="relative shrink-0">
              <button onClick={handleShare} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                <Share2 size={14} />
              </button>
              {showShare && (
                <div className="absolute right-0 top-8 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 w-44">
                  <button onClick={handleCopyLink} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Link2 size={13} /> Copiar enlace
                  </button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${market.question}\n${typeof window !== "undefined" ? window.location.href : ""}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => setShowShare(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="text-sm">📱</span> WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Banner resuelto / en resolución / panel de predicción */}
        {resolvedBanner}
        {resolutionBanner}
        {resolutionUserPanel}

        {market.resolved && token && userBet && (
          <div className={`rounded-2xl p-5 border ${userBet.type === market.winner ? "border-emerald-400/40 bg-emerald-500/5 dark:bg-emerald-500/10" : "border-rose-400/40 bg-rose-500/5 dark:bg-rose-500/10"}`}>
            <div className="text-center mb-4">
              <div className="text-3xl mb-1">{userBet.type === market.winner ? "🏆" : "😔"}</div>
              <p className={`font-bold text-base ${userBet.type === market.winner ? "text-emerald-500" : "text-rose-400"}`}>
                {userBet.type === market.winner ? "¡Ganaste esta predicción!" : "Perdiste esta predicción"}
              </p>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tu predicción</span>
                <span className={`font-bold ${userBet.type === "yes" ? "text-emerald-400" : "text-rose-400"}`}>{userBet.type === "yes" ? "✅ Sí" : "❌ No"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Invertiste</span>
                <span className="font-bold text-slate-900 dark:text-white">{userBet.amount} $</span>
              </div>
              {userBet.type === market.winner ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Recibiste</span>
                    <span className="font-bold text-emerald-500">+{(userBet.payout ?? 0).toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-emerald-500/20 pt-2.5">
                    <span className="text-slate-400">Ganancia neta</span>
                    <span className="font-black text-lg text-emerald-500">+{((userBet.payout ?? 0) - userBet.amount).toFixed(2)} $</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center border-t border-rose-500/20 pt-2.5">
                  <span className="text-slate-400">Perdiste</span>
                  <span className="font-black text-lg text-rose-500">-{userBet.amount} $</span>
                </div>
              )}
            </div>
          </div>
        )}

{!market.resolved && !isInResolution && (
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" /> Realizar predicción
            </h2>
            <BetPanel
              betType={betType} setBetType={setBetType}
              amount={amount} setAmount={setAmount}
              points={points} userBet={userBet} changeCount={changeCount}
              yesPct={yesPct} noPct={noPct} betConfig={betConfig}
              marketYes={Number(market.yes)} marketNo={Number(market.no)}
              token={token} bettingLoading={bettingLoading}
              betSuccess={betSuccess} handleBet={handleBet}
            />
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
                { icon: <BarChart2 size={12} />, label: "Total apostado", value: `$${(Number(market.yes) + Number(market.no)).toFixed(1)}`, red: false },
                { icon: <Users size={12} />, label: "Participantes", value: uniqueBettors, red: false },
                { icon: <Clock size={12} />, label: "Creado", value: new Date(market.created_at).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" }), red: false },
                { icon: <TrendingUp size={12} />, label: "Estado", value: market.resolved ? `Ganó ${market.winner === "yes" ? "Sí" : "No"}` : isInResolution ? "En resolución" : "En vivo", red: false },
                ...(market.closes_at && !market.resolved ? [{ icon: <Clock size={12} />, label: "Cierre", value: formatCountdown(market.closes_at), red: (new Date(market.closes_at).getTime() - Date.now()) < 3600000 }] : []),
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-1.5">
                  <span className="text-slate-400 dark:text-slate-500">{stat.icon}</span>
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    <p className={`text-[12px] font-bold ${stat.red ? "text-rose-500" : "text-slate-900 dark:text-white"}`}>{stat.value}</p>
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
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Newspaper size={18} className="text-blue-400" /> Noticias relacionadas</h2>
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

        {/* 5b. Noticia de cierre móvil */}
        {market.resolved && closingNews.length > 0 && (
          <div className="bg-slate-100 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Newspaper size={18} className="text-emerald-400" /> Noticia de cierre
            </h2>
            <div className="space-y-4">
              {closingNews.map((n) => (
                <div key={n.id} className="space-y-2">
                  <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold">✅ Verificado al cierre</p>
                  <p className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{n.title}</p>
                  {n.content && <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-l-2 border-emerald-400 pl-3 line-clamp-3">{n.content}</p>}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {n.source && <span className="text-[11px] text-slate-500 flex items-center gap-1">🌐 <span className="font-medium">{n.source}</span></span>}
                    {n.url && <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-400 hover:underline">Ver noticia completa →</a>}
                  </div>
                  <p className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        

        {/* 6. Comentarios */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><MessageCircle size={18} className="text-purple-400" /> Comentarios ({comments.length})</h2>
          {token ? (
            <div className="flex gap-2 mb-5">
              <input placeholder="Escribe un comentario..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }} className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none placeholder-slate-500" />
              <button onClick={handleComment} disabled={submitting} className="bg-purple-500 text-white px-4 rounded-xl disabled:opacity-50 hover:bg-purple-600 transition"><Send size={16} /></button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 mb-5 p-4 bg-slate-200 dark:bg-slate-800 rounded-xl">
              <p className="text-sm text-slate-600 dark:text-slate-300">Inicia sesión para comentar</p>
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
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold leading-snug flex-1">{market.question}</h1>
                <div className="relative shrink-0 mt-1">
                  <button onClick={handleShare} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <Share2 size={15} />
                  </button>
                  {showShare && (
                    <div className="absolute right-0 top-10 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 w-44">
                      <button onClick={handleCopyLink} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <Link2 size={13} /> Copiar enlace
                      </button>
                      <a href={`https://wa.me/?text=${encodeURIComponent(`${market.question}\n${typeof window !== "undefined" ? window.location.href : ""}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => setShowShare(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="text-sm">📱</span> WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {resolvedBanner && <div className="px-5 sm:px-6 pb-4">{resolvedBanner}</div>}
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
                  { icon: <BarChart2 size={12} />, label: "Total apostado", value: `$${(Number(market.yes) + Number(market.no)).toFixed(1)}`, red: false },
                  { icon: <Users size={12} />, label: "Participantes", value: uniqueBettors, red: false },
                  { icon: <Clock size={12} />, label: "Creado", value: new Date(market.created_at).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" }), red: false },
                  { icon: <TrendingUp size={12} />, label: "Estado", value: market.resolved ? `Ganó ${market.winner === "yes" ? "Sí" : "No"}` : isInResolution ? "En resolución" : "En vivo", red: false },
                  ...(market.closes_at && !market.resolved ? [{ icon: <Clock size={12} />, label: "Cierre", value: formatCountdown(market.closes_at), red: (new Date(market.closes_at).getTime() - Date.now()) < 3600000 }] : []),
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500">{stat.icon}</span>
                    <div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
                      <p className={`text-[12px] font-bold ${stat.red ? "text-rose-500" : "text-slate-900 dark:text-white"}`}>{stat.value}</p>
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
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Newspaper size={18} className="text-blue-400" /> Noticias relacionadas</h2>
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

          {/* Noticia de cierre desktop */}
          {market.resolved && closingNews.length > 0 && (
            <div className="bg-slate-100 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Newspaper size={18} className="text-emerald-400" /> Noticia de cierre
              </h2>
              <div className="space-y-4">
                {closingNews.map((n) => (
                  <div key={n.id} className="space-y-2">
                    <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold">✅ Verificado al cierre</p>
                    <p className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{n.title}</p>
                    {n.content && <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-l-2 border-emerald-400 pl-3 line-clamp-3">{n.content}</p>}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {n.source && <span className="text-[11px] text-slate-500 flex items-center gap-1">🌐 <span className="font-medium">{n.source}</span></span>}
                      {n.url && <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-400 hover:underline">Ver noticia completa →</a>}
                    </div>
                    <p className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comentarios */}
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><MessageCircle size={18} className="text-purple-400" /> Comentarios ({comments.length})</h2>
            {token ? (
              <div className="flex gap-2 mb-5">
                <input placeholder="Escribe un comentario..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }} className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none placeholder-slate-500" />
                <button onClick={handleComment} disabled={submitting} className="bg-purple-500 text-white px-4 rounded-xl disabled:opacity-50 hover:bg-purple-600 transition"><Send size={16} /></button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 mb-5 p-4 bg-slate-200 dark:bg-slate-800 rounded-xl">
                <p className="text-sm text-slate-600 dark:text-slate-300">Inicia sesión para comentar</p>
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

          {/* Apostar / En resolución / Resuelto */}
          {isInResolution ? (
            <div className="space-y-3">
              {resolutionBanner}
              {resolutionUserPanel}
            </div>
          ) : !market.resolved ? (
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-400" /> Realizar predicción</h2>
              <BetPanel
                betType={betType} setBetType={setBetType}
                amount={amount} setAmount={setAmount}
                points={points} userBet={userBet} changeCount={changeCount}
                yesPct={yesPct} noPct={noPct} betConfig={betConfig}
                marketYes={Number(market.yes)} marketNo={Number(market.no)}
                token={token} bettingLoading={bettingLoading}
                betSuccess={betSuccess} handleBet={handleBet}
              />
            </div>
          ) : token && userBet ? (
            <div className={`rounded-2xl p-5 border ${userBet.type === market.winner ? "border-emerald-400/40 bg-emerald-500/5 dark:bg-emerald-500/10" : "border-rose-400/40 bg-rose-500/5 dark:bg-rose-500/10"}`}>
              <div className="text-center mb-4">
                <div className="text-3xl mb-1">{userBet.type === market.winner ? "🏆" : "😔"}</div>
                <p className={`font-bold text-base ${userBet.type === market.winner ? "text-emerald-500" : "text-rose-400"}`}>
                  {userBet.type === market.winner ? "¡Ganaste esta predicción!" : "Perdiste esta predicción"}
                </p>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tu predicción</span>
                  <span className={`font-bold ${userBet.type === "yes" ? "text-emerald-400" : "text-rose-400"}`}>{userBet.type === "yes" ? "✅ Sí" : "❌ No"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Invertiste</span>
                  <span className="font-bold text-slate-900 dark:text-white">{userBet.amount} $</span>
                </div>
                {userBet.type === market.winner ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Recibiste</span>
                      <span className="font-bold text-emerald-500">+{(userBet.payout ?? 0).toFixed(2)} $</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-emerald-500/20 pt-2.5">
                      <span className="text-slate-400">Ganancia neta</span>
                      <span className="font-black text-lg text-emerald-500">+{((userBet.payout ?? 0) - userBet.amount).toFixed(2)} $</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center border-t border-rose-500/20 pt-2.5">
                    <span className="text-slate-400">Perdiste</span>
                    <span className="font-black text-lg text-rose-500">-{userBet.amount} $</span>
                  </div>
                )}
              </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {relatedMarkets.map((m) => {
              const t = (m.yes ?? 0) + (m.no ?? 0) || 1;
const isZeroM = m.yes === 0 && m.no === 0;
const yPct = isZeroM ? "50" : ((m.yes / t) * 100).toFixed(0);
const nPct = isZeroM ? "50" : ((m.no / t) * 100).toFixed(0);
              return (
                <div key={m.id} className="border rounded-xl p-3 sm:p-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg dark:hover:shadow-black/40 cursor-pointer bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/50">
                  {m.category && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block w-fit">{m.category}</span>}
                  <Link href={`/market/${m.id}`}>
                    <h3 className="text-[13px] font-semibold leading-snug hover:text-emerald-400 transition-colors cursor-pointer mb-3 line-clamp-2">{m.question}</h3>
                  </Link>
                  <div className="flex justify-end text-[11px] text-slate-400 mb-3">
                    <span>{(Number(m.yes) + Number(m.no)).toFixed(1)} $ en predicciones</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href={`/market/${m.id}?bet=yes`} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium rounded-lg py-1.5 text-xs text-center transition-all flex items-center justify-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 hover:scale-[1.03] active:scale-95 active:bg-emerald-300 dark:active:bg-emerald-900/80">
                    <span className="opacity-70">Sí</span><span className="font-bold">{yPct}%</span>
                    </Link>
                    <Link href={`/market/${m.id}?bet=no`} className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-medium rounded-lg py-1.5 text-xs text-center transition-all flex items-center justify-center gap-1 hover:bg-rose-200 dark:hover:bg-rose-900/60 hover:scale-[1.03] active:scale-95 active:bg-rose-300 dark:active:bg-rose-900/80">
                    <span className="opacity-70">No</span><span className="font-bold">{nPct}%</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>

    {showShare && <div className="fixed inset-0 z-40" onClick={() => setShowShare(false)} />}

    {toast && (
      <div className={`fixed bottom-6 right-4 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl flex items-center gap-2 transition-all animate-in slide-in-from-bottom-4 ${toast.type === "error" ? "bg-rose-500 text-white" : "bg-emerald-500 text-slate-950"}`}>
        {toast.type === "error" ? "❌" : "✅"} {toast.text}
      </div>
    )}
  </main>
);
}