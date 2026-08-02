# MatchBuddy V3.6

## V3.6 changes

- Replaces the old tagline with **Football. Your way.** and places it beside MatchBuddy.
- Removes the “3 days back · 10 days ahead” line above Fixtures.
- Tightens spacing across the Fixtures header and competition groups to fit more matches on screen.
- Shows the country inside every league header, for example **Germany · 2. Frauen Bundesliga**.
- Removes the separate country headings to save vertical space.
- Makes an empty **List 1** the default destination when adding a new match.
- Keeps existing tracked matches attached to their current list when edited.
- Updates the visible version and service-worker cache to V3.6.

## Upload

1. Replace all files in the existing GitHub repository.
2. The Cloudflare Worker is unchanged from V3.5, so it does not need redeploying.
3. Fully close and reopen MatchBuddy after GitHub Pages redeploys.
