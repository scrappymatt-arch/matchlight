# YorAkka V3.8

## V3.8 changes

- Renames the app from MatchBuddy to **YorAkka**.
- Uses the brand line **FOOTBALL. YOUR WAY.** beside the app name.
- Adds **Download visible fixtures CSV** from the Fixtures screen.
- CSV exports follow the current favourite-league, search and Selected filters.
- CSV files include fixture, league and team IDs, UTC kick-off, selected local kick-off, status, scores and result.
- Adds a searchable time-zone picker in Settings.
- Defaults to **Europe/London** and handles UK daylight-saving time automatically.
- Keeps previously known leagues selectable when the full catalogue endpoint is temporarily unavailable.
- Updates the visible version and service-worker cache to V3.8.

## Deployment

1. Replace all GitHub Pages files with the contents of this ZIP.
2. Replace the Cloudflare Worker code with `worker.js` and deploy it.
3. Keep the existing `API_FOOTBALL_KEY` secret unchanged.
