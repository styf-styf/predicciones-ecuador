require("dotenv").config();
const Sentry = require("@sentry/node");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const supabase = require("./supabase");
const { OAuth2Client } = require("google-auth-library");
const scheduler = require("./scheduler");
const crypto = require("crypto");
const {
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
} = require("./email");

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Sentry — inicializar antes de cualquier middleware
// Obtén tu DSN en: https://sentry.io → Projects → tu proyecto → Settings → DSN
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",
    tracesSampleRate: 0.2, // 20% de requests trackeados
  });
}

const app = express();
if (process.env.SENTRY_DSN) app.use(Sentry.Handlers.requestHandler());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = ["https://predicciones-ecuador.vercel.app", "https://ecuapred.com", "https://www.ecuapred.com", "http://localhost:3000"];
    if (!origin || allowed.includes(origin) || origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://")) {
      callback(null, true);
    } else {
      callback(new Error("CORS: origen no permitido"));
    }
  },
}));
app.use(express.json());

// ── Rate limiters ────────────────────────────────────────────────────────────
// En memoria: para endpoints de baja criticidad (rápido, sin latencia de BD)
function makeRateLimiter(maxAttempts, windowMs, message) {
  const store = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [ip, times] of store) {
      if (times.every(t => now - t >= windowMs)) store.delete(ip);
    }
  }, windowMs).unref();
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();
    const recent = (store.get(ip) || []).filter(t => now - t < windowMs);
    if (recent.length >= maxAttempts) return res.status(429).json({ message });
    recent.push(now);
    store.set(ip, recent);
    next();
  };
}

// Persistente en Supabase: para endpoints críticos (login, register, forgot-password)
// Sobrevive reinicios del servidor. Requiere tabla `rate_limits` (ver migrations/rate_limits.sql)
function makeDbRateLimiter(action, maxAttempts, windowMs, message) {
  // Fallback en memoria por si la BD falla
  const fallback = makeRateLimiter(maxAttempts, windowMs, message);

  return async (req, res, next) => {
    const ip  = (req.ip || req.socket.remoteAddress || "unknown").slice(0, 64);
    const key = `${ip}:${action}`;
    const since = new Date(Date.now() - windowMs).toISOString();

    try {
      // Contar intentos recientes
      const { count, error: countErr } = await supabase
        .from("rate_limits")
        .select("id", { count: "exact", head: true })
        .eq("key", key)
        .gte("hit_at", since);

      if (countErr) throw countErr;

      if (count >= maxAttempts) return res.status(429).json({ message });

      // Registrar este intento
      await supabase.from("rate_limits").insert({ key });

      // Limpiar registros viejos de esta key en background
      supabase.from("rate_limits").delete().eq("key", key).lt("hit_at", since).then(() => {});

      next();
    } catch {
      // Si Supabase falla, usa el fallback en memoria
      return fallback(req, res, next);
    }
  };
}

const loginRateLimit      = makeDbRateLimiter("login",    10, 15 * 60 * 1000, "Demasiados intentos. Espera 15 minutos.");
const registerRateLimit   = makeDbRateLimiter("register",  5, 60 * 60 * 1000, "Demasiados registros desde esta IP. Espera 1 hora.");
const betRateLimit        = makeRateLimiter(60,      60 * 1000, "Demasiadas predicciones seguidas. Espera un momento.");
const withdrawalRateLimit = makeRateLimiter(5, 60 * 60 * 1000, "Demasiadas solicitudes de retiro. Espera 1 hora.");
const transferRateLimit   = makeRateLimiter(10, 60 * 60 * 1000, "Demasiadas transferencias. Espera 1 hora.");
const contactoRateLimit   = makeRateLimiter(5,  60 * 60 * 1000, "Demasiados mensajes enviados. Espera 1 hora.");
const commentRateLimit    = makeRateLimiter(10,      60 * 1000, "Estás comentando demasiado rápido. Espera un momento.");

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("JWT_SECRET no está definido en .env");

// =======================
// 📡 SSE
// =======================
const sseClients = new Set();
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(payload); } catch { sseClients.delete(client); }
  }
}

// =======================
// 🔐 Middleware auth
// =======================
const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });
  try {
    const decoded = jwt.verify(token, SECRET);
    const { data: u } = await supabase
      .from("users").select("suspended").eq("id", decoded.id).single();
    if (u?.suspended) return res.status(403).json({ message: "Tu cuenta está suspendida. Contacta al soporte." });
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
};

// =======================
// 👤 REGISTRO
// =======================
// =======================
// 📧 VERIFICACIÓN DE REGISTRO
// =======================

// Store en memoria: email → { code, magicToken, hashedPassword, datos, expiresAt }
const pendingRegistrations = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingRegistrations) {
    if (now > val.expiresAt) pendingRegistrations.delete(key);
  }
}, 10 * 60 * 1000).unref();

// Paso 1: enviar código al correo
app.post("/register/send-code", registerRateLimit, async (req, res) => {
  const { email, password, nombre, apellido, cedula, celular, ciudad, pais } = req.body;

  if (!email?.trim() || !password?.trim())
    return res.status(400).json({ message: "Email y contraseña son obligatorios" });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim()))
    return res.status(400).json({ message: "Formato de email inválido" });
  if (password.length < 8)
    return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });

  const { data: existing } = await supabase.from("users").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
  if (existing) return res.status(400).json({ message: "El usuario ya existe" });

  const code       = String(Math.floor(100000 + Math.random() * 900000));
  const magicToken = crypto.randomBytes(32).toString("hex");
  const hashedPassword = await bcrypt.hash(password, 10);

  pendingRegistrations.set(email.trim().toLowerCase(), {
    code, magicToken, hashedPassword,
    nombre, apellido, cedula, celular, ciudad, pais: pais || "Ecuador",
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  emailVerificacionRegistro({ nombre, email: email.trim(), code, magicToken });
  res.json({ ok: true });
});

// Paso 2: confirmar con código
app.post("/register/confirm", async (req, res) => {
  const { email, code } = req.body;
  const key = email?.trim().toLowerCase();
  const pending = pendingRegistrations.get(key);

  if (!pending)           return res.status(400).json({ message: "No hay registro pendiente para este correo" });
  if (Date.now() > pending.expiresAt) {
    pendingRegistrations.delete(key);
    return res.status(400).json({ message: "El código expiró. Vuelve a registrarte" });
  }
  if (pending.code !== String(code).trim())
    return res.status(400).json({ message: "Código incorrecto" });

  const { data: cfg } = await supabase.from("config").select("welcome_points, welcome_points_limit").eq("id", 1).single();
  const welcomePoints = cfg?.welcome_points ?? 0;
  const welcomeLimit = cfg?.welcome_points_limit ?? null;

  let pointsToGive = 0;
  if (welcomeLimit && welcomeLimit > 0) {
    const { count } = await supabase.from("users").select("id", { count: "exact", head: true });
    if ((count ?? 0) < welcomeLimit) pointsToGive = welcomePoints;
  }

  const { error } = await supabase.from("users").insert([{
    email: key, password: pending.hashedPassword,
    nombre: pending.nombre, apellido: pending.apellido,
    cedula: pending.cedula, celular: pending.celular,
    ciudad: pending.ciudad, pais: pending.pais,
    role: "user", points: pointsToGive, avatar: "", provider: "local",
  }]);
  if (error) return res.status(400).json({ message: error.message });

  pendingRegistrations.delete(key);
  emailBienvenida({ nombre: pending.nombre, email: key });
  broadcast("users", {});

  const { data: newUser } = await supabase.from("users").select("*").eq("email", key).single();
  const token = jwt.sign({ id: newUser.id, role: newUser.role }, SECRET, { expiresIn: "30d" });
  res.json({ message: "Cuenta creada correctamente", token, user: newUser });
});

// Store de códigos de un solo uso (válidos 2 minutos)
const magicCodes = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of magicCodes) {
    if (now > v.expiresAt) magicCodes.delete(k);
  }
}, 2 * 60 * 1000).unref();

// Enlace mágico: el backend verifica, crea la cuenta y emite un código de un solo uso
app.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  let foundKey  = null;
  let foundData = null;

  for (const [k, v] of pendingRegistrations) {
    if (v.magicToken === token && Date.now() < v.expiresAt) {
      foundKey = k; foundData = v; break;
    }
  }

  if (!foundKey) return res.redirect("https://ecuapred.com/verify-email?error=token_invalido");

  // Si la cuenta ya existe (doble click), emitir igual un código
  const { data: existing } = await supabase.from("users").select("*").eq("email", foundKey).maybeSingle();
  let finalUser = existing;

  if (!existing) {
    const { data: cfgMagic } = await supabase.from("config").select("welcome_points, welcome_points_limit").eq("id", 1).single();
    const welcomePointsMagic = cfgMagic?.welcome_points ?? 0;
    const welcomeLimitMagic = cfgMagic?.welcome_points_limit ?? null;

    let pointsToGiveMagic = 0;
    if (welcomeLimitMagic && welcomeLimitMagic > 0) {
      const { count } = await supabase.from("users").select("id", { count: "exact", head: true });
      if ((count ?? 0) < welcomeLimitMagic) pointsToGiveMagic = welcomePointsMagic;
    }

    const { error } = await supabase.from("users").insert([{
      email: foundKey, password: foundData.hashedPassword,
      nombre: foundData.nombre, apellido: foundData.apellido,
      cedula: foundData.cedula, celular: foundData.celular,
      ciudad: foundData.ciudad, pais: foundData.pais,
      role: "user", points: pointsToGiveMagic, avatar: "", provider: "local",
    }]);
    if (error) return res.redirect("https://ecuapred.com/verify-email?error=error_servidor");
    const { data: newUser } = await supabase.from("users").select("*").eq("email", foundKey).single();
    finalUser = newUser;
    emailBienvenida({ nombre: foundData.nombre, email: foundKey });
    broadcast("users", {});
  }

  pendingRegistrations.delete(foundKey);

  // Generar código de un solo uso (válido 2 minutos) — el JWT nunca va en la URL
  const onetimeCode = crypto.randomBytes(24).toString("hex");
  magicCodes.set(onetimeCode, {
    userId: finalUser.id,
    role:   finalUser.role,
    expiresAt: Date.now() + 2 * 60 * 1000,
  });

  res.redirect(`https://ecuapred.com/verify-email?code=${onetimeCode}`);
});

// Intercambio del código de un solo uso por JWT
app.post("/auth/exchange", (req, res) => {
  const { code } = req.body;
  const entry = magicCodes.get(code);

  if (!entry || Date.now() > entry.expiresAt) {
    magicCodes.delete(code);
    return res.status(400).json({ message: "Código inválido o expirado" });
  }

  magicCodes.delete(code); // Un solo uso
  const token = jwt.sign({ id: entry.userId, role: entry.role }, SECRET, { expiresIn: "30d" });
  res.json({ token });
});

// =======================
// 📝 REGISTRO (legacy — mantenido para compatibilidad)
// =======================
app.post("/register", registerRateLimit, async (req, res) => {
  const { email, password, nombre, apellido, cedula, celular, ciudad, direccion, pais } = req.body;

  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({ message: "Email y contraseña son obligatorios" });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ message: "Formato de email inválido" });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
  }

  const { data: existing, error: checkError } = await supabase
    .from("users").select("id").eq("email", email).maybeSingle();

  if (checkError) return res.status(500).json({ message: checkError.message });
  if (existing) return res.status(400).json({ message: "El usuario ya existe" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const { error } = await supabase.from("users").insert([{
    email, password: hashedPassword, nombre, apellido, cedula, celular,
    ciudad, direccion, pais: pais || "Ecuador", role: "user",
    points: 0, avatar: "", provider: "local",
  }]);

  if (error) return res.status(400).json({ message: error.message });

  emailBienvenida({ nombre, email });
  broadcast("users", {});
  res.json({ message: "Usuario registrado correctamente" });
});

// =======================
// 🔑 LOGIN
// =======================
app.post("/login", loginRateLimit, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña obligatorios" });
  }

  const { data, error } = await supabase
    .from("users").select("*").eq("email", email).single();

  if (error || !data) return res.status(400).json({ message: "Usuario no encontrado" });

  if (data.provider === "google") {
    return res.status(400).json({ message: "Estas registrado con una cuenta de Google" });
  }

  const validPassword = await bcrypt.compare(password, data.password);
  if (!validPassword) return res.status(400).json({ message: "Contraseña incorrecta" });

  const token = jwt.sign(
    { id: data.id, role: data.role },
    SECRET, { expiresIn: "7d" }
  );

  return res.json({
    token,
    user: { id: data.id, email: data.email, role: data.role, points: data.points },
  });
});

// =======================
// 🔑 RECUPERAR CONTRASEÑA
// =======================
const resetTokens = new Map(); // token → { email, expiresAt }
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of resetTokens) if (v.expiresAt < now) resetTokens.delete(k);
}, 5 * 60 * 1000).unref();

const forgotRateLimit = makeDbRateLimiter("forgot", 3, 60 * 60 * 1000, "Demasiadas solicitudes. Espera 1 hora.");

app.post("/auth/forgot-password", forgotRateLimit, async (req, res) => {
  const { email } = req.body;
  // Siempre devuelve el mismo mensaje para no revelar si el email existe
  const ok = () => res.json({ message: "Si ese correo está registrado, recibirás un enlace en breve." });

  if (!email?.trim()) return ok();

  const { data: user } = await supabase
    .from("users")
    .select("id, email, nombre, provider")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (!user || user.provider === "google") return ok(); // Google no tiene contraseña local

  const token = crypto.randomBytes(32).toString("hex");
  resetTokens.set(token, { email: user.email, expiresAt: Date.now() + 15 * 60 * 1000 });

  const resetUrl = `https://ecuapred.com/reset-password?token=${token}`;
  await emailRecuperarContrasena({ nombre: user.nombre, email: user.email, resetUrl });

  return ok();
});

