require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("./supabase");


const app = express();

app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET no está definido en .env");
}

// =======================
// 🔐 Middleware auth
// =======================
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No autorizado" });
  }

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
  const {
    email,
    password,
    nombre,
    apellido,
    cedula,
    celular,
    ciudad,
    direccion,
    pais,
  } = req.body;

  // 🔴 validación básica
  if (!email || !password) {
    return res.status(400).json({
      message: "Email y contraseña son obligatorios",
    });
  }

  if (email.trim() === "" || password.trim() === "") {
    return res.status(400).json({
      message: "No se permiten campos vacíos",
    });
  }

  // 🔥 evitar usuarios duplicados
  const { data: existing, error: checkError } = await supabase
  .from("users")
  .select("id")
  .eq("email", email)
  .maybeSingle();

 if (checkError) {
  return res.status(500).json({ message: checkError.message });
 }

 if (existing) {
  return res.status(400).json({ message: "El usuario ya existe" });
 }

  const hashedPassword = await bcrypt.hash(password, 10);

  const { error } = await supabase.from("users").insert([
    {
      email,
      password: hashedPassword,
      nombre,
      apellido,
      cedula,
      celular,
      ciudad,
      direccion,
      pais: pais || "Ecuador",
      role: "user",
      points: 0,
    },
  ]);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.json({ message: "Usuario registrado correctamente" });
 });

// =======================
// 🔑 LOGIN
// =======================
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) {
    return res.status(400).json({ message: "Usuario no encontrado" });
  }

  const validPassword = await bcrypt.compare(password, data.password);
  if (!validPassword) {
    return res.status(400).json({ message: "Contraseña incorrecta" });
  }

  const token = jwt.sign(
  {
    id: data.id,
    role: data.role,
    points: data.points
  },
  SECRET,
  { expiresIn: "7d" }
 );

  res.json({
    message: "Login exitoso",
    token,
    points: data.points,
    role: data.role
  });
});

app.post("/auth/google", async (req, res) => {
  const { email, nombre } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email requerido" });
  }

  const { data: existing, error: checkError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (checkError) {
    return res.status(500).json({ message: checkError.message });
  }

  if (existing) {
  const token = jwt.sign(
    {
      id: existing.id,
      role: existing.role,
      points: existing.points,
    },
    SECRET,
    { expiresIn: "7d" }
  );

  return res.json({
    message: "Login Google exitoso",
    token,
    user: existing,
  });
}

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        email,
        nombre: nombre || "",
        role: "user",
        points: 0,
      },
    ])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.json({ message: "Usuario creado", user: data });
 });


// =======================
// 📊 OBTENER MERCADOS
// =======================
app.get("/markets", async (req, res) => {
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  res.json(data);
});

app.get("/me", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("id,email,points,role,created_at")
    .eq("id", req.userId)
    .single();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.json(data);
});

app.get("/my-bets", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("bets")
    .select(`
      id,
      type,
      amount,
      created_at,
      markets (
        question
      )
    `)
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.json(data);
});

app.get("/ranking", async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("email,points")
    .order("points", { ascending: false })
    .limit(10);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.json(data);
});

