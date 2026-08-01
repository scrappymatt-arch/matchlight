const API_BASE = "https://matchbuddy-api.scrappymatt.workers.dev";
const DAY = 86400000;
const LIVE_REFRESH_MS = 120000;
const SIGNAL_REFRESH_MS = 120000;
const GOAL_PULSE_MS = 60000;
const MAX_SIGNAL_FIXTURES = 8;
const DAY_CACHE_MS = 5 * 60 * 1000;
const STORAGE_PREFIX = "matchbuddy-";

const today = new Date();
today.setHours(0, 0, 0, 0);

const isoDate = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const addDays = (base, days) => new Date(base.getTime() + days * DAY);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[char]));

const CONDITIONS = [
  { id: "home", label: "Home win", group: "Result" },
  { id: "draw", label: "Draw", group: "Result" },
  { id: "away", label: "Away win", group: "Result" },
  { id: "over15", label: "Over 1.5", group: "Over / Under" },
  { id: "over25", label: "Over 2.5", group: "Over / Under" },
  { id: "over35", label: "Over 3.5", group: "Over / Under" },
  { id: "under15", label: "Under 1.5", group: "Over / Under" },
  { id: "under25", label: "Under 2.5", group: "Over / Under" },
  { id: "under35", label: "Under 3.5", group: "Over / Under" },
  { id: "bttsYes", label: "Yes", group: "BTTS" },
  { id: "bttsNo", label: "No", group: "BTTS" },
  { id: "none", label: "Just track match", group: "No option" },
];



// UK-focused popularity order for the competitions most commonly followed and tracked.
// Favourites always override this automatic order. Lower values appear first.
const LEAGUE_PRIORITY_RULES = [
  [/^Premier League$/i, 1],
  [/UEFA Champions League|Champions League/i, 2],
  [/^Championship$/i, 3],
  [/UEFA Europa League|Europa League/i, 4],
  [/^La Liga$/i, 5],
  [/^Serie A$/i, 6],
  [/^Bundesliga$/i, 7],
  [/^Ligue 1$/i, 8],
  [/Scottish Premiership|Premiership/i, 9],
  [/^League One$/i, 10],
  [/UEFA Europa Conference League|Conference League/i, 11],
  [/Eredivisie/i, 12],
  [/Primeira Liga/i, 13],
  [/^League Two$/i, 14],
  [/Copa Libertadores/i, 20],
  [/Copa Sudamericana/i, 21],
  [/Brasileir[aã]o|Serie A/i, 22],
  [/Liga Profesional Argentina|Primera Divisi[oó]n/i, 23],
  [/Major League Soccer|MLS/i, 24],
  [/Liga MX/i, 25],
  [/AFC Champions League/i, 30],
  [/CAF Champions League/i, 31],
];

function leaguePriority(league) {
  const name = String(league || "").trim();
  for (const [pattern, rank] of LEAGUE_PRIORITY_RULES) {
    if (pattern.test(name)) return rank;
  }
  // Keep senior top divisions ahead of lower, reserve, youth and friendly competitions.
  if (/reserve|u17|u18|u19|u20|u21|u23|youth|women|feminine|friendly/i.test(name)) return 900;
  if (/cup|trophy|shield/i.test(name)) return 500;
  if (/2nd|second|division 2|liga 2|league two|serie b|championship/i.test(name)) return 300;
  return 100;
}

const REGION_ORDER = [
  "Europe",
  "South America",
  "North & Central America",
  "Africa",
  "Asia",
  "Oceania",
  "International",
];

const REGION_COUNTRIES = {
  "Europe": new Set([
    "Albania","Andorra","Armenia","Austria","Azerbaijan","Belarus","Belgium","Bosnia and Herzegovina","Bulgaria","Croatia","Cyprus","Czech Republic","Czechia","Denmark","England","Estonia","Faroe Islands","Finland","France","Georgia","Germany","Gibraltar","Greece","Hungary","Iceland","Ireland","Israel","Italy","Kazakhstan","Kosovo","Latvia","Liechtenstein","Lithuania","Luxembourg","Malta","Moldova","Montenegro","Netherlands","North Macedonia","Northern Ireland","Norway","Poland","Portugal","Romania","Russia","San Marino","Scotland","Serbia","Slovakia","Slovenia","Spain","Sweden","Switzerland","Turkey","Türkiye","Ukraine","Wales"
  ]),
  "South America": new Set([
    "Argentina","Bolivia","Brazil","Chile","Colombia","Ecuador","Paraguay","Peru","Uruguay","Venezuela"
  ]),
  "North & Central America": new Set([
    "Anguilla","Antigua and Barbuda","Aruba","Bahamas","Barbados","Belize","Bermuda","British Virgin Islands","Canada","Cayman Islands","Costa Rica","Cuba","Curaçao","Curacao","Dominica","Dominican Republic","El Salvador","Grenada","Guadeloupe","Guatemala","Guyana","Haiti","Honduras","Jamaica","Martinique","Mexico","Montserrat","Nicaragua","Panama","Puerto Rico","Saint Kitts and Nevis","Saint Lucia","Saint Martin","Saint Vincent and the Grenadines","Suriname","Trinidad and Tobago","Turks and Caicos Islands","USA","United States","US Virgin Islands"
  ]),
  "Africa": new Set([
    "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cameroon","Cape Verde","Central African Republic","Chad","Comoros","Congo","Congo DR","Congo Democratic Republic","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Ivory Coast","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","Sao Tome and Principe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe"
  ]),
  "Asia": new Set([
    "Afghanistan","Bahrain","Bangladesh","Bhutan","Brunei","Cambodia","China","Chinese Taipei","Hong Kong","India","Indonesia","Iran","Iraq","Japan","Jordan","Kuwait","Kyrgyzstan","Laos","Lebanon","Macau","Malaysia","Maldives","Mongolia","Myanmar","Nepal","North Korea","Oman","Pakistan","Palestine","Philippines","Qatar","Saudi Arabia","Singapore","South Korea","Sri Lanka","Syria","Taiwan","Tajikistan","Thailand","Timor-Leste","Turkmenistan","United Arab Emirates","Uzbekistan","Vietnam","Yemen"
  ]),
  "Oceania": new Set([
    "American Samoa","Australia","Cook Islands","Fiji","New Caledonia","New Zealand","Papua New Guinea","Samoa","Solomon Islands","Tahiti","Tonga","Vanuatu"
  ]),
};

