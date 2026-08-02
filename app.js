const API_BASE = "https://matchbuddy-api.scrappymatt.workers.dev";
const DAY = 86400000;
const DEFAULT_LIVE_REFRESH_SECONDS = 30;
const DEFAULT_SIGNAL_REFRESH_SECONDS = 30;
const DEFAULT_COMPLETED_CLEANUP_HOURS = 24;
const GOAL_PULSE_MS = 60000;
const MAX_SIGNAL_FIXTURES = 8;
const DAY_CACHE_MS = 5 * 60 * 1000;
const STORAGE_PREFIX = "matchbuddy-"; // retained so existing users keep their lists and settings
const DEFAULT_TIME_ZONE = "Europe/London";

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
  showAllLeagues: false,
  knownLeagues: readJson(`${STORAGE_PREFIX}known-leagues`, []),
  leagueCatalogueLoaded: false,
  leagueCatalogueLoading: false,
  leagueCatalogueError: "",
  leagueSearch: "",
  leagueCategory: "all",
  currentLeaguesOnly: true,
  editingFixtureId: null,
  editingListId: null,
  activeView: "scoresView",
  loadingDate: null,
  lastError: "",
  detailsCache: {},
  detailsPreviousView: "scoresView",
  matchSignals: readJson(`${STORAGE_PREFIX}match-signals`, {}),
  lastSignalRefresh: 0,
  signalRefreshInProgress: false,
  detailsRequestInProgress: false,
  scoresScrollY: 0,
  trackerScrollY: 0,
  pendingScrollView: null,
  goalSoundsEnabled: localStorage.getItem(`${STORAGE_PREFIX}goal-sounds`) === "true",
  liveRefreshSeconds: Number(localStorage.getItem(`${STORAGE_PREFIX}live-refresh-seconds`) ?? DEFAULT_LIVE_REFRESH_SECONDS),
  signalRefreshSeconds: Number(localStorage.getItem(`${STORAGE_PREFIX}signal-refresh-seconds`) ?? DEFAULT_SIGNAL_REFRESH_SECONDS),
  completedCleanupHours: Number(localStorage.getItem(`${STORAGE_PREFIX}completed-cleanup-hours`) ?? DEFAULT_COMPLETED_CLEANUP_HOURS),
  timeZone: localStorage.getItem(`${STORAGE_PREFIX}time-zone`) || DEFAULT_TIME_ZONE,
  nextRefreshAt: Date.now() + DEFAULT_LIVE_REFRESH_SECONDS * 1000,
  refreshInProgress: false,
  lastRefreshSucceededAt: null,
  audioContext: null,
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
    utcDate: dateObj.toISOString(),
    time: dateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: state?.timeZone || DEFAULT_TIME_ZONE }),
    league: item.league?.name || "Unknown competition",
    leagueId: item.league?.id || null,
    country: item.league?.country || "",
    round: item.league?.round || "",
    home: item.teams?.home?.name || "Home team",
    away: item.teams?.away?.name || "Away team",
    homeId: item.teams?.home?.id || null,
    awayId: item.teams?.away?.id || null,
    homeScore: Number.isFinite(item.goals?.home) ? item.goals.home : 0,
    awayScore: Number.isFinite(item.goals?.away) ? item.goals.away : 0,
    halfTimeHome: Number.isFinite(item.score?.halftime?.home) ? item.score.halftime.home : null,
    halfTimeAway: Number.isFinite(item.score?.halftime?.away) ? item.score.halftime.away : null,
    status,
    statusShort,
    statusLong: item.fixture?.status?.long || "Not Started",
    minute: Number.isFinite(elapsed) ? elapsed : null,
  };
}

function signalForFixture(id) {
  return state.matchSignals[String(id)] || { goalUntil: 0, redCards: 0, homeRedCards: 0, awayRedCards: 0 };
}

function saveSignals() {
  localStorage.setItem(`${STORAGE_PREFIX}match-signals`, JSON.stringify(state.matchSignals));
}


function ensureAudioContext() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    state.audioContext = new AudioContextClass();
  }
  if (state.audioContext.state === "suspended") state.audioContext.resume().catch(() => {});
  return state.audioContext;
}

function playGoalTone(kind) {
  if (!state.goalSoundsEnabled) return;
  const context = ensureAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const notes = kind === "positive" ? [523.25, 659.25, 783.99] : [220, 174.61, 130.81];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "positive" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.09);
    gain.gain.setValueAtTime(0.0001, now + index * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.14, now + index * 0.09 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + index * 0.09);
    oscillator.stop(now + index * 0.09 + 0.18);
  });
}

function goalEffect(previous, next, condition) {
  const oldH = Number(previous?.homeScore) || 0;
  const oldA = Number(previous?.awayScore) || 0;
  const newH = Number(next?.homeScore) || 0;
  const newA = Number(next?.awayScore) || 0;
  const homeScored = newH > oldH;
  const awayScored = newA > oldA;
  if (!homeScored && !awayScored) return "neutral";

  if (["over15", "over25", "over35"].includes(condition)) {
    return trafficState(previous, condition).copy === "Won" ? "neutral" : "positive";
  }
  if (["under15", "under25", "under35"].includes(condition)) return "negative";
  if (condition === "home") return homeScored ? "positive" : "negative";
  if (condition === "away") return awayScored ? "positive" : "negative";
  if (condition === "draw") {
    const oldGap = Math.abs(oldH - oldA);
    const newGap = Math.abs(newH - newA);
    return newGap < oldGap ? "positive" : newGap > oldGap ? "negative" : "neutral";
  }
  if (condition === "bttsYes") {
    const wasWon = oldH > 0 && oldA > 0;
    const nowWon = newH > 0 && newA > 0;
    return !wasWon && nowWon ? "positive" : "neutral";
  }
  if (condition === "bttsNo") {
    const wasLost = oldH > 0 && oldA > 0;
    const nowLost = newH > 0 && newA > 0;
    return !wasLost && nowLost ? "negative" : "neutral";
  }
  return "neutral";
}

function playTrackedGoalEffect(previous, next) {
  const activeList = state.lists[state.currentListId];
  const condition = activeList?.selected?.[String(next.id)]?.condition;
  if (!condition || condition === "none") return;
  const effect = goalEffect(previous, next, condition);
  if (effect === "positive" || effect === "negative") playGoalTone(effect);
}

