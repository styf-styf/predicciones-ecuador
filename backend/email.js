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

module.exports = {
  emailBienvenida,
  emailRetiroSolicitado,
  emailRetiroAprobado,
  emailRetiroRechazado,
  emailSaldoAcreditado,
  emailMercadoGanado,
  emailRecargaTarjeta,
  emailRecargaTransferencia,
};
