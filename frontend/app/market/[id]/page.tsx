"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TrendingUp, MessageCircle, Send, Newspaper, Share2, Link2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Header from "@/components/Header";
import { MarketCard } from "@/components/MarketCard";



const MAX_CHANGES = 3;

// Paleta igual al diseño original del HTML
const BET_SI_BASE:  [number,number,number] = [168, 230, 192];
const BET_SI_VOTED: [number,number,number] = [76,  175, 130];
const BET_NO_BASE:  [number,number,number] = [244, 169, 168];
const BET_NO_VOTED: [number,number,number] = [224,  85,  85];

/** Barra Sí/No con canvas para el panel de apuesta.
 *  El lado seleccionado usa el color "voted" (más saturado). */
function BetVoteBar({ yesPct, noPct, selected, onSelect }: {
  yesPct: number;
  noPct:  number;
  selected: "yes" | "no";
  onSelect: (s: "yes" | "no") => void;
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width  = rect.width  || 340;
    canvas.height = rect.height || 42;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;

    const siC = selected === "yes" ? BET_SI_VOTED : BET_SI_BASE;
    const noC = selected === "no"  ? BET_NO_VOTED : BET_NO_BASE;

    const splitX = w * (yesPct / 100);
    const blendW = w * 0.12;
    const bs = Math.max(0, (splitX - blendW) / w);
    const be = Math.min(1, (splitX + blendW) / w);

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    const mid = (a: number, b: number) => Math.round(a + (b - a) * 0.5);
    grad.addColorStop(0,  `rgb(${siC[0]},${siC[1]},${siC[2]})`);
    grad.addColorStop(bs, `rgb(${siC[0]},${siC[1]},${siC[2]})`);
    grad.addColorStop((bs+be)/2, `rgb(${mid(siC[0],noC[0])},${mid(siC[1],noC[1])},${mid(siC[2],noC[2])})`);
    grad.addColorStop(be, `rgb(${noC[0]},${noC[1]},${noC[2]})`);
    grad.addColorStop(1,  `rgb(${noC[0]},${noC[1]},${noC[2]})`);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, [yesPct, selected]);

  useEffect(() => {
    draw();
    const obs = new ResizeObserver(draw);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw]);

  const siC = selected === "yes" ? BET_SI_VOTED : BET_SI_BASE;
  const noC = selected === "no"  ? BET_NO_VOTED : BET_NO_BASE;
  const siText = `rgb(${Math.round(siC[0]*.3)},${Math.round(siC[1]*.3)},${Math.round(siC[2]*.4)})`;
  const noText = `rgb(${Math.round(noC[0]*.45)},${Math.round(noC[1]*.25)},${Math.round(noC[2]*.25)})`;
  // Fijos en los extremos para no solaparse con "Presiona para cambiar"
  const siLeft  = "13%";
  const noRight = "13%";

  return (
    <div ref={containerRef} className="relative h-8 rounded-full overflow-hidden cursor-pointer">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      <div className="absolute inset-y-0 left-0 w-1/2 z-[3]"  onClick={() => onSelect("yes")} />
      <div className="absolute inset-y-0 right-0 w-1/2 z-[3]" onClick={() => onSelect("no")}  />
      {/* Sí % */}
      <span className="absolute top-1/2 z-[4] pointer-events-none whitespace-nowrap font-semibold text-[12px]"
        style={{ left: siLeft, transform: "translate(-50%,-50%)", color: siText }}>
        Sí {yesPct}%
      </span>
      {/* Texto central fijo */}
      <span className="absolute top-1/2 left-1/2 z-[5] pointer-events-none whitespace-nowrap font-bold text-[9px] uppercase tracking-[0.06em]"
        style={{ transform: "translate(-50%,-50%)", color: "rgba(255,255,255,0.9)" }}>
        Presiona para cambiar
      </span>
      {/* No % */}
      <span className="absolute top-1/2 z-[4] pointer-events-none whitespace-nowrap font-semibold text-[12px]"
        style={{ right: noRight, transform: "translate(50%,-50%)", color: noText }}>
        No {noPct}%
      </span>
    </div>
  );
}

