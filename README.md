# YorAkka V4.06

## V4.06 interface and alert polish

- Moves the live update-health text onto its own line in My Matches so changing
  "Scores updated / events updated" text no longer shifts the neighbouring buttons.
- Adds one compact direction toggle beside each Ordering control in Settings.
  The same button reverses the currently selected sort.
- Alphabetical sorts show A→Z / Z→A; other sorts use ↑ / ↓.
- Sort direction is remembered separately for Fixtures, Favourite Leagues and My Matches.
- Reset order also resets all three directions to their normal/default direction.
- Extends the Cheer / Boo crowd alert clips from about 0.9 seconds to about 1.8 seconds.
- Updates the visible app version and offline cache to V4.06.

Backend behaviour is unchanged from V4.05. The packaged worker.js only updates its
reported version metadata.
