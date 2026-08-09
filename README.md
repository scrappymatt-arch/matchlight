# YorAkka V4.05

## V4.05 resilient Tools exports

- Keeps the dedicated Tools tab and Favourite League date-range CSV exports from V4.04.
- Paces league/season export requests more conservatively to reduce API-Football burst usage.
- Detects API rate-limit responses during league-history checks and CSV downloads.
- Automatically pauses with a visible countdown when the per-minute API limit is reached.
- Resumes from the same league/season request after the wait instead of restarting the export.
- Retries a limited number of rate-limit pauses, then reports a clear failure instead of raw JSON.
- Fixtures CSV: date, time, home team, away team, country, league.
- Results CSV: date, home team, home goals, away goals, away team, country, league.
- Worker export routes return HTTP 429 with Retry-After metadata when API-Football remains rate-limited.
- Updates visible version and service-worker cache to V4.05.
