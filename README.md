# MatchBuddy V2.8

This release changes Favourite Leagues into an active fixture filter:

- With no favourite leagues selected, Fixtures shows all available leagues.
- As soon as one or more favourites are selected, Fixtures shows only those leagues.
- A notice above the fixture list shows when filtering is active.
- **Show all leagues** temporarily reveals everything without deleting favourites.
- **Show favourites only** reapplies the filter instantly.
- Changing favourite selections automatically returns to favourites-only mode.

All V2.7 goal-pulse, red-card, match-detail and multi-list features remain included.

## GitHub Pages update

Upload and replace these files in the existing repository:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `icon.svg`
- `sw.js`

After GitHub Pages deploys, fully close and reopen MatchBuddy so the V2.8 service-worker cache replaces V2.7.

`worker.js` is included for completeness, but this release does not require a new Cloudflare Worker deployment if V2.7's Worker is already active.
