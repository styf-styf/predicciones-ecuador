export default function MantenimientoPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 grid place-items-center mx-auto mb-6">
          <span className="text-3xl">🔧</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">
          En mantenimiento
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Estamos realizando mejoras en la plataforma. Volvemos pronto.
        </p>
        <p className="text-xs text-slate-600 mt-6">EcuaPred</p>
      </div>
    </div>
  );
}