app.post("/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword)
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  if (typeof newPassword !== "string" || newPassword.length < 8)
    return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });

  const entry = resetTokens.get(token);
  if (!entry || Date.now() > entry.expiresAt) {
    resetTokens.delete(token);
    return res.status(400).json({ message: "El enlace es inválido o ya expiró. Solicita uno nuevo." });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase.from("users").update({ password: hashed }).eq("email", entry.email);
  if (error) return res.status(500).json({ message: error.message });

  resetTokens.delete(token); // Un solo uso
  res.json({ message: "Contraseña actualizada correctamente." });
});

// =======================
// 🔵 LOGIN CON GOOGLE
// =======================
const ALLOWED_GOOGLE_REDIRECT_URIS = [
  "postmessage",
  "https://ecuapred.com/login",
  "https://ecuapred.com/register",
  "https://www.ecuapred.com/login",
  "https://www.ecuapred.com/register",
  "http://localhost:3000/login",
  "http://localhost:3000/register",
  "http://localhost:3001/login",
  "http://localhost:3001/register",
];

app.post("/auth/google", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: "Código de Google requerido" });

  const redirectUri = req.body.redirect_uri || "postmessage";
  console.log("[auth/google] redirect_uri recibido:", redirectUri);
  if (!ALLOWED_GOOGLE_REDIRECT_URIS.includes(redirectUri)) {
    console.warn("[auth/google] redirect_uri NO permitido:", redirectUri);
    return res.status(400).json({ message: "redirect_uri no permitido", received: redirectUri });
  }

  try {
    const { tokens } = await googleClient.getToken({ code, redirect_uri: redirectUri });

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, picture } = payload;

    const { data: existing } = await supabase
      .from("users").select("*").eq("email", email).maybeSingle();

    let user = existing;

    if (!user) {
      // ✅ Obtener puntos de bienvenida desde config
      const { data: config } = await supabase
        .from("config").select("welcome_points, welcome_points_limit").eq("id", 1).single();

      const welcomePoints = config?.welcome_points ?? 0;
      const welcomeLimit = config?.welcome_points_limit ?? null;

      let pointsToGive = 0;
      if (welcomeLimit && welcomeLimit > 0) {
        const { count } = await supabase.from("users").select("id", { count: "exact", head: true });
        if ((count ?? 0) < welcomeLimit) pointsToGive = welcomePoints;
      }

      const { data: newUser, error } = await supabase
        .from("users")
        .insert([{
          email,
          nombre: given_name || "",
          apellido: family_name || "",
          avatar: picture || "",
          provider: "google",
          password: "",
          role: "user",
          points: pointsToGive,
          pais: "Ecuador",
        }])
        .select()
        .single();

      if (error) return res.status(500).json({ message: error.message });
      user = newUser;
      emailBienvenida({ nombre: given_name, email });
    }

    if (user.provider === "local") {
      return res.status(400).json({ message: "Este correo ya está registrado con email y contraseña" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      SECRET, { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, points: user.points },
    });
  } catch (err) {
    console.error("Error Google Auth:", err);
    res.status(500).json({ message: "Error autenticando con Google" });
  }
});

app.get("/config", async (req, res) => {
  const { data, error } = await supabase
    .from("config").select("min_bet, max_bet, commission, max_changes, banco_nombre, banco_tipo, banco_cuenta, banco_titular, banco_cedula").eq("id", 1).single();
  if (error) return res.status(500).json({ message: error.message });

  const token = req.headers.authorization?.split(" ")[1];
  let isAuth = false;
  try { if (token) { jwt.verify(token, SECRET); isAuth = true; } } catch {}

  if (isAuth) return res.json(data);

  const { min_bet, max_bet, commission, max_changes } = data;
  res.json({ min_bet, max_bet, commission, max_changes });
});

// =======================
// 📊 OBTENER MERCADOS
// =======================


app.get("/me", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("users").select("id,email,points,role,created_at,nombre,apellido,cedula,celular,pais,ciudad,direccion,banco,numero_cuenta,tipo_cuenta,provincia,provider,suspended")
    .eq("id", req.userId).single();

  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

app.put("/me/profile", auth, async (req, res) => {
  const { nombre, apellido, cedula, celular, ciudad, direccion, banco, numero_cuenta, tipo_cuenta, provincia } = req.body;

  const isStr = (v, max) => v === undefined || v === null || (typeof v === "string" && v.trim().length <= max);
  // Permite vacío ("") además de null/undefined; convierte a null después
  const isDigits = (v, max) => v === undefined || v === null || v === "" || (typeof v === "string" && /^\d+$/.test(v.trim()) && v.trim().length <= max);
  const tiposCuenta = ["ahorros", "corriente"];

  if (
    !isStr(nombre, 50) || !isStr(apellido, 50) ||
    !isStr(ciudad, 100) || !isStr(direccion, 200) ||
    !isStr(banco, 100) || !isStr(provincia, 100) ||
    !isDigits(cedula, 10) || !isDigits(celular, 15) ||
    !isDigits(numero_cuenta, 20) ||
    (tipo_cuenta !== undefined && tipo_cuenta !== null && tipo_cuenta !== "" && !tiposCuenta.includes(tipo_cuenta))
  ) {
    return res.status(400).json({ message: "Datos inválidos" });
  }

  const trim = (v) => (typeof v === "string" ? v.trim() : v);
  // Convierte string vacío a null para campos opcionales numéricos
  const toNull = (v) => (typeof v === "string" && v.trim() === "" ? null : trim(v));

  const { error } = await supabase
    .from("users")
    .update({
      nombre: trim(nombre), apellido: trim(apellido),
      cedula: toNull(cedula), celular: toNull(celular),
      ciudad: trim(ciudad), direccion: trim(direccion),
      banco: trim(banco), numero_cuenta: toNull(numero_cuenta),
      tipo_cuenta: tipo_cuenta || null, provincia: trim(provincia),
      pais: "Ecuador",
    })
    .eq("id", req.userId);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Perfil actualizado" });
});

app.put("/me/password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  if (typeof newPassword !== "string" || newPassword.length < 8)
    return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });

  const { data: userData, error } = await supabase
    .from("users").select("id,password,provider").eq("id", req.userId).single();

  if (error || !userData)
    return res.status(400).json({ message: "Usuario no encontrado" });
  if (userData.provider === "google" || !userData.password)
    return res.status(400).json({ message: "Las cuentas de Google no pueden cambiar contraseña" });

  const valid = await bcrypt.compare(currentPassword, userData.password);
  if (!valid)
    return res.status(400).json({ message: "Contraseña actual incorrecta" });

  const hashed = await bcrypt.hash(newPassword, 10);
  const { error: updateError } = await supabase
    .from("users").update({ password: hashed }).eq("id", req.userId);

  if (updateError)
    return res.status(500).json({ message: updateError.message });

  res.json({ message: "Contraseña actualizada correctamente" });
});

app.get("/my-bets", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("bets")
    .select(`id, type, amount, payout, commission_paid, created_at, markets ( id, question, resolved, winner )`)
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

app.get("/ranking", async (req, res) => {
  const { data, error } = await supabase
    .from("users").select("id,points,nombre,apellido")
    .order("points", { ascending: false }).limit(100);

  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});



app.get("/markets", async (req, res) => {
  const isAdmin = req.headers.authorization
    ? (() => { try { const d = jwt.verify(req.headers.authorization.split(" ")[1], SECRET); return d.role === "admin"; } catch { return false; } })()
    : false;

  let query = supabase.from("markets").select("*, bets(count)").order("id", { ascending: false });
  if (!isAdmin) query = query.eq("archived", false);

  const { data, error } = await query;

  if (error) return res.status(500).json({ message: error.message });

  const markets = data.map((m) => ({
    ...m,
    betters_count: m.bets[0]?.count ?? 0,
  }));

  res.json(markets);
}); 


// =======================
// 🔍 BUSCAR MERCADOS
// =======================
app.get("/markets/search", async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === "") return res.json([]);

  // Detectar si es admin o user
  let isAdmin = false;
  const token = req.headers.authorization?.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET);
      const { data: user } = await supabase
        .from("users").select("role").eq("id", decoded.id).single();
      isAdmin = user?.role === "admin";
    } catch {
      isAdmin = false;
    }
  }

  // Si es admin ve todo, si es user solo mercados en vivo
  let query = supabase
    .from("markets")
    .select("*")
    .ilike("question", `%${q}%`)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("resolved", false);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// =======================
// 🏆 ADMIN - WINNERS
// =======================
app.get("/admin/winners", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token requerido" });

  try {
    const decoded = jwt.verify(token, SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ message: "Solo admin" });

    const { data, error } = await supabase
      .from("winners")
      .select(`id, prediction, reward, created_at, users ( email ), markets ( question )`)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: "Error cargando winners" });
    res.json(data);
  } catch (err) {
    res.status(401).json({ message: "Token inválido" });
  }
});

// =======================
// 📊 ESTADÍSTICAS ADMIN
// =======================
app.get("/admin/stats", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { count: totalUsers } = await supabase
    .from("users").select("*", { count: "exact", head: true });

  const { data: usersPoints } = await supabase.from("users").select("points");
  const totalPoints = usersPoints?.reduce((sum, u) => sum + Number(u.points), 0) ?? 0;

  const { data: allBets } = await supabase.from("bets").select("amount");
  const totalBetted = allBets?.reduce((sum, b) => sum + Number(b.amount), 0) ?? 0;

  const { count: activeMarkets } = await supabase
    .from("markets").select("*", { count: "exact", head: true }).eq("resolved", false);

  const { count: closedMarkets } = await supabase
    .from("markets").select("*", { count: "exact", head: true }).eq("resolved", true);

  // Medianoche hora Ecuador (UTC-5)
  const _now = new Date();
  const _offset = -5 * 60;
  const _localMin = _now.getTime() / 60000 + _offset;
  const today = new Date((Math.floor(_localMin / (24 * 60)) * (24 * 60) - _offset) * 60000);

  const { count: newUsersToday } = await supabase
    .from("users").select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString());

  const { count: betsToday } = await supabase
    .from("bets").select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString());

  res.json({
    totalUsers,
    totalPoints: totalPoints.toFixed(2),
    totalBetted: totalBetted.toFixed(2),
    activeMarkets,
    closedMarkets,
    newUsersToday,
    betsToday,
  });
});

// =======================
// 💰 FINANZAS ADMIN
// =======================
app.get("/admin/finance", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const [
    { data: recargas },
    { data: retiros },
    { data: bets },
    { data: users },
    { data: config },
    { data: winners },
    { count: totalApuestas },
    { count: totalRecargas },
    { count: totalRetiros },
  ] = await Promise.all([
    supabase.from("transactions").select("amount").eq("type", "recarga").eq("status", "aprobado"),
    supabase.from("transactions").select("amount").eq("type", "retiro").eq("status", "aprobado"),
    supabase.from("bets").select("amount"),
    supabase.from("users").select("points"),
    supabase.from("config").select("commission").eq("id", 1).single(),
    supabase.from("winners").select("reward"),
    supabase.from("bets").select("*", { count: "exact", head: true }),
    supabase.from("transactions").select("*", { count: "exact", head: true }).eq("type", "recarga").eq("status", "aprobado"),
    supabase.from("transactions").select("*", { count: "exact", head: true }).eq("type", "retiro").eq("status", "aprobado"),
  ]);

  const totalEntradas = recargas?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const totalSalidas = retiros?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const totalApuestado = bets?.reduce((s, b) => s + Number(b.amount), 0) ?? 0;
  const totalCirculacion = users?.reduce((s, u) => s + Number(u.points), 0) ?? 0;
  const commission = config?.commission ?? 0;
  const totalComisiones = (totalApuestado * commission) / 100;
  const totalPagado = winners?.reduce((s, w) => s + Number(w.reward), 0) ?? 0;

  res.json({
    totalEntradas: totalEntradas.toFixed(2),
    totalSalidas: totalSalidas.toFixed(2),
    totalApuestado: totalApuestado.toFixed(2),
    totalCirculacion: totalCirculacion.toFixed(2),
    totalComisiones: totalComisiones.toFixed(2),
    totalPagado: totalPagado.toFixed(2),
    totalApuestas,
    totalRecargas,
    totalRetiros,
    commissionRate: commission,
  });
});

