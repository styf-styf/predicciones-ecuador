"use client";
import React from "react";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet, Trophy, BarChart3, ArrowUpRight, Shield, X,
  TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpLeft,
  User, Settings, Home, ChevronRight, Copy, Check,
  AlertCircle, ExternalLink, Clock, CheckCircle, XCircle
} from "lucide-react";
import Header from "@/components/Header";

type Tab = "inicio" | "movimientos" | "wallet" | "perfil";

export default function PanelPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("inicio");
  const [tabVisible, setTabVisible] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [bankConfig, setBankConfig] = useState<any>(null);

  // Wallet state (maqueta)
  const [walletAction, setWalletAction] = useState<"recarga" | "retiro">("recarga");
  const [walletAmount, setWalletAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"transferencia" | "tarjeta">("transferencia");
  const [retiroMethod, setRetiroMethod] = useState<"transferencia" | "payphone" | "deuna">("transferencia");
  const [sendingRetiro, setSendingRetiro] = useState(false);
  const [retiroSent, setRetiroSent] = useState(false);
  const [payingCard, setPayingCard] = useState(false);
  const [showPayphoneBox, setShowPayphoneBox] = useState(false);
  const [transferCode, setTransferCode] = useState("");
  const [sendingTransfer, setSendingTransfer] = useState(false);
  const [transferSent, setTransferSent] = useState(false);
  const [payphoneClientId, setPayphoneClientId] = useState("");
  // Perfil state
  const [profileForm, setProfileForm] = useState({
  nombre: "", apellido: "", cedula: "", celular: "", pais: "Ecuador", ciudad: "", direccion: "",
  banco: "", numero_cuenta: "", tipo_cuenta: "", provincia: ""
 });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
const showToast = (message: string, type: "success" | "error" | "info" = "success") => setToast({ message, type });

  const loadPanel = async () => {
    const token = localStorage.getItem("token");
    console.log("Token en loadPanel:", token ? "existe" : "NO existe");
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
      const token2 = localStorage.getItem("token");
      const payload2 = JSON.parse(atob(token2!.split(".")[1]));
      const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", payload2.id)
      .or("payment_method.eq.transferencia,payment_method.eq.tarjeta,payment_method.is.null")
      .order("created_at", { ascending: false });

      setUser(meData);
      setBets(betsData || []);
      setRanking(rankData || []);
      setTransactions(txData || []);
      setProfileForm({
  nombre: meData.nombre || "",
  apellido: meData.apellido || "",
  cedula: meData.cedula || "",
  celular: meData.celular || "",
  pais: meData.pais || "Ecuador",
  ciudad: meData.ciudad || "",
  direccion: meData.direccion || "",
  banco: meData.banco || "",
  numero_cuenta: meData.numero_cuenta || "",
  tipo_cuenta: meData.tipo_cuenta || "",
  provincia: meData.provincia || "",
 });

 const configRes = await fetch("https://predicciones-ecuador.onrender.com/config");
const configData = await configRes.json();
setBankConfig(configData);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

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

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("https://predicciones-ecuador.onrender.com/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000); showToast("Perfil guardado correctamente", "success"); loadPanel(); }
    } finally { setSavingProfile(false); }
  };

  const handleSolicitarRetiro = async () => {
  if (!walletAmount || parseFloat(walletAmount) < 10) return;
  setSendingRetiro(true);
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/withdrawal", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: parseFloat(walletAmount), method: retiroMethod }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message);
    setRetiroSent(true);
    setWalletAmount("");
    setTimeout(() => setRetiroSent(false), 4000);
    showToast("Solicitud de retiro enviada correctamente", "success");
    loadPanel();
  } finally {
    setSendingRetiro(false);
  }
};

  const handleSendTransfer = async () => {
  if (!transferCode.trim() || !walletAmount || parseFloat(walletAmount) < 1) return;
  setSendingTransfer(true);
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: walletAmount, transfer_code: transferCode.trim() }),
    });
    if (res.ok) {
      setTransferSent(true);
      setTransferCode("");
      setWalletAmount("");
      setTimeout(() => setTransferSent(false), 4000);
      showToast("Comprobante enviado, será procesado en menos de 24 horas", "info");
      loadPanel();
    } else {
      const data = await res.json();
      showToast(data.message || "Error al enviar comprobante", "error");
    }
  } finally {
    setSendingTransfer(false);
  }
};

  

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
        </div>
      </main>
    );
  }

  const totalBet = bets.reduce((acc, bet) => acc + Number(bet.amount), 0);
  const totalBets = bets.length;
  const userRankIndex = ranking.findIndex((r) => r.email === user?.email);
  const isGoogleUser = user?.provider === "google";
  const hasPaymentInfo = user?.cedula && user?.celular && user?.nombre;

  // Movimientos unificados (por ahora solo apuestas, luego se agregan recargas/retiros)
  const movimientos = [
  ...bets.map((bet) => ({
    id: bet.id,
    tipo: "apuesta",
    descripcion: bet.markets?.question || "Mercado",
    subtipo: bet.type === "yes" ? "Sí" : "No",
    monto: -Number(bet.amount),
    fecha: bet.created_at,
    estado: bet.markets?.resolved
      ? bet.markets?.winner === bet.type ? "ganada" : "perdida"
      : "pendiente",
  })),
  ...transactions.map((tx) => ({
    id: tx.id,
    tipo: tx.type,
    descripcion: tx.type === "recarga" ? "Recarga de saldo" : "Retiro de saldo",
    subtipo: tx.payment_method === "transferencia" ? "Transferencia" : "Tarjeta",
    monto: tx.type === "recarga" ? Number(tx.amount) : -Number(tx.amount),
    fecha: tx.created_at,
    estado: tx.status,
  })),
 ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const tabs = [
    { id: "inicio", label: "Inicio", icon: <Home size={15} /> },
    { id: "movimientos", label: "Movimientos", icon: <BarChart3 size={15} /> },
    { id: "wallet", label: "Wallet", icon: <Wallet size={15} /> },
    { id: "perfil", label: "Perfil", icon: <User size={15} /> },
  ];

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-[13px] font-medium transition-all ${
          toast.type === "success" ? "bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
          : toast.type === "error" ? "bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400"
          : "bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
        }`}>
          <span>{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Hero */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500 text-white font-bold text-2xl grid place-items-center shrink-0">
                {(user.nombre || user.email)?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold">
                  {user.nombre ? `${user.nombre} ${user.apellido || ""}`.trim() : user.email}
                </p>
                <p className="text-sm text-slate-400">{user.email}</p>
                {isGoogleUser && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full mt-1">
                    Google Account
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {userRankIndex !== -1 && (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-xl">
                  <Trophy size={14} className="text-amber-500" />
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">#{userRankIndex + 1}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl">
                <Wallet size={14} className="text-emerald-500" />
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{user.points} $</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
  setTabVisible(false);
  setTimeout(() => {
    setTab(t.id as Tab);
    setTabVisible(true);
  }, 150);
 }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
        
        <div style={{ opacity: tabVisible ? 1 : 0, transform: tabVisible ? "translateY(0)" : "translateY(6px)", transition: "opacity 0.15s ease, transform 0.15s ease" }}>

        {/* ===== TAB: INICIO ===== */}
        {tab === "inicio" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
  {[
    { label: "Puntos", value: `${user.points}`, icon: <Wallet size={12} />, color: "text-emerald-500" },
    { label: "Apuestas", value: totalBets, icon: <BarChart3 size={12} />, color: "text-blue-500" },
    { label: "Apostado", value: `${totalBet.toFixed(0)}$`, icon: <ArrowUpRight size={12} />, color: "text-amber-500" },
    { label: "Ranking", value: userRankIndex !== -1 ? `#${userRankIndex + 1}` : "—", icon: <Trophy size={12} />, color: "text-rose-500" },
  ].map((stat) => (
    <div key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
  <div className={`flex items-center gap-1.5 ${stat.color}`}>
    {stat.icon}
    <p className="text-base font-bold text-slate-900 dark:text-white">{stat.value}</p>
  </div>
  <p className="text-[10px] text-slate-400 mt-1">{stat.label}</p>
</div>
  ))}
 </div>

            {/* Últimos movimientos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Últimos movimientos</h2>
                <button onClick={() => setTab("movimientos")} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1">
                  Ver todos <ChevronRight size={12} />
                </button>
              </div>
              {movimientos.length === 0 ? (
                <div className="py-6 text-center space-y-3">
                  <p className="text-2xl">🎯</p>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">¡Haz tu primera predicción!</p>
                  <p className="text-xs text-slate-400">Todavía no tienes movimientos. Explora los mercados y empieza a predecir.</p>
                  <Link href="/" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold px-4 py-2 rounded-xl transition active:scale-[0.99]">
                    Ver mercados <ArrowUpRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {movimientos.slice(0, 5).map((mov) => (
                    <MovimientoRow key={mov.id} mov={mov} />
                  ))}
                </div>
              )}
            </div>

            {/* Ranking */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <h2 className="font-bold mb-4">Ranking Global</h2>
              <div className="space-y-2">
                {ranking.slice(0, 10).map((item, index) => {
                  const isMe = item.email === user?.email;
                  const nombre = item.nombre ? `${item.nombre}${item.apellido ? " " + item.apellido : ""}` : item.email;
                  return (
                    <div key={index} className={`flex items-center justify-between px-4 py-3 rounded-xl ${isMe ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" : "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-sm font-bold shrink-0 w-6 ${index === 0 ? "text-amber-400" : index === 1 ? "text-slate-400" : index === 2 ? "text-amber-600" : "text-slate-400 dark:text-slate-500"}`}>
                          {index + 1}
                        </span>
                        <span className="text-sm truncate">{nombre} {isMe && <span className="text-emerald-500 text-xs">(tú)</span>}</span>
                      </div>
                      <span className="text-sm font-semibold shrink-0">{item.points} $</span>
                    </div>
                  );
                })}
                {userRankIndex > 9 && (
                  <>
                    <div className="flex items-center justify-center py-1">
                      <span className="text-xs text-slate-300 dark:text-slate-600">• • •</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-bold shrink-0 w-6 text-slate-400 dark:text-slate-500">
                          {userRankIndex + 1}
                        </span>
                        <span className="text-sm truncate">
                          {ranking[userRankIndex]?.nombre
                            ? `${ranking[userRankIndex].nombre} ${ranking[userRankIndex].apellido || ""}`.trim()
                            : ranking[userRankIndex]?.email}
                          <span className="text-emerald-500 text-xs ml-1">(tú)</span>
                        </span>
                      </div>
                      <span className="text-sm font-semibold shrink-0">{ranking[userRankIndex]?.points} $</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: MOVIMIENTOS ===== */}
        {tab === "movimientos" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="font-bold mb-1">Historial de movimientos</h2>
            <p className="text-xs text-slate-400 mb-5">Apuestas, recargas y retiros</p>
            {movimientos.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Sin movimientos aún</p>
            ) : (
              <div className="space-y-2">
                {movimientos.map((mov) => (
                  <MovimientoRow key={mov.id} mov={mov} full />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: WALLET ===== */}
        {tab === "wallet" && (
          <div className="space-y-4">

            {/* Balance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
              <p className="text-sm text-slate-400 mb-1">Balance disponible</p>
              <p className="text-4xl font-bold text-emerald-500">{user.points}</p>
              <p className="text-sm text-slate-400 mt-1">puntos</p>
            </div>

            {/* Toggle Recarga / Retiro */}
            <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1">
              <button
                onClick={() => setWalletAction("recarga")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${walletAction === "recarga" ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
              >
                <ArrowDownLeft size={15} /> Recargar
              </button>
              <button
                onClick={() => setWalletAction("retiro")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${walletAction === "retiro" ? "bg-rose-500 text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
              >
                <ArrowUpLeft size={15} /> Retirar
              </button>
            </div>

            {/* Recarga */}
            {walletAction === "recarga" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
                <div>
                  <h3 className="font-bold mb-1">Recargar puntos</h3>
                  <p className="text-xs text-slate-400">Transfiere al número de cuenta y envía el comprobante</p>
                </div>

                

                {/* Monto */}
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">Monto a recargar</label>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[5, 10, 20, 50, 100].map((v) => (
                      <button key={v} onClick={() => setWalletAmount(String(v))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${walletAmount === String(v) ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
                        ${v}
                      </button>
                    ))}
                  </div>
                  <input type="number" placeholder="Otro monto..." value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition" />
                </div>

                {/* Selector método de pago */}
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">Método de recarga</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentMethod("transferencia")}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${paymentMethod === "transferencia" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}
                    >
                      Transferencia
                    </button>
                    <button
                      onClick={() => setPaymentMethod("tarjeta")}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${paymentMethod === "tarjeta" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}
                    >
                      💳 Tarjeta
                    </button>
                  </div>
                </div>

                {paymentMethod === "transferencia" && (
  <>

  {/* Datos de pago */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Datos de transferencia</p>
                  {[
  { label: "Banco", value: bankConfig?.banco_nombre || "—" },
  { label: "Tipo de cuenta", value: bankConfig?.banco_tipo || "—" },
  { label: "Número de cuenta", value: bankConfig?.banco_cuenta || "—" },
  { label: "Titular", value: bankConfig?.banco_titular || "—" },
  { label: "Cédula", value: bankConfig?.banco_cedula || "—" },
].map((item) => (
  <div key={item.label} className="flex justify-between items-center text-sm">
    <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
    <span className="font-medium">{item.value}</span>
  </div>
))}
                </div>


    {/* Explicación número de comprobante */}
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-widest">¿Dónde encuentro el número de comprobante?</p>
      <p className="text-xs text-blue-600 dark:text-blue-400">
        Después de realizar la transferencia, el banco te muestra un <strong>comprobante de pago</strong>. Busca el número que aparece como:
      </p>
      <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-none">
        <li>🏦 <strong>Pichincha:</strong> "Número de operación"</li>
        <li>🏦 <strong>Pacífico:</strong> "Número de transacción"</li>
        <li>🏦 <strong>Produbanco:</strong> "Código de transacción"</li>
        <li>🏦 <strong>Guayaquil:</strong> "Número de referencia"</li>
        <li>🏦 <strong>Otros bancos:</strong> "Número de control" o "Código de operación"</li>
      </ul>
      <p className="text-xs text-blue-600 dark:text-blue-400">Puedes encontrarlo en el <strong>correo de confirmación</strong> o en el <strong>historial de tu app bancaria</strong>.</p>
    </div>

    {/* Input número de comprobante */}
    <div>
      <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">Número de comprobante</label>
      <input
        type="text"
        placeholder="Ej: 0034521789"
        value={transferCode}
        onChange={(e) => setTransferCode(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition"
      />
    </div>

    {transferSent ? (
      <div className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl py-3 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
        <Check size={15} /> Comprobante enviado — aparecerá como pendiente en tus movimientos
      </div>
    ) : (
      <button
        onClick={handleSendTransfer}
        disabled={sendingTransfer || !transferCode.trim() || !walletAmount || parseFloat(walletAmount) < 1}
        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.99]"
      >
        {sendingTransfer ? "Enviando..." : "Enviar comprobante"}
      </button>
    )}
    <p className="text-xs text-slate-400 text-center">Tu recarga será procesada en menos de 24 horas hábiles</p>
  </>
 )}

                {paymentMethod === "tarjeta" && (
                  <>
                    {!showPayphoneBox ? (
                      <button
                        onClick={async () => {
                          console.log("Click pagar", { walletAmount, userId: user.id });
                          if (!walletAmount || parseFloat(walletAmount) < 1) return;
                          const clientId = `${user.id}-${Date.now()}`;
                          console.log("ClientId generado:", clientId);
                          setPayphoneClientId(clientId);
                          const token = localStorage.getItem("token");
                          await fetch("https://predicciones-ecuador.onrender.com/payphone/prepare", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                            body: JSON.stringify({ 
                              amount: parseFloat(walletAmount),
                              clientTransactionId: clientId,
                            }),
                          });
                          setShowPayphoneBox(true);
                        }}
                        disabled={!walletAmount || parseFloat(walletAmount) < 1}
                        className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.99]"
                      >
                        Pagar ${walletAmount || "0"} con tarjeta
                      </button>
                    ) : (
                      <div>
                        <PayphoneBox
                          amount={Math.round(parseFloat(walletAmount) * 100)}
                          userId={user.id}
                          clientTransactionId={payphoneClientId}
                          onClose={() => setShowPayphoneBox(false)}
                        />
                      </div>
                    )}
                    <p className="text-xs text-slate-400 text-center">Pago seguro procesado por Payphone</p>
                  </>
                )}
              </div>
            )}

            {/* Retiro */}
{walletAction === "retiro" && (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
    <div>
      <h3 className="font-bold mb-1">Retirar puntos</h3>
      <p className="text-xs text-slate-400">Los retiros se procesan en 1-3 días hábiles</p>
    </div>

    {/* Método de retiro */}
<div>
  <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">¿Cómo deseas recibir tu dinero?</label>
  <div className="space-y-2">
    {[
      { id: "transferencia", label: "Transferencia bancaria", desc: "Recibes en tu cuenta bancaria registrada", icon: "🏦" },
      { id: "payphone", label: "Payphone", desc: "Recibes en tu cuenta Payphone", icon: "💳" },
      { id: "deuna", label: "Deuna", desc: "Recibes vía tu número de celular", icon: "⚡" },
    ].map((m) => (
      <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${retiroMethod === m.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700"}`}>
        <input
          type="radio"
          name="retiroMethod"
          value={m.id}
          checked={retiroMethod === m.id}
          onChange={() => setRetiroMethod(m.id as any)}
          className="accent-emerald-500"
        />
        <span className="text-lg">{m.icon}</span>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{m.label}</p>
          <p className="text-xs text-slate-400">{m.desc}</p>
        </div>
      </label>
    ))}
  </div>
 </div>

                {/* Advertencia Google sin info */}
                {isGoogleUser && !hasPaymentInfo && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Completa tu perfil</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Para retirar necesitas completar tu información personal. Ve a la pestaña Perfil.</p>
                      <button onClick={() => setTab("perfil")} className="text-xs text-amber-700 dark:text-amber-400 font-semibold underline mt-2">
                        Ir a Perfil →
                      </button>
                    </div>
                  </div>
                )}

                {/* Monto */}
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">Monto a retirar</label>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[5, 10, 20, 50, 100].map((v) => (
                      <button key={v} onClick={() => setWalletAmount(String(v))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${walletAmount === String(v) ? "bg-rose-500 text-white border-rose-500" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
                        ${v}
                      </button>
                    ))}
                  </div>
                  <input type="number" placeholder="Otro monto..." value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-rose-500 transition" />
                </div>

                {/* Info de cobro actual */}
                {hasPaymentInfo && (
                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Cuenta de destino</p>
                    <p className="text-sm font-medium">{user.nombre} {user.apellido}</p>
                    <p className="text-sm text-slate-400">Cédula: {user.cedula}</p>
                    <p className="text-sm text-slate-400">Celular: {user.celular}</p>
                    <button onClick={() => setTab("perfil")} className="text-xs text-slate-400 hover:text-slate-600 underline">Editar información</button>
                  </div>
                )}

                {/* Datos bancarios del usuario */}
{user.banco && user.numero_cuenta ? (
  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Datos de retiro</p>
    <p className="text-sm font-medium">{user.nombre} {user.apellido}</p>
    <p className="text-sm text-slate-400">Cédula: {user.cedula}</p>
    <p className="text-sm text-slate-400">{user.banco} · {user.tipo_cuenta} · {user.numero_cuenta}</p>
    <p className="text-sm text-slate-400">Celular: {user.celular}</p>
    <button onClick={() => setTab("perfil")} className="text-xs text-slate-400 hover:text-slate-600 underline">Editar información</button>
  </div>
) : (
  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
    <div>
      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Completa tus datos bancarios</p>
      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Para retirar necesitas agregar tu banco y número de cuenta en tu perfil.</p>
      <button onClick={() => setTab("perfil")} className="text-xs text-amber-700 dark:text-amber-400 font-semibold underline mt-2">Ir a Perfil →</button>
    </div>
  </div>
)}

{retiroSent ? (
  <div className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl py-3 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
    <Check size={15} /> Solicitud enviada — aparecerá como pendiente en tus movimientos
  </div>
) : (
  <button
    onClick={handleSolicitarRetiro}
    disabled={sendingRetiro || !user.banco || !user.numero_cuenta || !walletAmount || parseFloat(walletAmount) < 10}
    className="w-full bg-rose-500 hover:bg-rose-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.99]"
  >
    {sendingRetiro ? "Enviando..." : "Solicitar retiro"}
  </button>
)}
<p className="text-xs text-slate-400 text-center">Mínimo de retiro: 10 puntos</p>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: PERFIL ===== */}
        {tab === "perfil" && (
          <div className="space-y-4">

            {/* Aviso Google */}
            {isGoogleUser && !hasPaymentInfo && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Cuenta de Google detectada</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Completa tu información personal para poder realizar retiros.</p>
                </div>
              </div>
            )}

            {/* Info de cuenta */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold">Información de cuenta</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Email", value: user.email, disabled: true },
                  { label: "Rol", value: user.role, disabled: true },
                  { label: "Estado", value: user.suspended ? "Suspendido" : "Activo", disabled: true },
                  { label: "Miembro desde", value: new Date(user.created_at).toLocaleDateString(), disabled: true },
                ].map((item) => (
                  <div key={item.label}>
                    <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">{item.label}</label>
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

           {/* Información personal */}
<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="font-bold">Información personal</h3>
    <button
      onClick={() => setEditingProfile((prev) => !prev)}
      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
    >
      <Settings size={12} /> {editingProfile ? "Cancelar" : "Editar información"}
    </button>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {[
      { key: "nombre", label: "Nombre" },
      { key: "apellido", label: "Apellido" },
      { key: "cedula", label: "Cédula / Pasaporte" },
      { key: "celular", label: "Celular" },
      { key: "pais", label: "País" },
      { key: "ciudad", label: "Ciudad" },
      { key: "banco", label: "Banco" },
      { key: "numero_cuenta", label: "Número de cuenta" },
    ].map((field) => (
      <div key={field.key}>
        <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">{field.label}</label>
        {editingProfile ? (
  field.key === "pais" ? (
  <input
    value="Ecuador"
    disabled
    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed"
  />
  ) : (
    <input
      value={(profileForm as any)[field.key]}
      onChange={(e) => setProfileForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition text-slate-900 dark:text-white"
    /> 
  )

        ) : (
          <div className={`px-4 py-3 rounded-xl text-sm border ${(user as any)[field.key] ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-500 dark:text-amber-400"}`}>
            {field.key === "pais" ? ((user as any)[field.key] || "Ecuador") : ((user as any)[field.key] || "Sin completar")}
          </div>
        )}
      </div>
    ))}
  </div>

  {/* Provincia */}
<div>
  <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Provincia</label>
  {editingProfile ? (
    <select
      value={profileForm.provincia}
      onChange={(e) => setProfileForm((prev) => ({ ...prev, provincia: e.target.value }))}
      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition text-slate-900 dark:text-white"
    >
      <option value="">Seleccionar...</option>
      {["Azuay","Bolívar","Cañar","Carchi","Chimborazo","Cotopaxi","El Oro","Esmeraldas","Galápagos","Guayas","Imbabura","Loja","Los Ríos","Manabí","Morona Santiago","Napo","Orellana","Pastaza","Pichincha","Santa Elena","Santo Domingo de los Tsáchilas","Sucumbíos","Tungurahua","Zamora Chinchipe"].map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  ) : (
    <div className={`px-4 py-3 rounded-xl text-sm border ${user.provincia ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-500 dark:text-amber-400"}`}>
      {user.provincia || "Sin completar"}
    </div>
  )}
 </div>

  {/* Tipo de cuenta */}
  <div>
    <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Tipo de cuenta</label>
    {editingProfile ? (
      <select
        value={profileForm.tipo_cuenta}
        onChange={(e) => setProfileForm((prev) => ({ ...prev, tipo_cuenta: e.target.value }))}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition text-slate-900 dark:text-white"
      >
        <option value="">Seleccionar...</option>
        <option value="ahorros">Ahorros</option>
        <option value="corriente">Corriente</option>
      </select>
    ) : (
      <div className={`px-4 py-3 rounded-xl text-sm border ${user.tipo_cuenta ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-500 dark:text-amber-400"}`}>
        {user.tipo_cuenta || "Sin completar"}
      </div>
    )}
  </div>

  {/* Dirección */}
  <div>
    <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Dirección</label>
    {editingProfile ? (
      <input
        value={profileForm.direccion}
        onChange={(e) => setProfileForm((prev) => ({ ...prev, direccion: e.target.value }))}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition text-slate-900 dark:text-white"
      />
    ) : (
      <div className={`px-4 py-3 rounded-xl text-sm border ${user.direccion ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-500 dark:text-amber-400"}`}>
        {user.direccion || "Sin completar"}
      </div>
    )}
  </div>

  {editingProfile && (
    <button
      onClick={async () => { await handleSaveProfile(); setEditingProfile(false); }}
      disabled={savingProfile}
      className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.99] flex items-center justify-center gap-2"
    >
      {profileSaved ? <><Check size={15} /> Guardado</> : savingProfile ? "Guardando..." : "Guardar cambios"}
    </button>
  )}
 </div>

          </div>
        )}

        </div>
      </div>
    </main>
  );
}

 function PayphoneBox({ amount, userId, clientTransactionId, onClose }: { amount: number; userId: string; clientTransactionId: string; onClose: () => void }) {

  useEffect(() => {
    // Cargar CSS de Payphone
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.css";
    document.head.appendChild(link);

    // Cargar JS de Payphone
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.js";
    script.onload = () => {
      setTimeout(() => {
        try {
          // @ts-ignore
          const ppb = new window.PPaymentButtonBox({
            token: "ouTRhGNFATo6jNYHkr-NNnRwhRL6Lif2y1pb0-73PKUVZOO5GmckAHoaCewMQ9sT-OpYL2lxOmJgpJQSW3nDJOq-ymeTEX376GqGZnmXSvlE81zjMjiDOhuWGS2MI9pIiBhUFvcv3e3xuBD8KaF6oNF-cSVFRr52smC_0VLzmUbg_JBKmVLaIVSbWDi4nFYmbkn5cIhVsaICDOUfd3Hj6UXmJ_pqP9mXRJ1p272kV5EUD67JIiXYus23ZPm6dRuQaW1IzVPMRW6BfN4dUzw_fFOQtD25NvVPprvO4ltJ9Tmdidne5SiiG-G7xZBteLJPRrxZZnqgLfKQuoExYHfy-zIvELg",
            amount,
            amountWithoutTax: amount,
            amountWithTax: 0,
            tax: 0,
            service: 0,
            tip: 0,
            currency: "USD",
            clientTransactionId,
            reference: "Recarga - Ecuapred",
            storeId: "a4682baf-b1d9-4df4-8ab4-71bc7ba44700",
            lang: "es",
            defaultMethod: "card",
            timeZone: -5,
          }).render("pp-button");
        } catch (e) {
          console.error("Payphone init error:", e);
        }
      }, 500);
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Pago con tarjeta</p>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
      </div>
      <div id="pp-button" className="min-h-[200px]" />
    </div>
  );
}

function MovimientoRow({ mov, full }: { mov: any; full?: boolean }) {
  const icons: Record<string, React.ReactElement> = {
  ganada: <CheckCircle size={14} className="text-emerald-500" />,
  perdida: <XCircle size={14} className="text-rose-500" />,
  pendiente: <Clock size={14} className="text-amber-500" />,
  aprobado: <CheckCircle size={14} className="text-emerald-500" />,
  completado: <CheckCircle size={14} className="text-emerald-500" />,
  rechazado: <XCircle size={14} className="text-rose-500" />,
  procesando: <Clock size={14} className="text-amber-500" />,
  recarga: <ArrowDownLeft size={14} className="text-blue-500" />,
  retiro: <ArrowUpLeft size={14} className="text-rose-500" />,
};
const badges: Record<string, string> = {
  ganada: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  perdida: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  pendiente: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  aprobado: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  completado: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  rechazado: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  procesando: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
};

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid place-items-center shrink-0">
        {icons[mov.estado] || icons.pendiente}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{mov.descripcion}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${badges[mov.estado] || badges.pendiente}`}>
            {mov.estado} · {mov.subtipo}
          </span>
          {full && <span className="text-[10px] text-slate-400">{new Date(mov.fecha).toLocaleDateString()}</span>}
        </div>
      </div>
      <span className={`text-sm font-bold shrink-0 ${mov.estado === "ganada" ? "text-emerald-500" : mov.estado === "perdida" ? "text-rose-500" : "text-slate-400"}`}>
        {mov.estado === "ganada" ? "+" : ""}{Math.abs(mov.monto)} $
      </span>
    </div>
  );

 
}