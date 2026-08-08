# YorAkka V3.30

## V3.30 changes

- Fixes Historical Results CSV when older saved Favourite Leagues are missing API-Football league IDs.
- Automatically matches saved favourites against the live API-Football league catalogue using country + league name, with a safe unique-name fallback.
- Repairs and stores recovered league IDs locally so the same favourites do not need matching again.
- Preserves league API IDs and season metadata when ordinary fixture loads refresh YorAkka's known-league list.
- Historical export remains: choose From/To dates and export completed results for all selected Favourite Leagues.
- CSV columns remain exactly: date, time, home team, home goals, away goals, away team.
- Updates the visible app version, frontend asset versions and service-worker cache to V3.30.

## Deployment

Replace the GitHub Pages files with this release. The Cloudflare Worker is functionally unchanged from V3.29, so it does not need to be redeployed.
