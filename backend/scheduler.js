const cron = require("node-cron");
const { scrapeHeadlines, scrapeArticleContent } = require("./scraper");

// Sitios de noticias ecuatorianos — se procesan todos sus artículos recientes
const ECUADOR_SITES = [
  "elcomercio.com", "eluniverso.com", "expreso.ec", "lahora.com.ec",
  "primicias.ec", "metroecuador.com", "telegrafo.com.ec", "extra.ec",
  "vistazo.com", "ecuavisa.com", "teleamazonas.com", "rts.com.ec",
  "gkillcity.com", "planv.com.ec", "confirmado.net", "eltelegrafo.com.ec",
  "ecuadorenvivo.com", "eldiario.ec", "ciudadanodigital.ec",
];

// Palabras clave Ecuador para filtrar sitios internacionales
const ECUADOR_KEYWORDS = [
  "ecuador", "ecuatoriano", "ecuatoriana", "ecuatorianos", "ecuatorianas",
  "quito", "guayaquil", "cuenca", "loja", "manta", "ambato",
  "riobamba", "esmeraldas", "ibarra", "latacunga", "santo domingo",
  "noboa", "correa", "petroecuador", "banco central del ecuador",
  "asamblea nacional", "iess", "senae", "conaie", "pachakutik",
  "galápagos", "galapagos",
];

// Devuelve true si el artículo fue publicado hace menos de 48 horas
function isRecent(articleUrl) {
  const patterns = [
    /\/(\d{4})\/(\d{2})\/(\d{2})\//,         // /2026/05/11/
    /\/(\d{4})-(\d{2})-(\d{2})[-/]/,          // /2026-05-11-
    /\/(\d{4})(\d{2})(\d{2})[-/]/,            // /20260511/
    /[?&]date=(\d{4})-(\d{2})-(\d{2})/,       // ?date=2026-05-11
    /-(\d{4})-(\d{2})-(\d{2})-/,              // -2026-05-11-
  ];

  for (const pattern of patterns) {
    const m = articleUrl.match(pattern);
    if (m) {
      const articleDate = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
      const hoursSince = (Date.now() - articleDate.getTime()) / 3_600_000;
      return hoursSince <= 48;
    }
  }
  // Si la URL no tiene fecha reconocible, se permite (no podemos saber)
  return true;
}

// Secciones de portada que cubren noticias locales ecuatorianas
const ECUADOR_SECTIONS = [
  "/ecuador/", "/pais/", "/politica/", "/economia/", "/sociedad/",
  "/deportes/", "/farandula/", "/entretenimiento/", "/quito/", "/guayaquil/",
  "/seguridad/", "/judicial/", "/negocios/", "/local/",
];

