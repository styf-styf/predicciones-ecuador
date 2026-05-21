import Header from "@/components/Header";

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">

        <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Documento legal</p>
          <h1 className="text-3xl font-bold">Política de Privacidad</h1>
          <p className="text-sm text-slate-400 mt-2">Última actualización: enero 2025 · EcuaPred</p>
        </div>

        {[
          {
            title: "1. Información que recopilamos",
            content: `Recopilamos información que usted nos proporciona directamente al registrarse, como nombre, apellido, correo electrónico, cédula de identidad, número de celular, datos bancarios y dirección. También recopilamos información sobre el uso de la plataforma como apuestas realizadas, transacciones y actividad general.`
          },
          {
            title: "2. Uso de la información",
            content: `Utilizamos su información para gestionar su cuenta y transacciones, verificar su identidad, procesar recargas y retiros, enviarle notificaciones sobre su actividad en la plataforma, mejorar nuestros servicios, y cumplir con obligaciones legales aplicables en Ecuador.`
          },
          {
            title: "3. Compartir información",
            content: `No vendemos ni compartimos su información personal con terceros, excepto cuando sea necesario para procesar pagos a través de proveedores como Payphone o Deuna, cumplir con requerimientos legales o regulatorios, o proteger los derechos e integridad de la plataforma.`
          },
          {
            title: "4. Seguridad de los datos",
            content: `Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra acceso no autorizado, alteración, divulgación o destrucción. Las contraseñas se almacenan cifradas y las comunicaciones se realizan mediante protocolos seguros.`
          },
          {
            title: "5. Cookies",
            content: `Utilizamos cookies y tecnologías similares para mantener su sesión activa y mejorar su experiencia en la plataforma. Puede configurar su navegador para rechazar cookies, aunque esto puede afectar algunas funcionalidades del servicio.`
          },
          {
            title: "6. Retención de datos",
            content: `Conservamos su información personal mientras su cuenta esté activa o sea necesaria para prestarle servicios. Si solicita la eliminación de su cuenta, eliminaremos su información personal en un plazo de 30 días, salvo que la ley nos obligue a conservarla.`
          },
          {
            title: "7. Sus derechos",
            content: `Usted tiene derecho a acceder, corregir o eliminar su información personal. Puede actualizar sus datos directamente desde la sección de Perfil en su panel de usuario. Para solicitudes adicionales puede contactarnos en info@ecuapred.com`
          },
          {
            title: "8. Cambios a esta política",
            content: `Podemos actualizar esta política de privacidad periódicamente. Le notificaremos sobre cambios significativos mediante un aviso en la plataforma o por correo electrónico. Le recomendamos revisar esta política regularmente.`
          },
          {
            title: "9. Contacto",
            content: `Si tiene preguntas sobre esta política de privacidad o sobre el manejo de sus datos personales, contáctenos en info@ecuapred.com`
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