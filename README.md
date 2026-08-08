# YorAkka V3.29

## V3.29 changes

- Fixes Historical Results export getting stuck on “Refreshing league history before export…”.
- Opening the export dialog no longer blocks while refreshing the full league catalogue.
- Checks season history only for the selected Favourite Leagues, one league at a time.
- Shows clear progress such as “Checking league history 2/6”, then “Downloading results 3/6”, followed by “Creating CSV…”.
- Adds request timeouts so a stalled API call produces an error instead of leaving the export hanging indefinitely.
- Historical export columns remain exactly: date, time, home team, home goals, away goals, away team.
- Uses the app time-zone setting for exported date and time.
- Adds the Worker endpoint `/league-history?league=ID`; V3.29 therefore requires a Worker redeploy.
- Retains all V3.28 features plus the two-step market picker, correct-score controls, goal alerts, injury-time clocks and fixture-position restoration.
- Updates the visible version, asset versions and service-worker cache to V3.29.
