import Header from "@/components/Header";

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">

        <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Documento legal</p>
          <h1 className="text-3xl font-bold">Política de Privacidad</h1>
          <p className="text-sm text-slate-400 mt-2">Última actualización: mayo 2025 · EcuaPred</p>
        </div>

        {[
          {
            title: "1. Responsable del tratamiento de datos",
            content: `El responsable del tratamiento de sus datos personales es [NOMBRE LEGAL DE LA EMPRESA], operadora de la plataforma tecnológica EcuaPred, con RUC [NÚMERO DE RUC], domiciliada en [DIRECCIÓN FÍSICA], Ecuador. Para cualquier consulta relacionada con sus datos personales puede contactarnos en info@ecuapred.com.`
          },
          {
            title: "2. Información que recopilamos",
            content: `Recopilamos los siguientes datos personales: (a) Datos de identificación: nombre, apellido, cédula de identidad o pasaporte; (b) Datos de contacto: correo electrónico, número de celular, ciudad y provincia; (c) Datos bancarios: banco, número de cuenta, tipo de cuenta, titular; (d) Datos de actividad: predicciones realizadas, transacciones, movimientos de saldo, comentarios en mercados; (e) Datos técnicos: dirección IP, tipo de navegador, dispositivo utilizado. La cédula y datos bancarios son recopilados únicamente para verificación de identidad y procesamiento de retiros.`
          },
          {
            title: "3. Base legal del tratamiento",
            content: `Procesamos sus datos personales bajo las siguientes bases legales conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP) de Ecuador: (a) Ejecución de contrato: para gestionar su cuenta, procesar recargas, retiros y predicciones; (b) Consentimiento: para el envío de comunicaciones sobre su actividad en la plataforma; (c) Obligación legal: para cumplir con requerimientos de autoridades competentes; (d) Interés legítimo: para prevenir fraude y garantizar la seguridad de la plataforma.`
          },
          {
            title: "4. Uso de la información",
            content: `Utilizamos su información exclusivamente para: gestionar su cuenta y transacciones, verificar su identidad en procesos de retiro, procesar recargas y pagos, enviarle notificaciones transaccionales sobre su actividad (recargas aprobadas, retiros, resultados de mercados), mejorar nuestros servicios, detectar y prevenir fraude, y cumplir con obligaciones legales aplicables en Ecuador.`
          },
          {
            title: "5. Compartir información con terceros",
            content: `No vendemos ni compartimos su información personal con terceros con fines comerciales. Compartimos datos únicamente en los siguientes casos: (a) Procesadores de pago: Payphone y Deuna reciben los datos mínimos necesarios para procesar transacciones; (b) Infraestructura tecnológica: Supabase (base de datos, almacenamiento) y Resend (envío de correos) procesan datos bajo contratos de confidencialidad; (c) Requerimiento legal: cuando una autoridad competente ecuatoriana lo solicite mediante orden legal.`
          },
          {
            title: "6. Transferencias internacionales de datos",
            content: `Sus datos son procesados en servidores ubicados fuera de Ecuador en los siguientes servicios: Supabase (base de datos, con servidores en Estados Unidos) y Resend (envío de correos, con servidores en Estados Unidos). Estas transferencias se realizan bajo las garantías establecidas en la LOPDP y los contratos de procesamiento de datos suscritos con dichos proveedores, que incluyen cláusulas de confidencialidad y seguridad equivalentes a los estándares ecuatorianos.`
          },
          {
            title: "7. Seguridad de los datos",
            content: `Implementamos las siguientes medidas de seguridad para proteger su información: (a) Contraseñas almacenadas con cifrado bcrypt; (b) Comunicaciones mediante HTTPS/TLS; (c) Autenticación mediante tokens JWT con expiración automática; (d) Acceso restringido a datos sensibles solo para personal autorizado; (e) Monitoreo de errores y actividad inusual mediante herramientas de observabilidad. Ningún sistema es 100% seguro; ante cualquier incidente de seguridad que afecte sus datos le notificaremos en el plazo que establezca la LOPDP.`
          },
          {
            title: "8. Cookies y tecnologías similares",
            content: `EcuaPred utiliza almacenamiento local del navegador (localStorage) para mantener su sesión activa y recordar sus preferencias de visualización (modo oscuro/claro). No utilizamos cookies de rastreo con fines publicitarios de terceros. Puede limpiar el almacenamiento local desde la configuración de su navegador, lo que cerrará su sesión automáticamente.`
          },
          {
            title: "9. Retención de datos",
            content: `Conservamos sus datos personales durante el tiempo que su cuenta esté activa. Si solicita la eliminación de su cuenta, eliminaremos su información personal en un plazo de 30 días, salvo que la ley nos obligue a conservarla por un período mayor (por ejemplo, registros de transacciones financieras que pueden requerirse por hasta 7 años según normativa tributaria ecuatoriana).`
          },
          {
            title: "10. Sus derechos ARCO+",
            content: `Conforme a la Ley Orgánica de Protección de Datos Personales de Ecuador, usted tiene los siguientes derechos sobre sus datos: (a) Acceso: conocer qué datos tenemos sobre usted; (b) Rectificación: corregir datos inexactos o incompletos; (c) Cancelación/Eliminación: solicitar la eliminación de sus datos; (d) Oposición: oponerse al tratamiento de sus datos en determinados casos; (e) Portabilidad: recibir sus datos en formato estructurado y legible. Para ejercer cualquiera de estos derechos, envíe su solicitud a info@ecuapred.com indicando el derecho que desea ejercer y adjuntando copia de su documento de identidad. Responderemos en un plazo máximo de 15 días hábiles. También puede actualizar directamente sus datos de perfil desde la sección Panel de usuario.`
          },
          {
            title: "11. Comunicaciones y marketing",
            content: `Solo le enviaremos correos de carácter transaccional (confirmación de recargas, retiros, resultados de mercados, verificación de cuenta, recuperación de contraseña). No realizamos envíos de marketing sin su consentimiento explícito. Puede solicitar en cualquier momento el cese de comunicaciones no transaccionales escribiendo a info@ecuapred.com.`
          },
          {
            title: "12. Cambios a esta política",
            content: `Podemos actualizar esta política de privacidad cuando sea necesario. Le notificaremos sobre cambios significativos mediante correo electrónico a su dirección registrada y mediante un aviso visible en la plataforma, con al menos 10 días de anticipación a la entrada en vigor. Le recomendamos revisar esta política periódicamente.`
          },
          {
            title: "13. Contacto y autoridad de control",
            content: `Para preguntas, solicitudes o reclamos sobre el tratamiento de sus datos personales contáctenos en info@ecuapred.com. Si considera que sus derechos no han sido atendidos correctamente, puede presentar una reclamación ante la Autoridad de Protección de Datos Personales de Ecuador, conforme a lo establecido en la LOPDP.`
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
