const DAY = 86400000;
const now = new Date();
now.setHours(0, 0, 0, 0);

const isoDate = (date) => date.toISOString().slice(0, 10);
const addDays = (base, days) => new Date(base.getTime() + days * DAY);

const fixtures = [
  { id: 1, day: 0, time: "15:00", league: "Premier League", country: "England", home: "Manchester United", away: "Everton", status: "live", minute: 67, homeScore: 2, awayScore: 1 },
  { id: 2, day: 0, time: "15:00", league: "Premier League", country: "England", home: "Arsenal", away: "Brighton", status: "live", minute: 53, homeScore: 1, awayScore: 0 },
  { id: 3, day: 0, time: "17:30", league: "Championship", country: "England", home: "Leeds United", away: "Norwich City", status: "scheduled", homeScore: 0, awayScore: 0 },
  { id: 4, day: 1, time: "14:00", league: "La Liga", country: "Spain", home: "Real Sociedad", away: "Valencia", status: "scheduled", homeScore: 0, awayScore: 0 },
  { id: 5, day: 1, time: "16:30", league: "Bundesliga", country: "Germany", home: "Dortmund", away: "Mainz", status: "scheduled", homeScore: 0, awayScore: 0 },
  { id: 6, day: 2, time: "19:45", league: "Serie A", country: "Italy", home: "Bologna", away: "Torino", status: "scheduled", homeScore: 0, awayScore: 0 },
  { id: 7, day: 3, time: "20:00", league: "Ligue 1", country: "France", home: "Lille", away: "Rennes", status: "scheduled", homeScore: 0, awayScore: 0 },
  { id: 8, day: 4, time: "19:45", league: "Championship", country: "England", home: "Wrexham", away: "Bolton", status: "scheduled", homeScore: 0, awayScore: 0 },
  { id: 9, day: 5, time: "20:00", league: "Champions League", country: "Europe", home: "Benfica", away: "PSV", status: "scheduled", homeScore: 0, awayScore: 0 },
  { id: 10, day: 6, time: "17:45", league: "Europa League", country: "Europe", home: "Roma", away: "Fenerbahçe", status: "scheduled", homeScore: 0, awayScore: 0 },
  { id: 11, day: -1, time: "20:00", league: "Premier League", country: "England", home: "Chelsea", away: "Fulham", status: "finished", minute: 90, homeScore: 2, awayScore: 2 },
];

fixtures.forEach((f) => { f.date = isoDate(addDays(now, f.day)); });

const LEAGUES = [...new Set(fixtures.map((fixture) => fixture.league))].sort((a, b) => a.localeCompare(b));

const CONDITIONS = [
  { id: "home", label: "Home win" },
  { id: "away", label: "Away win" },
  { id: "draw", label: "Draw" },
  { id: "over15", label: "Over 1.5 goals" },
  { id: "over25", label: "Over 2.5 goals" },
  { id: "over35", label: "Over 3.5 goals" },
  { id: "btts", label: "Both teams to score" },
];

const state = {
  selectedDate: isoDate(now),
  selectedOnly: false,
  search: "",
  trackerFilter: "all",
  trackerSort: "date",
  selected: JSON.parse(localStorage.getItem("matchlight-selected") || "{}"),
  theme: localStorage.getItem("matchlight-theme") || "dark",
  favouriteLeagues: JSON.parse(localStorage.getItem("matchlight-favourite-leagues") || "[]"),
  pendingFixtureId: null,
};

document.documentElement.dataset.theme = state.theme;

const els = {
  dateStrip: document.querySelector("#dateStrip"),
  fixtureList: document.querySelector("#fixtureList"),
  fixtureSearch: document.querySelector("#fixtureSearch"),
  showSelectedOnly: document.querySelector("#showSelectedOnly"),
  jumpToday: document.querySelector("#jumpToday"),
  trackerList: document.querySelector("#trackerList"),
  summaryCards: document.querySelector("#summaryCards"),
  trackerBadge: document.querySelector("#trackerBadge"),
  trackerFilters: document.querySelector("#trackerFilters"),
  trackerSort: document.querySelector("#trackerSort"),
  conditionDialog: document.querySelector("#conditionDialog"),
  dialogMatchTitle: document.querySelector("#dialogMatchTitle"),
  conditionOptions: document.querySelector("#conditionOptions"),
  clearTracker: document.querySelector("#clearTracker"),
  confirmDialog: document.querySelector("#confirmDialog"),
  favouriteLeagueOptions: document.querySelector("#favouriteLeagueOptions"),
  clearFavouriteLeagues: document.querySelector("#clearFavouriteLeagues"),
};

