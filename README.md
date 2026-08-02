# MatchBuddy V3.2

## V3.2 changes

- Prevents live-score, signal and match-detail requests from colliding in the app.
- Pauses background event checks while Match Details is open.
- Loads match details sequentially, with events first so goals and red cards are prioritised.
- Adds request spacing, automatic retry and extra headroom below API-Football's per-second limit.
- Prevents one unavailable event feed from cancelling every tracked match's red-card check.
- Recognises more second-yellow and yellow-red dismissal descriptions.
- Replaces raw provider errors with a clear temporary-busy message.
- Updates the visible version and service-worker cache to V3.2.

## Upload

1. Replace all files in the existing GitHub repository.
2. Replace all code in the Cloudflare Worker with the included `worker.js`, then press Deploy.
3. Do not change the existing `API_FOOTBALL_KEY` secret.
4. Fully close and reopen MatchBuddy after GitHub Pages redeploys.
