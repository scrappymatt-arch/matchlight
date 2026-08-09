# YorAkka V4.08

## V4.08 CSV status + My Matches status ordering

- Fixtures-page CSV adds a final `status` column.
- CSV status values are exactly `fixture`, `live`, or `result`.
- The CSV still exports only the games currently showing and makes no extra API requests.
- My Matches **Status** ordering is changed to: Lost → goals needed (highest first) → Winning → Won → Pending.
- Within the goals-needed section, larger requirements are placed first (for example Needs 4 before Needs 3 before Needs 1).
- The existing sort-direction toggle still reverses the whole selected sort when required.
- Visible version and service-worker cache updated to V4.08.

Backend behaviour is unchanged from V4.07. The packaged worker.js only updates its reported version metadata.
