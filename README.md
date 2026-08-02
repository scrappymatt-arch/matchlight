# MatchBuddy V2.10

## V2.10 changes

- Restores compact totals as four small boxes in the unused space beside the swipeable list tabs.
- Keeps the large text summary removed to save vertical space.
- Moves the league name to the left side of each My Matches footer.
- Places the tracked condition beside its status on the right.
- Adds a Settings test button for the red-card icon, plus a clear-test control.
- Retains the V2.9 red-card event detection and persistence improvements.

## Update GitHub Pages

Replace the app files in the existing repository. No Cloudflare Worker update is required for V2.10 because the Worker logic is unchanged from V2.9.

After GitHub Pages redeploys, fully close and reopen MatchBuddy so the V2.10 service-worker cache replaces V2.9.
