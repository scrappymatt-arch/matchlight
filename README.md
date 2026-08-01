# MatchBuddy V2.6

This release adds:

- **Lost** status for live bets that can no longer recover:
  - Under 1.5 after 2 goals
  - Under 2.5 after 3 goals
  - Under 3.5 after 4 goals
  - BTTS No once both teams score
- A full-screen **Match Details** page opened by tapping a fixture or tracked match.
- Goals, scorers, cards, substitutions, statistics and line-ups when supplied by API-Football.
- A country-level checkbox in **Settings → Favourite leagues** to select or clear all loaded leagues under that country.

## GitHub Pages update

Upload and replace these files in the existing GitHub repository:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `icon.svg`
- `sw.js`

After GitHub Pages deploys, fully close and reopen MatchBuddy so the V2.6 service-worker cache replaces V2.5.

## Required Cloudflare Worker update

Match details require a new `/fixture?id=` endpoint.

1. Open Cloudflare → Workers & Pages → `matchbuddy-api` → **Edit code**.
2. Replace the whole Worker code with the contents of `worker.js` from this package.
3. Click **Deploy**.
4. Your existing `API_FOOTBALL_KEY` secret remains in place and does not need to be entered again.

Opening a match for the first time can use up to four API-Football requests for fixture information, events, statistics and line-ups. Cloudflare caches those responses, but the free API plan can still hit its limit during heavy testing.