function recordScoreChange(previous, next) {
  if (!previous || next.status !== "live") return;
  const oldTotal = (Number(previous.homeScore) || 0) + (Number(previous.awayScore) || 0);
  const newTotal = (Number(next.homeScore) || 0) + (Number(next.awayScore) || 0);
  if (newTotal > oldTotal) {
    playTrackedGoalEffect(previous, next);
    const current = signalForFixture(next.id);
    state.matchSignals[next.id] = { ...current, goalUntil: Date.now() + GOAL_PULSE_MS };
    saveSignals();
  }
}

function redCardIcons(count, side) {
  const total = Math.max(0, Number(count) || 0);
  if (!total) return "";
  const label = `${total} red card${total === 1 ? "" : "s"}`;
  return `<span class="team-red-cards ${side}" title="${label}" aria-label="${label}">${'<i></i>'.repeat(total)}</span>`;
}

function matchSignalParts(fixture) {
  const signal = signalForFixture(fixture.id);
  const goal = signal.goalUntil > Date.now()
    ? '<span class="goal-pulse" title="Goal detected in the last minute" aria-label="Goal detected in the last minute">⚽</span>'
    : '';
  return {
    homeCards: redCardIcons(signal.homeRedCards, "home"),
    awayCards: redCardIcons(signal.awayRedCards, "away"),
    goal: goal ? `<span class="match-signals">${goal}</span>` : "",
  };
}

async function refreshMatchSignals(fixtures) {
  if (state.signalRefreshInProgress || state.detailsRequestInProgress || state.activeView === "detailsView") return;
  const trackedLive = allListEntries().map(({ entry }) => entry.fixture).filter((fixture) => fixture?.status === "live");
  const live = [...new Map([...fixtures, ...trackedLive].filter((fixture) => fixture?.status === "live").map((fixture) => [String(fixture.id), fixture])).values()];
  if (!live.length || Date.now() - state.lastSignalRefresh < Math.max(5000, state.signalRefreshSeconds * 1000 - 1000)) return;

  const selectedIds = new Set(allListEntries().filter(({ entry }) => entry.fixture?.status === "live").map(({ id }) => String(id)));
  const ordered = [...live].sort((a, b) => Number(selectedIds.has(b.id)) - Number(selectedIds.has(a.id)) || Number(isFavourite(b)) - Number(isFavourite(a)) || a.timestamp - b.timestamp);
  const signalFixtures = [...new Map(ordered.map((fixture) => [String(fixture.id), fixture])).values()].slice(0, MAX_SIGNAL_FIXTURES);
  const ids = signalFixtures.map((fixture) => String(fixture.id));
  if (!ids.length) return;
  // Include the home and away API team IDs so the Worker can assign each dismissal
  // to the correct side without relying on variations in team names.
  const signalTokens = signalFixtures.map((fixture) => [fixture.id, fixture.homeId || "", fixture.awayId || ""].join(":"));

  state.lastSignalRefresh = Date.now();
  state.signalRefreshInProgress = true;
  try {
    const response = await fetch(`${API_BASE}/signals?ids=${encodeURIComponent(signalTokens.join(","))}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || data.error) return;
    (data.response || []).forEach((item) => {
      const id = String(item.fixtureId);
      const current = signalForFixture(id);
      const fixture = live.find((match) => String(match.id) === id);
      const teamCards = item.teamCards || {};
      const normaliseTeam = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
      const byKey = (teamId, teamName) => {
        const direct = teamCards[String(teamId)] ?? teamCards[String(teamName || "").trim().toLowerCase()];
        if (direct != null) return Number(direct) || 0;
        const wanted = normaliseTeam(teamName);
        const matchedKey = Object.keys(teamCards).find((key) => normaliseTeam(key) === wanted);
        return matchedKey ? Number(teamCards[matchedKey]) || 0 : 0;
      };
      const homeRedCards = item.homeRedCards != null ? Number(item.homeRedCards) || 0 : byKey(fixture?.homeId, fixture?.home);
      const awayRedCards = item.awayRedCards != null ? Number(item.awayRedCards) || 0 : byKey(fixture?.awayId, fixture?.away);
      state.matchSignals[id] = {
        ...current,
        redCards: Math.max(Number(current.redCards) || 0, Number(item.redCards) || homeRedCards + awayRedCards),
        homeRedCards: Math.max(Number(current.homeRedCards) || 0, homeRedCards),
        awayRedCards: Math.max(Number(current.awayRedCards) || 0, awayRedCards),
      };
    });
    saveSignals();
    renderFixtures();
    renderTracker();
  } catch {
    // Signal icons are supplementary; keep scores working if this request fails.
  } finally {
    state.signalRefreshInProgress = false;
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
    return "The live-data service is temporarily busy. Wait a moment, then tap Retry.";
  }
  return "Live fixtures could not be reached. Check your connection and try again.";
}

async function refreshLive({ manual = false } = {}) {
  if (document.hidden || state.refreshInProgress || state.detailsRequestInProgress) return;
  state.refreshInProgress = true;
  renderRefreshCountdown();
  const selectedFixtures = allListEntries().map(({ entry }) => entry.fixture);
  const selectedLive = selectedFixtures.some((fixture) => fixture.status === "live");
  const viewingToday = state.activeView === "scoresView" && state.selectedDate === isoDate(today);
  if (!manual && !selectedLive && !viewingToday) {
    state.refreshInProgress = false;
    scheduleNextRefresh();
    renderRefreshCountdown();
    return;
  }

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
    state.lastRefreshSucceededAt = Date.now();
    renderAll();
    refreshMatchSignals(liveFixtures);
  } catch {
    // Keep the last known scores visible if a background refresh fails.
  } finally {
    state.refreshInProgress = false;
    scheduleNextRefresh();
    renderRefreshCountdown();
  }
}

function liveRefreshMs() {
  return Math.max(0, Number(state.liveRefreshSeconds) || 0) * 1000;
}

function scheduleNextRefresh() {
  const interval = liveRefreshMs();
  state.nextRefreshAt = interval > 0 ? Date.now() + interval : 0;
}

function renderRefreshCountdown() {
  const button = document.getElementById("refreshCountdown");
  if (!button) return;
  if (state.refreshInProgress) {
    button.textContent = "Updating…";
    button.classList.add("updating");
    return;
  }
  button.classList.remove("updating");
  if (liveRefreshMs() === 0) {
    button.textContent = "Refresh now · Manual";
    return;
  }
  const seconds = Math.max(0, Math.ceil((state.nextRefreshAt - Date.now()) / 1000));
  button.textContent = seconds <= 0 ? "Updating…" : `Next update in ${seconds}s`;
}

function countdownTick() {
  renderRefreshCountdown();
  if (document.hidden) return;

  const liveFixtures = [
    ...(state.fixturesByDate[state.selectedDate] || []),
    ...allListEntries().map(({ entry }) => entry.fixture),
  ].filter((fixture) => fixture?.status === "live");

  if (liveFixtures.length && Date.now() - state.lastSignalRefresh >= state.signalRefreshSeconds * 1000) {
    refreshMatchSignals(liveFixtures);
  }

  if (state.refreshInProgress || liveRefreshMs() === 0) return;
  if (Date.now() >= state.nextRefreshAt) refreshLive();
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
  return formatFixtureTime(fixture);
}

function formatFixtureTime(fixture) {
  const stamp = Number(fixture?.timestamp);
  if (!Number.isFinite(stamp)) return fixture?.time || "";
  try {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: state.timeZone }).format(new Date(stamp));
  } catch {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: DEFAULT_TIME_ZONE }).format(new Date(stamp));
  }
}

function formatFixtureLocalDateTime(fixture) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: state.timeZone }).formatToParts(new Date(fixture.timestamp));
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}:${value.second}`;
  } catch { return new Date(fixture.timestamp).toISOString(); }
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

function rememberActiveScroll() {
  if (state.activeView === "scoresView") state.scoresScrollY = window.scrollY;
  if (state.activeView === "trackerView") state.trackerScrollY = window.scrollY;
}

function restoreScrollFor(viewId) {
  const position = viewId === "scoresView" ? state.scoresScrollY : viewId === "trackerView" ? state.trackerScrollY : 0;
  requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: position, left: 0, behavior: "auto" })));
}

