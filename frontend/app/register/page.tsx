"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, Loader2, UserPlus, ArrowLeft, ArrowRight, Mail } from "lucide-react";
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

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    nombre: "", apellido: "", email: "", password: "",
    confirmPassword: "", cedula: "", celular: "", ciudad: "",
  });
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [verifyCode, setVerifyCode]       = useState("");

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
    if (pwd.length < 6)  return { label: "Muy débil", color: "bg-rose-500",   width: "w-1/4" };
    if (pwd.length < 8)  return { label: "Débil",     color: "bg-orange-400", width: "w-2/4" };
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

  // Validar paso 1 y avanzar
  const handleNext = () => {
    setError("");
    if (!form.email || !form.password || !form.confirmPassword) {
      setError("Completa todos los campos"); return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden"); return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres"); return;
    }
    if (!ageConfirmed) {
      setError("Debes confirmar que eres mayor de 18 años"); return;
    }
    setStep(2);
  };

  // Paso 2 → enviar código al correo
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.nombre || !form.apellido) {
      setError("Nombre y apellido son obligatorios"); return;
    }
    setLoading(true);
    try {
      const res  = await fetch("https://api.ecuapred.com/register/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email, password: form.password,
          nombre: form.nombre, apellido: form.apellido,
          cedula: form.cedula, celular: form.celular,
          ciudad: form.ciudad, pais: "Ecuador",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Error al enviar código"); return; }
      setStep(3);
    } catch { setError("Error en el servidor"); }
    finally  { setLoading(false); }
  };

  // Paso 3 → confirmar código
  const handleConfirmCode = async () => {
    if (verifyCode.trim().length !== 6) { setError("Ingresa el código de 6 dígitos"); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch("https://api.ecuapred.com/register/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Código incorrecto"); return; }
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user?.role || "user");
      localStorage.setItem("points", String(data.user?.points || 0));
      window.dispatchEvent(new Event("auth-change"));
      setSuccess("✅ ¡Cuenta creada! Entrando a EcuaPred...");
      setTimeout(() => router.push("/"), 1500);
    } catch { setError("Error en el servidor"); }
    finally  { setLoading(false); }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white">

      {/* ── Cuerpo principal ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Panel izquierdo — branding (solo desktop) */}
        <div className="hidden lg:flex flex-col w-[50%] bg-emerald-500 text-slate-950 relative shrink-0">
          <Link
            href="/"
            className="absolute top-5 left-5 flex items-center gap-1.5 text-slate-950/70 hover:text-slate-950 transition-colors font-medium text-sm cursor-pointer"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </Link>
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
        <div className="flex-1 flex flex-col relative">
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

          {/* Contenido centrado verticalmente */}
          <div className="flex-1 flex items-center justify-center px-5">
            <div className="w-full max-w-sm">

              {/* Título + indicador de pasos */}
              <div className="text-center mb-5">
                <h2 className="text-2xl font-black">Crear cuenta</h2>
                <p className="text-emerald-500 text-sm mt-1 font-medium">Únete a EcuaPred</p>

                {/* Steps */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className={`h-2 w-10 rounded-full transition-all ${step >= 1 ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />
                  <div className={`h-2 w-10 rounded-full transition-all ${step >= 2 ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />
                  <div className={`h-2 w-10 rounded-full transition-all ${step >= 3 ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Paso {step} de 3</p>
              </div>

              {/* Tarjeta */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg">

                {/* ── PASO 1: Cuenta ── */}
                {step === 1 && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cuenta</p>

                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Correo electrónico *</label>
                      <input name="email" type="email" placeholder="tu@correo.com" autoComplete="off" value={form.email} onChange={handleChange}
                        onKeyDown={(e) => e.key === "Enter" && handleNext()}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400 text-slate-900 dark:text-white" />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Contraseña *</label>
                      <div className="relative">
                        <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" value={form.password} onChange={handleChange}
                          onKeyDown={(e) => e.key === "Enter" && handleNext()}
                          className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400 text-slate-900 dark:text-white" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer">
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
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
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Confirmar contraseña *</label>
                      <div className="relative">
                        <input name="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="••••••••" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange}
                          onKeyDown={(e) => e.key === "Enter" && handleNext()}
                          className={`w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800 border outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400 text-slate-900 dark:text-white ${form.confirmPassword && form.password !== form.confirmPassword ? "border-rose-500" : "border-slate-200 dark:border-slate-700"}`} />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer">
                          {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {form.confirmPassword && form.password !== form.confirmPassword && (
                        <p className="text-xs text-rose-400 mt-0.5">No coinciden</p>
                      )}
                    </div>

                    {/* Verificación de edad */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={ageConfirmed}
                        onChange={(e) => setAgeConfirmed(e.target.checked)}
                        className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0 cursor-pointer"
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Confirmo que tengo <strong className="text-slate-700 dark:text-slate-300">18 años o más</strong> y acepto los{" "}
                        <a href="/terminos" target="_blank" className="text-emerald-500 hover:text-emerald-400 underline">Términos de uso</a>{" "}
                        y la{" "}
                        <a href="/privacidad" target="_blank" className="text-emerald-500 hover:text-emerald-400 underline">Política de privacidad</a>.
                      </span>
                    </label>

                    {error && <div className="text-sm px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">{error}</div>}

                    <button onClick={handleNext}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer">
                      Siguiente <ArrowRight size={16} />
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
                  </div>
                )}

                {/* ── PASO 2: Datos personales + Contacto ── */}
                {step === 2 && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <button type="button" onClick={() => { setStep(1); setError(""); }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer">
                        <ArrowLeft size={16} />
                      </button>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Datos personales</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Nombre *</label>
                        <input name="nombre" placeholder="Juan" value={form.nombre} onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400 text-slate-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Apellido *</label>
                        <input name="apellido" placeholder="Pérez" value={form.apellido} onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400 text-slate-900 dark:text-white" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Cédula de identidad</label>
                      <input name="cedula" placeholder="1234567890" value={form.cedula} onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400 text-slate-900 dark:text-white" />
                    </div>

                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-1">Contacto <span className="normal-case font-normal">(opcional)</span></p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Celular</label>
                        <input name="celular" placeholder="0991234567" value={form.celular} onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400 text-slate-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Ciudad</label>
                        <input name="ciudad" placeholder="Quito" value={form.ciudad} onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400 text-slate-900 dark:text-white" />
                      </div>
                    </div>

                    {error   && <div className="text-sm px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">{error}</div>}
                    {success && <div className="text-sm px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{success}</div>}

                    <button type="submit" disabled={loading}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 cursor-pointer">
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                      {loading ? "Creando cuenta..." : "Crear cuenta"}
                    </button>
                  </form>
                )}

                {/* ── PASO 3: Verificar código ── */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <button type="button" onClick={() => { setStep(2); setError(""); setVerifyCode(""); }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer">
                        <ArrowLeft size={16} />
                      </button>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verificar correo</p>
                    </div>

                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 grid place-items-center">
                        <Mail size={22} className="text-emerald-500" />
                      </div>
                      <p className="text-sm font-semibold text-center">Revisa tu correo</p>
                      <p className="text-xs text-slate-400 text-center">
                        Enviamos un código de 6 dígitos a<br />
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{form.email}</span>
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Código de verificación</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={verifyCode}
                        onChange={(e) => { setVerifyCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleConfirmCode()}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-center text-2xl font-bold tracking-[0.5em] focus:border-emerald-500 transition text-slate-900 dark:text-white placeholder-slate-300"
                      />
                    </div>

                    {error   && <div className="text-sm px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">{error}</div>}
                    {success && <div className="text-sm px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{success}</div>}

                    <button
                      onClick={handleConfirmCode}
                      disabled={loading || verifyCode.length !== 6}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                      {loading ? "Verificando..." : "Confirmar y crear cuenta"}
                    </button>

                    <button
                      type="button"
                      onClick={handleRegister as any}
                      disabled={loading}
                      className="w-full text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition py-1 cursor-pointer"
                    >
                      ¿No llegó el correo? Reenviar código
                    </button>
                  </div>
                )}

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
    </div>
  );
}