function regionForCountry(country) {
  const value = String(country || "").trim();
  if (!value || ["World", "International", "N/A"].includes(value)) return "International";
  for (const region of REGION_ORDER) {
    if (REGION_COUNTRIES[region]?.has(value)) return region;
  }
  return "International";
}

function regionRank(country) {
  return REGION_ORDER.indexOf(regionForCountry(country));
}

const savedLists = readJson(`${STORAGE_PREFIX}lists`, null);
const legacySelected = readJson(`${STORAGE_PREFIX}selected`, {});
const initialLists = savedLists && Object.keys(savedLists).length
  ? savedLists
  : { list1: { id: "list1", name: "List 1", selected: legacySelected, finishedAt: null } };

const state = {
  selectedDate: isoDate(today),
  fixturesByDate: {},
  cacheTimes: {},
  selectedOnly: false,
  search: "",
  trackerFilter: "all",
  trackerSort: "date",
  lists: initialLists,
  currentListId: localStorage.getItem(`${STORAGE_PREFIX}current-list`) || Object.keys(initialLists)[0],
  theme: localStorage.getItem(`${STORAGE_PREFIX}theme`) || "dark",
  density: localStorage.getItem(`${STORAGE_PREFIX}density`) || "compact",
  favouriteLeagues: readJson(`${STORAGE_PREFIX}favourite-leagues`, []),
  knownLeagues: readJson(`${STORAGE_PREFIX}known-leagues`, []),
  editingFixtureId: null,
  editingListId: null,
  activeView: "scoresView",
  loadingDate: null,
  lastError: "",
  detailsCache: {},
  detailsPreviousView: "scoresView",
  matchSignals: readJson(`${STORAGE_PREFIX}match-signals`, {}),
  lastSignalRefresh: 0,
};

if (!state.lists[state.currentListId]) state.currentListId = Object.keys(state.lists)[0];
Object.defineProperty(state, "selected", {
  get() { return state.lists[state.currentListId]?.selected || {}; },
  set(value) { state.lists[state.currentListId].selected = value; },
});

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function saveSelected() {
  localStorage.setItem(`${STORAGE_PREFIX}lists`, JSON.stringify(state.lists));
  localStorage.setItem(`${STORAGE_PREFIX}current-list`, state.currentListId);
  localStorage.removeItem(`${STORAGE_PREFIX}selected`);
  updateAutoClearClock();
}

function allListEntries() {
  return Object.values(state.lists).flatMap((list) => Object.entries(list.selected || {}).map(([id, entry]) => ({ id, entry, list })));
}

function fixtureIsSelectedAnywhere(id) {
  return Object.values(state.lists).some((list) => Boolean(list.selected?.[id]));
}

function nextListName() {
  const used = new Set(Object.values(state.lists).map((list) => list.name));
  let number = 1;
  while (used.has(`List ${number}`)) number += 1;
  return `List ${number}`;
}

function createList(name = nextListName()) {
  const id = `list-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  state.lists[id] = { id, name, selected: {}, finishedAt: null };
  state.currentListId = id;
  saveSelected();
  renderAll();
  return id;
}

function normaliseFixture(item) {
  const rawDate = item.fixture?.date || new Date().toISOString();
  const dateObj = new Date(rawDate);
  const statusShort = item.fixture?.status?.short || "NS";
  const elapsed = item.fixture?.status?.elapsed;
  const liveCodes = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
  const finishedCodes = new Set(["FT", "AET", "PEN"]);
  const cancelledCodes = new Set(["PST", "CANC", "ABD", "AWD", "WO"]);
  let status = "scheduled";
  if (liveCodes.has(statusShort)) status = "live";
  if (finishedCodes.has(statusShort)) status = "finished";
  if (cancelledCodes.has(statusShort)) status = "cancelled";

  return {
    id: String(item.fixture?.id),
    apiId: item.fixture?.id,
    date: isoDate(dateObj),
    timestamp: dateObj.getTime(),
    time: dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    league: item.league?.name || "Unknown competition",
    leagueId: item.league?.id || null,
    country: item.league?.country || "",
    round: item.league?.round || "",
    home: item.teams?.home?.name || "Home team",
    away: item.teams?.away?.name || "Away team",
    homeScore: Number.isFinite(item.goals?.home) ? item.goals.home : 0,
    awayScore: Number.isFinite(item.goals?.away) ? item.goals.away : 0,
    status,
    statusShort,
    statusLong: item.fixture?.status?.long || "Not Started",
    minute: Number.isFinite(elapsed) ? elapsed : null,
  };
}

function signalForFixture(id) {
  return state.matchSignals[String(id)] || { goalUntil: 0, redCards: 0 };
}

function saveSignals() {
  localStorage.setItem(`${STORAGE_PREFIX}match-signals`, JSON.stringify(state.matchSignals));
}

function recordScoreChange(previous, next) {
  if (!previous || next.status !== "live") return;
  const oldTotal = (Number(previous.homeScore) || 0) + (Number(previous.awayScore) || 0);
  const newTotal = (Number(next.homeScore) || 0) + (Number(next.awayScore) || 0);
  if (newTotal > oldTotal) {
    const current = signalForFixture(next.id);
    state.matchSignals[next.id] = { ...current, goalUntil: Date.now() + GOAL_PULSE_MS };
    saveSignals();
  }
}

function matchSignalHtml(fixture) {
  const signal = signalForFixture(fixture.id);
  const goal = signal.goalUntil > Date.now()
    ? '<span class="goal-pulse" title="Goal detected in the last minute" aria-label="Goal detected in the last minute">⚽</span>'
    : '';
  const cards = Number(signal.redCards) > 0
    ? `<span class="red-card-signal" title="${signal.redCards} red card${signal.redCards === 1 ? "" : "s"}" aria-label="${signal.redCards} red card${signal.redCards === 1 ? "" : "s"}"><i></i>${signal.redCards}</span>`
    : '';
  return goal || cards ? `<span class="match-signals">${goal}${cards}</span>` : '';
}

async function refreshMatchSignals(fixtures) {
  const live = fixtures.filter((fixture) => fixture.status === "live");
  if (!live.length || Date.now() - state.lastSignalRefresh < SIGNAL_REFRESH_MS - 5000) return;

  const selectedIds = new Set(allListEntries().filter(({ entry }) => entry.fixture?.status === "live").map(({ id }) => String(id)));
  const ordered = [...live].sort((a, b) => Number(selectedIds.has(b.id)) - Number(selectedIds.has(a.id)) || Number(isFavourite(b)) - Number(isFavourite(a)) || a.timestamp - b.timestamp);
  const ids = [...new Set(ordered.map((fixture) => fixture.id))].slice(0, MAX_SIGNAL_FIXTURES);
  if (!ids.length) return;

  state.lastSignalRefresh = Date.now();
  try {
    const response = await fetch(`${API_BASE}/signals?ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || data.error) return;
    (data.response || []).forEach((item) => {
      const id = String(item.fixtureId);
      const current = signalForFixture(id);
      state.matchSignals[id] = { ...current, redCards: Number(item.redCards) || 0 };
    });
    saveSignals();
    renderFixtures();
    renderTracker();
  } catch {
    // Signal icons are supplementary; keep scores working if this request fails.
  }
}