// =======================
// 📈 GRÁFICAS ADMIN
// =======================
app.get("/admin/charts", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { data: bets } = await supabase
    .from("bets")
    .select("amount, created_at")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  const { data: users } = await supabase
    .from("users")
    .select("created_at")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  const groupByDay = (items, field = "created_at") => {
    const map = {};
    items?.forEach((item) => {
      const day = new Date(item[field] + "Z").toLocaleDateString("es-EC", {
        timeZone: "America/Guayaquil", month: "short", day: "numeric"
      });
      map[day] = (map[day] || 0) + 1;
    });
    return map;
  };

  const groupAmountByDay = (items) => {
    const map = {};
    items?.forEach((item) => {
      const day = new Date(item.created_at + "Z").toLocaleDateString("es-EC", {
        timeZone: "America/Guayaquil", month: "short", day: "numeric"
      });
      map[day] = (map[day] || 0) + Number(item.amount);
    });
    return map;
  };

  const betsPerDay = groupByDay(bets || []);
  const amountPerDay = groupAmountByDay(bets || []);
  const usersPerDay = groupByDay(users || []);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", month: "short", day: "numeric" });
  });

  const chartData = last7Days.map((day) => ({
    day,
    apuestas: betsPerDay[day] || 0,
    volumen: amountPerDay[day] || 0,
    usuarios: usersPerDay[day] || 0,
  }));

  res.json(chartData);
});
// =======================
// ⚙️ CONFIGURACIÓN
// =======================
app.get("/admin/settings", auth, async (req, res) => {
  const { data: admin, error: adminError } = await supabase
    .from("users").select("role").eq("id", req.userId).single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { data, error } = await supabase
    .from("config").select("*").eq("id", 1).single();

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.put("/admin/settings", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { min_bet, max_bet, min_withdrawal, max_withdrawal, max_changes, daily_withdrawal_limit, commission, welcome_points, welcome_points_limit, trending_count, winners_count, autoplay_ms, circulation_alert, pending_tx_alert, market_categories, banco_nombre, banco_tipo, banco_cuenta, banco_titular, banco_cedula } = req.body;

  if (min_bet < 0 || max_bet < 0) {
    return res.status(400).json({ message: "Los valores no pueden ser negativos" });
  }

  if (min_bet >= max_bet) {
    return res.status(400).json({ message: "El mínimo debe ser menor que el máximo" });
  }

  if (commission < 0 || commission > 100) {
    return res.status(400).json({ message: "La comisión debe ser entre 0 y 100" });
  }

  const { error } = await supabase
  .from("config")
  .update({
    min_bet,
    max_bet,
    min_bet,
    max_bet,
    min_withdrawal: min_withdrawal === "" || min_withdrawal === null ? 10 : Number(min_withdrawal),
    max_withdrawal: max_withdrawal === "" || max_withdrawal === null ? 1000 : Number(max_withdrawal),
    max_changes: max_changes === "" || max_changes === null ? 3 : Number(max_changes),
    daily_withdrawal_limit: daily_withdrawal_limit === "" || daily_withdrawal_limit === null ? null : Number(daily_withdrawal_limit),
    commission,
    welcome_points,
    welcome_points_limit: welcome_points_limit === "" || welcome_points_limit === null ? null : Number(welcome_points_limit),
    trending_count,
    winners_count,
    autoplay_ms,
    circulation_alert: circulation_alert === "" || circulation_alert === null ? null : Number(circulation_alert),
    pending_tx_alert: pending_tx_alert === "" || pending_tx_alert === null ? null : Number(pending_tx_alert),
    market_categories: market_categories || "deporte,farandula,politica,elecciones,pais,general",
    banco_nombre,
    banco_tipo,
    banco_cuenta,
    banco_titular,
    banco_cedula,
    updated_at: new Date().toISOString(),
  })
  .eq("id", 1);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Configuración actualizada" });
});

// =======================
// 👥 ADMIN - GESTIÓN USUARIOS
// =======================
app.get("/admin/users", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, email, nombre, apellido, points, role, provider, created_at, suspended")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.put("/admin/users/:id/role", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { role } = req.body;
  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ message: "Rol inválido" });
  }

  const { data: targetUser } = await supabase
    .from("users").select("nombre,email").eq("id", req.params.id).single();

  const { error } = await supabase
    .from("users").update({ role }).eq("id", req.params.id);

  if (error) return res.status(500).json({ message: error.message });

  if (targetUser?.email) {
    emailCambioRol({ nombre: targetUser.nombre, email: targetUser.email, role });
  }

  broadcast("users", {});
  res.json({ message: "Rol actualizado" });
});

app.put("/admin/users/:id/points", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { points } = req.body;
  if (isNaN(points)) return res.status(400).json({ message: "Valor inválido" });

  const { data: user } = await supabase
    .from("users").select("points,email,nombre").eq("id", req.params.id).single();

  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

  const newPoints = Number(user.points) + Number(points);
  if (newPoints < 0) {
    return res.status(400).json({ message: "El saldo no puede ser negativo" });
  }

  const { error } = await supabase
    .from("users").update({ points: newPoints }).eq("id", req.params.id);

  if (error) return res.status(500).json({ message: error.message });

  const amount = Number(points);
  const isCredit = amount >= 0;

  await supabase.from("transactions").insert([{
    user_id: req.params.id,
    type: isCredit ? "recarga" : "retiro",
    amount: Math.abs(amount),
    status: "completado",
    payment_method: "admin",
    balance_before: Number(user.points),
    balance_after: newPoints,
  }]);

  await supabase.from("notifications").insert([{
    user_id: req.params.id,
    title: isCredit ? "Saldo acreditado" : "Ajuste de saldo",
    message: isCredit
      ? `Solicitud de corrección de saldo aprobada. Se acreditaron $${amount.toFixed(2)} a tu cuenta. Nuevo saldo: $${newPoints.toFixed(2)}.`
      : `Solicitud de corrección de saldo aprobada. Se debitaron $${Math.abs(amount).toFixed(2)} de tu cuenta. Nuevo saldo: $${newPoints.toFixed(2)}.`,
    read: false,
  }]);

  if (isCredit) emailSaldoAcreditado({ nombre: user.nombre, email: user.email, amount, newBalance: newPoints });
  broadcast("users", {});
  broadcast("transactions", {});
  res.json({ message: "Saldo actualizado", newPoints });
});

app.put("/admin/users/:id/suspend", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { suspended } = req.body;

  const { data: targetUser } = await supabase
    .from("users").select("nombre,email").eq("id", req.params.id).single();

  const { error } = await supabase
    .from("users").update({ suspended }).eq("id", req.params.id);

  if (error) return res.status(500).json({ message: error.message });

  if (targetUser?.email) {
    if (suspended) emailCuentaSuspendida({ nombre: targetUser.nombre, email: targetUser.email });
    else emailCuentaActivada({ nombre: targetUser.nombre, email: targetUser.email });
  }

  broadcast("users", {});
  res.json({ message: suspended ? "Usuario suspendido" : "Usuario activado" });
});

// =======================
// 🔔 NOTIFICACIONES
// =======================
app.put("/notifications/read", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });

  try {
    const decoded = jwt.verify(token, SECRET);
    const { error } = await supabase
      .from("notifications").update({ read: true })
      .eq("user_id", decoded.id).eq("read", false);

    if (error) throw error;
    res.json({ message: "Notificaciones leídas" });
  } catch (err) {
    res.status(401).json({ message: "Token inválido" });
  }
});

app.get("/notifications", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("notifications").select("*")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

app.put("/notifications/:id/read", auth, async (req, res) => {
  const { error } = await supabase
    .from("notifications").update({ read: true })
    .eq("id", req.params.id).eq("user_id", req.userId);

  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Leída" });
});

// =======================
// 💰 APOSTAR
// =======================
app.post("/bet", auth, betRateLimit, async (req, res) => {
  const { marketId, type, amount } = req.body;
  if (type !== "yes" && type !== "no") {
    return res.status(400).json({ message: "Tipo de predicción inválido" });
  }
  const betAmount = parseFloat(amount);

  const { data: config } = await supabase
    .from("config").select("min_bet, max_bet, max_changes").eq("id", 1).single();

  const minBet = config?.min_bet ?? 1;
  const maxBet = config?.max_bet ?? 10;
  const maxChanges = config?.max_changes ?? 3;

  if (isNaN(betAmount) || betAmount < minBet || (maxBet > 0 && betAmount > maxBet)) {
    const maxMsg = maxBet > 0 ? ` y ${maxBet} $` : "";
    return res.status(400).json({
      message: `El monto mínimo es ${minBet} $${maxMsg}`
    });
  }

  const { data: user, error: userError } = await supabase
    .from("users").select("*").eq("id", req.userId).single();

  if (userError || !user) return res.status(404).json({ message: "Usuario no encontrado" });

  const { data: market, error: marketError } = await supabase
    .from("markets").select("*").eq("id", marketId).single();

  if (marketError || !market) return res.status(404).json({ message: "Mercado no encontrado" });
  if (market.resolved) return res.status(400).json({ message: "Este mercado ya está cerrado" });

  // ✅ Buscar si ya tiene una apuesta en este mercado
  const { data: existingBet } = await supabase
    .from("bets")
    .select("*")
    .eq("market_id", marketId)
    .eq("user_id", req.userId)
    .maybeSingle();

  // ✅ Validar máximo de cambios configurable
  if (existingBet) {
    const changes = existingBet.changes ?? 0;
    if (changes >= maxChanges) {
      return res.status(400).json({ message: `Alcanzaste el límite de ${maxChanges} cambios de predicción` });
    }
  }

  // ✅ Calcular diferencia de puntos a descontar
  // Si ya tenía apuesta, se le devuelve lo anterior y se cobra lo nuevo
  const previousAmount = existingBet ? Number(existingBet.amount) : 0;
  const pointsDiff = betAmount - previousAmount;

  if (user.points < pointsDiff) {
    return res.status(400).json({ message: "Saldo insuficiente" });
  }

  // ✅ Actualizar puntos de forma atómica — si el saldo cambió entre el read y el write, rechazar
  const newPoints = Number(user.points) - pointsDiff;
  const { data: updatedUser, error: balanceError } = await supabase
    .from("users")
    .update({ points: newPoints })
    .eq("id", user.id)
    .eq("points", user.points)  // Solo actualiza si el saldo no cambió desde que lo leímos
    .select("id");

  if (balanceError || !updatedUser || updatedUser.length === 0) {
    return res.status(409).json({ message: "Tu saldo fue modificado, intenta de nuevo." });
  }

  // ✅ Revertir apuesta anterior del mercado y aplicar la nueva
  let newYes = Number(market.yes);
  let newNo = Number(market.no);

  if (existingBet) {
    // Restar la apuesta anterior
    if (existingBet.type === "yes") newYes -= Number(existingBet.amount);
    if (existingBet.type === "no") newNo -= Number(existingBet.amount);
  }

  // Sumar la nueva
  if (type === "yes") newYes += betAmount;
  if (type === "no") newNo += betAmount;

  await supabase.from("markets").update({
    yes: Math.max(0, newYes),
    no: Math.max(0, newNo),
  }).eq("id", marketId);

  // ✅ Insertar o actualizar la apuesta (una sola fila por usuario por mercado)
  let betOpError = null;
  if (existingBet) {
    const { error } = await supabase.from("bets")
      .update({ type, amount: betAmount, changes: (existingBet.changes ?? 0) + 1 })
      .eq("id", existingBet.id);
    betOpError = error;
  } else {
    const { error } = await supabase.from("bets").insert([{
      user_id: user.id,
      market_id: marketId,
      type,
      amount: betAmount,
      changes: 0,
    }]);
    betOpError = error;
  }

  if (betOpError) {
    // Revertir puntos y pools del mercado
    await supabase.from("users").update({ points: user.points }).eq("id", user.id);
    await supabase.from("markets").update({ yes: market.yes, no: market.no }).eq("id", marketId);
    console.error("[bet] Error guardando apuesta:", betOpError.message);
    return res.status(500).json({ message: "Error al registrar predicción. Saldo revertido." });
  }

 const { data: updatedMarket } = await supabase
  .from("markets").select("*").eq("id", marketId).single();

// Guardar snapshot de historial
const total = Number(updatedMarket.yes) + Number(updatedMarket.no) || 1;
await supabase.from("market_history").insert([{
  market_id: marketId,
  yes_pct: ((Number(updatedMarket.yes) / total) * 100).toFixed(1),
  no_pct: ((Number(updatedMarket.no) / total) * 100).toFixed(1),
  total: total,
}]);

broadcast("bets", { market_id: marketId });
broadcast("market_history", { market_id: marketId });

// Solo enviar email de confirmación en la primera apuesta (no en cambios)
if (!existingBet && user.email) {
  emailConfirmacionApuesta({ nombre: user.nombre, email: user.email, question: market.question, amount: betAmount, type });
}

res.json({ message: "Predicción realizada", points: newPoints, market: updatedMarket });
});
// =======================
// 💰 RESOLVER MERCADO
// =======================
app.post("/admin/resolve/:id", auth, async (req, res) => {
  const { winner } = req.body;
  if (winner !== "yes" && winner !== "no") {
    return res.status(400).json({ message: "Ganador inválido, debe ser 'yes' o 'no'" });
  }
  const marketId = Number(req.params.id);
  if (!Number.isFinite(marketId) || marketId <= 0) {
    return res.status(400).json({ message: "ID de mercado inválido" });
  }

  // ✅ Obtener comisión desde config
  const { data: config } = await supabase
    .from("config").select("commission").eq("id", 1).single();

  // ✅ commission está guardado como 3 (no 0.03), dividir entre 100
  const COMMISSION = (config?.commission ?? 3) / 100;

  const { data: admin } = await supabase
    .from("users").select("*").eq("id", req.userId).single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { data: market } = await supabase
    .from("markets").select("*").eq("id", marketId).single();

  if (!market) return res.status(404).json({ message: "Mercado no encontrado" });
  if (market.resolved) return res.status(400).json({ message: "Mercado ya resuelto" });

  const { data: allBets, error: allBetsError } = await supabase
    .from("bets").select("*").eq("market_id", marketId);

  if (!allBets || allBets.length === 0) {
    await supabase.from("markets").update({ resolved: true, winner }).eq("id", marketId);
    return res.json({ message: "Mercado resuelto, no hubo apuestas" });
  }

  const winningBets = allBets.filter((b) => b.type?.trim().toLowerCase() === winner);
  const losingBets = allBets.filter((b) => b.type?.trim().toLowerCase() !== winner);
  const losingPool = losingBets.reduce((sum, b) => sum + Number(b.amount), 0);
  const winningPool = winningBets.reduce((sum, b) => sum + Number(b.amount), 0);

  if (winningBets.length === 0) {
    await supabase.from("markets").update({ resolved: true, winner }).eq("id", marketId);
    return res.json({ message: "Mercado resuelto, pero no hubo ganadores" });
  }

  let totalCommission = 0;
  const failedBets = [];

  for (const bet of winningBets) {
    const amount = Number(bet.amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      console.error(`[resolve] SKIP bet ${bet.id}: amount inválido`);
      continue;
    }
    const participation = winningPool > 0 ? amount / winningPool : 0;
    const grossProfit = losingPool * participation;
    const commission = grossProfit * COMMISSION;
    totalCommission += commission;
    const netProfit = grossProfit - commission;
    const payout = parseFloat((amount + netProfit).toFixed(2));

    if (isNaN(payout) || payout <= 0) {
      console.error(`[resolve] SKIP bet ${bet.id}: payout inválido`);
      continue;
    }

    const { data: user, error: userError } = await supabase
      .from("users").select("points,email,nombre").eq("id", bet.user_id).single();

    if (userError || !user) {
      console.error(`[resolve] SKIP bet ${bet.id}: usuario no encontrado`);
      continue;
    }

    const newPoints = parseFloat((Number(user.points) + payout).toFixed(2));

    const { error: updateError } = await supabase.from("users")
      .update({ points: newPoints })
      .eq("id", bet.user_id);

    if (updateError) {
      console.error(`[resolve] Error actualizando puntos bet ${bet.id}: ${updateError.message}`);
      failedBets.push({ betId: bet.id, userId: bet.user_id, email: user.email, monto: payout, error: updateError.message });
      continue;
    }

    const { error: payoutError } = await supabase.from("bets")
      .update({ payout })
      .eq("id", bet.id);

    if (payoutError) {
      console.error(`[resolve] Error guardando payout bet ${bet.id}: ${payoutError.message}`);
    }

    // Guardar commission_paid por separado (informativo, no crítico)
    await supabase.from("bets")
      .update({ commission_paid: parseFloat(commission.toFixed(2)) })
      .eq("id", bet.id);

    await supabase.from("notifications").insert([{
      user_id: bet.user_id,
      title: "🎉 ¡Ganaste una predicción!",
      message: `Invertiste ${amount.toFixed(2)} $ en "${market.question}" · Comisión (${config?.commission ?? 3}%): -${commission.toFixed(2)} $ · Total recibido: ${payout.toFixed(2)} $`,
      read: false,
      market_id: marketId,
    }]);
    emailMercadoGanado({ nombre: user.nombre, email: user.email, question: market.question, reward: payout });

    await supabase.from("winners").insert([{
      user_id: bet.user_id,
      market_id: marketId,
      prediction: winner,
      reward: payout,
    }]);
  }

  for (const bet of losingBets) {
    const amount = Number(bet.amount);
    await supabase.from("bets").update({ payout: 0 }).eq("id", bet.id);
    await supabase.from("bets").update({ commission_paid: 0 }).eq("id", bet.id);
    await supabase.from("notifications").insert([{
      user_id: bet.user_id,
      title: "❌ Perdiste una predicción",
      message: `Apostaste ${amount.toFixed(2)} $ a "${market.question}" y no fue el resultado ganador. Saldo descontado: -${amount.toFixed(2)} $`,
      read: false,
      market_id: marketId,
    }]);
    const { data: loser } = await supabase.from("users").select("nombre,email").eq("id", bet.user_id).single();
    if (loser?.email) emailMercadoPerdido({ nombre: loser.nombre, email: loser.email, question: market.question, amount });
  }

  await supabase.from("markets").update({ resolved: true, winner }).eq("id", marketId);

  if (failedBets.length > 0) {
    // Guardar en Supabase (puede fallar si Supabase está caído)
    supabase.from("admin_alerts").insert([{
      type: "payout_failure",
      title: `${failedBets.length} ganador(es) no acreditados — Mercado #${marketId}`,
      details: { marketId, marketQuestion: market.question, failedBets },
    }]).then(() => broadcast("admin_alerts", {})).catch(err => console.error("[alerts] Error guardando alerta:", err.message));

    // Email al admin como respaldo independiente de Supabase
    emailAdminAlerta({
      titulo: `${failedBets.length} ganador(es) no acreditados — Mercado #${marketId}`,
      detalle: `Al resolver el mercado "${market.question}", los siguientes usuarios no pudieron recibir su pago automáticamente. Acredítalos manualmente desde el panel admin.`,
      items: failedBets.map(f => ({ label: f.email, value: `$${f.monto}` })),
    });
  }

  broadcast("markets", {});
  broadcast("winners", {});
  broadcast("notifications", {});
  broadcast("bets", {});
  res.json({
    message: `Mercado resuelto. Comisión total: ${totalCommission.toFixed(2)} $`,
    ...(failedBets.length > 0 && {
      warning: `${failedBets.length} ganador(es) no pudieron ser acreditados automáticamente`,
      failedBets,
    }),
  });
});

// =======================
// 🔔 ADMIN - ALERTAS
// =======================
app.get("/admin/alerts", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  const { data, error } = await supabase.from("admin_alerts").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.put("/admin/alerts/:id/resolve", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  const { error } = await supabase.from("admin_alerts").update({ resolved: true }).eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Alerta resuelta" });
});

app.delete("/admin/alerts/:id", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  const { error } = await supabase.from("admin_alerts").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Alerta eliminada" });
});

