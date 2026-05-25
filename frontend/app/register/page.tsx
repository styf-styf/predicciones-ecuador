"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, Loader2, UserPlus, ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Footer from "@/components/Footer";

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

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "", apellido: "", email: "", password: "",
    confirmPassword: "", cedula: "", celular: "", ciudad: "", direccion: "",
  });
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get("code");
    if (code) {
      setGoogleLoading(true);
      fetch("https://api.ecuapred.com/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: window.location.origin + "/register" }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.user.role || "user");
            localStorage.setItem("points", String(data.user.points || 0));
            window.dispatchEvent(new Event("auth-change"));
            redirectAfterAuth(router);
          } else { setError(data.message || "Error con Google"); setGoogleLoading(false); }
        })
        .catch(() => { setError("Error de conexión con Google"); setGoogleLoading(false); });
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 6)  return { label: "Muy débil", color: "bg-rose-500",    width: "w-1/4" };
    if (pwd.length < 8)  return { label: "Débil",     color: "bg-orange-400",  width: "w-2/4" };
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: "Media", color: "bg-amber-400", width: "w-3/4" };
    return { label: "Fuerte", color: "bg-emerald-500", width: "w-full" };
  };
  const strength = getPasswordStrength(form.password);

  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: typeof window !== "undefined" ? window.location.origin + "/register" : "",
    onSuccess: async (codeResponse) => {
      setGoogleLoading(true);
      try {
        const res  = await fetch("https://api.ecuapred.com/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeResponse.code, redirect_uri: window.location.origin + "/register" }),
        });
        const data = await res.json();
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("role", data.user.role || "user");
          localStorage.setItem("points", String(data.user.points || 0));
          window.dispatchEvent(new Event("auth-change"));
          router.push("/");
        } else { setError(data.message || "Error con Google"); }
      } catch { setError("Error de conexión con Google"); }
      finally  { setGoogleLoading(false); }
    },
    onError: () => { setError("Error al iniciar con Google"); setGoogleLoading(false); },
  });

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.nombre || !form.apellido || !form.email || !form.password || !form.confirmPassword) {
      setError("Completa los campos obligatorios (*)"); return;
    }
    if (form.password !== form.confirmPassword) { setError("Las contraseñas no coinciden"); return; }
    if (form.password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }

    setLoading(true);
    try {
      const res  = await fetch("https://api.ecuapred.com/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email, password: form.password,
          nombre: form.nombre, apellido: form.apellido,
          cedula: form.cedula, celular: form.celular,
          ciudad: form.ciudad, direccion: form.direccion, pais: "Ecuador",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Error al registrar"); return; }
      setSuccess("✅ Cuenta creada, redirigiendo al login...");
      setTimeout(() => router.push("/login"), 1500);
    } catch { setError("Error en el servidor"); }
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
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-2xl bg-emerald-400/60 grid place-items-center font-black text-slate-950 text-3xl shadow-inner">
                P
              </div>
              <h1 className="text-2xl font-black mt-1">EcuaPred</h1>
              <p className="text-slate-950/60 text-sm">Mercados predictivos en tiempo real</p>
            </div>
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
          {/* ThemeToggle */}
          <div className="absolute top-4 right-5 z-10">
            <ThemeToggle />
          </div>

          {/* Flecha volver móvil */}
          <Link
            href="/"
            className="absolute top-4 left-5 z-10 lg:hidden flex items-center gap-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors text-sm font-medium cursor-pointer"
          >
            <ArrowLeft size={16} /> Volver
          </Link>

          {/* Formulario */}
          <div className="flex-1 flex items-start justify-center px-5 py-16">
            <div className="w-full max-w-md">

              {/* Título */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black">Crear cuenta</h2>
                <p className="text-emerald-500 text-sm mt-1 font-medium">Únete a EcuaPred</p>
              </div>

              {/* Tarjeta del formulario */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg">
                <form onSubmit={handleRegister} className="space-y-4">

                  {/* Datos personales */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Datos personales</p>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Nombre *</label>
                          <input name="nombre" placeholder="Juan" onChange={handleChange}
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Apellido *</label>
                          <input name="apellido" placeholder="Pérez" onChange={handleChange}
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Cédula de identidad</label>
                        <input name="cedula" placeholder="1234567890" onChange={handleChange}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* Cuenta */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Cuenta</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Correo electrónico *</label>
                        <input name="email" type="email" placeholder="tu@correo.com" onChange={handleChange}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Contraseña *</label>
                          <div className="relative">
                            <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" onChange={handleChange}
                              className="w-full px-3 py-2.5 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer">
                              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          {strength && (
                            <div className="mt-1.5">
                              <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Confirmar *</label>
                          <div className="relative">
                            <input name="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="••••••••" onChange={handleChange}
                              className={`w-full px-3 py-2.5 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800 border outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400 ${form.confirmPassword && form.password !== form.confirmPassword ? "border-rose-500" : "border-slate-200 dark:border-slate-700"}`} />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer">
                              {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          {form.confirmPassword && form.password !== form.confirmPassword && (
                            <p className="text-xs text-rose-400 mt-0.5">No coinciden</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contacto */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Contacto <span className="normal-case font-normal">(opcional)</span></p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Celular</label>
                        <input name="celular" placeholder="0991234567" onChange={handleChange}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Ciudad</label>
                        <input name="ciudad" placeholder="Quito" onChange={handleChange}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                      </div>
                    </div>
                  </div>

                  {error   && <div className="text-sm px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">{error}</div>}
                  {success && <div className="text-sm px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{success}</div>}

                  <button type="submit" disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 cursor-pointer">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    {loading ? "Creando cuenta..." : "Crear cuenta"}
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-xs text-slate-400">o regístrate con</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  </div>

                  <button type="button"
                    onClick={() => { setGoogleLoading(true); googleLogin(); }}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition disabled:opacity-60 text-sm cursor-pointer">
                    {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                    {googleLoading ? "Conectando..." : "Continuar con Google"}
                  </button>

                </form>
              </div>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="text-emerald-500 font-semibold hover:text-emerald-400 transition">
                  Inicia sesión
                </Link>
              </p>

            </div>
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <Footer />

    </div>
  );
}
