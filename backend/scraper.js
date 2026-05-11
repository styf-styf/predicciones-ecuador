const cheerio = require("cheerio");

async function scrapeHeadlines(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-EC,es;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const baseUrl = new URL(url);
    const headlines = [];
    const seen = new Set();

    const selectors = [
      "article h1 a", "article h2 a", "article h3 a",
      "h2 a", "h3 a",
      "[data-testid*='headline'] a",
      "[class*='headline'] a",
      "[class*='Headline'] a",
      "[class*='title'] a",
      "[class*='Title'] a",
      ".article-title a",
    ];

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const $el = $(el);
        const title = $el.text().trim().replace(/\s+/g, " ");
        let href = $el.attr("href") || "";

        if (title.length < 20 || title.length > 300) return;

        try {
          if (href.startsWith("//")) href = `${baseUrl.protocol}${href}`;
          else if (href.startsWith("/")) href = `${baseUrl.origin}${href}`;
          href = new URL(href).href;
        } catch { return; }

        if (href.includes("javascript:") || href.includes("#")) return;

        const key = `${title.slice(0, 50)}-${href}`;
        if (seen.has(key)) return;
        seen.add(key);

        headlines.push({ title, url: href, source: baseUrl.hostname.replace("www.", "") });
      });

      if (headlines.length >= 15) break;
    }

    // Fallback: todos los links con texto largo dentro del mismo dominio
    if (headlines.length < 3) {
      $("a").each((_, el) => {
        const $el = $(el);
        const title = $el.text().trim().replace(/\s+/g, " ");
        let href = $el.attr("href") || "";

        if (title.length < 25 || title.length > 250) return;

        try {
          if (href.startsWith("//")) href = `${baseUrl.protocol}${href}`;
          else if (href.startsWith("/")) href = `${baseUrl.origin}${href}`;
          href = new URL(href).href;
        } catch { return; }

        if (!href.includes(baseUrl.hostname)) return;

        const key = `${title.slice(0, 50)}-${href}`;
        if (seen.has(key)) return;
        seen.add(key);

        headlines.push({ title, url: href, source: baseUrl.hostname.replace("www.", "") });
      });
    }

    return headlines.slice(0, 10);
  } catch (err) {
    console.error(`[scraper] Error en ${url}:`, err.message);
    return [];
  }
}

module.exports = { scrapeHeadlines };
