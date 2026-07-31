# MatchBuddy V2.1

Live football fixtures and personal match-condition tracking.

## V2.1 changes

- Fixtures are grouped by region, with Europe shown first.
- Regions appear in this order: Europe, South America, North & Central America, Africa, Asia, Oceania, International.
- Fixtures are grouped by country and then competition inside each region.
- Favourite competitions retain priority inside their region.
- Favourite Leagues in Settings is split into expandable regional sections and then grouped by country.

## Installation

Upload and replace all files in the existing GitHub Pages repository. Wait for GitHub Pages to deploy, then close and reopen MatchBuddy or use a hard refresh.

## Live-data endpoint

The app uses the protected Cloudflare Worker:

`https://matchbuddy-api.scrappymatt.workers.dev`

The API-Football key remains stored as a Cloudflare secret and must never be placed in this repository.