function visibleFixtures() {
  const fixtures = [...(state.fixturesByDate[state.selectedDate] || [])];
  const query = state.search.trim().toLowerCase();
  const favouritesActive = state.favouriteLeagues.length > 0 && !state.showAllLeagues;
  return fixtures.filter((fixture) => {
    if (favouritesActive && !isFavourite(fixture)) return false;
    if (state.selectedOnly && !fixtureIsSelectedAnywhere(fixture.id)) return false;
    if (!query) return true;
    return `${fixture.home} ${fixture.away} ${fixture.league} ${fixture.country}`.toLowerCase().includes(query);
  });
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function fixtureResult(fixture) {
  if (fixture.status !== "finished") return "";
  if (fixture.homeScore > fixture.awayScore) return "H";
  if (fixture.homeScore < fixture.awayScore) return "A";
  return "D";
}

function downloadVisibleFixturesCsv() {
  const fixtures = visibleFixtures();
  if (!fixtures.length) { alert("There are no visible fixtures to export."); return; }
  const columns = ["fixture_id","kick_off_utc","kick_off_local","timezone","country","league_id","league","round","home_team_id","home_team","away_team_id","away_team","status","status_code","minute","half_time_home","half_time_away","home_goals","away_goals","result"];
  const rows = fixtures.map((fixture) => [
    fixture.id, new Date(fixture.timestamp).toISOString(), formatFixtureLocalDateTime(fixture), state.timeZone, fixture.country, fixture.leagueId || "", fixture.league, fixture.round || "", fixture.homeId || "", fixture.home, fixture.awayId || "", fixture.away, fixture.status, fixture.statusShort, fixture.minute ?? "", fixture.halfTimeHome ?? "", fixture.halfTimeAway ?? "", fixture.status === "scheduled" ? "" : fixture.homeScore, fixture.status === "scheduled" ? "" : fixture.awayScore, fixtureResult(fixture)
  ]);
  const csv = [columns, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `YorAkka-fixtures-${state.selectedDate}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderFixtures() {
  const list = document.getElementById("fixtureList");
  const fixtures = [...(state.fixturesByDate[state.selectedDate] || [])];
  const filtered = visibleFixtures();

  const notice = document.getElementById("favouriteFilterNotice");
  if (notice) {
    if (state.favouriteLeagues.length > 0) {
      notice.hidden = false;
      notice.innerHTML = state.showAllLeagues
        ? `<span>Showing all leagues.</span><button id="applyFavouriteFilter" type="button">Show favourites only</button>`
        : `<span>Showing ${state.favouriteLeagues.length} favourite ${state.favouriteLeagues.length === 1 ? "league" : "leagues"} only.</span><button id="showAllLeagues" type="button">Show all leagues</button>`;
      document.getElementById(state.showAllLeagues ? "applyFavouriteFilter" : "showAllLeagues")?.addEventListener("click", () => {
        state.showAllLeagues = !state.showAllLeagues;
        renderFixtures();
      });
    } else {
      notice.hidden = true;
      notice.innerHTML = "";
    }
  }

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
    const leagueHtml = [...countries.entries()].map(([country, leagues]) =>
      [...leagues.entries()].map(([key, matches]) => {
        const first = matches[0];
        const star = state.favouriteLeagues.includes(key) ? "★ " : "";
        return `
          <section class="league-group">
            <div class="league-heading"><span><em>${escapeHtml(country)}</em><i>·</i>${star}${escapeHtml(first.league)}</span><b>${matches.length} ${matches.length === 1 ? "match" : "matches"}</b></div>
            ${matches.map(fixtureCardHtml).join("")}
          </section>`;
      }).join("")
    ).join("");
    return `<section class="region-group"><div class="region-heading"><h3>${escapeHtml(region)}</h3><span>${matchCount} ${matchCount === 1 ? "match" : "matches"}</span></div>${leagueHtml}</section>`;
  }).join("");

  list.querySelectorAll("[data-fixture-id]").forEach((button) => {
    button.addEventListener("click", (event) => { event.stopPropagation(); openConditionDialog(button.dataset.fixtureId); });
  });
  bindFixtureDetailOpeners(list);
}

function fixtureCardHtml(fixture) {
  const selected = fixtureIsSelectedAnywhere(fixture.id);
  const signals = matchSignalParts(fixture);
  return `
    <article class="fixture-card" data-open-fixture="${fixture.id}" tabindex="0" role="button" aria-label="Open ${escapeHtml(fixture.home)} versus ${escapeHtml(fixture.away)} details">
      <div class="match-time ${fixture.status === "live" ? "live" : ""}">${escapeHtml(clockText(fixture))}<small>${escapeHtml(statusLabel(fixture))}</small></div>
      <div class="match-line">
        <strong class="home-team">${signals.homeCards}<span class="team-name">${escapeHtml(fixture.home)}</span></strong>
        <span class="central-score ${fixture.status === "scheduled" ? "scheduled" : ""}">${scoreText(fixture)}</span>
        <strong class="away-team"><span class="team-name">${escapeHtml(fixture.away)}</span>${signals.awayCards}</strong>
        ${signals.goal}
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
  rememberActiveScroll();
  const fixture = getFixtureById(id);
  if (!fixture) return;
  const existingList = Object.values(state.lists).find((list) => Boolean(list.selected?.[id]));
  const listOneIsEmpty = Boolean(state.lists.list1) && Object.keys(state.lists.list1.selected || {}).length === 0;
  if (existingList) {
    state.editingListId = existingList.id;
  } else if (state.editingFixtureId !== id || !state.editingListId) {
    state.editingListId = listOneIsEmpty ? "list1" : state.currentListId;
  }
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
  const returnView = state.activeView;
  state.editingFixtureId = null;
  state.editingListId = null;
  renderAll();
  restoreScrollFor(returnView);
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

  if (fixture.status === "finished") return winning ? { colour: "won", copy: "Won" } : { colour: "lost", copy: "Lost" };
  if (winning && ["over15", "over25", "over35", "bttsYes"].includes(condition)) return { colour: "won", copy: "Won" };
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
    [fixture(1, 1), "over15", "won", "Won"],
    [fixture(0, 0), "over25", "red", "Needs 3 goals"],
    [fixture(1, 1), "over25", "yellow", "Needs 1 goal"],
    [fixture(2, 1), "over25", "won", "Won"],
    [fixture(0, 0), "over35", "red", "Needs 4 goals"],
    [fixture(2, 1), "over35", "yellow", "Needs 1 goal"],
    [fixture(2, 2), "over35", "won", "Won"],
    [fixture(1, 0), "under15", "green", "Winning"],
    [fixture(1, 1), "under15", "lost", "Lost"],
    [fixture(2, 0), "under25", "green", "Winning"],
    [fixture(2, 1), "under25", "lost", "Lost"],
    [fixture(3, 0), "under35", "green", "Winning"],
    [fixture(2, 2), "under35", "lost", "Lost"],
    [fixture(0, 0), "bttsYes", "red", "Needs 2 goals"],
    [fixture(1, 0), "bttsYes", "yellow", "Needs 1 goal"],
    [fixture(1, 1), "bttsYes", "won", "Won"],
    [fixture(0, 0), "bttsNo", "green", "Winning"],
    [fixture(2, 0), "bttsNo", "green", "Winning"],
    [fixture(1, 1), "bttsNo", "lost", "Lost"],
    [fixture(1, 2, "finished"), "home", "red", "Lost"],
    [fixture(2, 1, "finished"), "home", "won", "Won"],
  ];

  const failures = cases.filter(([testFixture, condition, colour, copy]) => {
    const result = trafficState(testFixture, condition);
    return result.colour !== colour || result.copy !== copy;
  });

  if (failures.length) console.error("YorAkka traffic-light tests failed", failures);
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
      const rank = { yellow: 0, red: 1, green: 2, won: 3, lost: 4, grey: 5 };
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
      const signals = matchSignalParts(fixture);
      const heading = fixture.date !== previousDate ? `<div class="day-heading">${new Date(`${fixture.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>` : "";
      previousDate = fixture.date;
      return `${heading}
        <article class="tracker-card status-${status.colour} ${fixture.status === "live" ? "in-play" : ""}" data-open-fixture="${entry.id}" tabindex="0" role="button" aria-label="Open ${escapeHtml(fixture.home)} versus ${escapeHtml(fixture.away)} details">
          <div class="tracker-topline">
            <div class="tracker-clock">${escapeHtml(clockText(fixture))}<small>${escapeHtml(statusLabel(fixture))}</small></div>
            <div class="match-line tracker-match-line">
              <strong class="home-team">${signals.homeCards}<span class="team-name">${escapeHtml(fixture.home)}</span></strong>
              <span class="central-score ${fixture.status === "scheduled" ? "scheduled" : ""}">${scoreText(fixture)}</span>
              <strong class="away-team"><span class="team-name">${escapeHtml(fixture.away)}</span>${signals.awayCards}</strong>
              ${signals.goal}
            </div>
            <button class="remove-button" data-remove-id="${entry.id}" aria-label="Remove match">×</button>
          </div>
          <div class="tracker-meta">
            <span class="tracker-league">${escapeHtml(fixture.country)} · ${escapeHtml(fixture.league)}</span>
            <button class="condition-edit tracker-condition" data-edit-id="${entry.id}">${escapeHtml(conditionLabel(entry.condition))}</button>
            <span class="status-copy tracker-status">${escapeHtml(status.copy)}</span>
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
  renderSummaryLine();
}

function goalsNeededForSelection(fixture, condition) {
  if (!fixture || condition === "none" || fixture.status === "cancelled") return 0;
  const h = Number(fixture.homeScore) || 0;
  const a = Number(fixture.awayScore) || 0;
  const total = h + a;

  if (condition === "home") return Math.max(0, a - h + 1);
  if (condition === "draw") return Math.abs(h - a);
  if (condition === "away") return Math.max(0, h - a + 1);
  if (condition === "over15") return Math.max(0, 2 - total);
  if (condition === "over25") return Math.max(0, 3 - total);
  if (condition === "over35") return Math.max(0, 4 - total);
  if (condition === "bttsYes") return (h > 0 && a > 0) ? 0 : ((h > 0 || a > 0) ? 1 : 2);
  return 0;
}

function renderOverallListStatus(values) {
  const target = document.getElementById("overallListStatus");
  if (!target) return;

  if (!values.length) {
    target.hidden = true;
    target.className = "overall-list-status";
    target.textContent = "";
    return;
  }

  target.hidden = false;
  const statuses = values.map((entry) => trafficState(entry.fixture, entry.condition));
  if (statuses.some((status) => status.colour === "lost")) {
    target.className = "overall-list-status lost";
    target.textContent = "LOST";
    return;
  }

  const goalsNeeded = values.reduce((sum, entry) => sum + goalsNeededForSelection(entry.fixture, entry.condition), 0);
  if (goalsNeeded > 0) {
    target.className = "overall-list-status needed";
    target.textContent = `${goalsNeeded} ${goalsNeeded === 1 ? "GOAL" : "GOALS"} NEEDED`;
    return;
  }

  target.className = "overall-list-status correct";
  target.textContent = "ALL CORRECT";
}

function renderSummaryLine() {
  const values = Object.values(state.selected);
  const counts = { green: 0, yellow: 0, red: 0, won: 0, lost: 0, grey: 0 };
  values.forEach((entry) => {
    const colour = trafficState(entry.fixture, entry.condition).colour;
    counts[colour] = (counts[colour] || 0) + 1;
  });
  const boxes = [
    ["green", counts.green, "Winning"],
    ["yellow", counts.yellow, "Needs 1"],
    ["grey", counts.grey, "Upcoming"],
    ["won", counts.won, "Won"],
    ["red", counts.red, "Needs 2+"],
    ["lost", counts.lost, "Lost"],
  ];
  const target = document.getElementById("summaryBoxes");
  if (!target) return;
  target.innerHTML = boxes.map(([colour, value, label]) => `<div class="summary-mini ${colour}"><strong>${value}</strong><span>${label}</span></div>`).join("");
  renderOverallListStatus(values);
}

function leagueCategoryFor(league) {
  const name = String(league.league || "").toLowerCase();
  const type = String(league.type || "").toLowerCase();
  if (/women|woman|femin|frauen|femen|ladies|wsl|nadeshiko/.test(name)) return "women";
  if (/u[- ]?\d{2}|under[- ]?\d{2}|youth|junior|reserve|academy|primavera/.test(name)) return "youth";
  if (type === "cup" || /cup|pokal|copa|trophy|shield|super cup/.test(name)) return "cups";
  return "men";
}

async function loadLeagueCatalogue({ force = false } = {}) {
  if (state.leagueCatalogueLoading || (state.leagueCatalogueLoaded && !force)) return;
  state.leagueCatalogueLoading = true;
  state.leagueCatalogueError = "";
  renderFavouriteLeagues();
  try {
    const response = await fetch(`${API_BASE}/leagues`, { cache: force ? "reload" : "default" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load leagues");
    const catalogue = (Array.isArray(data.response) ? data.response : []).map((item) => ({
      key: `${item.country || "International"}|${item.name}`,
      country: item.country || "International",
      league: item.name,
      leagueId: item.id || null,
      type: item.type || "League",
      current: Boolean(item.current),
      season: item.season || null,
    }));
    const merged = new Map(catalogue.map((league) => [league.key, league]));
    state.knownLeagues.forEach((league) => {
      if (!merged.has(league.key)) merged.set(league.key, { ...league, current: false, type: league.type || "League" });
    });
    state.knownLeagues = [...merged.values()].sort((a, b) => `${a.country} ${a.league}`.localeCompare(`${b.country} ${b.league}`));
    state.leagueCatalogueLoaded = true;
    localStorage.setItem(`${STORAGE_PREFIX}known-leagues`, JSON.stringify(state.knownLeagues));
  } catch (error) {
    state.leagueCatalogueError = error.message || "Unable to load the league catalogue.";
    // Keep previously discovered and cached leagues usable when the catalogue endpoint is unavailable.
    state.leagueCatalogueLoaded = state.knownLeagues.length > 0;
  } finally {
    state.leagueCatalogueLoading = false;
    renderFavouriteLeagues();
  }
}

function renderFavouriteLeagues() {
  const container = document.getElementById("favouriteLeagueOptions");
  const help = document.getElementById("leagueHelp");
  if (!container || !help) return;

  if (state.leagueCatalogueLoading) {
    help.hidden = false;
    help.textContent = "Loading the full league catalogue…";
  } else if (state.leagueCatalogueError) {
    help.hidden = false;
    help.innerHTML = `${escapeHtml(state.leagueCatalogueError)} <button id="retryLeagueCatalogue" class="text-button" type="button">Try again</button>`;
    document.getElementById("retryLeagueCatalogue")?.addEventListener("click", () => loadLeagueCatalogue({ force: true }));
  } else {
    help.hidden = state.knownLeagues.length > 0;
    help.textContent = "No competitions match these filters.";
  }

  const query = state.leagueSearch.trim().toLowerCase();
  const filteredLeagues = state.knownLeagues.filter((league) => {
    if (state.currentLeaguesOnly && league.current === false) return false;
    const category = leagueCategoryFor(league);
    if (state.leagueCategory !== "all" && category !== state.leagueCategory) return false;
    return !query || `${league.country} ${league.league}`.toLowerCase().includes(query);
  });

  const regions = new Map();
  filteredLeagues.forEach((league) => {
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
            const season = league.season ? `<small>${escapeHtml(String(league.season))}</small>` : "";
            return `<label class="league-choice"><input type="checkbox" data-league value="${escapeHtml(league.key)}" data-country-key="${countryKey}" ${checked ? "checked" : ""}><span>${escapeHtml(league.league)}${season}</span></label>`;
          }).join("")}
        </div>
      </div>`;
    }).join("");
    return `<details class="favourite-region" ${region === "Europe" || (!regions.has("Europe") && index === 0) ? "open" : ""}>
      <summary><span>${escapeHtml(region)}</span><b>${favouriteCount ? `${favouriteCount} selected` : ""}</b></summary>
      <div class="favourite-region-content">${countryHtml}</div>
    </details>`;
  }).join("");

  if (!state.leagueCatalogueLoading && !state.leagueCatalogueError && filteredLeagues.length === 0) help.hidden = false;
  container.querySelectorAll("input[data-partial='true']").forEach((input) => { input.indeterminate = true; });
  container.querySelectorAll("input[data-league]").forEach((input) => input.addEventListener("change", () => {
    state.favouriteLeagues = input.checked ? [...new Set([...state.favouriteLeagues, input.value])] : state.favouriteLeagues.filter((key) => key !== input.value);
    state.showAllLeagues = false;
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
    state.showAllLeagues = false;
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
  if (state.completedCleanupHours <= 0) return;
  const cleanupDelay = state.completedCleanupHours * 60 * 60 * 1000;
  Object.values(state.lists).forEach((list) => {
    if (list.finishedAt && Date.now() - list.finishedAt >= cleanupDelay) {
      list.selected = {};
      list.finishedAt = null;
    }
  });
  saveSelected();
}

function renderListControls() {
  const tabs = document.getElementById("matchListTabs");
  if (!tabs) return;
  tabs.innerHTML = Object.values(state.lists).map((list) => `
    <button type="button" class="list-tab ${list.id === state.currentListId ? "active" : ""}" data-list-id="${escapeHtml(list.id)}" role="tab" aria-selected="${list.id === state.currentListId}">${escapeHtml(list.name)}</button>
  `).join("") + '<button type="button" id="newList" class="list-tab new-list-tab">+ New list</button>';
  document.getElementById("deleteList").disabled = Object.keys(state.lists).length <= 1;
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

function updateRedCardsFromEvents(fixture, events, match = {}) {
  const homeId = String(fixture.homeId ?? match.teams?.home?.id ?? "");
  const awayId = String(fixture.awayId ?? match.teams?.away?.id ?? "");
  const normalise = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  const seen = new Set();
  let homeRedCards = 0;
  let awayRedCards = 0;
  (Array.isArray(events) ? events : []).forEach((event) => {
    const text = `${event.type || ""} ${event.detail || ""} ${event.comments || ""}`.toLowerCase();
    if (!(text.includes("red card") || text.includes("second yellow") || text.includes("2nd yellow") || text.includes("yellow-red") || text.includes("yellow red"))) return;
    const key = [event.team?.id || event.team?.name || "", event.player?.id || event.player?.name || "", event.time?.elapsed || "", event.time?.extra || ""].join("|");
    if (seen.has(key)) return;
    seen.add(key);
    const eventTeamId = String(event.team?.id ?? "");
    const eventTeamName = normalise(event.team?.name);
    if ((eventTeamId && homeId && eventTeamId === homeId) || eventTeamName === normalise(fixture.home)) homeRedCards += 1;
    else if ((eventTeamId && awayId && eventTeamId === awayId) || eventTeamName === normalise(fixture.away)) awayRedCards += 1;
  });
  const current = signalForFixture(fixture.id);
  state.matchSignals[String(fixture.id)] = {
    ...current,
    redCards: Math.max(Number(current.redCards) || 0, homeRedCards + awayRedCards),
    homeRedCards: Math.max(Number(current.homeRedCards) || 0, homeRedCards),
    awayRedCards: Math.max(Number(current.awayRedCards) || 0, awayRedCards),
  };
  saveSignals();
}

async function openMatchDetails(id) {
  const fixture = getFixtureById(id);
  if (!fixture) return;
  if (state.activeView !== "detailsView") rememberActiveScroll();
  state.detailsPreviousView = state.activeView === "detailsView" ? state.detailsPreviousView : state.activeView;
  setView("detailsView");
  document.getElementById("detailsContent").innerHTML = detailsLoadingHtml(fixture);
  const cached = state.detailsCache[id];
  if (cached && Date.now() - cached.savedAt < 60000) {
    updateRedCardsFromEvents(fixture, cached.data.events, cached.data.fixture || {});
    renderMatchDetails(fixture, cached.data);
    return;
  }
  state.detailsRequestInProgress = true;
  try {
    let response;
    let data;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch(`${API_BASE}/fixture?id=${encodeURIComponent(fixture.apiId || fixture.id)}`, { cache: "no-store" });
      data = await response.json();
      if (response.ok && !data.error) break;
      const retryable = response.status === 429 || data.retryable;
      if (!retryable || attempt === 1) throw new Error(data.details || data.error || "Unable to load match details");
      document.getElementById("detailsContent").innerHTML = `${detailsHeaderHtml(fixture)}<div class="details-loading">The live-data service is busy. Retrying match details…</div>`;
      await new Promise((resolve) => setTimeout(resolve, 8000));
    }
    updateRedCardsFromEvents(fixture, data.events, data.fixture || {});
    state.detailsCache[id] = { savedAt: Date.now(), data };
    renderMatchDetails(fixture, data);
  } catch (error) {
    const message = String(error?.message || error || "Unable to load match details");
    const busy = /rate|too many|limit of requests|wait a few seconds/i.test(message);
    document.getElementById("detailsContent").innerHTML = `${detailsHeaderHtml(fixture)}<div class="empty-state"><strong>${busy ? "Live data temporarily busy" : "Details unavailable"}</strong>${busy ? "Wait a few seconds, then go Back and reopen this match." : escapeHtml(message)}</div>`;
  } finally {
    state.detailsRequestInProgress = false;
    state.lastSignalRefresh = Date.now();
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

function predictionSectionHtml(prediction) {
  const percentages = prediction?.predictions?.percent;
  if (!percentages) {
    return `<section class="details-section prediction-section"><h3>Prediction</h3><div class="prediction-unavailable">Prediction unavailable for this match.</div></section>`;
  }

  const cleanPercent = (value) => {
    const number = Number.parseFloat(String(value ?? "").replace("%", ""));
    return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 0;
  };
  const home = cleanPercent(percentages.home);
  const draw = cleanPercent(percentages.draw);
  const away = cleanPercent(percentages.away);
  const total = home + draw + away || 1;
  const homeWidth = (home / total) * 100;
  const drawWidth = (draw / total) * 100;
  const awayWidth = (away / total) * 100;

  return `<section class="details-section prediction-section">
    <h3>Prediction</h3>
    <div class="prediction-values" aria-label="Model prediction: home ${home} percent, draw ${draw} percent, away ${away} percent">
      <span><b>${home}%</b> Home</span>
      <span><b>${draw}%</b> Draw</span>
      <span><b>${away}%</b> Away</span>
    </div>
    <div class="prediction-bar" aria-hidden="true">
      <i class="prediction-home" style="width:${homeWidth}%"></i>
      <i class="prediction-draw" style="width:${drawWidth}%"></i>
      <i class="prediction-away" style="width:${awayWidth}%"></i>
    </div>
    <p class="prediction-note">Model estimate, not bookmaker odds.</p>
  </section>`;
}

function renderMatchDetails(fixture, data) {
  const events = Array.isArray(data.events) ? data.events : [];
  const statistics = Array.isArray(data.statistics) ? data.statistics : [];
  const lineups = Array.isArray(data.lineups) ? data.lineups : [];
  const match = data.fixture || {};
  const prediction = data.prediction || null;
  const eventHtml = events.length ? events.map((event) => {
    const minute = `${event.time?.elapsed ?? ""}${event.time?.extra ? `+${event.time.extra}` : ""}′`;
    const team = event.team?.name || "";
    const player = event.player?.name || event.assist?.name || "";
    const eventTeamId = String(event.team?.id ?? "");
    const homeId = String(fixture.homeId ?? match.teams?.home?.id ?? "");
    const awayId = String(fixture.awayId ?? match.teams?.away?.id ?? "");
    const normalise = (value) => String(value || "").trim().toLowerCase();
    let side = "neutral";
    if ((eventTeamId && homeId && eventTeamId === homeId) || normalise(team) === normalise(fixture.home)) side = "home";
    if ((eventTeamId && awayId && eventTeamId === awayId) || normalise(team) === normalise(fixture.away)) side = "away";
    return `<li class="event-${side}">
      <time>${escapeHtml(minute)}</time>
      <span class="event-icon">${eventIcon(event.type, event.detail)}</span>
      <div class="event-copy"><strong>${escapeHtml(event.detail || event.type || "Event")}</strong><p>${escapeHtml(player)}${team ? ` · ${escapeHtml(team)}` : ""}</p></div>
    </li>`;
  }).join("") : '<div class="empty-state compact"><strong>No timeline available</strong>Events may not be supplied for this competition.</div>';
  const statRows = statistics.length === 2 ? (statistics[0].statistics || []).map((stat, index) => {
    const away = statistics[1].statistics?.[index]?.value ?? "–";
    return `<div class="stat-row"><b>${escapeHtml(stat.value ?? "–")}</b><span>${escapeHtml(stat.type)}</span><b>${escapeHtml(away)}</b></div>`;
  }).join("") : "";
  const lineupHtml = lineups.length ? lineups.map((lineup) => `<section class="lineup-team"><h4>${escapeHtml(lineup.team?.name || "Team")}${lineup.formation ? ` · ${escapeHtml(lineup.formation)}` : ""}</h4><p>${(lineup.startXI || []).map((item) => escapeHtml(item.player?.name || "")).filter(Boolean).join(", ") || "Line-up unavailable"}</p></section>`).join("") : "";
  document.getElementById("detailsContent").innerHTML = `${detailsHeaderHtml(fixture)}
    <div class="details-meta">${match.fixture?.venue?.name ? `<span>⌖ ${escapeHtml(match.fixture.venue.name)}</span>` : ""}${match.fixture?.referee ? `<span>Referee: ${escapeHtml(match.fixture.referee)}</span>` : ""}</div>
    ${predictionSectionHtml(prediction)}
    <section class="details-section"><h3>Match timeline</h3><ol class="event-timeline">${eventHtml}</ol></section>
    ${statRows ? `<section class="details-section"><h3>Statistics</h3><div class="stats-table">${statRows}</div></section>` : ""}
    ${lineupHtml ? `<section class="details-section"><h3>Line-ups</h3><div class="lineups-grid">${lineupHtml}</div></section>` : ""}`;
}

function closeMatchDetails() {
  const returnView = state.detailsPreviousView || "scoresView";
  setView(returnView);
  restoreScrollFor(returnView);
}

function setView(viewId) {
  state.activeView = viewId;
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".bottom-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
  document.querySelector(".bottom-nav").classList.toggle("details-hidden", viewId === "detailsView");
  document.body.classList.toggle("tracker-active", viewId === "trackerView");
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
  renderSoundSetting();
  renderRefreshSettings();
  renderCleanupSetting();
  const count = allListEntries().length;
  const badge = document.getElementById("trackerBadge");
  badge.hidden = count === 0;
  badge.textContent = count;
  document.getElementById("clearTracker").disabled = Object.keys(state.selected).length === 0;
  document.getElementById("showSelectedOnly").classList.toggle("active", state.selectedOnly);
  document.getElementById("showSelectedOnly").setAttribute("aria-pressed", String(state.selectedOnly));
}

function renderRefreshSettings() {
  document.querySelectorAll("#liveRefreshControl button[data-seconds]").forEach((button) => {
    const active = Number(button.dataset.seconds) === state.liveRefreshSeconds;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("#signalRefreshControl button[data-seconds]").forEach((button) => {
    const active = Number(button.dataset.seconds) === state.signalRefreshSeconds;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderRefreshCountdown();
}

function renderCleanupSetting() {
  document.querySelectorAll("#completedCleanupControl button[data-hours]").forEach((button) => {
    const active = Number(button.dataset.hours) === state.completedCleanupHours;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const copy = document.getElementById("completedCleanupCopy");
  if (copy) copy.textContent = state.completedCleanupHours <= 0
    ? "Completed matches stay until you clear them manually."
    : `Lists clear ${state.completedCleanupHours === 24 ? "24 hours" : state.completedCleanupHours === 48 ? "48 hours" : "7 days"} after every tracked match is complete.`;
}

function renderSoundSetting() {
  const button = document.getElementById("goalSoundsToggle");
  if (!button) return;
  button.textContent = state.goalSoundsEnabled ? "On" : "Off";
  button.classList.toggle("active", state.goalSoundsEnabled);
}

const COMMON_TIME_ZONES = [
  ["Europe/London", "United Kingdom — London"], ["Europe/Dublin", "Ireland — Dublin"], ["Europe/Paris", "France — Paris"], ["Europe/Berlin", "Germany — Berlin"], ["Europe/Madrid", "Spain — Madrid"], ["Europe/Rome", "Italy — Rome"], ["America/New_York", "USA — New York"], ["America/Chicago", "USA — Chicago"], ["America/Denver", "USA — Denver"], ["America/Los_Angeles", "USA — Los Angeles"], ["America/Toronto", "Canada — Toronto"], ["America/Sao_Paulo", "Brazil — São Paulo"], ["Asia/Dubai", "UAE — Dubai"], ["Asia/Kolkata", "India — Kolkata"], ["Asia/Singapore", "Singapore"], ["Asia/Tokyo", "Japan — Tokyo"], ["Australia/Sydney", "Australia — Sydney"], ["Pacific/Auckland", "New Zealand — Auckland"]
];

function timeZoneLabel(zone) {
  return COMMON_TIME_ZONES.find(([id]) => id === zone)?.[1] || zone.replace(/_/g, " ");
}

function renderTimeZoneSetting() {
  const button = document.getElementById("timezonePickerButton");
  if (button) button.textContent = timeZoneLabel(state.timeZone);
}

function allTimeZones() {
  let zones = [];
  try { zones = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : []; } catch {}
  const merged = new Map(COMMON_TIME_ZONES);
  zones.forEach((zone) => { if (!merged.has(zone)) merged.set(zone, zone.replace(/_/g, " ")); });
  return [...merged.entries()];
}

function renderTimeZoneOptions(query = "") {
  const target = document.getElementById("timezoneOptions");
  const wanted = query.trim().toLowerCase();
  const options = allTimeZones().filter(([id, label]) => !wanted || `${id} ${label}`.toLowerCase().includes(wanted)).slice(0, 250);
  target.innerHTML = options.map(([id, label]) => `<button type="button" data-timezone="${escapeHtml(id)}" class="${id === state.timeZone ? "active" : ""}"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(id)}</small></button>`).join("");
}

function chooseTimeZone(zone) {
  try { new Intl.DateTimeFormat("en-GB", { timeZone: zone }).format(new Date()); } catch { return; }
  state.timeZone = zone;
  localStorage.setItem(`${STORAGE_PREFIX}time-zone`, zone);
  renderTimeZoneSetting();
  renderAll();
  document.getElementById("timezoneDialog").close();
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
  document.getElementById("downloadFixturesCsv").addEventListener("click", downloadVisibleFixturesCsv);
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
  document.getElementById("goalSoundsToggle").addEventListener("click", () => {
    state.goalSoundsEnabled = !state.goalSoundsEnabled;
    localStorage.setItem(`${STORAGE_PREFIX}goal-sounds`, String(state.goalSoundsEnabled));
    if (state.goalSoundsEnabled) ensureAudioContext();
    renderSoundSetting();
  });
  document.getElementById("testPositiveSound").addEventListener("click", () => { ensureAudioContext(); playGoalTone("positive"); });
  document.getElementById("testNegativeSound").addEventListener("click", () => { ensureAudioContext(); playGoalTone("negative"); });
  document.getElementById("liveRefreshControl").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-seconds]");
    if (!button) return;
    state.liveRefreshSeconds = Number(button.dataset.seconds);
    localStorage.setItem(`${STORAGE_PREFIX}live-refresh-seconds`, String(state.liveRefreshSeconds));
    scheduleNextRefresh();
    renderRefreshSettings();
  });
  document.getElementById("signalRefreshControl").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-seconds]");
    if (!button) return;
    state.signalRefreshSeconds = Number(button.dataset.seconds);
    localStorage.setItem(`${STORAGE_PREFIX}signal-refresh-seconds`, String(state.signalRefreshSeconds));
    state.lastSignalRefresh = 0;
    renderRefreshSettings();
  });
  document.getElementById("completedCleanupControl").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-hours]");
    if (!button) return;
    state.completedCleanupHours = Number(button.dataset.hours);
    localStorage.setItem(`${STORAGE_PREFIX}completed-cleanup-hours`, String(state.completedCleanupHours));
    autoClearIfDue();
    renderCleanupSetting();
    renderAll();
  });
  document.getElementById("timezonePickerButton").addEventListener("click", () => {
    document.getElementById("timezoneSearch").value = "";
    renderTimeZoneOptions();
    document.getElementById("timezoneDialog").showModal();
  });
  document.getElementById("closeTimezoneDialog").addEventListener("click", () => document.getElementById("timezoneDialog").close());
  document.getElementById("timezoneSearch").addEventListener("input", (event) => renderTimeZoneOptions(event.target.value));
  document.getElementById("timezoneOptions").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-timezone]");
    if (button) chooseTimeZone(button.dataset.timezone);
  });
  document.getElementById("jumpFavouriteLeagues").addEventListener("click", () => {
    const section = document.getElementById("favouriteLeaguesSection");
    section.open = true;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    section.classList.remove("jump-highlight");
    requestAnimationFrame(() => section.classList.add("jump-highlight"));
    setTimeout(() => section.classList.remove("jump-highlight"), 1300);
  });
  document.getElementById("leagueSearch").addEventListener("input", (event) => {
    state.leagueSearch = event.target.value;
    renderFavouriteLeagues();
  });
  document.getElementById("leagueCategoryControl").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    state.leagueCategory = button.dataset.category;
    document.querySelectorAll("#leagueCategoryControl button").forEach((item) => item.classList.toggle("active", item === button));
    renderFavouriteLeagues();
  });
  document.getElementById("currentLeaguesOnly").addEventListener("change", (event) => {
    state.currentLeaguesOnly = event.target.checked;
    renderFavouriteLeagues();
  });
  document.getElementById("refreshCountdown").addEventListener("click", () => refreshLive({ manual: true }));
  document.getElementById("densityControl").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-density]");
    if (!button) return;
    state.density = button.dataset.density;
    localStorage.setItem(`${STORAGE_PREFIX}density`, state.density);
    applyDensity();
  });
  document.getElementById("clearFavouriteLeagues").addEventListener("click", () => {
    state.favouriteLeagues = [];
    state.showAllLeagues = false;
    localStorage.setItem(`${STORAGE_PREFIX}favourite-leagues`, "[]");
    renderAll();
  });
  document.getElementById("matchListTabs").addEventListener("click", (event) => {
    const listButton = event.target.closest("button[data-list-id]");
    if (listButton) {
      state.currentListId = listButton.dataset.listId;
      saveSelected();
      renderAll();
      listButton.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      return;
    }
    if (event.target.closest("#newList")) {
      const proposed = prompt("Name this list", nextListName());
      if (proposed !== null) createList(proposed.trim() || nextListName());
    }
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
  document.getElementById("testRedCard").addEventListener("click", () => {
    const first = Object.entries(state.selected)[0];
    if (!first) { alert("Add a match to the active list first."); return; }
    const [id] = first;
    const current = signalForFixture(id);
    state.matchSignals[id] = { ...current, redCards: Math.max(1, Number(current.redCards) || 0), homeRedCards: Math.max(1, Number(current.homeRedCards) || 0), testRedCard: true, testRedCardBase: Number(current.redCards) || 0, testHomeRedCardBase: Number(current.homeRedCards) || 0 };
    saveSignals();
    renderAll();
    alert("A test red-card icon has been added to the first match in this list.");
  });
  document.getElementById("clearTestSignals").addEventListener("click", () => {
    Object.keys(state.matchSignals).forEach((id) => {
      if (state.matchSignals[id]?.testRedCard) {
        const signal = state.matchSignals[id];
        const base = Number(signal.testRedCardBase) || 0;
        const currentCount = Number(signal.redCards) || 0;
        state.matchSignals[id] = { ...signal, redCards: currentCount > 1 ? currentCount : base, homeRedCards: Number(signal.testHomeRedCardBase) || 0, testRedCard: false, testRedCardBase: undefined, testHomeRedCardBase: undefined };
      }
    });
    saveSignals();
    renderAll();
  });
  document.getElementById("clearTracker").addEventListener("click", () => document.getElementById("confirmDialog").showModal());
  document.getElementById("confirmDialog").addEventListener("close", (event) => {
    if (event.target.returnValue === "confirm") {
      state.selected = {};
      saveSelected();
      renderAll();
    }
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshLive({ manual: true }); });
}

async function start() {
  applyTheme();
  bindEvents();
  applyDensity();
  autoClearIfDue();
  renderAll();
  renderTimeZoneSetting();
  await Promise.all([loadDate(state.selectedDate), loadLeagueCatalogue()]);

  const liveItem = allListEntries().find(({ entry }) => entry.fixture?.status === "live");
  if (liveItem) { state.currentListId = liveItem.list.id; setView("trackerView"); }
  scheduleNextRefresh();
  renderRefreshSettings();
  setInterval(countdownTick, 1000);

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js?v=3.9").catch(() => {});
}

start();
