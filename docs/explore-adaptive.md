# Adaptive Explore (Phase 2)

Intent presets that map natural language / chips to SearchQuery:

- este-finde → from=friday 18:00 local, to=sunday 23:59
- bailar → tags=[bailar,fiesta,milonga]
- yoga-cerca → tags=[yoga,pilates] + zone/radius from user_preferences
- gratis → isFree filter (add to SearchQuery in phase 2)

Navigation modes:
- feed: scrollable cards
- carousel: one decision at a time
- sections: group by profile / series / category

This file documents the contract; UI modes land fully in Phase 2.
The Phase 1A `explorar` page already supports from/to/tag/zone filters in the URL.
