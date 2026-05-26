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
            content: `EcuaPred es una plataforma tecnológica de mercados de predicción operada por [NOMBRE LEGAL DE LA EMPRESA], con RUC [NÚMERO DE RUC], domiciliada en [DIRECCIÓN FÍSICA], Ecuador. Para contactarnos: info@ecuapred.com.`
          },
          {
            title: "2. Aceptación de los términos",
            content: `Al acceder y utilizar la plataforma EcuaPred, usted acepta estar sujeto a estos Términos y Condiciones, así como a nuestra Política de Privacidad. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio. La aceptación es voluntaria y constituye un acuerdo vinculante entre usted y EcuaPred.`
          },
          {
            title: "3. Descripción del servicio",
            content: `EcuaPred es una plataforma tecnológica que facilita mercados de predicción entre usuarios sobre eventos reales de diversas categorías: deportes, política, economía, entretenimiento y más. Los usuarios adquieren saldo mediante recargas para participar en dichos mercados. El saldo puede ser retirado según las condiciones establecidas en estos términos. EcuaPred no garantiza ganancias ni resultados específicos. La participación implica riesgo de pérdida del saldo invertido.`
          },
          {
            title: "4. Modelo peer-to-peer",
            content: `EcuaPred actúa exclusivamente como plataforma tecnológica que facilita la interacción entre usuarios. EcuaPred no actúa como contraparte en ninguna predicción, no fija cuotas ni gana cuando un usuario pierde. Las predicciones se forman entre usuarios que adoptan posiciones contrarias sobre el mismo evento. Los mercados se resuelven según el resultado real del evento verificado públicamente, no a discreción de la plataforma.`
          },
          {
            title: "5. Comisiones",
            content: `EcuaPred cobra una comisión del 5% únicamente sobre la ganancia bruta obtenida por cada usuario ganador al momento de resolverse un mercado. La inversión original del usuario siempre es devuelta en su totalidad. No se cobra comisión por recargas, retiros ni por participar en mercados que no se ganen. Ejemplo: si un usuario gana $20 de ganancia bruta, la comisión es $1 y recibe $19 de ganancia neta más su inversión original. La tasa de comisión puede ser modificada con previo aviso según lo establecido en estos términos.`
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
            title: "17. Disputas sobre resolución de mercados",
            content: `Si un usuario considera que un mercado fue resuelto de manera incorrecta, puede iniciar una disputa siguiendo este proceso: (1) Enviar un correo a info@ecuapred.com con el asunto "Disputa de mercado" dentro de los 3 días calendario siguientes a la resolución del mercado, indicando el mercado en cuestión y adjuntando la fuente pública que sustenta su reclamo. (2) EcuaPred revisará la disputa contrastando el resultado con fuentes oficiales verificables (medios de comunicación reconocidos, resultados oficiales de organismos competentes) y emitirá una respuesta en un plazo máximo de 5 días hábiles. (3) Si la disputa resulta fundada, EcuaPred corregirá la resolución y redistribuirá los saldos correspondientes. (4) La decisión de EcuaPred basada en fuentes verificables públicas es definitiva. No se aceptarán disputas presentadas fuera del plazo indicado. Principio de resolución por defecto: cuando un mercado llega a su fecha y hora de cierre sin que exista evidencia pública verificable de que el evento ocurrió, el mercado se resuelve automáticamente como "No". La ausencia de información que confirme el evento equivale a que el evento no ocurrió dentro del plazo establecido. Ejemplo: si el mercado pregunta "¿Subirá el precio del diésel en Ecuador antes del 17 de mayo?" y a las 23:59 del 17 de mayo no existe ninguna fuente oficial que confirme dicho aumento, el mercado se resuelve como "No" y no puede ser disputado por falta de evidencia contraria. La carga de la prueba recae siempre sobre quien afirma que el evento sí ocurrió.`
          },
          {
            title: "18. Prevención de lavado de activos (AML)",
            content: `EcuaPred está comprometido con la prevención del lavado de activos y el financiamiento de actividades ilícitas. En cumplimiento de la normativa ecuatoriana vigente: (a) EcuaPred puede solicitar en cualquier momento documentación adicional de identidad (cédula, pasaporte, justificación de fondos) a cualquier usuario, especialmente ante transacciones inusuales o montos elevados; (b) EcuaPred puede retener retiros y suspender cuentas mientras se realizan verificaciones de cumplimiento; (c) Queda expresamente prohibido utilizar la plataforma para introducir, transferir o disimular fondos de origen ilícito; (d) EcuaPred cooperará con las autoridades ecuatorianas competentes ante cualquier requerimiento legal relacionado con investigaciones de lavado de activos. El incumplimiento de esta sección puede resultar en la cancelación definitiva de la cuenta y la denuncia ante las autoridades correspondientes.`
          },
          {
            title: "19. Propiedad intelectual",
            content: `El nombre EcuaPred, su logotipo, diseño, código fuente, estructura de mercados y demás elementos de la plataforma son propiedad exclusiva de sus operadores. Queda prohibida su reproducción, distribución, modificación o uso comercial sin autorización expresa y por escrito. El usuario no adquiere ningún derecho de propiedad intelectual sobre la plataforma por el hecho de utilizarla. Los contenidos generados por los usuarios (comentarios, sugerencias) pueden ser utilizados por EcuaPred para mejorar el servicio sin compensación adicional.`
          },
          {
            title: "20. Fuerza mayor",
            content: `EcuaPred no será responsable por retrasos o incumplimientos derivados de causas fuera de su control razonable, incluyendo: fallos de infraestructura de terceros (servidores, proveedores de pago, red eléctrica), desastres naturales, actos de gobierno, ciberataques externos, pandemias u otras emergencias nacionales. En caso de fuerza mayor, EcuaPred notificará a los usuarios a través de los canales disponibles, adoptará las medidas razonables para restablecer el servicio y garantizará que los saldos de los usuarios no se vean afectados por dichas circunstancias.`
          },
          {
            title: "21. Predicción responsable",
            content: `EcuaPred promueve la participación responsable en sus mercados de predicción. Recomendamos: (a) Participar solo con saldo que usted puede permitirse perder; (b) No tomar decisiones de inversión basadas exclusivamente en resultados pasados en la plataforma; (c) Establecer límites personales de participación. Si considera que su uso de la plataforma está afectando negativamente su situación económica o emocional, le recomendamos buscar apoyo profesional. EcuaPred se reserva el derecho de establecer límites de participación a usuarios que presenten patrones de uso inusuales, como medida de protección.`
          },
          {
            title: "22. Contacto",
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
