"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

function ResetPasswordContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [newPw, setNewPw]         = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showNew, setShowNew]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (!token) setError("Enlace inválido. Solicita uno nuevo desde la página de inicio de sesión.");
  }, [token]);

  const handleReset = async () => {
    setError("");
    if (!newPw || !confirm)     { setError("Completa todos los campos"); return; }
    if (newPw.length < 8)       { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    if (newPw !== confirm)      { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    try {
      const res  = await fetch("https://api.ecuapred.com/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Error al restablecer"); return; }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="flex flex-1">

        {/* Panel izquierdo */}
        <div className="hidden lg:flex flex-col w-[50%] bg-emerald-500 text-slate-950 relative shrink-0">
          <Link href="/" className="absolute top-5 left-5 flex items-center gap-1.5 text-slate-950/70 hover:text-slate-950 transition font-medium text-sm cursor-pointer">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </Link>
          <div className="flex-1 flex flex-col items-center justify-center px-12 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-emerald-400/60 grid place-items-center font-black text-slate-950 text-3xl shadow-inner">P</div>
            <h1 className="text-2xl font-black">EcuaPred</h1>
            <p className="text-slate-950/60 text-sm text-center">Crea una nueva contraseña segura para tu cuenta</p>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="flex-1 flex flex-col relative min-h-0 overflow-y-auto">
          <div className="absolute top-4 right-5 z-10"><ThemeToggle /></div>
          <Link href="/login" className="absolute top-4 left-5 z-10 lg:hidden flex items-center gap-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-white transition text-sm font-medium cursor-pointer">
            <ArrowLeft size={16} /> Volver
          </Link>

          <div className="flex-1 flex items-center justify-center px-5 py-16">
            <div className="w-full max-w-sm">

              {success ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-lg flex flex-col items-center gap-4 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 grid place-items-center">
                    <CheckCircle size={36} className="text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-black">¡Contraseña actualizada!</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tu contraseña fue restablecida correctamente. Redirigiendo al inicio de sesión...</p>
                  <div className="w-8 h-1 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              ) : !token ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-lg flex flex-col items-center gap-4 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-rose-500/10 grid place-items-center">
                    <XCircle size={36} className="text-rose-500" />
                  </div>
                  <h2 className="text-xl font-black">Enlace inválido</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Este enlace no es válido o ya expiró.</p>
                  <Link href="/forgot-password" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition cursor-pointer">
                    Solicitar nuevo enlace
                  </Link>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-black">Nueva contraseña</h2>
                    <p className="text-emerald-500 text-sm mt-1 font-medium">Elige una contraseña segura de al menos 8 caracteres</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">

                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Nueva contraseña</label>
                      <div className="relative">
                        <input
                          type={showNew ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition text-slate-900 dark:text-white placeholder-slate-400"
                        />
                        <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer">
                          {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Confirmar contraseña</label>
                      <div className="relative">
                        <input
                          type={showConf ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleReset()}
                          className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-sm focus:border-emerald-500 transition text-slate-900 dark:text-white placeholder-slate-400"
                        />
                        <button type="button" onClick={() => setShowConf(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer">
                          {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="text-sm px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">{error}</div>
                    )}

                    <button
                      onClick={handleReset}
                      disabled={loading}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer active:scale-[0.98]"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                      {loading ? "Guardando..." : "Guardar nueva contraseña"}
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
