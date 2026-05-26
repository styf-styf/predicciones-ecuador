"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, CheckCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) { setError("Ingresa tu correo electrónico"); return; }
    setLoading(true);
    try {
      const res  = await fetch("https://api.ecuapred.com/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Error al enviar"); return; }
      setSent(true);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="flex flex-1">

        {/* Panel izquierdo — branding */}
        <div className="hidden lg:flex flex-col w-[50%] bg-emerald-500 text-slate-950 relative shrink-0">
          <Link href="/" className="absolute top-5 left-5 flex items-center gap-1.5 text-slate-950/70 hover:text-slate-950 transition font-medium text-sm cursor-pointer">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </Link>
          <div className="flex-1 flex flex-col items-center justify-center px-12 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-emerald-400/60 grid place-items-center font-black text-slate-950 text-3xl shadow-inner">P</div>
            <h1 className="text-2xl font-black">EcuaPred</h1>
            <p className="text-slate-950/60 text-sm text-center">Te enviaremos un enlace seguro para restablecer tu contraseña</p>
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div className="flex-1 flex flex-col relative min-h-0 overflow-y-auto">
          <div className="absolute top-4 right-5 z-10"><ThemeToggle /></div>
          <Link href="/login" className="absolute top-4 left-5 z-10 lg:hidden flex items-center gap-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-white transition text-sm font-medium cursor-pointer">
            <ArrowLeft size={16} /> Volver
          </Link>

          <div className="flex-1 flex items-center justify-center px-5 py-16">
            <div className="w-full max-w-sm">

              {sent ? (
                /* Estado: enviado */
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-lg flex flex-col items-center gap-4 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 grid place-items-center">
                    <CheckCircle size={36} className="text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-black">Revisa tu correo</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Si <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
                  </p>
                  <p className="text-xs text-slate-400">El enlace expira en 15 minutos. Revisa también tu carpeta de spam.</p>
                  <Link href="/login" className="mt-2 text-sm text-emerald-500 font-semibold hover:text-emerald-400 transition cursor-pointer">
                    Volver al inicio de sesión
                  </Link>
                </div>
              ) : (
                /* Estado: formulario */
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-black">¿Olvidaste tu contraseña?</h2>
                    <p className="text-emerald-500 text-sm mt-1 font-medium">Te enviamos un enlace para restablecerla</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Correo electrónico</label>
                      <input
                        type="email"
                        placeholder="tu@correo.com"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition text-slate-900 dark:text-white placeholder-slate-400"
                      />
                    </div>

                    {error && (
                      <div className="text-sm px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">{error}</div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer active:scale-[0.98]"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                      {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                    </button>
                  </div>

                  <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                    ¿Recordaste tu contraseña?{" "}
                    <Link href="/login" className="text-emerald-500 font-semibold hover:text-emerald-400 transition cursor-pointer">
                      Inicia sesión
                    </Link>
                  </p>
                </>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
