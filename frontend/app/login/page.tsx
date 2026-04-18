"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role === "admin") {
      router.push("/admin");
    } else if (token) {
      router.push("/");
    }
  }, [router]);

  

  const handleLogin = async () => {
    const res = await fetch("https://predicciones-ecuador.onrender.com/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role || "user");
      localStorage.setItem("points", String(data.points || 0));

      setMessage("Login exitoso ✅");

      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } else {
      setMessage(data.message || "Error al iniciar sesión");
    }
    
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("points");
    setMessage("Sesión cerrada");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="bg-slate-900 p-8 rounded-2xl w-96 border border-slate-800 shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Iniciar Sesión
        </h1>

        <input
          type="email"
          placeholder="Correo"
          className="w-full p-3 rounded-xl bg-slate-800 mb-3 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Contraseña"
          className="w-full p-3 rounded-xl bg-slate-800 mb-4 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl mb-2"
        >
          Iniciar sesión
        </button>

        <Link href="/register">
  <button className="w-full bg-blue-500 font-bold py-3 rounded-xl mb-2">
    Registrarse
  </button>
 </Link>
 <div className="mb-2">
  <button
    type="button"
    onClick={async () => {
      const { supabase } = await import("@/lib/supabase");

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "https://predicciones-ecuador.onrender.com",
        },
      });
    }}
    className="w-full bg-white text-black font-bold py-3 rounded-xl"
  >
    Continuar con Google
  </button>
 </div>

        <button
          onClick={handleLogout}
          className="w-full bg-rose-500 font-bold py-3 rounded-xl"
        >
          Cerrar sesión
        </button>

        {message && (
          <p className="text-center text-sm mt-4 text-slate-300">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}