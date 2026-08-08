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

function providerErrorText(data) {
  try { return JSON.stringify(data?.errors || {}).toLowerCase(); }
  catch { return ""; }
}

function isRateLimited(response, data) {
  const text = providerErrorText(data);
  return response.status === 429 || text.includes("rate") || text.includes("too many requests") || text.includes("limit of requests");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestApiFootball(path, env, cacheSeconds, retries = 3) {
  let lastError = null;
  const retryDelays = [1400, 3200, 7000];

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "x-apisports-key": env.API_FOOTBALL_KEY },
      cf: { cacheEverything: true, cacheTtl: cacheSeconds },
    });
    const data = await response.json();

    if (response.ok && !providerHasErrors(data)) return data;

    lastError = new Error(JSON.stringify({ status: response.status, errors: data.errors || {} }));
    if (!isRateLimited(response, data) || attempt >= retries) throw lastError;
    await wait(retryDelays[Math.min(attempt, retryDelays.length - 1)]);
  }

  throw lastError || new Error("API request failed.");
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
    if (request.method !== "GET") return jsonResponse({ error: "Only GET requests are supported." }, 405, request);
    if (!env.API_FOOTBALL_KEY) return jsonResponse({ error: "API_FOOTBALL_KEY has not been configured." }, 500, request);

    const url = new URL(request.url);
    if (url.pathname === "/") {
      return jsonResponse({
        service: "YorAkka API",
        status: "online",
        version: "4.02",
        endpoints: {
          fixtures: "/fixtures?from=2026-08-01&to=2026-08-01",
          live: "/live",
          fixture: "/fixture?id=123456",
          signals: "/signals?ids=123456,123457",
          leagues: "/leagues",
          leagueHistory: "/league-history?league=39",
          teams: "/teams?league=39&season=2025",
          results: "/results?league=39&season=2025&from=2025-08-01&to=2026-05-31",
        },
      }, 200, request);
    }


    if (url.pathname === "/leagues") {
      try {
        // The competition catalogue changes infrequently, so cache it for a day.
        const data = await requestApiFootball(`/leagues`, env, 86400, 2);
        const competitions = (Array.isArray(data.response) ? data.response : []).map((item) => {
          const seasons = Array.isArray(item.seasons) ? item.seasons : [];
          const currentSeason = seasons.find((season) => season.current) || null;
          const latestSeason = seasons.slice().sort((a, b) => Number(b.year || 0) - Number(a.year || 0))[0] || null;
          return {
            id: item.league?.id || null,
            name: item.league?.name || "Unknown competition",
            type: item.league?.type || "League",
            logo: item.league?.logo || "",
            country: item.country?.name || "International",
            countryCode: item.country?.code || "",
            flag: item.country?.flag || "",
            current: Boolean(currentSeason),
            season: currentSeason?.year || latestSeason?.year || null,
            seasons: seasons.map((season) => ({
              year: season.year || null,
              start: season.start || null,
              end: season.end || null,
              current: Boolean(season.current),
            })).filter((season) => season.year),
          };
        }).filter((item) => item.id && item.name);
        competitions.sort((a, b) => `${a.country} ${a.name}`.localeCompare(`${b.country} ${b.name}`));
        return jsonResponse({ results: competitions.length, response: competitions }, 200, request, { "Cache-Control": "public, max-age=86400" });
      } catch (error) {
        return jsonResponse({ error: "Unable to retrieve the league catalogue.", details: error.message || String(error) }, 502, request);
      }
    }


    if (url.pathname === "/league-history") {
      const league = url.searchParams.get("league");
      if (!/^\d+$/.test(league || "")) {
        return jsonResponse({ error: "Provide a numeric league ID." }, 400, request);
      }
      try {
        const data = await requestApiFootball(`/leagues?id=${encodeURIComponent(league)}`, env, 86400, 2);
        const item = Array.isArray(data.response) ? data.response[0] : null;
        if (!item) return jsonResponse({ error: "League history was not found." }, 404, request);
        const seasons = (Array.isArray(item.seasons) ? item.seasons : []).map((season) => ({
          year: season.year || null,
          start: season.start || null,
          end: season.end || null,
          current: Boolean(season.current),
        })).filter((season) => season.year);
        return jsonResponse({ league: Number(league), seasons }, 200, request, { "Cache-Control": "public, max-age=86400" });
      } catch (error) {
        return jsonResponse({ error: "Unable to retrieve league history.", details: error.message || String(error) }, 502, request);
      }
    }

    if (url.pathname === "/teams") {
      const league = url.searchParams.get("league");
      const season = url.searchParams.get("season");
      if (!/^\d+$/.test(league || "") || !/^\d{4}$/.test(season || "")) {
        return jsonResponse({ error: "Provide a numeric league ID and four-digit season." }, 400, request);
      }
      try {
        const data = await requestApiFootball(`/teams?league=${encodeURIComponent(league)}&season=${encodeURIComponent(season)}`, env, 86400, 2);
        const teams = (Array.isArray(data.response) ? data.response : []).map((item) => ({
          team: {
            id: item.team?.id || null,
            name: item.team?.name || "Unknown team",
            code: item.team?.code || null,
            country: item.team?.country || null,
          },
        })).filter((item) => item.team.id && item.team.name);
        teams.sort((a, b) => a.team.name.localeCompare(b.team.name));
        return jsonResponse({ get: "teams", parameters: { league: Number(league), season: Number(season) }, errors: [], results: teams.length, response: teams }, 200, request, { "Cache-Control": "public, max-age=86400" });
      } catch (error) {
        return jsonResponse({ error: "Unable to retrieve league teams.", details: error.message || String(error) }, 502, request);
      }
    }

    if (url.pathname === "/results") {
      const league = url.searchParams.get("league");
      const season = url.searchParams.get("season");
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (!/^\d+$/.test(league || "") || !/^\d{4}$/.test(season || "") || !from || !to || !validDate(from) || !validDate(to)) {
        return jsonResponse({ error: "Provide numeric league, four-digit season, and YYYY-MM-DD from/to dates." }, 400, request);
      }
      const start = new Date(`${from}T00:00:00Z`);
      const end = new Date(`${to}T00:00:00Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return jsonResponse({ error: "The results date range is invalid." }, 400, request);
      }
      try {
        const path = `/fixtures?league=${encodeURIComponent(league)}&season=${encodeURIComponent(season)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&timezone=${encodeURIComponent("Europe/London")}`;
        const data = await requestApiFootball(path, env, 3600, 3);
        const finishedCodes = new Set(["FT", "AET", "PEN"]);
        const results = (Array.isArray(data.response) ? data.response : []).filter((item) => finishedCodes.has(item.fixture?.status?.short));
        results.sort((a, b) => new Date(a.fixture?.date || 0) - new Date(b.fixture?.date || 0));
        return jsonResponse({
          get: "results",
          parameters: { league: Number(league), season: Number(season), from, to, timezone: "Europe/London" },
          errors: [],
          results: results.length,
          response: results,
        }, 200, request, { "Cache-Control": "public, max-age=3600" });
      } catch (error) {
        return jsonResponse({ error: "Unable to retrieve historical results.", details: error.message || String(error) }, 502, request);
      }
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
        // V4 live-data backbone. API-Football's live fixtures response includes its
        // event arrays, so this one upstream request supplies scores, red cards and VAR
        // markers for every current live fixture. Cloudflare caches the shared response
        // briefly so several YorAkka clients do not multiply provider calls.
        const data = await requestApiFootball(`/fixtures?live=all&timezone=${encodeURIComponent("Europe/London")}`, env, 12);
        return jsonResponse(data, 200, request, { "Cache-Control": "public, max-age=12, stale-while-revalidate=6", "X-YorAkka-Live-Architecture": "4.0" });
      } catch (error) {
        return jsonResponse({ error: "Unable to retrieve live matches.", details: error.message || String(error) }, 502, request);
      }
    }

    // Legacy per-fixture fallback retained for older clients and diagnostics. V4 clients
    // use /live as their primary event source and should not normally call this route.
    if (url.pathname === "/signals") {
      const rawTokens = (url.searchParams.get("ids") || "").split(",").map((token) => token.trim()).filter(Boolean);
      const fixtures = [];
      const seenFixtureIds = new Set();
      for (const token of rawTokens) {
        const [id, homeId = "", awayId = ""] = token.split(":");
        if (!/^\d+$/.test(id) || seenFixtureIds.has(id)) continue;
        seenFixtureIds.add(id);
        fixtures.push({ id, homeId: /^\d+$/.test(homeId) ? homeId : "", awayId: /^\d+$/.test(awayId) ? awayId : "" });
        if (fixtures.length >= 12) break;
      }
      if (!fixtures.length) return jsonResponse({ error: "Provide up to twelve numeric fixture ids." }, 400, request);
      try {
        const results = [];
        for (const fixtureRef of fixtures) {
          const { id, homeId, awayId } = fixtureRef;
          try {
            const data = await requestApiFootball(`/fixtures/events?fixture=${encodeURIComponent(id)}`, env, 20, 2);
            const events = Array.isArray(data.response) ? data.response : [];
            const dismissals = events.filter((event) => {
              const type = String(event.type || "").trim().toLowerCase();
              const detail = String(event.detail || "").trim().toLowerCase();
              const comments = String(event.comments || "").trim().toLowerCase();
              const text = `${type} ${detail} ${comments}`;
              return text.includes("red card") || text.includes("second yellow") || text.includes("2nd yellow") || text.includes("yellow-red") || text.includes("yellow red");
            });
            const uniqueEvents = new Map();
            dismissals.forEach((event) => {
              const key = [
                event.team?.id || event.team?.name || "",
                event.player?.id || event.player?.name || "",
                event.time?.elapsed || "",
                event.time?.extra || "",
              ].join("|");
              if (!uniqueEvents.has(key)) uniqueEvents.set(key, event);
            });
            const teamCards = {};
            let homeRedCards = 0;
            let awayRedCards = 0;
            uniqueEvents.forEach((event) => {
              const idKey = event.team?.id != null ? String(event.team.id) : "";
              const nameKey = String(event.team?.name || "").trim().toLowerCase();
              if (idKey) teamCards[idKey] = (teamCards[idKey] || 0) + 1;
              if (nameKey) teamCards[nameKey] = (teamCards[nameKey] || 0) + 1;
              if (homeId && idKey === homeId) homeRedCards += 1;
              if (awayId && idKey === awayId) awayRedCards += 1;
            });
            results.push({
              fixtureId: id,
              redCards: uniqueEvents.size,
              homeRedCards,
              awayRedCards,
              teamCards,
            });
          } catch {
            // One unavailable event feed must not discard the other tracked matches.
            results.push({ fixtureId: id, redCards: null });
          }
          // Leave headroom for simultaneous live-score and details requests.
          if (fixtures.length > 1) await wait(350);
        }
        return jsonResponse({ results: results.length, response: results }, 200, request, { "Cache-Control": "public, max-age=20" });
      } catch (error) {
        return jsonResponse({ error: "Unable to retrieve live match signals.", details: error.message || String(error) }, 502, request);
      }
    }

    if (url.pathname === "/fixture") {
      const id = url.searchParams.get("id");
      if (!/^\d+$/.test(id || "")) return jsonResponse({ error: "A numeric fixture id is required." }, 400, request);
      try {
        // Events are the priority because they contain goals and dismissals.
        // Requests are deliberately sequential to avoid a five-call burst.
        const eventsData = await requestApiFootball(`/fixtures/events?fixture=${encodeURIComponent(id)}`, env, 30, 3);
        await wait(350);

        const fixtureData = await requestApiFootball(`/fixtures?id=${encodeURIComponent(id)}&timezone=${encodeURIComponent("Europe/London")}`, env, 45, 2);
        await wait(350);

        let statisticsData = { response: [] };
        let lineupsData = { response: [] };
        let prediction = null;

        try { statisticsData = await requestApiFootball(`/fixtures/statistics?fixture=${encodeURIComponent(id)}`, env, 120, 2); }
        catch { statisticsData = { response: [] }; }
        await wait(350);

        try { lineupsData = await requestApiFootball(`/fixtures/lineups?fixture=${encodeURIComponent(id)}`, env, 3600, 2); }
        catch { lineupsData = { response: [] }; }
        await wait(350);

        try {
          const predictionData = await requestApiFootball(`/predictions?fixture=${encodeURIComponent(id)}`, env, 21600, 2);
          prediction = predictionData.response?.[0] || null;
        } catch {
          prediction = null;
        }

        return jsonResponse({
          fixture: fixtureData.response?.[0] || null,
          events: eventsData.response || [],
          statistics: statisticsData.response || [],
          lineups: lineupsData.response || [],
          prediction,
        }, 200, request, { "Cache-Control": "public, max-age=30" });
      } catch (error) {
        const message = String(error?.message || error || "");
        const busy = message.toLowerCase().includes("rate") || message.toLowerCase().includes("too many") || message.toLowerCase().includes("limit of requests");
        return jsonResponse({
          error: busy ? "The live-data service is busy. YorAkka will try again shortly." : "Unable to retrieve match details.",
          details: busy ? "Please wait a few seconds and reopen this match." : message,
          retryable: busy,
        }, busy ? 429 : 502, request, busy ? { "Retry-After": "8" } : {});
      }
    }

    return jsonResponse({ error: "Endpoint not found." }, 404, request);
  },
};
