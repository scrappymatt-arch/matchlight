# MatchBuddy V2.14

## V2.14 changes

- Adds a compact overall status banner above the selected list.
- Shows **LOST** in red as soon as any selection is permanently lost.
- Shows the combined minimum goals still needed in yellow.
- Shows **ALL CORRECT** in green when no further goals are currently required.
- MatchBuddy V2.14 is shown at the top and uses a fresh service-worker cache.

## Upload

1. Replace the app files in the existing GitHub repository.
2. Replace the Cloudflare Worker code with the included `worker.js`, then press **Deploy**.
3. Your existing `API_FOOTBALL_KEY` secret remains unchanged.
4. Fully close and reopen MatchBuddy after GitHub Pages redeploys.
