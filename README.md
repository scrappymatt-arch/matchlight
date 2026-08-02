# MatchBuddy V2.13

## V2.13 changes

- Match Details now shows API-Football model percentages for Home, Draw and Away when available.
- Predictions load only when a match is opened and are cached by the Cloudflare Worker.
- Prediction failures no longer prevent scorers, cards, statistics or line-ups from loading.
- Summary boxes are reordered: Winning / Won on the left, Needs 1 / Needs 2+ in the middle, Upcoming / Lost on the right.
- MatchBuddy V2.13 is shown at the top and uses a fresh service-worker cache.

## Upload

1. Replace the app files in the existing GitHub repository.
2. Replace the Cloudflare Worker code with the included `worker.js`, then press **Deploy**.
3. Your existing `API_FOOTBALL_KEY` secret remains unchanged.
4. Fully close and reopen MatchBuddy after GitHub Pages redeploys.
