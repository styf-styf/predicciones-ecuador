"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    confirmPassword: "",
    cedula: "",
    celular: "",
    ciudad: "",
    direccion: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ PRO FIX: tipado correcto del input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ✅ PRO FIX: tipado correcto del submit
  const handleRegister = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setError("");

    if (
      !form.nombre ||
      !form.apellido ||
      !form.email ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Completa los campos obligatorios");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "https://predicciones-ecuador.onrender.com/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            nombre: form.nombre,
            apellido: form.apellido,
            cedula: form.cedula,
            celular: form.celular,
            ciudad: form.ciudad,
            direccion: form.direccion,
            pais: "Ecuador",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al registrar");
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
      <div className="bg-slate-900 p-8 rounded-2xl w-[420px] border border-slate-800 shadow-xl">

        <h1 className="text-2xl font-bold mb-6 text-center">
          Crear cuenta
        </h1>

        <form onSubmit={handleRegister} className="space-y-3">

          <input name="nombre" placeholder="Nombre" onChange={handleChange}
            className="w-full p-3 rounded-xl bg-slate-800" />

          <input name="apellido" placeholder="Apellido" onChange={handleChange}
            className="w-full p-3 rounded-xl bg-slate-800" />

          <input name="email" placeholder="Correo" onChange={handleChange}
            className="w-full p-3 rounded-xl bg-slate-800" />

          <input name="password" type="password" placeholder="Contraseña"
            onChange={handleChange}
            className="w-full p-3 rounded-xl bg-slate-800" />

          <input name="confirmPassword" type="password" placeholder="Confirma la contraseña"
            onChange={handleChange}
            className="w-full p-3 rounded-xl bg-slate-800" />

          <input name="cedula" placeholder="Cédula de identidad"
            onChange={handleChange}
            className="w-full p-3 rounded-xl bg-slate-800" />

          <input name="celular" placeholder="Celular"
            onChange={handleChange}
            className="w-full p-3 rounded-xl bg-slate-800" />

          <input value="Ecuador" disabled
            className="w-full p-3 rounded-xl bg-slate-700 text-slate-300" />

          <input name="ciudad" placeholder="Ciudad"
            onChange={handleChange}
            className="w-full p-3 rounded-xl bg-slate-800" />

          <input name="direccion" placeholder="Dirección"
            onChange={handleChange}
            className="w-full p-3 rounded-xl bg-slate-800" />

          <button
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl"
          >
            {loading ? "Creando..." : "Registrarse"}
          </button>

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