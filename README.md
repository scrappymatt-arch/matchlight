# MatchBuddy V2.5

Live football fixtures and selected-match tracking powered through the MatchBuddy Cloudflare Worker.

## V2.5 changes

- Corrected Home win and Away win traffic-light logic when the selected team is one goal behind.
- Result bets now calculate the exact number of goals needed to become winning.
- Over 1.5, 2.5 and 3.5 now report the exact number of goals still required.
- BTTS Yes correctly distinguishes 0-0 (two goals required) from a one-sided score (one goal required).
- Added automated checks covering result, totals, BTTS and finished-match outcomes.
- Updated cache and release version.

## Publishing

Upload all files to the root of the existing GitHub Pages repository. Wait for deployment, then close and reopen the installed app or use a hard refresh.
