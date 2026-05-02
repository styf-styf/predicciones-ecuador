"use client";
import Header from "@/components/Header";
import { useState } from "react";
import { Mail, MessageSquare, Clock, CheckCircle } from "lucide-react";

export default function ContactoPage() {
  const [form, setForm] = useState({ nombre: "", email: "", asunto: "", mensaje: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!form.nombre || !form.email || !form.mensaje) return;
    setSending(true);
    // Aquí puedes conectar con un servicio de email como Resend, Nodemailer, etc.
    await new Promise((r) => setTimeout(r, 1500)); // simulación
    setSent(true);
    setSending(false);
    setForm({ nombre: "", email: "", asunto: "", mensaje: "" });
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">

        <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Soporte</p>
          <h1 className="text-3xl font-bold">Contacto</h1>
          <p className="text-sm text-slate-400 mt-2">Estamos aquí para ayudarte. Responderemos en menos de 24 horas hábiles.</p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Mail size={18} />, title: "Email", desc: "info@predicciones-ecuador.com", color: "text-blue-500" },
            { icon: <MessageSquare size={18} />, title: "Soporte", desc: "Completa el formulario y te respondemos", color: "text-emerald-500" },
            { icon: <Clock size={18} />, title: "Horario", desc: "Lunes a Viernes · 9:00 - 18:00", color: "text-amber-500" },
          ].map((item) => (
            <div key={item.title} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2">
              <div className={item.color}>{item.icon}</div>
              <p className="font-semibold text-sm">{item.title}</p>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Formulario */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-lg">Envíanos un mensaje</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Nombre</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Tu nombre"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="tu@email.com"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Asunto</label>
            <input
              value={form.asunto}
              onChange={(e) => setForm((p) => ({ ...p, asunto: e.target.value }))}
              placeholder="¿En qué podemos ayudarte?"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Mensaje</label>
            <textarea
              value={form.mensaje}
              onChange={(e) => setForm((p) => ({ ...p, mensaje: e.target.value }))}
              placeholder="Describe tu consulta con detalle..."
              rows={5}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition text-slate-900 dark:text-white resize-none"
            />
          </div>

          {sent ? (
            <div className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl py-3 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
              <CheckCircle size={15} /> Mensaje enviado — te responderemos pronto
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={sending || !form.nombre || !form.email || !form.mensaje}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.99]"
            >
              {sending ? "Enviando..." : "Enviar mensaje"}
            </button>
          )}
        </div>

      </div>
    </main>
  );
}