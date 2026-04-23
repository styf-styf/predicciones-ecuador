"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role === "admin") router.push("/admin");
    else if (token) router.push("/");
  }, [router]);

  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      setGoogleLoading(true);
      try {
        const res = await fetch("https://predicciones-ecuador.onrender.com/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeResponse.code }),
        });
        const data = await res.json();
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("role", data.user.role || "user");
          localStorage.setItem("points", String(data.user.points || 0));
          window.dispatchEvent(new Event("auth-change"));
          router.push("/");
        } else {
          setIsError(true);
          setMessage(data.message || "Error con Google");
        }
      } catch {
        setIsError(true);
        setMessage("Error de conexión con Google");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setIsError(true);
      setMessage("Error al iniciar con Google");
      setGoogleLoading(false);
    },
  });

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setIsError(true);
      setMessage("Por favor completa todos los campos");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("https://predicciones-ecuador.onrender.com/login", {
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
        setIsError(false);
        setMessage("✅ Sesión iniciada, redirigiendo...");
        router.push("/");
      } else {
        setIsError(true);
        setMessage(data.message || "Error al iniciar sesión");
      }
    } catch {
      setIsError(true);
      setMessage("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col">

      {/* Barra superior */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-emerald-500 grid place-items-center font-bold text-slate-950 text-sm">P</div>
          <span className="font-bold text-sm sm:text-base">Predicciones Ecuador</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Contenido centrado */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Título */}
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500 grid place-items-center font-bold text-slate-950 text-2xl mx-auto mb-4">P</div>
            <h1 className="text-2xl sm:text-3xl font-bold">Bienvenido</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Inicia sesión para continuar</p>
          </div>

          {/* Card */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition text-slate-900 dark:text-white placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Mensaje */}
            {message && (
              <div className={`text-sm px-4 py-3 rounded-xl ${isError ? "bg-rose-500/10 text-rose-400 border border-rose-500/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"}`}>
                {message}
              </div>
            )}

            {/* Botón login */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 active:scale-95 transition disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>

            {/* Divisor */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400">o continúa con</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Google */}
            <button
              onClick={() => { setGoogleLoading(true); googleLogin(); }}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition disabled:opacity-60 text-sm"
            >
              {googleLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                  <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                </svg>
              )}
              {googleLoading ? "Conectando..." : "Continuar con Google"}
            </button>

          </div>

          {/* Registro */}
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-emerald-500 font-semibold hover:text-emerald-400 transition">
              Regístrate aquí
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}