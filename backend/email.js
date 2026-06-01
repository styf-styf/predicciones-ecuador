const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = "EcuaPred <noreply@ecuapred.com>";

async function sendEmail({ to, subject, html }) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    const data = await res.json();
    if (!res.ok) console.error("[email] Error:", data);
    return res.ok;
  } catch (err) {
    console.error("[email] Error enviando:", err.message);
    return false;
  }
}

function baseTemplate(content) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">
      <div style="background:#10b981;padding:24px 32px">
        <h1 style="margin:0;font-size:22px;color:#fff">EcuaPred</h1>
        <p style="margin:4px 0 0;font-size:13px;color:#d1fae5">Plataforma de predicciones de Ecuador</p>
      </div>
      <div style="padding:32px">
        ${content}
      </div>
      <div style="padding:16px 32px;background:#1e293b;text-align:center">
        <p style="margin:0;font-size:11px;color:#64748b">© 2025 EcuaPred · ecuapred.com</p>
      </div>
    </div>
  `;
}

// ── Bienvenida ──────────────────────────────────────────────────────────────
function emailBienvenida({ nombre, email }) {
  return sendEmail({
    to: email,
    subject: "¡Bienvenido a EcuaPred!",
    html: baseTemplate(`
      <h2 style="color:#10b981;margin-top:0">¡Hola, ${nombre || "usuario"}!</h2>
      <p>Tu cuenta ha sido creada exitosamente. Ya puedes empezar a predecir en los mercados de Ecuador.</p>
      <a href="https://ecuapred.com" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Ir a EcuaPred
      </a>
    `),
  });
}

// ── Retiro solicitado ────────────────────────────────────────────────────────
function emailRetiroSolicitado({ nombre, email, amount }) {
  return sendEmail({
    to: email,
    subject: "Solicitud de retiro recibida",
    html: baseTemplate(`
      <h2 style="color:#f59e0b;margin-top:0">Solicitud de retiro recibida</h2>
      <p>Hola ${nombre || "usuario"}, recibimos tu solicitud de retiro por:</p>
      <p style="font-size:28px;font-weight:bold;color:#10b981;margin:16px 0">$${Number(amount).toFixed(2)}</p>
      <p>Será procesada en <strong>1 a 3 días hábiles</strong>. Te notificaremos cuando sea aprobada.</p>
    `),
  });
}

// ── Retiro aprobado ──────────────────────────────────────────────────────────
function emailRetiroAprobado({ nombre, email, amount }) {
  return sendEmail({
    to: email,
    subject: "✅ Retiro aprobado",
    html: baseTemplate(`
      <h2 style="color:#10b981;margin-top:0">¡Tu retiro fue aprobado!</h2>
      <p>Hola ${nombre || "usuario"}, tu retiro de:</p>
      <p style="font-size:28px;font-weight:bold;color:#10b981;margin:16px 0">$${Number(amount).toFixed(2)}</p>
      <p>ha sido <strong>aprobado</strong> y será acreditado a tu cuenta bancaria en breve.</p>
    `),
  });
}

// ── Retiro rechazado ─────────────────────────────────────────────────────────
function emailRetiroRechazado({ nombre, email, amount }) {
  return sendEmail({
    to: email,
    subject: "❌ Retiro rechazado",
    html: baseTemplate(`
      <h2 style="color:#ef4444;margin-top:0">Retiro rechazado</h2>
      <p>Hola ${nombre || "usuario"}, lamentablemente tu solicitud de retiro de:</p>
      <p style="font-size:28px;font-weight:bold;color:#ef4444;margin:16px 0">$${Number(amount).toFixed(2)}</p>
      <p>no pudo ser procesada. El saldo ha sido devuelto a tu cuenta. Contáctanos si tienes dudas.</p>
      <a href="https://ecuapred.com/panel" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Ver mi cuenta
      </a>
    `),
  });
}

// ── Saldo acreditado ─────────────────────────────────────────────────────────
function emailSaldoAcreditado({ nombre, email, amount, newBalance }) {
  return sendEmail({
    to: email,
    subject: "💰 Saldo acreditado en tu cuenta",
    html: baseTemplate(`
      <h2 style="color:#10b981;margin-top:0">Saldo acreditado</h2>
      <p>Hola ${nombre || "usuario"}, se ha acreditado el siguiente monto a tu cuenta:</p>
      <p style="font-size:28px;font-weight:bold;color:#10b981;margin:16px 0">+$${Number(amount).toFixed(2)}</p>
      <p>Tu nuevo saldo disponible es: <strong>$${Number(newBalance).toFixed(2)}</strong></p>
      <a href="https://ecuapred.com/panel" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Ver mi cuenta
      </a>
    `),
  });
}

// ── Recarga por tarjeta exitosa ──────────────────────────────────────────────
function emailRecargaTarjeta({ nombre, email, amount, newBalance }) {
  return sendEmail({
    to: email,
    subject: "✅ Recarga exitosa con tarjeta",
    html: baseTemplate(`
      <h2 style="color:#10b981;margin-top:0">¡Recarga exitosa!</h2>
      <p>Hola ${nombre || "usuario"}, tu pago con tarjeta fue procesado correctamente.</p>
      <p style="font-size:28px;font-weight:bold;color:#10b981;margin:16px 0">+$${Number(amount).toFixed(2)}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="border-bottom:1px solid #1e293b">
          <td style="padding:10px 0;color:#94a3b8;font-size:13px">Método de pago</td>
          <td style="padding:10px 0;text-align:right;font-size:13px">Tarjeta de crédito / débito</td>
        </tr>
        <tr style="border-bottom:1px solid #1e293b">
          <td style="padding:10px 0;color:#94a3b8;font-size:13px">Monto acreditado</td>
          <td style="padding:10px 0;text-align:right;font-size:13px;color:#10b981;font-weight:bold">+$${Number(amount).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#94a3b8;font-size:13px">Nuevo saldo</td>
          <td style="padding:10px 0;text-align:right;font-size:13px;font-weight:bold">$${Number(newBalance).toFixed(2)}</td>
        </tr>
      </table>
      <a href="https://ecuapred.com/panel" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Ver mi cuenta
      </a>
    `),
  });
}

// ── Recarga por transferencia solicitada ─────────────────────────────────────
function emailRecargaTransferencia({ nombre, email, amount, transferCode }) {
  return sendEmail({
    to: email,
    subject: "📤 Solicitud de recarga enviada",
    html: baseTemplate(`
      <h2 style="color:#f59e0b;margin-top:0">Solicitud de recarga recibida</h2>
      <p>Hola ${nombre || "usuario"}, recibimos tu comprobante de transferencia bancaria.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="border-bottom:1px solid #1e293b">
          <td style="padding:10px 0;color:#94a3b8;font-size:13px">Monto solicitado</td>
          <td style="padding:10px 0;text-align:right;font-size:13px;color:#10b981;font-weight:bold">$${Number(amount).toFixed(2)}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e293b">
          <td style="padding:10px 0;color:#94a3b8;font-size:13px">Código de transferencia</td>
          <td style="padding:10px 0;text-align:right;font-size:13px;font-family:monospace">${transferCode || "—"}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#94a3b8;font-size:13px">Estado</td>
          <td style="padding:10px 0;text-align:right">
            <span style="background:#f59e0b22;color:#f59e0b;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:bold">Pendiente de revisión</span>
          </td>
        </tr>
      </table>
      <p style="color:#94a3b8;font-size:13px">Un administrador revisará tu transferencia en <strong style="color:#f1f5f9">menos de 24 horas</strong>. Recibirás otro correo cuando sea aprobada.</p>
      <a href="https://ecuapred.com/panel" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Ver mi cuenta
      </a>
    `),
  });
}

// ── Recarga por transferencia aprobada ──────────────────────────────────────
function emailRecargaAprobada({ nombre, email, amount, newBalance }) {
  return sendEmail({
    to: email,
    subject: "✅ Recarga aprobada",
    html: baseTemplate(`
      <h2 style="color:#10b981;margin-top:0">¡Tu recarga fue aprobada!</h2>
      <p>Hola ${nombre || "usuario"}, tu transferencia bancaria fue verificada y el saldo ya está disponible en tu cuenta.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="border-bottom:1px solid #1e293b">
          <td style="padding:10px 0;color:#94a3b8;font-size:13px">Método de pago</td>
          <td style="padding:10px 0;text-align:right;font-size:13px">Transferencia bancaria</td>
        </tr>
        <tr style="border-bottom:1px solid #1e293b">
          <td style="padding:10px 0;color:#94a3b8;font-size:13px">Monto acreditado</td>
          <td style="padding:10px 0;text-align:right;font-size:13px;color:#10b981;font-weight:bold">+$${Number(amount).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#94a3b8;font-size:13px">Nuevo saldo</td>
          <td style="padding:10px 0;text-align:right;font-size:13px;font-weight:bold">$${Number(newBalance).toFixed(2)}</td>
        </tr>
      </table>
      <a href="https://ecuapred.com" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Ir a predecir
      </a>
    `),
  });
}

// ── Recarga por transferencia rechazada ──────────────────────────────────────
function emailRecargaRechazada({ nombre, email, amount }) {
  return sendEmail({
    to: email,
    subject: "❌ Recarga rechazada",
    html: baseTemplate(`
      <h2 style="color:#ef4444;margin-top:0">Recarga rechazada</h2>
      <p>Hola ${nombre || "usuario"}, lamentablemente tu solicitud de recarga por:</p>
      <p style="font-size:28px;font-weight:bold;color:#ef4444;margin:16px 0">$${Number(amount).toFixed(2)}</p>
      <p>no pudo ser verificada. Las razones más comunes son:</p>
      <ul style="color:#94a3b8;font-size:13px;line-height:1.8">
        <li>El comprobante no corresponde al monto indicado</li>
        <li>La transferencia fue a una cuenta diferente</li>
        <li>El comprobante es ilegible o inválido</li>
      </ul>
      <p>Si crees que es un error, contáctanos.</p>
      <a href="https://ecuapred.com/contacto" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Contactar soporte
      </a>
    `),
  });
}

// ── Cuenta suspendida ────────────────────────────────────────────────────────
function emailCuentaSuspendida({ nombre, email }) {
  return sendEmail({
    to: email,
    subject: "⚠️ Tu cuenta ha sido suspendida",
    html: baseTemplate(`
      <h2 style="color:#f59e0b;margin-top:0">Cuenta suspendida</h2>
      <p>Hola ${nombre || "usuario"}, tu cuenta en EcuaPred ha sido <strong>suspendida temporalmente</strong>.</p>
      <p style="color:#94a3b8;font-size:13px">Durante este periodo no podrás acceder a la plataforma. Si crees que esto es un error o deseas más información, contáctanos.</p>
      <a href="https://ecuapred.com/contacto" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Contactar soporte
      </a>
    `),
  });
}

// ── Cuenta reactivada ────────────────────────────────────────────────────────
function emailCuentaActivada({ nombre, email }) {
  return sendEmail({
    to: email,
    subject: "✅ Tu cuenta ha sido reactivada",
    html: baseTemplate(`
      <h2 style="color:#10b981;margin-top:0">¡Cuenta reactivada!</h2>
      <p>Hola ${nombre || "usuario"}, tu cuenta en EcuaPred ha sido <strong>reactivada</strong>. Ya puedes volver a acceder a la plataforma.</p>
      <a href="https://ecuapred.com/login" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Iniciar sesión
      </a>
    `),
  });
}

// ── Contacto recibido ────────────────────────────────────────────────────────
function emailContactoRecibido({ nombre, email, asunto }) {
  return sendEmail({
    to: email,
    subject: "📩 Recibimos tu mensaje — EcuaPred",
    html: baseTemplate(`
      <h2 style="color:#10b981;margin-top:0">¡Mensaje recibido!</h2>
      <p>Hola ${nombre || "usuario"}, recibimos tu mensaje con el asunto:</p>
      <div style="background:#1e293b;border-left:4px solid #10b981;padding:14px 18px;border-radius:8px;margin:16px 0">
        <p style="margin:0;font-size:14px;font-style:italic">"${asunto || "Sin asunto"}"</p>
      </div>
      <p style="color:#94a3b8;font-size:13px">Nuestro equipo revisará tu solicitud y te responderá a este correo en un plazo de <strong style="color:#f1f5f9">24-48 horas</strong>.</p>
      <p style="color:#64748b;font-size:12px;margin-top:24px">Si no enviaste este mensaje, puedes ignorar este correo.</p>
    `),
  });
}

// ── Predicción perdida ───────────────────────────────────────────────────────
function emailMercadoPerdido({ nombre, email, question, amount }) {
  return sendEmail({
    to: email,
    subject: "📉 Perdiste una predicción",
    html: baseTemplate(`
      <h2 style="color:#ef4444;margin-top:0">Tu predicción no fue correcta</h2>
      <p>Hola ${nombre || "usuario"}, el mercado fue resuelto y tu predicción no coincidió con el resultado:</p>
      <div style="background:#1e293b;border-left:4px solid #ef4444;padding:16px;border-radius:8px;margin:16px 0">
        <p style="margin:0;font-size:15px">${question}</p>
      </div>
      <p>Monto invertido: <span style="font-size:20px;font-weight:bold;color:#ef4444">-$${Number(amount).toFixed(2)}</span></p>
      <p style="color:#94a3b8;font-size:13px">¡No te rindas! Hay muchos mercados activos esperando tus predicciones.</p>
      <a href="https://ecuapred.com" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Ver mercados activos
      </a>
    `),
  });
}

// ── Cambio de rol ────────────────────────────────────────────────────────────
function emailCambioRol({ nombre, email, role }) {
  const isAdmin = role === "admin";
  return sendEmail({
    to: email,
    subject: isAdmin ? "👑 Ahora eres administrador en EcuaPred" : "🔄 Tu rol fue actualizado en EcuaPred",
    html: baseTemplate(`
      <h2 style="color:${isAdmin ? "#f59e0b" : "#10b981"};margin-top:0">
        ${isAdmin ? "¡Eres administrador!" : "Tu rol fue actualizado"}
      </h2>
      <p>Hola ${nombre || "usuario"}, tu rol en EcuaPred ha sido cambiado a:</p>
      <p style="font-size:22px;font-weight:bold;color:${isAdmin ? "#f59e0b" : "#10b981"};margin:16px 0">
        ${isAdmin ? "👑 Administrador" : "👤 Usuario"}
      </p>
      ${isAdmin
        ? `<p style="color:#94a3b8;font-size:13px">Ahora tienes acceso al panel de administración en <a href="https://ecuapred.com/admin" style="color:#10b981">ecuapred.com/admin</a>.</p>`
        : `<p style="color:#94a3b8;font-size:13px">Tus permisos de administrador han sido revocados. Si crees que esto es un error, contáctanos.</p>`
      }
      <a href="https://ecuapred.com" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Ir a EcuaPred
      </a>
    `),
  });
}

// ── Confirmación de predicción ───────────────────────────────────────────────
function emailConfirmacionApuesta({ nombre, email, question, amount, type }) {
  const isYes = type === "yes";
  return sendEmail({
    to: email,
    subject: "🎯 Predicción registrada",
    html: baseTemplate(`
      <h2 style="color:#10b981;margin-top:0">¡Predicción registrada!</h2>
      <p>Hola ${nombre || "usuario"}, tu predicción fue registrada exitosamente:</p>
      <div style="background:#1e293b;border-left:4px solid ${isYes ? "#10b981" : "#ef4444"};padding:16px;border-radius:8px;margin:16px 0">
        <p style="margin:0 0 8px;font-size:15px">${question}</p>
        <p style="margin:0;font-size:13px;color:#94a3b8">Tu predicción: <strong style="color:${isYes ? "#10b981" : "#ef4444"}">${isYes ? "✅ Sí" : "❌ No"}</strong></p>
      </div>
      <p>Monto invertido: <span style="font-size:20px;font-weight:bold;color:#10b981">$${Number(amount).toFixed(2)}</span></p>
      <p style="color:#94a3b8;font-size:13px">Recibirás un correo cuando el mercado sea resuelto.</p>
      <a href="https://ecuapred.com" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Ver mis predicciones
      </a>
    `),
  });
}

// ── Mercado ganado ───────────────────────────────────────────────────────────
function emailMercadoGanado({ nombre, email, question, reward }) {
  return sendEmail({
    to: email,
    subject: "🏆 ¡Ganaste una predicción!",
    html: baseTemplate(`
      <h2 style="color:#10b981;margin-top:0">¡Felicitaciones, ganaste!</h2>
      <p>Hola ${nombre || "usuario"}, tu predicción fue correcta:</p>
      <div style="background:#1e293b;border-left:4px solid #10b981;padding:16px;border-radius:8px;margin:16px 0">
        <p style="margin:0;font-size:15px">${question}</p>
      </div>
      <p>Premio acreditado: <span style="font-size:22px;font-weight:bold;color:#10b981">+$${Number(reward).toFixed(2)}</span></p>
      <a href="https://ecuapred.com" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Seguir prediciendo
      </a>
    `),
  });
}

// ── Verificación de registro ─────────────────────────────────────────────────
function emailVerificacionRegistro({ nombre, email, code, magicToken }) {
  const magicLink = `https://api.ecuapred.com/verify-email?token=${magicToken}`;
  return sendEmail({
    to: email,
    subject: "Verifica tu cuenta de EcuaPred",
    html: baseTemplate(`
      <h2 style="color:#10b981;margin-top:0">¡Hola, ${nombre || "usuario"}!</h2>
      <p>Para completar tu registro en EcuaPred confirma que este correo te pertenece.</p>

      <p style="margin-top:24px;margin-bottom:8px;font-size:13px;color:#94a3b8">Tu código de verificación:</p>
      <div style="letter-spacing:10px;font-size:36px;font-weight:900;color:#10b981;background:#0f2820;border-radius:12px;padding:20px 24px;text-align:center;margin-bottom:8px">
        ${code}
      </div>
      <p style="font-size:12px;color:#64748b;text-align:center;margin-top:4px">Válido por 15 minutos · Ingrésalo en la página de registro</p>

      <div style="margin:28px 0;border-top:1px solid #1e293b"></div>

      <p style="font-size:13px;color:#94a3b8">O si prefieres, haz clic en el botón para verificar automáticamente y acceder directamente:</p>
      <a href="${magicLink}" style="display:inline-block;margin-top:12px;padding:13px 28px;background:#10b981;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:15px">
        ✅ Verificar y entrar a EcuaPred
      </a>
      <p style="font-size:11px;color:#475569;margin-top:16px">Si no creaste una cuenta, ignora este correo.</p>
    `),
  });
}

// ── Alerta crítica al admin ──────────────────────────────────────────────────
function emailAdminAlerta({ titulo, detalle, items = [] }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return Promise.resolve(false);
  return sendEmail({
    to: adminEmail,
    subject: `🚨 Alerta EcuaPred: ${titulo}`,
    html: baseTemplate(`
      <h2 style="color:#ef4444;margin-top:0">🚨 ${titulo}</h2>
      <p style="color:#94a3b8;font-size:13px">${detalle}</p>
      ${items.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          ${items.map(item => `
            <tr style="border-bottom:1px solid #1e293b">
              <td style="padding:8px 0;color:#94a3b8;font-size:13px">${item.label}</td>
              <td style="padding:8px 0;text-align:right;font-size:13px;color:#f1f5f9">${item.value}</td>
            </tr>
          `).join("")}
        </table>
      ` : ""}
      <a href="https://ecuapred.com/admin" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        Ir al panel admin
      </a>
      <p style="font-size:11px;color:#475569;margin-top:20px;border-top:1px solid #1e293b;padding-top:16px">
        Este correo fue generado automáticamente por EcuaPred.
      </p>
    `),
  });
}

// ── Recuperar contraseña ─────────────────────────────────────────────────────
function emailRecuperarContrasena({ nombre, email, resetUrl }) {
  return sendEmail({
    to: email,
    subject: "Recupera tu contraseña — EcuaPred",
    html: baseTemplate(`
      <h2 style="color:#10b981;margin-top:0">Recuperar contraseña</h2>
      <p>Hola <strong>${nombre || "usuario"}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p>Haz clic en el botón para crear una nueva contraseña. El enlace es válido por <strong>15 minutos</strong>.</p>
      <a href="${resetUrl}"
        style="display:inline-block;margin:20px 0;padding:13px 28px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px">
        Restablecer contraseña
      </a>
      <p style="font-size:12px;color:#94a3b8;margin-top:8px">
        O copia este enlace en tu navegador:<br/>
        <span style="color:#64748b;word-break:break-all">${resetUrl}</span>
      </p>
      <p style="font-size:11px;color:#475569;margin-top:20px;border-top:1px solid #1e293b;padding-top:16px">
        Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.
      </p>
    `),
  });
}

module.exports = {
  emailBienvenida,
  emailVerificacionRegistro,
  emailRetiroSolicitado,
  emailRetiroAprobado,
  emailRetiroRechazado,
  emailSaldoAcreditado,
  emailMercadoGanado,
  emailRecargaTarjeta,
  emailRecargaTransferencia,
  emailRecargaAprobada,
  emailRecargaRechazada,
  emailCuentaSuspendida,
  emailCuentaActivada,
  emailContactoRecibido,
  emailMercadoPerdido,
  emailCambioRol,
  emailConfirmacionApuesta,
  emailRecuperarContrasena,
  emailAdminAlerta,
};
