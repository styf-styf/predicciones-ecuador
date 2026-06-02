"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Search, TrendingUp, Trophy, Wallet,
  LogOut, Users, Activity, DollarSign,
  ShieldCheck, ShieldOff, Plus, Minus,
  Settings, X, LayoutDashboard, ChevronRight,
  ArrowUpRight, ArrowDownRight, Circle, Zap, MessageSquare, MessageCircle, Newspaper, Eye, EyeOff,
  TrendingDown, PiggyBank, BarChart2, Lightbulb, Filter
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ThemeToggle from "@/components/ThemeToggle";

type Section = "overview" | "administracion" | "markets" | "users" | "settings" | "winners" | "transacciones" | "suggestions" | "noticias" | "comentarios" | "botnews" | "alertas" | "correos";

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
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 cursor-pointer"><X size={13} /></button>
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
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-[13px] text-slate-600 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer">
            Cancelar
          </button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition cursor-pointer ${
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
        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-[12px] text-slate-500 dark:text-white/40 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer">
        ← Anterior
      </button>
      <span className="text-[12px] text-slate-400 dark:text-white/30 tabular-nums">{page} / {totalPages}</span>
      <button onClick={() => setPage(page + 1)} disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-[12px] text-slate-500 dark:text-white/40 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer">
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
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState("deporte");
  const [newClosesAt, setNewClosesAt] = useState("");
  const [winners, setWinners] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pointsInput, setPointsInput] = useState<{ [key: string]: string }>({});
  const [charts, setCharts] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<{
    min_bet: string; max_bet: string; min_withdrawal: string; max_withdrawal: string;
    max_changes: string; daily_withdrawal_limit: string;
    commission: string; welcome_points: string; welcome_points_limit: string;
    trending_count: string; winners_count: string; autoplay_ms: string;
    circulation_alert: string; pending_tx_alert: string;
    market_categories: string;
    banco_nombre: string; banco_tipo: string; banco_cuenta: string; banco_titular: string; banco_cedula: string;
  }>({
    min_bet: "", max_bet: "", min_withdrawal: "", max_withdrawal: "",
    max_changes: "", daily_withdrawal_limit: "",
    commission: "", welcome_points: "", welcome_points_limit: "",
    trending_count: "", winners_count: "", autoplay_ms: "",
    circulation_alert: "", pending_tx_alert: "",
    market_categories: "",
    banco_nombre: "", banco_tipo: "", banco_cuenta: "", banco_titular: "", banco_cedula: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMarket, setEditingMarket] = useState<{ id: number, question: string, closes_at?: string } | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionCategories, setSuggestionCategories] = useState<{ [key: number]: string }>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [extensionTokens, setExtensionTokens] = useState<any[]>([]);
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [copiedTokenId, setCopiedTokenId] = useState<number | null>(null);
  const [marketNews, setMarketNews] = useState<any[]>([]);
  const [newsMarketInput, setNewsMarketInput] = useState<{ [key: number]: string }>({});
  const [adminComments, setAdminComments] = useState<any[]>([]);
  const [commentMarketFilter, setCommentMarketFilter] = useState<string>("all");
  const [finance, setFinance] = useState<any>(null);
  const [adminAlerts, setAdminAlerts] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [emailAlias, setEmailAlias] = useState<string>("all");
  const [emailType, setEmailType] = useState<"all" | "received" | "sent">("all");
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [composing, setComposing] = useState(false);
  const [composeForm, setComposeForm] = useState({ to: "", subject: "", html: "", from_alias: "info" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailAliases, setEmailAliases] = useState<string[]>(["info", "soporte", "alertas", "admin"]);
  const [newAlias, setNewAlias] = useState("");
  const [managingAliases, setManagingAliases] = useState(false);

  // ── Bancos ──
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [newBank, setNewBank] = useState({ nombre: "", titular: "", cuenta: "", tipo: "ahorros", cedula: "" });
  const [savingBank, setSavingBank] = useState(false);
  const [editingBank, setEditingBank] = useState<null | { id: string; nombre: string; titular: string; cuenta: string; tipo: string; cedula: string }>(null);
  const [savingEditBank, setSavingEditBank] = useState(false);

  // ── Modal comprobante ──
  const [viewComprobante, setViewComprobante] = useState<string | null>(null);

  // ── BotNews ──
  const [botUrls, setBotUrls] = useState<any[]>([]);
  const [botStatus, setBotStatus] = useState<any>(null);
  const [botUrlInput, setBotUrlInput] = useState("");
  const [botInterval, setBotInterval] = useState(15);
  const [botRunning, setBotRunning] = useState(false);
  const [botSuggestions, setBotSuggestions] = useState<any[]>([]);
  const [closeDates, setCloseDates] = useState<Record<number, string>>({});
  const [selectedCategories, setSelectedCategories] = useState<Record<number, string>>({});

  // ── Nuevos estados ──
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [editingFinancial, setEditingFinancial] = useState(false);
  const [savingFinancial, setSavingFinancial] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [modal, setModal] = useState<{
    title: string; description?: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void;
  } | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [marketFilter, setMarketFilter] = useState<"activos" | "todos" | "resueltos">("activos");
  const [marketCategoryFilter, setMarketCategoryFilter] = useState<string>("todas");
  const [txFilter, setTxFilter] = useState<"transferencia" | "tarjeta" | "retiro">("transferencia");
  const [botFilter, setBotFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [botCategoryFilter, setBotCategoryFilter] = useState("todas");
  const [botPage, setBotPage] = useState(1);
  const [chatMessages, setChatMessages] = useState<Record<string, {role: string; content: string}[]>>({});
  const [chatInput, setChatInput] = useState<Record<string, string>>({});
  const [chatSending, setChatSending] = useState<Record<string, boolean>>({});
  const [chatPending, setChatPending] = useState<Record<string, string | null>>({});

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => setToast({ message, type });
  const openModal = (opts: typeof modal) => setModal(opts);

  const exportCSV = (filename: string, headers: string[], rows: string[][]) => {
    const bom = "﻿";
    const content = bom + [headers, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchQuery("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const globalResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: { label: string; sub: string; section: Section; icon: string }[] = [];
    markets.filter(m => m.question.toLowerCase().includes(q)).slice(0, 3).forEach(m =>
      results.push({ label: m.question, sub: `Mercado · ${m.resolved ? "Cerrado" : "Activo"}`, section: "markets", icon: "📊" }));
    users.filter(u => u.email?.toLowerCase().includes(q) || u.nombre?.toLowerCase().includes(q) || u.apellido?.toLowerCase().includes(q)).slice(0, 3).forEach(u =>
      results.push({ label: u.nombre ? `${u.nombre} ${u.apellido || ""}`.trim() : u.email, sub: `Usuario · ${u.email}`, section: "users", icon: "👤" }));
    transactions.filter(t => t.users?.email?.toLowerCase().includes(q) || String(t.amount).includes(q)).slice(0, 2).forEach(t =>
      results.push({ label: t.users?.email || "—", sub: `Transacción · $${t.amount} · ${t.status}`, section: "transacciones", icon: "💳" }));
    adminComments.filter(c => c.content?.toLowerCase().includes(q) || c.text?.toLowerCase().includes(q)).slice(0, 2).forEach(c =>
      results.push({ label: (c.content || c.text || "").slice(0, 60), sub: "Comentario", section: "comentarios", icon: "💬" }));
    suggestions.filter(s => s.question?.toLowerCase().includes(q) || s.content?.toLowerCase().includes(q)).slice(0, 2).forEach(s =>
      results.push({ label: (s.question || s.content || "").slice(0, 60), sub: "Sugerencia", section: "suggestions", icon: "💡" }));
    marketNews.filter(n => n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)).slice(0, 2).forEach(n =>
      results.push({ label: (n.title || n.content || "").slice(0, 60), sub: "Noticia", section: "noticias", icon: "📰" }));
    return results;
  }, [searchQuery, markets, users, transactions, adminComments, suggestions, marketNews]);

  // ── Paginación ──
  const filteredMarkets = markets.filter(m => {
    const matchesSearch = m.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = marketFilter === "activos" ? !m.resolved : marketFilter === "resueltos" ? m.resolved : true;
    const matchesCategory = marketCategoryFilter === "todas" ? true : m.category === marketCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });
  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.nombre?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredEmails = emails.filter(e =>
    (emailType === "all" || e.type === emailType) &&
    (emailAlias === "all" || e.alias === emailAlias)
  );
  const { paginated: paginatedMarkets, page: marketPage, setPage: setMarketPage, totalPages: marketPages } = usePagination(filteredMarkets, 15);
  const { paginated: paginatedUsers, page: userPage, setPage: setUserPage, totalPages: userPages } = usePagination(filteredUsers, 20);
  const { paginated: paginatedWinners, page: winnerPage, setPage: setWinnerPage, totalPages: winnerPages } = usePagination(winners, 20);

  const fetchSuggestions = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/news-suggestions", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setSuggestions(data.filter((s: any) => s.source !== "bot"));
  };

  const handleChat = async (key: string, dbId: number, suggestion: any) => {
    const input = chatInput[key]?.trim();
    if (!input) return;
    const userMsg = { role: "user", content: input };
    const history = [...(chatMessages[key] || []), userMsg];
    setChatMessages(prev => ({ ...prev, [key]: history }));
    setChatInput(prev => ({ ...prev, [key]: "" }));
    setChatSending(prev => ({ ...prev, [key]: true }));
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://api.ecuapred.com/admin/news-suggestions/${dbId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: history, suggestion }),
      });
      const data = await res.json();
      const assistantMsg = { role: "assistant", content: data.reply || "Error al responder" };
      setChatMessages(prev => ({ ...prev, [key]: [...history, assistantMsg] }));
      if (data.new_question) setChatPending(prev => ({ ...prev, [key]: data.new_question }));
      if (data.new_text) setChatPending(prev => ({ ...prev, [key]: data.new_text }));
    } catch {
      setChatMessages(prev => ({ ...prev, [key]: [...history, { role: "assistant", content: "Error de conexión" }] }));
    } finally {
      setChatSending(prev => ({ ...prev, [key]: false }));
    }
  };

  const applyNewQuestion = async (key: string, dbId: number, newQuestion: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`https://api.ecuapred.com/admin/news-suggestions/${dbId}/question`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ new_question: newQuestion }),
    });
    if (res.ok) {
      fetchBotSuggestions();
      fetchSuggestions();
      setChatPending(prev => ({ ...prev, [key]: null }));
      showToast("Pregunta actualizada ✅", "success");
    }
  };

  const handleSuggestion = async (id: number, action: string) => {
    setLoadingAction(`suggestion-${id}-${action}`);
    const token = localStorage.getItem("token");
    const res = await fetch(`https://api.ecuapred.com/admin/news-suggestions/${id}`, {
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
    const res = await fetch("https://api.ecuapred.com/markets", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setMarkets(data);
  };

  const fetchWinners = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/winners", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setWinners(data);
  };

  const fetchStats = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/stats", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setStats(data);
  };

  const fetchCharts = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/charts", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setCharts(data);
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/users", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) setUsers(data);
  };

  const fetchExtensionTokens = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/extension-tokens", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setExtensionTokens(data);
  };

  const fetchMarketNews = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/market-news", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setMarketNews(data);
  };

  const fetchBotUrls = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/bot/urls", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setBotUrls(data);
  };

  const fetchBotStatus = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/bot/status", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setBotStatus(data);
  };

  const fetchBotSuggestions = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/news-suggestions", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      const filtered = data.filter((s: any) => s.source === "bot");
      setBotSuggestions(filtered);
      setCloseDates(prev => {
        const init: Record<number, string> = { ...prev };
        filtered.forEach((s: any) => {
          if (!init[s.id]) {
            if (s.suggested_close_date) {
              // Tomar solo la parte YYYY-MM-DD por si el bot devolvió datetime completo
              const d = String(s.suggested_close_date).slice(0, 10);
              init[s.id] = `${d}T23:59`;
            } else {
              // Fallback: hoy + 3 días si el bot no dio fecha
              const fallback = new Date(Date.now() + 3 * 86400000);
              init[s.id] = fallback.toISOString().slice(0, 10) + "T23:59";
            }
          }
        });
        return init;
      });
      setSelectedCategories(prev => {
        const init: Record<number, string> = { ...prev };
        filtered.forEach((s: any) => {
          if (!init[s.id]) init[s.id] = s.category || "general";
        });
        return init;
      });
    }
  };

  const fetchEmails = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`https://api.ecuapred.com/admin/emails`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.ok) setEmails(await res.json());
  };

  const fetchEmailAliases = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/email-aliases", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.ok) setEmailAliases(await res.json());
  };

  const fetchAdminAlerts = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/alerts", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setAdminAlerts(data);
  };

  const fetchFinance = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/finance", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setFinance(data);
  };

  const fetchAdminComments = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/comments", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setAdminComments(data);
  };

  const fetchTransactions = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/transactions", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setTransactions(data);
  };

  const doTransactionStatus = async (id: string, status: "aprobado" | "rechazado", userId: string, amount: number, tx: any) => {
    setLoadingAction(`tx-${id}`);
    const token = localStorage.getItem("token");
    const res = await fetch(`https://api.ecuapred.com/admin/transactions/${id}/status`, {
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

  const handleTransactionStatus = (id: string, status: "aprobado" | "rechazado", userId: string, amount: number, tx: any) => {
    const isApprove = status === "aprobado";
    const typeLabel = tx.type === "retiro" ? "retiro" : "recarga";
    openModal({
      title: isApprove ? `¿Aprobar ${typeLabel} de $${amount}?` : `¿Rechazar ${typeLabel} de $${amount}?`,
      description: `${tx.users?.email ?? "Usuario"} · ${isApprove ? "Se acreditarán los fondos." : "La transacción quedará rechazada."}`,
      confirmLabel: isApprove ? "Aprobar" : "Rechazar",
      danger: !isApprove,
      onConfirm: () => doTransactionStatus(id, status, userId, amount, tx),
    });
  };

  const fetchBankAccounts = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/bank-accounts", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.ok) setBankAccounts(await res.json());
  };

  const fetchSettings = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("https://api.ecuapred.com/admin/settings", {
      headers: { authorization: `Bearer ${token}` || "" },
    });
    const data = await res.json();
    if (res.ok) {
      setConfig(data);
      setSettingsForm({
        min_bet: data.min_bet ?? "", max_bet: data.max_bet ?? "",
        min_withdrawal: data.min_withdrawal ?? "", max_withdrawal: data.max_withdrawal ?? "",
        max_changes: data.max_changes ?? "", daily_withdrawal_limit: data.daily_withdrawal_limit ?? "",
        commission: data.commission, welcome_points: data.welcome_points, welcome_points_limit: data.welcome_points_limit ?? "",
        trending_count: data.trending_count ?? "", winners_count: data.winners_count ?? "", autoplay_ms: data.autoplay_ms ?? "",
        circulation_alert: data.circulation_alert ?? "", pending_tx_alert: data.pending_tx_alert ?? "",
        market_categories: data.market_categories ?? "deporte,farandula,politica,elecciones,pais,general",
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
    const res = await fetch("https://api.ecuapred.com/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({
        min_bet: parseFloat(settingsForm.min_bet),
        max_bet: parseFloat(settingsForm.max_bet),
        min_withdrawal: settingsForm.min_withdrawal === "" ? null : Number(settingsForm.min_withdrawal),
        max_withdrawal: settingsForm.max_withdrawal === "" ? null : Number(settingsForm.max_withdrawal),
        max_changes: settingsForm.max_changes === "" ? 3 : Number(settingsForm.max_changes),
        daily_withdrawal_limit: settingsForm.daily_withdrawal_limit === "" ? null : Number(settingsForm.daily_withdrawal_limit),
        commission: parseFloat(settingsForm.commission),
        welcome_points: parseFloat(settingsForm.welcome_points),
        welcome_points_limit: settingsForm.welcome_points_limit === "" ? null : Number(settingsForm.welcome_points_limit),
        trending_count: settingsForm.trending_count === "" ? 1 : Number(settingsForm.trending_count),
        winners_count: settingsForm.winners_count === "" ? 1 : Number(settingsForm.winners_count),
        autoplay_ms: settingsForm.autoplay_ms === "" ? 5000 : Number(settingsForm.autoplay_ms),
        circulation_alert: settingsForm.circulation_alert === "" ? null : Number(settingsForm.circulation_alert),
        pending_tx_alert: settingsForm.pending_tx_alert === "" ? null : Number(settingsForm.pending_tx_alert),
        market_categories: settingsForm.market_categories || "deporte,farandula,politica,elecciones,pais,general",
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
      const res = await fetch("https://api.ecuapred.com/me", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.role !== "admin") { window.location.href = "/"; return; }
      setIsLogged(true); setIsAdmin(true); setPoints(data.points || 0);
      setLoadingAdmin(false);
      fetchWinners(); fetchStats(); fetchUsers(); fetchSettings(); fetchCharts(); fetchTransactions(); fetchSuggestions(); fetchMarketNews(); fetchExtensionTokens(); fetchAdminComments(); fetchFinance(); fetchBotUrls(); fetchBotStatus(); fetchBotSuggestions(); fetchBankAccounts(); fetchAdminAlerts(); fetchEmails(); fetchEmailAliases();
    } catch {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  // Convierte valor de datetime-local (sin zona) a UTC-5 Ecuador
  const toEcuadorTz = (dt: string) => dt && dt.length <= 16 ? dt + ":00-05:00" : dt;

  const handleEditMarket = async () => {
    if (!editingMarket || !editingMarket.question.trim()) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`https://api.ecuapred.com/admin/markets/${editingMarket.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ question: editingMarket.question, closes_at: toEcuadorTz(editingMarket.closes_at ?? "") }),
    });
    const data = await res.json();
    if (res.ok) { setEditingMarket(null); fetchMarkets(); showToast("Mercado actualizado", "success"); }
    else showToast(data.message, "error");
  };

  const handleCreateMarket = async () => {
    const token = localStorage.getItem("token");
    if (!newQuestion.trim()) return;
    const res = await fetch("https://api.ecuapred.com/admin/markets", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
      body: JSON.stringify({ question: newQuestion, category: newCategory, closes_at: newClosesAt ? toEcuadorTz(newClosesAt) : undefined }),
    });
    const data = await res.json();
    if (res.ok) { setNewQuestion(""); fetchMarkets(); fetchStats(); showToast("Mercado creado ✅", "success"); }
    else showToast(data.message || "Error al crear mercado", "error");
  };

  // Con modal de confirmación
  const handleDeleteMarket = (id: any) => {
    openModal({
      title: "¿Eliminar este mercado?",
      description: "Se borrarán todas las predicciones asociadas. Esta acción es irreversible.",
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: async () => {
        setLoadingAction(`delete-${id}`);
        const token = localStorage.getItem("token");
        const res = await fetch(`https://api.ecuapred.com/admin/markets/${id}`, {
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
        const res = await fetch(`https://api.ecuapred.com/admin/resolve/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
          body: JSON.stringify({ winner }),
        });
        const data = await res.json();
        setLoadingAction(null);
        if (!res.ok) {
          showToast(data.message || "Error al resolver", "error");
        } else if (data.failedBets?.length > 0) {
          showToast("Mercado resuelto con advertencias", "info");
          openModal({
            title: "⚠️ Ganadores no acreditados",
            description: `${data.failedBets.length} usuario(s) no pudieron recibir su pago automáticamente. Acredítalos manualmente desde la sección Usuarios:\n\n${data.failedBets.map((f: any) => `• ${f.email} — $${f.monto}`).join("\n")}`,
            confirmLabel: "Ir a Usuarios",
            danger: false,
            onConfirm: () => setActiveSection("users"),
          });
        } else {
          showToast(data.message, "success");
        }
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
        const res = await fetch(`https://api.ecuapred.com/admin/users/${userId}/role`, {
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

  const handlePoints = (userId: string, amount: number, userEmail: string) => {
    if (!amount || isNaN(amount)) return;
    openModal({
      title: `${amount > 0 ? "Acreditar" : "Descontar"} ${Math.abs(amount)} $ al usuario`,
      description: `${userEmail} · ${amount > 0 ? "+" : ""}${amount} $`,
      confirmLabel: amount > 0 ? "Acreditar" : "Descontar",
      danger: amount < 0,
      onConfirm: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch(`https://api.ecuapred.com/admin/users/${userId}/points`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` || "" },
          body: JSON.stringify({ points: amount }),
        });
        const data = await res.json();
        if (res.ok) {
          fetchUsers(); fetchStats();
          setPointsInput((prev) => ({ ...prev, [userId]: "" }));
          showToast(`${amount > 0 ? "+" : ""}${amount} $ aplicados`, "success");
        } else showToast(data.message, "error");
      },
    });
  };

  const handleSuspend = async (userId: string, suspended: boolean) => {
    openModal({
      title: suspended ? "¿Suspender usuario?" : "¿Activar usuario?",
      description: suspended ? "El usuario no podrá acceder a la plataforma." : "El usuario recuperará el acceso.",
      confirmLabel: suspended ? "Suspender" : "Activar",
      danger: suspended,
      onConfirm: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch(`https://api.ecuapred.com/admin/users/${userId}/suspend`, {
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

    const es = new EventSource("https://api.ecuapred.com/events");
    es.addEventListener("markets", () => { fetchMarkets(); fetchStats(); });
    es.addEventListener("bets", () => { fetchStats(); fetchFinance(); });
    es.addEventListener("transactions", () => { fetchTransactions(); fetchFinance(); });
    es.addEventListener("users", () => fetchUsers());
    es.addEventListener("suggestions", () => fetchSuggestions());
    es.addEventListener("news", () => fetchMarketNews());
    es.addEventListener("winners", () => fetchStats());
    es.addEventListener("notifications", () => fetchStats());
    es.addEventListener("comments", () => fetchAdminComments());
    es.addEventListener("admin_alerts", () => fetchAdminAlerts());
    es.addEventListener("emails", () => fetchEmails());
    return () => es.close();
  }, []);

  const navItems = [
    { id: "overview", label: "Resumen", icon: <LayoutDashboard size={15} /> },
    { id: "administracion", label: "Finanzas", icon: <PiggyBank size={15} /> },
    { id: "markets", label: "Mercados", icon: <TrendingUp size={15} />, badge: markets.filter(m => !m.resolved).length },
    { id: "users", label: "Usuarios", icon: <Users size={15} />, badge: users.length },
    { id: "transacciones", label: "Transacciones", icon: <Wallet size={15} />, badge: transactions.filter(t => t.status === "pendiente").length },
    { id: "botnews", label: "BotNews", icon: <span className="text-[13px]">🤖</span>, badge: botSuggestions.filter(s => s.status === "pending").length },
    { id: "suggestions", label: "Sugerencias", icon: <Lightbulb size={15} />, badge: suggestions.filter(s => s.status === "pending").length },
    { id: "noticias", label: "Noticias", icon: <Newspaper size={15} />, badge: marketNews.filter(n => n.status === "pending").length },
    { id: "comentarios", label: "Comentarios", icon: <MessageCircle size={15} />, badge: adminComments.length },
    { id: "correos", label: "Correos", icon: <span className="text-[13px]">✉️</span>, badge: emails.filter(e => !e.read && e.type === "received").length },
    { id: "alertas", label: "Alertas", icon: <span className="text-[13px]">🔔</span>, badge: adminAlerts.filter(a => !a.resolved).length },
    { id: "settings", label: "Configuración", icon: <Settings size={15} /> },
  ];

  if (loadingAdmin) return (
    <div className="h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex" style={{ fontFamily: "'DM Mono', 'Fira Code', monospace" }}>
      {/* Sidebar skeleton */}
      <aside className="hidden lg:flex flex-col w-60 h-screen bg-white dark:bg-[#111111] border-r border-slate-200 dark:border-white/[0.06] p-4 gap-3 shrink-0">
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse mb-2" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-9 w-full bg-slate-100 dark:bg-white/[0.04] rounded-lg animate-pulse" />
        ))}
      </aside>
      {/* Main skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="h-14 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#111111] px-6 flex items-center gap-4 shrink-0">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="ml-auto h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
        </div>
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 space-y-2.5">
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {/* Gráfica */}
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5 space-y-4">
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-48 w-full bg-slate-100 dark:bg-white/[0.03] rounded-lg animate-pulse" />
          </div>
          {/* Tabla */}
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.04]">
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.03] last:border-0 flex items-center gap-4">
                <div className="h-4 w-4/5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse shrink-0 ml-auto" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex" style={{ fontFamily: "'DM Mono', 'Fira Code', monospace" }}>

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

      {/* Modal comprobante de pago */}
      {viewComprobante && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setViewComprobante(null)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setViewComprobante(null)}
              className="absolute -top-3 -right-3 z-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-full p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer shadow-lg transition"
            >
              <X size={14} />
            </button>
            <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-2">
                <span className="text-base">🧾</span>
                <p className="text-[13px] font-semibold text-slate-700 dark:text-white/70">Comprobante de transferencia</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-black/20">
                <img
                  src={viewComprobante}
                  alt="Comprobante"
                  className="w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
              <div className="px-4 py-3 flex justify-between items-center">
                <p className="text-[11px] text-slate-400 dark:text-white/30">Click fuera para cerrar</p>
                <a
                  href={viewComprobante}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-sky-500 hover:text-sky-400 font-medium flex items-center gap-1 cursor-pointer"
                >
                  Abrir en nueva pestaña ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden cursor-pointer" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-screen w-60 bg-white dark:bg-[#111111] border-r border-slate-200 dark:border-white/[0.06] z-50 flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 py-5 border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-500 grid place-items-center text-black font-black text-xs">P</div>
            <div>
              <p className="text-[11px] font-bold text-slate-900 dark:text-white tracking-wider uppercase">Predicciones</p>
              <p className="text-[9px] text-slate-400 dark:text-white/30 tracking-widest uppercase">Admin Console</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-700 dark:text-white/30 dark:hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id as Section); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-150 cursor-pointer ${
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
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60 h-screen overflow-hidden">

        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-slate-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur border-b border-slate-200 dark:border-white/[0.06] px-4 sm:px-6 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white cursor-pointer">
            <LayoutDashboard size={18} />
          </button>

          <div className="flex items-center gap-1.5 text-[12px] text-slate-400 dark:text-white/30">
            <span>Admin</span>
            <ChevronRight size={12} />
            <span className="text-slate-700 dark:text-white/70">{navItems.find(n => n.id === activeSection)?.label}</span>
          </div>

          <div ref={searchRef} className="ml-auto relative w-48 sm:w-72">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5">
              <Search size={13} className="text-slate-400 dark:text-white/30 shrink-0" />
              <input
                placeholder="Buscar en todo el admin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none w-full text-[12px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20"
              />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="cursor-pointer"><X size={12} className="text-slate-400 dark:text-white/30" /></button>}
            </div>
            {globalResults.length > 0 && (
              <div className="absolute top-full mt-1.5 left-0 right-0 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-xl z-50 overflow-hidden">
                {globalResults.map((r, i) => (
                  <button key={i} onClick={() => { setActiveSection(r.section); setSearchQuery(""); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition text-left cursor-pointer">
                    <span className="text-base shrink-0">{r.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[12px] text-slate-800 dark:text-white/80 truncate font-medium">{r.label}</p>
                      <p className="text-[10px] text-slate-400 dark:text-white/30 truncate">{r.sub}</p>
                    </div>
                  </button>
                ))}
                {globalResults.length === 0 && (
                  <p className="px-4 py-3 text-[12px] text-slate-400 dark:text-white/30 text-center">Sin resultados</p>
                )}
              </div>
            )}
          </div>

          <ThemeToggle />

          <div className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 grid place-items-center shrink-0">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">A</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">

          {/* OVERVIEW */}
          {activeSection === "overview" && (
            <>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Resumen general</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">Métricas en tiempo real</p>
              </div>

              {/* Alertas de umbral */}
              {config && stats && (() => {
                const alerts: { label: string; color: string }[] = [];
                if (config.circulation_alert && parseFloat(stats.totalPoints) >= config.circulation_alert)
                  alerts.push({ label: `⚠️ Saldo en circulación ($${stats.totalPoints}) superó el umbral de $${config.circulation_alert}`, color: "amber" });
                if (config.pending_tx_alert && transactions.filter(t => t.status === "pendiente").length >= config.pending_tx_alert)
                  alerts.push({ label: `⚠️ Hay ${transactions.filter(t => t.status === "pendiente").length} transacciones pendientes (umbral: ${config.pending_tx_alert})`, color: "rose" });
                if (alerts.length === 0) return null;
                return (
                  <div className="space-y-2">
                    {alerts.map((a, i) => (
                      <div key={i} className={`px-4 py-3 rounded-xl border text-[12px] font-medium ${a.color === "amber" ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"}`}>
                        {a.label}
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Usuarios totales", value: stats?.totalUsers ?? "—", sub: `+${stats?.newUsersToday ?? 0} hoy`, icon: <Users size={13} />, color: "text-blue-500 dark:text-blue-400", up: true },
                  { label: "$ en circulación", value: stats?.totalPoints ?? "—", sub: "suma total", icon: <Wallet size={13} />, color: "text-emerald-500 dark:text-emerald-400", up: true },
                  { label: "Total predicho", value: stats?.totalBetted ?? "—", sub: `${stats?.betsToday ?? 0} hoy`, icon: <DollarSign size={13} />, color: "text-amber-500 dark:text-amber-400", up: true },
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
                        <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70">Predicciones / día</p>
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

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                  <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70">Ganadores · {winners.length} registros</p>
                </div>
                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] hidden sm:block">
                  <div className="grid grid-cols-12 text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest">
                    <span className="col-span-3">Usuario</span>
                    <span className="col-span-5">Mercado</span>
                    <span className="col-span-1 text-center">Pred.</span>
                    <span className="col-span-2 text-right">Premio</span>
                    <span className="col-span-1 text-right">Fecha</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {paginatedWinners.map((w) => (
                    <div key={w.id} className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                      <div className="hidden sm:grid grid-cols-12 items-center gap-2">
                        <p className="col-span-3 text-[12px] text-slate-500 dark:text-white/50 truncate">{w.users?.email}</p>
                        <p className="col-span-5 text-[12px] text-slate-600 dark:text-white/60 truncate">{w.markets?.question}</p>
                        <div className="col-span-1 flex justify-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${w.prediction === "yes" ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400"}`}>
                            {w.prediction === "yes" ? "Sí" : "No"}
                          </span>
                        </div>
                        <p className="col-span-2 text-right text-[12px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">+{w.reward} $</p>
                        <p className="col-span-1 text-right text-[10px] text-slate-400 dark:text-white/20">{new Date(w.created_at + "Z").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                      <div className="sm:hidden flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] text-slate-500 dark:text-white/50 truncate">{w.users?.email}</p>
                          <p className="text-[11px] text-slate-400 dark:text-white/30 truncate">{w.markets?.question}</p>
                        </div>
                        <span className="text-[12px] text-emerald-500 dark:text-emerald-400 font-bold shrink-0">+{w.reward} $</span>
                      </div>
                    </div>
                  ))}
                  {winners.length === 0 && <p className="px-5 py-8 text-[12px] text-slate-400 dark:text-white/20 text-center">Sin ganadores aún</p>}
                </div>
                <PaginationBar page={winnerPage} totalPages={winnerPages} setPage={setWinnerPage} />
              </div>

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70">Transacciones pendientes</p>
                  <button onClick={() => setActiveSection("transacciones")} className="text-[11px] text-slate-400 dark:text-white/25 hover:text-slate-600 dark:hover:text-white/50 transition flex items-center gap-1 cursor-pointer">
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

          {/* ADMINISTRACIÓN */}
          {activeSection === "administracion" && finance && (
            <>
              <div>
                <h1 className="text-lg font-bold">Finanzas</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">Registros financieros de la plataforma</p>
              </div>

              {/* Tarjetas principales */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Entradas totales", value: `$${finance.totalEntradas}`, sub: `${finance.totalRecargas} recargas aprobadas`, icon: <ArrowUpRight size={16} />, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
                  { label: "Salidas totales", value: `$${finance.totalSalidas}`, sub: `${finance.totalRetiros} retiros aprobados`, icon: <TrendingDown size={16} />, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
                  { label: "En circulación", value: `$${finance.totalCirculacion}`, sub: "Saldo en wallets de usuarios", icon: <Wallet size={16} />, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                  { label: "Total predicho", value: `$${finance.totalApuestado}`, sub: `${finance.totalApuestas} predicciones realizadas`, icon: <BarChart2 size={16} />, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
                  { label: "Comisiones generadas", value: `$${finance.totalComisiones}`, sub: `Tasa: ${finance.commissionRate}%`, icon: <DollarSign size={16} />, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
                  { label: "Premios pagados", value: `$${finance.totalPagado}`, sub: "A ganadores de mercados", icon: <Trophy size={16} />, color: "text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
                ].map((item) => (
                  <div key={item.label} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 space-y-3">
                    <div className={`w-8 h-8 rounded-lg ${item.bg} ${item.color} flex items-center justify-center`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{item.value}</p>
                      <p className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest mt-0.5">{item.label}</p>
                      <p className="text-[11px] text-slate-400 dark:text-white/25 mt-1">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Balance neto */}
              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
                <p className="text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest mb-3">Balance neto de la plataforma</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                      ${(parseFloat(finance.totalEntradas) - parseFloat(finance.totalSalidas) - parseFloat(finance.totalPagado)).toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-white/30 mt-0.5">Entradas − Salidas − Premios pagados</p>
                  </div>
                  <div className="flex gap-3 flex-wrap text-[12px]">
                    <span className="flex items-center gap-1 text-emerald-500"><ArrowUpRight size={13} /> ${finance.totalEntradas}</span>
                    <span className="text-slate-300 dark:text-white/20">−</span>
                    <span className="flex items-center gap-1 text-rose-500"><TrendingDown size={13} /> ${finance.totalSalidas}</span>
                    <span className="text-slate-300 dark:text-white/20">−</span>
                    <span className="flex items-center gap-1 text-amber-400"><Trophy size={13} /> ${finance.totalPagado}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* MERCADOS */}
          {activeSection === "markets" && (
            <>
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-lg font-bold">Mercados</h1>
                  <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                    {markets.filter(m => !m.resolved).length} activos · {markets.filter(m => m.resolved).length} cerrados
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <div className="flex items-center gap-1 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-lg p-1">
                    {(["activos", "todos", "resueltos"] as const).map((f) => (
                      <button key={f} onClick={() => setMarketFilter(f)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition capitalize cursor-pointer ${marketFilter === f ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70"}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-lg p-1 overflow-x-auto max-w-[calc(100vw-2rem)] scrollbar-none">
                    {(["todas", "deporte", "farandula", "politica", "elecciones", "pais", "general"] as const).map((c) => (
                      <button key={c} onClick={() => setMarketCategoryFilter(c)}
                        className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-medium transition capitalize cursor-pointer ${marketCategoryFilter === c ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70"}`}>
                        {c === "farandula" ? "Farándula" : c === "politica" ? "Política" : c.charAt(0).toUpperCase() + c.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Formulario nuevo mercado */}
              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4">
                <p className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest mb-3">Nuevo mercado</p>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="¿Cuál es la pregunta del mercado?"
                      className="flex-1 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2.5 outline-none text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:border-emerald-500/60 transition" />
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                      className="bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2.5 outline-none text-[13px] text-slate-900 dark:text-white focus:border-emerald-500/60 transition shrink-0">
                      {(config?.market_categories || "deporte,farandula,politica,elecciones,pais,general").split(",").filter(Boolean).map((cat: string) => (
                        <option key={cat.trim()} value={cat.trim()}>{cat.trim().charAt(0).toUpperCase() + cat.trim().slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest block mb-1">Fecha de cierre (opcional)</label>
                      <input type="datetime-local" value={newClosesAt} onChange={(e) => setNewClosesAt(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-4 py-2.5 outline-none text-[13px] text-slate-900 dark:text-white focus:border-emerald-500/60 transition" />
                    </div>
                    <div className="flex items-end">
                      <button onClick={handleCreateMarket} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg px-5 py-2.5 text-[13px] transition active:scale-95 cursor-pointer">Crear</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid de tarjetas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedMarkets.map((m) => {
                  const total = (Number(m.yes) + Number(m.no)) || 1;
                  const isZero = m.yes === 0 && m.no === 0;
                  const yesPct = isZero ? 50 : Math.round((Number(m.yes) / total) * 100);
                  const noPct = isZero ? 50 : 100 - yesPct;
                  const diff = m.closes_at ? new Date(m.closes_at).getTime() - Date.now() : null;
                  const countdown = diff && diff > 0
                    ? diff < 3600000
                      ? `${Math.floor(diff / 60000)}m`
                      : diff < 86400000
                        ? `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`
                        : `${Math.floor(diff / 86400000)}d ${Math.floor((diff % 86400000) / 3600000)}h`
                    : null;
                  const catEmoji: Record<string, string> = { deporte: "⚽", farandula: "🎭", politica: "🏛️", elecciones: "🗳️", pais: "📊", general: "🌐" };
                  const isEditing = editingMarket?.id === m.id;

                  return (
                    <div key={m.id} className={`bg-white dark:bg-[#111111] border rounded-2xl flex flex-col overflow-hidden transition-shadow hover:shadow-md ${
                      m.resolved ? "border-slate-200 dark:border-white/[0.06]" : "border-emerald-200/60 dark:border-emerald-500/20"
                    }`}>

                      {/* Cabecera tarjeta */}
                      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            m.resolved
                              ? "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/30"
                              : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.resolved ? "bg-slate-400" : "bg-emerald-500"}`} />
                            {m.resolved ? (m.winner === "yes" ? "Ganó Sí ✓" : "Ganó No ✗") : "En vivo"}
                          </span>
                          <span className="text-[10px] text-slate-300 dark:text-white/20 tabular-nums">#{m.id}</span>
                        </div>
                        <select
                          value={m.category || "general"}
                          onChange={async (e) => {
                            const token = localStorage.getItem("token");
                            await fetch(`https://api.ecuapred.com/admin/markets/${m.id}/category`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                              body: JSON.stringify({ category: e.target.value }),
                            });
                            fetchMarkets();
                          }}
                          className="text-[10px] bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-md px-2 py-1 text-slate-600 dark:text-white/50 outline-none focus:border-emerald-500/50 transition cursor-pointer"
                        >
                          {[["deporte","⚽ Deporte"],["farandula","🎭 Farándula"],["politica","🏛️ Política"],["elecciones","🗳️ Elecciones"],["pais","📊 País"],["general","🌐 General"]].map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Pregunta */}
                      <div className="px-4 pb-3 flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingMarket?.question ?? ""}
                              onChange={(e) => setEditingMarket((prev) => prev ? { ...prev, question: e.target.value } : null)}
                              onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleEditMarket(); if (e.key === "Escape") setEditingMarket(null); }}
                              rows={3}
                              className="w-full bg-slate-50 dark:bg-white/[0.06] border border-emerald-500/40 rounded-xl px-3 py-2 text-[13px] outline-none text-slate-900 dark:text-white resize-none"
                              autoFocus
                            />
                            <div>
                              <label className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest block mb-1">Fecha de cierre</label>
                              <input
                                type="datetime-local"
                                value={editingMarket?.closes_at ?? ""}
                                onChange={(e) => setEditingMarket((prev) => prev ? { ...prev, closes_at: e.target.value } : null)}
                                className="w-full bg-slate-50 dark:bg-white/[0.06] border border-emerald-500/40 rounded-xl px-3 py-2 text-[11px] outline-none text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-[13px] text-slate-700 dark:text-white/80 leading-snug font-medium">{m.question}</p>
                        )}
                      </div>

                      {/* Barra Sí/No */}
                      <div className="px-4 pb-3 space-y-2">
                        <div className="flex justify-between text-[11px] font-semibold">
                          <span className="text-emerald-600 dark:text-emerald-400">✅ Sí {yesPct}%</span>
                          <span className="text-rose-500 dark:text-rose-400">{noPct}% No ❌</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${yesPct}%` }} />
                        </div>
                        <div className="grid grid-cols-3 gap-1 pt-0.5">
                          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-2 py-1.5 text-center">
                            <p className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest">Sí</p>
                            <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">${Number(m.yes).toFixed(1)}</p>
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-500/10 rounded-lg px-2 py-1.5 text-center">
                            <p className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest">No</p>
                            <p className="text-[13px] font-bold text-rose-500 dark:text-rose-400 tabular-nums">${Number(m.no).toFixed(1)}</p>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg px-2 py-1.5 text-center">
                            <p className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest">Total</p>
                            <p className="text-[13px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">${(Number(m.yes) + Number(m.no)).toFixed(1)}</p>
                          </div>
                        </div>
                        {/* Fecha/countdown */}
                        {m.closes_at && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-slate-400 dark:text-white/30">⏱</span>
                            {!m.resolved && countdown
                              ? <span className="text-amber-500 dark:text-amber-400 font-medium">Cierra en {countdown}</span>
                              : <span className="text-slate-400 dark:text-white/30">{new Date(m.closes_at).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            }
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/[0.04] pt-3">
                        {m.resolved ? (
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                const token = localStorage.getItem("token");
                                await fetch(`https://api.ecuapred.com/admin/markets/${m.id}/archive`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ archived: !m.archived }),
                                });
                                fetchMarkets();
                                showToast(m.archived ? "Mercado restaurado" : "Mercado archivado", "info");
                              }}
                              className={`flex-1 py-2 rounded-xl border text-[11px] font-medium transition cursor-pointer ${m.archived ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/30 border-slate-200 dark:border-white/[0.08]"}`}
                            >
                              {m.archived ? "📂 Restaurar" : "🗄️ Archivar"}
                            </button>
                            <button
                              onClick={() => handleDeleteMarket(m.id)}
                              disabled={loadingAction === `delete-${m.id}`}
                              className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[11px] transition disabled:opacity-40 cursor-pointer"
                            >
                              {loadingAction === `delete-${m.id}` ? "…" : "🗑️ Eliminar"}
                            </button>
                          </div>
                        ) : isEditing ? (
                          <div className="flex gap-2">
                            <button onClick={handleEditMarket} className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[12px] transition cursor-pointer">✓ Guardar</button>
                            <button onClick={() => setEditingMarket(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/30 border border-slate-200 dark:border-white/[0.08] text-[11px] cursor-pointer">✕</button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => resolveMarket(m.id, "yes")}
                              disabled={!!loadingAction}
                              className="flex-1 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 text-[11px] font-bold transition disabled:opacity-40 cursor-pointer"
                            >
                              {loadingAction === `resolve-${m.id}` ? "…" : "✅ Sí gana"}
                            </button>
                            <button
                              onClick={() => resolveMarket(m.id, "no")}
                              disabled={!!loadingAction}
                              className="flex-1 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-[11px] font-bold transition disabled:opacity-40 cursor-pointer"
                            >
                              {loadingAction === `resolve-${m.id}` ? "…" : "❌ No gana"}
                            </button>
                            <button
                              onClick={() => setEditingMarket({ id: m.id, question: m.question, closes_at: m.closes_at ? new Date(m.closes_at).toLocaleString("sv-SE", { timeZone: "America/Guayaquil" }).slice(0, 16) : "" })}
                              className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-500 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition cursor-pointer"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

              {filteredMarkets.length === 0 && (
                <div className="text-center py-16 text-slate-400 dark:text-white/20 text-[13px]">
                  No hay mercados que coincidan con los filtros
                </div>
              )}

              <PaginationBar page={marketPage} totalPages={marketPages} setPage={setMarketPage} />
            </>
          )}

          {/* USUARIOS */}
          {activeSection === "users" && (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg font-bold">Usuarios</h1>
                  <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">{users.length} registrados</p>
                </div>
                <button
                  onClick={() => exportCSV(`usuarios_${new Date().toISOString().slice(0,10)}.csv`,
                    ["Email", "Nombre", "Apellido", "Saldo", "Rol", "Estado", "Cédula", "Celular", "Ciudad", "Registrado"],
                    users.map(u => [u.email, u.nombre, u.apellido, Number(u.points).toFixed(2), u.role, u.suspended ? "Suspendido" : "Activo", u.cedula, u.celular, u.ciudad, new Date(u.created_at + "Z").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil" })])
                  )}
                  className="flex items-center gap-1.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg text-[12px] transition cursor-pointer"
                >
                  ⬇ Exportar CSV
                </button>
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
                        <p className="col-span-1 text-center text-[12px] text-amber-500 dark:text-amber-400 font-bold tabular-nums">{Number(u.points).toFixed(2)}</p>
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
                          <button onClick={() => handlePoints(u.id, parseFloat(pointsInput[u.id] || "0"), u.email)} className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition cursor-pointer"><Plus size={11} /></button>
                          <button onClick={() => handlePoints(u.id, -parseFloat(pointsInput[u.id] || "0"), u.email)} className="p-1 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-500/30 transition cursor-pointer"><Minus size={11} /></button>
                        </div>
                        <div className="col-span-2 flex justify-end gap-1.5">
                          <button onClick={() => handleChangeRole(u.id, u.role)} className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition cursor-pointer"><ShieldCheck size={12} /></button>
                          <button onClick={() => handleSuspend(u.id, !u.suspended)} className={`p-1.5 rounded-md transition cursor-pointer ${u.suspended ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400"}`}><ShieldOff size={12} /></button>
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
                          <span className="text-amber-500 dark:text-amber-400 font-bold text-[12px]">{Number(u.points).toFixed(2)} $</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${u.role === "admin" ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/30"}`}>{u.role}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="number" placeholder="$" value={pointsInput[u.id] || ""}
                            onChange={(e) => setPointsInput((prev) => ({ ...prev, [u.id]: e.target.value }))}
                            className="w-16 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-md px-2 py-1.5 text-[11px] outline-none text-slate-900 dark:text-white text-center" />
                          <button onClick={() => handlePoints(u.id, parseFloat(pointsInput[u.id] || "0"), u.email)} className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-pointer"><Plus size={12} /></button>
                          <button onClick={() => handlePoints(u.id, -parseFloat(pointsInput[u.id] || "0"), u.email)} className="p-1.5 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 cursor-pointer"><Minus size={12} /></button>
                          <div className="ml-auto flex gap-1.5">
                            <button onClick={() => handleChangeRole(u.id, u.role)} className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 cursor-pointer"><ShieldCheck size={13} /></button>
                            <button onClick={() => handleSuspend(u.id, !u.suspended)} className={`p-1.5 rounded-md cursor-pointer ${u.suspended ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400"}`}><ShieldOff size={13} /></button>
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

          {/* TRANSACCIONES */}
          {activeSection === "transacciones" && (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-lg font-bold">Transacciones</h1>
                  <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                    {transactions.filter(t => t.status === "pendiente").length} pendientes · {transactions.length} total
                  </p>
                </div>
                <button
                  onClick={() => exportCSV(`transacciones_${new Date().toISOString().slice(0,10)}.csv`,
                    ["Email", "Tipo", "Monto", "Método", "Estado", "Código", "Fecha"],
                    transactions.map(t => [t.users?.email, t.type, Number(t.amount).toFixed(2), t.payment_method, t.status, t.transfer_code ?? "", new Date(t.created_at).toLocaleString("es-EC", { timeZone: "America/Guayaquil" })])
                  )}
                  className="flex items-center gap-1.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg text-[12px] transition cursor-pointer shrink-0"
                >
                  ⬇ Exportar CSV
                </button>
                <div className="flex items-center gap-1 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-lg p-1">
                  {([
                    { id: "transferencia", label: "Transferencia" },
                    { id: "tarjeta",       label: "Tarjeta" },
                    { id: "retiro",        label: "Retiro" },
                  ] as const).map((t) => {
                    const pending = transactions.filter(tx =>
                      t.id === "retiro" ? tx.type === "retiro" && tx.status === "pendiente" :
                      t.id === "tarjeta" ? (tx.payment_method === "tarjeta" || tx.payment_method === null) && tx.type === "recarga" && tx.status === "pendiente" :
                      tx.payment_method === t.id && tx.type === "recarga" && tx.status === "pendiente"
                    ).length;
                    return (
                      <button key={t.id} onClick={() => setTxFilter(t.id)}
                        className={`relative px-3 py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer ${txFilter === t.id ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70"}`}>
                        {t.label}
                        {pending > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">{pending}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {[txFilter].map((method) => (
                <div key={method} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-white/70 capitalize">
                      {method === "transferencia" ? "🏦 Recargas por transferencia" : method === "tarjeta" ? "💳 Recargas con tarjeta" : "📤 Solicitudes de retiro"}
                    </p>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const all = transactions.filter(t =>
                          method === "retiro" ? t.type === "retiro" :
                          method === "tarjeta" ? (t.payment_method === "tarjeta" || t.payment_method === null) && t.type === "recarga" :
                          t.payment_method === method && t.type === "recarga"
                        );
                        const pending = all.filter(t => t.status === "pendiente").length;
                        return (
                          <>
                            {pending > 0 && (
                              <span className="text-[10px] bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 rounded-md font-medium">
                                {pending} pendiente{pending !== 1 ? "s" : ""}
                              </span>
                            )}
                            <span className="text-[10px] bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/30 px-2 py-0.5 rounded-md">
                              {all.length} total
                            </span>
                          </>
                        );
                      })()}
                    </div>
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
                            <div className="col-span-2 flex flex-col items-center gap-0.5">
                              <span className="text-[11px] bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/50 px-2 py-0.5 rounded-md font-mono">{tx.transfer_code || "—"}</span>
                              <span className="text-[10px] text-slate-400 dark:text-white/30 truncate max-w-full">{tx.users?.banco || "—"}</span>
                              {tx.comprobante_url && (
                                <button
                                  onClick={() => setViewComprobante(tx.comprobante_url)}
                                  className="mt-0.5 flex items-center gap-1 text-[10px] text-sky-500 hover:text-sky-400 font-medium cursor-pointer transition"
                                  title="Ver foto del comprobante"
                                >
                                  🧾 Ver foto
                                </button>
                              )}
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
                                    className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition text-[10px] font-bold disabled:opacity-40 cursor-pointer"
                                    title="Aprobar"
                                  >{loadingAction === `tx-${tx.id}` ? "..." : "✓"}</button>
                                  <button
                                    onClick={() => handleTransactionStatus(tx.id, "rechazado", tx.user_id, tx.amount, tx)}
                                    disabled={loadingAction === `tx-${tx.id}`}
                                    className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition text-[10px] font-bold disabled:opacity-40 cursor-pointer"
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
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/50 px-2 py-0.5 rounded-md font-mono">{tx.transfer_code || "—"}</span>
                                <span className="text-[10px] text-slate-400 dark:text-white/30 truncate">{tx.users?.banco || "—"}</span>
                                {tx.comprobante_url && (
                                  <button
                                    onClick={() => setViewComprobante(tx.comprobante_url)}
                                    className="mt-0.5 text-left text-[10px] text-sky-500 hover:text-sky-400 font-medium cursor-pointer"
                                  >
                                    🧾 Ver foto
                                  </button>
                                )}
                              </div>
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
                                className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[11px] font-bold disabled:opacity-40 cursor-pointer"
                              >{loadingAction === `tx-${tx.id}` ? "..." : "Aprobar"}</button>
                              <button
                                onClick={() => handleTransactionStatus(tx.id, "rechazado", tx.user_id, tx.amount, tx)}
                                disabled={loadingAction === `tx-${tx.id}`}
                                className="flex-1 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[11px] font-bold disabled:opacity-40 cursor-pointer"
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
                                {new Date(s.suggested_close_date + "T12:00:00").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "long", year: "numeric" })}
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

                    {/* Chat IA — sugerencias */}
                    {s.status === "pending" && (
                      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-xl px-4 py-3 mb-3 space-y-2">
                        <p className="text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest flex items-center gap-1.5"><MessageCircle size={11} /> Chat con IA</p>
                        {(chatMessages[`s-${s.id}`] || []).length > 0 && (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {(chatMessages[`s-${s.id}`] || []).map((msg, i) => (
                              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                {msg.role === "assistant" && (
                                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 grid place-items-center shrink-0 mt-0.5 text-[10px]">🤖</div>
                                )}
                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-snug ${
                                  msg.role === "user"
                                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/70"
                                }`}>
                                  {msg.content}
                                </div>
                              </div>
                            ))}
                            {chatSending[`s-${s.id}`] && (
                              <div className="flex gap-2 justify-start">
                                <div className="h-5 w-5 rounded-full bg-emerald-500/20 grid place-items-center shrink-0 text-[10px]">🤖</div>
                                <div className="bg-slate-100 dark:bg-white/[0.06] px-3 py-2 rounded-xl text-[12px] text-slate-400 dark:text-white/30">Escribiendo...</div>
                              </div>
                            )}
                          </div>
                        )}
                        {chatPending[`s-${s.id}`] && (
                          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3 space-y-2">
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold">✦ Nueva pregunta sugerida</p>
                            <p className="text-[12px] text-slate-900 dark:text-white font-medium">{chatPending[`s-${s.id}`]}</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => applyNewQuestion(`s-${s.id}`, s.id, chatPending[`s-${s.id}`]!)}
                                className="bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                              >✓ Aplicar</button>
                              <button
                                onClick={() => setChatPending(prev => ({ ...prev, [`s-${s.id}`]: null }))}
                                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-white/60 px-2 py-1.5 transition cursor-pointer"
                              >Ignorar</button>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            placeholder="Pregunta a la IA sobre esta sugerencia..."
                            value={chatInput[`s-${s.id}`] || ""}
                            onChange={(e) => setChatInput(prev => ({ ...prev, [`s-${s.id}`]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter" && !chatSending[`s-${s.id}`]) handleChat(`s-${s.id}`, s.id, { title: s.title, summary: s.summary, current_question: s.new_market_question, suggested_close_date: s.suggested_close_date, url: s.url }); }}
                            disabled={chatSending[`s-${s.id}`]}
                            className="flex-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px] outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:border-emerald-500/40 transition disabled:opacity-50"
                          />
                          <button
                            onClick={() => handleChat(`s-${s.id}`, s.id, { title: s.title, summary: s.summary, current_question: s.new_market_question, suggested_close_date: s.suggested_close_date, url: s.url })}
                            disabled={chatSending[`s-${s.id}`] || !chatInput[`s-${s.id}`]?.trim()}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-[12px] font-bold transition shrink-0 cursor-pointer"
                          >
                            {chatSending[`s-${s.id}`] ? "⏳" : "↑"}
                          </button>
                        </div>
                      </div>
                    )}

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
      className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-4 py-2 rounded-lg text-[12px] font-bold transition disabled:opacity-40 cursor-pointer"
    >
      {loadingAction === `suggestion-${s.id}-approve_market` ? "Creando..." : "✅ Crear mercado"}
    </button>
  </div>
 )}
                        {s.resolves_market_id && (
                          <button
                            onClick={() => handleSuggestion(s.id, "approve_resolve")}
                            disabled={loadingAction === `suggestion-${s.id}-approve_resolve`}
                            className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-4 py-2 rounded-lg text-[12px] font-bold transition disabled:opacity-40 cursor-pointer"
                          >
                            {loadingAction === `suggestion-${s.id}-approve_resolve` ? "Resolviendo..." : "🔔 Resolver mercado"}
                          </button>
                        )}
                        <button
                          onClick={() => handleSuggestion(s.id, "reject")}
                          disabled={loadingAction === `suggestion-${s.id}-reject`}
                          className="bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/30 border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.08] px-4 py-2 rounded-lg text-[12px] transition ml-auto disabled:opacity-40 cursor-pointer"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem("token");
                            await fetch(`https://api.ecuapred.com/admin/news-suggestions/${s.id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
                            showToast("Sugerencia eliminada", "info");
                            fetchSuggestions();
                          }}
                          className="bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-4 py-2 rounded-lg text-[12px] transition cursor-pointer"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-300 dark:text-white/15 mt-3">{new Date(s.created_at + "Z").toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    {s.status !== "pending" && (
                      <button
                        onClick={async () => {
                          const token = localStorage.getItem("token");
                          await fetch(`https://api.ecuapred.com/admin/news-suggestions/${s.id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
                          showToast("Sugerencia eliminada", "info");
                          fetchSuggestions();
                        }}
                        className="bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-lg text-[11px] transition mt-2 cursor-pointer"
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
                    n.status === "pending" ? (n.source === "bot_close" ? "border-violet-200 dark:border-violet-500/20" : "border-amber-200 dark:border-amber-500/20")
                    : n.status === "approved" ? "border-emerald-200 dark:border-emerald-500/20 opacity-70"
                    : "border-slate-200 dark:border-white/[0.06] opacity-40"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {n.source === "bot_close" && (
                            <span className="text-[10px] bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-md uppercase tracking-wider font-bold">Cierre IA</span>
                          )}
                          {n.source === "bot_close" && n.resolves_as && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider font-bold ${n.resolves_as === "yes" ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
                              Ganó: {n.resolves_as === "yes" ? "SÍ" : "NO"}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug">{n.title}</p>
                        {n.url && (
                          <a href={n.url} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-blue-500 dark:text-blue-400 hover:underline mt-0.5 block truncate">
                            {n.source === "bot_close" ? "Ver fuente" : (n.source || n.url)}
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
                      <p className={`text-[12px] text-slate-500 dark:text-white/40 leading-relaxed border-l-2 border-slate-200 dark:border-white/10 pl-3 ${n.source === "bot_close" ? "whitespace-pre-line" : "line-clamp-3"}`}>
                        {n.content}
                      </p>
                    )}

                    {n.market_id && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-white/40">
                        <span>🔗 Mercado</span>
                        <span className="font-bold text-slate-700 dark:text-white/60">#{n.market_id}</span>
                        <span className="text-slate-400 dark:text-white/25 truncate">
                          — {markets.find(m => m.id === n.market_id)?.question || ""}
                        </span>
                      </div>
                    )}

                    {/* Chat IA — noticias */}
                    {n.status === "pending" && (
                      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-xl px-4 py-3 space-y-2">
                        <p className="text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest flex items-center gap-1.5"><MessageCircle size={11} /> Chat con IA</p>
                        {(chatMessages[`n-${n.id}`] || []).length > 0 && (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {(chatMessages[`n-${n.id}`] || []).map((msg, i) => (
                              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                {msg.role === "assistant" && (
                                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 grid place-items-center shrink-0 mt-0.5 text-[10px]">🤖</div>
                                )}
                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-snug ${
                                  msg.role === "user"
                                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/70"
                                }`}>
                                  {msg.content}
                                </div>
                              </div>
                            ))}
                            {chatSending[`n-${n.id}`] && (
                              <div className="flex gap-2 justify-start">
                                <div className="h-5 w-5 rounded-full bg-emerald-500/20 grid place-items-center shrink-0 text-[10px]">🤖</div>
                                <div className="bg-slate-100 dark:bg-white/[0.06] px-3 py-2 rounded-xl text-[12px] text-slate-400 dark:text-white/30">Escribiendo...</div>
                              </div>
                            )}
                          </div>
                        )}
                        {chatPending[`n-${n.id}`] && (
                          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3 space-y-2">
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold">✦ Texto reformulado</p>
                            <p className="text-[12px] text-slate-900 dark:text-white font-medium">{chatPending[`n-${n.id}`]}</p>
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={async () => {
                                  const token = localStorage.getItem("token");
                                  const res = await fetch(`https://api.ecuapred.com/admin/market-news/${n.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ market_id: n.market_id, status: n.status, title: chatPending[`n-${n.id}`] }),
                                  });
                                  if (res.ok) {
                                    setChatPending(prev => ({ ...prev, [`n-${n.id}`]: null }));
                                    fetchMarketNews();
                                    showToast("Título actualizado ✅", "success");
                                  } else {
                                    showToast("Error al actualizar", "error");
                                  }
                                }}
                                className="bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                              >✓ Aplicar como título</button>
                              <button
                                onClick={() => { navigator.clipboard.writeText(chatPending[`n-${n.id}`]!); showToast("Copiado al portapapeles", "info"); }}
                                className="bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/60 text-[11px] font-bold px-3 py-1.5 rounded-lg transition hover:bg-slate-200 dark:hover:bg-white/[0.1] cursor-pointer"
                              >📋 Copiar</button>
                              <button
                                onClick={() => setChatPending(prev => ({ ...prev, [`n-${n.id}`]: null }))}
                                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-white/60 px-2 py-1.5 transition cursor-pointer"
                              >Ignorar</button>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            placeholder="Pregunta a la IA sobre esta noticia..."
                            value={chatInput[`n-${n.id}`] || ""}
                            onChange={(e) => setChatInput(prev => ({ ...prev, [`n-${n.id}`]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter" && !chatSending[`n-${n.id}`]) handleChat(`n-${n.id}`, n.id, { title: n.title, summary: n.content, current_question: null, url: n.url, mode: "news" }); }}
                            disabled={chatSending[`n-${n.id}`]}
                            className="flex-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px] outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:border-emerald-500/40 transition disabled:opacity-50"
                          />
                          <button
                            onClick={() => handleChat(`n-${n.id}`, n.id, { title: n.title, summary: n.content, current_question: null, url: n.url, mode: "news" })}
                            disabled={chatSending[`n-${n.id}`] || !chatInput[`n-${n.id}`]?.trim()}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-[12px] font-bold transition shrink-0 cursor-pointer"
                          >
                            {chatSending[`n-${n.id}`] ? "⏳" : "↑"}
                          </button>
                        </div>
                      </div>
                    )}

                    {n.status === "pending" && n.source === "bot_close" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal({
                            title: `¿Resolver mercado como "${n.resolves_as === "yes" ? "SÍ" : "NO"} gana"?`,
                            description: "Esta acción es irreversible y distribuirá los premios a los ganadores.",
                            confirmLabel: `Resolver → ${n.resolves_as === "yes" ? "SÍ" : "NO"}`,
                            danger: true,
                            onConfirm: async () => {
                              const token = localStorage.getItem("token");
                              const [r1, r2] = await Promise.all([
                                fetch(`https://api.ecuapred.com/admin/market-news/${n.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ market_id: n.market_id, status: "approved" }),
                                }),
                                fetch(`https://api.ecuapred.com/admin/resolve/${n.market_id}`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ winner: n.resolves_as }),
                                }),
                              ]);
                              if (r1.ok && r2.ok) { showToast(`Mercado resuelto → ${n.resolves_as === "yes" ? "SÍ" : "NO"} ✅`, "success"); fetchMarketNews(); fetchMarkets(); }
                              else showToast("Error al aprobar", "error");
                            },
                          })}
                          className={`flex-1 font-bold rounded-lg py-2 text-[12px] transition cursor-pointer ${n.resolves_as === "yes" ? "bg-emerald-500 hover:bg-emerald-400 text-black" : "bg-rose-500 hover:bg-rose-400 text-white"}`}
                        >
                          ✓ Aprobar y resolver → {n.resolves_as === "yes" ? "SÍ" : "NO"}
                        </button>
                        <button
                          onClick={() => openModal({
                            title: `¿Resolver como "${n.resolves_as === "yes" ? "NO" : "SÍ"} gana"? (invertido)`,
                            description: "Esta acción es irreversible y distribuirá los premios a los ganadores.",
                            confirmLabel: `Resolver → ${n.resolves_as === "yes" ? "NO" : "SÍ"}`,
                            danger: true,
                            onConfirm: async () => {
                              const token = localStorage.getItem("token");
                              const inverted = n.resolves_as === "yes" ? "no" : "yes";
                              const [r1, r2] = await Promise.all([
                                fetch(`https://api.ecuapred.com/admin/market-news/${n.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ market_id: n.market_id, status: "approved", resolves_as: inverted }),
                                }),
                                fetch(`https://api.ecuapred.com/admin/resolve/${n.market_id}`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ winner: inverted }),
                                }),
                              ]);
                              if (r1.ok && r2.ok) { showToast(`Mercado resuelto → ${inverted === "yes" ? "SÍ" : "NO"} ✅`, "success"); fetchMarketNews(); fetchMarkets(); }
                              else showToast("Error al aprobar", "error");
                            },
                          })}
                          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-[12px] text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer"
                        >
                          ↔ Invertir
                        </button>
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem("token");
                            await fetch(`https://api.ecuapred.com/admin/market-news/${n.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                              body: JSON.stringify({ market_id: null, status: "rejected" }),
                            });
                            showToast("Noticia rechazada", "info"); fetchMarketNews();
                          }}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-[12px] text-slate-400 dark:text-white/25 hover:text-rose-500 transition cursor-pointer"
                        >✕</button>
                      </div>
                    )}

                    {n.status === "pending" && n.source !== "bot_close" && (
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
                              const res = await fetch(`https://api.ecuapred.com/admin/market-news/${n.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                body: JSON.stringify({ market_id: Number(mid), status: "approved" }),
                              });
                              const data = await res.json();
                              if (res.ok) { showToast("Noticia aprobada ✅", "success"); fetchMarketNews(); }
                              else showToast(data.message, "error");
                            }}
                            className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-4 py-2 rounded-lg text-[12px] font-bold transition cursor-pointer"
                          >
                            ✅ Aprobar
                          </button>
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem("token");
                              const res = await fetch(`https://api.ecuapred.com/admin/market-news/${n.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                body: JSON.stringify({ market_id: null, status: "rejected" }),
                              });
                              if (res.ok) { showToast("Noticia rechazada", "info"); fetchMarketNews(); }
                            }}
                            className="bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/30 border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.08] px-4 py-2 rounded-lg text-[12px] transition cursor-pointer"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem("token");
                              await fetch(`https://api.ecuapred.com/admin/market-news/${n.id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
                              showToast("Noticia eliminada", "info");
                              fetchMarketNews();
                            }}
                            className="bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-4 py-2 rounded-lg text-[12px] transition cursor-pointer"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-300 dark:text-white/15">{new Date(n.created_at + "Z").toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    {n.status !== "pending" && (
                      <button
                        onClick={async () => {
                          const token = localStorage.getItem("token");
                          await fetch(`https://api.ecuapred.com/admin/market-news/${n.id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
                          showToast("Noticia eliminada", "info");
                          fetchMarketNews();
                        }}
                        className="bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-lg text-[11px] transition mt-2 cursor-pointer"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* COMENTARIOS */}
          {activeSection === "comentarios" && (
            <>
              <div>
                <h1 className="text-lg font-bold">Comentarios</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                  {adminComments.length} comentario{adminComments.length !== 1 ? "s" : ""} en total
                </p>
              </div>

              {/* Filtro por mercado */}
              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl px-4 py-3">
                <label className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest block mb-1.5">Filtrar por mercado</label>
                <select
                  value={commentMarketFilter}
                  onChange={(e) => setCommentMarketFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-slate-700 dark:text-white/70 outline-none"
                >
                  <option value="all">Todos los mercados</option>
                  {Array.from(new Map(adminComments.map(c => [c.market_id, c.markets?.question])).entries()).map(([id, question]) => (
                    <option key={id} value={String(id)}>{question || `Mercado #${id}`}</option>
                  ))}
                </select>
              </div>

              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] hidden sm:block">
                  <div className="grid grid-cols-12 text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest">
                    <span className="col-span-3">Mercado</span>
                    <span className="col-span-2">Usuario</span>
                    <span className="col-span-4">Comentario</span>
                    <span className="col-span-1">Fecha</span>
                    <span className="col-span-2 text-right">Acciones</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                  {adminComments.filter(c => commentMarketFilter === "all" || String(c.market_id) === commentMarketFilter).length === 0 && (
                    <p className="px-5 py-8 text-[12px] text-slate-400 dark:text-white/20 text-center">Sin comentarios</p>
                  )}
                  {adminComments
                    .filter(c => commentMarketFilter === "all" || String(c.market_id) === commentMarketFilter)
                    .map((c) => (
                      <div key={c.id} className={`px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition ${c.hidden ? "opacity-50" : ""}`}>
                        {/* Desktop */}
                        <div className="hidden sm:grid grid-cols-12 items-start gap-2">
                          <p className="col-span-3 text-[12px] text-slate-500 dark:text-white/40 truncate">{c.markets?.question || `#${c.market_id}`}</p>
                          <p className="col-span-2 text-[12px] text-slate-600 dark:text-white/60 truncate">{c.username}</p>
                          <div className="col-span-4">
                            <p className="text-[12px] text-slate-500 dark:text-white/40 line-clamp-2">{c.content}</p>
                            {c.hidden && <span className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.5 rounded-md mt-1 inline-block">Oculto</span>}
                          </div>
                          <p className="col-span-1 text-[10px] text-slate-300 dark:text-white/20 tabular-nums">
                            {new Date(c.created_at).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit" })}
                          </p>
                          <div className="col-span-2 flex justify-end gap-1">
                            <button
                              onClick={async () => {
                                const token = localStorage.getItem("token");
                                const res = await fetch(`https://api.ecuapred.com/admin/comments/${c.id}/hide`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ hidden: !c.hidden }),
                                });
                                if (res.ok) { showToast(c.hidden ? "Comentario visible" : "Comentario ocultado", "info"); fetchAdminComments(); }
                                else showToast("Error", "error");
                              }}
                              className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 px-2 py-1 rounded-md transition cursor-pointer"
                            >
                              {c.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                            <button
                              onClick={() => openModal({
                                title: "¿Eliminar comentario?",
                                description: `"${c.content.slice(0, 60)}${c.content.length > 60 ? "…" : ""}"`,
                                confirmLabel: "Eliminar",
                                danger: true,
                                onConfirm: async () => {
                                  const token = localStorage.getItem("token");
                                  const res = await fetch(`https://api.ecuapred.com/admin/comments/${c.id}`, {
                                    method: "DELETE",
                                    headers: { authorization: `Bearer ${token}` },
                                  });
                                  if (res.ok) { showToast("Comentario eliminado", "info"); fetchAdminComments(); }
                                  else showToast("Error al eliminar", "error");
                                },
                              })}
                              className="text-[10px] bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-2 py-1 rounded-md transition cursor-pointer"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        {/* Mobile */}
                        <div className="sm:hidden space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[12px] font-medium text-slate-700 dark:text-white/70">{c.username}</p>
                              <p className="text-[10px] text-slate-400 dark:text-white/30 truncate">{c.markets?.question || `#${c.market_id}`}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {c.hidden && <span className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.5 rounded-md">Oculto</span>}
                              <p className="text-[10px] text-slate-300 dark:text-white/20 tabular-nums">
                                {new Date(c.created_at).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit" })}
                              </p>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-white/40">{c.content}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                const token = localStorage.getItem("token");
                                const res = await fetch(`https://api.ecuapred.com/admin/comments/${c.id}/hide`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ hidden: !c.hidden }),
                                });
                                if (res.ok) { showToast(c.hidden ? "Comentario visible" : "Comentario ocultado", "info"); fetchAdminComments(); }
                                else showToast("Error", "error");
                              }}
                              className="text-[11px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 rounded-lg cursor-pointer"
                            >
                              {c.hidden ? "Mostrar" : "Ocultar"}
                            </button>
                            <button
                              onClick={() => openModal({
                                title: "¿Eliminar comentario?",
                                confirmLabel: "Eliminar",
                                danger: true,
                                onConfirm: async () => {
                                  const token = localStorage.getItem("token");
                                  const res = await fetch(`https://api.ecuapred.com/admin/comments/${c.id}`, {
                                    method: "DELETE",
                                    headers: { authorization: `Bearer ${token}` },
                                  });
                                  if (res.ok) { showToast("Comentario eliminado", "info"); fetchAdminComments(); }
                                  else showToast("Error al eliminar", "error");
                                },
                              })}
                              className="text-[11px] bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 px-3 py-1.5 rounded-lg cursor-pointer"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}

          {/* CONTACTO */}
          {/* BOT NEWS */}
          {activeSection === "botnews" && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold flex items-center gap-2">
                    🤖 BotNews
                  </h1>
                  <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                    {botSuggestions.filter(s => s.status === "pending").length} preguntas pendientes de revisión
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {botStatus?.isRunning ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      Procesando...
                    </span>
                  ) : botStatus?.schedulerEnabled === false ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      No monitoreando
                    </span>
                  ) : botUrls.filter(u => u.active).length > 0 ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Monitoreando
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      No monitoreando
                    </span>
                  )}
                </div>
              </div>

              {/* Configuración del bot */}
              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5 space-y-4">
                <p className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest">Fuentes de noticias</p>

                {/* Input agregar URL */}
                <div className="flex gap-2">
                  <input
                    placeholder="https://www.elcomercio.com, https://reuters.com..."
                    value={botUrlInput}
                    onChange={(e) => setBotUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const url = botUrlInput.trim();
                        if (!url) return;
                        const token = localStorage.getItem("token");
                        fetch("https://api.ecuapred.com/admin/bot/urls", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                          body: JSON.stringify({ url, interval_min: botInterval }),
                        }).then(r => r.json()).then(d => {
                          if (d.url) { setBotUrlInput(""); fetchBotUrls(); showToast("URL agregada ✅", "success"); }
                          else showToast(d.message || "Error", "error");
                        });
                      }
                    }}
                    className="flex-1 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:border-emerald-500/50 transition"
                  />
                  <button
                    onClick={async () => {
                      const url = botUrlInput.trim();
                      if (!url) return;
                      const token = localStorage.getItem("token");
                      const res = await fetch("https://api.ecuapred.com/admin/bot/urls", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                        body: JSON.stringify({ url, interval_min: botInterval }),
                      });
                      const data = await res.json();
                      if (res.ok) { setBotUrlInput(""); fetchBotUrls(); showToast("URL agregada ✅", "success"); }
                      else showToast(data.message || "Error", "error");
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg px-4 py-2.5 text-[12px] transition shrink-0 cursor-pointer"
                  >
                    + Agregar
                  </button>
                </div>

                {/* Chips de URLs */}
                {botUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {botUrls.map((u) => (
                      <div key={u.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] transition ${
                        u.active
                          ? "bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white/70"
                          : "bg-slate-50/50 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.04] text-slate-400 dark:text-white/30"
                      }`}>
                        <span className="text-[10px]">🔗</span>
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem("token");
                            await fetch(`https://api.ecuapred.com/admin/bot/urls/${u.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                              body: JSON.stringify({ active: !u.active }),
                            });
                            fetchBotUrls();
                          }}
                          className="hover:opacity-70 transition cursor-pointer"
                          title={u.active ? "Pausar" : "Activar"}
                        >
                          {u.label || new URL(u.url).hostname.replace("www.", "")}
                        </button>
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem("token");
                            await fetch(`https://api.ecuapred.com/admin/bot/urls/${u.id}`, {
                              method: "DELETE",
                              headers: { authorization: `Bearer ${token}` },
                            });
                            fetchBotUrls();
                            showToast("URL eliminada", "info");
                          }}
                          className="text-slate-400 dark:text-white/30 hover:text-rose-500 transition ml-0.5 cursor-pointer"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Intervalo y acciones */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2 text-[12px] text-slate-400 dark:text-white/30 flex-wrap">
                    <span>🕐 Revisión cada</span>
                    <select
                      value={botInterval}
                      onChange={async (e) => {
                        const val = Number(e.target.value);
                        setBotInterval(val);
                        const token = localStorage.getItem("token");
                        for (const u of botUrls) {
                          await fetch(`https://api.ecuapred.com/admin/bot/urls/${u.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                            body: JSON.stringify({ interval_min: val }),
                          });
                        }
                        fetchBotUrls();
                      }}
                      className="bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-lg px-2 py-1 text-[12px] text-slate-700 dark:text-white/60 outline-none"
                    >
                      {[5, 10, 15, 30, 60].map(v => <option key={v} value={v}>{v} min</option>)}
                    </select>
                    {botStatus?.lastRun && (
                      <span className="text-slate-300 dark:text-white/20">
                        · Última: {new Date(botStatus.lastRun + "Z").toLocaleTimeString("es-EC", { timeZone: "America/Guayaquil", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={botRunning || botUrls.filter(u => u.active).length === 0}
                      onClick={async () => {
                        setBotRunning(true);
                        const token = localStorage.getItem("token");
                        await fetch("https://api.ecuapred.com/admin/bot/enable", {
                          method: "POST",
                          headers: { authorization: `Bearer ${token}` },
                        });
                        const res = await fetch("https://api.ecuapred.com/admin/bot/run", {
                          method: "POST",
                          headers: { authorization: `Bearer ${token}` },
                        });
                        const data = await res.json();
                        setBotRunning(false);
                        fetchBotSuggestions(); fetchBotStatus();
                        showToast(`Bot ejecutado · ${data.processed || 0} preguntas generadas`, "success");
                      }}
                      className="bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/50 px-3 py-2 sm:py-1.5 rounded-lg text-[12px] transition disabled:opacity-40 cursor-pointer"
                    >
                      {botRunning ? "⏳ Ejecutando..." : "▶ Ejecutar ahora"}
                    </button>
                    <button
                      disabled={botStatus?.schedulerEnabled === false}
                      onClick={async () => {
                        const token = localStorage.getItem("token");
                        await fetch("https://api.ecuapred.com/admin/bot/stop", {
                          method: "POST",
                          headers: { authorization: `Bearer ${token}` },
                        });
                        fetchBotStatus();
                        showToast("Ejecución detenida · El bot dejará de generar noticias", "error");
                      }}
                      className="bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 px-3 py-2 sm:py-1.5 rounded-lg text-[12px] transition disabled:opacity-40 cursor-pointer"
                    >
                      ⏹ Parar ejecución
                    </button>
                  </div>
                </div>
              </div>

              {/* Feed de noticias */}
              <div>
                <p className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest mb-3">Noticias detectadas</p>

                {/* Filtros */}
                <div className="flex flex-col gap-2 items-start mb-3">
                  <div className="flex items-center gap-1 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-lg p-1">
                    {([
                      { id: "pending", label: "Pendientes" },
                      { id: "approved", label: "Aprobados" },
                      { id: "rejected", label: "Rechazados" },
                    ] as const).map((f) => {
                      const count = botSuggestions.filter(s => s.status === f.id).length;
                      return (
                        <button key={f.id} onClick={() => { setBotFilter(f.id); setBotPage(1); }}
                          className={`relative px-3 py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer ${botFilter === f.id ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70"}`}>
                          {f.label}
                          {count > 0 && f.id === "pending" && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-lg p-1 overflow-x-auto max-w-[calc(100vw-2rem)] scrollbar-none">
                    {(["todas", "deporte", "farandula", "politica", "elecciones", "pais", "general"] as const).map((cat) => (
                      <button key={cat} onClick={() => { setBotCategoryFilter(cat); setBotPage(1); }}
                        className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-medium transition capitalize cursor-pointer ${botCategoryFilter === cat ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70"}`}>
                        {cat === "todas" ? "Todas" : cat === "farandula" ? "Farándula" : cat === "politica" ? "Política" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const filtered = botSuggestions.filter(s =>
                    s.status === botFilter &&
                    (botCategoryFilter === "todas" || s.category === botCategoryFilter)
                  );
                  const BOT_PAGE_SIZE = 10;
                  const totalPages = Math.max(1, Math.ceil(filtered.length / BOT_PAGE_SIZE));
                  const paginated = filtered.slice((botPage - 1) * BOT_PAGE_SIZE, botPage * BOT_PAGE_SIZE);
                  return (
                    <>
                      {filtered.length === 0 && (
                        <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-10 text-center">
                          <p className="text-[12px] text-slate-400 dark:text-white/20">
                            {botSuggestions.length === 0 ? "El bot aún no ha detectado noticias. Agrega URLs y ejecuta el bot." : "No hay noticias en esta categoría."}
                          </p>
                        </div>
                      )}

                <div className="space-y-3">
                  {paginated.map((s) => (
                    <div key={s.id} className={`bg-white dark:bg-[#111111] border rounded-xl p-5 transition ${
                      s.status === "pending" ? "border-slate-200 dark:border-white/[0.08]"
                      : s.status === "approved" ? "border-emerald-200 dark:border-emerald-500/20 opacity-50"
                      : "border-slate-100 dark:border-white/[0.04] opacity-30"
                    }`}>
                      {/* Cabecera noticia */}
                      <div className="mb-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug flex-1 min-w-0">{s.title}</p>
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            {s.impact && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider font-bold ${
                                s.impact === "alto" ? "bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                : s.impact === "medio" ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/30"
                              }`}>
                                {s.impact === "alto" ? "● Alto" : s.impact === "medio" ? "▶ Medio" : "○ Bajo"}
                              </span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              s.status === "pending" ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : s.status === "approved" ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/30"
                            }`}>
                              {s.status === "pending" ? "Pendiente" : s.status === "approved" ? "Aprobado" : "Rechazado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {s.url && (
                            <a href={s.url} target="_blank" rel="noopener noreferrer"
                              className="text-[11px] text-slate-400 dark:text-white/30 hover:text-blue-500 transition truncate max-w-[180px] sm:max-w-[260px]">
                              🔗 {(() => { try { return new URL(s.url).hostname.replace("www.", ""); } catch { return s.url; } })()}
                            </a>
                          )}
                          <span className="text-[11px] text-slate-300 dark:text-white/20">
                            {new Date(s.created_at + "Z").toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>

                      {/* Resumen */}
                      {s.summary && (
                        <p className="text-[12px] text-slate-500 dark:text-white/40 mb-4 leading-relaxed border-l-2 border-slate-200 dark:border-white/10 pl-3">
                          {s.summary}
                        </p>
                      )}

                      {/* Pregunta generada */}
                      {s.new_market_question && (
                        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl px-4 py-3 mb-3 space-y-3">
                          <p className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest">✦ Pregunta de predicción</p>
                          <p className="text-[13px] text-slate-900 dark:text-white font-semibold">{s.new_market_question}</p>

                          {/* Chat IA */}
                          {s.status === "pending" && (
                            <div className="border-t border-slate-200 dark:border-white/[0.06] pt-2 space-y-2">
                              {/* Historial */}
                              {(chatMessages[`b-${s.id}`] || []).length > 0 && (
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                  {(chatMessages[`b-${s.id}`] || []).map((msg, i) => (
                                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                      {msg.role === "assistant" && (
                                        <div className="h-5 w-5 rounded-full bg-emerald-500/20 grid place-items-center shrink-0 mt-0.5 text-[10px]">🤖</div>
                                      )}
                                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-snug ${
                                        msg.role === "user"
                                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                          : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/70"
                                      }`}>
                                        {msg.content}
                                      </div>
                                    </div>
                                  ))}
                                  {chatSending[`b-${s.id}`] && (
                                    <div className="flex gap-2 justify-start">
                                      <div className="h-5 w-5 rounded-full bg-emerald-500/20 grid place-items-center shrink-0 text-[10px]">🤖</div>
                                      <div className="bg-slate-100 dark:bg-white/[0.06] px-3 py-2 rounded-xl text-[12px] text-slate-400 dark:text-white/30">
                                        Escribiendo...
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Pregunta sugerida por la IA */}
                              {chatPending[`b-${s.id}`] && (
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3 space-y-2">
                                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold">✦ Nueva pregunta sugerida</p>
                                  <p className="text-[12px] text-slate-900 dark:text-white font-medium">{chatPending[`b-${s.id}`]}</p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => applyNewQuestion(`b-${s.id}`, s.id, chatPending[`b-${s.id}`]!)}
                                      className="bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                                    >
                                      ✓ Aplicar
                                    </button>
                                    <button
                                      onClick={() => setChatPending(prev => ({ ...prev, [`b-${s.id}`]: null }))}
                                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-white/60 px-2 py-1.5 transition cursor-pointer"
                                    >
                                      Ignorar
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Input */}
                              <div className="flex gap-2">
                                <input
                                  placeholder="Ej: ¿Cuándo es exactamente el evento? Cambia el plazo a noviembre..."
                                  value={chatInput[`b-${s.id}`] || ""}
                                  onChange={(e) => setChatInput(prev => ({ ...prev, [`b-${s.id}`]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === "Enter" && !chatSending[`b-${s.id}`]) handleChat(`b-${s.id}`, s.id, { title: s.title, summary: s.summary, current_question: s.new_market_question, suggested_close_date: s.suggested_close_date, url: s.url }); }}
                                  disabled={chatSending[`b-${s.id}`]}
                                  className="flex-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px] outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:border-emerald-500/40 transition disabled:opacity-50"
                                />
                                <button
                                  onClick={() => handleChat(`b-${s.id}`, s.id, { title: s.title, summary: s.summary, current_question: s.new_market_question, suggested_close_date: s.suggested_close_date, url: s.url })}
                                  disabled={chatSending[`b-${s.id}`] || !chatInput[`b-${s.id}`]?.trim()}
                                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-[12px] font-bold transition shrink-0 cursor-pointer"
                                >
                                  {chatSending[`b-${s.id}`] ? "⏳" : "↑"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Probabilidades */}
                          {s.probability_yes != null && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Sí {s.probability_yes}%</span>
                                <span className="text-rose-500 dark:text-rose-400 font-bold">No {s.probability_no}%</span>
                              </div>
                              <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                <div className="bg-emerald-500 transition-all" style={{ width: `${s.probability_yes}%` }} />
                                <div className="bg-rose-500 flex-1" />
                              </div>
                              {s.probability_reasoning && (
                                <p className="text-[11px] text-slate-400 dark:text-white/25 italic">{s.probability_reasoning}</p>
                              )}
                            </div>
                          )}

                          {/* Fecha de cierre y categoría */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] text-slate-400 dark:text-white/30">📅 Fecha de cierre</label>
                              <input
                                type="datetime-local"
                                value={closeDates[s.id] || ""}
                                onChange={(e) => setCloseDates(prev => ({ ...prev, [s.id]: e.target.value }))}
                                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-2 py-1.5 text-[12px] outline-none text-slate-900 dark:text-white focus:border-emerald-500/40 transition"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] text-slate-400 dark:text-white/30">🏷 Categoría</label>
                              <select
                                value={selectedCategories[s.id] || "general"}
                                onChange={(e) => setSelectedCategories(prev => ({ ...prev, [s.id]: e.target.value }))}
                                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-2 py-1.5 text-[12px] outline-none text-slate-900 dark:text-white focus:border-emerald-500/40 transition"
                              >
                                <option value="deporte">Deporte</option>
                                <option value="farandula">Farándula</option>
                                <option value="politica">Política</option>
                                <option value="elecciones">Elecciones</option>
                                <option value="pais">País</option>
                                <option value="general">General</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Acciones */}
                      {s.status === "approved" && (
                        <div className="flex justify-end mt-1">
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem("token");
                              await fetch(`https://api.ecuapred.com/admin/news-suggestions/${s.id}`, {
                                method: "DELETE",
                                headers: { authorization: `Bearer ${token}` },
                              });
                              fetchBotSuggestions();
                              showToast("Eliminado", "info");
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-[12px] text-slate-400 dark:text-white/25 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-500/20 transition cursor-pointer"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      )}
                      {s.status === "pending" && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          {s.new_market_question && (
                            <button
                              onClick={async () => {
                                const token = localStorage.getItem("token");
                                const res = await fetch(`https://api.ecuapred.com/admin/news-suggestions/${s.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ action: "approve_market", closes_at: closeDates[s.id] ? toEcuadorTz(closeDates[s.id]) : null, category: selectedCategories[s.id] || "general" }),
                                });
                                const data = await res.json();
                                if (res.ok) { showToast("Mercado creado ✅", "success"); fetchBotSuggestions(); fetchMarkets(); }
                                else showToast(data.message || "Error", "error");
                              }}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg py-2.5 sm:py-2 text-[12px] transition cursor-pointer"
                            >
                              ✓ Crear mercado
                            </button>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                const token = localStorage.getItem("token");
                                await fetch(`https://api.ecuapred.com/admin/news-suggestions/${s.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ action: "reject" }),
                                });
                                fetchBotSuggestions();
                              }}
                              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-[12px] text-slate-500 dark:text-white/40 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-500/20 transition cursor-pointer"
                            >
                              ✕ Rechazar
                            </button>
                            <button
                              onClick={async () => {
                                const token = localStorage.getItem("token");
                                await fetch(`https://api.ecuapred.com/admin/news-suggestions/${s.id}`, {
                                  method: "DELETE",
                                  headers: { authorization: `Bearer ${token}` },
                                });
                                fetchBotSuggestions();
                                showToast("Eliminado", "info");
                              }}
                              className="px-3 py-2.5 sm:py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-[12px] text-slate-400 dark:text-white/25 hover:text-rose-500 transition cursor-pointer"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 px-1">
                        <button
                          onClick={() => setBotPage(p => Math.max(1, p - 1))}
                          disabled={botPage === 1}
                          className="px-3 py-1.5 rounded-md text-[11px] font-medium transition text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 disabled:opacity-30 cursor-pointer"
                        >← Anterior</button>
                        <span className="text-[11px] text-slate-400 dark:text-white/30">Página {botPage} de {totalPages}</span>
                        <button
                          onClick={() => setBotPage(p => Math.min(totalPages, p + 1))}
                          disabled={botPage === totalPages}
                          className="px-3 py-1.5 rounded-md text-[11px] font-medium transition text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 disabled:opacity-30 cursor-pointer"
                        >Siguiente →</button>
                      </div>
                    )}
                  </>
                );
              })()}
              </div>
            </>
          )}

          {/* CORREOS */}
          {activeSection === "correos" && (
            <>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-lg font-bold">Correos</h1>
                  <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                    {emails.filter(e => !e.read && e.type === "received").length} sin leer · {emails.length} total
                  </p>
                </div>
                <button
                  onClick={() => { setComposing(true); setSelectedEmail(null); setComposeForm({ to: "", subject: "", html: "", from_alias: "info" }); }}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[12px] px-4 py-2 rounded-lg transition cursor-pointer"
                >
                  ✉️ Nuevo correo
                </button>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-2 items-start">
                <div className="flex items-center gap-1 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-lg p-1">
                  {(["all", "received", "sent"] as const).map(t => (
                    <button key={t} onClick={() => setEmailType(t)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer ${emailType === t ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-white/40"}`}>
                      {t === "all" ? "Todos" : t === "received" ? "Recibidos" : "Enviados"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-lg p-1 flex-wrap">
                  {["all", ...emailAliases].map(a => (
                    <button key={a} onClick={() => setEmailAlias(a)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer ${emailAlias === a ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-500 dark:text-white/40"}`}>
                      {a === "all" ? "Todos" : `${a}@`}
                    </button>
                  ))}
                </div>
                <button onClick={() => setManagingAliases(v => !v)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#111111] text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition cursor-pointer">
                  ⚙ Aliases
                </button>
              </div>

              {/* Panel de gestión de aliases */}
              {managingAliases && (
                <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 space-y-3">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-white/60">Aliases (@ecuapred.com)</p>
                  <div className="flex flex-wrap gap-2">
                    {emailAliases.map(a => (
                      <div key={a} className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-md px-2.5 py-1">
                        <span className="text-[11px] text-slate-700 dark:text-white/70">{a}@</span>
                        <button onClick={async () => {
                          const token = localStorage.getItem("token");
                          await fetch(`https://api.ecuapred.com/admin/email-aliases/${a}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
                          setEmailAliases(prev => prev.filter(x => x !== a));
                          if (emailAlias === a) setEmailAlias("all");
                        }} className="text-slate-400 hover:text-rose-500 transition cursor-pointer text-[11px]">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newAlias} onChange={e => setNewAlias(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                      placeholder="nuevo alias" onKeyDown={async e => { if (e.key === "Enter") { /* submit */ } }}
                      className="flex-1 text-[11px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.06] bg-transparent text-slate-700 dark:text-white/70 outline-none" />
                    <button onClick={async () => {
                      if (!newAlias.trim()) return;
                      const token = localStorage.getItem("token");
                      const res = await fetch("https://api.ecuapred.com/admin/email-aliases", {
                        method: "POST", headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ alias: newAlias }),
                      });
                      if (res.ok) { setEmailAliases(prev => [...prev, newAlias]); setNewAlias(""); }
                    }} className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-medium cursor-pointer">
                      Agregar
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Lista de correos */}
                <div className="lg:col-span-1 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                  <div className="divide-y divide-slate-100 dark:divide-white/[0.04] max-h-[600px] overflow-y-auto">
                    {filteredEmails.length === 0 ? (
                      <p className="px-5 py-8 text-[12px] text-slate-400 dark:text-white/20 text-center">Sin correos</p>
                    ) : filteredEmails.map(email => (
                      <button key={email.id}
                        onClick={async () => {
                          setSelectedEmail(email);
                          setComposing(false);
                          if (!email.read && email.type === "received") {
                            const token = localStorage.getItem("token");
                            await fetch(`https://api.ecuapred.com/admin/emails/${email.id}/read`, {
                              method: "PUT", headers: { authorization: `Bearer ${token}` },
                            });
                            setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
                          }
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition ${selectedEmail?.id === email.id ? "bg-slate-100 dark:bg-white/[0.06]" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            {!email.read && email.type === "received" && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                            <span className={`text-[12px] truncate max-w-[140px] ${!email.read && email.type === "received" ? "font-bold text-slate-900 dark:text-white" : "text-slate-600 dark:text-white/60"}`}>
                              {email.type === "received" ? email.from_address.split("<")[0].trim() || email.from_address : `→ ${email.to_address}`}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-white/20 shrink-0">
                            {new Date(email.created_at).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit" })}
                          </span>
                        </div>
                        <p className={`text-[11px] truncate ${!email.read && email.type === "received" ? "text-slate-700 dark:text-white/70 font-medium" : "text-slate-500 dark:text-white/40"}`}>{email.subject}</p>
                        <span className="text-[10px] bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/25 px-1.5 py-0.5 rounded-md mt-1 inline-block">{email.alias}@</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vista del correo / Composición */}
                <div className="lg:col-span-2 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                  {composing ? (
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white">Nuevo correo</p>
                        <button onClick={() => setComposing(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"><X size={14} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest block mb-1">Desde</label>
                          <select value={composeForm.from_alias} onChange={e => setComposeForm(p => ({ ...p, from_alias: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white outline-none">
                            {emailAliases.map(a => (
                              <option key={a} value={a}>{a}@ecuapred.com</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest block mb-1">Para</label>
                          <input value={composeForm.to} onChange={e => setComposeForm(p => ({ ...p, to: e.target.value }))} placeholder="destinatario@correo.com"
                            className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white outline-none focus:border-emerald-500/60 transition" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest block mb-1">Asunto</label>
                        <input value={composeForm.subject} onChange={e => setComposeForm(p => ({ ...p, subject: e.target.value }))} placeholder="Asunto del correo"
                          className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white outline-none focus:border-emerald-500/60 transition" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest block mb-1">Mensaje</label>
                        <textarea value={composeForm.html} onChange={e => setComposeForm(p => ({ ...p, html: e.target.value }))} placeholder="Escribe tu mensaje..." rows={8}
                          className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-slate-900 dark:text-white outline-none focus:border-emerald-500/60 transition resize-none" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setComposing(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-[12px] text-slate-500 cursor-pointer">Cancelar</button>
                        <button
                          disabled={sendingEmail || !composeForm.to || !composeForm.subject || !composeForm.html}
                          onClick={async () => {
                            setSendingEmail(true);
                            const token = localStorage.getItem("token");
                            const res = await fetch("https://api.ecuapred.com/admin/emails/send", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                              body: JSON.stringify({ ...composeForm, html: composeForm.html.replace(/\n/g, "<br/>") }),
                            });
                            setSendingEmail(false);
                            if (res.ok) { showToast("Correo enviado ✅", "success"); setComposing(false); fetchEmails(); }
                            else { const d = await res.json(); showToast(d.message || "Error al enviar", "error"); }
                          }}
                          className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[12px] px-5 py-2 rounded-lg transition cursor-pointer disabled:opacity-50"
                        >
                          {sendingEmail ? "Enviando..." : "Enviar"}
                        </button>
                      </div>
                    </div>
                  ) : selectedEmail ? (
                    <div className="flex flex-col h-full">
                      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.04] space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[14px] font-bold text-slate-900 dark:text-white">{selectedEmail.subject}</p>
                          <button onClick={() => openModal({ title: "¿Eliminar correo?", confirmLabel: "Eliminar", danger: true, onConfirm: async () => {
                            const token = localStorage.getItem("token");
                            await fetch(`https://api.ecuapred.com/admin/emails/${selectedEmail.id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
                            setSelectedEmail(null); fetchEmails(); showToast("Correo eliminado", "info");
                          }})} className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 cursor-pointer shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-white/40">De: {selectedEmail.from_address}</p>
                        <p className="text-[11px] text-slate-500 dark:text-white/40">Para: {selectedEmail.to_address}</p>
                        <p className="text-[10px] text-slate-400 dark:text-white/25">{new Date(selectedEmail.created_at).toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <div className="flex-1 p-5 overflow-y-auto">
                        {selectedEmail.html ? (
                          <div className="text-[13px] text-slate-700 dark:text-white/70 leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedEmail.html }} />
                        ) : (
                          <p className="text-[13px] text-slate-500 dark:text-white/40 whitespace-pre-wrap">{selectedEmail.text || "(Sin contenido)"}</p>
                        )}
                      </div>
                      {selectedEmail.type === "received" && (
                        <div className="px-5 py-3 border-t border-slate-100 dark:border-white/[0.04]">
                          <button
                            onClick={() => {
                              setComposing(true);
                              setComposeForm({
                                to: selectedEmail.from_address,
                                subject: selectedEmail.subject.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
                                html: "",
                                from_alias: selectedEmail.alias,
                              });
                            }}
                            className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-white/70 text-[12px] font-medium px-4 py-2 rounded-lg transition cursor-pointer"
                          >
                            ↩ Responder
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-[12px] text-slate-400 dark:text-white/20">Selecciona un correo para verlo</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ALERTAS */}
          {activeSection === "alertas" && (
            <>
              <div>
                <h1 className="text-lg font-bold">Alertas</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                  {adminAlerts.filter(a => !a.resolved).length} sin resolver · {adminAlerts.length} total
                </p>
              </div>

              <div className="space-y-3">
                {adminAlerts.length === 0 && (
                  <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl p-10 text-center">
                    <p className="text-[12px] text-slate-400 dark:text-white/20">✅ Sin alertas pendientes</p>
                  </div>
                )}
                {adminAlerts.map((alert) => (
                  <div key={alert.id} className={`bg-white dark:bg-[#111111] border rounded-xl p-5 space-y-3 ${alert.resolved ? "border-slate-200 dark:border-white/[0.06] opacity-50" : "border-rose-200 dark:border-rose-500/20"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider font-bold ${alert.resolved ? "bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/30" : "bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
                            {alert.resolved ? "Resuelta" : "Pendiente"}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-white/25">{new Date(alert.created_at + "Z").toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{alert.title}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!alert.resolved && (
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem("token");
                              await fetch(`https://api.ecuapred.com/admin/alerts/${alert.id}/resolve`, {
                                method: "PUT", headers: { authorization: `Bearer ${token}` },
                              });
                              fetchAdminAlerts();
                              showToast("Alerta marcada como resuelta", "success");
                            }}
                            className="text-[11px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            ✓ Resolver
                          </button>
                        )}
                        <button
                          onClick={() => openModal({
                            title: "¿Eliminar alerta?",
                            confirmLabel: "Eliminar",
                            danger: true,
                            onConfirm: async () => {
                              const token = localStorage.getItem("token");
                              await fetch(`https://api.ecuapred.com/admin/alerts/${alert.id}`, {
                                method: "DELETE", headers: { authorization: `Bearer ${token}` },
                              });
                              fetchAdminAlerts();
                            },
                          })}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      </div>
                    </div>

                    {/* Detalle de fallos */}
                    {alert.details?.failedBets?.length > 0 && (
                      <div className="bg-rose-50 dark:bg-rose-500/[0.08] border border-rose-200 dark:border-rose-500/20 rounded-lg p-3 space-y-2">
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 uppercase tracking-widest font-bold">Usuarios sin acreditar</p>
                        {alert.details.failedBets.map((f: any, i: number) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <span className="text-[12px] text-slate-600 dark:text-white/60">{f.email}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">${f.monto}</span>
                              <button
                                onClick={() => { setActiveSection("users"); }}
                                className="text-[10px] text-sky-500 hover:text-sky-400 cursor-pointer"
                              >
                                Acreditar →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* CONFIGURACIÓN */}
          {activeSection === "settings" && config && (
            <>
              <div>
                <h1 className="text-lg font-bold">Configuración</h1>
                <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                  {config.updated_at ? `Actualizado ${new Date(config.updated_at + "Z").toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Parámetros de la plataforma"}
                </p>
              </div>

              {/* Parámetros financieros — grid de tarjetas */}
              {(() => {
                const params = [
                  { key: "min_bet",               label: "Predicción mínima",    step: "0.5",  fmt: (v: string) => v ? `$${v}` : "—" },
                  { key: "max_bet",               label: "Predicción máxima",    step: "1",    fmt: (v: string) => !v || v === "0" ? "Sin límite" : `$${v}` },
                  { key: "max_changes",           label: "Cambios por pred.",    step: "1",    fmt: (v: string) => v || "3" },
                  { key: "commission",            label: "Comisión",             step: "0.1",  fmt: (v: string) => `${v}%` },
                  { key: "min_withdrawal",        label: "Retiro mínimo",        step: "1",    fmt: (v: string) => v ? `$${v}` : "—" },
                  { key: "max_withdrawal",        label: "Retiro máximo",        step: "10",   fmt: (v: string) => !v || v === "0" ? "Sin límite" : `$${v}` },
                  { key: "daily_withdrawal_limit",label: "Límite diario retiro", step: "10",   fmt: (v: string) => v ? `$${v}` : "Sin límite" },
                  { key: "welcome_points",        label: "$ bienvenida",         step: "1",    fmt: (v: string) => `$${v}` },
                  { key: "welcome_points_limit",  label: "Límite bienvenida",    step: "1",    fmt: (v: string) => v ? `Primeros ${v}` : "Sin límite" },
                  { key: "trending_count",        label: "Mercados trending",    step: "1",    fmt: (v: string) => v || "1" },
                  { key: "winners_count",         label: "Ganadores carrusel",   step: "1",    fmt: (v: string) => v || "1" },
                  { key: "autoplay_ms",           label: "Autoplay (ms)",        step: "500",  fmt: (v: string) => v ? `${v} ms` : "5000 ms" },
                  { key: "circulation_alert",     label: "Alerta circulación",   step: "100",  fmt: (v: string) => v ? `$${v}` : "Sin alerta" },
                  { key: "pending_tx_alert",      label: "Alerta tx pendientes", step: "1",    fmt: (v: string) => v ? `${v} tx` : "Sin alerta" },
                ];
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {params.map((p) => {
                      const isEditing = editingField === p.key;
                      const val = (settingsForm as any)[p.key];
                      return (
                        <div key={p.key} className={`bg-white dark:bg-[#111111] border rounded-xl p-4 flex flex-col gap-2 transition relative ${isEditing ? "border-emerald-500/40 dark:border-emerald-500/30" : "border-slate-200 dark:border-white/[0.06]"}`}>
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest leading-tight">{p.label}</p>
                            {!isEditing && (
                              <button
                                onClick={() => setEditingField(p.key)}
                                className="p-1 rounded-md bg-sky-50 dark:bg-sky-500/10 text-sky-500 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition cursor-pointer shrink-0"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            )}
                          </div>
                          {isEditing ? (
                            <>
                              <input
                                type="number" step={p.step} autoFocus
                                value={val}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, [p.key]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Escape") setEditingField(null); }}
                                className="w-full bg-slate-50 dark:bg-white/[0.04] border border-emerald-500/40 rounded-lg px-3 py-1.5 outline-none text-[14px] font-bold text-slate-900 dark:text-white tabular-nums focus:border-emerald-500 transition"
                              />
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => { setEditingField(null); fetchSettings(); }}
                                  className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-[11px] text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer">
                                  Cancelar
                                </button>
                                <button
                                  disabled={savingField}
                                  onClick={async () => {
                                    setSavingField(true);
                                    await handleSaveSettings();
                                    setSavingField(false);
                                    setEditingField(null);
                                  }}
                                  className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] transition cursor-pointer disabled:opacity-60">
                                  {savingField ? "..." : "Guardar"}
                                </button>
                              </div>
                            </>
                          ) : (
                            <p className="text-[20px] font-bold text-slate-900 dark:text-white tabular-nums leading-none mt-1">{p.fmt(val)}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Categorías de mercado */}
              {(() => {
                const cats = (settingsForm.market_categories || "deporte,farandula,politica,elecciones,pais,general")
                  .split(",").map((c: string) => c.trim()).filter(Boolean);
                const countByCategory = cats.reduce((acc: Record<string, number>, c: string) => ({ ...acc, [c]: markets.filter(m => m.category === c).length }), {});
                return (
                  <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.04]">
                      <p className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest">Categorías de mercado</p>
                      <p className="text-[11px] text-slate-400 dark:text-white/20 mt-0.5">Al eliminar puedes reasignar los mercados existentes</p>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {cats.map(cat => (
                        <div key={cat} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] text-slate-700 dark:text-white/70 capitalize font-medium">{cat}</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/25 px-1.5 py-0.5 rounded-md">{countByCategory[cat] ?? 0} mercados</span>
                          </div>
                          <button
                            onClick={() => {
                              const remaining = cats.filter(c => c !== cat);
                              const count = countByCategory[cat] ?? 0;
                              if (count > 0) {
                                const reassignTo = remaining[0] || "general";
                                openModal({
                                  title: `¿Eliminar categoría "${cat}"?`,
                                  description: `Tiene ${count} mercado${count !== 1 ? "s" : ""}. Se reasignarán a "${reassignTo}".`,
                                  confirmLabel: "Eliminar y reasignar",
                                  danger: true,
                                  onConfirm: async () => {
                                    const token = localStorage.getItem("token");
                                    await fetch("https://api.ecuapred.com/admin/markets/recategorize", {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ from: cat, to: reassignTo }),
                                    });
                                    setSettingsForm(prev => ({ ...prev, market_categories: remaining.join(",") }));
                                    await handleSaveSettings();
                                    fetchMarkets();
                                    showToast(`Categoría eliminada · mercados reasignados a "${reassignTo}"`, "success");
                                  },
                                });
                              } else {
                                openModal({
                                  title: `¿Eliminar categoría "${cat}"?`,
                                  description: "No tiene mercados asociados.",
                                  confirmLabel: "Eliminar",
                                  danger: true,
                                  onConfirm: async () => {
                                    setSettingsForm(prev => ({ ...prev, market_categories: remaining.join(",") }));
                                    await handleSaveSettings();
                                    showToast(`Categoría "${cat}" eliminada`, "info");
                                  },
                                });
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-3 border-t border-slate-100 dark:border-white/[0.04] flex gap-2">
                      <input
                        value={newCat}
                        onChange={(e) => setNewCat(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                        onKeyDown={(e) => { if (e.key === "Enter" && newCat.trim() && !cats.includes(newCat.trim())) { const updated = [...cats, newCat.trim()].join(","); setSettingsForm(prev => ({ ...prev, market_categories: updated })); handleSaveSettings(); setNewCat(""); } }}
                        placeholder="Nueva categoría..."
                        className="flex-1 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 outline-none text-[12px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:border-emerald-500/60 transition"
                      />
                      <button
                        onClick={() => {
                          if (!newCat.trim() || cats.includes(newCat.trim())) return;
                          const updated = [...cats, newCat.trim()].join(",");
                          setSettingsForm(prev => ({ ...prev, market_categories: updated }));
                          handleSaveSettings();
                          setNewCat("");
                          showToast(`Categoría "${newCat.trim()}" agregada ✅`, "success");
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[12px] px-4 py-2 rounded-lg transition cursor-pointer"
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="border-t border-slate-200 dark:border-white/[0.06] pt-6 mt-2">
                <p className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest mb-4">Datos bancarios para recargas</p>

                {/* Lista de bancos existentes */}
                <div className="space-y-2 mb-5">
                  {bankAccounts.length === 0 && (
                    <p className="text-[12px] text-slate-400 dark:text-white/20 text-center py-3">No hay cuentas bancarias configuradas</p>
                  )}
                  {bankAccounts.map((bank) => {
                    const isEditing = editingBank?.id === bank.id;
                    return (
                      <div key={bank.id} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.06] rounded-xl px-4 py-3">
                        {isEditing ? (
                          /* ── Modo edición inline ── */
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {([
                                { key: "nombre", label: "Nombre del banco", placeholder: "Ej: Banco Pichincha" },
                                { key: "titular", label: "Titular", placeholder: "Ej: Juan Pérez" },
                                { key: "cuenta", label: "Número de cuenta", placeholder: "Ej: 2200123456" },
                                { key: "cedula", label: "Cédula del titular", placeholder: "Ej: 1712345678" },
                              ] as { key: keyof typeof editingBank; label: string; placeholder: string }[]).map((f) => (
                                <div key={f.key}>
                                  <label className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest block mb-1">{f.label}</label>
                                  <input
                                    type="text"
                                    placeholder={f.placeholder}
                                    value={(editingBank as any)[f.key]}
                                    onChange={(e) => setEditingBank((prev) => prev ? { ...prev, [f.key]: e.target.value } : prev)}
                                    className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 outline-none text-[12px] text-slate-900 dark:text-white focus:border-emerald-500/60 transition"
                                  />
                                </div>
                              ))}
                              <div>
                                <label className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest block mb-1">Tipo de cuenta</label>
                                <select
                                  value={editingBank!.tipo}
                                  onChange={(e) => setEditingBank((prev) => prev ? { ...prev, tipo: e.target.value } : prev)}
                                  className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 outline-none text-[12px] text-slate-900 dark:text-white focus:border-emerald-500/60 transition"
                                >
                                  <option value="ahorros">Ahorros</option>
                                  <option value="corriente">Corriente</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingBank(null)}
                                className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 dark:text-white/40 bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                disabled={savingEditBank || !editingBank!.nombre.trim() || !editingBank!.cuenta.trim()}
                                onClick={async () => {
                                  setSavingEditBank(true);
                                  const token = localStorage.getItem("token");
                                  const res = await fetch(`https://api.ecuapred.com/admin/bank-accounts/${bank.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                    body: JSON.stringify({
                                      nombre: editingBank!.nombre.trim(),
                                      titular: editingBank!.titular.trim(),
                                      cuenta: editingBank!.cuenta.trim(),
                                      tipo: editingBank!.tipo,
                                      cedula: editingBank!.cedula.trim(),
                                    }),
                                  });
                                  setSavingEditBank(false);
                                  if (res.ok) {
                                    setEditingBank(null);
                                    fetchBankAccounts();
                                    showToast("Banco actualizado ✅", "success");
                                  } else {
                                    const d = await res.json();
                                    showToast(d.message || "Error al guardar", "error");
                                  }
                                }}
                                className="px-4 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black transition cursor-pointer"
                              >
                                {savingEditBank ? "Guardando..." : "Guardar cambios"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── Vista normal ── */
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-800 dark:text-white truncate">{bank.nombre}</p>
                              <p className="text-[11px] text-slate-400 dark:text-white/30 truncate">{bank.titular} · {bank.tipo} · {bank.cuenta}</p>
                              {bank.cedula && <p className="text-[11px] text-slate-400 dark:text-white/25">CI: {bank.cedula}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={async () => {
                                  const token = localStorage.getItem("token");
                                  await fetch(`https://api.ecuapred.com/admin/bank-accounts/${bank.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ activo: !bank.activo }),
                                  });
                                  fetchBankAccounts();
                                }}
                                className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${bank.activo ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-white/30 border-slate-200 dark:border-white/[0.06]"}`}
                              >
                                {bank.activo ? "Activo" : "Inactivo"}
                              </button>
                              {/* Botón editar */}
                              <button
                                onClick={() => setEditingBank({ id: bank.id, nombre: bank.nombre, titular: bank.titular || "", cuenta: bank.cuenta, tipo: bank.tipo || "ahorros", cedula: bank.cedula || "" })}
                                className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-500 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition cursor-pointer"
                                title="Editar banco"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              {/* Botón eliminar */}
                              <button
                                onClick={() => openModal({
                                  title: "Eliminar banco",
                                  description: `¿Eliminar "${bank.nombre}"?`,
                                  confirmLabel: "Eliminar",
                                  danger: true,
                                  onConfirm: async () => {
                                    const token = localStorage.getItem("token");
                                    await fetch(`https://api.ecuapred.com/admin/bank-accounts/${bank.id}`, {
                                      method: "DELETE",
                                      headers: { authorization: `Bearer ${token}` },
                                    });
                                    fetchBankAccounts();
                                    showToast("Banco eliminado", "info");
                                  },
                                })}
                                className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Formulario para agregar banco */}
                <div className="bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-300 dark:border-white/[0.08] rounded-xl p-4 space-y-3">
                  <p className="text-[11px] text-slate-400 dark:text-white/30 uppercase tracking-widest">Agregar banco</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: "nombre", label: "Nombre del banco", placeholder: "Ej: Banco Pichincha" },
                      { key: "titular", label: "Titular de la cuenta", placeholder: "Ej: Juan Pérez" },
                      { key: "cuenta", label: "Número de cuenta", placeholder: "Ej: 2200123456" },
                      { key: "cedula", label: "Cédula del titular", placeholder: "Ej: 1712345678" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest block mb-1">{f.label}</label>
                        <input
                          type="text"
                          placeholder={f.placeholder}
                          value={(newBank as any)[f.key]}
                          onChange={(e) => setNewBank((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 outline-none text-[13px] text-slate-900 dark:text-white focus:border-emerald-500/60 transition"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest block mb-1">Tipo de cuenta</label>
                      <select
                        value={newBank.tipo}
                        onChange={(e) => setNewBank((prev) => ({ ...prev, tipo: e.target.value }))}
                        className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 outline-none text-[13px] text-slate-900 dark:text-white focus:border-emerald-500/60 transition"
                      >
                        <option value="ahorros">Ahorros</option>
                        <option value="corriente">Corriente</option>
                      </select>
                    </div>
                  </div>
                  <button
                    disabled={savingBank || !newBank.nombre.trim() || !newBank.cuenta.trim()}
                    onClick={async () => {
                      setSavingBank(true);
                      const token = localStorage.getItem("token");
                      const res = await fetch("https://api.ecuapred.com/admin/bank-accounts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                        body: JSON.stringify(newBank),
                      });
                      const data = await res.json();
                      setSavingBank(false);
                      if (res.ok) {
                        setNewBank({ nombre: "", titular: "", cuenta: "", tipo: "ahorros", cedula: "" });
                        fetchBankAccounts();
                        showToast("Banco agregado ✅", "success");
                      } else {
                        showToast(data.message || "Error al agregar", "error");
                      }
                    }}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold rounded-lg px-5 py-2 text-[12px] transition cursor-pointer"
                  >
                    {savingBank ? "Guardando..." : "+ Agregar banco"}
                  </button>
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
                      const res = await fetch("https://api.ecuapred.com/admin/extension-tokens", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
                        body: JSON.stringify({ label: newTokenLabel }),
                      });
                      const data = await res.json();
                      if (res.ok) { showToast("Token creado ✅", "success"); setNewTokenLabel(""); fetchExtensionTokens(); }
                      else showToast(data.message, "error");
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg px-4 py-2 text-[12px] transition cursor-pointer"
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
                        <p className="text-[10px] text-slate-400 dark:text-white/25">{new Date(t.created_at + "Z").toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-[10px] bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/40 px-2 py-1.5 rounded-lg truncate font-mono">
                          {t.token.slice(0, 8)}••••••••••••••••{t.token.slice(-4)}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(t.token);
                            setCopiedTokenId(t.id);
                            setTimeout(() => setCopiedTokenId(null), 2000);
                          }}
                          className="shrink-0 bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] px-3 py-1.5 rounded-lg text-[11px] transition cursor-pointer"
                        >
                          {copiedTokenId === t.id ? "✓ Copiado" : "Copiar"}
                        </button>
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem("token");
                            const res = await fetch(`https://api.ecuapred.com/admin/extension-tokens/${t.id}`, {
                              method: "DELETE",
                              headers: { authorization: `Bearer ${token}` },
                            });
                            if (res.ok) { showToast("Token eliminado", "info"); fetchExtensionTokens(); }
                          }}
                          className="shrink-0 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 px-3 py-1.5 rounded-lg text-[11px] transition cursor-pointer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSaveSettings} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl py-3 text-[13px] transition active:scale-[0.99] cursor-pointer">
                Guardar configuración
              </button>
            </>
          )}

        </main>
      </div>
    </div>
  );
}