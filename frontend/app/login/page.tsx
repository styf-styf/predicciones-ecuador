"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, LogIn, Loader2, ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const FEATURES = [
  { icon: "📈", text: "Predice resultados de eventos reales" },
  { icon: "💰", text: "Gana puntos con tus predicciones" },
  { icon: "🏆", text: "Compite en el ranking nacional" },
  { icon: "⚡", text: "Resultados en tiempo real" },
];

function redirectAfterAuth(router: ReturnType<typeof useRouter>) {
  try {
    const pending = localStorage.getItem("pendingBet");
    if (pending) {
      const { marketId } = JSON.parse(pending);
      if (marketId) { router.push(`/market/${marketId}`); return; }
    }
  } catch {}
  router.push("/");
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

export default function Login() {
  const router = useRouter();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [message, setMessage]           = useState("");
  const [isError, setIsError]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    if (token && role === "admin") router.push("/admin");
    else if (token) router.push("/");

    const params = new URLSearchParams(window.location.search);

    // Sesión expirada → mostrar aviso
    if (params.get("expired") === "1") {
      setIsError(false);
      setMessage("⏱ Tu sesión expiró. Inicia sesión de nuevo.");
    }

    const code   = params.get("code");
    if (code) {
      setGoogleLoading(true);
      fetch("https://api.ecuapred.com/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: window.location.origin + "/login" }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.user.role || "user");
            localStorage.setItem("points", String(data.user.points || 0));
            window.dispatchEvent(new Event("auth-change"));
            redirectAfterAuth(router);
          } else {
            setIsError(true); setMessage(data.message || "Error con Google"); setGoogleLoading(false);
          }
        })
        .catch(() => { setIsError(true); setMessage("Error de conexión con Google"); setGoogleLoading(false); });
    }
  }, [router]);

  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: typeof window !== "undefined" ? window.location.origin + "/login" : "",
    onSuccess: async (codeResponse) => {
      setGoogleLoading(true);
      try {
        const res  = await fetch("https://api.ecuapred.com/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeResponse.code, redirect_uri: window.location.origin + "/login" }),
        });
        const data = await res.json();
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("role", data.user.role || "user");
          localStorage.setItem("points", String(data.user.points || 0));
          window.dispatchEvent(new Event("auth-change"));
          redirectAfterAuth(router);
        } else { setIsError(true); setMessage(data.message || "Error con Google"); }
      } catch { setIsError(true); setMessage("Error de conexión con Google"); }
      finally  { setGoogleLoading(false); }
    },
    onError: () => { setIsError(true); setMessage("Error al iniciar con Google"); setGoogleLoading(false); },
  });

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setIsError(true); setMessage("Por favor completa todos los campos"); return; }
    setLoading(true); setMessage("");
    try {
      const res  = await fetch("https://api.ecuapred.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.user.role || "user");
        localStorage.setItem("points", String(data.user.points || 0));
        window.dispatchEvent(new Event("auth-change"));
        setIsError(false); setMessage("✅ Sesión iniciada, redirigiendo...");
        redirectAfterAuth(router);
      } else { setIsError(true); setMessage(data.message || "Error al iniciar sesión"); }
    } catch { setIsError(true); setMessage("Error de conexión con el servidor"); }
    finally  { setLoading(false); }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white">

      {/* ── Cuerpo principal ── */}
      <div className="flex flex-1">

        {/* Panel izquierdo — branding (solo desktop) */}
        <div className="hidden lg:flex flex-col w-[50%] bg-emerald-500 text-slate-950 relative shrink-0">
          {/* Flecha volver */}
          <Link
            href="/"
            className="absolute top-5 left-5 flex items-center gap-1.5 text-slate-950/70 hover:text-slate-950 transition-colors font-medium text-sm cursor-pointer"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </Link>

          {/* Contenido centrado */}
          <div className="flex-1 flex flex-col items-center justify-center px-12 gap-6">
            {/* Logo */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-2xl bg-emerald-400/60 grid place-items-center font-black text-slate-950 text-3xl shadow-inner">
                P
              </div>
              <h1 className="text-2xl font-black mt-1">EcuaPred</h1>
              <p className="text-slate-950/60 text-sm">Mercados predictivos en tiempo real</p>
            </div>

            {/* Features */}
            <div className="space-y-2.5 w-full max-w-xs">
              {FEATURES.map((item) => (
                <div key={item.text} className="flex items-center gap-3 bg-emerald-600/30 rounded-xl px-4 py-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div className="flex-1 flex flex-col relative min-h-0 overflow-y-auto">
          {/* ThemeToggle esquina superior derecha */}
          <div className="absolute top-4 right-5 z-10">
            <ThemeToggle />
          </div>

          {/* Flecha volver en móvil */}
          <Link
            href="/"
            className="absolute top-4 left-5 z-10 lg:hidden flex items-center gap-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors text-sm font-medium cursor-pointer"
          >
            <ArrowLeft size={16} /> Volver
          </Link>

          {/* Formulario centrado */}
          <div className="flex-1 flex items-center justify-center px-5 py-16">
            <div className="w-full max-w-sm">

              {/* Título */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black">Bienvenido</h2>
                <p className="text-emerald-500 text-sm mt-1 font-medium">Inicia sesión para continuar</p>
              </div>

              {/* Tarjeta del formulario */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="tu@correo.com"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Contraseña</label>
                    <Link href="/forgot-password" className="text-xs text-emerald-500 hover:text-emerald-400 transition font-medium cursor-pointer">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition text-slate-900 dark:text-white placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {message && (
                  <div className={`text-sm px-4 py-2.5 rounded-xl ${isError ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"}`}>
                    {message}
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 cursor-pointer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                  {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-slate-400">o continúa con</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>

                <button
                  onClick={() => { setGoogleLoading(true); googleLogin(); }}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition disabled:opacity-60 text-sm cursor-pointer"
                >
                  {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                  {googleLoading ? "Conectando..." : "Continuar con Google"}
                </button>

              </div>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                ¿No tienes cuenta?{" "}
                <Link href="/register" className="text-emerald-500 font-semibold hover:text-emerald-400 transition">
                  Regístrate aquí
                </Link>
              </p>

            </div>
          </div>
        </div>

      </div>


    </div>
  );
}
