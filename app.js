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
  { id: "homeDraw", label: "Home or draw", group: "Double chance" },
  { id: "homeAway", label: "Home or away", group: "Double chance" },
  { id: "drawAway", label: "Draw or away", group: "Double chance" },
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
  fixtureStatusFilters: new Set(["all"]),
  search: "",
  trackerFilter: "all",
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
  editingListIds: [],
  editingMarket: "result",
  fixtureReturnId: null,
  fixtureReturnTop: null,
  audioBuffers: {},
  audioPreloadStarted: false,
  goalAlertSignatures: {},
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
  alertMode: localStorage.getItem(`${STORAGE_PREFIX}alert-mode`) || (localStorage.getItem(`${STORAGE_PREFIX}goal-sounds`) === "true" ? "sound" : "off"),
  alertVolume: Number(localStorage.getItem(`${STORAGE_PREFIX}alert-volume`) ?? 0.75),
  alertSoundPack: localStorage.getItem(`${STORAGE_PREFIX}alert-sound-pack`) || "stadium",
  liveRefreshSeconds: Number(localStorage.getItem(`${STORAGE_PREFIX}live-refresh-seconds`) ?? DEFAULT_LIVE_REFRESH_SECONDS),
  signalRefreshSeconds: Number(localStorage.getItem(`${STORAGE_PREFIX}signal-refresh-seconds`) ?? DEFAULT_SIGNAL_REFRESH_SECONDS),
  completedCleanupHours: Number(localStorage.getItem(`${STORAGE_PREFIX}completed-cleanup-hours`) ?? DEFAULT_COMPLETED_CLEANUP_HOURS),
  timeZone: localStorage.getItem(`${STORAGE_PREFIX}time-zone`) || DEFAULT_TIME_ZONE,
  fixtureOrder: localStorage.getItem(`${STORAGE_PREFIX}fixture-order`) || "smart",
  favouriteOrder: localStorage.getItem(`${STORAGE_PREFIX}favourite-order`) || "selected",
  trackerOrder: localStorage.getItem(`${STORAGE_PREFIX}tracker-order`) || "live",
  trackerCustomOrders: readJson(`${STORAGE_PREFIX}tracker-custom-orders`, {}),
  nextRefreshAt: Date.now() + DEFAULT_LIVE_REFRESH_SECONDS * 1000,
  refreshInProgress: false,
  lastRefreshSucceededAt: null,
  lastRefreshAttemptAt: null,
  lastRefreshFailedAt: null,
  lastSignalSucceededAt: null,
  lastSignalFailedAt: null,
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
    injuryMinute: Number.isFinite(item.fixture?.status?.extra) ? item.fixture.status.extra : null,
  };
}

function signalForFixture(id) {
  return state.matchSignals[String(id)] || { goalUntil: 0, redCards: 0, homeRedCards: 0, awayRedCards: 0, disallowedGoals: 0, homeDisallowedGoals: 0, awayDisallowedGoals: 0 };
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

function alertUsesSound() { return state.alertMode === "sound" || state.alertMode === "both"; }
function alertUsesVibration() { return state.alertMode === "vibration" || state.alertMode === "both"; }

function playGoalVibration(kind) {
  if (!alertUsesVibration() || !navigator.vibrate) return;
  navigator.vibrate(kind === "positive" ? [120, 90, 120] : [460]);
}

async function preloadAlertAudio() {
  if (state.audioPreloadStarted) return;
  state.audioPreloadStarted = true;
  const context = ensureAudioContext();
  if (!context) return;
  const files = { positive: "alert-crowd-positive.mp3", negative: "alert-crowd-negative.mp3" };
  await Promise.all(Object.entries(files).map(async ([kind, source]) => {
    try {
      const response = await fetch(source, { cache: "force-cache" });
      const buffer = await response.arrayBuffer();
      state.audioBuffers[kind] = await context.decodeAudioData(buffer.slice(0));
    } catch { /* HTMLAudio fallback remains available. */ }
  }));
}

function unlockAlertAudio() {
  const context = ensureAudioContext();
  if (context?.state === "suspended") context.resume().catch(() => {});
  preloadAlertAudio().catch(() => {});
}

function playAudioFileAlert(kind) {
  const context = ensureAudioContext();
  const buffer = state.audioBuffers[kind];
  if (context && buffer) {
    const sourceNode = context.createBufferSource();
    const gain = context.createGain();
    sourceNode.buffer = buffer;
    gain.gain.value = Math.max(0, Math.min(1, state.alertVolume));
    sourceNode.connect(gain).connect(context.destination);
    sourceNode.start();
    return;
  }
  const source = kind === "positive" ? "alert-crowd-positive.mp3" : "alert-crowd-negative.mp3";
  const audio = new Audio(source);
  audio.preload = "auto";
  audio.volume = Math.max(0, Math.min(1, state.alertVolume));
  audio.play().catch(() => {});
}

function playSynthAlert(kind, pack) {
  const context = ensureAudioContext();
  if (!context) return;
  const now = context.currentTime;
  let notes;
  if (pack === "minimal") {
    notes = kind === "positive"
      ? [{ frequency: 1400, delay: 0, duration: 0.055, type: "square" }, { frequency: 1800, delay: 0.12, duration: 0.065, type: "square" }]
      : [{ frequency: 430, delay: 0, duration: 0.08, type: "square" }, { frequency: 300, delay: 0.13, duration: 0.12, type: "square" }];
  } else if (pack === "whistle") {
    notes = kind === "positive"
      ? [{ frequency: 1700, endFrequency: 2250, delay: 0, duration: 0.10, type: "sine" }, { frequency: 1800, endFrequency: 2450, delay: 0.17, duration: 0.12, type: "sine" }]
      : [{ frequency: 950, endFrequency: 700, delay: 0, duration: 0.16, type: "sine" }, { frequency: 750, endFrequency: 500, delay: 0.22, duration: 0.20, type: "sine" }];
  } else {
    notes = kind === "positive"
      ? [{ frequency: 660, delay: 0, duration: 0.12, type: "triangle" }, { frequency: 990, delay: 0.17, duration: 0.18, type: "triangle" }]
      : [{ frequency: 240, delay: 0, duration: 0.14, type: "sine" }, { frequency: 150, delay: 0.20, duration: 0.22, type: "sine" }];
  }
  // Raised from V3.16 and slightly compressed so 75% is clearly audible on phone speakers.
  const peak = 0.42 * Math.max(0, Math.min(1, state.alertVolume));
  notes.forEach(({ frequency, endFrequency, delay, duration, type }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now + delay);
    if (endFrequency) oscillator.frequency.linearRampToValueAtTime(endFrequency, now + delay + duration);
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + delay + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + delay);
    oscillator.stop(now + delay + duration + 0.025);
  });
}

function playGoalTone(kind) {
  if (!alertUsesSound() || state.alertVolume <= 0) return;
  if (state.alertSoundPack === "stadium") playAudioFileAlert(kind);
  else playSynthAlert(kind, state.alertSoundPack);
}

function triggerGoalAlert(kind) {
  playGoalTone(kind);
  playGoalVibration(kind);
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
    const oldTeamsScored = Number(oldH > 0) + Number(oldA > 0);
    const newTeamsScored = Number(newH > 0) + Number(newA > 0);
    return newTeamsScored > oldTeamsScored ? "positive" : "neutral";
  }
  if (condition === "bttsNo") {
    const wasLost = oldH > 0 && oldA > 0;
    const nowLost = newH > 0 && newA > 0;
    return !wasLost && nowLost ? "negative" : "neutral";
  }
  if (["homeDraw", "homeAway", "drawAway"].includes(condition) || parseCorrectScore(condition)) {
    const before = trafficState(previous, condition);
    const after = trafficState(next, condition);
    if (after.colour === "lost" && before.colour !== "lost") return "negative";
    const beforeGoals = goalsNeededForSelection(previous, condition);
    const afterGoals = goalsNeededForSelection(next, condition);
    if (afterGoals < beforeGoals) return "positive";
    if (afterGoals > beforeGoals) return "negative";
    return "neutral";
  }
  return "neutral";
}

function playTrackedGoalEffect(previous, next) {
  const activeList = state.lists[state.currentListId];
  const condition = activeList?.selected?.[String(next.id)]?.condition;
  if (!condition || condition === "none") return;
  const effect = goalEffect(previous, next, condition);
  if (effect === "positive" || effect === "negative") triggerGoalAlert(effect);
}

