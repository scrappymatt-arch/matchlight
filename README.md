# YorAkka V4.0

## V4.0 live-data architecture

- Rebuilds live updates around one API-Football live-fixtures request rather than separate event requests for a small subset of matches.
- Uses the event arrays included with the live-fixtures payload for red cards and VAR/disallowed-goal markers across all live matches returned by the provider.
- My Matches and Fixtures reuse the same live payload, reducing duplicate API usage.
- The separate `/signals` route is retained only as a compatibility/diagnostic fallback for older clients.
- Cloudflare briefly caches the live payload so multiple YorAkka clients can share one upstream response.
- Keeps all V3.34 features, including centred fixture scores, disallowed-goal icons and Just Track being excluded from Upcoming.
- Updates the visible app version, frontend assets and service-worker cache to V4.0.

## Deploy

Replace the GitHub Pages files with this release **and redeploy `worker.js` to Cloudflare**. The Worker live-data architecture changed in V4.0. Keep the existing `API_FOOTBALL_KEY` secret unchanged.
