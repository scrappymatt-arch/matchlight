# YorAkka V3.33

## V3.33 changes

- Keeps fixture scores on a fixed centre line so live scores align vertically regardless of team-name length.
- Excludes Just track selections from the My Matches Upcoming filter and Upcoming summary count.
- Adds persistent crossed-out football markers for disallowed/cancelled goals when the API event feed explicitly reports them. Home markers appear to the left of the home team; away markers appear to the right of the away team.
- Keeps existing red-card indicators and all V3.32 fixture filters/export features.
- Updates the visible app version, frontend asset versions and service-worker cache to V3.33.

## Deploy

Replace the GitHub Pages files with this release and redeploy worker.js to Cloudflare. The Worker signal endpoint changed in V3.33 to return disallowed-goal counts. Keep the existing API_FOOTBALL_KEY secret unchanged.
