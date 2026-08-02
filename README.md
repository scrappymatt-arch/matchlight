# YorAkka V3.11

## V3.11 changes

- Fixes long team-name wrapping specifically on the Scores/Fixtures screen.
- Protects the score and add-button columns on phones.
- Keeps the approved My Matches mobile layout unchanged.

- Fixes long team names on the mobile Scores screen so they wrap onto a maximum of two lines.
- Keeps the fixture row height compact and protects the score and `+` button columns from overlap.
- Preserves the V3.9 phone-first My Matches layout unchanged.
- Keeps red-card indicators attached to the correct team while names wrap.
- Updates the visible version and service-worker cache to V3.11.

## Deployment

Replace all GitHub Pages files with the files in this package. The Cloudflare Worker is unchanged from V3.9 and does not need to be redeployed.