function saveSelected() {
  localStorage.setItem("matchlight-selected", JSON.stringify(state.selected));
}

function saveFavouriteLeagues() {
  localStorage.setItem("matchlight-favourite-leagues", JSON.stringify(state.favouriteLeagues));
}

function renderFavouriteLeagueSettings() {
  els.favouriteLeagueOptions.innerHTML = LEAGUES.map((league) => {
    const checked = state.favouriteLeagues.includes(league);
    return `<label class="league-choice ${checked ? "selected" : ""}">
      <input type="checkbox" value="${league}" ${checked ? "checked" : ""} />
      <span class="league-choice-star" aria-hidden="true">★</span>
      <span>${league}</span>
    </label>`;
  }).join("");
  els.clearFavouriteLeagues.disabled = state.favouriteLeagues.length === 0;
}

function formatDay(dateStr, long = false) {
  const date = new Date(`${dateStr}T12:00:00`);
  const diff = Math.round((date - now) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return date.toLocaleDateString("en-GB", long
    ? { weekday: "long", day: "numeric", month: "long" }
    : { weekday: "short" });
}

function renderDates() {
  const dates = Array.from({ length: 8 }, (_, i) => addDays(now, i - 1));
  els.dateStrip.innerHTML = dates.map((date) => {
    const dateStr = isoDate(date);
    const label = formatDay(dateStr);
    const numeric = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return `<button class="date-chip ${dateStr === state.selectedDate ? "active" : ""}" data-date="${dateStr}">
      <strong>${label}</strong><span>${numeric}</span>
    </button>`;
  }).join("");
  els.dateStrip.querySelector(".active")?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

function fixtureTimeMarkup(fixture) {
  if (fixture.status === "live") return `<span class="inline-match-time live">${fixture.minute}′</span>`;
  if (fixture.status === "finished") return `<span class="inline-match-time">FT</span>`;
  return `<span class="inline-match-time">${fixture.time}</span>`;
}

function fixtureCard(fixture) {
  const isSelected = Boolean(state.selected[fixture.id]);
  const scoresVisible = fixture.status !== "scheduled";
  const centre = scoresVisible
    ? `<span class="versus-score"><b>${fixture.homeScore}</b><i>–</i><b>${fixture.awayScore}</b></span>`
    : `<span class="versus-score scheduled"><i>v</i></span>`;
  return `<article class="fixture-card">
    <div class="single-line-match" aria-label="${fixture.home} versus ${fixture.away}">
      ${fixtureTimeMarkup(fixture)}
      <strong class="home-team">${fixture.home}</strong>
      ${centre}
      <strong class="away-team">${fixture.away}</strong>
    </div>
    <button class="add-button ${isSelected ? "selected" : ""}" data-add="${fixture.id}" aria-label="${isSelected ? "Edit selected match" : "Add match"}">${isSelected ? "✓" : "+"}</button>
  </article>`;
}

function renderFixtures() {
  const query = state.search.trim().toLowerCase();
  let list = fixtures.filter((fixture) => fixture.date === state.selectedDate);
  if (state.selectedOnly) list = list.filter((fixture) => state.selected[fixture.id]);
  if (query) list = list.filter((fixture) => `${fixture.home} ${fixture.away} ${fixture.league} ${fixture.country}`.toLowerCase().includes(query));

  if (!list.length) {
    els.fixtureList.innerHTML = `<div class="empty-state"><strong>No matches found</strong>Try another date or clear the search.</div>`;
    return;
  }

  const groups = Object.groupBy(list, (fixture) => `${fixture.country} · ${fixture.league}`);
  const orderedGroups = Object.entries(groups).sort(([, matchesA], [, matchesB]) => {
    const favouriteA = state.favouriteLeagues.includes(matchesA[0].league);
    const favouriteB = state.favouriteLeagues.includes(matchesB[0].league);
    if (favouriteA !== favouriteB) return favouriteA ? -1 : 1;
    return matchesA[0].league.localeCompare(matchesB[0].league);
  });
  els.fixtureList.innerHTML = orderedGroups.map(([league, matches]) => {
    const isFavourite = state.favouriteLeagues.includes(matches[0].league);
    return `
    <section class="league-group ${isFavourite ? "favourite-league" : ""}">
      <div class="league-title"><span>${isFavourite ? `<b class="league-star" aria-label="Favourite league">★</b>` : ""}${league}</span><span>${matches.length} match${matches.length === 1 ? "" : "es"}</span></div>
      ${matches.map(fixtureCard).join("")}
    </section>`;
  }).join("");
}

function conditionLabel(id) {
  return CONDITIONS.find((c) => c.id === id)?.label || "Track match";
}

function calculateStatus(fixture, conditionId) {
  if (fixture.status === "scheduled") return { colour: "grey", label: "Not started" };

  const h = fixture.homeScore;
  const a = fixture.awayScore;
  const total = h + a;
  const finished = fixture.status === "finished";
  let winning = false;
  let oneGoalAway = false;

  switch (conditionId) {
    case "home":
      winning = h > a;
      oneGoalAway = h === a;
      break;
    case "away":
      winning = a > h;
      oneGoalAway = h === a;
      break;
    case "draw":
      winning = h === a;
      oneGoalAway = Math.abs(h - a) === 1;
      break;
    case "over15":
      winning = total >= 2;
      oneGoalAway = total === 1;
      break;
    case "over25":
      winning = total >= 3;
      oneGoalAway = total === 2;
      break;
    case "over35":
      winning = total >= 4;
      oneGoalAway = total === 3;
      break;
    case "btts":
      winning = h > 0 && a > 0;
      oneGoalAway = (h > 0 && a === 0) || (a > 0 && h === 0);
      break;
    default:
      return { colour: "grey", label: "Choose condition" };
  }

  if (winning) return { colour: "green", label: finished ? "Won" : "Winning" };
  if (finished) return { colour: "red", label: "Lost" };
  if (oneGoalAway) return { colour: "yellow", label: "Needs 1 goal" };
  return { colour: "red", label: "Needs more" };
}

function trackerClock(fixture) {
  if (fixture.status === "live") return `${fixture.minute}′`;
  if (fixture.status === "finished") return `FT`;
  return `${fixture.time}`;
}

function getTrackerMatches() {
  let list = Object.entries(state.selected)
    .map(([id, selection]) => ({ fixture: fixtures.find((f) => f.id === Number(id)), selection }))
    .filter((x) => x.fixture);

  if (state.trackerFilter === "live") list = list.filter((x) => x.fixture.status === "live");
  if (state.trackerFilter === "upcoming") list = list.filter((x) => x.fixture.status === "scheduled");
  if (state.trackerFilter === "finished") list = list.filter((x) => x.fixture.status === "finished");

  if (state.trackerSort === "urgency") {
    const rank = { yellow: 0, red: 1, green: 2, grey: 3 };
    list.sort((a, b) => rank[calculateStatus(a.fixture, a.selection.condition).colour] - rank[calculateStatus(b.fixture, b.selection.condition).colour]);
  } else {
    list.sort((a, b) => `${a.fixture.date} ${a.fixture.time}`.localeCompare(`${b.fixture.date} ${b.fixture.time}`));
  }
  return list;
}

function renderSummary(allSelected) {
  const counts = { green: 0, yellow: 0, red: 0, grey: 0 };
  allSelected.forEach(({ fixture, selection }) => counts[calculateStatus(fixture, selection.condition).colour]++);
  els.summaryCards.innerHTML = [
    [allSelected.length, "Total", ""],
    [counts.green, "Winning", "green"],
    [counts.yellow, "Needs 1", "yellow"],
    [counts.red, "Other", "red"],
  ].map(([number, label, cls]) => `<div class="summary-card ${cls}"><strong>${number}</strong><span>${label}</span></div>`).join("");
}

function renderTracker() {
  const allSelected = Object.entries(state.selected)
    .map(([id, selection]) => ({ fixture: fixtures.find((f) => f.id === Number(id)), selection }))
    .filter((x) => x.fixture);
  renderSummary(allSelected);

  els.trackerBadge.hidden = allSelected.length === 0;
  els.trackerBadge.textContent = allSelected.length;

  const list = getTrackerMatches();
  if (!list.length) {
    els.trackerList.innerHTML = `<div class="empty-state"><strong>${allSelected.length ? "Nothing in this filter" : "No matches selected"}</strong>${allSelected.length ? "Choose another filter." : "Add fixtures from the Scores screen."}</div>`;
    return;
  }

  const groups = Object.groupBy(list, ({ fixture }) => fixture.date);
  els.trackerList.innerHTML = Object.entries(groups).map(([date, matches]) => `
    <div class="day-heading">${formatDay(date, true)}</div>
    ${matches.map(({ fixture, selection }) => {
      const status = calculateStatus(fixture, selection.condition);
      const score = fixture.status === "scheduled"
        ? `<span class="tracker-score scheduled">v</span>`
        : `<span class="tracker-score"><b>${fixture.homeScore}</b><i>–</i><b>${fixture.awayScore}</b></span>`;
      return `<article class="tracker-card status-${status.colour}">
        <div class="single-line-match tracker-line" aria-label="${fixture.home} versus ${fixture.away}">
          <span class="inline-match-time ${fixture.status === "live" ? "live" : ""}">${trackerClock(fixture)}</span>
          <strong class="home-team">${fixture.home}</strong>
          ${score}
          <strong class="away-team">${fixture.away}</strong>
        </div>
        <div class="tracker-meta">
          <button class="condition-label remove-button" data-edit="${fixture.id}" title="Change condition">${conditionLabel(selection.condition)} ✎</button>
          <span class="status-copy">${status.label}</span>
          <button class="remove-button" data-remove="${fixture.id}" aria-label="Remove match">×</button>
        </div>
      </article>`;
    }).join("")}
  `).join("");
}

function renderAll() {
  renderDates();
  renderFixtures();
  renderTracker();
  renderFavouriteLeagueSettings();
}

function openConditionDialog(fixtureId) {
  const fixture = fixtures.find((f) => f.id === fixtureId);
  if (!fixture) return;
  state.pendingFixtureId = fixtureId;
  els.dialogMatchTitle.textContent = `${fixture.home} v ${fixture.away}`;
  els.conditionOptions.innerHTML = CONDITIONS.map((condition) => `
    <button type="button" class="condition-option" data-condition="${condition.id}">${condition.label}</button>
  `).join("");
  els.conditionDialog.showModal();
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem("matchlight-theme", state.theme);
}

document.addEventListener("click", (event) => {
  const dateButton = event.target.closest("[data-date]");
  if (dateButton) {
    state.selectedDate = dateButton.dataset.date;
    renderDates();
    renderFixtures();
  }

  const addButton = event.target.closest("[data-add]");
  if (addButton) openConditionDialog(Number(addButton.dataset.add));

  const editButton = event.target.closest("[data-edit]");
  if (editButton) openConditionDialog(Number(editButton.dataset.edit));

  const removeButton = event.target.closest("[data-remove]");
  if (removeButton) {
    delete state.selected[removeButton.dataset.remove];
    saveSelected();
    renderAll();
  }

  const conditionButton = event.target.closest("[data-condition]");
  if (conditionButton && state.pendingFixtureId) {
    state.selected[state.pendingFixtureId] = { condition: conditionButton.dataset.condition };
    saveSelected();
    els.conditionDialog.close();
    renderAll();
  }

  const navButton = event.target.closest(".bottom-nav [data-view]");
  if (navButton) {
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === navButton.dataset.view));
    document.querySelectorAll(".bottom-nav button").forEach((button) => button.classList.toggle("active", button === navButton));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

els.fixtureSearch.addEventListener("input", (event) => { state.search = event.target.value; renderFixtures(); });
els.showSelectedOnly.addEventListener("click", () => {
  state.selectedOnly = !state.selectedOnly;
  els.showSelectedOnly.setAttribute("aria-pressed", String(state.selectedOnly));
  renderFixtures();
});
els.jumpToday.addEventListener("click", () => { state.selectedDate = isoDate(now); renderDates(); renderFixtures(); });
els.trackerFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  state.trackerFilter = button.dataset.filter;
  els.trackerFilters.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === button));
  renderTracker();
});
els.trackerSort.addEventListener("change", (event) => { state.trackerSort = event.target.value; renderTracker(); });
els.clearTracker.addEventListener("click", () => {
  if (Object.keys(state.selected).length) els.confirmDialog.showModal();
});
els.confirmDialog.addEventListener("close", () => {
  if (els.confirmDialog.returnValue === "confirm") {
    state.selected = {};
    saveSelected();
    renderAll();
  }
});
document.querySelector("#themeToggle").addEventListener("click", toggleTheme);
document.querySelector("#settingsThemeToggle").addEventListener("click", toggleTheme);
els.favouriteLeagueOptions.addEventListener("change", (event) => {
  const checkbox = event.target.closest('input[type="checkbox"]');
  if (!checkbox) return;
  state.favouriteLeagues = checkbox.checked
    ? [...new Set([...state.favouriteLeagues, checkbox.value])]
    : state.favouriteLeagues.filter((league) => league !== checkbox.value);
  saveFavouriteLeagues();
  renderFavouriteLeagueSettings();
  renderFixtures();
});
els.clearFavouriteLeagues.addEventListener("click", () => {
  state.favouriteLeagues = [];
  saveFavouriteLeagues();
  renderFavouriteLeagueSettings();
  renderFixtures();
});

renderAll();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