// =======================
// 📧 CORREOS CORPORATIVOS
// =======================

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Webhook de Resend — recibe correos entrantes
app.post("/email/webhook", async (req, res) => {
  try {
    const event = req.body;
    if (!event || event.type !== "email.received") return res.json({ ok: true });

    const { data: emailData } = event;
    const toAddress = Array.isArray(emailData.to) ? emailData.to[0] : emailData.to;
    const alias = toAddress?.split("@")[0]?.toLowerCase();

    const { data: aliasRow } = await supabase.from("email_aliases").select("alias").eq("alias", alias).maybeSingle();
    if (!aliasRow) return res.json({ ok: true });

    // Obtener cuerpo completo del correo desde Resend
    let html = null;
    let text = null;
    try {
      const fullRes = await fetch(`https://api.resend.com/emails/receiving/${emailData.email_id}`, {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      });
      if (fullRes.ok) {
        const full = await fullRes.json();
        html = full.html || null;
        text = full.text || null;
      }
    } catch (e) {
      console.error("[email/webhook] Error obteniendo cuerpo:", e.message);
    }

    await supabase.from("emails").insert([{
      id: emailData.email_id,
      type: "received",
      alias,
      from_address: emailData.from,
      to_address: toAddress,
      subject: emailData.subject || "(Sin asunto)",
      html,
      text,
      message_id: emailData.headers?.["message-id"] || null,
      in_reply_to: emailData.headers?.["in-reply-to"] || null,
      thread_references: emailData.headers?.["references"] || null,
      read: false,
    }]);

    broadcast("emails", { alias });
    res.json({ ok: true });
  } catch (err) {
    console.error("[email/webhook] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obtener correos
app.get("/admin/emails", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  const { alias, type } = req.query;
  let query = supabase.from("emails").select("*").order("created_at", { ascending: false }).limit(100);
  if (alias) query = query.eq("alias", alias);
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// Marcar como leído
app.put("/admin/emails/:id/read", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  await supabase.from("emails").update({ read: true }).eq("id", req.params.id);
  res.json({ ok: true });
});

// Enviar / responder correo
app.post("/admin/emails/send", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role, email, nombre").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { to, subject, html, from_alias, in_reply_to, references } = req.body;
  if (!to || !subject || !html || !from_alias) return res.status(400).json({ message: "Faltan campos requeridos" });
  const { data: aliasRow } = await supabase.from("email_aliases").select("alias").eq("alias", from_alias).maybeSingle();
  if (!aliasRow) return res.status(400).json({ message: "Alias no permitido" });

  const fromAddress = `${from_alias.charAt(0).toUpperCase() + from_alias.slice(1)} EcuaPred <${from_alias}@ecuapred.com>`;
  const headers = {};
  if (in_reply_to) headers["In-Reply-To"] = in_reply_to;
  if (references) headers["References"] = references;

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromAddress, to: [to], subject, html, ...(Object.keys(headers).length > 0 && { headers }) }),
  });

  const sendData = await sendRes.json();
  if (!sendRes.ok) return res.status(500).json({ message: sendData.message || "Error al enviar" });

  await supabase.from("emails").insert([{
    id: sendData.id,
    type: "sent",
    alias: from_alias,
    from_address: fromAddress,
    to_address: to,
    subject,
    html,
    message_id: sendData.id,
    in_reply_to: in_reply_to || null,
    read: true,
  }]);

  res.json({ ok: true, id: sendData.id });
});

// Eliminar correo
app.delete("/admin/emails/:id", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  await supabase.from("emails").delete().eq("id", req.params.id);
  res.json({ ok: true });
});

// Listar aliases
app.get("/admin/email-aliases", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  const { data } = await supabase.from("email_aliases").select("alias").order("created_at");
  res.json(data?.map(r => r.alias) || []);
});

// Agregar alias
app.post("/admin/email-aliases", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  const { alias } = req.body;
  if (!alias?.trim()) return res.status(400).json({ message: "Alias requerido" });
  const clean = alias.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  if (!clean) return res.status(400).json({ message: "Alias inválido" });
  const { error } = await supabase.from("email_aliases").insert([{ alias: clean }]);
  if (error) return res.status(400).json({ message: "El alias ya existe" });
  res.json({ ok: true, alias: clean });
});

// Eliminar alias
app.delete("/admin/email-aliases/:alias", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  await supabase.from("email_aliases").delete().eq("alias", req.params.alias);
  res.json({ ok: true });
});

// =======================
// 👑 ADMIN - CREAR MERCADO
// =======================
app.post("/admin/markets", auth, async (req, res) => {
  const { data: adminUser } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!adminUser || adminUser.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { question, category, closes_at } = req.body;
  if (!question?.trim()) return res.status(400).json({ message: "La pregunta es obligatoria" });

  const insertData = { question: question.trim(), category: category || "general" };
  if (closes_at) insertData.closes_at = closes_at;
  const { error } = await supabase.from("markets").insert([insertData]);
  if (error) return res.status(400).json({ message: error.message });

  broadcast("markets", {});
  res.json({ message: "Mercado creado" });
});

// =======================
// 🗑️ ADMIN - ELIMINAR MERCADO
// =======================
app.delete("/admin/markets/:id", auth, async (req, res) => {
  const { data: user, error: userError } = await supabase
    .from("users").select("*").eq("id", req.userId).single();

  if (userError || !user) return res.status(404).json({ message: "Usuario no encontrado" });
  if (user.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { error } = await supabase.from("markets").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ message: error.message });

  broadcast("markets", {});
  res.json({ message: "Mercado eliminado" });
});

app.put("/admin/markets/:id/category", auth, async (req, res) => {
  const { data: user } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { category } = req.body;
  const { error } = await supabase
    .from("markets").update({ category }).eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  broadcast("markets", {});
  res.json({ message: "Categoría actualizada" });
});

app.put("/admin/markets/recategorize", auth, async (req, res) => {
  const { data: user } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  const { from, to } = req.body;
  if (!from || !to) return res.status(400).json({ message: "Faltan parámetros from/to" });
  const { data, error } = await supabase.from("markets").update({ category: to }).eq("category", from);
  if (error) return res.status(500).json({ message: error.message });
  broadcast("markets", {});
  res.json({ message: `Mercados reasignados de "${from}" a "${to}"` });
});

// =======================
// ❤️ FAVORITOS
// =======================
app.get("/favorites", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("favorites").select("market_id").eq("user_id", req.userId);
  if (error) return res.status(500).json({ message: error.message });
  res.json(data.map((f) => f.market_id));
});

app.post("/favorites/:marketId", auth, async (req, res) => {
  const marketId = Number(req.params.marketId);
  if (!Number.isFinite(marketId) || marketId <= 0) {
    return res.status(400).json({ message: "ID de mercado inválido" });
  }

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", req.userId)
    .eq("market_id", marketId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("id", existing.id);
    return res.json({ favorited: false });
  }

  await supabase.from("favorites").insert([{
    user_id: req.userId,
    market_id: marketId,
  }]);
  res.json({ favorited: true });
});
// =======================
// 💬 COMENTARIOS
// =======================
app.get("/markets/:id/comments", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("market_id", id)
    .eq("hidden", false)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: "Error" });
  res.json(data);
});

app.post("/markets/:id/comments", auth, commentRateLimit, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content || content.trim() === "") return res.status(400).json({ message: "Comentario vacío" });
  if (typeof content !== "string" || content.trim().length > 500) return res.status(400).json({ message: "El comentario no puede superar los 500 caracteres" });

  const { data: user } = await supabase
    .from("users").select("nombre, email").eq("id", req.userId).single();

  const username = user?.nombre || user?.email || "Anónimo";

  const { data, error } = await supabase
    .from("comments")
    .insert({ market_id: Number(id), user_id: req.userId, username, content })
    .select()
    .single();

  if (error) {
    console.error("Error comentario:", error);
    return res.status(500).json({ message: error.message });
  }
  broadcast("comments", { market_id: Number(id) });
  res.json(data);
});

