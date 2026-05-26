"use client";
import React, { Suspense } from "react";
import { authFetch } from "@/lib/authFetch";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Wallet, Trophy, BarChart3, ArrowUpRight, Shield, X,
  TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpLeft,
  User, Settings, Home, ChevronRight, Copy, Check,
  AlertCircle, ExternalLink, Clock, CheckCircle, XCircle,
  Eye, EyeOff,
} from "lucide-react";
import Header from "@/components/Header";

type Tab = "inicio" | "movimientos" | "wallet" | "perfil";

function PanelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("inicio");
  const [movPage, setMovPage] = useState(1);
  const [showBetsDetail, setShowBetsDetail] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [bankConfig, setBankConfig] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

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
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Perfil state
  const [profileForm, setProfileForm] = useState({
  nombre: "", apellido: "", cedula: "", celular: "", pais: "Ecuador", ciudad: "", direccion: "",
  banco: "", numero_cuenta: "", tipo_cuenta: "", provincia: ""
 });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNext, setShowPwNext] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
const showToast = (message: string, type: "success" | "error" | "info" = "success") => setToast({ message, type });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const loadPanel = async () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const headers = { authorization: `Bearer ${token}` };
    try {
      const [meRes, betsRes, rankRes, movRes, configRes, banksRes] = await Promise.all([
        authFetch("https://api.ecuapred.com/me", { headers }),
        authFetch("https://api.ecuapred.com/my-bets", { headers }),
        fetch("https://api.ecuapred.com/ranking"),
        authFetch("https://api.ecuapred.com/my-movements", { headers }),
        authFetch("https://api.ecuapred.com/config", { headers }),
        fetch("https://api.ecuapred.com/bank-accounts"),
      ]);
      if (!meRes.ok) { router.push("/login"); return; }
      const meData = await meRes.json();
      const betsData = betsRes.ok ? await betsRes.json() : [];
      const rankData = rankRes.ok ? await rankRes.json() : [];
      const movData = movRes.ok ? await movRes.json() : [];
      const configData = configRes.ok ? await configRes.json() : null;
      const banksData = banksRes.ok ? await banksRes.json() : [];

      setUser(meData);
      setBets(betsData || []);
      setRanking(rankData || []);
      setMovements(Array.isArray(movData) ? movData : []);
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
      setBankConfig(configData);
      setBankAccounts(Array.isArray(banksData) ? banksData : []);
      setLoading(false);
    } catch (error) {
      router.push("/login");
    }
  };

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "exitoso") showToast("¡Pago completado! Tu saldo será actualizado en breve", "success");
    else if (status === "cancelado") showToast("Pago cancelado", "info");
  }, []);

  useEffect(() => {
    loadPanel();
    const es = new EventSource("https://api.ecuapred.com/events");
    es.addEventListener("bets", () => loadPanel());
    es.addEventListener("transactions", () => loadPanel());
    return () => es.close();
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const token = localStorage.getItem("token");
    try {
      // Los campos de dígitos vacíos deben ir como null, no como ""
      const payload = {
        ...profileForm,
        cedula:        profileForm.cedula?.trim()        || null,
        celular:       profileForm.celular?.trim()       || null,
        numero_cuenta: profileForm.numero_cuenta?.trim() || null,
        tipo_cuenta:   profileForm.tipo_cuenta           || null,
      };
      const res = await fetch("https://api.ecuapred.com/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
        showToast("Perfil guardado correctamente", "success");
        loadPanel();
      } else {
        const data = await res.json();
        showToast(data.message || "Error al guardar perfil", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError(""); setPwSuccess("");
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwError("Completa todos los campos"); return;
    }
    if (pwForm.next.length < 8) {
      setPwError("La nueva contraseña debe tener al menos 8 caracteres"); return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("Las contraseñas no coinciden"); return;
    }
    setSavingPw(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://api.ecuapred.com/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.message || "Error al cambiar contraseña"); return; }
      setPwSuccess("Contraseña actualizada correctamente");
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwSuccess(""), 4000);
    } catch {
      setPwError("Error de conexión");
    } finally {
      setSavingPw(false);
    }
  };

  const handleSolicitarRetiro = async () => {
  if (!walletAmount || parseFloat(walletAmount) < 10 || parseFloat(walletAmount) > Number(user.points)) return;
  setSendingRetiro(true);
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/withdrawal", {
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

  // Comprime imagen con canvas nativo (sin librerías externas)
  const compressImage = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error("Error al comprimir")),
          "image/jpeg", 0.80
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Error al leer imagen")); };
      img.src = objectUrl;
    });

  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  const handleComprobanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast("Solo se permiten imágenes JPG, PNG o WebP", "error");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("La imagen no puede superar 10 MB", "error");
      e.target.value = "";
      return;
    }

    // Verificar dimensiones mínimas para descartar imágenes corruptas o miniaturas
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.width < 100 || img.height < 100) {
        showToast("La imagen es demasiado pequeña. Adjunta una foto legible del comprobante.", "error");
        e.target.value = "";
        return;
      }
      setComprobanteFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setComprobantePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      showToast("No se pudo leer la imagen. Intenta con otro archivo.", "error");
      e.target.value = "";
    };
    img.src = objectUrl;
  };

  const handleSendTransfer = async () => {
  if (!walletAmount || parseFloat(walletAmount) < 1) return;
  if (!comprobanteFile) {
    showToast("Debes adjuntar una foto del comprobante", "error");
    return;
  }
  setSendingTransfer(true);
  try {
    const token = localStorage.getItem("token");
    let comprobanteUrl: string | null = null;

    // 1. Si hay foto, comprimir y subir primero
    if (comprobanteFile) {
      setUploadingImg(true);
      try {
        const compressed = await compressImage(comprobanteFile);
        const formData = new FormData();
        formData.append("file", compressed, "comprobante.jpg");
        const uploadRes = await fetch("https://api.ecuapred.com/upload/comprobante", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          comprobanteUrl = uploadData.url;
        } else {
          let errMsg = "Error al subir la foto. Intenta de nuevo.";
          try { const d = await uploadRes.json(); if (d?.message) errMsg = d.message; } catch {}
          showToast(errMsg, "error");
          return;
        }
      } finally {
        setUploadingImg(false);
      }
    }

    // 2. Enviar la solicitud de recarga con la URL (o solo el código)
    const res = await fetch("https://api.ecuapred.com/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        amount: walletAmount,
        transfer_code: transferCode.trim() || null,
        comprobante_url: comprobanteUrl,
      }),
    });
    if (res.ok) {
      setTransferSent(true);
      setTransferCode("");
      setWalletAmount("");
      setComprobanteFile(null);
      setComprobantePreview(null);
      setTimeout(() => setTransferSent(false), 4000);
      showToast("Comprobante enviado, será procesado en menos de 24 horas", "info");
      loadPanel();
    } else {
      const data = await res.json();
      showToast(data.message || "Error al enviar comprobante", "error");
    }
  } finally {
    setSendingTransfer(false);
    setUploadingImg(false);
  }
};

  

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Avatar + nombre */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
            <div className="space-y-2.5">
              <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-4 w-52 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 pb-0">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-9 w-24 bg-slate-100 dark:bg-slate-900 rounded-t-lg animate-pulse" />
            ))}
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {/* Predicciones recientes */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse shrink-0" />
                <div className="h-5 w-14 bg-slate-200 dark:bg-slate-800 rounded animate-pulse shrink-0" />
              </div>
            ))}
          </div>
          {/* Ranking */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
                <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
                <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const totalBet = bets.reduce((acc, bet) => acc + Number(bet.amount), 0);
  const totalBets = bets.length;
  const userRankIndex = ranking.findIndex((r) => r.id === user?.id);
  const isGoogleUser = user?.provider === "google";
  const hasPaymentInfo = user?.cedula && user?.celular && user?.nombre;

  const MOV_PAGE_SIZE = 10;
  const movTotalPages = Math.ceil(movements.length / MOV_PAGE_SIZE);
  const movPaginated = movements.slice((movPage - 1) * MOV_PAGE_SIZE, movPage * MOV_PAGE_SIZE);

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
          <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100 cursor-pointer"><X size={13} /></button>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Hero */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 pb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-emerald-500 text-white font-bold text-2xl grid place-items-center shrink-0">
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
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{Number(user.points).toFixed(2)} $</span>
              </div>
            </div>
          </div>
          {/* Metadata inferior */}
          <div className="absolute bottom-2 right-4 flex items-center gap-1.5 text-[10px] text-slate-300 dark:text-slate-600">
            {user.role === "admin" && (
              <>
                <span className="text-amber-400 dark:text-amber-500 font-semibold">🛡️ Admin</span>
                <span>·</span>
              </>
            )}
            <span>miembro desde {new Date(user.created_at + "Z").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", year: "numeric" })}</span>
            <span>·</span>
            <span className={user.suspended ? "text-rose-400 dark:text-rose-500" : "text-emerald-400 dark:text-emerald-500"}>
              ● {user.suspended ? "Suspendido" : "Activo"}
            </span>
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
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowBetsDetail(!showBetsDetail)}
                className={`text-left bg-white dark:bg-slate-900 border rounded-xl p-3 transition-all cursor-pointer ${showBetsDetail ? "border-blue-400 dark:border-blue-500 ring-1 ring-blue-400/30" : "border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700"}`}
              >
                <div className="flex items-center gap-1.5 text-blue-500">
                  <BarChart3 size={12} />
                  <p className="text-base font-bold text-slate-900 dark:text-white">{totalBets}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Predicciones</p>
              </button>
              {[
                { label: "Invertido", value: `${totalBet.toFixed(2)}$`, icon: <ArrowUpRight size={12} />, color: "text-amber-500" },
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

            {/* Tarjetas de predicciones */}
            {showBetsDetail && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">Mis predicciones</h2>
                  <button onClick={() => setShowBetsDetail(false)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">Cerrar</button>
                </div>
                {bets.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Aún no tienes predicciones</p>
                ) : (
                  <div className="space-y-3">
                    {bets.map((bet) => {
                      const estado = bet.markets?.resolved
                        ? bet.markets?.winner === bet.type ? "ganada" : "perdida"
                        : "pendiente";
                      return (
                        <Link key={bet.id} href={`/market/${bet.markets?.id}`}
                          className="block p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-emerald-500/40 transition">
                          <p className="text-sm font-medium text-slate-900 dark:text-white mb-2 leading-snug">{bet.markets?.question || "Mercado"}</p>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${bet.type === "yes" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"}`}>
                                {bet.type === "yes" ? "Sí" : "No"}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                estado === "ganada" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                : estado === "perdida" ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                                : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                              }`}>{estado}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{Number(bet.amount).toFixed(2)} $</p>
                              {estado === "ganada" && bet.payout && (
                                <p className="text-[10px] text-emerald-500">+{Number(bet.payout).toFixed(2)} $</p>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Últimos movimientos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Últimos movimientos</h2>
                <button onClick={() => setTab("movimientos")} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer">
                  Ver todos <ChevronRight size={12} />
                </button>
              </div>
              {movements.length === 0 ? (
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
                  {movements.slice(0, 5).map((mov) => (
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
                  const isMe = item.id === user?.id;
                  const nombre = item.nombre ? `${item.nombre}${item.apellido ? " " + item.apellido : ""}` : "Usuario";
                  return (
                    <div key={index} className={`flex items-center justify-between px-4 py-3 rounded-xl ${isMe ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" : "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-sm font-bold shrink-0 w-6 ${index === 0 ? "text-amber-400" : index === 1 ? "text-slate-400" : index === 2 ? "text-amber-600" : "text-slate-400 dark:text-slate-500"}`}>
                          {index + 1}
                        </span>
                        <span className="text-sm truncate">{nombre} {isMe && <span className="text-emerald-500 text-xs">(tú)</span>}</span>
                      </div>
                      <span className="text-sm font-semibold shrink-0">{Number(item.points).toFixed(2)} $</span>
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
                            : "Usuario"}
                          <span className="text-emerald-500 text-xs ml-1">(tú)</span>
                        </span>
                      </div>
                      <span className="text-sm font-semibold shrink-0">{Number(ranking[userRankIndex]?.points).toFixed(2)} $</span>
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
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold">Historial de movimientos</h2>
              <span className="text-xs text-slate-400">{movements.length} registros</span>
            </div>
            <p className="text-xs text-slate-400 mb-5">Predicciones, recargas y retiros</p>
            {movements.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Sin movimientos aún</p>
            ) : (
              <>
                <div className="space-y-2">
                  {movPaginated.map((mov) => (
                    <MovimientoRow key={mov.id} mov={mov} />
                  ))}
                </div>
                {movTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setMovPage((p) => Math.max(1, p - 1))}
                      disabled={movPage === 1}
                      className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                    >
                      ← Anterior
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: movTotalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setMovPage(i + 1)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                            movPage === i + 1
                              ? "bg-emerald-500 text-white shadow-sm scale-[1.05]"
                              : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setMovPage((p) => Math.min(movTotalPages, p + 1))}
                      disabled={movPage === movTotalPages}
                      className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== TAB: WALLET ===== */}
        {tab === "wallet" && (
          <div className="space-y-4">

            {/* Balance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
              <p className="text-sm text-slate-400 mb-1">Balance disponible</p>
              <p className="text-4xl font-bold text-emerald-500">{Number(user.points).toFixed(2)}</p>
              <p className="text-sm text-slate-400 mt-1">$</p>
            </div>

            {/* Toggle Recarga / Retiro */}
            <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1">
              <button
                onClick={() => setWalletAction("recarga")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${walletAction === "recarga" ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
              >
                <ArrowDownLeft size={15} /> Recargar
              </button>
              <button
                onClick={() => setWalletAction("retiro")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${walletAction === "retiro" ? "bg-rose-500 text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
              >
                <ArrowUpLeft size={15} /> Retirar
              </button>
            </div>

            {/* Recarga */}
            {walletAction === "recarga" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
                <div>
                  <h3 className="font-bold mb-1">Recargar saldo</h3>
                  <p className="text-xs text-slate-400">Transfiere al número de cuenta y envía el comprobante</p>
                </div>

                

                {/* Monto */}
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">Monto a recargar</label>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[5, 10, 20, 50, 100].map((v) => (
                      <button key={v} onClick={() => setWalletAmount(String(v))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${walletAmount === String(v) ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
                        ${v}
                      </button>
                    ))}
                  </div>
                  <input type="number" placeholder="Otro monto..." value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition" />
                </div>

                {/* Selector método de pago */}
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">Método de recarga</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentMethod("transferencia")}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all cursor-pointer ${paymentMethod === "transferencia" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}
                    >
                      Transferencia
                    </button>
                    <button
                      onClick={() => setPaymentMethod("tarjeta")}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all cursor-pointer ${paymentMethod === "tarjeta" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}
                    >
                      💳 Tarjeta
                    </button>
                  </div>
                </div>

                {paymentMethod === "transferencia" && (
  <>

  {/* Datos de pago */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Datos de transferencia</p>
                  {bankAccounts.length > 0 ? bankAccounts.map((bank) => (
                    <div key={bank.id} className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{bank.nombre}</p>
                      {[
                        { label: "Tipo de cuenta", value: bank.tipo },
                        { label: "Número de cuenta", value: bank.cuenta },
                        { label: "Titular", value: bank.titular },
                        { label: "Cédula", value: bank.cedula },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                          <span className="font-medium">{item.value || "—"}</span>
                        </div>
                      ))}
                    </div>
                  )) : (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
                      {[
                        { label: "Banco", value: bankConfig?.banco_nombre },
                        { label: "Tipo de cuenta", value: bankConfig?.banco_tipo },
                        { label: "Número de cuenta", value: bankConfig?.banco_cuenta },
                        { label: "Titular", value: bankConfig?.banco_titular },
                        { label: "Cédula", value: bankConfig?.banco_cedula },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                          <span className="font-medium">{item.value || "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
      <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">Número de comprobante <span className="normal-case text-slate-300 dark:text-slate-600">(opcional)</span></label>
      <input
        type="text"
        placeholder="Ej: 0034521789"
        value={transferCode}
        onChange={(e) => setTransferCode(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition"
      />
    </div>

    {/* Foto del comprobante — OBLIGATORIA */}
    <div>
      <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">
        Foto del comprobante <span className="text-rose-400 font-bold">*</span>
      </label>
      {comprobantePreview ? (
        <div className="relative rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-700">
          <img src={comprobantePreview} alt="Comprobante" className="w-full max-h-56 object-contain bg-slate-50 dark:bg-slate-900" />
          <button
            onClick={() => { setComprobanteFile(null); setComprobantePreview(null); }}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 cursor-pointer transition"
          >
            <X size={13} />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-emerald-500/90 py-1.5 text-center text-xs font-semibold text-white flex items-center justify-center gap-1.5">
            <Check size={12} /> Imagen lista · se comprimirá al enviar
          </div>
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center gap-2.5 w-full border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition-all select-none ${
            dragOver
              ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 scale-[1.01]"
              : "border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleComprobanteChange({ target: { files: [file] } } as any);
          }}
        >
          <span className="text-3xl">{dragOver ? "⬇️" : "📎"}</span>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {dragOver ? "Suelta la imagen aquí" : "Adjuntar foto del comprobante"}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Arrastra aquí · o toca para elegir desde galería o archivos
            </p>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
            JPG, PNG · máx 10 MB · se comprime automáticamente
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleComprobanteChange}
          />
        </label>
      )}
    </div>

    {transferSent ? (
      <div className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl py-3 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
        <Check size={15} /> Comprobante enviado — aparecerá como pendiente en tus movimientos
      </div>
    ) : (
      <button
        onClick={handleSendTransfer}
        disabled={sendingTransfer || uploadingImg || !walletAmount || parseFloat(walletAmount) < 1 || !comprobanteFile}
        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.99] flex items-center justify-center gap-2"
      >
        {uploadingImg ? "Subiendo foto..." : sendingTransfer ? "Enviando..." : "Enviar comprobante"}
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
                          if (!walletAmount || parseFloat(walletAmount) < 1) return;
                          const clientId = `${user.id}-${Date.now()}`;
                          setPayphoneClientId(clientId);
                          const token = localStorage.getItem("token");
                          const res = await fetch("https://api.ecuapred.com/payphone/prepare", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                              amount: parseFloat(walletAmount),
                              clientTransactionId: clientId,
                            }),
                          });
                          if (res.ok) {
                            showToast("Redirigiendo al pago con tarjeta...", "info");
                            setShowPayphoneBox(true);
                          } else {
                            showToast("Error al iniciar el pago, intenta de nuevo", "error");
                          }
                        }}
                        disabled={!walletAmount || parseFloat(walletAmount) < 1}
                        className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.99]"
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
      <h3 className="font-bold mb-1">Retirar saldo</h3>
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
                      <button onClick={() => setTab("perfil")} className="text-xs text-amber-700 dark:text-amber-400 font-semibold underline mt-2 cursor-pointer">
                        Ir a Perfil →
                      </button>
                    </div>
                  </div>
                )}

                {/* Monto */}
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">Monto a retirar</label>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[10, 20, 50, 100].filter((v) => v <= Number(user.points)).map((v) => (
                      <button key={v} onClick={() => setWalletAmount(String(v))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${walletAmount === String(v) ? "bg-rose-500 text-white border-rose-500" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
                        ${v}
                      </button>
                    ))}
                  </div>
                  <input type="number" placeholder="Otro monto..." value={walletAmount}
                    min={10} max={Number(user.points)}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-3 text-sm outline-none transition ${parseFloat(walletAmount) > Number(user.points) ? "border-rose-400 dark:border-rose-500 focus:border-rose-500" : "border-slate-200 dark:border-slate-700 focus:border-rose-500"}`} />
                  {parseFloat(walletAmount) > Number(user.points) && (
                    <p className="text-xs text-rose-500 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      Saldo insuficiente. Tu saldo disponible es ${Number(user.points).toFixed(2)}.
                    </p>
                  )}
                </div>

                {/* Info de cobro actual */}
                {hasPaymentInfo && (
                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Cuenta de destino</p>
                    <p className="text-sm font-medium">{user.nombre} {user.apellido}</p>
                    <p className="text-sm text-slate-400">Cédula: {user.cedula}</p>
                    <p className="text-sm text-slate-400">Celular: {user.celular}</p>
                    <button onClick={() => setTab("perfil")} className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer">Editar información</button>
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
    <button onClick={() => setTab("perfil")} className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer">Editar información</button>
  </div>
) : (
  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
    <div>
      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Completa tus datos bancarios</p>
      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Para retirar necesitas agregar tu banco y número de cuenta en tu perfil.</p>
      <button onClick={() => setTab("perfil")} className="text-xs text-amber-700 dark:text-amber-400 font-semibold underline mt-2 cursor-pointer">Ir a Perfil →</button>
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
    className="w-full bg-rose-500 hover:bg-rose-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.99]"
  >
    {sendingRetiro ? "Enviando..." : "Solicitar retiro"}
  </button>
)}
<p className="text-xs text-slate-400 text-center">Mínimo de retiro: 10 $</p>
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

            {/* Información de tu cuenta */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-[15px]">Información de tu cuenta</h3>
                {editingProfile ? (
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-500 dark:text-rose-400 hover:border-rose-400 dark:hover:border-rose-500 transition cursor-pointer"
                  >
                    <X size={12} /> Cancelar
                  </button>
                ) : (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:border-slate-900 dark:hover:border-white hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Editar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* Identidad */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col gap-3">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Identidad</p>
                  <ProfileField label="Correo" value={user.email} userValue={user.email} editing={false} disabled onChange={() => {}} />
                  <ProfileField label="Nombre" value={profileForm.nombre} userValue={user.nombre} editing={editingProfile} onChange={(v) => setProfileForm((p) => ({ ...p, nombre: v }))} />
                  <ProfileField label="Apellido" value={profileForm.apellido} userValue={user.apellido} editing={editingProfile} onChange={(v) => setProfileForm((p) => ({ ...p, apellido: v }))} />
                  <ProfileField label="Cédula / Pasaporte" value={profileForm.cedula} userValue={user.cedula} editing={editingProfile} onChange={(v) => setProfileForm((p) => ({ ...p, cedula: v }))} />
                </div>

                {/* Contacto y banco */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col gap-3">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Contacto y banco</p>
                  <ProfileField label="Celular" value={profileForm.celular} userValue={user.celular} editing={editingProfile} onChange={(v) => setProfileForm((p) => ({ ...p, celular: v }))} />
                  <ProfileField label="Banco" value={profileForm.banco} userValue={user.banco} editing={editingProfile} onChange={(v) => setProfileForm((p) => ({ ...p, banco: v }))} />
                  <ProfileField label="Número de cuenta" value={profileForm.numero_cuenta} userValue={user.numero_cuenta} editing={editingProfile} onChange={(v) => setProfileForm((p) => ({ ...p, numero_cuenta: v }))} />
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Tipo de cuenta</p>
                    {editingProfile ? (
                      <select
                        value={profileForm.tipo_cuenta}
                        onChange={(e) => setProfileForm((p) => ({ ...p, tipo_cuenta: e.target.value }))}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[13px] text-slate-700 dark:text-white outline-none focus:border-emerald-500 transition"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="ahorros">Ahorros</option>
                        <option value="corriente">Corriente</option>
                      </select>
                    ) : (
                      <div className={`px-3 py-2 rounded-lg text-[13px] border ${user.tipo_cuenta ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white" : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400"}`}>
                        {user.tipo_cuenta || "Sin completar"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ubicación */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col gap-3">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ubicación</p>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">País</p>
                    <div className="px-3 py-2 rounded-lg text-[13px] border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white">Ecuador</div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Provincia</p>
                    {editingProfile ? (
                      <select
                        value={profileForm.provincia}
                        onChange={(e) => setProfileForm((p) => ({ ...p, provincia: e.target.value }))}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[13px] text-slate-700 dark:text-white outline-none focus:border-emerald-500 transition"
                      >
                        <option value="">Seleccionar...</option>
                        {["Azuay","Bolívar","Cañar","Carchi","Chimborazo","Cotopaxi","El Oro","Esmeraldas","Galápagos","Guayas","Imbabura","Loja","Los Ríos","Manabí","Morona Santiago","Napo","Orellana","Pastaza","Pichincha","Santa Elena","Santo Domingo de los Tsáchilas","Sucumbíos","Tungurahua","Zamora Chinchipe"].map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    ) : (
                      <div className={`px-3 py-2 rounded-lg text-[13px] border ${user.provincia ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white" : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400"}`}>
                        {user.provincia || "Sin completar"}
                      </div>
                    )}
                  </div>
                  <ProfileField label="Ciudad" value={profileForm.ciudad} userValue={user.ciudad} editing={editingProfile} onChange={(v) => setProfileForm((p) => ({ ...p, ciudad: v }))} />
                  <ProfileField label="Dirección" value={profileForm.direccion} userValue={user.direccion} editing={editingProfile} onChange={(v) => setProfileForm((p) => ({ ...p, direccion: v }))} />
                </div>

              </div>

              {editingProfile && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={async () => { await handleSaveProfile(); setEditingProfile(false); }}
                    disabled={savingProfile}
                    className="flex items-center gap-2 bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg transition disabled:opacity-60 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {savingProfile ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              )}
            </div>

            {/* Cambiar contraseña */}
            {!isGoogleUser && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-[15px]">Cambiar contraseña</h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Elige una contraseña segura de al menos 8 caracteres</p>
                  </div>
                  <Shield size={20} className="text-slate-200 dark:text-slate-700" />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Contraseña actual</p>
                    <div className="relative">
                      <input
                        type={showPwCurrent ? "text" : "password"}
                        placeholder="••••••••"
                        name="current-password"
                        autoComplete="new-password"
                        value={pwForm.current}
                        onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-[13px] text-slate-700 dark:text-white outline-none focus:border-slate-900 dark:focus:border-slate-400 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwCurrent((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                      >
                        {showPwCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Nueva contraseña</p>
                      <div className="relative">
                        <input
                          type={showPwNext ? "text" : "password"}
                          placeholder="••••••••"
                          name="new-password"
                          autoComplete="new-password"
                          value={pwForm.next}
                          onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-[13px] text-slate-700 dark:text-white outline-none focus:border-slate-900 dark:focus:border-slate-400 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwNext((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                        >
                          {showPwNext ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Confirmar contraseña</p>
                      <div className="relative">
                        <input
                          type={showPwConfirm ? "text" : "password"}
                          placeholder="••••••••"
                          name="confirm-password"
                          autoComplete="new-password"
                          value={pwForm.confirm}
                          onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-[13px] text-slate-700 dark:text-white outline-none focus:border-slate-900 dark:focus:border-slate-400 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                        >
                          {showPwConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {pwError && (
                    <div className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2.5">{pwError}</div>
                  )}
                  {pwSuccess && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5 flex items-center gap-2">
                      <Check size={12} /> {pwSuccess}
                    </div>
                  )}
                  <div className="flex justify-end mt-1">
                    <button
                      onClick={handleChangePassword}
                      disabled={savingPw}
                      className="flex items-center gap-2 bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg transition disabled:opacity-60 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {savingPw ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        </div>
      </div>
    </main>
  );
}

function ProfileField({
  label, value, userValue, editing, onChange, disabled = false,
}: {
  label: string;
  value: string;
  userValue?: string;
  editing: boolean;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{label}</p>
      {editing && !disabled ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[13px] text-slate-700 dark:text-white outline-none focus:border-emerald-500 transition"
        />
      ) : (
        <div className={`px-3 py-2 rounded-lg text-[13px] border ${
          disabled || userValue
            ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white"
            : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400"
        }`}>
          {value || (disabled ? "" : "Sin completar")}
        </div>
      )}
    </div>
  );
}

 function PayphoneBox({ amount, userId, clientTransactionId, onClose }: { amount: number; userId: string; clientTransactionId: string; onClose: () => void }) {

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.js";
    script.onload = async () => {
      try {
        const token = localStorage.getItem("token");
        const cfgRes = await fetch("https://api.ecuapred.com/payphone/widget-config", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!cfgRes.ok) throw new Error("No se pudo obtener config de pago");
        const { token: ppToken, storeId } = await cfgRes.json();

        setTimeout(() => {
          try {
            // @ts-ignore
            new window.PPaymentButtonBox({
              token: ppToken,
              amount,
              amountWithoutTax: amount,
              amountWithTax: 0,
              tax: 0,
              service: 0,
              tip: 0,
              currency: "USD",
              clientTransactionId,
              reference: "Recarga - Ecuapred",
              storeId,
              lang: "es",
              defaultMethod: "card",
              timeZone: -5,
            }).render("pp-button");
          } catch (e) {
            console.error("Payphone init error:", e);
          }
        }, 300);
      } catch (e) {
        console.error("Payphone config error:", e);
      }
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
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Cancelar</button>
      </div>
      <div id="pp-button" className="min-h-[200px]" />
    </div>
  );
}

function MovimientoRow({ mov }: { mov: any }) {
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

  const isRechazado = mov.estado === "rechazado";

  const amountColor = isRechazado
    ? "text-slate-400 dark:text-slate-500 line-through"
    : mov.estado === "ganada" || (mov.tipo !== "prediccion" && mov.monto > 0)
    ? "text-emerald-500"
    : mov.estado === "perdida" || mov.monto < 0
    ? "text-rose-500"
    : "text-slate-400";

  const amountLabel = isRechazado
    ? `${mov.monto > 0 ? "+" : ""}${mov.monto.toFixed(2)} $`
    : mov.estado === "ganada"
    ? `+${mov.monto.toFixed(2)} $`
    : mov.tipo === "prediccion"
    ? `-${Math.abs(mov.monto).toFixed(2)} $`
    : `${mov.monto > 0 ? "+" : ""}${mov.monto.toFixed(2)} $`;

  const fecha = new Date(mov.fecha + "Z").toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const bb = mov.balance_before as number;
  const ba = mov.balance_after as number;
  const balanceColor = isRechazado
    ? "text-slate-400 dark:text-slate-500 line-through"
    : ba > bb ? "text-emerald-500" : ba < bb ? "text-rose-500" : "text-slate-500 dark:text-slate-400";

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid place-items-center shrink-0 mt-0.5">
          {icons[mov.estado] || icons.pendiente}
        </div>
        <div className="flex-1 min-w-0">
          {/* Fecha */}
          <p className="text-[10px] text-slate-400 mb-0.5">{fecha}</p>

          {/* Descripción y monto */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate">{mov.descripcion}</p>
            <span className={`text-sm font-bold shrink-0 ${amountColor}`}>{amountLabel}</span>
          </div>

          {/* Badge de estado */}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${badges[mov.estado] || badges.pendiente}`}>
              {mov.estado} · {mov.subtipo}
            </span>
          </div>

          {/* Saldo anterior → actual (y comisión si es inversión) */}
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] flex-wrap">
            <span className="text-slate-400">Ant.:</span>
            <span className="font-medium text-slate-600 dark:text-slate-300">{bb.toFixed(2)} $</span>
            <span className="text-slate-300 dark:text-slate-600">→</span>
            <span className="text-slate-400">Act.:</span>
            <span className={`font-semibold ${balanceColor}`}>{ba.toFixed(2)} $</span>
            {mov.tipo === "prediccion" && mov.commission_paid != null && mov.commission_paid > 0 && (
              <span className="text-slate-400 dark:text-slate-500">· Com.: -{(mov.commission_paid as number).toFixed(2)} $</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PanelPage() {
  return (
    <Suspense>
      <PanelContent />
    </Suspense>
  );
}