function recordScoreChange(previous, next) {
  if (!previous || next.status !== "live") return;
  const oldTotal = (Number(previous.homeScore) || 0) + (Number(previous.awayScore) || 0);
  const newTotal = (Number(next.homeScore) || 0) + (Number(next.awayScore) || 0);
  if (newTotal > oldTotal) {
    const signature = `${next.homeScore}:${next.awayScore}`;
    if (state.goalAlertSignatures[String(next.id)] !== signature) {
      state.goalAlertSignatures[String(next.id)] = signature;
      playTrackedGoalEffect(previous, next);
    }
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

function disallowedGoalIcons(count, side) {
  const total = Math.max(0, Number(count) || 0);
  if (!total) return "";
  const label = `${total} disallowed goal${total === 1 ? "" : "s"}`;
  return `<span class="team-disallowed-goals ${side}" title="${label}" aria-label="${label}">${'<i aria-hidden="true">⚽</i>'.repeat(total)}</span>`;
}

function matchSignalParts(fixture) {
  const signal = signalForFixture(fixture.id);
  const goal = signal.goalUntil > Date.now()
    ? '<span class="goal-pulse" title="Goal detected in the last minute" aria-label="Goal detected in the last minute">⚽</span>'
    : '';
  return {
    homeCards: redCardIcons(signal.homeRedCards, "home"),
    awayCards: redCardIcons(signal.awayRedCards, "away"),
    homeDisallowed: disallowedGoalIcons(signal.homeDisallowedGoals, "home"),
    awayDisallowed: disallowedGoalIcons(signal.awayDisallowedGoals, "away"),
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
      const homeDisallowedGoals = Number(item.homeDisallowedGoals) || 0;
      const awayDisallowedGoals = Number(item.awayDisallowedGoals) || 0;
      state.matchSignals[id] = {
        ...current,
        redCards: Math.max(Number(current.redCards) || 0, Number(item.redCards) || homeRedCards + awayRedCards),
        homeRedCards: Math.max(Number(current.homeRedCards) || 0, homeRedCards),
        awayRedCards: Math.max(Number(current.awayRedCards) || 0, awayRedCards),
        disallowedGoals: Math.max(Number(current.disallowedGoals) || 0, Number(item.disallowedGoals) || homeDisallowedGoals + awayDisallowedGoals),
        homeDisallowedGoals: Math.max(Number(current.homeDisallowedGoals) || 0, homeDisallowedGoals),
        awayDisallowedGoals: Math.max(Number(current.awayDisallowedGoals) || 0, awayDisallowedGoals),
      };
    });
    saveSignals();
    state.lastSignalSucceededAt = Date.now();
    state.lastSignalFailedAt = null;
    renderFixtures();
    renderTracker();
    renderUpdateHealth();
  } catch {
    state.lastSignalFailedAt = Date.now();
    renderUpdateHealth();
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
  state.lastRefreshAttemptAt = Date.now();
  renderRefreshCountdown();
  renderUpdateHealth();
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
    state.lastRefreshFailedAt = null;
    renderAll();
    refreshMatchSignals(liveFixtures);
  } catch {
    state.lastRefreshFailedAt = Date.now();
    renderUpdateHealth();
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

function relativeSeconds(stamp) {
  if (!stamp) return null;
  return Math.max(0, Math.floor((Date.now() - stamp) / 1000));
}

function renderUpdateHealth() {
  const target = document.getElementById("updateHealth");
  if (!target) return;
  target.className = "update-health";
  if (!navigator.onLine) {
    target.textContent = "Offline · showing saved data";
    target.classList.add("warning");
    return;
  }
  if (state.refreshInProgress) {
    target.textContent = "Updating live scores…";
    target.classList.add("working");
    return;
  }
  const scoreAge = relativeSeconds(state.lastRefreshSucceededAt);
  const signalAge = relativeSeconds(state.lastSignalSucceededAt);
  const recentScoreFailure = state.lastRefreshFailedAt && (!state.lastRefreshSucceededAt || state.lastRefreshFailedAt > state.lastRefreshSucceededAt);
  const recentSignalFailure = state.lastSignalFailedAt && (!state.lastSignalSucceededAt || state.lastSignalFailedAt > state.lastSignalSucceededAt);
  if (recentScoreFailure) {
    target.textContent = "Live scores delayed · showing last update";
    target.classList.add("warning");
  } else if (scoreAge != null) {
    target.textContent = `Scores updated ${scoreAge < 2 ? "just now" : `${scoreAge}s ago`}${recentSignalFailure ? " · events delayed" : signalAge != null ? ` · events ${signalAge < 2 ? "just now" : `${signalAge}s ago`}` : ""}`;
    if (recentSignalFailure) target.classList.add("warning");
    else target.classList.add("healthy");
  } else {
    target.textContent = "Waiting for first live update";
  }
}

function countdownTick() {
  renderRefreshCountdown();
  renderUpdateHealth();
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
    const existing = merged.get(key) || {};
    // Preserve catalogue metadata (especially API leagueId and season history)
    // when the same league is rediscovered from an ordinary fixture response.
    merged.set(key, { ...existing, key, country: fixture.country, league: fixture.league });
  });
  state.knownLeagues = [...merged.values()].sort((a, b) => `${a.country} ${a.league}`.localeCompare(`${b.country} ${b.league}`));
  localStorage.setItem(`${STORAGE_PREFIX}known-leagues`, JSON.stringify(state.knownLeagues));
}

function fixtureLeagueKey(fixture) { return `${fixture.country}|${fixture.league}`; }
function isFavourite(fixture) { return state.favouriteLeagues.includes(fixtureLeagueKey(fixture)); }

function clockText(fixture) {
  if (fixture.status === "live") {
    if (fixture.statusShort === "HT") return "HT";
    const minute = Number(fixture.minute);
    const injuryMinute = Number(fixture.injuryMinute);
    if (Number.isFinite(minute) && Number.isFinite(injuryMinute) && injuryMinute > 0) {
      return `${minute}+${injuryMinute}′`;
    }
    return Number.isFinite(minute) && minute > 0 ? `${minute}′` : "LIVE";
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
  if (["INT", "SUSP"].includes(fixture.statusShort)) return fixture.statusShort === "INT" ? "INTERRUPTED" : "SUSPENDED";
  if (fixture.status === "live") {
    if (fixture.statusShort === "HT") return "HALF-TIME";
    if (fixture.statusShort === "ET") return "EXTRA TIME";
    if (fixture.statusShort === "P") return "PENALTIES";
    return "LIVE";
  }
  if (fixture.status === "finished") {
    if (fixture.statusShort === "AET") return "AFTER EXTRA TIME";
    if (fixture.statusShort === "PEN") return "AFTER PENALTIES";
    return "FINISHED";
  }
  if (fixture.status === "cancelled") return fixture.statusLong.toUpperCase();
  return "KICK-OFF";
}

function unusualOutcomeCopy(fixture) {
  const code = String(fixture.statusShort || "").toUpperCase();
  if (code === "PST") return "Postponed";
  if (code === "CANC") return "Cancelled";
  if (code === "ABD") return "Abandoned · check rules";
  if (["AWD", "WO"].includes(code)) return "Awarded · check rules";
  if (["INT", "SUSP"].includes(code)) return code === "INT" ? "Interrupted" : "Suspended";
  return fixture.statusLong || "Check match status";
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
    if (!state.fixtureStatusFilters.has("all") && !state.fixtureStatusFilters.has(fixture.status)) return false;
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

function fixtureLocalDateParts(fixture) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: state.timeZone,
    }).formatToParts(new Date(fixture.timestamp));
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { date: `${value.year}-${value.month}-${value.day}`, time: `${value.hour}:${value.minute}` };
  } catch {
    const fallback = new Date(fixture.timestamp);
    return { date: fallback.toISOString().slice(0, 10), time: fallback.toISOString().slice(11, 16) };
  }
}

function favouriteFixturesForCsv() {
  if (!state.favouriteLeagues.length) return [];
  const query = state.search.trim().toLowerCase();
  return [...(state.fixturesByDate[state.selectedDate] || [])].filter((fixture) => {
    if (!isFavourite(fixture)) return false;
    if (state.selectedOnly && !fixtureIsSelectedAnywhere(fixture.id)) return false;
    if (!state.fixtureStatusFilters.has("all") && !state.fixtureStatusFilters.has(fixture.status)) return false;
    if (!query) return true;
    return `${fixture.home} ${fixture.away} ${fixture.league} ${fixture.country}`.toLowerCase().includes(query);
  });
}

function updateCsvButtonState() {
  const button = document.getElementById("downloadFixturesCsv");
  if (!button) return;
  const enabled = state.favouriteLeagues.length > 0;
  button.disabled = !enabled;
  button.title = enabled
    ? "Download fixtures from your favourite leagues"
    : "Select at least one favourite league to enable CSV download";
  button.setAttribute("aria-disabled", String(!enabled));
}

