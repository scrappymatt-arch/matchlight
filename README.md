# MatchBuddy V3.4

## V3.4 changes

- Aligns match-timeline events to the correct team side: home events left and away events right.
- Keeps the minute nearest the centre and mirrors the event icon and player details.
- Forces slim red-card indicators to sit immediately beside the correct team name.
- Makes the visible version badge larger and clearer, including on the compact My Matches screen.
- Corrects the cache-busting file references so the new CSS and JavaScript load immediately.
- Updates the visible version and service-worker cache to V3.4.

## Upload

1. Replace all files in the existing GitHub repository.
2. The Cloudflare Worker is unchanged from V3.3, so it does not need redeploying.
3. Fully close and reopen MatchBuddy after GitHub Pages redeploys.
