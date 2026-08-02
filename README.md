# MatchBuddy V2.11

## V2.11 changes

- Fixtures now return to the exact same scroll position after adding or editing a tracked match.
- Opening Match Details and pressing Back also restores the previous Scores or My Matches position.
- Selection labels such as Over 2.5, BTTS Yes and Draw now use a fixed left-aligned column in My Matches.
- Status text such as Needs 1 goal remains right-aligned.
- MatchBuddy V2.11 is shown at the top and uses a fresh service-worker cache.

## Upload

Replace the app files in the existing GitHub repository. No Cloudflare Worker update is required for V2.11.

After GitHub Pages redeploys, fully close and reopen MatchBuddy so the V2.11 cache replaces V2.10.
