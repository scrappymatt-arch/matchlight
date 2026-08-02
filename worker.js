const API_BASE = "https://v3.football.api-sports.io";

const ALLOWED_ORIGINS = new Set([
  "https://scrappymatt-arch.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://scrappymatt-arch.github.io",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(data, status, request, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request),
      ...extraHeaders,
    },
  });
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function createDateRange(from, to) {
  const startDate = new Date(`${from}T00:00:00Z`);
  const endDate = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return null;
  const dayCount = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  if (dayCount < 1 || dayCount > 14) return null;
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function providerHasErrors(data) {
  if (!data?.errors) return false;
  return Array.isArray(data.errors) ? data.errors.length > 0 : Object.keys(data.errors).length > 0;
}

async function requestApiFootball(path, env, cacheSeconds) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": env.API_FOOTBALL_KEY },
    cf: { cacheEverything: true, cacheTtl: cacheSeconds },
  });
  const data = await response.json();
  if (!response.ok || providerHasErrors(data)) {
    throw new Error(JSON.stringify({ status: response.status, errors: data.errors || {} }));
  }
  return data;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
    if (request.method !== "GET") return jsonResponse({ error: "Only GET requests are supported." }, 405, request);
    if (!env.API_FOOTBALL_KEY) return jsonResponse({ error: "API_FOOTBALL_KEY has not been configured." }, 500, request);

    const url = new URL(request.url);
    if (url.pathname === "/") {
      return jsonResponse({
        service: "MatchBuddy API",
        status: "online",
        version: "2.10",
        endpoints: {
          fixtures: "/fixtures?from=2026-08-01&to=2026-08-01",
          live: "/live",
          fixture: "/fixture?id=123456",
          signals: "/signals?ids=123456,123457",
        },
      }, 200, request);
    }

    if (url.pathname === "/fixtures") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (!from || !to || !validDate(from) || !validDate(to)) {
        return jsonResponse({ error: "Use YYYY-MM-DD dates." }, 400, request);
      }
      const dates = createDateRange(from, to);
      if (!dates) return jsonResponse({ error: "The range must contain between 1 and 14 valid days." }, 400, request);
      try {
        const fixtures = [];
        for (const date of dates) {
          const data = await requestApiFootball(`/fixtures?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent("Europe/London")}`, env, 300);
          if (Array.isArray(data.response)) fixtures.push(...data.response);
        }
        fixtures.sort((a, b) => new Date(a.fixture?.date || 0) - new Date(b.fixture?.date || 0));
        return jsonResponse({ get: "fixtures", parameters: { from, to, timezone: "Europe/London" }, errors: [], results: fixtures.length, response: fixtures }, 200, request, { "Cache-Control": "public, max-age=300" });
      } catch (error) {
        return jsonResponse({ error: "Unable to retrieve fixtures.", details: error.message || String(error) }, 502, request);
      }
    }

    if (url.pathname === "/live") {
      try {
        const data = await requestApiFootball(`/fixtures?live=all&timezone=${encodeURIComponent("Europe/London")}`, env, 20);
        return jsonResponse(data, 200, request, { "Cache-Control": "public, max-age=20" });
      } catch (error) {
        return jsonResponse({ error: "Unable to retrieve live matches.", details: error.message || String(error) }, 502, request);
      }
    }

    if (url.pathname === "/signals") {
      const rawIds = (url.searchParams.get("ids") || "").split(",").map((id) => id.trim()).filter(Boolean);
      const ids = [...new Set(rawIds)].filter((id) => /^\d+$/.test(id)).slice(0, 8);
      if (!ids.length) return jsonResponse({ error: "Provide up to eight numeric fixture ids." }, 400, request);
      try {
        const results = await Promise.all(ids.map(async (id) => {
          const data = await requestApiFootball(`/fixtures/events?fixture=${encodeURIComponent(id)}`, env, 60);
          const events = Array.isArray(data.response) ? data.response : [];
          const dismissals = events.filter((event) => {
            const type = String(event.type || "").trim().toLowerCase();
            const detail = String(event.detail || "").trim().toLowerCase();
            const comments = String(event.comments || "").trim().toLowerCase();
            const text = `${detail} ${comments}`;
            return (type === "card" || type.includes("card")) && (text.includes("red") || text.includes("second yellow") || text.includes("2nd yellow"));
          });
          const unique = new Set(dismissals.map((event) => [
            event.team?.id || event.team?.name || "",
            event.player?.id || event.player?.name || "",
            event.time?.elapsed || "",
            event.time?.extra || "",
          ].join("|")));
          return { fixtureId: id, redCards: unique.size };
        }));
        return jsonResponse({ results: results.length, response: results }, 200, request, { "Cache-Control": "public, max-age=60" });
      } catch (error) {
        return jsonResponse({ error: "Unable to retrieve live match signals.", details: error.message || String(error) }, 502, request);
      }
    }

    if (url.pathname === "/fixture") {
      const id = url.searchParams.get("id");
      if (!/^\d+$/.test(id || "")) return jsonResponse({ error: "A numeric fixture id is required." }, 400, request);
      try {
        // Four provider calls are made only when a user opens an individual match.
        // Cloudflare caches each provider response, so repeated opens reuse the data.
        const [fixtureData, eventsData, statisticsData, lineupsData] = await Promise.all([
          requestApiFootball(`/fixtures?id=${encodeURIComponent(id)}&timezone=${encodeURIComponent("Europe/London")}`, env, 60),
          requestApiFootball(`/fixtures/events?fixture=${encodeURIComponent(id)}`, env, 60),
          requestApiFootball(`/fixtures/statistics?fixture=${encodeURIComponent(id)}`, env, 120),
          requestApiFootball(`/fixtures/lineups?fixture=${encodeURIComponent(id)}`, env, 3600),
        ]);
        return jsonResponse({
          fixture: fixtureData.response?.[0] || null,
          events: eventsData.response || [],
          statistics: statisticsData.response || [],
          lineups: lineupsData.response || [],
        }, 200, request, { "Cache-Control": "public, max-age=60" });
      } catch (error) {
        return jsonResponse({ error: "Unable to retrieve match details.", details: error.message || String(error) }, 502, request);
      }
    }

    return jsonResponse({ error: "Endpoint not found." }, 404, request);
  },
};
