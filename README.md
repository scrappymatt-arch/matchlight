# YorAkka V4.04

## V4.04 Tools exports

- Adds a dedicated **🔧 Tools** tab between My Matches and Settings.
- Removes CSV export controls from the Fixtures page and removes the Historical Results export dialog.
- Tools uses the currently selected Favourite Leagues and a From/To date range.
- **Fixtures CSV** includes scheduled and in-play matches only, with columns: `date, time, home team, away team, country, league`.
- **Results CSV** includes completed matches only, with columns: `date, home team, home goals, away goals, away team, country, league`.
- Shows the number of selected Favourite Leagues and progress while exports are prepared.
- Adds the Worker `/export-fixtures` endpoint for efficient league/season fixture-range exports.
- Updates visible version and service-worker cache to V4.04.
