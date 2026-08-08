# YorAkka V4.02

## V4.02 cleanup release

- Removes the experimental disallowed-goal / crossed-football feature because the provider does not retain a reliable cancellation signal for all matches.
- Removes the V4.01 inferred-goal fallback to avoid false or inconsistent markers.
- Keeps the V4 shared `/live` architecture for efficient live scores and red-card tracking.
- Keeps centred fixture score columns, live filters, goal alerts, injury-time display, historical-results export, team-list export, and all V3.x/V4.0 functionality.
- Updates the visible version and service-worker cache to V4.02.

## Deploy

Replace the GitHub Pages files with this release. Redeploy `worker.js` to Cloudflare because the unused disallowed-goal parsing has also been removed from the backend. Keep the existing `API_FOOTBALL_KEY` secret unchanged.
