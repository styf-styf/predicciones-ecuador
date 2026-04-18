"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const res = await fetch("https://predicciones-ecuador.onrender.com/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message);
      return;
    }

    router.push("/login");

  } catch (err) {
    setError("Error en el servidor");
  } finally {
    setLoading(false);
  }
 };

  return (
  <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
    <div className="bg-slate-900 p-8 rounded-2xl w-96 border border-slate-800 shadow-xl">

      <h1 className="text-2xl font-bold mb-6 text-center">
        Crear cuenta
      </h1>

      <form onSubmit={handleRegister} className="space-y-3">

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-xl bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <input
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-xl bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <button
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 transition text-slate-950 font-bold py-3 rounded-xl"
        >
          {loading ? "Creando..." : "Registrarse"}
        </button>

        <p className="text-center text-sm mt-4 text-slate-400">
  ¿Ya tienes cuenta?{" "}
  <a href="/login" className="text-emerald-400 hover:underline">
    Inicia sesión
  </a>
</p>

      </form>

      {error && (
        <p className="text-center text-sm mt-4 text-rose-400">
          {error}
        </p>
      )}
    </div>
  </main>
);
}