// Devuelve true si el artículo es relevante para Ecuador
function isRelevant(headline, sourceUrl) {
  const title = headline.title.toLowerCase();
  const articleUrl = (headline.url || "").toLowerCase();

  // Si el título menciona Ecuador directamente → relevante siempre
  if (ECUADOR_KEYWORDS.some(kw => title.includes(kw))) return true;

  try {
    const domain = new URL(sourceUrl).hostname.replace("www.", "");
    if (ECUADOR_SITES.some(site => domain.includes(site))) {
      // Sitio ecuatoriano: aceptar solo si la URL del artículo es de una sección local
      return ECUADOR_SECTIONS.some(sec => articleUrl.includes(sec));
    }
  } catch { /* ignorar */ }

  return false;
}

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
        // Filtro 1: solo artículos recientes (< 48h)
        if (!isRecent(headline.url)) {
          console.log(`[bot] Saltando (antiguo): ${headline.title.slice(0, 60)}`);
          continue;
        }

        // Filtro 2: solo Ecuador (para sitios internacionales)
        if (!isRelevant(headline, botUrl.url)) {
          console.log(`[bot] Saltando (no Ecuador): ${headline.title.slice(0, 60)}`);
          continue;
        }

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
    // Leer el artículo completo para darle contexto real a la IA
    console.log(`[bot] Leyendo artículo: ${headline.url}`);
    const articleContent = await scrapeArticleContent(headline.url);

    const { data: activeMarkets } = await supabase
      .from("markets")
      .select("id, question")
      .eq("resolved", false)
      .limit(30);

    const marketsText = activeMarkets?.map(m => `ID ${m.id}: ${m.question}`).join("\n") || "Ninguno";
    const today = new Date().toISOString().split("T")[0];
    const in5Days = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];

    const contentSection = articleContent
      ? `\nContenido del artículo (primeras ~500 palabras):\n${articleContent}`
      : "\nContenido del artículo: No disponible (usar solo el título)";

    const prompt = `Eres un experto analista con conocimiento del contexto de Ecuador y Latinoamérica.

Noticia detectada automáticamente:
Título: ${headline.title}
URL: ${headline.url}
Fuente: ${headline.source}
Fecha de hoy: ${today}
${contentSection}

Mercados activos (para evitar duplicados):
${marketsText}

Responde SOLO en JSON sin markdown:
{
  "new_market_question": "pregunta verificable con Sí/No que cierre entre 1 y 5 días, o null si la noticia no lo amerita",
  "probability_yes": número 0-100,
  "probability_no": número 0-100,
  "probability_reasoning": "explicación breve en 1 oración basada en el contenido del artículo",
  "suggested_close_date": "fecha YYYY-MM-DD entre ${today} y ${in5Days}",
  "impact": "alto o medio o bajo",
  "category": "una de estas opciones exactas: deporte, farandula, politica, elecciones, pais, general",
  "summary": "resumen del artículo en 1-2 oraciones con los datos más relevantes"
}

Reglas:
- CRÍTICO: Solo genera pregunta si el evento ocurre EN Ecuador o afecta DIRECTAMENTE a Ecuador o a ecuatorianos. Si la noticia es sobre otro país (España, Colombia, EE.UU., etc.) y Ecuador no es el actor principal, devuelve null en new_market_question
- Usa el contenido del artículo para hacer la pregunta lo más específica posible (nombres, cifras, fechas)
- Solo genera pregunta si la noticia es relevante (economía, política, deporte, farándula, finanzas)
- La pregunta no debe duplicar mercados activos
- Si la noticia es trivial o no involucra a Ecuador, devuelve null en new_market_question
- category debe ser una de las 6 opciones exactas, elige según el tema principal de la noticia`;

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

    const VALID_CATEGORIES = ["deporte", "farandula", "politica", "elecciones", "pais", "general"];
    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "general";

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
      category,
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

