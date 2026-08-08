# YorAkka V4.01

## V4.01 disallowed-goal fallback

- Keeps the V4.0 shared live-fixtures architecture.
- Retains explicit VAR / Goal cancelled detection.
- Adds a score-vs-event fallback for feeds that keep a normal goal event but omit a separate cancellation event.
- If established goal events for a team exceed the current official score, YorAkka marks the surplus goal(s) as disallowed.
- Waits at least two match-minutes before inferring a disallowed goal, avoiding false markers while a fresh score update is still catching up.
- Excludes penalty-shootout status from this fallback.
- Updates the visible app version and service-worker cache to V4.01.

## Deployment

Replace the GitHub Pages files with this release. The Cloudflare Worker is unchanged from V4.0, so it does not need redeploying. Keep the existing `API_FOOTBALL_KEY` secret unchanged.