app.get("/admin/comments", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { data, error } = await supabase
    .from("comments")
    .select("id, content, username, created_at, market_id, hidden, markets ( question )")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.put("/admin/comments/:id/hide", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { id } = req.params;
  const { hidden } = req.body;
  const { error } = await supabase.from("comments").update({ hidden }).eq("id", id);
  if (error) return res.status(500).json({ message: error.message });
  broadcast("comments", {});
  res.json({ message: hidden ? "Comentario ocultado" : "Comentario visible" });
});

app.delete("/admin/comments/:id", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { id } = req.params;
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) return res.status(500).json({ message: error.message });
  broadcast("comments", {});
  res.json({ message: "Comentario eliminado" });
});

// =======================
// 📰 NOTICIAS RELACIONADAS
// =======================
app.get("/markets/:id/news", async (req, res) => {
  const { id } = req.params;
  const { data: market } = await supabase
    .from("markets").select("question").eq("id", id).single();
  if (!market) return res.status(404).json({ message: "Mercado no encontrado" });

  const query = encodeURIComponent(market.question.slice(0, 60));
  const apiKey = process.env.NEWS_API_KEY;
  const url = `https://newsapi.org/v2/everything?q=${query}&language=es&sortBy=publishedAt&pageSize=4&apiKey=${apiKey}`;

  try {
    const newsRes = await fetch(url);
    const newsData = await newsRes.json();
    res.json(newsData.articles || []);
  } catch {
    res.json([]);
  }
});

// =======================
// 🎯 OBTENER MI APUESTA EN UN MERCADO
// =======================
app.get("/markets/:id/my-bet", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("bets")
    .select("*")
    .eq("market_id", req.params.id)
    .eq("user_id", req.userId)
    .maybeSingle();

  if (error) return res.status(500).json({ message: error.message });
  res.json({ bet: data ?? null });
});

// =======================
// 📊 HISTORIAL DE MERCADO
// =======================
app.get("/markets/:id/history", async (req, res) => {
  const { data, error } = await supabase
    .from("market_history")
    .select("yes_pct, no_pct, total, created_at")
    .eq("market_id", Number(req.params.id))
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) return res.status(500).json({ message: error.message });
  res.json(data || []);
});

app.get("/markets/:id/top-holders", async (req, res) => {
  const { data, error } = await supabase
    .from("bets")
    .select("amount, type, users(nombre, email)")
    .eq("market_id", Number(req.params.id))
    .order("amount", { ascending: false })
    .limit(5);
  if (error) return res.status(500).json({ message: error.message });
  res.json(data || []);
});

app.get("/markets/:id/bettors-count", async (req, res) => {
  const { count, error } = await supabase
    .from("bets")
    .select("*", { count: "exact", head: true })
    .eq("market_id", Number(req.params.id));
  if (error) return res.status(500).json({ message: error.message });
  res.json({ count: count || 0 });
});

// =======================
// 🎠 CONFIG CARRUSEL
// =======================
app.get("/carousel-config", async (req, res) => {
  const { data, error } = await supabase
    .from("config").select("trending_count, winners_count, autoplay_ms").eq("id", 1).single();
  if (error) return res.status(500).json({ message: error.message });
  res.json({
    trending_count: data?.trending_count ?? 1,
    winners_count: data?.winners_count ?? 1,
    autoplay_ms: data?.autoplay_ms ?? 5000,
  });
});

app.put("/admin/carousel-config", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { trending_count, winners_count, autoplay_ms } = req.body;

  if (trending_count < 1 || winners_count < 1 || autoplay_ms < 1000) {
    return res.status(400).json({ message: "Valores inválidos" });
  }

  const { error } = await supabase
    .from("config").update({ trending_count, winners_count, autoplay_ms }).eq("id", 1);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Configuración actualizada" });
});

// =======================
// 🧪 TEST
// =======================
app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

// =======================
// 💳 PAYPHONE - INICIAR PAGO
// =======================
app.post("/payphone/prepare", auth, async (req, res) => {
  const { amount, clientTransactionId } = req.body;
  const parsedAmount = parseFloat(amount);
  if (!clientTransactionId || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10000) {
    return res.status(400).json({ message: "Datos inválidos" });
  }

  const { data: userBalance } = await supabase.from("users").select("points").eq("id", req.userId).single();

  const { data, error } = await supabase.from("transactions").insert([{
    user_id: req.userId,
    type: "recarga",
    amount: parseFloat(amount),
    status: "pendiente",
    reference: clientTransactionId,
    balance_before: userBalance ? Number(userBalance.points) : null,
  }]);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Transacción preparada" });
});
async function procesarPagoPayphone(clientTransactionId, payphoneId) {
  try {
    console.log("Procesando pago:", { clientTransactionId, payphoneId });
    
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("reference", clientTransactionId)
      .eq("status", "pendiente")
      .maybeSingle();

    if (!transaction) {
      console.log("Transacción ya procesada o no encontrada:", clientTransactionId);
      return;
    }

    // Marcar como procesando ANTES de sumar puntos para evitar doble procesamiento
    const { data: lockData, error: lockError } = await supabase
      .from("transactions")
      .update({ status: "procesando" })
      .eq("reference", clientTransactionId)
      .eq("status", "pendiente")
      .select();

    if (lockError || !lockData || lockData.length === 0) {
      console.log("No se pudo bloquear la transacción, puede ya estar procesada");
      return;
    }

    // Si el monto es 0, no sumar puntos
    if (!transaction.amount || transaction.amount === 0) {
      console.log("Transacción sin monto, no se suman puntos");
      await supabase.from("transactions")
        .update({ status: "completado", payphone_id: payphoneId })
        .eq("reference", clientTransactionId);
      return;
    }

    const { data: user } = await supabase
      .from("users").select("points, nombre, email").eq("id", transaction.user_id).single();

    const newPoints = Number(user.points) + Number(transaction.amount);

    await supabase.from("users")
      .update({ points: newPoints })
      .eq("id", transaction.user_id);

    await supabase.from("transactions")
      .update({ status: "completado", payphone_id: payphoneId })
      .eq("reference", clientTransactionId);

    await supabase.from("notifications").insert([{
      user_id: transaction.user_id,
      title: "✅ Recarga exitosa",
      message: `Se acreditaron ${transaction.amount} $ a tu cuenta.`,
      read: false,
    }]);

    // Notificar al header del usuario para que actualice el saldo en tiempo real
    broadcast("transactions", {});
    broadcast("notifications", {});

    if (user.email) {
      emailRecargaTarjeta({
        nombre: user.nombre,
        email: user.email,
        amount: transaction.amount,
        newBalance: newPoints,
      });
    }
  } catch (err) {
    console.error("Error procesando pago:", err);
  }
}




// =======================
// 💳 PAYPHONE - CALLBACK
// =======================
app.get("/payphone/callback", async (req, res) => {
  const { clientTransactionId, id } = req.query;
  if (!id) {
    return res.redirect("https://ecuapred.com/panel?status=cancelado");
  }

  try {
    // Buscar transacción por clientTransactionId O directamente usar el id de Payphone
    let transaction = null;

    if (clientTransactionId) {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("reference", clientTransactionId)
        .eq("status", "pendiente")
        .maybeSingle();
      transaction = data;
    }

    // Si no encontró por reference, buscar por payphoneId
    if (!transaction) {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("payphone_id", id)
        .maybeSingle();
      transaction = data;
    }

    // Si aún no existe, crearla usando el clientTransactionId como referencia
    if (!transaction && clientTransactionId) {
      // Extraer userId del clientTransactionId (formato: userId-timestamp)
      const userId = String(clientTransactionId).split("-").slice(0, 5).join("-");
      console.log("Creando transacción on-the-fly para userId:", userId);

      const { data: newTx } = await supabase
        .from("transactions")
        .insert([{
          user_id: userId,
          type: "recarga",
          amount: 0, // No sabemos el monto aquí
          status: "pendiente",
          reference: clientTransactionId,
          payphone_id: String(id),
        }])
        .select()
        .single();
      transaction = newTx;
    }

    if (!transaction) {
      console.log("No se pudo encontrar ni crear la transacción");
      return res.redirect("https://ecuapred.com/panel?status=exitoso");
    }

    await procesarPagoPayphone(transaction.reference, String(id));
    return res.redirect("https://ecuapred.com/panel?status=exitoso");
  } catch (err) {
    console.error("Error procesando pago:", err);
    return res.redirect("https://ecuapred.com/panel?status=exitoso");
  }
});

app.post("/payphone/callback", async (req, res) => {
  const { clientTransactionId, transactionStatus, id, amount } = req.body;
  if (transactionStatus !== "Approved") {
    await supabase.from("transactions")
      .update({ status: "rechazado" })
      .eq("reference", clientTransactionId);
    return res.json({ message: "Pago no aprobado" });
  }

  // Verificar con Payphone que el pago es real
  try {
    const verifyRes = await fetch(`https://pay.payphonetodoesposible.com/api/button/V3/Confirm?id=${id}&clientTransactionId=${clientTransactionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.PAYPHONE_TOKEN_API}` },
    });
    const rawText = await verifyRes.text();
    console.log("Payphone verify status:", verifyRes.status);
    const verifyData = JSON.parse(rawText);

    if (verifyData.transactionStatus !== "Approved") {
      return res.status(400).json({ message: "Pago no verificado" });
    }

    // Obtener transacción pendiente
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("reference", clientTransactionId)
      .eq("status", "pendiente")
      .maybeSingle();

    if (!transaction) {
      return res.status(400).json({ message: "Transacción no encontrada o ya procesada" });
    }

    // Sumar puntos al usuario (1 USD = 1 punto)
    const { data: user } = await supabase
      .from("users").select("points").eq("id", transaction.user_id).single();

    const newPoints = Number(user.points) + Number(transaction.amount);

    await supabase.from("users")
      .update({ points: newPoints })
      .eq("id", transaction.user_id);

    // Marcar transacción como completada
    await supabase.from("transactions")
      .update({ status: "completado", payphone_id: id })
      .eq("reference", clientTransactionId);

    // Notificar al usuario
    await supabase.from("notifications").insert([{
      user_id: transaction.user_id,
      title: "✅ Recarga exitosa",
      message: `Se acreditaron ${transaction.amount} $ a tu cuenta.`,
      read: false,
    }]);

    res.json({ message: "Pago procesado correctamente" });
  } catch (err) {
    console.error("Error verificando pago:", err);
    res.status(500).json({ message: "Error verificando pago" });
  }
});

// =======================
// 💳 PAYPHONE - CONFIG WIDGET
// NOTA: El token del widget tiene scope limitado (solo inicia pagos).
// La verificación real del pago se hace server-side en /payphone/callback.
// =======================
app.get("/payphone/widget-config", auth, (req, res) => {
  const token = process.env.PAYPHONE_TOKEN_API || process.env.PAYPHONE_TOKEN;
  const storeId = process.env.PAYPHONE_STORE_ID;
  if (!token || !storeId) return res.status(500).json({ message: "Payphone no configurado" });
  res.json({ token, storeId });
});

// =======================
// 💳 PAYPHONE - ESTADO PAGO
// =======================
app.get("/payphone/status", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// =======================
// 🧹 CRON - LIMPIAR TRANSACCIONES PENDIENTES
// =======================
setInterval(async () => {
  const diezMinutosAtras = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from("transactions")
    .update({ status: "cancelada" })
    .eq("status", "pendiente")
    .eq("payment_method", "tarjeta")
    .lt("created_at", diezMinutosAtras);

  if (data?.length > 0) {
    console.log(`🧹 ${data.length} transacciones pendientes canceladas automáticamente`);
  }
}, 5 * 60 * 1000); // Corre cada 5 minutos

// =======================
// 📰 SUGERENCIAS DE NOTICIAS
// =======================

// Recibir noticia desde la extensión y procesarla con IA
app.post("/admin/news-suggest", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });

  try {
    const decoded = jwt.verify(token, SECRET);
    const { data: admin } = await supabase
      .from("users").select("role").eq("id", decoded.id).single();
    if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }

  const { title, url, content } = req.body;
  if (!title) return res.status(400).json({ message: "Título requerido" });

  // Obtener mercados activos para comparar
  const { data: activeMarkets } = await supabase
    .from("markets").select("id, question").eq("resolved", false);

  const marketsText = activeMarkets?.map(m => `ID ${m.id}: ${m.question}`).join("\n") || "Ninguno";

  // Llamar a Claude para analizar
 const prompt = `Eres un experto analista político y económico de Ecuador con conocimiento profundo del contexto nacional.

Noticia recibida:
Título: ${title}
URL: ${url || "No disponible"}
Contenido adicional: ${content || "No disponible"}

Mercados activos actualmente:
${marketsText}

Tu tarea es analizar la noticia y responder SOLO en JSON con esta estructura exacta, sin texto adicional, sin markdown:
{
  "new_market_question": "una sola pregunta de predicción futura, concreta y verificable, o null si la noticia no da para un mercado",
  "probability_yes": número entre 0 y 100 indicando qué tan probable es que la respuesta sea SÍ,
  "probability_no": número entre 0 y 100 indicando qué tan probable es que la respuesta sea NO,
  "probability_reasoning": "explicación breve de por qué asignaste esas probabilidades basándote en el contexto ecuatoriano",
  "suggested_close_date": "fecha estimada en formato YYYY-MM-DD para cerrar el mercado, basada en cuándo se podría verificar el resultado",
  "resolves_market_id": número del ID del mercado que esta noticia resuelve, o null si ninguno,
  "resolves_as": "yes" o "no" según si el mercado se cumplió, o null si no resuelve ninguno,
  "summary": "resumen de la noticia en máximo 2 oraciones"
}

Reglas para generar buenas preguntas:
- La pregunta debe ser sobre un evento futuro verificable con Sí o No
- Debe ser relevante para Ecuador y su contexto político, económico, social, farandula, deporte, etc.
- Debe poder resolverse en un plazo razonable (días, semanas o meses 1-3)
- Ejemplos buenos: "¿Aprobará la Asamblea Nacional la ley X antes de junio?", "¿Ganará X las elecciones de Y?", "¿Superará el precio del petróleo los $80 antes de julio?"
- Ejemplos malos: preguntas ambiguas, sin fecha, o que no se puedan verificar claramente`;

  try {

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
  },
  body: JSON.stringify({
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  }),
});

