"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

function VerifyEmailContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus]   = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code  = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      const msgs: Record<string, string> = {
        token_invalido: "El enlace no es válido o ya expiró. Vuelve a registrarte.",
        error_servidor: "Ocurrió un error. Inténtalo de nuevo.",
      };
      setStatus("error");
      setMessage(msgs[error] || "Enlace inválido.");
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("Enlace inválido o expirado.");
      return;
    }

    // Intercambiar el código de un solo uso por el JWT
    fetch("https://api.ecuapred.com/auth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.token) {
          setStatus("error");
          setMessage("El enlace ya fue usado o expiró. Vuelve a registrarte.");
          return;
        }

        // Guardar sesión
        localStorage.setItem("token", data.token);
        const meRes = await fetch("https://api.ecuapred.com/me", {
          headers: { authorization: `Bearer ${data.token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          localStorage.setItem("role", me.role || "user");
          localStorage.setItem("points", String(me.points || 0));
        }
        window.dispatchEvent(new Event("auth-change"));

        setStatus("ok");
        setMessage("¡Cuenta verificada! Entrando a EcuaPred...");
        setTimeout(() => router.push("/"), 1800);
      })
      .catch(() => {
        setStatus("error");
        setMessage("Error de conexión. Inténtalo de nuevo.");
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="flex flex-col items-center gap-5 text-center px-6 max-w-sm">

        {status === "loading" && (
          <>
            <Loader2 size={48} className="text-emerald-500 animate-spin" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Verificando tu cuenta...</p>
          </>
        )}

        {status === "ok" && (
          <>
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 grid place-items-center">
              <CheckCircle size={36} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">¡Verificación exitosa!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
            <div className="w-8 h-1 rounded-full bg-emerald-500 animate-pulse" />
          </>
        )}

        {status === "error" && (
          <>
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 grid place-items-center">
              <XCircle size={36} className="text-rose-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Enlace inválido</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
            <button
              onClick={() => router.push("/register")}
              className="mt-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition cursor-pointer"
            >
              Volver al registro
            </button>
          </>
        )}

      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