app.get("/admin/winners", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Solo admin" });
    }

    const { data, error } = await supabase
      .from("winners")
      .select(`
        id,
        prediction,
        reward,
        created_at,
        users (
          email
        ),
        markets (
          question
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return res.status(500).json({ message: "Error cargando winners" });
    }

    res.json(data);

  } catch (err) {
    res.status(401).json({ message: "Token inválido" });
  }
});

app.put("/notifications/read", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });

  try {
    const decoded = jwt.verify(token, SECRET);

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", decoded.id)
      .eq("read", false);

    if (error) throw error;

    res.json({ message: "Notificaciones leídas" });
  } catch (err) {
    res.status(401).json({ message: "Token inválido" });
  }
});

app.post("/admin/resolve/:id", auth, async (req, res) => {
  console.log("ENTRÓ A RESOLVE");
  const { winner } = req.body;
  const marketId = Number(req.params.id);

  // validar admin
  const { data: admin } = await supabase
    .from("users")
    .select("*")
    .eq("id", req.userId)
    .single();

  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  // mercado
  const { data: market } = await supabase
    .from("markets")
    .select("*")
    .eq("id", marketId)
    .single();

  if (!market) {
    return res.status(404).json({ message: "Mercado no encontrado" });
  }

  if (market.resolved) {
    return res.status(400).json({ message: "Mercado ya resuelto" });
  }

  // apuestas ganadoras
  const { data: allBets } = await supabase
  .from("bets")
  .select("*");

console.log("TODAS LAS APUESTAS:", allBets);

const { data: winners, error: winnersError } = await supabase
  .from("bets")
  .select("*")
  .eq("market_id", marketId)
  .eq("type", winner);

console.log("MARKET ID:", marketId, typeof marketId);
console.log("WINNER:", winner);
console.log("GANADORES:", winners);
console.log("ERROR WINNERS:", winnersError);

console.log("TODAS LAS APUESTAS:", allBets);
console.log("WINNER ELEGIDO:", winner);

if (!winners || winners.length === 0) {
  await supabase
    .from("markets")
    .update({
      resolved: true,
      winner
    })
    .eq("id", marketId);

  return res.json({
    message: "Mercado resuelto, pero no hubo ganadores"
  });
}

    for (const bet of winners) {
  const reward = bet.amount * 2;
  

  // Obtener puntos actuales del usuario ganador
  const { data: winnerUser } = await supabase
    .from("users")
    .select("points")
    .eq("id", bet.user_id)
    .single();

  // Sumar premio
  await supabase
    .from("users")
    .update({
      points: winnerUser.points + reward
    })
    .eq("id", bet.user_id);

  // Crear notificación
  await supabase.from("notifications").insert([
{
 user_id: bet.user_id,
 title: "🎉 Ganaste una apuesta",
 message: `Recibiste ${reward} puntos en ${market.question}`,
 read: false
}
]);

  // Guardar historial de ganador
  await supabase.from("winners").insert([
    {
      user_id: bet.user_id,
      market_id: marketId,
      prediction: winner,
      reward: reward
    }
  ]);
}

  // cerrar mercado
  await supabase
    .from("markets")
    .update({
      resolved: true,
      winner
    })
    .eq("id", marketId);

  res.json({ message: "Mercado resuelto y premios pagados" });

  
});

app.get("/notifications", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ message: error.message });

  res.json(data);
});

app.put("/notifications/:id/read", auth, async (req, res) => {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", req.params.id)
    .eq("user_id", req.userId);

  if (error) return res.status(400).json({ message: error.message });

  res.json({ message: "Leída" });
});



// =======================
// 💰 APOSTAR
// =======================
app.post("/bet", auth, async (req, res) => {
  const { marketId, type } = req.body;

  // 🔍 Obtener usuario
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", req.userId)
    .single();

  if (userError || !user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  if (user.points < 10) {
    return res.status(400).json({ message: "Sin puntos suficientes" });
  }

  // 🔍 Obtener mercado
  const { data: market, error: marketError } = await supabase
  .from("markets")
  .select("*")
  .eq("id", marketId)
  .single();

if (marketError || !market) {
  return res.status(404).json({ message: "Mercado no encontrado" });
}

if (market.resolved) {
  return res.status(400).json({
    message: "Este mercado ya está cerrado"
  });
}

  

  // 💸 Actualizar puntos usuario
  const newPoints = user.points - 10;

  await supabase
    .from("users")
    .update({ points: newPoints })
    .eq("id", user.id);

  // 📊 Actualizar mercado
  let updatedValues = {};

  if (type === "yes") {
    updatedValues = { yes: market.yes + 10 };
  } else {
    updatedValues = { no: market.no + 10 };
  }

  await supabase
    .from("markets")
    .update(updatedValues)
    .eq("id", marketId);

  // 🧾 Guardar apuesta
  await supabase.from("bets").insert([
    {
      user_id: user.id,
      market_id: marketId,
      type,
      amount: 10,
    },
  ]);

  // 🔄 Obtener mercado actualizado
  const { data: updatedMarket } = await supabase
    .from("markets")
    .select("*")
    .eq("id", marketId)
    .single();

  res.json({
    message: "Apuesta realizada",
    points: newPoints,
    market: updatedMarket,
  });
});


// =======================
// 👑 ADMIN - CREAR MERCADO
// =======================
app.post("/admin/markets", auth, async (req, res) => {
  const { question } = req.body;

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", req.userId)
    .single();

  if (userError || !user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  if (user.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { error } = await supabase
    .from("markets")
    .insert([{ question }]);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.json({ message: "Mercado creado" });
});

// =======================
// 🗑️ ADMIN - ELIMINAR MERCADO
// =======================
app.delete("/admin/markets/:id", auth, async (req, res) => {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", req.userId)
    .single();

  if (userError || !user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  if (user.role !== "admin") {
    return res.status(403).json({ message: "Solo admin" });
  }

  const { error } = await supabase
    .from("markets")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.json({ message: "Mercado eliminado" });
});

// =======================
// 🧪 TEST
// =======================
app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

// =======================
app.listen(4000, () => {
  console.log("Servidor en https://predicciones-ecuador.onrender.com");
});