function mergeFixture(fixture) {
  Object.values(state.lists).forEach((list) => {
    if (list.selected?.[fixture.id]) list.selected[fixture.id].fixture = fixture;
  });
}

async function loadDate(date, { force = false } = {}) {
  const cached = state.fixturesByDate[date];
  const fresh = Date.now() - (state.cacheTimes[date] || 0) < DAY_CACHE_MS;
  if (cached && fresh && !force) {
    renderFixtures();
    return;
  }

  state.loadingDate = date;
  state.lastError = "";
  renderDataStatus();
  renderFixtures();

  try {
    const response = await fetch(`${API_BASE}/fixtures?from=${date}&to=${date}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.details || data.error || "Unable to load fixtures");

    const fixtures = (data.response || []).map(normaliseFixture);
    fixtures.forEach(mergeFixture);
    state.fixturesByDate[date] = fixtures;
    state.cacheTimes[date] = Date.now();
    refreshMatchSignals(fixtures);
    updateKnownLeagues(fixtures);
    saveSelected();
  } catch (error) {
    state.lastError = friendlyError(error);
  } finally {
    state.loadingDate = null;
    renderAll();
  }
}

function friendlyError(error) {
  const message = String(error?.message || error || "Unknown error");
  if (message.includes("rateLimit") || message.includes("Too many requests")) {
    return "The free live-data limit is temporarily busy. Wait a minute, then tap Retry.";
  }
  return "Live fixtures could not be reached. Check your connection and try again.";
}

async function refreshLive() {
  if (document.hidden) return;
  const selectedFixtures = allListEntries().map(({ entry }) => entry.fixture);
  const selectedLive = selectedFixtures.some((fixture) => fixture.status === "live");
  const viewingToday = state.activeView === "scoresView" && state.selectedDate === isoDate(today);
  if (!selectedLive && !viewingToday) return;

  try {
    const response = await fetch(`${API_BASE}/live`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || data.error) return;
    const liveFixtures = (data.response || []).map(normaliseFixture);
    const liveMap = new Map(liveFixtures.map((fixture) => [fixture.id, fixture]));

    Object.keys(state.fixturesByDate).forEach((date) => {
      state.fixturesByDate[date] = state.fixturesByDate[date].map((fixture) => {
        const updated = liveMap.get(fixture.id);
        if (updated) recordScoreChange(fixture, updated);
        return updated || fixture;
      });
    });
    Object.values(state.lists).forEach((list) => {
      Object.keys(list.selected || {}).forEach((id) => {
        if (liveMap.has(id)) {
          const previous = list.selected[id].fixture;
          const updated = liveMap.get(id);
          recordScoreChange(previous, updated);
          list.selected[id].fixture = updated;
        }
      });
    });
    saveSelected();
    renderAll();
    refreshMatchSignals(liveFixtures);
  } catch {
    // Keep the last known scores visible if a background refresh fails.
  }
}

function updateKnownLeagues(fixtures) {
  const merged = new Map(state.knownLeagues.map((league) => [league.key, league]));
  fixtures.forEach((fixture) => {
    const key = `${fixture.country}|${fixture.league}`;
    merged.set(key, { key, country: fixture.country, league: fixture.league });
  });
  state.knownLeagues = [...merged.values()].sort((a, b) => `${a.country} ${a.league}`.localeCompare(`${b.country} ${b.league}`));
  localStorage.setItem(`${STORAGE_PREFIX}known-leagues`, JSON.stringify(state.knownLeagues));
}

function fixtureLeagueKey(fixture) { return `${fixture.country}|${fixture.league}`; }
function isFavourite(fixture) { return state.favouriteLeagues.includes(fixtureLeagueKey(fixture)); }

function clockText(fixture) {
  if (fixture.status === "live") {
    if (fixture.statusShort === "HT") return "HT";
    return fixture.minute ? `${fixture.minute}′` : "LIVE";
  }
  if (fixture.status === "finished") return "FT";
  if (fixture.status === "cancelled") return fixture.statusShort;
  return fixture.time;
}

function statusLabel(fixture) {
  if (fixture.status === "live") return fixture.statusShort === "HT" ? "HALF-TIME" : "LIVE";
  if (fixture.status === "finished") return "FINISHED";
  if (fixture.status === "cancelled") return fixture.statusLong.toUpperCase();
  return "KICK-OFF";
}

function scoreText(fixture) {
  if (fixture.status === "scheduled") return '<span class="scheduled-v">v</span>';
  return `<span>${fixture.homeScore}</span><i>–</i><span>${fixture.awayScore}</span>`;
}

function renderDateStrip() {
  const strip = document.getElementById("dateStrip");
  strip.innerHTML = "";
  for (let offset = -3; offset <= 10; offset += 1) {
    const date = addDays(today, offset);
    const iso = isoDate(date);
    const button = document.createElement("button");
    button.className = iso === state.selectedDate ? "active" : "";
    const label = offset === 0 ? "Today" : offset === -1 ? "Yesterday" : offset === 1 ? "Tomorrow" : date.toLocaleDateString("en-GB", { weekday: "short" });
    button.innerHTML = `<strong>${label}</strong><small>${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small>`;
    button.addEventListener("click", () => {
      state.selectedDate = iso;
      renderDateStrip();
      loadDate(iso);
    });
    strip.appendChild(button);
  }
  requestAnimationFrame(() => strip.querySelector(".active")?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }));
}

function renderDataStatus() {
  const box = document.getElementById("dataStatus");
  if (state.loadingDate === state.selectedDate) {
    box.innerHTML = '<span class="spinner"></span> Loading live fixtures…';
    box.className = "data-status visible";
  } else if (state.lastError) {
    box.innerHTML = `${escapeHtml(state.lastError)} <button id="retryLoad" type="button">Retry</button>`;
    box.className = "data-status visible error";
    setTimeout(() => document.getElementById("retryLoad")?.addEventListener("click", () => loadDate(state.selectedDate, { force: true })), 0);
  } else {
    box.innerHTML = "";
    box.className = "data-status";
  }
}

function renderFixtures() {
  const list = document.getElementById("fixtureList");
  const fixtures = [...(state.fixturesByDate[state.selectedDate] || [])];
  const query = state.search.trim().toLowerCase();
  const filtered = fixtures.filter((fixture) => {
    if (state.selectedOnly && !fixtureIsSelectedAnywhere(fixture.id)) return false;
    if (!query) return true;
    return `${fixture.home} ${fixture.away} ${fixture.league} ${fixture.country}`.toLowerCase().includes(query);
  });

  filtered.sort((a, b) => {
    const regionDifference = regionRank(a.country) - regionRank(b.country);
    if (regionDifference) return regionDifference;
    const favouriteDifference = Number(isFavourite(b)) - Number(isFavourite(a));
    if (favouriteDifference) return favouriteDifference;
    const priorityDifference = leaguePriority(a.league) - leaguePriority(b.league);
    if (priorityDifference) return priorityDifference;
    const countryDifference = a.country.localeCompare(b.country);
    if (countryDifference) return countryDifference;
    const leagueDifference = a.league.localeCompare(b.league);
    return leagueDifference || a.timestamp - b.timestamp;
  });

  if (!filtered.length) {
    if (state.loadingDate === state.selectedDate) {
      list.innerHTML = '<div class="fixture-skeleton"><span></span><span></span><span></span></div>';
      return;
    }
    list.innerHTML = `<div class="empty-state"><strong>No matches found</strong>${fixtures.length ? "Try changing the search or Selected filter." : "No fixtures were returned for this date."}</div>`;
    return;
  }

  const regions = new Map();
  filtered.forEach((fixture) => {
    const region = regionForCountry(fixture.country);
    if (!regions.has(region)) regions.set(region, new Map());
    const countries = regions.get(region);
    const country = fixture.country || "International";
    if (!countries.has(country)) countries.set(country, new Map());
    const leagues = countries.get(country);
    const key = fixtureLeagueKey(fixture);
    if (!leagues.has(key)) leagues.set(key, []);
    leagues.get(key).push(fixture);
  });

  list.innerHTML = REGION_ORDER.filter((region) => regions.has(region)).map((region) => {
    const countries = regions.get(region);
    const matchCount = [...countries.values()].reduce((regionTotal, leagues) => regionTotal + [...leagues.values()].reduce((countryTotal, matches) => countryTotal + matches.length, 0), 0);
    const countryHtml = [...countries.entries()].map(([country, leagues]) => {
      const leagueHtml = [...leagues.entries()].map(([key, matches]) => {
        const first = matches[0];
        const star = state.favouriteLeagues.includes(key) ? "★ " : "";
        return `
          <section class="league-group">
            <div class="league-heading"><span>${star}${escapeHtml(first.league)}</span><b>${matches.length} ${matches.length === 1 ? "match" : "matches"}</b></div>
            ${matches.map(fixtureCardHtml).join("")}
          </section>`;
      }).join("");
      return `<section class="country-group"><h4 class="country-heading">${escapeHtml(country)}</h4>${leagueHtml}</section>`;
    }).join("");
    return `<section class="region-group"><div class="region-heading"><h3>${escapeHtml(region)}</h3><span>${matchCount} ${matchCount === 1 ? "match" : "matches"}</span></div>${countryHtml}</section>`;
  }).join("");

  list.querySelectorAll("[data-fixture-id]").forEach((button) => {
    button.addEventListener("click", (event) => { event.stopPropagation(); openConditionDialog(button.dataset.fixtureId); });
  });
  bindFixtureDetailOpeners(list);
}

function fixtureCardHtml(fixture) {
  const selected = fixtureIsSelectedAnywhere(fixture.id);
  return `
    <article class="fixture-card" data-open-fixture="${fixture.id}" tabindex="0" role="button" aria-label="Open ${escapeHtml(fixture.home)} versus ${escapeHtml(fixture.away)} details">
      <div class="match-time ${fixture.status === "live" ? "live" : ""}">${escapeHtml(clockText(fixture))}<small>${escapeHtml(statusLabel(fixture))}</small></div>
      <div class="match-line">
        <strong class="home-team">${escapeHtml(fixture.home)}</strong>
        <span class="central-score ${fixture.status === "scheduled" ? "scheduled" : ""}">${scoreText(fixture)}</span>
        <strong class="away-team">${escapeHtml(fixture.away)}</strong>
        ${matchSignalHtml(fixture)}
      </div>
      <button class="add-button ${selected ? "selected" : ""}" data-fixture-id="${fixture.id}" aria-label="${selected ? "Edit tracked match" : "Track this match"}">${selected ? "✓" : "+"}</button>
    </article>`;
}

function getFixtureById(id) {
  for (const fixtures of Object.values(state.fixturesByDate)) {
    const match = fixtures.find((fixture) => fixture.id === id);
    if (match) return match;
  }
  return allListEntries().find((item) => item.id === id)?.entry.fixture || null;
}

function openConditionDialog(id) {
  const fixture = getFixtureById(id);
  if (!fixture) return;
  if (state.editingFixtureId !== id || !state.editingListId) state.editingListId = state.currentListId;
  state.editingFixtureId = id;
  document.getElementById("dialogMatchTitle").textContent = `${fixture.home} v ${fixture.away}`;
  renderDialogListSelect();
  const current = state.lists[state.editingListId]?.selected?.[id]?.condition || "none";
  const groups = ["Result", "Over / Under", "BTTS", "No option"];
  document.getElementById("conditionOptions").innerHTML = groups.map((group) => `
    <section class="condition-group">
      <h4>${group}</h4>
      <div class="condition-row ${group === "Over / Under" ? "goal-options" : ""}">
        ${CONDITIONS.filter((condition) => condition.group === group).map((condition) => `<button type="button" class="condition-option ${current === condition.id ? "active" : ""}" data-condition="${condition.id}">${condition.label}</button>`).join("")}
      </div>
    </section>`).join("");
  document.querySelectorAll(".condition-option").forEach((button) => button.addEventListener("click", () => selectCondition(button.dataset.condition)));
  const dialog = document.getElementById("conditionDialog");
  if (!dialog.open) dialog.showModal();
}

function renderDialogListSelect() {
  const select = document.getElementById("targetListSelect");
  if (!select) return;
  select.innerHTML = Object.values(state.lists).map((list) => `<option value="${escapeHtml(list.id)}" ${list.id === state.editingListId ? "selected" : ""}>${escapeHtml(list.name)}</option>`).join("");
}

function selectCondition(condition) {
  const id = state.editingFixtureId;
  const fixture = getFixtureById(id);
  const list = state.lists[state.editingListId];
  if (!fixture || !list) return;
  list.selected[id] = { condition, fixture, addedAt: list.selected[id]?.addedAt || Date.now() };
  state.currentListId = list.id;
  saveSelected();
  document.getElementById("conditionDialog").close();
  state.editingFixtureId = null;
  state.editingListId = null;
  renderAll();
}

function conditionLabel(id) { return CONDITIONS.find((condition) => condition.id === id)?.label || "Just track match"; }

function trafficState(fixture, condition) {
  if (fixture.status === "scheduled") return { colour: "grey", copy: "Not started" };
  if (fixture.status === "cancelled") return { colour: "grey", copy: fixture.statusLong };
  if (condition === "none") return { colour: "grey", copy: fixture.status === "finished" ? "Finished" : "Tracking only" };

  const h = Number(fixture.homeScore) || 0;
  const a = Number(fixture.awayScore) || 0;
  const total = h + a;
  let winning = false;
  let goalsNeeded = null;

  if (condition === "home") {
    winning = h > a;
    if (!winning) goalsNeeded = a - h + 1;
  }
  if (condition === "draw") {
    winning = h === a;
    if (!winning) goalsNeeded = Math.abs(h - a);
  }
  if (condition === "away") {
    winning = a > h;
    if (!winning) goalsNeeded = h - a + 1;
  }
  if (condition === "over15") {
    winning = total >= 2;
    if (!winning) goalsNeeded = 2 - total;
  }
  if (condition === "over25") {
    winning = total >= 3;
    if (!winning) goalsNeeded = 3 - total;
  }
  if (condition === "over35") {
    winning = total >= 4;
    if (!winning) goalsNeeded = 4 - total;
  }
  if (condition === "under15") {
    winning = total <= 1;
    if (!winning) return { colour: "lost", copy: "Lost" };
  }
  if (condition === "under25") {
    winning = total <= 2;
    if (!winning) return { colour: "lost", copy: "Lost" };
  }
  if (condition === "under35") {
    winning = total <= 3;
    if (!winning) return { colour: "lost", copy: "Lost" };
  }
  if (condition === "bttsYes") {
    winning = h > 0 && a > 0;
    if (!winning) goalsNeeded = (h > 0 || a > 0) ? 1 : 2;
  }
  if (condition === "bttsNo") {
    winning = h === 0 || a === 0;
    if (!winning) return { colour: "lost", copy: "Lost" };
  }

  if (fixture.status === "finished") return winning ? { colour: "green", copy: "Won" } : { colour: "red", copy: "Lost" };
  if (winning) return { colour: "green", copy: "Winning" };
  if (goalsNeeded === 1) return { colour: "yellow", copy: "Needs 1 goal" };
  if (Number.isInteger(goalsNeeded) && goalsNeeded > 1) return { colour: "red", copy: `Needs ${goalsNeeded} goals` };
  return { colour: "red", copy: "Not winning" };
}

function runTrafficStateTests() {
  const fixture = (homeScore, awayScore, status = "live") => ({ homeScore, awayScore, status, statusLong: status });
  const cases = [
    [fixture(1, 2), "home", "red", "Needs 2 goals"],
    [fixture(2, 2), "home", "yellow", "Needs 1 goal"],
    [fixture(3, 2), "home", "green", "Winning"],
    [fixture(2, 1), "away", "red", "Needs 2 goals"],
    [fixture(2, 2), "away", "yellow", "Needs 1 goal"],
    [fixture(2, 3), "away", "green", "Winning"],
    [fixture(2, 0), "draw", "red", "Needs 2 goals"],
    [fixture(2, 1), "draw", "yellow", "Needs 1 goal"],
    [fixture(2, 2), "draw", "green", "Winning"],
    [fixture(0, 0), "over15", "red", "Needs 2 goals"],
    [fixture(1, 0), "over15", "yellow", "Needs 1 goal"],
    [fixture(1, 1), "over15", "green", "Winning"],
    [fixture(0, 0), "over25", "red", "Needs 3 goals"],
    [fixture(1, 1), "over25", "yellow", "Needs 1 goal"],
    [fixture(2, 1), "over25", "green", "Winning"],
    [fixture(0, 0), "over35", "red", "Needs 4 goals"],
    [fixture(2, 1), "over35", "yellow", "Needs 1 goal"],
    [fixture(2, 2), "over35", "green", "Winning"],
    [fixture(1, 0), "under15", "green", "Winning"],
    [fixture(1, 1), "under15", "lost", "Lost"],
    [fixture(2, 0), "under25", "green", "Winning"],
    [fixture(2, 1), "under25", "lost", "Lost"],
    [fixture(3, 0), "under35", "green", "Winning"],
    [fixture(2, 2), "under35", "lost", "Lost"],
    [fixture(0, 0), "bttsYes", "red", "Needs 2 goals"],
    [fixture(1, 0), "bttsYes", "yellow", "Needs 1 goal"],
    [fixture(1, 1), "bttsYes", "green", "Winning"],
    [fixture(0, 0), "bttsNo", "green", "Winning"],
    [fixture(2, 0), "bttsNo", "green", "Winning"],
    [fixture(1, 1), "bttsNo", "lost", "Lost"],
    [fixture(1, 2, "finished"), "home", "red", "Lost"],
    [fixture(2, 1, "finished"), "home", "green", "Won"],
  ];

  const failures = cases.filter(([testFixture, condition, colour, copy]) => {
    const result = trafficState(testFixture, condition);
    return result.colour !== colour || result.copy !== copy;
  });

  if (failures.length) console.error("MatchBuddy traffic-light tests failed", failures);
}

runTrafficStateTests();

function renderTracker() {
  autoClearIfDue();
  renderListControls();
  let entries = Object.entries(state.selected).map(([id, entry]) => ({ id, ...entry, fixture: getFixtureById(id) || entry.fixture })).filter((entry) => entry.fixture);
  entries.forEach((entry) => { state.selected[entry.id].fixture = entry.fixture; });

  entries = entries.filter((entry) => {
    if (state.trackerFilter === "live") return entry.fixture.status === "live";
    if (state.trackerFilter === "upcoming") return entry.fixture.status === "scheduled";
    if (state.trackerFilter === "finished") return entry.fixture.status === "finished" || entry.fixture.status === "cancelled";
    return true;
  });

  entries.sort((a, b) => {
    if (state.trackerSort === "urgency") {
      const rank = { yellow: 0, red: 1, lost: 2, green: 3, grey: 4 };
      const difference = rank[trafficState(a.fixture, a.condition).colour] - rank[trafficState(b.fixture, b.condition).colour];
      if (difference) return difference;
    }
    return a.fixture.timestamp - b.fixture.timestamp;
  });

  const list = document.getElementById("trackerList");
  if (!entries.length) {
    list.innerHTML = '<div class="empty-state"><strong>No matches here</strong>Add fixtures from the Scores screen or change the filter.</div>';
  } else {
    let previousDate = "";
    list.innerHTML = entries.map((entry) => {
      const fixture = entry.fixture;
      const status = trafficState(fixture, entry.condition);
      const heading = fixture.date !== previousDate ? `<div class="day-heading">${new Date(`${fixture.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>` : "";
      previousDate = fixture.date;
      return `${heading}
        <article class="tracker-card status-${status.colour} ${fixture.status === "live" ? "in-play" : ""}" data-open-fixture="${entry.id}" tabindex="0" role="button" aria-label="Open ${escapeHtml(fixture.home)} versus ${escapeHtml(fixture.away)} details">
          <div class="tracker-topline">
            <div class="tracker-clock">${escapeHtml(clockText(fixture))}<small>${escapeHtml(statusLabel(fixture))}</small></div>
            <div class="match-line tracker-match-line">
              <strong class="home-team">${escapeHtml(fixture.home)}</strong>
              <span class="central-score ${fixture.status === "scheduled" ? "scheduled" : ""}">${scoreText(fixture)}</span>
              <strong class="away-team">${escapeHtml(fixture.away)}</strong>
              ${matchSignalHtml(fixture)}
            </div>
            <button class="remove-button" data-remove-id="${entry.id}" aria-label="Remove match">×</button>
          </div>
          <div class="tracker-meta">
            <button class="condition-edit" data-edit-id="${entry.id}">${escapeHtml(conditionLabel(entry.condition))}</button>
            <span class="status-copy">${escapeHtml(status.copy)}</span>
          </div>
        </article>`;
    }).join("");
  }

  list.querySelectorAll("[data-remove-id]").forEach((button) => button.addEventListener("click", () => {
    delete state.selected[button.dataset.removeId];
    saveSelected();
    renderAll();
  }));
  list.querySelectorAll("[data-edit-id]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); openConditionDialog(button.dataset.editId); }));
  list.querySelectorAll("[data-remove-id]").forEach((button) => button.addEventListener("click", (event) => event.stopPropagation(), { once: true }));
  bindFixtureDetailOpeners(list);
  renderSummary();
}

function renderSummary() {
  const values = Object.values(state.selected);
  const counts = { green: 0, yellow: 0, red: 0, lost: 0, grey: 0 };
  values.forEach((entry) => counts[trafficState(entry.fixture, entry.condition).colour] += 1);
  document.getElementById("summaryCards").innerHTML = [
    ["green", counts.green, "Winning"], ["yellow", counts.yellow, "1 goal"], ["red", counts.red, "Others"], ["lost", counts.lost, "Lost"], ["grey", counts.grey, "Upcoming"],
  ].map(([colour, value, label]) => `<div class="summary-card ${colour}"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function renderFavouriteLeagues() {
  const container = document.getElementById("favouriteLeagueOptions");
  document.getElementById("leagueHelp").hidden = state.knownLeagues.length > 0;

  const regions = new Map();
  state.knownLeagues.forEach((league) => {
    const region = regionForCountry(league.country);
    if (!regions.has(region)) regions.set(region, new Map());
    const countries = regions.get(region);
    const country = league.country || "International";
    if (!countries.has(country)) countries.set(country, []);
    countries.get(country).push(league);
  });

  container.innerHTML = REGION_ORDER.filter((region) => regions.has(region)).map((region, index) => {
    const countries = regions.get(region);
    const favouriteCount = [...countries.values()].flat().filter((league) => state.favouriteLeagues.includes(league.key)).length;
    const countryHtml = [...countries.entries()].sort(([countryA, leaguesA], [countryB, leaguesB]) => {
      const bestA = Math.min(...leaguesA.map((league) => leaguePriority(league.league)));
      const bestB = Math.min(...leaguesB.map((league) => leaguePriority(league.league)));
      return bestA - bestB || countryA.localeCompare(countryB);
    }).map(([country, leagues]) => {
      const orderedLeagues = leagues.sort((a, b) => leaguePriority(a.league) - leaguePriority(b.league) || a.league.localeCompare(b.league));
      const selectedCount = orderedLeagues.filter((league) => state.favouriteLeagues.includes(league.key)).length;
      const countryKey = encodeURIComponent(country);
      return `
      <div class="favourite-country">
        <label class="country-choice">
          <input type="checkbox" data-country="${countryKey}" ${selectedCount === orderedLeagues.length ? "checked" : ""} data-partial="${selectedCount > 0 && selectedCount < orderedLeagues.length}">
          <span>${escapeHtml(country)}</span><small>${selectedCount}/${orderedLeagues.length}</small>
        </label>
        <div class="league-choice-grid">
          ${orderedLeagues.map((league) => {
            const checked = state.favouriteLeagues.includes(league.key);
            return `<label class="league-choice"><input type="checkbox" data-league value="${escapeHtml(league.key)}" data-country-key="${countryKey}" ${checked ? "checked" : ""}><span>${escapeHtml(league.league)}</span></label>`;
          }).join("")}
        </div>
      </div>`;
    }).join("");
    return `<details class="favourite-region" ${region === "Europe" || (!regions.has("Europe") && index === 0) ? "open" : ""}>
      <summary><span>${escapeHtml(region)}</span><b>${favouriteCount ? `${favouriteCount} selected` : ""}</b></summary>
      <div class="favourite-region-content">${countryHtml}</div>
    </details>`;
  }).join("");

  container.querySelectorAll("input[data-partial='true']").forEach((input) => { input.indeterminate = true; });
  container.querySelectorAll("input[data-league]").forEach((input) => input.addEventListener("change", () => {
    state.favouriteLeagues = input.checked ? [...new Set([...state.favouriteLeagues, input.value])] : state.favouriteLeagues.filter((key) => key !== input.value);
    localStorage.setItem(`${STORAGE_PREFIX}favourite-leagues`, JSON.stringify(state.favouriteLeagues));
    renderFixtures();
    renderFavouriteLeagues();
  }));
  container.querySelectorAll("input[data-country]").forEach((input) => input.addEventListener("change", () => {
    const countryKey = input.dataset.country;
    const keys = [...container.querySelectorAll(`input[data-league][data-country-key="${countryKey}"]`)].map((item) => item.value);
    state.favouriteLeagues = input.checked
      ? [...new Set([...state.favouriteLeagues, ...keys])]
      : state.favouriteLeagues.filter((key) => !keys.includes(key));
    localStorage.setItem(`${STORAGE_PREFIX}favourite-leagues`, JSON.stringify(state.favouriteLeagues));
    renderFixtures();
    renderFavouriteLeagues();
  }));
  document.getElementById("clearFavouriteLeagues").disabled = state.favouriteLeagues.length === 0;
}

function updateAutoClearClock() {
  Object.values(state.lists).forEach((list) => {
    const entries = Object.values(list.selected || {});
    if (!entries.length) {
      list.finishedAt = null;
      return;
    }
    const allDone = entries.every((entry) => ["finished", "cancelled"].includes(entry.fixture.status));
    if (allDone && !list.finishedAt) list.finishedAt = Date.now();
    if (!allDone) list.finishedAt = null;
  });
  localStorage.setItem(`${STORAGE_PREFIX}lists`, JSON.stringify(state.lists));
}

function autoClearIfDue() {
  updateAutoClearClock();
  Object.values(state.lists).forEach((list) => {
    if (list.finishedAt && Date.now() - list.finishedAt >= DAY) {
      list.selected = {};
      list.finishedAt = null;
    }
  });
  saveSelected();
}

function renderListControls() {
  const select = document.getElementById("matchListSelect");
  if (!select) return;
  select.innerHTML = Object.values(state.lists).map((list) => `<option value="${escapeHtml(list.id)}" ${list.id === state.currentListId ? "selected" : ""}>${escapeHtml(list.name)}</option>`).join("");
  document.getElementById("deleteList").disabled = Object.keys(state.lists).length <= 1;
  document.getElementById("trackerTitle").textContent = state.lists[state.currentListId]?.name || "My Matches";
}


function bindFixtureDetailOpeners(container) {
  container.querySelectorAll("[data-open-fixture]").forEach((row) => {
    const open = (event) => {
      if (event.target.closest("button,select,input,a")) return;
      openMatchDetails(row.dataset.openFixture);
    };
    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(event); }
    });
  });
}

function eventIcon(type, detail) {
  const value = `${type || ""} ${detail || ""}`.toLowerCase();
  if (value.includes("goal")) return "⚽";
  if (value.includes("red")) return "🟥";
  if (value.includes("yellow")) return "🟨";
  if (value.includes("subst")) return "↔";
  if (value.includes("var")) return "VAR";
  return "•";
}

async function openMatchDetails(id) {
  const fixture = getFixtureById(id);
  if (!fixture) return;
  state.detailsPreviousView = state.activeView === "detailsView" ? state.detailsPreviousView : state.activeView;
  setView("detailsView");
  document.getElementById("detailsContent").innerHTML = detailsLoadingHtml(fixture);
  const cached = state.detailsCache[id];
  if (cached && Date.now() - cached.savedAt < 60000) {
    renderMatchDetails(fixture, cached.data);
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/fixture?id=${encodeURIComponent(fixture.apiId || fixture.id)}`);
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.details || data.error || "Unable to load match details");
    state.detailsCache[id] = { savedAt: Date.now(), data };
    renderMatchDetails(fixture, data);
  } catch (error) {
    document.getElementById("detailsContent").innerHTML = `${detailsHeaderHtml(fixture)}<div class="empty-state"><strong>Details unavailable</strong>${escapeHtml(error.message)}. Update the Cloudflare Worker with the V2.7 worker code included in the ZIP.</div>`;
  }
}

function detailsLoadingHtml(fixture) {
  return `${detailsHeaderHtml(fixture)}<div class="details-loading">Loading scorers, cards and match information…</div>`;
}

function detailsHeaderHtml(fixture) {
  return `<section class="details-scoreboard">
    <p>${escapeHtml(fixture.country)} · ${escapeHtml(fixture.league)}</p>
    <div class="details-clock">${escapeHtml(clockText(fixture))}<small>${escapeHtml(statusLabel(fixture))}</small></div>
    <div class="details-scoreline"><strong>${escapeHtml(fixture.home)}</strong><b>${scoreText(fixture)}</b><strong>${escapeHtml(fixture.away)}</strong></div>
    <span>${new Date(fixture.timestamp).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</span>
  </section>`;
}

function renderMatchDetails(fixture, data) {
  const events = Array.isArray(data.events) ? data.events : [];
  const statistics = Array.isArray(data.statistics) ? data.statistics : [];
  const lineups = Array.isArray(data.lineups) ? data.lineups : [];
  const match = data.fixture || {};
  const eventHtml = events.length ? events.map((event) => {
    const minute = `${event.time?.elapsed ?? ""}${event.time?.extra ? `+${event.time.extra}` : ""}′`;
    const team = event.team?.name || "";
    const player = event.player?.name || event.assist?.name || "";
    return `<li><time>${escapeHtml(minute)}</time><span class="event-icon">${eventIcon(event.type, event.detail)}</span><div><strong>${escapeHtml(event.detail || event.type || "Event")}</strong><p>${escapeHtml(player)}${team ? ` · ${escapeHtml(team)}` : ""}</p></div></li>`;
  }).join("") : '<div class="empty-state compact"><strong>No timeline available</strong>Events may not be supplied for this competition.</div>';
  const statRows = statistics.length === 2 ? (statistics[0].statistics || []).map((stat, index) => {
    const away = statistics[1].statistics?.[index]?.value ?? "–";
    return `<div class="stat-row"><b>${escapeHtml(stat.value ?? "–")}</b><span>${escapeHtml(stat.type)}</span><b>${escapeHtml(away)}</b></div>`;
  }).join("") : "";
  const lineupHtml = lineups.length ? lineups.map((lineup) => `<section class="lineup-team"><h4>${escapeHtml(lineup.team?.name || "Team")}${lineup.formation ? ` · ${escapeHtml(lineup.formation)}` : ""}</h4><p>${(lineup.startXI || []).map((item) => escapeHtml(item.player?.name || "")).filter(Boolean).join(", ") || "Line-up unavailable"}</p></section>`).join("") : "";
  document.getElementById("detailsContent").innerHTML = `${detailsHeaderHtml(fixture)}
    <div class="details-meta">${match.fixture?.venue?.name ? `<span>⌖ ${escapeHtml(match.fixture.venue.name)}</span>` : ""}${match.fixture?.referee ? `<span>Referee: ${escapeHtml(match.fixture.referee)}</span>` : ""}</div>
    <section class="details-section"><h3>Match timeline</h3><ol class="event-timeline">${eventHtml}</ol></section>
    ${statRows ? `<section class="details-section"><h3>Statistics</h3><div class="stats-table">${statRows}</div></section>` : ""}
    ${lineupHtml ? `<section class="details-section"><h3>Line-ups</h3><div class="lineups-grid">${lineupHtml}</div></section>` : ""}`;
}

function closeMatchDetails() {
  setView(state.detailsPreviousView || "scoresView");
}

function setView(viewId) {
  state.activeView = viewId;
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".bottom-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
  document.querySelector(".bottom-nav").classList.toggle("details-hidden", viewId === "detailsView");
  if (viewId === "trackerView") renderTracker();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.getElementById("themeToggle").textContent = state.theme === "dark" ? "☼" : "☾";
  localStorage.setItem(`${STORAGE_PREFIX}theme`, state.theme);
}

function applyDensity() {
  document.documentElement.dataset.density = state.density;
  document.querySelectorAll("#densityControl button").forEach((button) => {
    button.classList.toggle("active", button.dataset.density === state.density);
  });
}

function renderAll() {
  renderDateStrip();
  renderDataStatus();
  renderFixtures();
  renderTracker();
  renderFavouriteLeagues();
  const count = allListEntries().length;
  const badge = document.getElementById("trackerBadge");
  badge.hidden = count === 0;
  badge.textContent = count;
  document.getElementById("clearTracker").disabled = Object.keys(state.selected).length === 0;
  document.getElementById("showSelectedOnly").classList.toggle("active", state.selectedOnly);
  document.getElementById("showSelectedOnly").setAttribute("aria-pressed", String(state.selectedOnly));
}

function bindEvents() {
  document.querySelectorAll(".bottom-nav button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  document.getElementById("detailsBack").addEventListener("click", closeMatchDetails);
  document.getElementById("jumpToday").addEventListener("click", () => {
    state.selectedDate = isoDate(today);
    loadDate(state.selectedDate);
  });
  document.getElementById("fixtureSearch").addEventListener("input", (event) => { state.search = event.target.value; renderFixtures(); });
  document.getElementById("showSelectedOnly").addEventListener("click", () => { state.selectedOnly = !state.selectedOnly; renderAll(); });
  document.getElementById("trackerFilters").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    state.trackerFilter = button.dataset.filter;
    document.querySelectorAll("#trackerFilters button").forEach((item) => item.classList.toggle("active", item === button));
    renderTracker();
  });
  document.getElementById("trackerSort").addEventListener("change", (event) => { state.trackerSort = event.target.value; renderTracker(); });
  const toggleTheme = () => { state.theme = state.theme === "dark" ? "light" : "dark"; applyTheme(); };
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("settingsThemeToggle").addEventListener("click", toggleTheme);
  document.getElementById("densityControl").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-density]");
    if (!button) return;
    state.density = button.dataset.density;
    localStorage.setItem(`${STORAGE_PREFIX}density`, state.density);
    applyDensity();
  });
  document.getElementById("clearFavouriteLeagues").addEventListener("click", () => {
    state.favouriteLeagues = [];
    localStorage.setItem(`${STORAGE_PREFIX}favourite-leagues`, "[]");
    renderAll();
  });
  document.getElementById("matchListSelect").addEventListener("change", (event) => {
    state.currentListId = event.target.value;
    saveSelected();
    renderAll();
  });
  document.getElementById("newList").addEventListener("click", () => {
    const proposed = prompt("Name this list", nextListName());
    if (proposed !== null) createList(proposed.trim() || nextListName());
  });
  document.getElementById("renameList").addEventListener("click", () => {
    const list = state.lists[state.currentListId];
    const proposed = prompt("Rename this list", list.name);
    if (proposed !== null && proposed.trim()) { list.name = proposed.trim(); saveSelected(); renderAll(); }
  });
  document.getElementById("deleteList").addEventListener("click", () => {
    if (Object.keys(state.lists).length <= 1) return;
    const list = state.lists[state.currentListId];
    if (!confirm(`Delete ${list.name}?`)) return;
    delete state.lists[state.currentListId];
    state.currentListId = Object.keys(state.lists)[0];
    saveSelected(); renderAll();
  });
  document.getElementById("targetListSelect").addEventListener("change", (event) => {
    state.editingListId = event.target.value;
    openConditionDialog(state.editingFixtureId);
  });
  document.getElementById("newListFromDialog").addEventListener("click", () => {
    const proposed = prompt("Name this list", nextListName());
    if (proposed === null) return;
    state.editingListId = createList(proposed.trim() || nextListName());
    renderDialogListSelect();
  });
  document.getElementById("clearTracker").addEventListener("click", () => document.getElementById("confirmDialog").showModal());
  document.getElementById("confirmDialog").addEventListener("close", (event) => {
    if (event.target.returnValue === "confirm") {
      state.selected = {};
      saveSelected();
      renderAll();
    }
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshLive(); });
}

async function start() {
  applyTheme();
  bindEvents();
  applyDensity();
  autoClearIfDue();
  renderAll();
  await loadDate(state.selectedDate);

  const liveItem = allListEntries().find(({ entry }) => entry.fixture?.status === "live");
  if (liveItem) { state.currentListId = liveItem.list.id; setView("trackerView"); }
  setInterval(refreshLive, LIVE_REFRESH_MS);

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js?v=2.7").catch(() => {});
}

start();
