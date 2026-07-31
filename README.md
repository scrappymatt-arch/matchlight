# MatchBuddy V2.0

First live-data release of MatchBuddy.

## What is new
- Real fixtures, results, live scores and match clocks through the protected Cloudflare Worker.
- Loads only the selected date, covering 3 days back and 10 days ahead.
- Two-minute live refresh only while the app is open and live data matters.
- MatchBuddy branding throughout.
- Favourite leagues learned from real loaded fixtures.
- Persistent My Matches tracker and traffic-light conditions.
- Opens My Matches when a saved match is already marked live.
- Automatic clear 24 hours after all tracked matches finish.

## Upload to GitHub Pages
Upload all files from this folder to the root of the `matchlight` repository, replacing the existing files. GitHub Pages can continue using the existing repository and URL.

After deployment, fully close the old installed app or browser tab and reopen it. If V2.0 does not appear, use Ctrl+F5 once.

## Live-data bridge
This build uses:
`https://matchbuddy-api.scrappymatt.workers.dev`

The API-Football key remains stored only as an encrypted Cloudflare Worker secret.
