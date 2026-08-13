# YorAkka V4.10

## V4.10 My Matches workflow improvements

### Attention filter
- Adds an Attention filter to My Matches.
- Attention shows matches that are Lost, need one or more goals, or are currently Winning.
- Won and Upcoming matches stay out of the Attention view.

### Pin matches
- Each tracked match has a pin control.
- Pinned matches stay above unpinned matches regardless of the selected My Matches sort order.
- Pins are remembered per list on the device.

### Compact My Matches
- Adds a one-tap Compact toggle directly on My Matches.
- Compact mode reduces card padding and secondary detail so more tracked matches fit on screen.
- The preference is remembered locally.

### Quick archive + local history
- Finished/cancelled matches show an Archive action directly on the card.
- Archived matches are removed from the active list and stored locally.
- A new Archive button in My Matches opens the local match history.
- Completed-match automatic cleanup now archives finished matches before clearing them.
- Archive data is kept on the device and can be cleared manually.

### Remember Fixtures filters
- YorAkka now remembers the Selected-only filter, All/Favourites league view, and All / Fixtures / In Play / Results status filters on the device.

### Shared-picks import
- Opening a shared YorAkka link now always creates a new My Matches list.
- The incoming shared-list name is pre-filled.
- If that list name already exists, YorAkka automatically suggests the next free name, e.g. Saturday Acca (2), Saturday Acca (3).
- The name remains editable before import.
- The recipient can still review and untick individual picks before creating the list.

Backend behaviour is unchanged from V4.09. The packaged worker.js only updates its reported version metadata.
