# MatchBuddy V3.3

## V3.3 changes

- Places red-card indicators beside the correct team.
- Uses slim red card shapes rather than square badges or numbered counters.
- Repeats the card once for each sending-off.
- Adds completed-match cleanup choices: 24 hours, 48 hours, 7 days, or Never.
- Keeps 24 hours as the default for existing and new users.
- Updates the visible version and service-worker cache to V3.3.

## Upload

1. Replace all files in the existing GitHub repository.
2. Replace all code in the Cloudflare Worker with the included `worker.js`, then press Deploy.
3. Do not change the existing `API_FOOTBALL_KEY` secret.
4. Fully close and reopen MatchBuddy after GitHub Pages redeploys.
