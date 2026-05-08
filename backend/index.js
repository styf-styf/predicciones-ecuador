require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("./supabase");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "postmessage"
);

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("JWT_SECRET no está definido en .env");

// =======================
// 🔐 Middleware auth
// =======================
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
};

// =======================
// 👤 REGISTRO
// =======================
app.post("/register", async (req, res) => {
  const { email, password, nombre, apellido, cedula, celular, ciudad, direccion, pais } = req.body;

  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({ message: "Email y contraseña son obligatorios" });
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

  res.json({ message: "Usuario registrado correctamente" });
});

// =======================
// 🔑 LOGIN
// =======================
app.post("/login", async (req, res) => {
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
    { id: data.id, role: data.role, points: data.points },
    SECRET, { expiresIn: "7d" }
  );

  return res.json({
    token,
    user: { id: data.id, email: data.email, role: data.role, points: data.points },
  });
});

// =======================
// 🔵 LOGIN CON GOOGLE
// =======================
app.post("/auth/google", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: "Código de Google requerido" });

  try {
    const { tokens } = await googleClient.getToken({ code, redirect_uri: "postmessage" });

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
        .from("config").select("welcome_points").eq("id", 1).single();

      const welcomePoints = config?.welcome_points ?? 100;

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
          points: welcomePoints,
          pais: "Ecuador",
        }])
        .select()
        .single();

      if (error) return res.status(500).json({ message: error.message });
      user = newUser;
    }

    if (user.provider === "local") {
      return res.status(400).json({ message: "Este correo ya está registrado con email y contraseña" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, points: user.points },
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
    .from("config").select("min_bet, max_bet, commission, banco_nombre, banco_tipo, banco_cuenta, banco_titular, banco_cedula").eq("id", 1).single();
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
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

const { error } = await supabase
  .from("users")
  .update({ nombre, apellido, cedula, celular, pais: "Ecuador", ciudad, direccion, banco, numero_cuenta, tipo_cuenta, provincia })
  .eq("id", req.userId);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Perfil actualizado" });
});

