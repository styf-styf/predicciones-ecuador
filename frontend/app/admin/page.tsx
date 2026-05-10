"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search, TrendingUp, Trophy, Wallet,
  LogOut, Users, Activity, DollarSign,
  ShieldCheck, ShieldOff, Plus, Minus,
  Settings, X, LayoutDashboard, ChevronRight,
  ArrowUpRight, ArrowDownRight, Circle, Zap, MessageSquare, Newspaper
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ThemeToggle from "@/components/ThemeToggle";

type Section = "overview" | "markets" | "users" | "settings" | "winners" | "transacciones" | "contacto" | "suggestions" | "noticias";

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-[13px] font-medium ${
      type === "success" ? "bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
      : type === "error" ? "bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400"
      : "bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
    }`}>
      <span>{type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}</span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100"><X size={13} /></button>
    </div>
  );
}

// ─── Modal de confirmación ──────────────────────────────────────────────────────
function ConfirmModal({ title, description, confirmLabel = "Confirmar", danger = false, onConfirm, onCancel }: {
  title: string; description?: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
        {description && <p className="text-[13px] text-slate-500 dark:text-white/40 mb-5">{description}</p>}
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-[13px] text-slate-600 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition">
            Cancelar
          </button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition ${
            danger ? "bg-rose-500 hover:bg-rose-400 text-white" : "bg-emerald-500 hover:bg-emerald-400 text-black"
          }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Paginación ────────────────────────────────────────────────────────────────
function usePagination<T>(items: T[], pageSize = 15) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [items.length]);
  const totalPages = Math.ceil(items.length / pageSize);
  const paginated = items.slice((page - 1) * pageSize, page * pageSize);
  return { paginated, page, setPage, totalPages };
}

function PaginationBar({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-3 border-t border-slate-100 dark:border-white/[0.04]">
      <button onClick={() => setPage(page - 1)} disabled={page === 1}
        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-[12px] text-slate-500 dark:text-white/40 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition">
        ← Anterior
      </button>
      <span className="text-[12px] text-slate-400 dark:text-white/30 tabular-nums">{page} / {totalPages}</span>
      <button onClick={() => setPage(page + 1)} disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-[12px] text-slate-500 dark:text-white/40 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition">
        Siguiente →
      </button>
    </div>
  );
}

export default function AdminPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState("deporte");
  const [winners, setWinners] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pointsInput, setPointsInput] = useState<{ [key: string]: string }>({});
  const [charts, setCharts] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<{
    commission: string; welcome_points: string;
    trending_count: number; winners_count: number; autoplay_ms: number;
    banco_nombre: string; banco_tipo: string; banco_cuenta: string; banco_titular: string; banco_cedula: string;
  }>({
    commission: "", welcome_points: "",
    trending_count: 1, winners_count: 1, autoplay_ms: 5000,
    banco_nombre: "", banco_tipo: "", banco_cuenta: "", banco_titular: "", banco_cedula: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMarket, setEditingMarket] = useState<{ id: number, question: string } | null>(null);
  const [refinPrompts, setRefinPrompts] = useState<{ [key: number]: string }>({});
  const [refining, setRefining] = useState<{ [key: number]: boolean }>({});
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionCategories, setSuggestionCategories] = useState<{ [key: number]: string }>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [extensionTokens, setExtensionTokens] = useState<any[]>([]);
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [copiedTokenId, setCopiedTokenId] = useState<number | null>(null);
  const [contactos, setContactos] = useState<any[]>([]);
  const [marketNews, setMarketNews] = useState<any[]>([]);
  const [newsMarketInput, setNewsMarketInput] = useState<{ [key: number]: string }>({});

  // ── Nuevos estados ──
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [modal, setModal] = useState<{
    title: string; description?: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void;
  } | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => setToast({ message, type });
  const openModal = (opts: typeof modal) => setModal(opts);

  // ── Paginación ──
  const filteredMarkets = markets.filter(m => m.question.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.nombre?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const { paginated: paginatedMarkets, page: marketPage, setPage: setMarketPage, totalPages: marketPages } = usePagination(filteredMarkets, 15);
  const { paginated: paginatedUsers, page: userPage, setPage: setUserPage, totalPages: userPages } = usePagination(filteredUsers, 20);
  const { paginated: paginatedWinners, page: winnerPage, setPage: setWinnerPage, totalPages: winnerPages } = usePagination(winners, 20);

  const fetchSuggestions = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/news-suggestions", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setSuggestions(data);
  };

  const handleRefine = async (id: number, currentQuestion: string) => {
    const prompt = refinPrompts[id];
    if (!prompt?.trim()) return;
    const token = localStorage.getItem("token");
    setRefining((prev) => ({ ...prev, [id]: true }));
    const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/news-suggestions/${id}/refine`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ current_question: currentQuestion, refine_prompt: prompt }),
    });
    const data = await res.json();
    if (res.ok) { fetchSuggestions(); setRefinPrompts((prev) => ({ ...prev, [id]: "" })); }
    else showToast(data.message, "error");
    setRefining((prev) => ({ ...prev, [id]: false }));
  };

  const handleSuggestion = async (id: number, action: string) => {
    setLoadingAction(`suggestion-${id}-${action}`);
    const token = localStorage.getItem("token");
    const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/news-suggestions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setLoadingAction(null);
    showToast(data.message, res.ok ? "success" : "error");
    fetchSuggestions();
    if (action !== "reject") { fetchMarkets(); fetchStats(); }
  };

  const fetchMarkets = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/markets", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setMarkets(data);
  };

  const fetchWinners = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/winners", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setWinners(data);
  };

  const fetchStats = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/stats", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setStats(data);
  };

  const fetchCharts = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/charts", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setCharts(data);
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/users", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setUsers(data);
  };

  const fetchExtensionTokens = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/extension-tokens", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setExtensionTokens(data);
  };

  const fetchMarketNews = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/market-news", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setMarketNews(data);
  };

  const fetchContactos = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/contactos", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setContactos(data);
  };

  const fetchTransactions = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/transactions", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setTransactions(data);
  };

  const handleTransactionStatus = async (id: string, status: "aprobado" | "rechazado", userId: string, amount: number, tx: any) => {
    setLoadingAction(`tx-${id}`);
    const token = localStorage.getItem("token");
    const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/transactions/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, userId, amount, type: tx.type }),
    });
    const data = await res.json();
    setLoadingAction(null);
    if (!res.ok) { showToast(data.message || "Error al actualizar", "error"); return; }
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    showToast(status === "aprobado" ? "Transacción aprobada ✅" : "Transacción rechazada", status === "aprobado" ? "success" : "info");
    fetchTransactions(); fetchUsers(); fetchStats();
  };

  const fetchSettings = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/settings", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) {
      setConfig(data);
      setSettingsForm({
        commission: data.commission, welcome_points: data.welcome_points,
        trending_count: data.trending_count ?? 1,
        winners_count: data.winners_count ?? 1,
        autoplay_ms: data.autoplay_ms ?? 5000,
        banco_nombre: data.banco_nombre || "",
        banco_tipo: data.banco_tipo || "",
        banco_cuenta: data.banco_cuenta || "",
        banco_titular: data.banco_titular || "",
        banco_cedula: data.banco_cedula || "",
      });
    }
  };

  const handleSaveSettings = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({
        commission: parseFloat(settingsForm.commission),
        welcome_points: parseFloat(settingsForm.welcome_points),
        trending_count: Number(settingsForm.trending_count ?? 1),
        winners_count: Number(settingsForm.winners_count ?? 1),
        autoplay_ms: Number(settingsForm.autoplay_ms ?? 5000),
        banco_nombre: settingsForm.banco_nombre,
        banco_tipo: settingsForm.banco_tipo,
        banco_cuenta: settingsForm.banco_cuenta,
        banco_titular: settingsForm.banco_titular,
        banco_cedula: settingsForm.banco_cedula,
      }),
    });
    const data = await res.json();
    if (res.ok) { showToast("Configuración guardada ✅", "success"); fetchSettings(); }
    else showToast(data.message || "Error al guardar", "error");
  };

  const loadMe = async () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }
    try {
      const res = await fetch("https://predicciones-ecuador.onrender.com/me", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.role !== "admin") { window.location.href = "/"; return; }
      setIsLogged(true); setIsAdmin(true); setPoints(data.points || 0);
      fetchWinners(); fetchStats(); fetchUsers(); fetchSettings(); fetchCharts(); fetchTransactions(); fetchContactos(); fetchSuggestions(); fetchMarketNews(); fetchExtensionTokens();
    } catch {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  const handleEditMarket = async () => {
    if (!editingMarket || !editingMarket.question.trim()) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/markets/${editingMarket.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ question: editingMarket.question }),
    });
    const data = await res.json();
    if (res.ok) { setEditingMarket(null); fetchMarkets(); showToast("Mercado actualizado", "success"); }
    else showToast(data.message, "error");
  };

  const handleCreateMarket = async () => {
    const token = localStorage.getItem("token");
    if (!newQuestion.trim()) return;
    const res = await fetch("https://predicciones-ecuador.onrender.com/admin/markets", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ question: newQuestion, category: newCategory }),
    });
    const data = await res.json();
    if (res.ok) { setNewQuestion(""); fetchMarkets(); fetchStats(); showToast("Mercado creado ✅", "success"); }
    else showToast(data.message || "Error al crear mercado", "error");
  };

  // Con modal de confirmación
  const handleDeleteMarket = (id: any) => {
    openModal({
      title: "¿Eliminar este mercado?",
      description: "Se borrarán todas las apuestas asociadas. Esta acción es irreversible.",
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: async () => {
        setLoadingAction(`delete-${id}`);
        const token = localStorage.getItem("token");
        const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/markets/${id}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${token}` || "" },
        });
        const data = await res.json();
        setLoadingAction(null);
        if (res.ok) { showToast("Mercado eliminado", "success"); fetchMarkets(); fetchStats(); }
        else showToast(data.message || "Error al eliminar", "error");
      },
    });
  };

  // Con modal de confirmación
  const resolveMarket = (id: number, winner: "yes" | "no") => {
    openModal({
      title: `¿Resolver como "${winner === "yes" ? "Sí" : "No"} gana"?`,
      description: "Esta acción es irreversible y distribuirá los premios a los ganadores.",
      confirmLabel: "Resolver mercado",
      danger: true,
      onConfirm: async () => {
        setLoadingAction(`resolve-${id}`);
        const token = localStorage.getItem("token");
        const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/resolve/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
          body: JSON.stringify({ winner }),
        });
        const data = await res.json();
        setLoadingAction(null);
        showToast(data.message, res.ok ? "success" : "error");
        fetchMarkets(); fetchWinners(); fetchStats();
      },
    });
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    openModal({
      title: `¿Cambiar rol a "${newRole}"?`,
      confirmLabel: "Cambiar rol",
      onConfirm: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/users/${userId}/role`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
          body: JSON.stringify({ role: newRole }),
        });
        const data = await res.json();
        if (res.ok) { fetchUsers(); showToast(`Rol cambiado a ${newRole}`, "success"); }
        else showToast(data.message, "error");
      },
    });
  };

  const handlePoints = async (userId: string, amount: number) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/users/${userId}/points`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ points: amount }),
    });
    const data = await res.json();
    if (res.ok) {
      fetchUsers(); fetchStats();
      setPointsInput((prev) => ({ ...prev, [userId]: "" }));
      showToast(`${amount > 0 ? "+" : ""}${amount} puntos aplicados`, "success");
    } else showToast(data.message, "error");
  };

  const handleSuspend = async (userId: string, suspended: boolean) => {
    openModal({
      title: suspended ? "¿Suspender usuario?" : "¿Activar usuario?",
      description: suspended ? "El usuario no podrá acceder a la plataforma." : "El usuario recuperará el acceso.",
      confirmLabel: suspended ? "Suspender" : "Activar",
      danger: suspended,
      onConfirm: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/users/${userId}/suspend`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
          body: JSON.stringify({ suspended }),
        });
        const data = await res.json();
        if (res.ok) { fetchUsers(); showToast(suspended ? "Usuario suspendido" : "Usuario activado", suspended ? "error" : "success"); }
        else showToast(data.message, "error");
      },
    });
  };

  useEffect(() => {
    fetchMarkets();
    loadMe();

    const es = new EventSource("https://predicciones-ecuador.onrender.com/events");
    es.addEventListener("markets", () => { fetchMarkets(); fetchStats(); });
    es.addEventListener("bets", () => fetchStats());
    es.addEventListener("transactions", () => fetchTransactions());
    es.addEventListener("contactos", () => fetchContactos());
    return () => es.close();
  }, []);

  const navItems = [
    { id: "overview", label: "Resumen", icon: <LayoutDashboard size={15} /> },
    { id: "markets", label: "Mercados", icon: <TrendingUp size={15} />, badge: markets.filter(m => !m.resolved).length },
    { id: "users", label: "Usuarios", icon: <Users size={15} />, badge: users.length },
    { id: "winners", label: "Ganadores", icon: <Trophy size={15} /> },
    { id: "transacciones", label: "Transacciones", icon: <Wallet size={15} />, badge: transactions.filter(t => t.status === "pendiente").length },
    { id: "suggestions", label: "Sugerencias", icon: <Newspaper size={15} />, badge: suggestions.filter(s => s.status === "pending").length },
    { id: "noticias", label: "Noticias", icon: <Newspaper size={15} />, badge: marketNews.filter(n => n.status === "pending").length },
    { id: "contacto", label: "Contacto", icon: <MessageSquare size={15} />, badge: contactos.filter(c => !c.leido).length },
    { id: "settings", label: "Configuración", icon: <Settings size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex" style={{ fontFamily: "'DM Mono', 'Fira Code', monospace" }}>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modal */}
      {modal && (
        <ConfirmModal
          title={modal.title}
          description={modal.description}
          confirmLabel={modal.confirmLabel}
          danger={modal.danger}
          onConfirm={() => { modal.onConfirm(); setModal(null); }}
          onCancel={() => setModal(null)}
        />
      )}

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-60 bg-white dark:bg-[#111111] border-r border-slate-200 dark:border-white/[0.06] z-50 flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 py-5 border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-500 grid place-items-center text-black font-black text-xs">P</div>
            <div>
              <p className="text-[11px] font-bold text-slate-900 dark:text-white tracking-wider uppercase">Predicciones</p>
              <p className="text-[9px] text-slate-400 dark:text-white/30 tracking-widest uppercase">Admin Console</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-700 dark:text-white/30 dark:hover:text-white">
            <X size={14} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id as Section); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                activeSection === item.id
                  ? "bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5 text-[13px]">
                <span className={activeSection === item.id ? "text-emerald-500 dark:text-emerald-400" : ""}>{item.icon}</span>
                {item.label}
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="text-[10px] bg-slate-100 dark:bg-white/[0.08] text-slate-500 dark:text-white/50 px-1.5 py-0.5 rounded-md tabular-nums">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-200 dark:border-white/[0.06] space-y-1">
          <Link href="/" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition text-[13px]">
            <ArrowUpRight size={15} /> Ir al sitio
          </Link>
          <button
            onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("points"); window.location.href = "/login"; }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-rose-500 dark:text-rose-400/70 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/[0.08] transition text-[13px]"
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-slate-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur border-b border-slate-200 dark:border-white/[0.06] px-4 sm:px-6 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white">
            <LayoutDashboard size={18} />
          </button>

          <div className="flex items-center gap-1.5 text-[12px] text-slate-400 dark:text-white/30">
            <span>Admin</span>
            <ChevronRight size={12} />
            <span className="text-slate-700 dark:text-white/70">{navItems.find(n => n.id === activeSection)?.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-2 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 w-48 sm:w-64">
            <Search size={13} className="text-slate-400 dark:text-white/30 shrink-0" />
            <input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none w-full text-[12px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20"
            />
            {searchQuery && <button onClick={() => setSearchQuery("")}><X size={12} className="text-slate-400 dark:text-white/30" /></button>}
          </div>

          <ThemeToggle />

          <div className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 grid place-items-center shrink-0">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">A</span>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 space-y-6 overflow-auto">

          {/* OVERVIEW */}
          {activeSection === "overview" && (
            <>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Resumen general</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">Métricas en tiempo real</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Usuarios totales", value: stats?.totalUsers ?? "—", sub: `+${stats?.newUsersToday ?? 0} hoy`, icon: <Users size={13} />, color: "text-blue-500 dark:text-blue-400", up: true },
                  { label: "Puntos circulando", value: stats?.totalPoints ?? "—", sub: "suma total", icon: <Wallet size={13} />, color: "text-emerald-500 dark:text-emerald-400", up: true },
                  { label: "Total apostado", value: stats?.totalBetted ?? "—", sub: `${stats?.betsToday ?? 0} hoy`, icon: <DollarSign size={13} />, color: "text-amber-500 dark:text-amber-400", up: true },
                  { label: "Mercados activos", value: stats?.activeMarkets ?? "—", sub: `${stats?.closedMarkets ?? 0} cerrados`, icon: <Activity size={13} />, color: "text-rose-500 dark:text-rose-400", up: false },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 hover:border-slate-300 dark:hover:border-white/[0.12] transition">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`${kpi.color} opacity-70`}>{kpi.icon}</span>
                      {kpi.up ? <ArrowUpRight size={12} className="text-emerald-500/50" /> : <ArrowDownRight size={12} className="text-rose-500/50" />}
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
                    <p className="text-[11px] text-slate-500 dark:text-white/30 mt-1">{kpi.label}</p>
                    <p className="text-[10px] text-slate-400 dark:text-white/20 mt-0.5">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {charts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70">Apuestas / día</p>
                        <p className="text-[10px] text-slate-400 dark:text-white/25 mt-0.5">Últimos 7 días</p>
                      </div>
                      <Zap size={13} className="text-emerald-500/50" />
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={charts} barSize={16}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#94a3b820" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
                        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "11px" }} />
                        <Bar dataKey="apuestas" fill="#10b981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70">Volumen ($)</p>
                        <p className="text-[10px] text-slate-400 dark:text-white/25 mt-0.5">Últimos 7 días</p>
                      </div>
                      <TrendingUp size={13} className="text-amber-500/50" />
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={charts}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#94a3b820" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
                        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "11px" }} />
                        <Line type="monotone" dataKey="volumen" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70">Ganadores recientes</p>
                  <button onClick={() => setActiveSection("winners")} className="text-[11px] text-slate-400 dark:text-white/25 hover:text-slate-600 dark:hover:text-white/50 transition flex items-center gap-1">
                    Ver todos <ChevronRight size={11} />
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {winners.slice(0, 5).map((w) => (
                    <div key={w.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[12px] text-slate-600 dark:text-white/60 truncate">{w.users?.email}</p>
                        <p className="text-[11px] text-slate-400 dark:text-white/25 truncate mt-0.5">{w.markets?.question}</p>
                      </div>
                      <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums shrink-0">+{w.reward} $</span>
                    </div>
                  ))}
                  {winners.length === 0 && <p className="px-5 py-8 text-[12px] text-slate-400 dark:text-white/20 text-center">Sin ganadores aún</p>}
                </div>
              </div>

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70">Transacciones pendientes</p>
                  <button onClick={() => setActiveSection("transacciones")} className="text-[11px] text-slate-400 dark:text-white/25 hover:text-slate-600 dark:hover:text-white/50 transition flex items-center gap-1">
                    Ver todas <ChevronRight size={11} />
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {transactions.filter(t => t.status === "pendiente").slice(0, 5).map((tx) => (
                    <div key={tx.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[12px] text-slate-600 dark:text-white/60 truncate">{tx.users?.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-400 dark:text-white/25">{tx.payment_method === "transferencia" ? "🏦 Transferencia" : "💳 Tarjeta"}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">{tx.status}</span>
                        </div>
                      </div>
                      <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums shrink-0">${tx.amount}</span>
                    </div>
                  ))}
                  {transactions.length === 0 && <p className="px-5 py-8 text-[12px] text-slate-400 dark:text-white/20 text-center">Sin transacciones aún</p>}
                </div>
              </div>
            </>
          )}

          {/* MERCADOS */}
          {activeSection === "markets" && (
            <>
              <div>
                <h1 className="text-lg font-bold">Mercados</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">{markets.filter(m => !m.resolved).length} activos · {markets.filter(m => m.resolved).length} cerrados</p>
              </div>

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4">
                <p className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest mb-3">Nuevo mercado</p>
                <div className="flex gap-2">
                  <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateMarket(); }}
                      placeholder="¿Cuál es la pregunta del mercado?"
                      className="flex-1 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2.5 outline-none text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:border-emerald-500/60 transition" />
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                      className="bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2.5 outline-none text-[13px] text-slate-900 dark:text-white focus:border-emerald-500/60 transition shrink-0">
                      <option value="deporte">Deporte</option>
                      <option value="farandula">Farándula</option>
                      <option value="politica">Política</option>
                      <option value="elecciones">Elecciones</option>
                      <option value="pais">País</option>
                    </select>
                  </div>
                  <button onClick={handleCreateMarket} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg px-5 py-2.5 text-[13px] transition active:scale-95">Crear</button>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] hidden sm:block">
                  <div className="grid grid-cols-12 text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest">
                    <span className="col-span-1">#</span>
                    <span className="col-span-4">Pregunta</span>
                    <span className="col-span-2 text-center">Categoría</span>
                    <span className="col-span-2 text-center">Sí / No</span>
                    <span className="col-span-1 text-center">Total</span>
                    <span className="col-span-2 text-right">Acciones</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                  {paginatedMarkets.map((m) => (
                    <div key={m.id} className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                      {/* Desktop */}
                      <div className="hidden sm:grid grid-cols-12 items-center gap-2">
                        <span className="col-span-1 text-[11px] text-slate-300 dark:text-white/20 tabular-nums">{m.id}</span>
                        <div className="col-span-4 flex items-center gap-2 min-w-0">
                          <Circle size={6} className={m.resolved ? "text-slate-300 dark:text-white/20 shrink-0" : "text-emerald-500 dark:text-emerald-400 shrink-0"} fill="currentColor" />
                          {editingMarket?.id === m.id ? (
                            <input
                              value={editingMarket?.question ?? ""}
                              onChange={(e) => setEditingMarket((prev) => prev ? { ...prev, question: e.target.value } : null)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleEditMarket(); if (e.key === "Escape") setEditingMarket(null); }}
                              className="flex-1 bg-slate-100 dark:bg-white/[0.06] border border-emerald-500/40 rounded-lg px-2 py-1 text-[12px] outline-none text-slate-900 dark:text-white"
                              autoFocus
                            />
                          ) : (
                            <p className="text-[12px] text-slate-600 dark:text-white/70 truncate">{m.question}</p>
                          )}
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <select
                            value={m.category || "deporte"}
                            onChange={async (e) => {
                              const token = localStorage.getItem("token");
                              await fetch(`https://predicciones-ecuador.onrender.com/admin/markets/${m.id}/category`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                body: JSON.stringify({ category: e.target.value }),
                              });
                              fetchMarkets();
                            }}
                            className="bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-slate-700 dark:text-white/60 outline-none focus:border-emerald-500/60 transition w-full"
                          >
                            <option value="deporte">Deporte</option>
                            <option value="farandula">Farándula</option>
                            <option value="politica">Política</option>
                            <option value="elecciones">Elecciones</option>
                            <option value="pais">País</option>
                          </select>
                        </div>
                        <div className="col-span-2 flex justify-center gap-1 text-[11px] tabular-nums">
                          <span className="text-emerald-600 dark:text-emerald-400">{m.yes}</span>
                          <span className="text-slate-300 dark:text-white/20">/</span>
                          <span className="text-rose-500 dark:text-rose-400">{m.no}</span>
                        </div>
                        <span className="col-span-1 text-center text-[11px] text-amber-500 dark:text-amber-400 tabular-nums font-bold">{(Number(m.yes) + Number(m.no)).toFixed(1)}</span>
                        <div className="col-span-2 flex justify-end gap-1.5 flex-wrap">
                          {m.resolved ? (
                            <div className="flex items-center gap-1.5">
  <span className="text-[10px] text-slate-400 dark:text-white/25 bg-slate-100 dark:bg-white/[0.04] px-2 py-1 rounded-md">Ganó {m.winner === "yes" ? "Sí ✓" : "No ✗"}</span>
  <button
    onClick={async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/markets/${m.id}/archive`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ archived: !m.archived }),
      });
      const data = await res.json();
      console.log("Archive response:", res.status, data);
      fetchMarkets();
      showToast(m.archived ? "Mercado restaurado" : "Mercado archivado", "info");
    }}
    className={`text-[10px] px-2.5 py-1 rounded-md border transition ${m.archived ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/30 border-slate-200 dark:border-white/[0.08]"}`}
  >
    {m.archived ? "📂 Restaurar" : "🗄️ Archivar"}
  </button>
  <button
    onClick={() => handleDeleteMarket(m.id)}
    disabled={loadingAction === `delete-${m.id}`}
    className="text-[10px] bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 px-2.5 py-1 rounded-md transition disabled:opacity-40"
  >
    {loadingAction === `delete-${m.id}` ? "..." : "🗑️"}
  </button>
 </div>
                          ) : (
                            <>
                              <button
                                onClick={() => resolveMarket(m.id, "yes")}
                                disabled={!!loadingAction}
                                className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-md transition disabled:opacity-40"
                              >
                                {loadingAction === `resolve-${m.id}` ? "..." : "Sí gana"}
                              </button>
                              <button
                                onClick={() => resolveMarket(m.id, "no")}
                                disabled={!!loadingAction}
                                className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 px-2.5 py-1 rounded-md transition disabled:opacity-40"
                              >
                                {loadingAction === `resolve-${m.id}` ? "..." : "No gana"}
                              </button>
                              {editingMarket?.id === m.id ? (
                                <>
                                  <button onClick={handleEditMarket} className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-md transition">✓</button>
                                  <button onClick={() => setEditingMarket(null)} className="text-[10px] bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/30 border border-slate-200 dark:border-white/[0.08] px-2 py-1 rounded-md transition">✕</button>
                                </>
                              ) : (
                                <button onClick={() => setEditingMarket({ id: m.id, question: m.question })} className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 px-2.5 py-1 rounded-md transition">✏️</button>
                              )}
                             
                            </>
                          )}
                        </div>
                      </div>
                      {/* Mobile */}
                      <div className="sm:hidden space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] text-slate-700 dark:text-white/70 leading-snug flex-1">{m.question}</p>
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md ${m.resolved ? "bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/30" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                            {m.resolved ? "Cerrado" : "En vivo"}
                          </span>
                        </div>
                        <div className="flex gap-3 text-[11px]">
                          <span className="text-emerald-600 dark:text-emerald-400">Sí: {m.yes}</span>
                          <span className="text-rose-500 dark:text-rose-400">No: {m.no}</span>
                          <span className="text-amber-500 dark:text-amber-400 font-bold">Total: {(Number(m.yes) + Number(m.no)).toFixed(1)}</span>
                        </div>
<div className="space-y-2">
  {!m.resolved && (
    <>
      {editingMarket?.id === m.id ? (
        <div className="flex gap-1.5">
          <input
            value={editingMarket?.question ?? ""}
            onChange={(e) => setEditingMarket((prev) => prev ? { ...prev, question: e.target.value } : null)}
            className="flex-1 bg-slate-100 dark:bg-white/[0.06] border border-emerald-500/40 rounded-lg px-2 py-1.5 text-[12px] outline-none text-slate-900 dark:text-white"
            autoFocus
          />
          <button onClick={handleEditMarket} className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[11px] font-bold">✓</button>
          <button onClick={() => setEditingMarket(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/30 border border-slate-200 dark:border-white/[0.08] text-[11px]">✕</button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button onClick={() => resolveMarket(m.id, "yes")} className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[11px] font-bold">Sí gana</button>
          <button onClick={() => resolveMarket(m.id, "no")} className="flex-1 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-[11px] font-bold">No gana</button>
          <button onClick={() => setEditingMarket({ id: m.id, question: m.question })} className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-[11px]">✏️</button>
        </div>
      )}
    </>
  )}
  {m.resolved && (
    <div className="flex gap-1.5">
      <button
        onClick={async () => {
          const token = localStorage.getItem("token");
          await fetch(`https://predicciones-ecuador.onrender.com/admin/markets/${m.id}/archive`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
            body: JSON.stringify({ archived: !m.archived }),
          });
          fetchMarkets();
          showToast(m.archived ? "Mercado restaurado" : "Mercado archivado", "info");
        }}
        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium transition ${m.archived ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/30 border-slate-200 dark:border-white/[0.08]"}`}
      >
        {m.archived ? "📂 Restaurar" : "🗄️ Archivar"}
      </button>
      <button onClick={() => handleDeleteMarket(m.id)} className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[11px]">🗑️</button>
    </div>
  )}
</div>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationBar page={marketPage} totalPages={marketPages} setPage={setMarketPage} />
              </div>
            </>
          )}

          {/* USUARIOS */}
          {activeSection === "users" && (
            <>
              <div>
                <h1 className="text-lg font-bold">Usuarios</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">{users.length} registrados</p>
              </div>

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] hidden sm:block">
                  <div className="grid grid-cols-12 text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest">
                    <span className="col-span-3">Email</span>
                    <span className="col-span-2">Nombre</span>
                    <span className="col-span-1 text-center">$</span>
                    <span className="col-span-1 text-center">Rol</span>
                    <span className="col-span-1 text-center">Estado</span>
                    <span className="col-span-2 text-center">Ajustar $</span>
                    <span className="col-span-2 text-right">Acciones</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                  {paginatedUsers.map((u) => (
                    <div key={u.id} className={`px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition ${u.suspended ? "opacity-40" : ""}`}>
                      <div className="hidden sm:grid grid-cols-12 items-center gap-2">
                        <p className="col-span-3 text-[12px] text-slate-500 dark:text-white/60 truncate">{u.email}</p>
                        <p className="col-span-2 text-[12px] text-slate-500 dark:text-white/50 truncate">{u.nombre} {u.apellido}</p>
                        <p className="col-span-1 text-center text-[12px] text-amber-500 dark:text-amber-400 font-bold tabular-nums">{u.points}</p>
                        <div className="col-span-1 flex justify-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${u.role === "admin" ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/30"}`}>{u.role}</span>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${u.suspended ? "bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400" : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"}`}>
                            {u.suspended ? "Susp." : "Activo"}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <input type="number" placeholder="0" value={pointsInput[u.id] || ""}
                            onChange={(e) => setPointsInput((prev) => ({ ...prev, [u.id]: e.target.value }))}
                            className="w-14 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-md px-2 py-1 text-[11px] outline-none text-slate-900 dark:text-white text-center" />
                          <button onClick={() => handlePoints(u.id, parseFloat(pointsInput[u.id] || "0"))} className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition"><Plus size={11} /></button>
                          <button onClick={() => handlePoints(u.id, -parseFloat(pointsInput[u.id] || "0"))} className="p-1 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-500/30 transition"><Minus size={11} /></button>
                        </div>
                        <div className="col-span-2 flex justify-end gap-1.5">
                          <button onClick={() => handleChangeRole(u.id, u.role)} className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition"><ShieldCheck size={12} /></button>
                          <button onClick={() => handleSuspend(u.id, !u.suspended)} className={`p-1.5 rounded-md transition ${u.suspended ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400"}`}><ShieldOff size={12} /></button>
                        </div>
                      </div>
                      {/* Mobile */}
                      <div className="sm:hidden space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[12px] text-slate-700 dark:text-white/70 font-medium truncate">{u.nombre} {u.apellido}</p>
                            <p className="text-[11px] text-slate-400 dark:text-white/30 truncate">{u.email}</p>
                          </div>
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md ${u.suspended ? "bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400" : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"}`}>
                            {u.suspended ? "Susp." : "Activo"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500 dark:text-amber-400 font-bold text-[12px]">{u.points} $</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${u.role === "admin" ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/30"}`}>{u.role}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="number" placeholder="$" value={pointsInput[u.id] || ""}
                            onChange={(e) => setPointsInput((prev) => ({ ...prev, [u.id]: e.target.value }))}
                            className="w-16 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-md px-2 py-1.5 text-[11px] outline-none text-slate-900 dark:text-white text-center" />
                          <button onClick={() => handlePoints(u.id, parseFloat(pointsInput[u.id] || "0"))} className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"><Plus size={12} /></button>
                          <button onClick={() => handlePoints(u.id, -parseFloat(pointsInput[u.id] || "0"))} className="p-1.5 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400"><Minus size={12} /></button>
                          <div className="ml-auto flex gap-1.5">
                            <button onClick={() => handleChangeRole(u.id, u.role)} className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400"><ShieldCheck size={13} /></button>
                            <button onClick={() => handleSuspend(u.id, !u.suspended)} className={`p-1.5 rounded-md ${u.suspended ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400"}`}><ShieldOff size={13} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationBar page={userPage} totalPages={userPages} setPage={setUserPage} />
              </div>
            </>
          )}

          {/* GANADORES */}
          {activeSection === "winners" && (
            <>
              <div>
                <h1 className="text-lg font-bold">Ganadores</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">{winners.length} registros</p>
              </div>
              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] hidden sm:block">
                  <div className="grid grid-cols-12 text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest">
                    <span className="col-span-3">Usuario</span>
                    <span className="col-span-5">Mercado</span>
                    <span className="col-span-1 text-center">Pred.</span>
                    <span className="col-span-2 text-right">Premio</span>
                    <span className="col-span-1 text-right">Fecha</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                  {paginatedWinners.map((w) => (
                    <div key={w.id} className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                      <div className="hidden sm:grid grid-cols-12 items-center gap-2">
                        <p className="col-span-3 text-[12px] text-slate-500 dark:text-white/50 truncate">{w.users?.email}</p>
                        <p className="col-span-5 text-[12px] text-slate-600 dark:text-white/60 truncate">{w.markets?.question}</p>
                        <div className="col-span-1 flex justify-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${w.prediction === "yes" ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400"}`}>
                            {w.prediction === "yes" ? "Sí" : "No"}
                          </span>
                        </div>
                        <p className="col-span-2 text-right text-[12px] text-amber-500 dark:text-amber-400 font-bold tabular-nums">+{w.reward} $</p>
                        <p className="col-span-1 text-right text-[10px] text-slate-400 dark:text-white/20">{new Date(w.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="sm:hidden space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12px] text-slate-500 dark:text-white/50 truncate">{w.users?.email}</p>
                          <span className="text-[12px] text-amber-500 dark:text-amber-400 font-bold shrink-0">+{w.reward} $</span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-white/30 truncate">{w.markets?.question}</p>
                      </div>
                    </div>
                  ))}
                  {winners.length === 0 && <p className="px-5 py-10 text-[12px] text-slate-400 dark:text-white/20 text-center">Sin ganadores registrados</p>}
                </div>
                <PaginationBar page={winnerPage} totalPages={winnerPages} setPage={setWinnerPage} />
              </div>
            </>
          )}

          {/* TRANSACCIONES */}
          {activeSection === "transacciones" && (
            <>
              <div>
                <h1 className="text-lg font-bold">Transacciones</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                  {transactions.filter(t => t.status === "pendiente").length} pendientes · {transactions.length} total
                </p>
              </div>

              {["transferencia", "tarjeta", "retiro"].map((method) => (
                <div key={method} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70 capitalize">
                      {method === "transferencia" ? "🏦 Recargas por transferencia" : method === "tarjeta" ? "💳 Recargas con tarjeta" : "📤 Solicitudes de retiro"}
                    </p>
                    <span className="text-[10px] bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/30 px-2 py-0.5 rounded-md">
                      {transactions.filter(t =>
                        method === "retiro" ? t.type === "retiro" :
                        method === "tarjeta" ? (t.payment_method === "tarjeta" || t.payment_method === null) && t.type === "recarga" :
                        t.payment_method === method && t.type === "recarga"
                      ).length} registros
                    </span>
                  </div>

                  <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.04] hidden sm:block">
                    <div className="grid grid-cols-12 text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest">
                      <span className="col-span-3">Usuario</span>
                      <span className="col-span-2 text-center">Monto</span>
                      {method === "transferencia" && <span className="col-span-2 text-center">Código</span>}
                      {method === "retiro" && <span className="col-span-2 text-center">Banco / Cuenta</span>}
                      <span className={`${method === "transferencia" || method === "retiro" ? "col-span-2" : "col-span-4"} text-center`}>Estado</span>
                      <span className="col-span-2 text-center">Fecha</span>
                      {(method === "transferencia" || method === "retiro") && <span className="col-span-1 text-right">Acción</span>}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                    {transactions.filter(t =>
                      method === "retiro" ? t.type === "retiro" :
                      method === "tarjeta" ? (t.payment_method === "tarjeta" || t.payment_method === null) && t.type === "recarga" :
                      t.payment_method === method && t.type === "recarga"
                    ).length === 0 && (
                      <p className="px-5 py-8 text-[12px] text-slate-400 dark:text-white/20 text-center">Sin registros</p>
                    )}
                    {transactions.filter(t =>
                      method === "retiro" ? t.type === "retiro" :
                      method === "tarjeta" ? (t.payment_method === "tarjeta" || t.payment_method === null) && t.type === "recarga" :
                      t.payment_method === method && t.type === "recarga"
                    ).map((tx) => (
                      <div key={tx.id} className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                        {/* Desktop */}
                        <div className="hidden sm:grid grid-cols-12 items-center gap-2">
                          <div className="col-span-3 min-w-0">
                            <p className="text-[12px] text-slate-600 dark:text-white/60 truncate">{tx.users?.email}</p>
                            <p className="text-[11px] text-slate-400 dark:text-white/25 truncate">{tx.users?.nombre} {tx.users?.apellido}</p>
                          </div>
                          <p className="col-span-2 text-center text-[12px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">${tx.amount}</p>
                          {method === "transferencia" && (
                            <div className="col-span-2 flex justify-center">
                              <span className="text-[11px] bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/50 px-2 py-0.5 rounded-md font-mono">{tx.transfer_code || "—"}</span>
                            </div>
                          )}
                          {method === "retiro" && (
                            <div className="col-span-2 flex flex-col justify-center gap-0.5">
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-white/60">
                                {tx.payment_method === "transferencia" ? "Transferencia" : tx.payment_method === "payphone" ? "Payphone" : "Deuna"}
                              </span>
                              <span className="text-[11px] text-slate-600 dark:text-white/50">{tx.users?.banco || "—"} · {tx.users?.tipo_cuenta || "—"}</span>
                              <span className="text-[11px] font-mono text-slate-400 dark:text-white/30">{tx.users?.numero_cuenta || "—"}</span>
                              <span className="text-[11px] text-slate-400 dark:text-white/30">CI: {tx.users?.cedula || "—"} · 📱 {tx.users?.celular || "—"}</span>
                            </div>
                          )}
                          <div className={`${method === "transferencia" || method === "retiro" ? "col-span-2" : "col-span-4"} flex justify-center`}>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                              tx.status === "aprobado" ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                              tx.status === "rechazado" ? "bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400" :
                              "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            }`}>{tx.status}</span>
                          </div>
                          <p className="col-span-2 text-center text-[10px] text-slate-400 dark:text-white/20">{new Date(tx.created_at).toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                          {(method === "transferencia" || method === "retiro") && (
                            <div className="col-span-1 flex justify-end gap-1">
                              {tx.status === "pendiente" ? (
                                <>
                                  <button
                                    onClick={() => handleTransactionStatus(tx.id, "aprobado", tx.user_id, tx.amount, tx)}
                                    disabled={loadingAction === `tx-${tx.id}`}
                                    className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition text-[10px] font-bold disabled:opacity-40"
                                    title="Aprobar"
                                  >{loadingAction === `tx-${tx.id}` ? "..." : "✓"}</button>
                                  <button
                                    onClick={() => handleTransactionStatus(tx.id, "rechazado", tx.user_id, tx.amount, tx)}
                                    disabled={loadingAction === `tx-${tx.id}`}
                                    className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition text-[10px] font-bold disabled:opacity-40"
                                    title="Rechazar"
                                  >{loadingAction === `tx-${tx.id}` ? "..." : "✕"}</button>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-300 dark:text-white/20">—</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Mobile — ahora con botones para TODOS los tipos incluyendo retiros */}
                        <div className="sm:hidden space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[12px] text-slate-600 dark:text-white/60 truncate">{tx.users?.email}</p>
                              <p className="text-[11px] text-slate-400 dark:text-white/30">{new Date(tx.created_at).toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                            <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">${tx.amount}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            {method === "transferencia" && (
                              <span className="text-[11px] bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/50 px-2 py-0.5 rounded-md font-mono">{tx.transfer_code || "—"}</span>
                            )}
                            {method === "retiro" && (
                              <span className="text-[11px] text-slate-500 dark:text-white/40">{tx.users?.banco || "—"} · {tx.users?.numero_cuenta || "—"}</span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-md ml-auto ${
                              tx.status === "aprobado" ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                              tx.status === "rechazado" ? "bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400" :
                              "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            }`}>{tx.status}</span>
                          </div>
                          {(method === "transferencia" || method === "retiro") && tx.status === "pendiente" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleTransactionStatus(tx.id, "aprobado", tx.user_id, tx.amount, tx)}
                                disabled={loadingAction === `tx-${tx.id}`}
                                className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[11px] font-bold disabled:opacity-40"
                              >{loadingAction === `tx-${tx.id}` ? "..." : "Aprobar"}</button>
                              <button
                                onClick={() => handleTransactionStatus(tx.id, "rechazado", tx.user_id, tx.amount, tx)}
                                disabled={loadingAction === `tx-${tx.id}`}
                                className="flex-1 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[11px] font-bold disabled:opacity-40"
                              >{loadingAction === `tx-${tx.id}` ? "..." : "Rechazar"}</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* SUGERENCIAS */}
          {activeSection === "suggestions" && (
            <>
              <div>
                <h1 className="text-lg font-bold">Sugerencias de noticias</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                  {suggestions.filter(s => s.status === "pending").length} pendientes
                </p>
              </div>

              <div className="space-y-3">
                {suggestions.length === 0 && (
                  <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-10 text-center">
                    <p className="text-[12px] text-slate-400 dark:text-white/20">No hay sugerencias aún. Usa la extensión para enviar noticias.</p>
                  </div>
                )}
                {suggestions.map((s) => (
                  <div key={s.id} className={`bg-white dark:bg-[#111111] border rounded-xl p-5 transition ${
                    s.status === "pending" ? "border-amber-200 dark:border-amber-500/20"
                    : s.status === "approved" ? "border-emerald-200 dark:border-emerald-500/20 opacity-60"
                    : "border-slate-200 dark:border-white/[0.06] opacity-40"
                  }`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug">{s.title}</p>
                        {s.url && (
                          <a href={s.url} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-blue-500 dark:text-blue-400 hover:underline mt-0.5 block truncate">
                            {s.url}
                          </a>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        s.status === "pending" ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : s.status === "approved" ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/30"
                      }`}>
                        {s.status === "pending" ? "Pendiente" : s.status === "approved" ? "Aprobado" : "Rechazado"}
                      </span>
                    </div>

                    {s.summary && (
                      <p className="text-[12px] text-slate-500 dark:text-white/40 mb-4 leading-relaxed border-l-2 border-slate-200 dark:border-white/10 pl-3">
                        {s.summary}
                      </p>
                    )}

                    <div className="space-y-2 mb-4">
                      {s.new_market_question && (
                        <div className="bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200 dark:border-emerald-500/20 rounded-lg px-4 py-3 space-y-3">
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">💡 Mercado sugerido</p>
                          <p className="text-[13px] text-slate-900 dark:text-white font-semibold">{s.new_market_question}</p>
                          {s.status === "pending" && (
                            <div className="flex gap-2 mt-2">
                              <input
                                placeholder="Ej: hazla más específica, cambia el plazo a agosto..."
                                value={refinPrompts[s.id] || ""}
                                onChange={(e) => setRefinPrompts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") handleRefine(s.id, s.new_market_question); }}
                                className="flex-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px] outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:border-emerald-500/40 transition"
                              />
                              <button
                                onClick={() => handleRefine(s.id, s.new_market_question)}
                                disabled={refining[s.id]}
                                className="bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/60 px-3 py-2 rounded-lg text-[12px] transition disabled:opacity-50 shrink-0"
                              >
                                {refining[s.id] ? "⏳" : "✨ Refinar"}
                              </button>
                            </div>
                          )}
                          {s.probability_yes && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Sí {s.probability_yes}%</span>
                                <span className="text-rose-500 dark:text-rose-400 font-bold">No {s.probability_no}%</span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                <div className="bg-emerald-500 transition-all" style={{ width: `${s.probability_yes}%` }} />
                                <div className="bg-rose-500 flex-1" />
                              </div>
                              {s.probability_reasoning && (
                                <p className="text-[11px] text-slate-500 dark:text-white/40 italic">{s.probability_reasoning}</p>
                              )}
                            </div>
                          )}
                          {s.suggested_close_date && (
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-white/40">
                              <span>📅 Fecha sugerida de cierre:</span>
                              <span className="text-slate-700 dark:text-white/60 font-semibold">
                                {new Date(s.suggested_close_date).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {s.resolves_market_id && (
                        <div className="bg-blue-50 dark:bg-blue-500/[0.08] border border-blue-200 dark:border-blue-500/20 rounded-lg px-4 py-3">
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">🔔 Resuelve mercado #{s.resolves_market_id}</p>
                          <p className="text-[13px] text-slate-900 dark:text-white font-medium">
                            Ganó: <span className={s.resolves_as === "yes" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-500 dark:text-rose-400 font-bold"}>
                              {s.resolves_as === "yes" ? "Sí" : "No"}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    {s.status === "pending" && (
                      <div className="flex flex-wrap gap-2">
                        {s.new_market_question && (
  <div className="flex items-center gap-2">
    <select
      value={suggestionCategories[s.id] ?? "deporte"}
      onChange={(e) => setSuggestionCategories((prev) => ({ ...prev, [s.id]: e.target.value }))}
      className="bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-slate-700 dark:text-white/60 outline-none focus:border-emerald-500/60 transition"
    >
      <option value="deporte">Deporte</option>
      <option value="farandula">Farándula</option>
      <option value="politica">Política</option>
      <option value="elecciones">Elecciones</option>
      <option value="pais">País</option>
    </select>
    <button
      onClick={() => handleSuggestion(s.id, "approve_market")}
      disabled={loadingAction === `suggestion-${s.id}-approve_market`}
      className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-4 py-2 rounded-lg text-[12px] font-bold transition disabled:opacity-40"
    >
      {loadingAction === `suggestion-${s.id}-approve_market` ? "Creando..." : "✅ Crear mercado"}
    </button>
  </div>
 )}
                        {s.resolves_market_id && (
                          <button
                            onClick={() => handleSuggestion(s.id, "approve_resolve")}
                            disabled={loadingAction === `suggestion-${s.id}-approve_resolve`}
                            className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-4 py-2 rounded-lg text-[12px] font-bold transition disabled:opacity-40"
                          >
                            {loadingAction === `suggestion-${s.id}-approve_resolve` ? "Resolviendo..." : "🔔 Resolver mercado"}
                          </button>
                        )}
                        <button
                          onClick={() => handleSuggestion(s.id, "reject")}
                          disabled={loadingAction === `suggestion-${s.id}-reject`}
                          className="bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/30 border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.08] px-4 py-2 rounded-lg text-[12px] transition ml-auto disabled:opacity-40"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem("token");
                            await fetch(`https://predicciones-ecuador.onrender.com/admin/news-suggestions/${s.id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
                            showToast("Sugerencia eliminada", "info");
                            fetchSuggestions();
                          }}
                          className="bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-4 py-2 rounded-lg text-[12px] transition"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-300 dark:text-white/15 mt-3">{new Date(s.created_at).toLocaleString()}</p>
                    {s.status !== "pending" && (
                      <button
                        onClick={async () => {
                          const token = localStorage.getItem("token");
                          await fetch(`https://predicciones-ecuador.onrender.com/admin/news-suggestions/${s.id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
                          showToast("Sugerencia eliminada", "info");
                          fetchSuggestions();
                        }}
                        className="bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-lg text-[11px] transition mt-2"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* NOTICIAS */}
          {activeSection === "noticias" && (
            <>
              <div>
                <h1 className="text-lg font-bold">Noticias de mercados</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                  {marketNews.filter(n => n.status === "pending").length} pendientes · {marketNews.length} total
                </p>
              </div>

              <div className="space-y-3">
                {marketNews.length === 0 && (
                  <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-10 text-center">
                    <p className="text-[12px] text-slate-400 dark:text-white/20">No hay noticias aún. Usa la extensión para guardar noticias.</p>
                  </div>
                )}
                {marketNews.map((n) => (
                  <div key={n.id} className={`bg-white dark:bg-[#111111] border rounded-xl p-5 space-y-3 ${
                    n.status === "pending" ? "border-amber-200 dark:border-amber-500/20"
                    : n.status === "approved" ? "border-emerald-200 dark:border-emerald-500/20 opacity-70"
                    : "border-slate-200 dark:border-white/[0.06] opacity-40"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug">{n.title}</p>
                        {n.url && (
                          <a href={n.url} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-blue-500 dark:text-blue-400 hover:underline mt-0.5 block truncate">
                            {n.source || n.url}
                          </a>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        n.status === "pending" ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : n.status === "approved" ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/30"
                      }`}>
                        {n.status === "pending" ? "Pendiente" : n.status === "approved" ? "Aprobada" : "Rechazada"}
                      </span>
                    </div>

                    {n.content && (
                      <p className="text-[12px] text-slate-500 dark:text-white/40 leading-relaxed border-l-2 border-slate-200 dark:border-white/10 pl-3 line-clamp-3">
                        {n.content}
                      </p>
                    )}

                    {n.market_id && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-white/40">
                        <span>🔗 Vinculada al mercado</span>
                        <span className="font-bold text-slate-700 dark:text-white/60">#{n.market_id}</span>
                        <span className="text-slate-400 dark:text-white/25 truncate">
                          — {markets.find(m => m.id === n.market_id)?.question || ""}
                        </span>
                      </div>
                    )}

                    {n.status === "pending" && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="number"
                          placeholder="ID del mercado..."
                          value={newsMarketInput[n.id] || n.market_id || ""}
                          onChange={(e) => setNewsMarketInput((prev) => ({ ...prev, [n.id]: e.target.value }))}
                          className="bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px] outline-none text-slate-900 dark:text-white w-40 focus:border-emerald-500/60 transition"
                        />
                        {newsMarketInput[n.id] && markets.find(m => m.id === Number(newsMarketInput[n.id])) && (
                          <span className="text-[11px] text-slate-500 dark:text-white/40 truncate max-w-xs">
                            → {markets.find(m => m.id === Number(newsMarketInput[n.id]))?.question}
                          </span>
                        )}
                        <div className="flex gap-2 ml-auto">
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem("token");
                              const mid = newsMarketInput[n.id];
                              if (!mid) return showToast("Ingresa el ID del mercado", "error");
                              const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/market-news/${n.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                body: JSON.stringify({ market_id: Number(mid), status: "approved" }),
                              });
                              const data = await res.json();
                              if (res.ok) { showToast("Noticia aprobada ✅", "success"); fetchMarketNews(); }
                              else showToast(data.message, "error");
                            }}
                            className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-4 py-2 rounded-lg text-[12px] font-bold transition"
                          >
                            ✅ Aprobar
                          </button>
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem("token");
                              const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/market-news/${n.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                body: JSON.stringify({ market_id: null, status: "rejected" }),
                              });
                              if (res.ok) { showToast("Noticia rechazada", "info"); fetchMarketNews(); }
                            }}
                            className="bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/30 border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.08] px-4 py-2 rounded-lg text-[12px] transition"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem("token");
                              await fetch(`https://predicciones-ecuador.onrender.com/admin/market-news/${n.id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
                              showToast("Noticia eliminada", "info");
                              fetchMarketNews();
                            }}
                            className="bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-4 py-2 rounded-lg text-[12px] transition"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-300 dark:text-white/15">{new Date(n.created_at).toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}</p>
                    {n.status !== "pending" && (
                      <button
                        onClick={async () => {
                          const token = localStorage.getItem("token");
                          await fetch(`https://predicciones-ecuador.onrender.com/admin/market-news/${n.id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
                          showToast("Noticia eliminada", "info");
                          fetchMarketNews();
                        }}
                        className="bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-lg text-[11px] transition mt-2"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* CONTACTO */}
          {activeSection === "contacto" && (
            <>
              <div>
                <h1 className="text-lg font-bold">Contacto</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                  {contactos.filter(c => !c.leido).length} sin leer · {contactos.length} total
                </p>
              </div>

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] hidden sm:block">
                  <div className="grid grid-cols-12 text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest">
                    <span className="col-span-2">Nombre</span>
                    <span className="col-span-2">Email</span>
                    <span className="col-span-2">Asunto</span>
                    <span className="col-span-4">Mensaje</span>
                    <span className="col-span-1 text-center">Estado</span>
                    <span className="col-span-1 text-right">Acción</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                  {contactos.length === 0 && (
                    <p className="px-5 py-8 text-[12px] text-slate-400 dark:text-white/20 text-center">Sin mensajes aún</p>
                  )}
                  {contactos.map((c) => (
                    <div key={c.id} className={`px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition ${!c.leido ? "bg-blue-50/50 dark:bg-blue-500/5" : ""}`}>
                      <div className="hidden sm:grid grid-cols-12 items-start gap-2">
                        <p className="col-span-2 text-[12px] text-slate-600 dark:text-white/60 truncate">{c.nombre}</p>
                        <p className="col-span-2 text-[12px] text-slate-400 dark:text-white/30 truncate">{c.email}</p>
                        <p className="col-span-2 text-[12px] text-slate-600 dark:text-white/60 truncate">{c.asunto || "—"}</p>
                        <p className="col-span-4 text-[12px] text-slate-500 dark:text-white/40 line-clamp-2">{c.mensaje}</p>
                        <div className="col-span-1 flex justify-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${!c.leido ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/25"}`}>
                            {c.leido ? "Leído" : "Nuevo"}
                          </span>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          {!c.leido && (
                            <button
                              onClick={async () => { const token = localStorage.getItem("token"); await fetch(`https://predicciones-ecuador.onrender.com/admin/contactos/${c.id}/leido`, { method: "PUT", headers: { authorization: `Bearer ${token}` } }); fetchContactos(); showToast("Marcado como leído", "info"); }}
                              className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 px-2 py-1 rounded-md transition"
                            >
                              Leído
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="sm:hidden space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[12px] font-medium text-slate-700 dark:text-white/70">{c.nombre}</p>
                            <p className="text-[11px] text-slate-400 dark:text-white/30">{c.email}</p>
                          </div>
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md ${!c.leido ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/25"}`}>
                            {c.leido ? "Leído" : "Nuevo"}
                          </span>
                        </div>
                        {c.asunto && <p className="text-[11px] font-medium text-slate-600 dark:text-white/50">{c.asunto}</p>}
                        <p className="text-[11px] text-slate-400 dark:text-white/30">{c.mensaje}</p>
                        {!c.leido && (
                          <button
                            onClick={async () => { const token = localStorage.getItem("token"); await fetch(`https://predicciones-ecuador.onrender.com/admin/contactos/${c.id}/leido`, { method: "PUT", headers: { authorization: `Bearer ${token}` } }); fetchContactos(); showToast("Marcado como leído", "info"); }}
                            className="text-[11px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-lg"
                          >
                            Marcar leído
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          

          {/* CONFIGURACIÓN */}
          {activeSection === "settings" && config && (
            <>
              <div>
                <h1 className="text-lg font-bold">Configuración</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                  {config.updated_at ? `Actualizado ${new Date(config.updated_at).toLocaleString()}` : "Parámetros de la plataforma"}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                {[
                  { label: "Comisión", value: `${config.commission}%`, color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "$ bienvenida", value: `${config.welcome_points}`, color: "text-blue-500 dark:text-blue-400" },
                ].map((item) => (
                  <div key={item.label} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 text-center">
                    <p className="text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest mb-2">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color} tabular-nums`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "commission", label: "Comisión (%)", step: "0.1" },
                  { key: "welcome_points", label: "Puntos de bienvenida", step: "1" },
                ].map((field) => (
                  <div key={field.key} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 space-y-2">
                    <label className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest block">{field.label}</label>
                    <input type="number" step={field.step}
                      value={(settingsForm as any)[field.key]}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2.5 outline-none text-[14px] text-slate-900 dark:text-white focus:border-emerald-500/60 transition tabular-nums" />
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 dark:border-white/[0.06] pt-6 mt-2">
                <p className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest mb-4">Carruseles</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { key: "trending_count", label: "Cards tendencias", min: "1", max: "5", step: "1" },
                    { key: "winners_count", label: "Cards ganadores", min: "1", max: "5", step: "1" },
                    { key: "autoplay_ms", label: "Autoplay (ms)", min: "1000", max: "30000", step: "500" },
                  ].map((field) => (
                    <div key={field.key} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 space-y-2">
                      <label className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest block">{field.label}</label>
                      <input type="number" min={field.min} max={field.max} step={field.step}
                        value={(settingsForm as any)[field.key] ?? ""}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))}
                        className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2.5 outline-none text-[14px] text-slate-900 dark:text-white focus:border-emerald-500/60 transition tabular-nums" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-white/[0.06] pt-6 mt-2">
                <p className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest mb-4">Datos bancarios para recargas</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: "banco_nombre", label: "Nombre del banco" },
                    { key: "banco_titular", label: "Titular de la cuenta" },
                    { key: "banco_cuenta", label: "Número de cuenta" },
                    { key: "banco_cedula", label: "Cédula del titular" },
                  ].map((field) => (
                    <div key={field.key} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 space-y-2">
                      <label className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest block">{field.label}</label>
                      <input
                        type="text"
                        value={(settingsForm as any)[field.key]}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2.5 outline-none text-[14px] text-slate-900 dark:text-white focus:border-emerald-500/60 transition"
                      />
                    </div>
                  ))}
                  <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 space-y-2">
                    <label className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest block">Tipo de cuenta</label>
                    <select
                      value={settingsForm.banco_tipo}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, banco_tipo: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2.5 outline-none text-[14px] text-slate-900 dark:text-white focus:border-emerald-500/60 transition"
                    >
                      <option value="ahorros">Ahorros</option>
                      <option value="corriente">Corriente</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-white/[0.06] pt-6 mt-2">
                <p className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">Tokens de extensión</p>
                <p className="text-[11px] text-slate-400 dark:text-white/20 mb-4">Tokens sin expiración para usar en la extensión del navegador.</p>

                <div className="flex gap-2 mb-4">
                  <input
                    placeholder="Nombre del token (ej: MacBook Juan)"
                    value={newTokenLabel}
                    onChange={(e) => setNewTokenLabel(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px] outline-none text-slate-900 dark:text-white focus:border-emerald-500/60 transition"
                  />
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem("token");
                      const res = await fetch("https://predicciones-ecuador.onrender.com/admin/extension-tokens", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                        body: JSON.stringify({ label: newTokenLabel }),
                      });
                      const data = await res.json();
                      if (res.ok) { showToast("Token creado ✅", "success"); setNewTokenLabel(""); fetchExtensionTokens(); }
                      else showToast(data.message, "error");
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg px-4 py-2 text-[12px] transition"
                  >
                    Crear
                  </button>
                </div>

                <div className="space-y-2">
                  {extensionTokens.length === 0 && (
                    <p className="text-[12px] text-slate-400 dark:text-white/20 text-center py-4">No hay tokens creados</p>
                  )}
                  {extensionTokens.map((t) => (
                    <div key={t.id} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70">{t.label}</p>
                        <p className="text-[10px] text-slate-400 dark:text-white/25">{new Date(t.created_at).toLocaleDateString("es-EC")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-[10px] bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/40 px-2 py-1.5 rounded-lg truncate font-mono">
                          {t.token}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(t.token);
                            setCopiedTokenId(t.id);
                            setTimeout(() => setCopiedTokenId(null), 2000);
                          }}
                          className="shrink-0 bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] px-3 py-1.5 rounded-lg text-[11px] transition"
                        >
                          {copiedTokenId === t.id ? "✓ Copiado" : "Copiar"}
                        </button>
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem("token");
                            const res = await fetch(`https://predicciones-ecuador.onrender.com/admin/extension-tokens/${t.id}`, {
                              method: "DELETE",
                              headers: { authorization: `Bearer ${token}` },
                            });
                            if (res.ok) { showToast("Token eliminado", "info"); fetchExtensionTokens(); }
                          }}
                          className="shrink-0 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 px-3 py-1.5 rounded-lg text-[11px] transition"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSaveSettings} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl py-3 text-[13px] transition active:scale-[0.99]">
                Guardar configuración
              </button>
            </>
          )}

        </main>
      </div>
    </div>
  );
}