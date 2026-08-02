# MatchBuddy V2.9

This release focuses on fitting a full acca onto a phone screen and fixes the red-card signal path.

## V2.9 changes

- Removed the large My Matches/list heading and the five total cards.
- Replaced them with one compact status line.
- Replaced the match-list dropdown with a single-row strip of tappable list boxes.
- Swipe left or right to reach extra lists; the row never wraps.
- Added compact rename, delete and clear controls.
- Reduced My Matches spacing, row height and mobile header height while retaining readable scores, selections, goal pulses and red-card icons.
- Red-card checks now include tracked live matches even when the user is viewing fixtures from another date.
- Straight-red and second-yellow wording variants are recognised more robustly.
- Once a red-card count has appeared, a temporary failed refresh cannot remove it.

## GitHub Pages update

Upload and replace:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `icon.svg`
- `sw.js`

Fully close and reopen MatchBuddy after GitHub Pages deploys so the V2.9 cache replaces V2.8.

## Cloudflare Worker update

Replace the Worker code with the included `worker.js` and press **Deploy**. Your existing `API_FOOTBALL_KEY` secret remains in place.