const aiData = await aiRes.json();
const rawText = aiData.choices?.[0]?.message?.content || "{}";
const clean = rawText.replace(/```json|```/g, "").trim();
let parsed;
try {
  parsed = JSON.parse(clean);
} catch (e) {
  console.error("Error parseando JSON de IA:", clean);
  parsed = { new_market_question: null, resolves_market_id: null, resolves_as: null, summary: clean };
}
    // Guardar sugerencia en Supabase
    const { data: suggestion, error } = await supabase
  .from("news_suggestions")
  .insert({
    title,
    url: url || null,
    summary: parsed.summary || null,
    new_market_question: parsed.new_market_question || null,
    probability_yes: parsed.probability_yes || null,
    probability_no: parsed.probability_no || null,
    probability_reasoning: parsed.probability_reasoning || null,
    suggested_close_date: parsed.suggested_close_date || null,
    resolves_market_id: parsed.resolves_market_id || null,
    resolves_as: parsed.resolves_as || null,
    status: "pending",
  })
      .select().single();

    if (error) throw error;
    broadcast("suggestions", {});
    res.json({ message: "Sugerencia procesada", suggestion });
  } catch (err) {
    console.error("Error IA completo:", JSON.stringify(err, null, 2));
    console.error("Error mensaje:", err.message);
    res.status(500).json({ message: err.message || "Error procesando con IA" });
  }
});

