# YorAkka V3.25

## V3.25 changes

- Adds proper live injury-time display using API-Football's `fixture.status.extra` field.
- Live clocks can now show values such as `45+2′` and `90+4′` instead of stopping at `45′` or `90′`.
- The improved injury-time clock is shown anywhere YorAkka uses the shared live match clock, including Fixtures, My Matches and Match Details.
- Shared live-list text also uses the injury-time-aware clock.
- YorAkka does **not** invent a "minutes remaining" figure: API-Football exposes additional time already played, but not a reliable announced stoppage-time total in the live fixture status.
- Updates the visible version and service-worker cache to V3.25.

Cloudflare Worker: unchanged.
