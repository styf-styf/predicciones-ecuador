"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "", apellido: "", email: "", password: "",
    confirmPassword: "", cedula: "", celular: "", ciudad: "", direccion: "",
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  // Indicador de fortaleza de contraseña
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 6) return { label: "Muy débil", color: "bg-rose-500", width: "w-1/4" };
    if (pwd.length < 8) return { label: "Débil", color: "bg-orange-400", width: "w-2/4" };
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: "Media", color: "bg-amber-400", width: "w-3/4" };
    return { label: "Fuerte", color: "bg-emerald-500", width: "w-full" };
  };

  const strength = getPasswordStrength(form.password);

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
          setError(data.message || "Error con Google");
        }
      } catch {
        setError("Error de conexión con Google");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setError("Error al iniciar con Google");
      setGoogleLoading(false);
    },
  });

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.nombre || !form.apellido || !form.email || !form.password || !form.confirmPassword) {
      setError("Completa los campos obligatorios (*)");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("https://predicciones-ecuador.onrender.com/register", {
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
    } catch {
      setError("Error en el servidor");
    } finally {
      setLoading(false);
    }
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

      {/* Contenido */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Título */}
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500 grid place-items-center font-bold text-slate-950 text-2xl mx-auto mb-4">P</div>
            <h1 className="text-2xl sm:text-3xl font-bold">Crear cuenta</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Únete a Predicciones Ecuador</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <form onSubmit={handleRegister} className="space-y-6">

              {/* Sección 1 — Datos personales */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Datos personales</h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Nombre *</label>
                      <input name="nombre" placeholder="Juan" onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Apellido *</label>
                      <input name="apellido" placeholder="Pérez" onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Cédula de identidad</label>
                    <input name="cedula" placeholder="1234567890" onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                  </div>
                </div>
              </div>

              {/* Sección 2 — Cuenta */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Cuenta</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Correo electrónico *</label>
                    <input name="email" type="email" placeholder="tu@correo.com" onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Contraseña *</label>
                    <div className="relative">
                      <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" onChange={handleChange}
                        className="w-full px-4 py-3 pr-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {/* Indicador de fortaleza */}
                    {strength && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                        </div>
                        <p className={`text-xs mt-1 ${strength.color.replace("bg-", "text-")}`}>{strength.label}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Confirmar contraseña *</label>
                    <div className="relative">
                      <input name="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="••••••••" onChange={handleChange}
                        className={`w-full px-4 py-3 pr-11 rounded-xl bg-white dark:bg-slate-800 border outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400 ${form.confirmPassword && form.password !== form.confirmPassword ? "border-rose-500" : "border-slate-200 dark:border-slate-700"}`} />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {form.confirmPassword && form.password !== form.confirmPassword && (
                      <p className="text-xs text-rose-400 mt-1">Las contraseñas no coinciden</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección 3 — Contacto */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contacto <span className="normal-case font-normal">(opcional)</span></h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Celular</label>
                      <input name="celular" placeholder="0991234567" onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Ciudad</label>
                      <input name="ciudad" placeholder="Quito" onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Dirección</label>
                    <input name="direccion" placeholder="Av. Principal 123" onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition placeholder-slate-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">País</label>
                    <input value="Ecuador" disabled
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 text-sm cursor-not-allowed" />
                  </div>
                </div>
              </div>

              {/* Mensaje error/éxito */}
              {error && (
                <div className="text-sm px-4 py-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm px-4 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {success}
                </div>
              )}

              {/* Botón registro */}
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 active:scale-95 transition disabled:opacity-60">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>

              {/* Divisor */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400">o regístrate con</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* Google */}
              <button type="button"
                onClick={() => { setGoogleLoading(true); googleLogin(); }}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition disabled:opacity-60 text-sm">
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

            </form>
          </div>

          {/* Link login */}
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-emerald-500 font-semibold hover:text-emerald-400 transition">
              Inicia sesión
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}