// Obtener sugerencias pendientes
app.get("/admin/news-suggestions", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });
  try {
    const decoded = jwt.verify(token, SECRET);
    const { data: admin } = await supabase
      .from("users").select("role").eq("id", decoded.id).single();
    if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  } catch { return res.status(401).json({ message: "Token inválido" }); }

  const { data, error } = await supabase
    .from("news_suggestions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// Aprobar o rechazar sugerencia
app.put("/admin/news-suggestions/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });
  try {
    const decoded = jwt.verify(token, SECRET);
    const { data: admin } = await supabase
      .from("users").select("role").eq("id", decoded.id).single();
    if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  } catch { return res.status(401).json({ message: "Token inválido" }); }

  const { action } = req.body; // "approve_market", "approve_resolve", "reject"
  const suggestionId = req.params.id;

  const { data: suggestion } = await supabase
    .from("news_suggestions").select("*").eq("id", suggestionId).single();

  if (!suggestion) return res.status(404).json({ message: "Sugerencia no encontrada" });

  broadcast("suggestions", {});

  if (action === "approve_market" && suggestion.new_market_question) {

  const { closes_at, category } = req.body;
  const marketData = {
    question: suggestion.new_market_question,
    category: category || suggestion.category || "general",
    news_title: suggestion.title || null,
    news_url: suggestion.url || null,
    news_summary: suggestion.summary || null,
    news_source: suggestion.url ? new URL(suggestion.url).hostname.replace("www.", "") : null,
    news_date: new Date().toISOString().split("T")[0],
  };

  // Cadena de fallback para closes_at:
  // 1) Lo que envió el admin, 2) La fecha del bot en DB, 3) Hoy + 3 días
  let closesAt = closes_at || null;
  if (!closesAt && suggestion.suggested_close_date) {
    const d = String(suggestion.suggested_close_date).slice(0, 10);
    closesAt = `${d}T23:59:00-05:00`;
  }
  if (!closesAt) {
    const fallback = new Date(Date.now() + 3 * 86400000);
    closesAt = `${fallback.toISOString().split("T")[0]}T23:59:00-05:00`;
  }
  marketData.closes_at = closesAt;

  const { data: newMarket, error: marketError } = await supabase.from("markets").insert([marketData]).select().single();

  if (marketError) console.error("[approve_market] Error:", marketError.message);

  await supabase.from("news_suggestions").update({ status: "approved" }).eq("id", suggestionId);
  return res.json({ message: "Mercado creado ✅" });
}

  if (action === "approve_resolve" && suggestion.resolves_market_id) {
    // Reutiliza la lógica de resolución llamando internamente
    const resolveRes = await fetch(`https://api.ecuapred.com/admin/resolve/${suggestion.resolves_market_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: req.headers.authorization,
      },
      body: JSON.stringify({ winner: suggestion.resolves_as }),
    });
    const resolveData = await resolveRes.json();
    await supabase.from("news_suggestions").update({ status: "approved" }).eq("id", suggestionId);
    return res.json({ message: resolveData.message });
  }

  if (action === "reject") {
    await supabase.from("news_suggestions").update({ status: "rejected" }).eq("id", suggestionId);
    return res.json({ message: "Sugerencia rechazada" });
  }

  res.status(400).json({ message: "Acción inválida" });
});

// Cambiar resolves_as de una sugerencia de cierre
app.put("/admin/news-suggestions/:id/resolves-as", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });
  try {
    const decoded = jwt.verify(token, SECRET);
    const { data: admin } = await supabase.from("users").select("role").eq("id", decoded.id).single();
    if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  } catch { return res.status(401).json({ message: "Token inválido" }); }

  const { resolves_as } = req.body;
  if (!["yes", "no"].includes(resolves_as)) return res.status(400).json({ message: "Valor inválido" });

  const { error } = await supabase
    .from("news_suggestions").update({ resolves_as }).eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Actualizado" });
});

// Refinar pregunta de sugerencia con IA
app.put("/admin/news-suggestions/:id/refine", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });
  try {
    const decoded = jwt.verify(token, SECRET);
    const { data: admin } = await supabase
      .from("users").select("role").eq("id", decoded.id).single();
    if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  } catch { return res.status(401).json({ message: "Token inválido" }); }

  const { current_question, refine_prompt } = req.body;
  if (!current_question || !refine_prompt) return res.status(400).json({ message: "Faltan datos" });

  const prompt = `Eres un experto en mercados de predicción de Ecuador.

Pregunta actual: "${current_question}"

El administrador quiere refinarla con esta instrucción: "${refine_prompt}"

Responde SOLO en JSON sin markdown:
{
  "new_market_question": "la pregunta refinada según la instrucción del administrador",
  "probability_yes": número entre 0 y 100,
  "probability_no": número entre 0 y 100,
  "probability_reasoning": "explicación breve",
  "suggested_close_date": "fecha en formato YYYY-MM-DD"
}`;

  try {
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await aiRes.json();
    const rawText = aiData.choices?.[0]?.message?.content || "{}";
    const clean = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const { error } = await supabase
      .from("news_suggestions")
      .update({
        new_market_question: parsed.new_market_question,
        probability_yes: parsed.probability_yes || null,
        probability_no: parsed.probability_no || null,
        probability_reasoning: parsed.probability_reasoning || null,
        suggested_close_date: parsed.suggested_close_date || null,
      })
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ message: "Pregunta refinada ✅" });
  } catch (err) {
    console.error("Error refinando:", err);
    res.status(500).json({ message: "Error refinando con IA" });
  }
});

// =======================
// ✏️ BOTNEWS — EDITAR PREGUNTA DIRECTA
// =======================
app.patch("/admin/news-suggestions/:id/question", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });
  try {
    const decoded = jwt.verify(token, SECRET);
    const { data: admin } = await supabase
      .from("users").select("role").eq("id", decoded.id).single();
    if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  } catch { return res.status(401).json({ message: "Token inválido" }); }

  const { new_question } = req.body;
  if (!new_question?.trim()) return res.status(400).json({ message: "Pregunta vacía" });

  const { error } = await supabase
    .from("news_suggestions")
    .update({ new_market_question: new_question.trim() })
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Pregunta actualizada ✅" });
});

// =======================
// 💬 BOTNEWS — CHAT IA
// =======================
app.post("/admin/news-suggestions/:id/chat", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });
  try {
    const decoded = jwt.verify(token, SECRET);
    const { data: admin } = await supabase
      .from("users").select("role").eq("id", decoded.id).single();
    if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });
  } catch { return res.status(401).json({ message: "Token inválido" }); }

  const { messages, suggestion } = req.body;
  if (!messages || !suggestion) return res.status(400).json({ message: "Faltan datos" });

  const isNewsMode = suggestion.mode === "news";
  const userQuestion = messages[messages.length - 1]?.content || "";

  // 1. Intentar obtener el contenido completo del artículo
  let articleContent = "";
  if (suggestion.url) {
    try {
      const articleRes = await fetch(suggestion.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
      });
      const html = await articleRes.text();
      // Extraer texto limpio quitando tags HTML
      articleContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);
    } catch (err) {
      console.error("[chat] Error fetcheando artículo:", err.message);
    }
  }

  // 2. Buscar en Tavily con la pregunta del usuario
  let tavilyContext = "";
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    try {
      const tavilyRes = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: `Ecuador ${suggestion.title || ""} ${userQuestion}`,
          search_depth: "basic",
          max_results: 4,
          include_answer: true,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const tavilyData = await tavilyRes.json();
      if (tavilyData.answer) tavilyContext += `Respuesta directa de búsqueda: ${tavilyData.answer}\n\n`;
      if (tavilyData.results?.length > 0) {
        tavilyContext += tavilyData.results
          .map(r => `Fuente: ${r.url}\nTítulo: ${r.title}\n${r.content?.slice(0, 500) || ""}`)
          .join("\n---\n");
      }
    } catch (err) {
      console.error("[chat] Error en Tavily:", err.message);
    }
  }

  let systemPrompt;
  if (isNewsMode) {
    systemPrompt = "Eres un asistente que ayuda al administrador a analizar y reformular noticias de mercados para Ecuador.\n\n"
      + "NOTICIA:\n"
      + "- Título: " + (suggestion.title || "N/A") + "\n"
      + "- URL: " + (suggestion.url || "N/A") + "\n"
      + "- Contenido: " + (suggestion.summary || "N/A") + "\n\n"
      + (articleContent ? "CONTENIDO DEL ARTÍCULO:\n" + articleContent + "\n\n" : "")
      + (tavilyContext ? "BÚSQUEDA EN INTERNET:\n" + tavilyContext + "\n\n" : "")
      + "INSTRUCCIONES:\n"
      + "1. Responde preguntas sobre la noticia usando el artículo y la búsqueda en internet.\n"
      + "2. Si el admin pide reformular, mejorar o cambiar el título o contenido, escribe la versión nueva en new_text.\n"
      + "3. Si NO se pide modificar nada, pon new_text como null.\n"
      + "4. Sé conciso y cita la fuente.\n\n"
      + 'FORMATO DE RESPUESTA (JSON puro, sin texto extra antes ni después, sin markdown):\n{"reply":"tu respuesta aquí","new_text":"nuevo título o texto, o null si no se pidió cambio"}';
  } else {
    systemPrompt = "Eres un asistente experto en mercados de predicción para Ecuador. Ayudas al administrador a verificar y refinar preguntas generadas automáticamente.\n\n"
      + "NOTICIA ORIGINAL:\n"
      + "- Título: " + (suggestion.title || "N/A") + "\n"
      + "- URL: " + (suggestion.url || "N/A") + "\n"
      + "- Resumen: " + (suggestion.summary || "N/A") + "\n"
      + "- Pregunta actual: " + (suggestion.current_question || "N/A") + "\n"
      + "- Fecha de cierre sugerida: " + (suggestion.suggested_close_date || "N/A") + "\n\n"
      + (articleContent ? "CONTENIDO DEL ARTÍCULO:\n" + articleContent + "\n\n" : "")
      + (tavilyContext ? "BÚSQUEDA EN INTERNET:\n" + tavilyContext + "\n\n" : "")
      + "INSTRUCCIONES:\n"
      + "1. Responde usando primero el contenido del artículo, luego los resultados de búsqueda en internet.\n"
      + "2. Si el admin pide modificar, cambiar o mejorar la pregunta de predicción, escribe la versión nueva en new_question.\n"
      + "3. Si NO se pide modificar la pregunta, pon new_question como null.\n"
      + "4. Sé conciso y cita la fuente.\n\n"
      + 'FORMATO DE RESPUESTA (JSON puro, sin texto extra antes ni después, sin markdown):\n{"reply":"tu respuesta aquí","new_question":"pregunta modificada, o null si no se pidió cambio"}';
  }

  try {
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    const aiData = await aiRes.json();
    const rawText = aiData.choices?.[0]?.message?.content || "";

    if (!rawText) {
      const groqErr = aiData.error?.message || aiData.error?.code || JSON.stringify(aiData).slice(0, 200);
      console.error("[chat] Groq sin contenido:", groqErr);
      return res.json({ reply: `Error de IA: ${groqErr}`, new_question: null, new_text: null });
    }

    // Extraer JSON aunque el modelo ponga texto extra alrededor
    let parsed = null;
    const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); } catch { /* intento siguiente */ }
    }
    if (!parsed) {
      // Intentar con el objeto más grande posible
      const bigMatch = rawText.match(/\{[\s\S]*\}/);
      if (bigMatch) {
        try { parsed = JSON.parse(bigMatch[0]); } catch { /* fallo */ }
      }
    }
    if (!parsed) {
      parsed = { reply: rawText, new_question: null, new_text: null };
    }

    // Manejar "null" como string que devuelven algunos modelos
    const nullify = (v) => (!v || v === "null" || v === "ninguna" || v === "N/A") ? null : v;

    res.json({
      reply: parsed.reply || rawText || "Sin respuesta",
      new_question: isNewsMode ? null : nullify(parsed.new_question),
      new_text: isNewsMode ? nullify(parsed.new_text) : null,
    });
  } catch (err) {
    console.error("Error en chat IA:", err);
    res.status(500).json({ message: "Error al contactar la IA" });
  }
});

// =======================
// ✏️ EDITAR MERCADO
// =======================
app.put("/admin/markets/:id", auth, async (req, res) => {
  const { data: user } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { question, closes_at } = req.body;
  if (!question?.trim()) return res.status(400).json({ message: "Pregunta vacía" });

  const updateData = { question };
  if (closes_at !== undefined) updateData.closes_at = closes_at || null;
  const { error } = await supabase
    .from("markets").update(updateData).eq("id", req.params.id);

  if (error) return res.status(500).json({ message: error.message });
  broadcast("markets", {});
  res.json({ message: "Mercado actualizado ✅" });
});

// =======================
// 💸 SOLICITAR RETIRO
// =======================
app.post("/withdrawal", auth, withdrawalRateLimit, async (req, res) => {
  const { amount, method } = req.body;
  const withdrawAmount = parseFloat(amount);

  const { data: cfg } = await supabase.from("config").select("min_withdrawal, max_withdrawal, daily_withdrawal_limit").eq("id", 1).single();
  const minWithdrawal = cfg?.min_withdrawal ?? 10;
  const maxWithdrawal = cfg?.max_withdrawal ?? 1000;
  const dailyLimit = cfg?.daily_withdrawal_limit ?? null;

  if (!withdrawAmount || withdrawAmount < minWithdrawal) {
    return res.status(400).json({ message: `Monto mínimo de retiro: ${minWithdrawal} $` });
  }
  if (withdrawAmount > maxWithdrawal) {
    return res.status(400).json({ message: `Monto máximo de retiro: ${maxWithdrawal} $ por solicitud` });
  }

  if (dailyLimit !== null) {
    // Medianoche hora Ecuador (UTC-5)
    const now = new Date();
    const ecuadorOffset = -5 * 60;
    const localMinutes = now.getTime() / 60000 + ecuadorOffset;
    const startOfDayLocal = Math.floor(localMinutes / (24 * 60)) * (24 * 60);
    const startOfDay = new Date((startOfDayLocal - ecuadorOffset) * 60000);
    const { data: todayTx } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", req.userId)
      .eq("type", "retiro")
      .in("status", ["pendiente", "aprobado"])
      .gte("created_at", startOfDay.toISOString());
    const totalHoy = todayTx?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
    if (totalHoy + withdrawAmount > dailyLimit) {
      return res.status(400).json({ message: `Límite diario de retiro: ${dailyLimit} $. Hoy ya retiraste ${totalHoy.toFixed(2)} $` });
    }
  }

  const { data: user } = await supabase
    .from("users").select("*").eq("id", req.userId).single();

  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
  if (user.points < withdrawAmount) return res.status(400).json({ message: "Saldo insuficiente" });
  if (!user.banco || !user.numero_cuenta || !user.tipo_cuenta) {
    return res.status(400).json({ message: "Completa tus datos bancarios en tu perfil" });
  }

  // Optimistic lock: solo actualiza si los puntos no cambiaron desde la lectura
  const newPoints = Number(user.points) - withdrawAmount;

  const { data: updated, error: pointsError } = await supabase
    .from("users")
    .update({ points: newPoints })
    .eq("id", req.userId)
    .eq("points", user.points) // lock: falla si otra transacción ya modificó el saldo
    .select("points")
    .maybeSingle();

  if (pointsError) return res.status(500).json({ message: "Error al procesar" });
  if (!updated) return res.status(409).json({ message: "Saldo insuficiente o transacción en conflicto. Intenta nuevamente." });

  const { error: txError } = await supabase.from("transactions").insert({
    user_id: req.userId,
    type: "retiro",
    amount: withdrawAmount,
    status: "pendiente",
    payment_method: method || "transferencia",
    transfer_code: null,
    balance_before: Number(user.points),
    balance_after: newPoints,
  });

  if (txError) {
    // Revertir los puntos si falla la transacción
    await supabase.from("users").update({ points: user.points }).eq("id", req.userId);
    return res.status(500).json({ message: "Error al crear solicitud" });
  }

  await supabase.from("notifications").insert([{
    user_id: req.userId,
    title: "📤 Solicitud de retiro enviada",
    message: `Tu solicitud de retiro por $${withdrawAmount} está siendo procesada.`,
    read: false,
  }]);

  emailRetiroSolicitado({ nombre: user.nombre, email: user.email, amount: withdrawAmount });
  broadcast("transactions", {});
  res.json({ message: "Solicitud enviada", newPoints });
});

app.put("/admin/markets/:id/archive", auth, async (req, res) => {
  const { data: user } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { archived } = req.body;
  const { error } = await supabase
    .from("markets").update({ archived }).eq("id", req.params.id);

  if (error) return res.status(500).json({ message: error.message });
  broadcast("markets", {});
  res.json({ message: archived ? "Mercado archivado" : "Mercado restaurado" });
});

// =======================
// 📰 NOTICIAS DE MERCADO
// =======================
app.post("/admin/market-news", auth, async (req, res) => {
  const { data: user } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { title, url, content, source } = req.body;
  const { data, error } = await supabase.from("market_news").insert([{
    title, url, content, source, status: "pending",
  }]).select().single();

  if (error) return res.status(500).json({ message: error.message });
  broadcast("news", {});
  res.json({ message: "Noticia guardada", news: data });
});

app.get("/admin/market-news", auth, async (req, res) => {
  const { data: user } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { data, error } = await supabase
    .from("market_news").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.put("/admin/market-news/:id", auth, async (req, res) => {
  const { data: user } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { market_id, status, resolves_as, title, content } = req.body;
  const updateData = { market_id, status };
  if (resolves_as !== undefined) updateData.resolves_as = resolves_as;
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  const { error } = await supabase
    .from("market_news").update(updateData).eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  broadcast("news", {});
  res.json({ message: "Noticia actualizada" });
});

app.get("/markets/:id/news-closing", async (req, res) => {
  const { data, error } = await supabase
    .from("market_news")
    .select("*")
    .eq("market_id", req.params.id)
    .eq("status", "approved");
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// =======================
// 🔑 TOKENS DE EXTENSIÓN
// =======================
app.get("/admin/extension-tokens", auth, async (req, res) => {
  const { data: user } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { data, error } = await supabase
    .from("extension_tokens").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.post("/admin/extension-tokens", auth, async (req, res) => {
  const { data: user } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { label } = req.body;
  const token = jwt.sign(
    { id: req.userId, role: "admin", type: "extension" },
    SECRET,
    { expiresIn: "30d" }
  );

  const { data, error } = await supabase
    .from("extension_tokens").insert([{
      token,
      label: label || "Token extensión",
    }]).select().single();

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Token creado", token: data });
});

app.delete("/admin/extension-tokens/:id", auth, async (req, res) => {
  const { data: user } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { error } = await supabase
    .from("extension_tokens").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Token eliminado" });
});

// =======================
// 💳 MIS TRANSACCIONES
// =======================
app.get("/my-transactions", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", req.userId)
    .or("payment_method.eq.transferencia,payment_method.eq.tarjeta,payment_method.is.null")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// =======================
// 📊 MIS MOVIMIENTOS (combinado + balance reconstruido)
// =======================
app.get("/my-movements", auth, async (req, res) => {
  const [betsResult, txResult, userResult] = await Promise.all([
    supabase.from("bets")
      .select(`id, type, amount, payout, commission_paid, created_at, markets(id, question, resolved, winner)`)
      .eq("user_id", req.userId),
    supabase.from("transactions")
      .select("id, type, amount, status, payment_method, created_at, updated_at, balance_before, balance_after")
      .eq("user_id", req.userId)
      .or("payment_method.eq.transferencia,payment_method.eq.tarjeta,payment_method.is.null"),
    supabase.from("users").select("points").eq("id", req.userId).single(),
  ]);

  const bets = betsResult.data || [];
  const transactions = txResult.data || [];
  const currentPoints = parseFloat(userResult.data?.points ?? 0);

  const all = [
    ...bets.map(bet => {
      const estado = bet.markets?.resolved
        ? (bet.markets.winner === bet.type ? "ganada" : "perdida")
        : "pendiente";
      return {
        id: `bet-${bet.id}`,
        tipo: "prediccion",
        descripcion: bet.markets?.question || "Mercado",
        subtipo: bet.type === "yes" ? "Sí" : "No",
        monto: estado === "ganada" ? Number(bet.payout ?? bet.amount) : -Number(bet.amount),
        apuesta: Number(bet.amount),
        payout: bet.payout != null ? Number(bet.payout) : null,
        commission_paid: bet.commission_paid != null ? Number(bet.commission_paid) : null,
        fecha: bet.created_at,
        sort_fecha: bet.created_at,
        estado,
        market_id: bet.markets?.id || null,
        balance_before: null,
        balance_after: null,
      };
    }),
    ...transactions.map(tx => {
      const amt = Number(tx.amount);
      return {
        id: `tx-${tx.id}`,
        tipo: tx.type,
        descripcion: tx.type === "recarga" ? "Recarga de saldo" : "Retiro de saldo",
        subtipo: tx.payment_method === "transferencia" ? "Transferencia" : "Tarjeta",
        monto: tx.type === "recarga" ? amt : -amt,
        fecha: tx.created_at,
        // Retiro: el saldo cambia al crearlo (created_at), no al aprobarse
        // Recarga: el saldo cambia al aprobarse (updated_at)
        sort_fecha: tx.type === "retiro" ? tx.created_at : (tx.updated_at || tx.created_at),
        estado: tx.status,
        balance_before: tx.balance_before != null ? Number(tx.balance_before) : null,
        balance_after: tx.balance_after != null ? Number(tx.balance_after) : null,
        apuesta: null,
        payout: null,
        commission_paid: null,
        market_id: null,
      };
    }),
  ].sort((a, b) => new Date(b.sort_fecha).getTime() - new Date(a.sort_fecha).getTime());

  // Reconstruir balance anterior/actual desde el saldo actual hacia atrás
  let running = currentPoints;
  const movements = all.map(mov => {
    const balanceAfter = running;
    let effect = 0;

    if (mov.tipo === "prediccion") {
      if (mov.estado === "ganada" && mov.payout != null) {
        // Efecto neto: payout acreditado − apuesta descontada al apostar
        effect = mov.payout - mov.apuesta;
      } else {
        // pendiente o perdida: solo se descontó la apuesta al apostar
        effect = mov.monto; // = −apuesta
      }
    } else if (mov.tipo === "recarga" && mov.estado === "aprobado") {
      effect = mov.monto; // = +amount
    } else if (mov.tipo === "retiro" && mov.estado !== "rechazado") {
      // pendiente + aprobado: el saldo se descuenta INMEDIATAMENTE al crear el retiro
      effect = mov.monto; // = −amount
    }
    // retiro rechazado → net 0 (descuento + devolución)
    // recarga pendiente/rechazada → net 0 (nunca se acreditó)

    const balanceBefore = parseFloat((balanceAfter - effect).toFixed(2));

    // balance_after: preferir guardado; si no hay, calcular con balance_before + effect
    let finalAfter;
    if (mov.balance_after != null) {
      finalAfter = mov.balance_after;
    } else if (mov.balance_before != null && effect !== 0) {
      finalAfter = parseFloat((mov.balance_before + effect).toFixed(2));
    } else {
      finalAfter = parseFloat(balanceAfter.toFixed(2));
    }

    const finalBefore = mov.balance_before != null ? mov.balance_before : balanceBefore;

    // Retiro rechazado: mostrar el descuento real (Ant $100 → Act $70)
    // El label "rechazado" ya indica que el saldo fue devuelto.
    // No ocultamos el movimiento como "sin cambio" porque sería confuso para el usuario.

    // Calibrar running con balance_before guardado (más fiable que el reconstructido)
    running = mov.balance_before != null ? mov.balance_before : balanceBefore;

    return { ...mov, balance_before: finalBefore, balance_after: finalAfter };
  });

  res.json(movements);
});

// =======================
// 💳 ADMIN - LISTAR TRANSACCIONES
// =======================
app.get("/admin/transactions", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { data, error } = await supabase
    .from("transactions")
    .select("*, users(email, nombre, apellido, banco, numero_cuenta, tipo_cuenta, celular, cedula)")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// =======================
// ✉️ ADMIN - LISTAR CONTACTOS
// =======================
app.get("/admin/contactos", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { data, error } = await supabase
    .from("contactos").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// =======================
// ✉️ FORMULARIO DE CONTACTO
// =======================
app.post("/contacto", contactoRateLimit, async (req, res) => {
  const { nombre, email, asunto, mensaje, captchaToken } = req.body;
  if (!nombre?.trim() || !email?.trim() || !mensaje?.trim()) {
    return res.status(400).json({ message: "Nombre, email y mensaje son obligatorios" });
  }
  if (!captchaToken) {
    return res.status(400).json({ message: "CAPTCHA requerido" });
  }
  const captchaRes = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`,
  });
  const captchaData = await captchaRes.json();
  if (!captchaData.success) {
    return res.status(400).json({ message: "CAPTCHA inválido, intenta de nuevo" });
  }
  if (nombre.length > 100 || email.length > 200 || (asunto || "").length > 200 || mensaje.length > 2000) {
    return res.status(400).json({ message: "Uno o más campos exceden el límite de caracteres" });
  }

  const { error } = await supabase.from("contactos").insert({
    nombre: nombre.trim(),
    email: email.trim(),
    asunto: asunto?.trim() || "",
    mensaje: mensaje.trim(),
  });
  if (error) return res.status(500).json({ message: error.message });
  emailContactoRecibido({ nombre: nombre.trim(), email: email.trim(), asunto: asunto?.trim() || "Sin asunto" });
  broadcast("contactos", {});
  res.json({ message: "Mensaje enviado correctamente" });
});