app.get("/my-bets", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("bets")
    .select(`id, type, amount, created_at, markets ( question )`)
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

app.get("/ranking", async (req, res) => {
  const { data, error } = await supabase
    .from("users").select("email,points,nombre,apellido")
    .order("points", { ascending: false }).limit(100);

  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});



app.get("/markets", async (req, res) => {
  const { data, error } = await supabase
    .from("markets").select("*, bets(count)").order("id", { ascending: false });

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
      const day = new Date(item[field]).toLocaleDateString("es-EC", {
        month: "short", day: "numeric"
      });
      map[day] = (map[day] || 0) + 1;
    });
    return map;
  };

  const groupAmountByDay = (items) => {
    const map = {};
    items?.forEach((item) => {
      const day = new Date(item.created_at).toLocaleDateString("es-EC", {
        month: "short", day: "numeric"
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
    return d.toLocaleDateString("es-EC", { month: "short", day: "numeric" });
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

  console.log("ADMIN:", admin, "ERROR:", adminError);

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { data, error } = await supabase
    .from("config").select("*").eq("id", 1).single();

  console.log("CONFIG DATA:", data, "CONFIG ERROR:", error);

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.put("/admin/settings", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { min_bet, max_bet, commission, welcome_points, trending_count, winners_count, autoplay_ms, banco_nombre, banco_tipo, banco_cuenta, banco_titular, banco_cedula } = req.body;

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
    commission,
    welcome_points,
    trending_count,
    winners_count,
    autoplay_ms,
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

  const { error } = await supabase
    .from("users").update({ role }).eq("id", req.params.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Rol actualizado" });
});

app.put("/admin/users/:id/points", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { points } = req.body;
  if (isNaN(points)) return res.status(400).json({ message: "Puntos inválidos" });

  const { data: user } = await supabase
    .from("users").select("points").eq("id", req.params.id).single();

  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

  const newPoints = Number(user.points) + Number(points);
  if (newPoints < 0) {
    return res.status(400).json({ message: "El usuario no puede tener puntos negativos" });
  }

  const { error } = await supabase
    .from("users").update({ points: newPoints }).eq("id", req.params.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Puntos actualizados", newPoints });
});

app.put("/admin/users/:id/suspend", auth, async (req, res) => {
  const { data: admin } = await supabase
    .from("users").select("role").eq("id", req.userId).single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { suspended } = req.body;

  const { error } = await supabase
    .from("users").update({ suspended }).eq("id", req.params.id);

  if (error) return res.status(500).json({ message: error.message });
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
    .order("created_at", { ascending: false });

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
app.post("/bet", auth, async (req, res) => {
  const { marketId, type, amount } = req.body;
  const betAmount = parseFloat(amount);

  const { data: config } = await supabase
    .from("config").select("min_bet, max_bet").eq("id", 1).single();

  const minBet = config?.min_bet ?? 1;
  const maxBet = config?.max_bet ?? 10;

  if (isNaN(betAmount) || betAmount < minBet || betAmount > maxBet) {
    return res.status(400).json({
      message: `El monto debe ser entre ${minBet} y ${maxBet} puntos`
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

  // ✅ Validar máximo 3 cambios (4 apuestas en total: la original + 3 cambios)
  if (existingBet) {
    const changes = existingBet.changes ?? 0;
    if (changes >= 3) {
      return res.status(400).json({ message: "Alcanzaste el límite de 3 cambios de predicción" });
    }
  }

  // ✅ Calcular diferencia de puntos a descontar
  // Si ya tenía apuesta, se le devuelve lo anterior y se cobra lo nuevo
  const previousAmount = existingBet ? Number(existingBet.amount) : 0;
  const pointsDiff = betAmount - previousAmount;

  if (user.points < pointsDiff) {
    return res.status(400).json({ message: "Sin puntos suficientes" });
  }

  // ✅ Actualizar puntos del usuario (solo la diferencia)
  const newPoints = Number(user.points) - pointsDiff;
  await supabase.from("users").update({ points: newPoints }).eq("id", user.id);

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
  if (existingBet) {
    await supabase.from("bets")
      .update({
        type,
        amount: betAmount,
        changes: (existingBet.changes ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingBet.id);
  } else {
    await supabase.from("bets").insert([{
      user_id: user.id,
      market_id: marketId,
      type,
      amount: betAmount,
      changes: 0,
    }]);
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

console.log("Snapshot guardado:", { marketId, yes_pct: ((Number(updatedMarket.yes) / total) * 100).toFixed(1), no_pct: ((Number(updatedMarket.no) / total) * 100).toFixed(1) });

res.json({ message: "Apuesta realizada", points: newPoints, market: updatedMarket });
});
// =======================
// 💰 RESOLVER MERCADO
// =======================
app.post("/admin/resolve/:id", auth, async (req, res) => {
  const { winner } = req.body;
  const marketId = Number(req.params.id);

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

  const { data: allBets } = await supabase
    .from("bets").select("*").eq("market_id", marketId);

  if (!allBets || allBets.length === 0) {
    await supabase.from("markets").update({ resolved: true, winner }).eq("id", marketId);
    return res.json({ message: "Mercado resuelto, no hubo apuestas" });
  }

  const winningBets = allBets.filter((b) => b.type === winner);
  const losingBets = allBets.filter((b) => b.type !== winner);
  const losingPool = losingBets.reduce((sum, b) => sum + Number(b.amount), 0);
  const winningPool = winningBets.reduce((sum, b) => sum + Number(b.amount), 0);

  if (winningBets.length === 0) {
    await supabase.from("markets").update({ resolved: true, winner }).eq("id", marketId);
    return res.json({ message: "Mercado resuelto, pero no hubo ganadores" });
  }

  let totalCommission = 0;

  for (const bet of winningBets) {
    const amount = Number(bet.amount);
    const participation = amount / winningPool;
    const grossProfit = losingPool * participation;
    const commission = grossProfit * COMMISSION;
    totalCommission += commission;
    const netProfit = grossProfit - commission;
    const payout = amount + netProfit;

    const { data: user } = await supabase
      .from("users").select("points").eq("id", bet.user_id).single();

    await supabase.from("users")
      .update({ points: Number(user.points) + payout })
      .eq("id", bet.user_id);

    await supabase.from("notifications").insert([{
      user_id: bet.user_id,
      title: "🎉 Ganaste una apuesta",
      message: `Apostaste ${amount} pts • Utilidad bruta: ${grossProfit.toFixed(2)} pts • Comisión (${config?.commission ?? 3}%): ${commission.toFixed(2)} pts • Total recibido: ${payout.toFixed(2)} pts`,
      read: false,
    }]);

    await supabase.from("winners").insert([{
      user_id: bet.user_id,
      market_id: marketId,
      prediction: winner,
      reward: parseFloat(payout.toFixed(2)),
    }]);
  }

  await supabase.from("markets").update({ resolved: true, winner }).eq("id", marketId);

  res.json({
    message: `Mercado resuelto. Comisión total plataforma: ${totalCommission.toFixed(2)} pts`
  });
});

// =======================
// 👑 ADMIN - CREAR MERCADO
// =======================
app.post("/admin/markets", auth, async (req, res) => {
  const { question, category } = req.body;
  const { error } = await supabase.from("markets").insert([{ question, category: category || "general" }]);
  if (error) return res.status(400).json({ message: error.message });

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
  res.json({ message: "Categoría actualizada" });
});

// =======================
// ❤️ FAVORITOS
// =======================
app.get("/favorites", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("favorites").select("market_id").eq("user_id", req.userId);
  console.log("favorites data:", data, "error:", error, "userId:", req.userId);
  if (error) return res.status(500).json({ message: error.message });
  res.json(data.map((f) => f.market_id));
});

app.post("/favorites/:marketId", auth, async (req, res) => {
  const marketId = Number(req.params.marketId);

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
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: "Error" });
  res.json(data);
});

app.post("/markets/:id/comments", auth, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content || content.trim() === "") return res.status(400).json({ message: "Comentario vacío" });

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
  res.json(data);
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
  console.log("Prepare recibido:", { amount, clientTransactionId, userId: req.userId });
  if (!amount || !clientTransactionId) return res.status(400).json({ message: "Datos inválidos" });

  const { data, error } = await supabase.from("transactions").insert([{
    user_id: req.userId,
    type: "recarga",
    amount: parseFloat(amount),
    status: "pendiente",
    reference: clientTransactionId,
  }]);

  console.log("Insert resultado:", { data, error });
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

    console.log("Transacción encontrada:", transaction, "Error:", txError);

    if (!transaction) {
      console.log("Transacción ya procesada o no encontrada:", clientTransactionId);
      return;
    }

    // Marcar como procesando ANTES de sumar puntos para evitar doble procesamiento
    const { error: lockError } = await supabase
      .from("transactions")
      .update({ status: "procesando" })
      .eq("reference", clientTransactionId)
      .eq("status", "pendiente");

    if (lockError || !lockError === null) {
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
      .from("users").select("points").eq("id", transaction.user_id).single();

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
      message: `Se acreditaron ${transaction.amount} puntos a tu cuenta.`,
      read: false,
    }]);
  } catch (err) {
    console.error("Error procesando pago:", err);
  }
}




// =======================
// 💳 PAYPHONE - CALLBACK
// =======================
app.get("/payphone/callback", async (req, res) => {
  const { clientTransactionId, id } = req.query;
  console.log("Payphone callback GET:", req.query);

  if (!id) {
    return res.redirect("https://predicciones-ecuador.vercel.app/panel?status=cancelado");
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
      return res.redirect("https://predicciones-ecuador.vercel.app/panel?status=exitoso");
    }

    await procesarPagoPayphone(transaction.reference, String(id));
    return res.redirect("https://predicciones-ecuador.vercel.app/panel?status=exitoso");
  } catch (err) {
    console.error("Error procesando pago:", err);
    return res.redirect("https://predicciones-ecuador.vercel.app/panel?status=exitoso");
  }
});

app.post("/payphone/callback", async (req, res) => {
  const { clientTransactionId, transactionStatus, id, amount } = req.body;
  console.log("Payphone callback body:", req.body);

  console.log("Payphone callback:", req.body);

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
    console.log("Payphone verify raw:", rawText.slice(0, 500));
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
      message: `Se acreditaron ${transaction.amount} puntos a tu cuenta.`,
      read: false,
    }]);

    res.json({ message: "Pago procesado correctamente" });
  } catch (err) {
    console.error("Error verificando pago:", err);
    res.status(500).json({ message: "Error verificando pago" });
  }
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
console.log("Respuesta Groq completa:", JSON.stringify(aiData, null, 2));
const rawText = aiData.choices?.[0]?.message?.content || "{}";
console.log("Respuesta IA raw:", rawText);
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

  if (action === "approve_market" && suggestion.new_market_question) {
  console.log("Sugerencia completa:", JSON.stringify(suggestion, null, 2));
  
  const { data: newMarket, error: marketError } = await supabase.from("markets").insert([{
    question: suggestion.new_market_question,
    news_title: suggestion.title || null,
    news_url: suggestion.url || null,
    news_summary: suggestion.summary || null,
    news_source: suggestion.url ? new URL(suggestion.url).hostname.replace("www.", "") : null,
    news_date: new Date().toISOString().split("T")[0],
  }]).select().single();

  console.log("Mercado creado:", JSON.stringify(newMarket, null, 2));
  console.log("Error mercado:", JSON.stringify(marketError, null, 2));

  await supabase.from("news_suggestions").update({ status: "approved" }).eq("id", suggestionId);
  return res.json({ message: "Mercado creado ✅" });
}

  if (action === "approve_resolve" && suggestion.resolves_market_id) {
    // Reutiliza la lógica de resolución llamando internamente
    const resolveRes = await fetch(`https://predicciones-ecuador.onrender.com/admin/resolve/${suggestion.resolves_market_id}`, {
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
// ✏️ EDITAR MERCADO
// =======================
app.put("/admin/markets/:id", auth, async (req, res) => {
  const { data: user } = await supabase
    .from("users").select("role").eq("id", req.userId).single();
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { question } = req.body;
  if (!question?.trim()) return res.status(400).json({ message: "Pregunta vacía" });

  const { error } = await supabase
    .from("markets").update({ question }).eq("id", req.params.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Mercado actualizado ✅" });
});

// =======================
// 💸 SOLICITAR RETIRO
// =======================
app.post("/withdrawal", auth, async (req, res) => {
  const { amount, method } = req.body;
  const withdrawAmount = parseFloat(amount);

  if (!withdrawAmount || withdrawAmount < 10) {
    return res.status(400).json({ message: "Monto mínimo de retiro: 10 puntos" });
  }

  const { data: user } = await supabase
    .from("users").select("*").eq("id", req.userId).single();

  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
  if (user.points < withdrawAmount) return res.status(400).json({ message: "Saldo insuficiente" });
  if (!user.banco || !user.numero_cuenta || !user.tipo_cuenta) {
    return res.status(400).json({ message: "Completa tus datos bancarios en tu perfil" });
  }

  // Operación atómica: descontar puntos + crear transacción
  const newPoints = Number(user.points) - withdrawAmount;

  const { error: pointsError } = await supabase
    .from("users").update({ points: newPoints }).eq("id", req.userId);

  if (pointsError) return res.status(500).json({ message: "Error al procesar" });

  const { error: txError } = await supabase.from("transactions").insert({
    user_id: req.userId,
    type: "retiro",
    amount: withdrawAmount,
    status: "pendiente",
    payment_method: method || "transferencia",
    transfer_code: null,
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
  res.json({ message: archived ? "Mercado archivado" : "Mercado restaurado" });
});

app.listen(4000, () => {
  console.log("Servidor en https://predicciones-ecuador.onrender.com");
});