# MatchBuddy V3.0

## V3.0 changes

- Improves yellow/amber visibility in light mode.
- Uses a deeper amber for text and borders instead of pale yellow on white.
- Gives yellow match cards a stronger pale-gold background.
- Gives the overall “GOALS NEEDED” banner a filled amber tint with higher contrast.
- Improves the yellow totals-box contrast.
- MatchBuddy V3.0 is shown at the top and uses a fresh service-worker cache.

## Upload

1. Replace the app files in the existing GitHub repository.
2. Replace the Cloudflare Worker code with the included `worker.js`, then press **Deploy**.
3. Your existing `API_FOOTBALL_KEY` secret remains unchanged.
4. Fully close and reopen MatchBuddy after GitHub Pages redeploys.


## V3.0
- Pro-plan live refresh controls (15s, 30s, 60s, 2 minutes, or manual)
- Separate goal/card event interval
- Live countdown and tap-to-refresh control on My Matches
- Refreshes immediately when the app returns to the foreground
