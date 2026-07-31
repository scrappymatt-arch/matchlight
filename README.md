# MatchLight V1.5 prototype

A mobile-first football fixture and personal match-condition tracker.

## Included

- Fixtures across yesterday, today and the following six days
- Large match clocks and clear live/FT states
- Search and selected-only filter
- Add any fixture to a persistent multi-day match list
- Choose no option, Home win, Draw, Away win, Over/Under 1.5, 2.5 or 3.5, and BTTS Yes/No
- Automatic statuses:
  - Grey: not started
  - Green: winning / won
  - Yellow: one goal makes the condition win
  - Red: all other live states / lost
- All, Live, Upcoming and Finished filters
- Date or urgency sorting
- Favourite leagues saved in Settings and prioritised on the Fixtures screen
- Dark and light themes
- Local storage and installable PWA support

## Run locally

Because the service worker requires HTTP, use a simple local server rather than double-clicking the HTML file.

### Python

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload all files in this folder to the repository root.
3. Open **Settings → Pages**.
4. Set the source to **Deploy from a branch** and choose `main` / root.
5. Open the generated Pages address on your phone.
6. In Chrome, choose **Add to Home screen** or **Install app**.

## Important

This version uses built-in sample fixtures. The next technical step is connecting a secure backend to a licensed football-data API. API keys must not be embedded directly in `app.js`.


## V1.1 layout change
Teams are now displayed side by side, with the live score or “v” centred between them.


## V1.4 settings change
Choose favourite leagues in Settings. They are stored on the device and displayed first on each fixture date with a star. The app version is now shown prominently in the header.


## V1.5 tracking choices

The Track this match window now uses grouped, tap-friendly buttons:

- No option / just track the match
- Home win, Draw and Away win
- Over 1.5, 2.5 and 3.5
- Under 1.5, 2.5 and 3.5
- Both teams to score: Yes or No
