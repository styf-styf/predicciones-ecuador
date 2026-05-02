import Header from "@/components/Header";

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">

        <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Documento legal</p>
          <h1 className="text-3xl font-bold">Términos y Condiciones</h1>
          <p className="text-sm text-slate-400 mt-2">Última actualización: enero 2025 · Predicciones Ecuador</p>
        </div>

        {[
          {
            title: "1. Aceptación de los términos",
            content: `Al acceder y utilizar la plataforma Predicciones Ecuador, usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio.`
          },
          {
            title: "2. Descripción del servicio",
            content: `Predicciones Ecuador es una plataforma de predicciones deportivas y de entretenimiento que permite a los usuarios participar en mercados de predicción utilizando puntos virtuales. Los puntos pueden ser adquiridos mediante recargas y canjeados según las condiciones establecidas.`
          },
          {
            title: "3. Elegibilidad",
            content: `Para utilizar nuestros servicios debe ser mayor de 18 años y residir en Ecuador. Al registrarse, usted declara y garantiza que cumple con estos requisitos. Nos reservamos el derecho de solicitar verificación de identidad en cualquier momento.`
          },
          {
            title: "4. Registro y cuenta",
            content: `Usted es responsable de mantener la confidencialidad de su cuenta y contraseña. Acepta notificarnos inmediatamente sobre cualquier uso no autorizado de su cuenta. No nos hacemos responsables por pérdidas derivadas del uso no autorizado de su cuenta.`
          },
          {
            title: "5. Recargas y retiros",
            content: `Las recargas se acreditan en puntos virtuales a la tasa establecida por la plataforma. Los retiros están sujetos a verificación y pueden tardar entre 1 y 3 días hábiles. Nos reservamos el derecho de solicitar documentación adicional para procesar retiros. El monto mínimo de retiro es de 10 puntos.`
          },
          {
            title: "6. Conducta del usuario",
            content: `Usted se compromete a no utilizar la plataforma para actividades fraudulentas, manipular mercados de predicción, crear múltiples cuentas, o cualquier actividad que viole las leyes ecuatorianas vigentes. El incumplimiento puede resultar en la suspensión o eliminación de su cuenta.`
          },
          {
            title: "7. Modificaciones",
            content: `Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación. El uso continuado de la plataforma tras las modificaciones constituye su aceptación de los nuevos términos.`
          },
          {
            title: "8. Limitación de responsabilidad",
            content: `Predicciones Ecuador no se hace responsable por pérdidas indirectas, incidentales o consecuentes derivadas del uso de la plataforma. Nuestro servicio se proporciona "tal cual" sin garantías de ningún tipo.`
          },
          {
            title: "9. Contacto",
            content: `Para consultas sobre estos términos puede contactarnos en info@predicciones-ecuador.com`
          },
        ].map((section) => (
          <div key={section.title} className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{section.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{section.content}</p>
          </div>
        ))}

      </div>
    </main>
  );
}