# MatchBuddy V3.7

## V3.7 changes

- Loads the complete API-Football league catalogue through the protected Cloudflare Worker.
- Favourite Leagues no longer depends on competitions appearing in fixtures already viewed.
- Selecting a country selects all matching leagues shown for that country, including leagues with no match today.
- Adds league/country search.
- Adds All, Men, Women, Youth and Cups category buttons.
- Adds a Current competitions only option, enabled by default.
- Caches the provider league catalogue for 24 hours to protect the API allowance.
- Updates the visible version and service-worker cache to V3.7.

## Deployment

1. Replace all GitHub Pages files with the contents of this ZIP.
2. Replace the Cloudflare Worker code with `worker.js` and deploy it.
3. Keep the existing `API_FOOTBALL_KEY` secret unchanged.
