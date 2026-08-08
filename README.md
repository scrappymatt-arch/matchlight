# YorAkka V3.31

## V3.31 changes

- Adds **Download team list CSV** alongside Historical Results export.
- Uses all currently selected Favourite Leagues.
- Automatically uses the current season for each league, falling back to its latest available season.
- CSV columns are exactly: `country, league, season, team`.
- Team names are the exact API-Football names, making them suitable for mapping against an external database.
- Shows per-league progress while downloading team lists.
- Adds a `/teams?league=...&season=...` Worker endpoint.
- Keeps the V3.30 Favourite League ID repair and Historical Results export fixes.
- Updates the visible app version, frontend asset versions and service-worker cache to V3.31.

## Deployment

Replace the GitHub Pages files with this release and redeploy `worker.js` to Cloudflare because the Worker adds the new `/teams` endpoint. Keep the existing `API_FOOTBALL_KEY` secret unchanged.
