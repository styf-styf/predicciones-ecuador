const cron = require("node-cron");
const { scrapeHeadlines } = require("./scraper");

let supabase, groqApiKey, broadcast;
let isRunning = false;
let lastRun = null;
let lastStats = { processed: 0, found: 0, urls: 0, errors: 0 };

function init(deps) {
  supabase = deps.supabase;
  groqApiKey = deps.groqApiKey;
  broadcast = deps.broadcast;
}

async function runBot() {
  if (isRunning) return { message: "Bot ya está corriendo" };
  isRunning = true;
  const stats = { processed: 0, found: 0, urls: 0, errors: 0 };

  try {
    const { data: botUrls } = await supabase
      .from("bot_urls")
      .select("*")
      .eq("active", true);

    if (!botUrls || botUrls.length === 0) {
      isRunning = false;
      return { message: "No hay URLs activas" };
    }

    stats.urls = botUrls.length;
    const now = new Date();

    for (const botUrl of botUrls) {
      if (botUrl.last_checked_at) {
        const lastChecked = new Date(botUrl.last_checked_at);
        const minutesSince = (now.getTime() - lastChecked.getTime()) / 60000;
        if (minutesSince < (botUrl.interval_min || 15)) continue;
      }

      console.log(`[bot] Scraping: ${botUrl.url}`);
      const headlines = await scrapeHeadlines(botUrl.url);
      stats.found += headlines.length;

      await supabase.from("bot_urls")
        .update({ last_checked_at: now.toISOString() })
        .eq("id", botUrl.id);

      for (const headline of headlines) {
        const { data: seen } = await supabase
          .from("bot_seen_urls")
          .select("id")
          .eq("news_url", headline.url)
          .maybeSingle();

        if (seen) continue;

        const { error: seenError } = await supabase
          .from("bot_seen_urls")
          .insert({ news_url: headline.url });

        if (seenError) continue;

        const success = await processWithAI(headline);
        if (success) {
          stats.processed++;
          if (broadcast) broadcast("suggestions", {});
        } else {
          stats.errors++;
        }

        await new Promise(r => setTimeout(r, 1500));
      }
    }

    lastRun = now.toISOString();
    lastStats = stats;
    return stats;
  } catch (err) {
    console.error("[bot] Error:", err.message);
    stats.errors++;
    return stats;
  } finally {
    isRunning = false;
  }
}

async function processWithAI(headline) {
  try {
    const { data: activeMarkets } = await supabase
      .from("markets")
      .select("id, question")
      .eq("resolved", false)
      .limit(30);

    const marketsText = activeMarkets?.map(m => `ID ${m.id}: ${m.question}`).join("\n") || "Ninguno";
    const today = new Date().toISOString().split("T")[0];
    const in5Days = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];

    const prompt = `Eres un experto analista con conocimiento del contexto de Ecuador y Latinoamérica.

Noticia detectada automáticamente:
Título: ${headline.title}
URL: ${headline.url}
Fuente: ${headline.source}
Fecha de hoy: ${today}

Mercados activos (para evitar duplicados):
${marketsText}

Responde SOLO en JSON sin markdown:
{
  "new_market_question": "pregunta verificable con Sí/No que cierre entre 1 y 5 días, o null si la noticia no lo amerita",
  "probability_yes": número 0-100,
  "probability_no": número 0-100,
  "probability_reasoning": "explicación breve en 1 oración",
  "suggested_close_date": "fecha YYYY-MM-DD entre ${today} y ${in5Days}",
  "impact": "alto o medio o bajo",
  "summary": "resumen en 1-2 oraciones"
}

Reglas:
- Solo genera pregunta si la noticia es relevante (economía, política, deporte, farándula, finanzas)
- La pregunta no debe duplicar mercados activos
- Si la noticia es trivial, devuelve null en new_market_question`;

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
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
    try { parsed = JSON.parse(clean); } catch { return false; }

    if (!parsed.new_market_question) return false;

    await supabase.from("news_suggestions").insert({
      title: headline.title,
      url: headline.url,
      summary: parsed.summary || null,
      new_market_question: parsed.new_market_question,
      probability_yes: parsed.probability_yes ?? null,
      probability_no: parsed.probability_no ?? null,
      probability_reasoning: parsed.probability_reasoning || null,
      suggested_close_date: parsed.suggested_close_date || null,
      impact: parsed.impact || null,
      resolves_market_id: null,
      resolves_as: null,
      source: "bot",
      status: "pending",
    });

    console.log(`[bot] ✅ ${parsed.new_market_question}`);
    return true;
  } catch (err) {
    console.error("[bot] Error procesando:", headline.title, "-", err.message);
    return false;
  }
}

function startScheduler() {
  cron.schedule("* * * * *", async () => {
    await runBot();
  });
  console.log("[bot] Scheduler iniciado — revisando cada minuto");
}

function getStatus() {
  return { isRunning, lastRun, ...lastStats };
}

module.exports = { init, runBot, startScheduler, getStatus };