async function checkClosingMarkets() {
  try {
    const now = new Date().toISOString();

    const { data: closingMarkets } = await supabase
      .from("markets")
      .select("*")
      .eq("resolved", false)
      .not("closes_at", "is", null)
      .lte("closes_at", now);

    if (!closingMarkets || closingMarkets.length === 0) return;

    for (const market of closingMarkets) {
      // Evitar procesar el mismo mercado dos veces
      const { data: existing } = await supabase
        .from("news_suggestions")
        .select("id")
        .eq("resolves_market_id", market.id)
        .eq("source", "bot_close")
        .maybeSingle();

      if (existing) continue;

      console.log(`[bot] Analizando cierre: ${market.question}`);
      await analyzeMarketClose(market);
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (err) {
    console.error("[bot] Error en checkClosingMarkets:", err.message);
  }
}

async function analyzeMarketClose(market) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const fromDate = market.created_at ? market.created_at.split("T")[0] : today;
    let newsContext = "";
    let sourceUrls = [];

    // Buscar en internet con Tavily desde la fecha de creación del mercado
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
      try {
        const query = `Ecuador ${market.question}`;
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query,
            search_depth: "advanced",
            max_results: 5,
            include_answer: true,
            include_domains: [],
            from_date: fromDate,
          }),
          signal: AbortSignal.timeout(20000),
        });

        const tavilyData = await tavilyRes.json();

        if (tavilyData.results?.length > 0) {
          sourceUrls = tavilyData.results.map(r => r.url);
          newsContext = tavilyData.results
            .map(r => `Fuente: ${r.url}\nTítulo: ${r.title}\nContenido: ${r.content?.slice(0, 600) || ""}`)
            .join("\n\n---\n\n");
        }

        // Tavily puede dar una respuesta directa
        if (tavilyData.answer) {
          newsContext = `Resumen de búsqueda: ${tavilyData.answer}\n\n---\n\n${newsContext}`;
        }

        console.log(`[bot] Tavily encontró ${tavilyData.results?.length || 0} resultados para: ${market.question}`);
      } catch (err) {
        console.error("[bot] Error en Tavily:", err.message);
      }
    }

    const hasNews = newsContext.length > 0;

    const prompt = `Eres un analista experto con conocimiento del contexto de Ecuador y Latinoamérica.

El siguiente mercado de predicción acaba de cerrar. Debes determinar el resultado basándote en la evidencia encontrada en internet:

Pregunta del mercado: "${market.question}"
Fecha de creación del mercado: ${fromDate}
Fecha de cierre: ${market.closes_at ? market.closes_at.split("T")[0] : today}
Fecha de hoy: ${today}

${hasNews
  ? `Resultados encontrados en internet (desde ${fromDate}):\n\n${newsContext}`
  : `No se encontraron noticias ni resultados en internet relacionados con esta pregunta en el período desde ${fromDate} hasta ${today}.`
}

Tu tarea:
1. Analizar la evidencia y determinar si la respuesta es SÍ o NO
2. Si no hay evidencia clara → el resultado conservador es NO (la pregunta no se cumplió)
3. Generar un artículo de cierre profesional para publicar en la plataforma

Responde SOLO en JSON sin markdown:
{
  "winner": "yes" o "no",
  "confidence": número 0-100,
  "has_evidence": true si encontraste evidencia clara en las fuentes, false si es suposición,
  "close_headline": "titular del artículo de cierre (máximo 100 caracteres, como noticia periodística real)",
  "close_content": "texto completo del artículo de cierre (2-4 párrafos). ${hasNews ? `Explica qué pasó entre ${fromDate} y ${today}, cita las fuentes encontradas y justifica el resultado SÍ o NO.` : `Indica claramente que no se encontraron resultados públicos verificables para esta pregunta en el período comprendido entre ${fromDate} y ${today}, y que por ausencia de evidencia el resultado determinado es NO.`}",
  "reasoning": "explicación breve de tu determinación en 1-2 oraciones"
}`;

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await aiRes.json();
    const rawText = aiData.choices?.[0]?.message?.content || "{}";
    const clean = rawText.replace(/```json|```/g, "").trim();

    let parsed;
    try { parsed = JSON.parse(clean); } catch { return; }

    await supabase.from("market_news").insert({
      title: parsed.close_headline || `Cierre: ${market.question}`,
      content: parsed.close_content || "No se encontraron resultados públicos verificables para esta pregunta. El resultado más probable es NO.",
      url: sourceUrls[0] || null,
      source: "bot_close",
      status: "pending",
      market_id: market.id,
      resolves_as: parsed.winner,
    });

    if (broadcast) broadcast("news", {});
    console.log(`[bot] ✅ Cierre: "${market.question}" → ${parsed.winner.toUpperCase()} (${parsed.confidence}% confianza)`);
  } catch (err) {
    console.error("[bot] Error analizando cierre:", market.question, "-", err.message);
  }
}

function startScheduler() {
  cron.schedule("* * * * *", async () => {
    await runBot();
    await checkClosingMarkets();
  });
  console.log("[bot] Scheduler iniciado — revisando cada minuto");
}

function getStatus() {
  return { isRunning, lastRun, ...lastStats };
}

module.exports = { init, runBot, startScheduler, getStatus };
