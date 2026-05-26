import Header from "@/components/Header";

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">

        <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Documento legal</p>
          <h1 className="text-3xl font-bold">Términos y Condiciones</h1>
          <p className="text-sm text-slate-400 mt-2">Última actualización: mayo 2025 · EcuaPred</p>
        </div>

        {[
          {
            title: "1. Identificación del proveedor",
            content: `EcuaPred es una plataforma de entretenimiento y predicciones operada por [NOMBRE LEGAL DE LA EMPRESA], con RUC [NÚMERO DE RUC], domiciliada en [DIRECCIÓN FÍSICA], Ecuador. Para contactarnos: info@ecuapred.com.`
          },
          {
            title: "2. Aceptación de los términos",
            content: `Al acceder y utilizar la plataforma EcuaPred, usted acepta estar sujeto a estos Términos y Condiciones, así como a nuestra Política de Privacidad. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio. La aceptación es voluntaria y constituye un acuerdo vinculante entre usted y EcuaPred.`
          },
          {
            title: "3. Descripción del servicio",
            content: `EcuaPred es una plataforma de entretenimiento que permite a los usuarios participar en mercados de predicción sobre eventos reales utilizando saldo adquirido mediante recargas. El saldo puede ser retirado según las condiciones establecidas en estos términos. EcuaPred no garantiza ganancias ni resultados específicos. La participación implica riesgo de pérdida del saldo invertido.`
          },
          {
            title: "4. Modelo peer-to-peer",
            content: `EcuaPred actúa exclusivamente como plataforma tecnológica que facilita la interacción entre usuarios. EcuaPred no actúa como contraparte en ninguna predicción, no fija cuotas ni gana cuando un usuario pierde. Las predicciones se forman entre usuarios que adoptan posiciones contrarias sobre el mismo evento. Los mercados se resuelven según el resultado real del evento verificado públicamente, no a discreción de la plataforma.`
          },
          {
            title: "5. Comisiones",
            content: `EcuaPred cobra una comisión sobre el volumen total de saldo participado en cada mercado al momento de su resolución, como contraprestación por el servicio tecnológico de facilitación. La tasa de comisión vigente está disponible en la configuración de la plataforma y puede ser modificada con previo aviso según lo establecido en estos términos.`
          },
          {
            title: "6. Elegibilidad",
            content: `Para utilizar nuestros servicios debe cumplir todos los siguientes requisitos: (a) ser mayor de 18 años; (b) residir en Ecuador; (c) tener capacidad legal para celebrar contratos. Al registrarse, usted declara y garantiza que cumple con estos requisitos. Nos reservamos el derecho de solicitar verificación de identidad (cédula, copia de documento) en cualquier momento, especialmente para el procesamiento de retiros.`
          },
          {
            title: "7. Registro y seguridad de la cuenta",
            content: `Usted es responsable de mantener la confidencialidad de sus credenciales de acceso. Acepta notificarnos inmediatamente a info@ecuapred.com sobre cualquier uso no autorizado de su cuenta. No nos hacemos responsables por pérdidas derivadas del uso no autorizado de su cuenta cuando este se deba a negligencia del usuario. Queda prohibido compartir credenciales o crear cuentas en nombre de terceros.`
          },
          {
            title: "8. Recargas",
            content: `Las recargas se acreditan en saldo virtual a la tasa de 1 USD = 1 punto. Los métodos de pago disponibles son transferencia bancaria y pago mediante Payphone. Las recargas por transferencia requieren adjuntar comprobante y están sujetas a verificación por parte del equipo de EcuaPred en un plazo de hasta 24 horas hábiles. EcuaPred se reserva el derecho de rechazar recargas que no puedan ser verificadas.`
          },
          {
            title: "9. Retiros",
            content: `Los retiros están disponibles para usuarios que hayan completado su perfil con datos bancarios válidos. El monto mínimo de retiro es de $10. Los retiros se procesan en un plazo de 1 a 3 días hábiles. Nos reservamos el derecho de solicitar documentación adicional (cédula, comprobante de cuenta) para procesar retiros, especialmente en montos elevados o cuando existan señales de actividad inusual. EcuaPred puede retener retiros si existen investigaciones de fraude en curso.`
          },
          {
            title: "10. Régimen fiscal",
            content: `Los premios y ganancias obtenidos en EcuaPred pueden estar sujetos a obligaciones tributarias según la legislación ecuatoriana vigente. Es responsabilidad exclusiva del usuario declarar y pagar los impuestos correspondientes a sus ganancias ante el Servicio de Rentas Internas (SRI). EcuaPred no actúa como agente de retención respecto de los premios pagados a usuarios. Recomendamos consultar a un asesor tributario.`
          },
          {
            title: "11. Conducta del usuario",
            content: `Usted se compromete a no realizar ninguna de las siguientes actividades: (a) utilizar la plataforma para actividades fraudulentas o de lavado de dinero; (b) manipular mercados de predicción mediante acuerdos con otros usuarios; (c) crear múltiples cuentas para obtener ventajas; (d) usar bots, scripts o herramientas automatizadas; (e) cualquier actividad que viole las leyes ecuatorianas vigentes. El incumplimiento puede resultar en la suspensión inmediata o eliminación definitiva de su cuenta y la retención del saldo disponible mientras dure la investigación.`
          },
          {
            title: "12. Suspensión y cancelación de cuenta",
            content: `EcuaPred puede suspender o cancelar su cuenta en los siguientes casos: (a) violación de estos términos; (b) actividad fraudulenta o sospechosa; (c) solicitud del propio usuario; (d) inactividad prolongada superior a 12 meses. En casos de suspensión por investigación, le notificaremos a su correo registrado. Si la suspensión es por violación confirmada de términos, el saldo remanente podrá ser retenido. Usted puede solicitar la cancelación voluntaria de su cuenta en cualquier momento enviando un correo a info@ecuapred.com.`
          },
          {
            title: "13. Procedimiento de reclamos",
            content: `Si tiene un problema con su cuenta, transacción o predicción, siga estos pasos: (1) Envíe un correo a info@ecuapred.com con el asunto "Reclamo" describiendo el problema y adjuntando cualquier evidencia relevante. (2) Recibirá una respuesta de confirmación en un plazo de 24 horas hábiles. (3) Su reclamo será resuelto en un plazo máximo de 5 días hábiles. Si no queda satisfecho con nuestra respuesta, puede acudir a la Defensoría del Pueblo de Ecuador o a los órganos de resolución de conflictos competentes según la Ley Orgánica de Defensa del Consumidor.`
          },
          {
            title: "14. Limitación de responsabilidad",
            content: `EcuaPred no se hace responsable por: (a) pérdidas derivadas de decisiones de predicción del usuario; (b) interrupciones del servicio por causas de fuerza mayor, mantenimiento o fallas técnicas ajenas a nuestra voluntad; (c) pérdidas indirectas o consecuentes. Nuestro servicio se proporciona en el estado en que se encuentra. En ningún caso nuestra responsabilidad total excederá el saldo disponible en la cuenta del usuario al momento del reclamo.`
          },
          {
            title: "15. Modificaciones del servicio y los términos",
            content: `Nos reservamos el derecho de modificar estos términos. Cualquier modificación será notificada con al menos 10 días de anticipación mediante correo electrónico a su dirección registrada y mediante un aviso visible en la plataforma. Si no está de acuerdo con los cambios, puede cancelar su cuenta antes de la fecha de entrada en vigor. El uso continuado de la plataforma tras esa fecha constituye su aceptación de los nuevos términos.`
          },
          {
            title: "16. Resolución de conflictos y ley aplicable",
            content: `Estos términos se rigen por las leyes de la República del Ecuador. Ante cualquier conflicto, las partes buscarán en primer lugar una solución amistosa. En caso de no llegar a un acuerdo, el conflicto será sometido a la jurisdicción de los jueces y tribunales competentes de Ecuador, de conformidad con la Ley Orgánica de Defensa del Consumidor y demás normas aplicables.`
          },
          {
            title: "17. Contacto",
            content: `Para consultas sobre estos términos puede contactarnos en info@ecuapred.com o mediante el formulario de contacto disponible en ecuapred.com/contacto.`
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
