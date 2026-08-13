# YorAkka V4.09

## V4.09 shared-picks import and ordering fix

- Fixes My Matches > Status ordering so upcoming/not-started matches are always last.
- Status order is now:
  Lost → Goals Needed (highest first) → Winning → Won → Upcoming.
- Keeps the reverse-order toggle available.

### Share picks into YorAkka
- Share and Copy as text now include a YorAkka import link after the readable picks.
- The import link carries fixture IDs, a compact fixture snapshot and each YorAkka condition.
- Opening the link in YorAkka presents an Import Picks dialog.
- Recipients can review the received picks, untick any they do not want, select an existing My Matches list, or create a new list.
- One Add to My Matches button imports the selected picks.
- No WhatsApp integration, account system or server-side storage is required; WhatsApp or another app simply carries the YorAkka link.
- Shared links are limited to 50 picks and validate supported YorAkka conditions before import.

### Fixtures CSV
- Retains V4.08 CSV columns:
  date, time, home team, home goals, away goals, away team, country, league, status
- status values remain fixture, live or result.

Backend behaviour is unchanged. The packaged worker.js only updates its reported version metadata.
