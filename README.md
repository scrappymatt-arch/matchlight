# YorAkka V3.12

## V3.12 changes

- Keeps the tagline **YOUR FOOTBALL. YOUR PICKS. YOUR WAY.**
- Disables the CSV button until at least one favourite league has been selected.
- CSV downloads always contain fixtures from favourite leagues only.
- Search and Selected-only filters are still respected by the export.
- Uses the selected YorAkka time zone for the date and time columns.
- Exports exactly these columns, in this order:
  1. date
  2. time
  3. home team
  4. home goals
  5. away goals
  6. away team
  7. country
  8. league
  9. half time home
  10. half time away
- Upcoming fixtures have blank goal and half-time fields.
- Updates the visible version and service-worker cache to V3.12.

## Deployment

Replace all GitHub Pages files with the files in this package. The Cloudflare Worker is unchanged from V3.11, so it does not need to be redeployed.
