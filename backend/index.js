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

// =======================
// 📊 OBTENER MERCADOS
// =======================
app.get("/markets", async (req, res) => {
  const { data, error } = await supabase
    .from("markets").select("*").order("id", { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.get("/me", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("users").select("id,email,points,role,created_at")
    .eq("id", req.userId).single();

  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
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
    .from("users").select("email,points")
    .order("points", { ascending: false }).limit(10);

  if (error) return res.status(400).json({ message: error.message });
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

  // Apuestas por día (últimos 7 días)
  const { data: bets } = await supabase
    .from("bets")
    .select("amount, created_at")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  // Usuarios registrados por día (últimos 7 días)
  const { data: users } = await supabase
    .from("users")
    .select("created_at")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  // Agrupar por día
  const groupByDay = (items: any[], field = "created_at") => {
    const map: { [key: string]: number } = {};
    items?.forEach((item) => {
      const day = new Date(item[field]).toLocaleDateString("es-EC", {
        month: "short", day: "numeric"
      });
      map[day] = (map[day] || 0) + 1;
    });
    return map;
  };

  const groupAmountByDay = (items: any[]) => {
    const map: { [key: string]: number } = {};
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

  // Generar últimos 7 días
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

  const { min_bet, max_bet, commission, welcome_points } = req.body;

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

  // ✅ betAmount correctamente definido
  const betAmount = parseFloat(amount);

  // ✅ Obtener límites desde config
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
  if (user.points < betAmount) return res.status(400).json({ message: "Sin puntos suficientes" });

  const { data: market, error: marketError } = await supabase
    .from("markets").select("*").eq("id", marketId).single();

  if (marketError || !market) return res.status(404).json({ message: "Mercado no encontrado" });
  if (market.resolved) return res.status(400).json({ message: "Este mercado ya está cerrado" });

  const newPoints = Number(user.points) - betAmount;
  await supabase.from("users").update({ points: newPoints }).eq("id", user.id);

  const updatedValues = type === "yes"
    ? { yes: Number(market.yes) + betAmount }
    : { no: Number(market.no) + betAmount };

  await supabase.from("markets").update(updatedValues).eq("id", marketId);

  await supabase.from("bets").insert([{
    user_id: user.id, market_id: marketId, type, amount: betAmount,
  }]);

  const { data: updatedMarket } = await supabase
    .from("markets").select("*").eq("id", marketId).single();

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
  const { question } = req.body;

  const { data: user, error: userError } = await supabase
    .from("users").select("*").eq("id", req.userId).single();

  if (userError || !user) return res.status(404).json({ message: "Usuario no encontrado" });
  if (user.role !== "admin") return res.status(403).json({ message: "Solo admin" });

  const { error } = await supabase.from("markets").insert([{ question }]);
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

// =======================
// 🧪 TEST
// =======================
app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

app.listen(4000, () => {
  console.log("Servidor en https://predicciones-ecuador.onrender.com");
});