// =======================
// 💳 ADMIN - ACTUALIZAR ESTADO TRANSACCIÓN
// =======================
app.put("/admin/transactions/:id/status", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { status } = req.body;
  if (!["aprobado", "rechazado"].includes(status)) {
    return res.status(400).json({ message: "Estado inválido" });
  }

  // Leer la transacción desde la BD — nunca confiar en userId/amount/type del cliente
  const { data: transaction } = await supabase
    .from("transactions").select("*").eq("id", req.params.id).single();
  if (!transaction) return res.status(404).json({ message: "Transacción no encontrada" });
  if (!["pendiente", "procesando"].includes(transaction.status)) {
    return res.status(400).json({ message: "Esta transacción ya fue procesada" });
  }
  const { user_id: userId, amount, type } = transaction;

  const { error } = await supabase.from("transactions").update({ status, updated_at: new Date().toISOString() }).eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });

  const { data: user } = await supabase.from("users").select("points,email,nombre").eq("id", userId).single();
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

  if (status === "aprobado") {
    if (type === "recarga") {
      const newBalance = parseFloat((Number(user.points) + Number(amount)).toFixed(2));
      await supabase.from("users").update({ points: newBalance }).eq("id", userId);
      // Guardar balance_after ahora que sabemos el saldo resultante
      await supabase.from("transactions").update({ balance_after: newBalance }).eq("id", req.params.id);
      await supabase.from("notifications").insert([{
        user_id: userId, title: "✅ Recarga exitosa",
        message: `Se acreditaron ${amount} $ a tu cuenta por transferencia bancaria.`, read: false,
      }]);
      emailRecargaAprobada({ nombre: user.nombre, email: user.email, amount, newBalance });
    } else if (type === "retiro") {
      await supabase.from("notifications").insert([{
        user_id: userId, title: "✅ Retiro aprobado",
        message: `Tu retiro de $${amount} fue aprobado y será transferido a tu cuenta bancaria.`, read: false,
      }]);
      emailRetiroAprobado({ nombre: user.nombre, email: user.email, amount });
    }
  } else if (status === "rechazado") {
    if (type === "retiro") {
      const restoredBalance = parseFloat((Number(user.points) + Number(amount)).toFixed(2));
      await supabase.from("users").update({ points: restoredBalance }).eq("id", userId);
      // El balance_after del retiro fue el saldo después del descuento;
      // ahora que se rechazó y devolvió, el saldo es el restaurado (igual al balance_before original)
      // Lo dejamos como está — la lógica de reconstrucción ya maneja rechazado correctamente
      await supabase.from("notifications").insert([{
        user_id: userId, title: "❌ Retiro rechazado",
        message: `Tu solicitud de retiro por $${amount} fue rechazada. El saldo fue devuelto a tu cuenta.`, read: false,
      }]);
      emailRetiroRechazado({ nombre: user.nombre, email: user.email, amount });
    } else {
      await supabase.from("notifications").insert([{
        user_id: userId, title: "❌ Recarga rechazada",
        message: `Tu solicitud de recarga por $${amount} fue rechazada. Contáctanos si crees que es un error.`, read: false,
      }]);
      emailRecargaRechazada({ nombre: user.nombre, email: user.email, amount });
    }
  }

  broadcast("transactions", {});
  broadcast("notifications", {});
  res.json({ message: status === "aprobado" ? "Transacción aprobada" : "Transacción rechazada" });
});

// =======================
// 🗑️ ADMIN - ELIMINAR SUGERENCIA DE NOTICIA
// =======================
app.delete("/admin/news-suggestions/:id", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { error } = await supabase.from("news_suggestions").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  broadcast("suggestions", {});
  res.json({ message: "Sugerencia eliminada" });
});

// =======================
// 🗑️ ADMIN - ELIMINAR NOTICIA DE MERCADO
// =======================
app.delete("/admin/market-news/:id", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { error } = await supabase.from("market_news").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  broadcast("news", {});
  res.json({ message: "Noticia eliminada" });
});

// =======================
// ✉️ ADMIN - MARCAR CONTACTO COMO LEÍDO
// =======================
app.put("/admin/contactos/:id/leido", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { error } = await supabase.from("contactos").update({ leido: true }).eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Marcado como leído" });
});

// =======================
// 📷 UPLOAD COMPROBANTE
// =======================

// Detecta el tipo real del archivo por magic bytes (no confiamos en el mimetype del cliente)
function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return { ext: "jpg", mime: "image/jpeg" };
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) return { ext: "png", mime: "image/png" };
  // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return { ext: "webp", mime: "image/webp" };
  return null; // tipo desconocido o no permitido
}

const _multerInstance = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máx (el front ya comprime a ~200KB)
  fileFilter: (_, file, cb) => {
    // Primera línea de defensa: MIME declarado por el cliente
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo se permiten imágenes"));
  },
});

// Wrapper promise para usar multer con Express 5 (async routes)
const parseUpload = (req, res) =>
  new Promise((resolve, reject) => {
    _multerInstance.single("file")(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

app.post("/upload/comprobante", auth, async (req, res) => {
  try {
    await parseUpload(req, res);
  } catch (err) {
    console.error("[upload] Error multer:", err.message);
    return res.status(400).json({ message: err.message || "Error procesando imagen" });
  }

  if (!req.file) return res.status(400).json({ message: "No se recibió imagen" });

  // Segunda línea de defensa: verificar magic bytes del contenido real
  const imageType = detectImageType(req.file.buffer);
  if (!imageType) {
    return res.status(400).json({ message: "El archivo no es una imagen válida (JPEG, PNG o WebP)" });
  }

  const ext = imageType.ext;
  const filename = `${req.userId}_${Date.now()}.${ext}`;

  console.log(`[upload] Subiendo ${filename} (${req.file.size} bytes) a Supabase Storage...`);

  const { data: uploadData, error } = await supabase.storage
    .from("comprobantes")
    .upload(filename, req.file.buffer, {
      contentType: imageType.mime, // usar el tipo detectado por magic bytes, no el del cliente
      upsert: false,
    });

  if (error) {
    console.error("[upload] Error Supabase Storage:", JSON.stringify(error));
    return res.status(500).json({ message: `Error al subir imagen: ${error.message}` });
  }

  const { data: urlData } = supabase.storage.from("comprobantes").getPublicUrl(filename);
  console.log(`[upload] ✅ Subida exitosa: ${urlData.publicUrl}`);
  res.json({ url: urlData.publicUrl });
});

// =======================
// 💸 RECARGA POR TRANSFERENCIA BANCARIA
// =======================
app.post("/transfer", auth, transferRateLimit, async (req, res) => {
  const { amount, transfer_code, comprobante_url } = req.body;
  const transferAmount = parseFloat(amount);

  if (!transferAmount || transferAmount < 1) {
    return res.status(400).json({ message: "Monto mínimo de recarga: 1 punto" });
  }
  if (!comprobante_url) {
    return res.status(400).json({ message: "La foto del comprobante es obligatoria" });
  }

  // Validar URL del comprobante si viene
  if (comprobante_url && typeof comprobante_url !== "string") {
    return res.status(400).json({ message: "URL de comprobante inválida" });
  }

  const { data: userBalance } = await supabase.from("users").select("points, nombre, email").eq("id", req.userId).single();

  const { error } = await supabase.from("transactions").insert({
    user_id: req.userId,
    type: "recarga",
    amount: transferAmount,
    status: "pendiente",
    payment_method: "transferencia",
    transfer_code: transfer_code?.trim() || null,
    comprobante_url: comprobante_url || null,
    balance_before: userBalance ? Number(userBalance.points) : null,
  });

  if (error) return res.status(500).json({ message: error.message });
  broadcast("transactions", {});
  res.json({ message: "Comprobante enviado, será procesado en menos de 24 horas" });

  if (userBalance?.email) {
    emailRecargaTransferencia({
      nombre: userBalance.nombre,
      email: userBalance.email,
      amount: transferAmount,
      transferCode: transfer_code.trim(),
    });
  }
});

// =======================
// 📡 SSE - ENDPOINT
// =======================
const sseConnectionLimit = makeRateLimiter(10, 60 * 1000, "Demasiadas conexiones SSE.");
app.get("/events", sseConnectionLimit, (req, res) => {
  // Validar token si se envía (no obligatorio — los eventos son públicos)
  const rawToken = req.query.token;
  if (rawToken) {
    try { jwt.verify(rawToken, SECRET); }
    catch { return res.status(401).json({ message: "Token inválido" }); }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);
  sseClients.add(res);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    console.log(`SSE cliente desconectado. Total: ${sseClients.size}`);
  });
});

// =======================
// 🏦 CUENTAS BANCARIAS
// =======================
app.get("/bank-accounts", async (req, res) => {
  const { data, error } = await supabase
    .from("bank_accounts").select("*").eq("activo", true).order("created_at", { ascending: true });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.get("/admin/bank-accounts", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { data, error } = await supabase
    .from("bank_accounts").select("*").order("created_at", { ascending: true });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.post("/admin/bank-accounts", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { nombre, titular, cuenta, tipo, cedula } = req.body;
  if (!nombre?.trim() || !cuenta?.trim()) return res.status(400).json({ message: "Nombre y número de cuenta son requeridos" });

  const { data, error } = await supabase.from("bank_accounts").insert([{
    nombre: nombre.trim(),
    titular: titular?.trim() || "",
    cuenta: cuenta.trim(),
    tipo: tipo || "ahorros",
    cedula: cedula?.trim() || "",
    activo: true,
  }]).select().single();

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Banco agregado", bank: data });
});

app.put("/admin/bank-accounts/:id", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { nombre, titular, cuenta, tipo, cedula, activo } = req.body;
  const update = {};
  if (nombre !== undefined) update.nombre = nombre;
  if (titular !== undefined) update.titular = titular;
  if (cuenta !== undefined) update.cuenta = cuenta;
  if (tipo !== undefined) update.tipo = tipo;
  if (cedula !== undefined) update.cedula = cedula;
  if (activo !== undefined) update.activo = activo;

  const { error } = await supabase.from("bank_accounts").update(update).eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Banco actualizado" });
});

app.delete("/admin/bank-accounts/:id", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { error } = await supabase.from("bank_accounts").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Banco eliminado" });
});

// 🤖 BOT NEWS — URLs
// =======================
app.get("/admin/bot/urls", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { data, error } = await supabase
    .from("bot_urls").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.post("/admin/bot/urls", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { url, label, interval_min } = req.body;
  if (!url?.trim()) return res.status(400).json({ message: "URL requerida" });

  try { new URL(url); } catch { return res.status(400).json({ message: "URL inválida" }); }

  const { data, error } = await supabase.from("bot_urls").insert([{
    url: url.trim(),
    label: label?.trim() || new URL(url.trim()).hostname.replace("www.", ""),
    interval_min: interval_min || 15,
    active: true,
  }]).select().single();

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "URL agregada", url: data });
});

app.put("/admin/bot/urls/:id", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { active, interval_min } = req.body;
  const update = {};
  if (active !== undefined) update.active = active;
  if (interval_min !== undefined) update.interval_min = interval_min;

  const { error } = await supabase.from("bot_urls").update(update).eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "URL actualizada" });
});

app.delete("/admin/bot/urls/:id", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { error } = await supabase.from("bot_urls").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "URL eliminada" });
});

app.get("/admin/bot/status", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const status = scheduler.getStatus();
  const { count } = await supabase
    .from("news_suggestions").select("*", { count: "exact", head: true })
    .eq("source", "bot").eq("status", "pending");

  res.json({ ...status, pendingCount: count || 0 });
});

app.post("/admin/bot/run", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const result = await scheduler.runBot();
  res.json({ message: "Bot ejecutado", ...result });
});

app.post("/admin/bot/stop", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const result = scheduler.stopBot();
  res.json(result);
});

app.post("/admin/bot/enable", auth, async (req, res) => {
  const { data: admin } = await supabase.from("users").select("role").eq("id", req.userId).single();
  if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const result = scheduler.enableBot();
  res.json(result);
});

// Inicializar y arrancar el scheduler (init es async: lee bot_enabled de DB)
scheduler.init({
  supabase,
  groqApiKey: process.env.GROQ_API_KEY,
  broadcast,
}).then(() => scheduler.startScheduler());

// Sentry error handler — debe ir ANTES del app.listen y DESPUÉS de todas las rutas
if (process.env.SENTRY_DSN) app.use(Sentry.Handlers.errorHandler());

app.listen(4000, () => {
  console.log("Servidor en https://api.ecuapred.com");
});