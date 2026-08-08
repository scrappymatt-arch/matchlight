# YorAkka V3.34

## V3.34 changes

- Fixes disallowed-goal detection to explicitly recognise API-Football VAR `Goal cancelled` events and common cancelled/disallowed/overturned goal wording.
- Adds a fallback that links a teamless VAR cancellation to the nearby goal event for the same player/minute, so the crossed-out football can still be placed beside the correct team.
- Keeps the V3.33 centred fixture-score layout and Just Track/Upcoming behaviour.
- Updates the visible app version, frontend asset versions and service-worker cache to V3.34.

## Deployment

Replace the GitHub Pages files with this release and redeploy `worker.js` to Cloudflare. The Worker signal parser changed in V3.34. Keep the existing `API_FOOTBALL_KEY` secret unchanged.