function downloadVisibleFixturesCsv() {
  if (!state.favouriteLeagues.length) {
    alert("Select at least one favourite league before downloading a CSV.");
    return;
  }
  const fixtures = favouriteFixturesForCsv();
  if (!fixtures.length) { alert("There are no favourite-league fixtures to export for this date and filter."); return; }
  const columns = ["date", "time", "home team", "home goals", "away goals", "away team", "country", "league", "half time home", "half time away"];
  const rows = fixtures
    .sort((a, b) => a.timestamp - b.timestamp || a.country.localeCompare(b.country) || a.league.localeCompare(b.league))
    .map((fixture) => {
      const local = fixtureLocalDateParts(fixture);
      const hasScore = fixture.status !== "scheduled";
      return [
        local.date,
        local.time,
        fixture.home,
        hasScore ? fixture.homeScore : "",
        hasScore ? fixture.awayScore : "",
        fixture.away,
        fixture.country,
        fixture.league,
        fixture.halfTimeHome ?? "",
        fixture.halfTimeAway ?? "",
      ];
    });
  const csv = [columns, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `YorAkka-favourite-fixtures-${state.selectedDate}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}



function selectedFavouriteLeagueRecords() {
  const byKey = new Map(state.knownLeagues.map((league) => [league.key, league]));
  return state.favouriteLeagues.map((key) => {
    const known = byKey.get(key);
    if (known) return known;
    const separator = key.indexOf("|");
    return {
      key,
      country: separator >= 0 ? key.slice(0, separator) : "International",
      league: separator >= 0 ? key.slice(separator + 1) : key,
      leagueId: null,
      seasons: [],
    };
  });
}

function normaliseLeagueMatchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function leagueMatchSignature(country, league) {
  return `${normaliseLeagueMatchText(country)}|${normaliseLeagueMatchText(league)}`;
}

function mergeResolvedCatalogue(catalogue) {
  const merged = new Map(state.knownLeagues.map((league) => [league.key, league]));
  catalogue.forEach((league) => {
    const existing = merged.get(league.key) || {};
    merged.set(league.key, { ...existing, ...league });
  });
  state.knownLeagues = [...merged.values()].sort((a, b) => `${a.country} ${a.league}`.localeCompare(`${b.country} ${b.league}`));
  localStorage.setItem(`${STORAGE_PREFIX}known-leagues`, JSON.stringify(state.knownLeagues));
}

async function repairFavouriteLeagueApiIds(progressBar, progressText) {
  let selected = selectedFavouriteLeagueRecords();
  const missing = selected.filter((league) => !league?.leagueId);
  if (!missing.length) return selected;

  progressBar.max = missing.length + 1;
  progressBar.value = 0;
  progressText.textContent = `Matching ${missing.length} saved ${missing.length === 1 ? "league" : "leagues"} to API-Football…`;

  const data = await fetchJsonWithTimeout(`${API_BASE}/leagues`, { cache: "no-store" }, 25000);
  const catalogue = (Array.isArray(data.response) ? data.response : []).map((item) => ({
    key: `${item.country || "International"}|${item.name}`,
    country: item.country || "International",
    league: item.name,
    leagueId: item.id || null,
    type: item.type || "League",
    current: Boolean(item.current),
    season: item.season || null,
    seasons: Array.isArray(item.seasons) ? item.seasons.map((season) => ({
      year: Number(season.year),
      start: season.start || null,
      end: season.end || null,
      current: Boolean(season.current),
    })).filter((season) => Number.isFinite(season.year)) : [],
  })).filter((league) => league.leagueId);

  const exact = new Map(catalogue.map((league) => [league.key, league]));
  const bySignature = new Map();
  const byLeagueName = new Map();
  catalogue.forEach((league) => {
    bySignature.set(leagueMatchSignature(league.country, league.league), league);
    const name = normaliseLeagueMatchText(league.league);
    if (!byLeagueName.has(name)) byLeagueName.set(name, []);
    byLeagueName.get(name).push(league);
  });

  const repaired = [];
  missing.forEach((savedLeague, index) => {
    let match = exact.get(savedLeague.key) || bySignature.get(leagueMatchSignature(savedLeague.country, savedLeague.league));
    if (!match) {
      const nameMatches = byLeagueName.get(normaliseLeagueMatchText(savedLeague.league)) || [];
      if (nameMatches.length === 1) match = nameMatches[0];
    }
    if (match) {
      repaired.push({ ...match, key: savedLeague.key, country: savedLeague.country || match.country, league: savedLeague.league || match.league });
    }
    progressBar.value = index + 1;
  });

  mergeResolvedCatalogue(catalogue);
  // Preserve the user's original favourite keys while attaching the recovered API metadata.
  if (repaired.length) {
    const merged = new Map(state.knownLeagues.map((league) => [league.key, league]));
    repaired.forEach((league) => merged.set(league.key, { ...(merged.get(league.key) || {}), ...league }));
    state.knownLeagues = [...merged.values()].sort((a, b) => `${a.country} ${a.league}`.localeCompare(`${b.country} ${b.league}`));
    localStorage.setItem(`${STORAGE_PREFIX}known-leagues`, JSON.stringify(state.knownLeagues));
  }

  progressBar.value = missing.length + 1;
  selected = selectedFavouriteLeagueRecords();
  return selected;
}

function setResultsExportDefaults() {
  const toInput = document.getElementById("resultsToDate");
  const fromInput = document.getElementById("resultsFromDate");
  if (!toInput || !fromInput) return;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  const localIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (!toInput.value) toInput.value = localIso(end);
  if (!fromInput.value) fromInput.value = localIso(start);
}

function updateResultsExportDialog() {
  const count = document.getElementById("resultsLeagueCount");
  const button = document.getElementById("downloadResultsCsv");
  if (!count || !button) return;
  const selected = selectedFavouriteLeagueRecords();
  const withIds = selected.filter((league) => league?.leagueId);
  if (!state.favouriteLeagues.length) {
    count.textContent = "No Favourite Leagues selected. Choose leagues in Settings first.";
    button.disabled = true;
    return;
  }
  if (withIds.length !== state.favouriteLeagues.length) {
    const missing = state.favouriteLeagues.length - withIds.length;
    count.textContent = `${state.favouriteLeagues.length} selected leagues. YorAkka will automatically match ${missing} saved ${missing === 1 ? "league" : "leagues"} to API-Football before export.`;
    button.disabled = false;
    return;
  }
  count.textContent = `${state.favouriteLeagues.length} selected ${state.favouriteLeagues.length === 1 ? "league" : "leagues"}. League history will be checked when you download.`;
  button.disabled = false;
}

function seasonJobsForRange(leagues, from, to) {
  const jobs = [];
  leagues.forEach((league) => {
    (league.seasons || []).forEach((season) => {
      if (!season.start || !season.end || !season.year) return;
      const segmentFrom = season.start > from ? season.start : from;
      const segmentTo = season.end < to ? season.end : to;
      if (segmentFrom > segmentTo) return;
      jobs.push({ league, season: season.year, from: segmentFrom, to: segmentTo });
    });
  });
  return jobs;
}

function downloadCsvBlob(filename, columns, rows) {
  const csv = [columns, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json();
    if (!response.ok || data?.error) throw new Error(data?.details || data?.error || `Request failed (${response.status})`);
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("The request timed out. Please try again.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function mergeLeagueHistory(leagueId, seasons) {
  const id = Number(leagueId);
  state.knownLeagues = state.knownLeagues.map((league) => Number(league.leagueId) === id
    ? { ...league, seasons: Array.isArray(seasons) ? seasons : league.seasons }
    : league);
  localStorage.setItem(`${STORAGE_PREFIX}known-leagues`, JSON.stringify(state.knownLeagues));
}

async function refreshSelectedLeagueHistory(leagues, progressBar, progressText) {
  const needingHistory = leagues.filter((league) => league?.leagueId && (!Array.isArray(league.seasons) || !league.seasons.length));
  if (!needingHistory.length) return leagues;

  progressBar.max = needingHistory.length;
  progressBar.value = 0;
  for (let index = 0; index < needingHistory.length; index += 1) {
    const league = needingHistory[index];
    progressText.textContent = `Checking league history ${index + 1}/${needingHistory.length}: ${league.country} — ${league.league}`;
    const data = await fetchJsonWithTimeout(`${API_BASE}/league-history?league=${encodeURIComponent(league.leagueId)}`, { cache: "no-store" }, 20000);
    mergeLeagueHistory(league.leagueId, data.seasons || []);
    progressBar.value = index + 1;
    if (index < needingHistory.length - 1) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return selectedFavouriteLeagueRecords();
}

function preferredLeagueSeason(league) {
  const seasons = Array.isArray(league?.seasons) ? league.seasons.filter((season) => Number.isFinite(Number(season?.year))) : [];
  const current = seasons.find((season) => season.current);
  if (current) return Number(current.year);
  if (league?.season && Number.isFinite(Number(league.season))) return Number(league.season);
  return seasons.length ? Math.max(...seasons.map((season) => Number(season.year))) : null;
}

async function downloadSelectedLeagueTeamsCsv() {
  const progressWrap = document.getElementById("resultsExportProgress");
  const progressBar = document.getElementById("resultsProgressBar");
  const progressText = document.getElementById("resultsProgressText");
  const resultsButton = document.getElementById("downloadResultsCsv");
  const teamButton = document.getElementById("downloadTeamListCsv");

  if (!state.favouriteLeagues.length) {
    alert("Select at least one Favourite League in Settings first.");
    return;
  }

  let leagues = selectedFavouriteLeagueRecords();
  resultsButton.disabled = true;
  teamButton.disabled = true;
  progressWrap.hidden = false;
  progressText.textContent = "Preparing team list…";

  try {
    if (!leagues.length || leagues.some((league) => !league?.leagueId)) {
      leagues = await repairFavouriteLeagueApiIds(progressBar, progressText);
      const unresolved = leagues.filter((league) => !league?.leagueId);
      if (unresolved.length) throw new Error(`${unresolved.length} selected ${unresolved.length === 1 ? "league could" : "leagues could"} not be matched to API-Football.`);
    }

    leagues = await refreshSelectedLeagueHistory(leagues, progressBar, progressText);
    const jobs = leagues.map((league) => ({ league, season: preferredLeagueSeason(league) })).filter((job) => job.league?.leagueId && job.season);
    if (!jobs.length) throw new Error("No current/latest season could be identified for the selected leagues.");

    progressBar.max = jobs.length;
    progressBar.value = 0;
    const rows = [];
    const failures = [];

    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index];
      progressText.textContent = `Downloading teams ${index + 1}/${jobs.length}: ${job.league.country} — ${job.league.league} (${job.season})`;
      try {
        const params = new URLSearchParams({ league: String(job.league.leagueId), season: String(job.season) });
        const data = await fetchJsonWithTimeout(`${API_BASE}/teams?${params.toString()}`, { cache: "no-store" }, 25000);
        (Array.isArray(data.response) ? data.response : []).forEach((item) => {
          const name = item?.team?.name || item?.name || "";
          if (name) rows.push([job.league.country, job.league.league, job.season, name]);
        });
      } catch (error) {
        failures.push(`${job.league.country} — ${job.league.league} (${job.season})`);
      }
      progressBar.value = index + 1;
      if (index < jobs.length - 1) await new Promise((resolve) => setTimeout(resolve, 350));
    }

    const deduped = [...new Map(rows.map((row) => [`${row[0]}|${row[1]}|${row[2]}|${row[3]}`, row])).values()]
      .sort((a, b) => `${a[0]} ${a[1]} ${a[3]}`.localeCompare(`${b[0]} ${b[1]} ${b[3]}`));

    if (!deduped.length) {
      progressText.textContent = failures.length ? "No team lists downloaded; some requests failed." : "No teams were returned for the selected leagues.";
      return;
    }

    progressText.textContent = "Creating team list CSV…";
    downloadCsvBlob(`YorAkka-selected-league-teams.csv`, ["country", "league", "season", "team"], deduped);
    progressText.textContent = `${deduped.length} teams downloaded${failures.length ? ` · ${failures.length} league request${failures.length === 1 ? "" : "s"} failed` : ""}.`;
    if (failures.length) alert(`The team-list CSV was created, but ${failures.length} league request${failures.length === 1 ? "" : "s"} failed, so it may be incomplete.`);
  } catch (error) {
    progressText.textContent = error.message || "Team list export failed.";
    alert(error.message || "Team list export failed.");
  } finally {
    resultsButton.disabled = false;
    teamButton.disabled = false;
  }
}

async function openResultsExportDialog() {
  setResultsExportDefaults();
  updateResultsExportDialog();
  const progress = document.getElementById("resultsExportProgress");
  progress.hidden = true;
  document.getElementById("resultsProgressBar").value = 0;
  document.getElementById("resultsProgressText").textContent = "";
  document.getElementById("resultsExportDialog").showModal();
}

async function downloadHistoricalResultsCsv() {
  const from = document.getElementById("resultsFromDate").value;
  const to = document.getElementById("resultsToDate").value;
  const progressWrap = document.getElementById("resultsExportProgress");
  const progressBar = document.getElementById("resultsProgressBar");
  const progressText = document.getElementById("resultsProgressText");
  const button = document.getElementById("downloadResultsCsv");

  if (!state.favouriteLeagues.length) {
    alert("Select at least one Favourite League in Settings first.");
    return;
  }
  if (!from || !to || from > to) {
    alert("Choose a valid From and To date.");
    return;
  }

  let leagues = selectedFavouriteLeagueRecords();

  button.disabled = true;
  progressWrap.hidden = false;
  progressText.textContent = "Preparing export…";
  const failures = [];

  try {
    if (!leagues.length || leagues.some((league) => !league?.leagueId)) {
      try {
        leagues = await repairFavouriteLeagueApiIds(progressBar, progressText);
      } catch (error) {
        progressText.textContent = error.message || "Could not match saved leagues.";
        alert(`Could not match your saved Favourite Leagues to API-Football. ${error.message || "Please try again."}`);
        return;
      }
      const unresolved = leagues.filter((league) => !league?.leagueId);
      if (unresolved.length) {
        const names = unresolved.slice(0, 4).map((league) => `${league.country} — ${league.league}`).join("\n");
        progressText.textContent = `${unresolved.length} selected ${unresolved.length === 1 ? "league could" : "leagues could"} not be matched.`;
        alert(`YorAkka could not match ${unresolved.length} selected ${unresolved.length === 1 ? "league" : "leagues"} to API-Football.${names ? `\n\n${names}` : ""}`);
        return;
      }
    }

    try {
      leagues = await refreshSelectedLeagueHistory(leagues, progressBar, progressText);
    } catch (error) {
      progressText.textContent = error.message || "League history check failed.";
      alert(`Could not refresh league history. ${error.message || "Please try again."}`);
      return;
    }

    const unavailable = leagues.filter((league) => !league.leagueId || !Array.isArray(league.seasons) || !league.seasons.length);
    if (unavailable.length) {
      progressText.textContent = `League history unavailable for ${unavailable.length} selected ${unavailable.length === 1 ? "league" : "leagues"}.`;
      alert(`Historical season information is unavailable for ${unavailable.length} selected ${unavailable.length === 1 ? "league" : "leagues"}.`);
      return;
    }

    const jobs = seasonJobsForRange(leagues, from, to);
    if (!jobs.length) {
      progressText.textContent = "No selected league has a season covering that date range.";
      alert("None of the selected leagues has a season covering that date range.");
      return;
    }

    progressBar.max = jobs.length;
    progressBar.value = 0;
    const fixtures = new Map();

    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index];
      progressText.textContent = `Downloading results ${index + 1}/${jobs.length}: ${job.league.country} — ${job.league.league} (${job.season})`;
      try {
        const params = new URLSearchParams({ league: String(job.league.leagueId), season: String(job.season), from: job.from, to: job.to });
        const data = await fetchJsonWithTimeout(`${API_BASE}/results?${params.toString()}`, { cache: "no-store" }, 25000);
        (data.response || []).forEach((item) => {
          const fixture = normaliseFixture(item);
          if (fixture.status === "finished") fixtures.set(fixture.id, fixture);
        });
      } catch (error) {
        failures.push(`${job.league.country} — ${job.league.league} (${job.season})`);
      }
      progressBar.value = index + 1;
      if (index < jobs.length - 1) await new Promise((resolve) => setTimeout(resolve, 400));
    }

    progressText.textContent = "Creating CSV…";
    const rows = [...fixtures.values()]
      .filter((fixture) => {
        const parts = fixtureLocalDateParts(fixture);
        return parts.date >= from && parts.date <= to;
      })
      .sort((a, b) => a.timestamp - b.timestamp || a.home.localeCompare(b.home))
      .map((fixture) => {
        const local = fixtureLocalDateParts(fixture);
        return [local.date, local.time, fixture.home, fixture.homeScore, fixture.awayScore, fixture.away];
      });

    if (!rows.length) {
      progressText.textContent = failures.length ? "No results downloaded; some requests failed." : "No completed results were found for those dates.";
      if (failures.length) alert(`No results were downloaded. ${failures.length} league-season request${failures.length === 1 ? "" : "s"} failed.`);
      return;
    }

    downloadCsvBlob(`YorAkka-results-${from}-to-${to}.csv`, ["date", "time", "home team", "home goals", "away goals", "away team"], rows);
    progressText.textContent = `${rows.length} results downloaded${failures.length ? ` · ${failures.length} request${failures.length === 1 ? "" : "s"} failed` : ""}.`;
    if (failures.length) alert(`The CSV was created, but ${failures.length} league-season request${failures.length === 1 ? "" : "s"} failed, so the export may be incomplete.`);
  } finally {
    button.disabled = false;
  }
}

function fixtureGroupStats(matches) {
  return {
    earliest: Math.min(...matches.map((fixture) => fixture.timestamp)),
    hasLive: matches.some((fixture) => fixture.status === "live"),
    priority: Math.min(...matches.map((fixture) => leaguePriority(fixture.league))),
    favourite: matches.some(isFavourite),
    country: matches[0]?.country || "International",
    league: matches[0]?.league || "",
  };
}

function compareFixtureGroups(a, b) {
  const A = fixtureGroupStats(a.matches);
  const B = fixtureGroupStats(b.matches);
  switch (state.fixtureOrder) {
    case "alphabetical":
      return A.league.localeCompare(B.league) || A.country.localeCompare(B.country);
    case "popularity":
      return A.priority - B.priority || A.league.localeCompare(B.league) || A.country.localeCompare(B.country);
    case "country":
      return A.country.localeCompare(B.country) || A.league.localeCompare(B.league);
    case "kickoff":
      return A.earliest - B.earliest || A.country.localeCompare(B.country) || A.league.localeCompare(B.league);
    case "live":
      return Number(B.hasLive) - Number(A.hasLive) || A.earliest - B.earliest || A.priority - B.priority;
    default:
      return regionRank(A.country) - regionRank(B.country) || Number(B.favourite) - Number(A.favourite) || A.priority - B.priority || A.country.localeCompare(B.country) || A.league.localeCompare(B.league);
  }
}

function renderOrderingSettings() {
  document.querySelectorAll("#fixtureOrderControl button[data-order]").forEach((button) => button.classList.toggle("active", button.dataset.order === state.fixtureOrder));
  document.querySelectorAll("#favouriteOrderControl button[data-order]").forEach((button) => button.classList.toggle("active", button.dataset.order === state.favouriteOrder));
  document.querySelectorAll("#trackerOrderControl button[data-order]").forEach((button) => button.classList.toggle("active", button.dataset.order === state.trackerOrder));
}

function favouriteSelectionRank(key) {
  const index = state.favouriteLeagues.indexOf(key);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function compareFavouriteCountries([countryA, leaguesA], [countryB, leaguesB]) {
  const selectedA = leaguesA.filter((league) => state.favouriteLeagues.includes(league.key)).length;
  const selectedB = leaguesB.filter((league) => state.favouriteLeagues.includes(league.key)).length;
  const bestA = Math.min(...leaguesA.map((league) => leaguePriority(league.league)));
  const bestB = Math.min(...leaguesB.map((league) => leaguePriority(league.league)));
  const recentA = Math.min(...leaguesA.map((league) => favouriteSelectionRank(league.key)));
  const recentB = Math.min(...leaguesB.map((league) => favouriteSelectionRank(league.key)));
  switch (state.favouriteOrder) {
    case "alphabetical": return countryA.localeCompare(countryB);
    case "popularity": return bestA - bestB || countryA.localeCompare(countryB);
    case "country": return countryA.localeCompare(countryB);
    case "recent": return recentA - recentB || countryA.localeCompare(countryB);
    default: return selectedB - selectedA || bestA - bestB || countryA.localeCompare(countryB);
  }
}


function leagueHierarchyRank(league) {
  const name = String(league?.league || league || "").toLowerCase();
  const type = String(league?.type || "").toLowerCase();
  const youth = /u[- ]?\d{2}|under[- ]?\d{2}|youth|junior|reserve|academy|primavera/.test(name);
  const women = /women|woman|femin|frauen|femen|ladies|wsl|nadeshiko/.test(name);
  const cup = type === "cup" || /cup|pokal|copa|trophy|shield|super cup|fa cup|league cup/.test(name);
  if (youth) return 900;
  if (women) return 800;
  if (cup) return 700;
  const tiers = [
    [/premier league|bundesliga$|la liga$|serie a$|ligue 1$|eredivisie$|primeira liga$|premiership$/, 1],
    [/championship|2\.? bundesliga|segunda|serie b|ligue 2|eerste divisie|liga portugal 2/, 2],
    [/league one|3\.? liga|tercera|national 1|serie c/, 3],
    [/league two|regionalliga|national league/, 4],
    [/oberliga|national league north|national league south|regional/, 5],
  ];
  for (const [pattern, rank] of tiers) if (pattern.test(name)) return rank;
  const number = name.match(/(?:division|league|liga|serie)\s*(\d+)/)?.[1];
  if (number) return Math.min(50, Number(number));
  return 100;
}

function compareFavouriteLeagues(a, b) {
  const selectedA = state.favouriteLeagues.includes(a.key);
  const selectedB = state.favouriteLeagues.includes(b.key);
  const hierarchy = leagueHierarchyRank(a) - leagueHierarchyRank(b);
  switch (state.favouriteOrder) {
    case "alphabetical": return hierarchy || a.league.localeCompare(b.league);
    case "country": return hierarchy || a.league.localeCompare(b.league);
    case "popularity": return leaguePriority(a.league) - leaguePriority(b.league) || hierarchy || a.league.localeCompare(b.league);
    case "recent": return favouriteSelectionRank(a.key) - favouriteSelectionRank(b.key) || hierarchy || a.league.localeCompare(b.league);
    default: return Number(selectedB) - Number(selectedA) || hierarchy || leaguePriority(a.league) - leaguePriority(b.league) || a.league.localeCompare(b.league);
  }
}

function renderFixtureStatusFilters() {
  document.querySelectorAll("#fixtureStatusFilters [data-fixture-status]").forEach((button) => {
    const active = state.fixtureStatusFilters.has(button.dataset.fixtureStatus);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function toggleFixtureStatusFilter(value) {
  if (value === "all") {
    state.fixtureStatusFilters = new Set(["all"]);
  } else {
    const next = new Set(state.fixtureStatusFilters);
    next.delete("all");
    if (next.has(value)) next.delete(value); else next.add(value);
    const specific = ["scheduled", "live", "finished"];
    if (!next.size || specific.every((status) => next.has(status))) state.fixtureStatusFilters = new Set(["all"]);
    else state.fixtureStatusFilters = next;
  }
  renderFixtures();
}

function renderFixtures() {
  updateCsvButtonState();
  renderFixtureStatusFilters();
  const list = document.getElementById("fixtureList");
  const fixtures = [...(state.fixturesByDate[state.selectedDate] || [])];
  const filtered = visibleFixtures();

  const notice = document.getElementById("favouriteFilterNotice");
  if (notice) {
    if (state.favouriteLeagues.length > 0) {
      notice.hidden = false;
      const gameCountLabel = `${filtered.length} ${filtered.length === 1 ? "game" : "games"}`;
      notice.innerHTML = state.showAllLeagues
        ? `<span>Showing all leagues. · ${gameCountLabel}</span><button id="applyFavouriteFilter" type="button">Show favourites only</button>`
        : `<span>Showing ${state.favouriteLeagues.length} favourite ${state.favouriteLeagues.length === 1 ? "league" : "leagues"} only. · ${gameCountLabel}</span><button id="showAllLeagues" type="button">Show all leagues</button>`;
      document.getElementById(state.showAllLeagues ? "applyFavouriteFilter" : "showAllLeagues")?.addEventListener("click", () => {
        state.showAllLeagues = !state.showAllLeagues;
        renderFixtures();
      });
    } else {
      notice.hidden = true;
      notice.innerHTML = "";
    }
  }

  filtered.sort((a, b) => a.timestamp - b.timestamp);

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

  const groups = [];
  regions.forEach((countries, region) => countries.forEach((leagues, country) => leagues.forEach((matches, key) => groups.push({ region, country, key, matches }))));
  groups.sort(compareFixtureGroups);

  if (["alphabetical", "popularity", "country", "kickoff", "live"].includes(state.fixtureOrder)) {
    list.innerHTML = groups.map(({ country, key, matches }) => {
      const first = matches[0];
      const star = state.favouriteLeagues.includes(key) ? "★ " : "";
      return `<section class="league-group">
        <div class="league-heading"><span><em>${escapeHtml(country)}</em><i>·</i>${star}${escapeHtml(first.league)}</span><b>${matches.length} ${matches.length === 1 ? "match" : "matches"}</b></div>
        ${matches.sort((a, b) => a.timestamp - b.timestamp).map(fixtureCardHtml).join("")}
      </section>`;
    }).join("");
  } else {
    const orderedRegions = new Map();
    groups.forEach((group) => {
      if (!orderedRegions.has(group.region)) orderedRegions.set(group.region, []);
      orderedRegions.get(group.region).push(group);
    });
    list.innerHTML = [...orderedRegions.entries()].map(([region, regionGroups]) => {
      const matchCount = regionGroups.reduce((total, group) => total + group.matches.length, 0);
      const leagueHtml = regionGroups.map(({ country, key, matches }) => {
        const first = matches[0];
        const star = state.favouriteLeagues.includes(key) ? "★ " : "";
        return `<section class="league-group">
          <div class="league-heading"><span><em>${escapeHtml(country)}</em><i>·</i>${star}${escapeHtml(first.league)}</span><b>${matches.length} ${matches.length === 1 ? "match" : "matches"}</b></div>
          ${matches.sort((a, b) => a.timestamp - b.timestamp).map(fixtureCardHtml).join("")}
        </section>`;
      }).join("");
      return `<section class="region-group"><div class="region-heading"><h3>${escapeHtml(region)}</h3><span>${matchCount} ${matchCount === 1 ? "match" : "matches"}</span></div>${leagueHtml}</section>`;
    }).join("");
  }

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
        <strong class="home-team">${signals.homeDisallowed}${signals.homeCards}<span class="team-name">${escapeHtml(fixture.home)}</span></strong>
        <span class="central-score ${fixture.status === "scheduled" ? "scheduled" : ""}">${scoreText(fixture)}</span>
        <strong class="away-team"><span class="team-name">${escapeHtml(fixture.away)}</span>${signals.awayCards}${signals.awayDisallowed}</strong>
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

function scoreWheelMarkup(id, label, selected) {
  return `<div class="score-wheel-wrap">
    <span>${label}</span>
    <div id="${id}" class="score-wheel" role="listbox" aria-label="${label} score" data-value="${selected}">
      ${Array.from({ length: 10 }, (_, index) => 9 - index).map((score) => `<button type="button" class="score-wheel-item ${score === selected ? "selected" : ""}" role="option" aria-selected="${score === selected ? "true" : "false"}" data-score="${score}">${score}</button>`).join("")}
    </div>
  </div>`;
}

function setScoreWheelValue(wheel, value, smooth = false) {
  if (!wheel) return;
  const numeric = Math.max(0, Math.min(9, Number(value) || 0));
  wheel.dataset.value = String(numeric);
  wheel.querySelectorAll(".score-wheel-item").forEach((item) => {
    const selected = Number(item.dataset.score) === numeric;
    item.classList.toggle("selected", selected);
    item.setAttribute("aria-selected", selected ? "true" : "false");
  });
  const target = wheel.querySelector(`[data-score="${numeric}"]`);
  if (target) target.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
}

function bindScoreWheel(wheel) {
  if (!wheel) return;
  let settleTimer = null;
  const settle = () => {
    const rect = wheel.getBoundingClientRect();
    const centre = rect.top + rect.height / 2;
    let best = null;
    let distance = Infinity;
    wheel.querySelectorAll(".score-wheel-item").forEach((item) => {
      const itemRect = item.getBoundingClientRect();
      const itemCentre = itemRect.top + itemRect.height / 2;
      const nextDistance = Math.abs(itemCentre - centre);
      if (nextDistance < distance) { best = item; distance = nextDistance; }
    });
    if (best) setScoreWheelValue(wheel, Number(best.dataset.score));
  };
  wheel.addEventListener("click", (event) => {
    const item = event.target.closest(".score-wheel-item");
    if (item) setScoreWheelValue(wheel, Number(item.dataset.score), true);
  });
  wheel.addEventListener("scroll", () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 90);
  }, { passive: true });
}

function marketForCondition(condition) {
  if (["home", "draw", "away"].includes(condition)) return "result";
  if (["homeDraw", "homeAway", "drawAway"].includes(condition)) return "double";
  if (["over15", "over25", "over35", "under15", "under25", "under35"].includes(condition)) return "goals";
  if (["bttsYes", "bttsNo"].includes(condition)) return "btts";
  if (parseCorrectScore(condition)) return "score";
  return null;
}

function marketTitle(market) {
  return ({ result: "Result", double: "Double chance", goals: "Goals", btts: "BTTS", score: "Correct score" })[market] || "Choose type";
}

function renderConditionTypeStep(current) {
  const container = document.getElementById("conditionOptions");
  if (!container) return;
  const selectedMarket = marketForCondition(current);
  container.innerHTML = `
    <div class="condition-step-heading">
      <span>1</span>
      <div><strong>Choose type</strong><small>What do you want to track?</small></div>
    </div>
    <div class="condition-type-grid" role="group" aria-label="Choose result type">
      <button type="button" class="condition-type-button ${selectedMarket === "result" ? "has-current" : ""}" data-market="result"><strong>Result</strong><small>Home, draw or away</small></button>
      <button type="button" class="condition-type-button ${selectedMarket === "double" ? "has-current" : ""}" data-market="double"><strong>Double chance</strong><small>Two outcomes covered</small></button>
      <button type="button" class="condition-type-button ${selectedMarket === "goals" ? "has-current" : ""}" data-market="goals"><strong>Goals</strong><small>Over or under</small></button>
      <button type="button" class="condition-type-button ${selectedMarket === "btts" ? "has-current" : ""}" data-market="btts"><strong>BTTS</strong><small>Both teams to score</small></button>
      <button type="button" class="condition-type-button ${selectedMarket === "score" ? "has-current" : ""}" data-market="score"><strong>Correct score</strong><small>Pick the exact scoreline</small></button>
      <button type="button" class="condition-type-button just-track-choice ${current === "none" ? "has-current" : ""}" data-condition="none"><strong>Just track</strong><small>No result condition</small></button>
    </div>`;
  container.querySelectorAll("[data-market]").forEach((button) => button.addEventListener("click", () => renderConditionChoiceStep(button.dataset.market, current)));
  container.querySelector('[data-condition="none"]')?.addEventListener("click", () => selectCondition("none"));
}

function correctScoreShortcutColumn(title, scorelines, className) {
  return `<div class="score-shortcut-column ${className}">
    <h5>${title}</h5>
    <div class="score-shortcut-column-buttons">
      ${scorelines.map(([home, away]) => `<button type="button" class="score-shortcut" data-home="${home}" data-away="${away}">${home}–${away}</button>`).join("")}
    </div>
  </div>`;
}

function renderConditionChoiceStep(market, current) {
  state.editingMarket = market;
  const container = document.getElementById("conditionOptions");
  if (!container) return;
  let content = "";
  if (market === "score") {
    const existing = parseCorrectScore(current);
    const scoreParts = existing || { home: 0, away: 0 };
    content = `
      <div class="correct-score-picker ${existing ? "active" : ""}">
        ${scoreWheelMarkup("correctScoreHome", "Home", scoreParts.home)}
        <strong aria-hidden="true">–</strong>
        ${scoreWheelMarkup("correctScoreAway", "Away", scoreParts.away)}
        <button type="button" id="useCorrectScore" class="condition-option correct-score-use">Use score</button>
      </div>
      <div class="correct-score-shortcuts grouped" aria-label="Quick correct score choices">
        ${correctScoreShortcutColumn("HW", [[1,0],[2,0],[2,1],[3,0],[3,1],[3,2],[4,0],[4,1]], "home-win")}
        ${correctScoreShortcutColumn("DRAW", [[0,0],[1,1],[2,2],[3,3]], "draw")}
        ${correctScoreShortcutColumn("AW", [[0,1],[0,2],[1,2],[0,3],[1,3],[2,3],[0,4],[1,4]], "away-win")}
      </div>`;
  } else {
    const groupName = ({ result: "Result", double: "Double chance", goals: "Over / Under", btts: "BTTS" })[market];
    content = `<div class="condition-row ${market === "goals" ? "goal-options" : ""}">
      ${CONDITIONS.filter((condition) => condition.group === groupName).map((condition) => `<button type="button" class="condition-option ${current === condition.id ? "active" : ""}" data-condition="${condition.id}">${condition.label}</button>`).join("")}
    </div>`;
  }
  container.innerHTML = `
    <div class="condition-choice-head">
      <button type="button" class="condition-back-button" id="conditionBack">← Back</button>
      <div class="condition-step-heading compact"><span>2</span><div><strong>${marketTitle(market)}</strong><small>Choose your selection</small></div></div>
    </div>
    <section class="condition-choice-panel">${content}</section>`;
  document.getElementById("conditionBack")?.addEventListener("click", () => renderConditionTypeStep(current));
  container.querySelectorAll(".condition-option[data-condition]").forEach((button) => button.addEventListener("click", () => selectCondition(button.dataset.condition)));
  if (market === "score") {
    const homeWheel = document.getElementById("correctScoreHome");
    const awayWheel = document.getElementById("correctScoreAway");
    bindScoreWheel(homeWheel);
    bindScoreWheel(awayWheel);
    container.querySelectorAll(".score-shortcut").forEach((button) => button.addEventListener("click", () => {
      setScoreWheelValue(homeWheel, button.dataset.home);
      setScoreWheelValue(awayWheel, button.dataset.away);
      selectCondition(`score:${button.dataset.home}:${button.dataset.away}`);
    }));
    document.getElementById("useCorrectScore")?.addEventListener("click", () => {
      const home = Number(homeWheel?.dataset.value || 0);
      const away = Number(awayWheel?.dataset.value || 0);
      selectCondition(`score:${home}:${away}`);
    });
    requestAnimationFrame(() => {
      const scoreParts = parseCorrectScore(current) || { home: 0, away: 0 };
      setScoreWheelValue(homeWheel, scoreParts.home);
      setScoreWheelValue(awayWheel, scoreParts.away);
    });
  }
}

function openConditionDialog(id) {
  rememberActiveScroll();
  if (state.activeView === "scoresView") {
    state.fixtureReturnId = String(id);
    state.fixtureReturnTop = document.querySelector(`[data-open-fixture="${CSS.escape(String(id))}"]`)?.getBoundingClientRect().top ?? null;
  }
  const fixture = getFixtureById(id);
  if (!fixture) return;
  const existingLists = Object.values(state.lists).filter((list) => Boolean(list.selected?.[id]));
  const listOneIsEmpty = Boolean(state.lists.list1) && Object.keys(state.lists.list1.selected || {}).length === 0;
  if (state.editingFixtureId !== id) {
    state.editingListIds = existingLists.length
      ? existingLists.map((list) => list.id)
      : [listOneIsEmpty ? "list1" : state.currentListId];
  } else if (!state.editingListIds?.length) {
    state.editingListIds = [state.editingListId || state.currentListId];
  }
  state.editingListIds = state.editingListIds.filter((listId) => state.lists[listId]);
  if (!state.editingListIds.length) state.editingListIds = [state.currentListId];
  state.editingListId = state.editingListIds[0];
  state.editingFixtureId = id;
  document.getElementById("dialogMatchTitle").textContent = `${fixture.home} v ${fixture.away}`;
  renderDialogListSelect();
  const current = state.lists[state.editingListId]?.selected?.[id]?.condition || "none";
  renderConditionTypeStep(current);
  const dialog = document.getElementById("conditionDialog");
  if (!dialog.open) dialog.showModal();
}

function renderDialogListSelect() {
  const container = document.getElementById("targetListButtons");
  if (!container) return;
  const selected = new Set(state.editingListIds || []);
  container.innerHTML = Object.values(state.lists).map((list) => `<button type="button" class="dialog-list-button ${selected.has(list.id) ? "active" : ""}" data-dialog-list-id="${escapeHtml(list.id)}" aria-pressed="${selected.has(list.id) ? "true" : "false"}">${escapeHtml(list.name)}</button>`).join("") + `<button type="button" id="newListFromDialog" class="dialog-list-button new-list-tab">+ New</button>`;
}

function selectCondition(condition) {
  const id = state.editingFixtureId;
  const fixture = getFixtureById(id);
  const listIds = (state.editingListIds || []).filter((listId) => state.lists[listId]);
  if (!fixture || !listIds.length) return;
  listIds.forEach((listId) => {
    const list = state.lists[listId];
    list.selected[id] = { condition, fixture, addedAt: list.selected[id]?.addedAt || Date.now() };
  });
  state.currentListId = listIds[0];
  saveSelected();
  document.getElementById("conditionDialog").close();
  state.editingFixtureId = null;
  state.editingListId = null;
  state.editingListIds = [];
  renderAll();
  if (state.activeView === "scoresView" && state.fixtureReturnId) {
    const returnId = state.fixtureReturnId;
    state.fixtureReturnId = null;
    const returnTop = state.fixtureReturnTop;
    state.fixtureReturnTop = null;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const card = document.querySelector(`[data-open-fixture="${CSS.escape(returnId)}"]`);
      if (card && Number.isFinite(returnTop)) {
        const delta = card.getBoundingClientRect().top - returnTop;
        window.scrollBy({ top: delta, left: 0, behavior: "auto" });
      } else if (card) {
        card.scrollIntoView({ block: "nearest", behavior: "auto" });
      } else restoreScrollFor("scoresView");
    }));
  }
}

function parseCorrectScore(condition) {
  const match = /^score:(\d+):(\d+)$/.exec(String(condition || ""));
  return match ? { home: Number(match[1]), away: Number(match[2]) } : null;
}

function conditionLabel(id) {
  const score = parseCorrectScore(id);
  if (score) return `Correct score ${score.home}–${score.away}`;
  return CONDITIONS.find((condition) => condition.id === id)?.label || "Just track match";
}

function trafficState(fixture, condition) {
  if (fixture.status === "scheduled") return { colour: "grey", copy: "Not started" };
  if (fixture.status === "cancelled") return { colour: "grey", copy: unusualOutcomeCopy(fixture) };
  if (["INT", "SUSP"].includes(fixture.statusShort)) return { colour: "grey", copy: unusualOutcomeCopy(fixture) };
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
  if (condition === "homeDraw") {
    winning = h >= a;
    if (!winning) goalsNeeded = a - h;
  }
  if (condition === "homeAway") {
    winning = h !== a;
    if (!winning) goalsNeeded = 1;
  }
  if (condition === "drawAway") {
    winning = a >= h;
    if (!winning) goalsNeeded = h - a;
  }
  const correctScore = parseCorrectScore(condition);
  if (correctScore) {
    if (h > correctScore.home || a > correctScore.away) return { colour: "lost", copy: "Lost" };
    winning = h === correctScore.home && a === correctScore.away;
    goalsNeeded = Math.max(0, correctScore.home - h) + Math.max(0, correctScore.away - a);
    if (fixture.status === "finished") return winning ? { colour: "won", copy: "Won" } : { colour: "lost", copy: "Lost" };
    if (winning) return { colour: "green", copy: "On target" };
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
    if (state.trackerFilter === "upcoming") return entry.fixture.status === "scheduled" && entry.condition !== "none";
    if (state.trackerFilter === "finished") return entry.fixture.status === "finished" || entry.fixture.status === "cancelled";
    return true;
  });

  const statusRank = (entry) => {
    const stateInfo = trafficState(entry.fixture, entry.condition);
    if (entry.fixture.status === "scheduled") return 4;
    if (stateInfo.colour === "green" || stateInfo.colour === "won") return 0;
    if (stateInfo.copy === "Needs 1 goal") return 1;
    if (/Needs \d+ goals/.test(stateInfo.copy)) return 2;
    if (stateInfo.colour === "grey") return 3;
    if (stateInfo.colour === "lost") return 5;
    return 3;
  };
  const liveRank = (fixture) => fixture.status === "live" ? 0 : fixture.status === "scheduled" ? 1 : 2;
  const customOrder = state.trackerCustomOrders[state.currentListId] || [];
  const customIndex = new Map(customOrder.map((id, index) => [String(id), index]));

  entries.sort((a, b) => {
    if (state.trackerOrder === "list") return (a.addedAt || 0) - (b.addedAt || 0);
    if (state.trackerOrder === "kickoff") return a.fixture.timestamp - b.fixture.timestamp;
    if (state.trackerOrder === "live") return liveRank(a.fixture) - liveRank(b.fixture) || a.fixture.timestamp - b.fixture.timestamp;
    if (state.trackerOrder === "status") return statusRank(a) - statusRank(b) || a.fixture.timestamp - b.fixture.timestamp;
    if (state.trackerOrder === "goals") {
      const aLost = trafficState(a.fixture, a.condition).colour === "lost" ? 1 : 0;
      const bLost = trafficState(b.fixture, b.condition).colour === "lost" ? 1 : 0;
      return aLost - bLost || goalsNeededForSelection(a.fixture, a.condition) - goalsNeededForSelection(b.fixture, b.condition) || a.fixture.timestamp - b.fixture.timestamp;
    }
    if (state.trackerOrder === "popularity") return leaguePriority(a.fixture.league) - leaguePriority(b.fixture.league) || a.fixture.timestamp - b.fixture.timestamp;
    if (state.trackerOrder === "alphabetical") return String(a.fixture.home).localeCompare(String(b.fixture.home)) || String(a.fixture.away).localeCompare(String(b.fixture.away));
    if (state.trackerOrder === "custom") {
      const ai = customIndex.has(String(a.id)) ? customIndex.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
      const bi = customIndex.has(String(b.id)) ? customIndex.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
      return ai - bi || (a.addedAt || 0) - (b.addedAt || 0);
    }
    return a.fixture.timestamp - b.fixture.timestamp;
  });

  if (state.trackerOrder === "custom") {
    const currentIds = entries.map((entry) => String(entry.id));
    const merged = [...customOrder.filter((id) => currentIds.includes(String(id))), ...currentIds.filter((id) => !customIndex.has(String(id)))];
    if (JSON.stringify(merged) !== JSON.stringify(customOrder)) {
      state.trackerCustomOrders[state.currentListId] = merged;
      localStorage.setItem(`${STORAGE_PREFIX}tracker-custom-orders`, JSON.stringify(state.trackerCustomOrders));
    }
  }

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
              <strong class="home-team">${signals.homeDisallowed}${signals.homeCards}<span class="team-name">${escapeHtml(fixture.home)}</span></strong>
              <span class="central-score ${fixture.status === "scheduled" ? "scheduled" : ""}">${scoreText(fixture)}</span>
              <strong class="away-team"><span class="team-name">${escapeHtml(fixture.away)}</span>${signals.awayCards}${signals.awayDisallowed}</strong>
              ${signals.goal}
            </div>
            ${state.trackerOrder === "custom" ? `<div class="tracker-reorder" aria-label="Move match"><button type="button" data-move-id="${entry.id}" data-direction="up" aria-label="Move match up">↑</button><button type="button" data-move-id="${entry.id}" data-direction="down" aria-label="Move match down">↓</button></div>` : ""}
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
  list.querySelectorAll("[data-move-id]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    const id = String(button.dataset.moveId);
    const order = [...(state.trackerCustomOrders[state.currentListId] || entries.map((entry) => String(entry.id)))];
    const index = order.indexOf(id);
    const target = button.dataset.direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    state.trackerCustomOrders[state.currentListId] = order;
    localStorage.setItem(`${STORAGE_PREFIX}tracker-custom-orders`, JSON.stringify(state.trackerCustomOrders));
    renderTracker();
  }));
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
  if (condition === "homeDraw") return Math.max(0, a - h);
  if (condition === "homeAway") return h === a ? 1 : 0;
  if (condition === "drawAway") return Math.max(0, h - a);
  const correctScore = parseCorrectScore(condition);
  if (correctScore) {
    if (h > correctScore.home || a > correctScore.away) return 0;
    return Math.max(0, correctScore.home - h) + Math.max(0, correctScore.away - a);
  }
  if (condition === "over15") return Math.max(0, 2 - total);
  if (condition === "over25") return Math.max(0, 3 - total);
  if (condition === "over35") return Math.max(0, 4 - total);
  if (condition === "bttsYes") return (h > 0 && a > 0) ? 0 : ((h > 0 || a > 0) ? 1 : 2);
  return 0;
}

function overallBreakdown(values) {
  const entries = values.map((entry) => {
    const status = trafficState(entry.fixture, entry.condition);
    const goals = goalsNeededForSelection(entry.fixture, entry.condition);
    return { ...entry, status, goals };
  });
  if (!entries.length) return { title: "No matches selected", summary: "Add matches to this list to see an explanation.", entries };
  if (entries.some((entry) => entry.status.colour === "lost")) return { title: "LOST", summary: "At least one selection can no longer be achieved.", entries };
  const total = entries.reduce((sum, entry) => sum + entry.goals, 0);
  if (total > 0) return { title: `${total} ${total === 1 ? "GOAL" : "GOALS"} NEEDED`, summary: "This total adds the remaining goals required by each recoverable selection.", entries };
  return { title: "ALL CORRECT", summary: "Every active selection is currently satisfied.", entries };
}

function showGoalsBreakdown() {
  const values = Object.values(state.selected);
  if (!values.length) return;
  const data = overallBreakdown(values);
  document.getElementById("goalsBreakdownTitle").textContent = data.title;
  document.getElementById("goalsBreakdownSummary").textContent = data.summary;
  document.getElementById("goalsBreakdownList").innerHTML = data.entries.map(({ fixture, condition, status, goals }) => {
    const reason = status.colour === "lost" ? "Cannot recover" : goals > 0 ? `${goals} ${goals === 1 ? "goal" : "goals"} needed` : status.copy;
    return `<div class="goals-breakdown-item"><div><strong>${escapeHtml(fixture.home)} v ${escapeHtml(fixture.away)}</strong><small>${escapeHtml(conditionLabel(condition))}</small></div><span class="breakdown-${escapeHtml(status.colour)}">${escapeHtml(reason)}</span></div>`;
  }).join("");
  document.getElementById("goalsBreakdownDialog").showModal();
}

function renderOverallListStatus(values) {
  const target = document.getElementById("overallListStatus");
  if (!target) return;

  if (!values.length) {
    target.hidden = true;
    target.className = "overall-list-status";
    target.textContent = "";
    target.removeAttribute("role");
    target.removeAttribute("tabindex");
    return;
  }

  target.hidden = false;
  target.setAttribute("role", "button");
  target.setAttribute("tabindex", "0");
  target.setAttribute("title", "Tap to see why this status is shown");
  target.setAttribute("aria-label", "List status. Tap for explanation");
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
    if (colour === "grey" && entry.fixture?.status === "scheduled" && entry.condition === "none") return;
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
      seasons: Array.isArray(item.seasons) ? item.seasons.map((season) => ({
        year: Number(season.year),
        start: season.start || null,
        end: season.end || null,
        current: Boolean(season.current),
      })).filter((season) => Number.isFinite(season.year)) : [],
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
    const countryHtml = [...countries.entries()].sort(compareFavouriteCountries).map(([country, leagues]) => {
      const orderedLeagues = leagues.sort(compareFavouriteLeagues);
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
  const seenDismissals = new Set();
  const seenDisallowed = new Set();
  let homeRedCards = 0;
  let awayRedCards = 0;
  let homeDisallowedGoals = 0;
  let awayDisallowedGoals = 0;
  (Array.isArray(events) ? events : []).forEach((event) => {
    const text = `${event.type || ""} ${event.detail || ""} ${event.comments || ""}`.toLowerCase();
    const eventTeamId = String(event.team?.id ?? "");
    const eventTeamName = normalise(event.team?.name);
    const isHome = (eventTeamId && homeId && eventTeamId === homeId) || eventTeamName === normalise(fixture.home);
    const isAway = (eventTeamId && awayId && eventTeamId === awayId) || eventTeamName === normalise(fixture.away);
    const key = [event.team?.id || event.team?.name || "", event.player?.id || event.player?.name || "", event.time?.elapsed || "", event.time?.extra || "", event.detail || ""].join("|");

    const dismissal = text.includes("red card") || text.includes("second yellow") || text.includes("2nd yellow") || text.includes("yellow-red") || text.includes("yellow red");
    if (dismissal && !seenDismissals.has(key)) {
      seenDismissals.add(key);
      if (isHome) homeRedCards += 1;
      else if (isAway) awayRedCards += 1;
    }

    const disallowed = text.includes("goal cancelled") || text.includes("goal canceled") || text.includes("cancelled goal") || text.includes("canceled goal") || text.includes("goal disallowed") || text.includes("disallowed goal") || text.includes("goal overturned") || text.includes("no goal");
    if (disallowed && !seenDisallowed.has(key)) {
      seenDisallowed.add(key);
      if (isHome) homeDisallowedGoals += 1;
      else if (isAway) awayDisallowedGoals += 1;
    }
  });
  const current = signalForFixture(fixture.id);
  state.matchSignals[String(fixture.id)] = {
    ...current,
    redCards: Math.max(Number(current.redCards) || 0, homeRedCards + awayRedCards),
    homeRedCards: Math.max(Number(current.homeRedCards) || 0, homeRedCards),
    awayRedCards: Math.max(Number(current.awayRedCards) || 0, awayRedCards),
    disallowedGoals: Math.max(Number(current.disallowedGoals) || 0, homeDisallowedGoals + awayDisallowedGoals),
    homeDisallowedGoals: Math.max(Number(current.homeDisallowedGoals) || 0, homeDisallowedGoals),
    awayDisallowedGoals: Math.max(Number(current.awayDisallowedGoals) || 0, awayDisallowedGoals),
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
  document.body.classList.toggle("scores-active", viewId === "scoresView");
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


function currentListShareData() {
  const list = state.lists[state.currentListId];
  const entries = Object.values(list?.selected || {}).map((entry) => ({ ...entry, fixture: getFixtureById(entry.fixture?.id) || entry.fixture })).filter((entry) => entry.fixture);
  const overall = document.getElementById("overallListStatus")?.textContent?.trim() || "";
  const lines = entries.map((entry) => {
    const fixture = entry.fixture;
    const status = trafficState(fixture, entry.condition).copy;
    let matchLine;
    if (fixture.status === "scheduled") {
      matchLine = `${formatFixtureTime(fixture)}  ${fixture.home} v ${fixture.away}`;
    } else if (fixture.status === "finished") {
      matchLine = `FT  ${fixture.home} ${fixture.homeScore}–${fixture.awayScore} ${fixture.away}`;
    } else {
      const clock = clockText(fixture).replace("′", "'");
      matchLine = `${clock}  ${fixture.home} ${fixture.homeScore}–${fixture.awayScore} ${fixture.away}`;
    }
    return `${matchLine}\n${conditionLabel(entry.condition)} — ${status}`;
  });
  return { title: `YorAkka · ${list?.name || "My Matches"}`, overall, lines };
}

function currentListShareText() {
  const data = currentListShareData();
  const header = [data.title, data.overall].filter(Boolean).join("\n");
  return [header, ...data.lines].filter(Boolean).join("\n\n");
}

async function copyCurrentListText() {
  const text = currentListShareText();
  await navigator.clipboard.writeText(text);
  const feedback = document.getElementById("shareFeedback");
  if (feedback) feedback.textContent = "List copied.";
}

async function shareCurrentList() {
  const data = currentListShareData();
  const text = currentListShareText();
  if (navigator.share) await navigator.share({ title: data.title, text });
  else await copyCurrentListText();
}

function saveCurrentListImage() {
  const data = currentListShareData();
  const width = 1080;
  const rowHeight = 92;
  const height = Math.max(560, 330 + data.lines.length * rowHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#080b10";
  const panel = getComputedStyle(document.documentElement).getPropertyValue("--panel").trim() || "#121722";
  const text = getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#f5f7fb";
  const muted = getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() || "#9aa4b4";
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = text; ctx.font = "700 64px system-ui"; ctx.fillText("YorAkka", 70, 95);
  ctx.font = "700 25px system-ui"; ctx.fillStyle = muted; ctx.fillText("YOUR FOOTBALL. YOUR PICKS. YOUR WAY.", 70, 140);
  ctx.font = "700 38px system-ui"; ctx.fillStyle = text; ctx.fillText(data.title.replace("YorAkka · ", ""), 70, 220);
  if (data.overall) { ctx.font = "700 28px system-ui"; ctx.fillStyle = "#f4c95d"; ctx.fillText(data.overall, 70, 267); }
  data.lines.forEach((line, index) => {
    const y = 305 + index * rowHeight;
    ctx.fillStyle = panel; ctx.fillRect(55, y, width - 110, rowHeight - 12);
    ctx.fillStyle = text; ctx.font = "600 25px system-ui";
    const words = line.split(" "); let current = ""; let lineY = y + 34;
    words.forEach((word) => { const test = `${current}${word} `; if (ctx.measureText(test).width > width - 175 && current) { ctx.fillText(current, 82, lineY); current = `${word} `; lineY += 30; } else current = test; });
    if (current) ctx.fillText(current, 82, lineY);
  });
  const link = document.createElement("a");
  link.download = `YorAkka-${(state.lists[state.currentListId]?.name || "list").replace(/[^a-z0-9]+/gi, "-")}.png`;
  link.href = canvas.toDataURL("image/png"); link.click();
  const feedback = document.getElementById("shareFeedback");
  if (feedback) feedback.textContent = "Image saved.";
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
  renderUpdateHealth();
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
  document.querySelectorAll("#alertModeControl button[data-alert-mode]").forEach((button) => {
    const active = button.dataset.alertMode === state.alertMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("#alertVolumeControl button[data-volume]").forEach((button) => {
    const active = Math.abs(Number(button.dataset.volume) - state.alertVolume) < 0.001;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("#alertSoundPackControl button[data-sound-pack]").forEach((button) => {
    const active = button.dataset.soundPack === state.alertSoundPack;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const disabled = !alertUsesSound();
  document.querySelectorAll("#alertVolumeControl button, #alertSoundPackControl button").forEach((button) => { button.disabled = disabled; });
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
  renderOrderingSettings();
  renderAll();
  document.getElementById("timezoneDialog").close();
}

function bindEvents() {
  document.addEventListener("pointerdown", unlockAlertAudio, { once: true, passive: true });
  document.addEventListener("keydown", unlockAlertAudio, { once: true });
  document.querySelectorAll(".bottom-nav button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  document.getElementById("detailsBack").addEventListener("click", closeMatchDetails);
  document.getElementById("jumpToday").addEventListener("click", () => {
    state.selectedDate = isoDate(today);
    loadDate(state.selectedDate);
  });
  document.getElementById("fixtureSearch").addEventListener("input", (event) => { state.search = event.target.value; renderFixtures(); });
  document.getElementById("showSelectedOnly").addEventListener("click", () => { state.selectedOnly = !state.selectedOnly; renderAll(); });
  document.querySelectorAll("#fixtureStatusFilters [data-fixture-status]").forEach((button) => button.addEventListener("click", () => toggleFixtureStatusFilter(button.dataset.fixtureStatus)));
  document.getElementById("downloadFixturesCsv").addEventListener("click", downloadVisibleFixturesCsv);
  document.getElementById("openResultsExport").addEventListener("click", openResultsExportDialog);
  document.getElementById("closeResultsExport").addEventListener("click", () => document.getElementById("resultsExportDialog").close());
  document.getElementById("downloadResultsCsv").addEventListener("click", () => downloadHistoricalResultsCsv().catch((error) => {
    document.getElementById("resultsExportProgress").hidden = false;
    document.getElementById("resultsProgressText").textContent = error.message || "Historical results export failed.";
    document.getElementById("downloadResultsCsv").disabled = false;
    document.getElementById("downloadTeamListCsv").disabled = false;
  }));
  document.getElementById("downloadTeamListCsv").addEventListener("click", () => downloadSelectedLeagueTeamsCsv().catch((error) => {
    document.getElementById("resultsExportProgress").hidden = false;
    document.getElementById("resultsProgressText").textContent = error.message || "Team list export failed.";
    document.getElementById("downloadResultsCsv").disabled = false;
    document.getElementById("downloadTeamListCsv").disabled = false;
  }));
  document.getElementById("resultsExportDialog").addEventListener("click", (event) => { if (event.target.id === "resultsExportDialog") event.currentTarget.close(); });
  const overallStatusButton = document.getElementById("overallListStatus");
  overallStatusButton.addEventListener("click", showGoalsBreakdown);
  overallStatusButton.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showGoalsBreakdown(); } });
  document.getElementById("closeGoalsBreakdown").addEventListener("click", () => document.getElementById("goalsBreakdownDialog").close());
  document.getElementById("goalsBreakdownDialog").addEventListener("click", (event) => { if (event.target.id === "goalsBreakdownDialog") event.currentTarget.close(); });
  document.getElementById("trackerFilters").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    state.trackerFilter = button.dataset.filter;
    document.querySelectorAll("#trackerFilters button").forEach((item) => item.classList.toggle("active", item === button));
    renderTracker();
  });
  const toggleTheme = () => { state.theme = state.theme === "dark" ? "light" : "dark"; applyTheme(); };
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("settingsThemeToggle").addEventListener("click", toggleTheme);
  document.getElementById("alertModeControl").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-alert-mode]");
    if (!button) return;
    state.alertMode = button.dataset.alertMode;
    localStorage.setItem(`${STORAGE_PREFIX}alert-mode`, state.alertMode);
    if (alertUsesSound()) ensureAudioContext();
    renderSoundSetting();
  });
  document.getElementById("alertSoundPackControl").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-sound-pack]");
    if (!button || button.disabled) return;
    state.alertSoundPack = button.dataset.soundPack;
    localStorage.setItem(`${STORAGE_PREFIX}alert-sound-pack`, state.alertSoundPack);
    renderSoundSetting();
    ensureAudioContext();
    playGoalTone("positive");
  });
  document.getElementById("alertVolumeControl").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-volume]");
    if (!button || button.disabled) return;
    state.alertVolume = Number(button.dataset.volume);
    localStorage.setItem(`${STORAGE_PREFIX}alert-volume`, String(state.alertVolume));
    renderSoundSetting();
    if (state.alertVolume > 0) { ensureAudioContext(); playGoalTone("positive"); }
  });
  document.getElementById("testPositiveSound").addEventListener("click", () => { ensureAudioContext(); triggerGoalAlert("positive"); });
  document.getElementById("testNegativeSound").addEventListener("click", () => { ensureAudioContext(); triggerGoalAlert("negative"); });
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
  renderUpdateHealth();
    renderAll();
  });
  document.getElementById("fixtureOrderControl").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-order]");
    if (!button) return;
    state.fixtureOrder = button.dataset.order;
    localStorage.setItem(`${STORAGE_PREFIX}fixture-order`, state.fixtureOrder);
    renderOrderingSettings();
    renderFixtures();
  });
  document.getElementById("favouriteOrderControl").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-order]");
    if (!button) return;
    state.favouriteOrder = button.dataset.order;
    localStorage.setItem(`${STORAGE_PREFIX}favourite-order`, state.favouriteOrder);
    renderOrderingSettings();
    renderFavouriteLeagues();
  });
  document.getElementById("trackerOrderControl").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-order]");
    if (!button) return;
    state.trackerOrder = button.dataset.order;
    localStorage.setItem(`${STORAGE_PREFIX}tracker-order`, state.trackerOrder);
    renderOrderingSettings();
    renderTracker();
  });
  document.getElementById("resetOrdering").addEventListener("click", () => {
    state.fixtureOrder = "smart";
    state.favouriteOrder = "selected";
    state.trackerOrder = "live";
    localStorage.setItem(`${STORAGE_PREFIX}fixture-order`, state.fixtureOrder);
    localStorage.setItem(`${STORAGE_PREFIX}favourite-order`, state.favouriteOrder);
    localStorage.setItem(`${STORAGE_PREFIX}tracker-order`, state.trackerOrder);
    renderOrderingSettings();
    renderFixtures();
    renderFavouriteLeagues();
    renderTracker();
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
  document.getElementById("targetListButtons").addEventListener("click", (event) => {
    const listButton = event.target.closest("button[data-dialog-list-id]");
    if (listButton) {
      const listId = listButton.dataset.dialogListId;
      const selected = new Set(state.editingListIds || []);
      if (selected.has(listId)) {
        if (selected.size > 1) selected.delete(listId);
      } else {
        selected.add(listId);
      }
      state.editingListIds = [...selected];
      state.editingListId = state.editingListIds[0];
      renderDialogListSelect();
      document.querySelector(`[data-dialog-list-id="${CSS.escape(listId)}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      return;
    }
    if (event.target.closest("#newListFromDialog")) {
      const proposed = prompt("Name this list", nextListName());
      if (proposed === null) return;
      const newId = createList(proposed.trim() || nextListName());
      state.editingListIds = [...new Set([...(state.editingListIds || []), newId])];
      state.editingListId = state.editingListIds[0];
      renderDialogListSelect();
      document.querySelector(`[data-dialog-list-id="${CSS.escape(newId)}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  });
  document.getElementById("shareList").addEventListener("click", () => {
    if (!Object.keys(state.selected).length) { alert("Add a match to this list before sharing it."); return; }
    document.getElementById("shareFeedback").textContent = "";
    document.getElementById("shareDialog").showModal();
  });
  document.getElementById("closeShareDialog").addEventListener("click", () => document.getElementById("shareDialog").close());
  document.getElementById("copyListText").addEventListener("click", () => copyCurrentListText().catch(() => { document.getElementById("shareFeedback").textContent = "Could not copy this list."; }));
  document.getElementById("shareNative").addEventListener("click", () => shareCurrentList().catch(() => {}));
  document.getElementById("saveListImage").addEventListener("click", saveCurrentListImage);
  document.getElementById("clearTracker").addEventListener("click", () => document.getElementById("confirmDialog").showModal());
  document.getElementById("confirmDialog").addEventListener("close", (event) => {
    if (event.target.returnValue === "confirm") {
      state.selected = {};
      saveSelected();
      renderAll();
    }
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshLive({ manual: true }); });
  window.addEventListener("online", renderUpdateHealth);
  window.addEventListener("offline", renderUpdateHealth);
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

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js?v=3.33").catch(() => {});
}

start();
