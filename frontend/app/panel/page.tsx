"use client";
import React from "react";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet, Trophy, BarChart3, ArrowUpRight, Shield,
  TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpLeft,
  User, Settings, Home, ChevronRight, Copy, Check,
  AlertCircle, ExternalLink, Clock, CheckCircle, XCircle
} from "lucide-react";
import Header from "@/components/Header";

type Tab = "inicio" | "movimientos" | "wallet" | "perfil";

export default function PanelPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("inicio");
  const [user, setUser] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Wallet state (maqueta)
  const [walletAction, setWalletAction] = useState<"recarga" | "retiro">("recarga");
  const [walletAmount, setWalletAmount] = useState("");

  // Perfil state
  const [profileForm, setProfileForm] = useState({
    nombre: "", apellido: "", cedula: "", celular: "", pais: "", ciudad: "", direccion: ""
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

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
      setBets(betsData || []);
      setRanking(rankData || []);
      setProfileForm({
        nombre: meData.nombre || "",
        apellido: meData.apellido || "",
        cedula: meData.cedula || "",
        celular: meData.celular || "",
        pais: meData.pais || "",
        ciudad: meData.ciudad || "",
        direccion: meData.direccion || "",
      });
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
      if (res.ok) { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000); loadPanel(); }
    } finally { setSavingProfile(false); }
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
  const movimientos = bets.map((bet) => ({
    id: bet.id,
    tipo: "apuesta",
    descripcion: bet.markets?.question || "Mercado",
    subtipo: bet.type === "yes" ? "Sí" : "No",
    monto: -Number(bet.amount),
    fecha: bet.created_at,
    estado: bet.markets?.resolved
      ? bet.markets?.winner === bet.type ? "ganada" : "perdida"
      : "pendiente",
  })).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const tabs = [
    { id: "inicio", label: "Inicio", icon: <Home size={15} /> },
    { id: "movimientos", label: "Movimientos", icon: <BarChart3 size={15} /> },
    { id: "wallet", label: "Wallet", icon: <Wallet size={15} /> },
    { id: "perfil", label: "Perfil", icon: <User size={15} /> },
  ];

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />

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
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{user.points} pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
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

        {/* ===== TAB: INICIO ===== */}
        {tab === "inicio" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Puntos", value: `${user.points}`, icon: <Wallet size={14} />, color: "text-emerald-500" },
                { label: "Apuestas", value: totalBets, icon: <BarChart3 size={14} />, color: "text-blue-500" },
                { label: "Total apostado", value: `${totalBet.toFixed(0)} pts`, icon: <ArrowUpRight size={14} />, color: "text-amber-500" },
                { label: "Ranking", value: userRankIndex !== -1 ? `#${userRankIndex + 1}` : "—", icon: <Trophy size={14} />, color: "text-rose-500" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                  <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
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
                <p className="text-sm text-slate-400 py-4 text-center">Sin movimientos aún</p>
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
                      <span className="text-sm font-semibold shrink-0">{item.points} pts</span>
                    </div>
                  );
                })}
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

                {/* Datos de pago */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Datos de transferencia</p>
                  {[
                    { label: "Banco", value: "Banco Pichincha" },
                    { label: "Tipo de cuenta", value: "Ahorros" },
                    { label: "Número de cuenta", value: "2209XXXXXXXX" },
                    { label: "Titular", value: "Nombre del Titular" },
                    { label: "Cédula", value: "XXXXXXXXXX" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
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

                <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.99]">
                  Enviar comprobante
                </button>
                <p className="text-xs text-slate-400 text-center">Tu recarga será procesada en menos de 24 horas hábiles</p>
              </div>
            )}

            {/* Retiro */}
            {walletAction === "retiro" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
                <div>
                  <h3 className="font-bold mb-1">Retirar puntos</h3>
                  <p className="text-xs text-slate-400">Los retiros se procesan en 1-3 días hábiles</p>
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

                <button
                  disabled={isGoogleUser && !hasPaymentInfo}
                  className="w-full bg-rose-500 hover:bg-rose-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.99]"
                >
                  Solicitar retiro
                </button>
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

            {/* Editar perfil */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold">Información personal</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "nombre", label: "Nombre" },
                  { key: "apellido", label: "Apellido" },
                  { key: "cedula", label: "Cédula / Pasaporte" },
                  { key: "celular", label: "Celular" },
                  { key: "pais", label: "País" },
                  { key: "ciudad", label: "Ciudad" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">{field.label}</label>
                    <input
                      value={(profileForm as any)[field.key]}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition text-slate-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>

              {/* Dirección full width */}
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Dirección</label>
                <input
                  value={profileForm.direccion}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, direccion: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition text-slate-900 dark:text-white"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {profileSaved ? <><Check size={15} /> Guardado</> : savingProfile ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}

function MovimientoRow({ mov, full }: { mov: any; full?: boolean }) {
  const isPositive = mov.monto > 0;
  const icons: Record<string, React.ReactElement> = {
    ganada: <CheckCircle size={14} className="text-emerald-500" />,
    perdida: <XCircle size={14} className="text-rose-500" />,
    pendiente: <Clock size={14} className="text-amber-500" />,
    recarga: <ArrowDownLeft size={14} className="text-blue-500" />,
    retiro: <ArrowUpLeft size={14} className="text-rose-500" />,
  };
  const badges: Record<string, string> = {
    ganada: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    perdida: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    pendiente: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
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
        {mov.estado === "ganada" ? "+" : ""}{Math.abs(mov.monto)} pts
      </span>
    </div>
  );
}