function BetPanel({
  betType, setBetType, amount, setAmount, points, userBet, changeCount,
  yesPct, noPct, betConfig, marketYes, marketNo, marketId, token, bettingLoading, betSuccess, handleBet,
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
  marketId: number;
  token: string | null;
  bettingLoading: boolean;
  betSuccess: boolean;
  handleBet: () => void;
}) {
  const isNo     = betType === "no";
  const amt      = parseFloat(amount) || 0;
  const prevAmt  = userBet ? userBet.amount : 0;
  const prevType = userBet ? userBet.type : null;
  const baseYes  = prevType === "yes" ? marketYes - prevAmt : marketYes;
  const baseNo   = prevType === "no"  ? marketNo  - prevAmt : marketNo;
  const yesPool  = betType === "yes" ? baseYes + amt : baseYes;
  const noPool   = betType === "no"  ? baseNo  + amt : baseNo;
  const myPool   = betType === "yes" ? yesPool : noPool;
  const oppPool  = betType === "yes" ? noPool  : yesPool;
  const gross    = myPool > 0 ? oppPool * (amt / myPool) : 0;
  const comm     = gross * ((betConfig.commission ?? 3) / 100);
  const estimated = amt > 0 ? amt + gross - comm : 0;

  const yesPctNum = parseInt(yesPct);
  const noPctNum  = parseInt(noPct);

  // Colores dinámicos según lado seleccionado
  const cardBg     = isNo ? "#fff5f5" : "#f0fdf4";
  const cardBorder = isNo ? "#fecaca" : "#bbf7d0";
  const gainColor  = isNo ? "#dc2626" : "#16a34a";
  const btnBg      = isNo ? "#ef4444" : "#22c55e";

  if (changeCount >= MAX_CHANGES) {
    return (
      <p className="text-center text-sm text-slate-400 bg-slate-200 dark:bg-slate-800 rounded-xl py-3">
        🔒 Alcanzaste el límite de <span className="font-bold text-slate-900 dark:text-white">{MAX_CHANGES} cambios</span>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Éxito */}
      {token && betSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-sm font-semibold text-emerald-500 flex items-center justify-center gap-2">
          ✅ ¡Predicción registrada exitosamente!
        </div>
      )}

      {/* Tarjeta combinada: predicción actual + ganancia estimada */}
      {(amt > 0 || userBet) && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "12px 14px", display: "flex", transition: "background 0.2s, border-color 0.2s" }}>
          {/* Columna izquierda: predicción actual (solo si ya apostó) */}
          {userBet && (
            <div style={{ flex: 1, textAlign: "center", paddingRight: 12, borderRight: `1px solid ${cardBorder}` }}>
              <p style={{ fontSize: 10, color: "#6b7280", margin: "0 0 6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Predicción actual</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ width: 20, height: 20, borderRadius: 4, background: isNo ? "#ef4444" : "#22c55e", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isNo
                    ? <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  }
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>{isNo ? "No" : "Sí"}</span>
              </div>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{Number(userBet.amount).toFixed(2)} $ apostados</p>
            </div>
          )}
          {/* Columna derecha: ganancia estimada */}
          <div style={{ flex: 1, textAlign: "center", paddingLeft: userBet ? 12 : 0 }}>
            <p style={{ fontSize: 10, color: "#6b7280", margin: "0 0 6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>Ganancia estimada</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: gainColor, margin: "0 0 4px", transition: "color 0.2s" }}>+{estimated.toFixed(2)} $</p>
            <p style={{ fontSize: 10, color: "#6b7280", margin: 0 }}>si aciertas</p>
          </div>
        </div>
      )}

      {/* Monto */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500 dark:text-slate-400">Monto</span>
        <span className="text-[18px] font-bold text-slate-900 dark:text-white">{amt > 0 ? `${amt.toFixed(2)} $` : "0 $"}</span>
      </div>

      {/* Botones de monto rápido */}
      <div className="flex gap-1.5">
        {[1, 5, 10, 50].map((val) => (
          <button key={val}
            onClick={() => { const cur = parseFloat(amount) || 0; const max = points !== null ? points : Infinity; setAmount(Number(Math.min(cur + val, max)).toFixed(2)); }}
            className="flex-1 py-[7px] rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer">
            +{val}
          </button>
        ))}
        <button onClick={() => setAmount(Number(points !== null ? points : 0).toFixed(2))}
          className="flex-1 py-[7px] rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer">
          Máx.
        </button>
        {amt > 0 && (
          <button onClick={() => setAmount("")}
            className="flex-1 py-[7px] rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-rose-500 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 transition cursor-pointer">
            Borrar
          </button>
        )}
      </div>

      {/* Selector Sí/No con gradiente canvas */}
      <BetVoteBar yesPct={yesPctNum} noPct={noPctNum} selected={betType} onSelect={setBetType} />

      {/* Botón confirmar o login */}
      {!token ? (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-200 text-center font-medium">Regístrate para realizar tu predicción</p>
          <div className="flex gap-2">
            <Link href="/register"
              onClick={() => { try { localStorage.setItem("pendingBet", JSON.stringify({ marketId, amount: parseFloat(amount) || undefined, type: betType })); } catch {} }}
              className="flex-1 bg-emerald-500 text-slate-950 font-bold text-sm px-3 py-2.5 rounded-xl text-center">
              Crear cuenta
            </Link>
            <Link href="/login"
              onClick={() => { try { localStorage.setItem("pendingBet", JSON.stringify({ marketId, amount: parseFloat(amount) || undefined, type: betType })); } catch {} }}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm px-3 py-2.5 rounded-xl text-center">
              Iniciar sesión
            </Link>
          </div>
        </div>
      ) : (
        <button onClick={handleBet} disabled={bettingLoading || !amount}
          style={{ background: btnBg, transition: "background 0.2s" }}
          className="w-full py-3.5 rounded-[10px] text-white font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer">
          {bettingLoading ? "Procesando..." : `${userBet ? "Cambiar" : "Confirmar"} predicción — ${isNo ? "No" : "Sí"}`}
        </button>
      )}

      {/* Cambios restantes */}
      {userBet && changeCount < MAX_CHANGES && (
        <p className="text-center text-xs text-slate-400">
          Cambios restantes: <strong className="text-slate-900 dark:text-white">{MAX_CHANGES - changeCount} de {MAX_CHANGES}</strong>
        </p>
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
  const [favorites, setFavorites] = useState<number[]>([]);
  const [togglingFavId, setTogglingFavId] = useState<number | null>(null);
  const [marketLoaded, setMarketLoaded] = useState(false);

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
    const total = (Number(market?.yes) || 0) + (Number(market?.no) || 0) || 1;
    const isZeroPool = market?.yes === 0 && market?.no === 0;
    const yPct = isZeroPool ? "50" : ((Number(market?.yes ?? 0) / total) * 100).toFixed(0);
    const nPct = isZeroPool ? "50" : ((Number(market?.no ?? 0) / total) * 100).toFixed(0);
    const shareText = `${market?.question ?? ""}\n✅ Sí: ${yPct}% | ❌ No: ${nPct}%`;
    if (isMobile && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: market?.question ?? "", text: shareText, url: window.location.href });
      } catch {
        // usuario canceló
      }
    } else {
      setShowShare(s => !s);
    }
  };

  const fetchMarket = async () => {
    const res = await fetch(`https://api.ecuapred.com/markets`);
    const data = await res.json();
    setAllMarkets(data);
    const found = data.find((m: any) => m.id === Number(id));
    setMarket(found || null);
    setMarketLoaded(true);
  };

  const fetchMe = async () => {
    if (!token) return;
    const res = await fetch("https://api.ecuapred.com/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.ok) { const d = await res.json(); setPoints(d.points); }
  };

  const fetchComments = async () => {
    const res = await fetch(`https://api.ecuapred.com/markets/${id}/comments`);
    if (res.ok) setComments(await res.json());
  };

  const fetchNews = async () => {
    setLoadingNews(true);
    const res = await fetch(`https://api.ecuapred.com/markets/${id}/news`);
    if (res.ok) setNews(await res.json());
    setLoadingNews(false);
  };

  const fetchClosingNews = async () => {
    const res = await fetch(`https://api.ecuapred.com/markets/${id}/news-closing`);
    if (res.ok) setClosingNews(await res.json());
  };
  
  const fetchHistory = async () => {
    const res = await fetch(`https://api.ecuapred.com/markets/${id}/history`);
    if (res.ok) setHistory(await res.json());
  };

  const fetchTopHolders = async () => {
    const res = await fetch(`https://api.ecuapred.com/markets/${id}/top-holders`);
    if (res.ok) setTopHolders(await res.json());
  };

  const fetchUniqueBettors = async () => {
    const res = await fetch(`https://api.ecuapred.com/markets/${id}/bettors-count`);
    if (res.ok) { const d = await res.json(); setUniqueBettors(d.count || 0); }
  };
  

  const fetchBetConfig = async () => {
  const res = await fetch("https://api.ecuapred.com/config");
  if (res.ok) {
    const data = await res.json();
    setBetConfig({ min_bet: data.min_bet ?? 1, commission: data.commission ?? 3 });
  }
 };

  const fetchUserBet = async () => {
  if (!token) return;
  const res = await fetch(`https://api.ecuapred.com/markets/${id}/my-bet`, {
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

  const fetchFavorites = async (tok: string) => {
    const res = await fetch("https://api.ecuapred.com/favorites", {
      headers: { authorization: `Bearer ${tok}` },
    });
    if (res.ok) {
      const data = await res.json();
      setFavorites(data.map((id: unknown) => Number(id)));
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, marketId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) { setToast({ text: "Debes iniciar sesión para guardar favoritos", type: "error" }); return; }
    setTogglingFavId(marketId);
    const wasFav = favorites.includes(marketId);
    try {
      const res = await fetch(`https://api.ecuapred.com/favorites/${marketId}`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchFavorites(token);
        setToast({ text: wasFav ? "Eliminado de favoritos" : "Añadido a favoritos", type: "success" });
      }
    } finally {
      setTogglingFavId(null);
    }
  };

  useEffect(() => {
    if (token) {
        fetchMe();
        fetchUserBet();
        fetchFavorites(token);
    }
 }, [token]);

  // Aplica pendingBet cuando el usuario llega autenticado desde registro/login
  useEffect(() => {
    if (!token || !market) return;
    try {
      const pending = localStorage.getItem("pendingBet");
      if (!pending) return;
      const { marketId: pendingMarketId, amount: pendingAmount, type: pendingType } = JSON.parse(pending);
      if (pendingMarketId === market.id) {
        if (pendingAmount) setAmount(String(pendingAmount));
        if (pendingType === "yes" || pendingType === "no") setBetType(pendingType);
        localStorage.removeItem("pendingBet");
      }
    } catch {}
  }, [token, market]);

  useEffect(() => {
    if (!id) return;
    const es = new EventSource("https://api.ecuapred.com/events");
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
  const res = await fetch("https://api.ecuapred.com/bet", {
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
  const res = await fetch(`https://api.ecuapred.com/markets/${id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ content: newComment }),
  });
  const data = await res.json();
  if (res.ok) { setNewComment(""); fetchComments(); }
  else setToast({ text: data.message || "Error al enviar el comentario", type: "error" });
  setSubmitting(false);
 };

  if (!market && marketLoaded) return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-5">
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-4xl">
          🔒
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Mercado no disponible</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm">
            Este mercado fue cerrado o eliminado. Si tenías una predicción activa, tu saldo ya fue ajustado.
          </p>
        </div>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-3 rounded-xl transition text-sm"
        >
          Ver mercados activos →
        </Link>
      </div>
    </main>
  );

  if (!market) return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Breadcrumb */}
        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />

        {/* Header del mercado */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2.5">
              <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-6 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-6 w-4/5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse shrink-0" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Panel de apuesta */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          </div>
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 flex-1 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>

        {/* Mejores apostadores */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
              <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded animate-pulse shrink-0" />
            </div>
          ))}
        </div>

        {/* Noticias */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50">
              <div className="h-14 w-14 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Comentarios */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-4/5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Mercados relacionados */}
        <div className="space-y-3">
          <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-4 w-4/5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                  <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>
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

 const catIcon: Record<string, string> = { deporte: "⚽", farandula: "🎭", politica: "🏛️", elecciones: "🗳️", pais: "📊", general: "🌐" };
 const categoryIcon = catIcon[market.category] || "📊";

 const lastUpdateText = (() => {
   if (!history.length) return null;
   const mins = Math.floor((Date.now() - new Date(history[history.length - 1].created_at + "Z").getTime()) / 60000);
   return mins < 1 ? "Actualizado ahora" : `Actualizado hace ${mins} min`;
 })();

 const statusColor = market.resolved
   ? (market.winner === "yes" ? "text-emerald-500" : "text-rose-500")
   : isInResolution ? "text-amber-500" : "text-emerald-500";
 const statusLabel = market.resolved
   ? `Ganó ${market.winner === "yes" ? "Sí" : "No"}`
   : isInResolution ? "En resolución" : "En vivo";

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
         <span className="text-sm font-bold text-slate-900 dark:text-white">{Number(userBet.amount).toFixed(2)} $ apostados</span>
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

        {/* 1. Sticky: pregunta */}
        <div className="sticky top-[49px] z-10 -mx-4 -mt-6 px-4 py-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {market.category && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 block">
                  {categoryIcon} {market.category}
                </span>
              )}
              <h1 className="text-[15px] font-bold leading-snug">{market.question}</h1>
              {market.closes_at && !market.resolved && !isInResolution && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                  ⏱ {formatCountdown(market.closes_at)}
                </span>
              )}
            </div>
            <div className="relative shrink-0">
              <button onClick={handleShare} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                <Share2 size={14} />
              </button>
              {showShare && (
                <div className="absolute right-0 top-8 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 w-44">
                  <button onClick={handleCopyLink} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                    <Link2 size={13} /> Copiar enlace
                  </button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${market.question}\n✅ Sí: ${yesPct}% | ❌ No: ${noPct}%\n${typeof window !== "undefined" ? window.location.href : ""}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => setShowShare(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="text-sm">📱</span> WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>
          {resolvedBanner && <div className="mt-3">{resolvedBanner}</div>}
        </div>

        {/* 2. BetPanel / resolución / resultado */}
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
                <span className="font-bold text-slate-900 dark:text-white">{Number(userBet.amount).toFixed(2)} $</span>
              </div>
              {userBet.type === market.winner ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Recibiste</span>
                    <span className="font-bold text-emerald-500">+{(userBet.payout ?? 0).toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-emerald-500/20 pt-2.5">
                    <span className="text-slate-400">Ganancia neta</span>
                    {(() => { const net = (userBet.payout ?? 0) - userBet.amount; return <span className="font-black text-lg text-emerald-500">{net >= 0 ? "+" : ""}{net.toFixed(2)} $</span>; })()}
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center border-t border-rose-500/20 pt-2.5">
                  <span className="text-slate-400">Perdiste</span>
                  <span className="font-black text-lg text-rose-500">-{Number(userBet.amount).toFixed(2)} $</span>
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
              marketId={Number(id)}
              token={token} bettingLoading={bettingLoading}
              betSuccess={betSuccess} handleBet={handleBet}
            />
          </div>
        )}

        {/* 3. Card: gráfica + stats + probabilidad */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          {history.length > 1 && (
            <div className="px-4 py-2">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-3">Evolución de probabilidad</p>
              {(() => {
                const last = history[history.length - 1];
                const siDominant = !last || parseFloat(last.yes_pct) >= 50;
                const chartData = history.map((h) => ({ time: new Date(h.created_at + "Z").toLocaleTimeString("es-EC", { timeZone: "America/Guayaquil", hour: "2-digit", minute: "2-digit" }), Sí: parseFloat(h.yes_pct), No: parseFloat(h.no_pct) }));
                return (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#94a3b820" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} width={28} domain={[0, 100]} />
                      <Tooltip content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
                            <p style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</p>
                            <p style={{ color: "#10b981" }}>Sí: {d?.Sí?.toFixed(1)}%</p>
                            <p style={{ color: "#f43f5e" }}>No: {d?.No?.toFixed(1)}%</p>
                          </div>
                        );
                      }} />
                      <Line type="monotone" dataKey={siDominant ? "Sí" : "No"} stroke={siDominant ? "#10b981" : "#f43f5e"} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          )}
          <div className="p-3 flex flex-wrap gap-2">
            {[
              { emoji: "📊", label: "Total apostado", value: `$${(Number(market.yes) + Number(market.no)).toFixed(1)}`, colorClass: "text-slate-900 dark:text-white" },
              { emoji: "👥", label: "Participantes", value: String(uniqueBettors), colorClass: "text-slate-900 dark:text-white" },
              { emoji: "📅", label: "Creado", value: new Date(market.created_at + "Z").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", year: "numeric" }), colorClass: "text-slate-900 dark:text-white" },
              { emoji: "✦", label: "Estado", value: statusLabel, colorClass: statusColor },
            ].map((stat) => (
              <div key={stat.label} className="flex-1 min-w-[calc(50%-4px)] px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{stat.emoji} {stat.label}</p>
                <p className={`text-[12px] font-bold ${stat.colorClass}`}>{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-2">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-emerald-500">{yesPct}%</span>
                <span className="text-xl font-black text-slate-400">{noPct}%</span>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-slate-600 dark:text-slate-300 font-medium">{yesPct}% de probabilidad de que ocurra</p>
                {lastUpdateText && <p className="text-[11px] text-slate-400 mt-0.5">{lastUpdateText}</p>}
              </div>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${yesPct}%` }} />
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
              {market.news_date && <span className="text-[10px] text-slate-400">{new Date(market.news_date + "T12:00:00").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "long", year: "numeric" })}</span>}
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
                <p className="text-xs text-slate-400 mt-1">{n.source?.name} • {new Date(n.publishedAt + "Z").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", year: "numeric" })}</p>
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
                  <p className="text-[10px] text-slate-400">{new Date(n.created_at + "Z").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "long", year: "numeric" })}</p>
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
              <button onClick={handleComment} disabled={submitting} className="bg-purple-500 text-white px-4 rounded-xl disabled:opacity-50 hover:bg-purple-600 transition cursor-pointer"><Send size={16} /></button>
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
                  <span className="text-[10px] text-slate-500">{new Date(c.created_at + "Z").toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
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
            {/* Pregunta */}
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Fila: categoría (izq) + cierra en (der) */}
                  <div className="flex items-center justify-between mb-2">
                    {market.category ? (
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {categoryIcon} {market.category}
                      </span>
                    ) : <span />}
                    {market.closes_at && !market.resolved && !isInResolution && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                        ⏱ {formatCountdown(market.closes_at)}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold leading-snug">{market.question}</h1>
                </div>
                <div className="relative shrink-0 mt-1">
                  <button onClick={handleShare} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                    <Share2 size={15} />
                  </button>
                  {showShare && (
                    <div className="absolute right-0 top-10 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 w-44">
                      <button onClick={handleCopyLink} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                        <Link2 size={13} /> Copiar enlace
                      </button>
                      <a href={`https://wa.me/?text=${encodeURIComponent(`${market.question}\n✅ Sí: ${yesPct}% | ❌ No: ${noPct}%\n${typeof window !== "undefined" ? window.location.href : ""}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => setShowShare(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="text-sm">📱</span> WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </div>
              {resolvedBanner && <div className="mt-4">{resolvedBanner}</div>}
            </div>

            {/* Gráfica */}
            {history.length > 1 && (
              <div className="px-5 py-2">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-3">Evolución de probabilidad</p>
                {(() => {
                  const last = history[history.length - 1];
                  const siDominant = !last || parseFloat(last.yes_pct) >= 50;
                  const chartData = history.map((h) => ({ time: new Date(h.created_at + "Z").toLocaleTimeString("es-EC", { timeZone: "America/Guayaquil", hour: "2-digit", minute: "2-digit" }), Sí: parseFloat(h.yes_pct), No: parseFloat(h.no_pct) }));
                  return (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#94a3b820" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} width={28} domain={[0, 100]} />
                        <Tooltip content={({ active, payload, label }: any) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          return (
                            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
                              <p style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</p>
                              <p style={{ color: "#10b981" }}>Sí: {d?.Sí?.toFixed(1)}%</p>
                              <p style={{ color: "#f43f5e" }}>No: {d?.No?.toFixed(1)}%</p>
                            </div>
                          );
                        }} />
                        <Line type="monotone" dataKey={siDominant ? "Sí" : "No"} stroke={siDominant ? "#10b981" : "#f43f5e"} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            )}

            {/* Stats grid */}
            <div className="p-3 flex flex-wrap gap-2">
              {[
                { emoji: "📊", label: "Total apostado", value: `$${(Number(market.yes) + Number(market.no)).toFixed(1)}`, colorClass: "text-slate-900 dark:text-white" },
                { emoji: "👥", label: "Participantes", value: String(uniqueBettors), colorClass: "text-slate-900 dark:text-white" },
                { emoji: "📅", label: "Creado", value: new Date(market.created_at + "Z").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", year: "numeric" }), colorClass: "text-slate-900 dark:text-white" },
                { emoji: "✦", label: "Estado", value: statusLabel, colorClass: statusColor },
              ].map((stat) => (
                <div key={stat.label} className="flex-1 min-w-[calc(50%-4px)] px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{stat.emoji} {stat.label}</p>
                  <p className={`text-[12px] font-bold ${stat.colorClass}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Probabilidad */}
            <div className="border-t border-slate-100 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-emerald-500">{yesPct}%</span>
                  <span className="text-xl font-black text-slate-400">{noPct}%</span>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 font-medium">{yesPct}% de probabilidad de que ocurra</p>
                  {lastUpdateText && <p className="text-[11px] text-slate-400 mt-0.5">{lastUpdateText}</p>}
                </div>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${yesPct}%` }} />
              </div>
            </div>
          </div>

          {/* Noticias */}
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Newspaper size={18} className="text-blue-400" /> Noticias relacionadas</h2>
            {market.news_title && (
              <div className="mb-4 space-y-3">
                {market.news_date && <span className="text-[10px] text-slate-400">{new Date(market.news_date + "T12:00:00").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "long", year: "numeric" })}</span>}
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
                  <p className="text-xs text-slate-400 mt-1">{n.source?.name} • {new Date(n.publishedAt + "Z").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", year: "numeric" })}</p>
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
                    <p className="text-[10px] text-slate-400">{new Date(n.created_at + "Z").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "long", year: "numeric" })}</p>
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
                <button onClick={handleComment} disabled={submitting} className="bg-purple-500 text-white px-4 rounded-xl disabled:opacity-50 hover:bg-purple-600 transition cursor-pointer"><Send size={16} /></button>
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
                    <span className="text-[10px] text-slate-500">{new Date(c.created_at + "Z").toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
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
                marketId={Number(id)}
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
                  <span className="font-bold text-slate-900 dark:text-white">{Number(userBet.amount).toFixed(2)} $</span>
                </div>
                {userBet.type === market.winner ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Recibiste</span>
                      <span className="font-bold text-emerald-500">+{(userBet.payout ?? 0).toFixed(2)} $</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-emerald-500/20 pt-2.5">
                      <span className="text-slate-400">Ganancia neta</span>
                      {(() => { const net = (userBet.payout ?? 0) - userBet.amount; return <span className="font-black text-lg text-emerald-500">{net >= 0 ? "+" : ""}{net.toFixed(2)} $</span>; })()}
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center border-t border-rose-500/20 pt-2.5">
                    <span className="text-slate-400">Perdiste</span>
                    <span className="font-black text-lg text-rose-500">-{Number(userBet.amount).toFixed(2)} $</span>
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
            {relatedMarkets.map((m) => (
              <MarketCard
                key={m.id}
                market={m}
                isFavorite={favorites.includes(m.id)}
                isTogglingFavorite={togglingFavId === m.id}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
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