# Tech Decisions

This file documents technology decisions for major features, per the
engineering standard in [CLAUDE.md](../CLAUDE.md). Minor features/bugfixes
do not require an entry.

---

## Autonomous Travel Intelligence Agent (initial scaffold)

**Date:** 2026-08-23

### Repos/libraries evaluated

| Candidate | License | Stars | Maintenance | Decision |
|-----------|---------|-------|-------------|----------|
| `express` | MIT | 66k+ | Active | **Accepted** — same framework as the sibling `strategic-honesty-API` project in this repo; no reason to introduce a second framework for a Node API backend |
| `helmet` | MIT | 10k+ | Active — Express org maintained | **Accepted** — already an approved default in CLAUDE.md |
| `express-rate-limit` | MIT | 3k+ | Active | **Accepted** — already an approved default |
| `dotenv` | BSD-2-Clause | 20k+ | Active | **Accepted** — standard env-loading, already used in the sibling project |
| Open-Meteo API (`api.open-meteo.com`, `archive-api.open-meteo.com`) | Open-source, CC-BY 4.0 data license, free, no API key | 8k+ (open-meteo/open-meteo) | Active | **Accepted** — official free weather/climate API, no signup friction, covers international destinations (needed for Mexico in the Nov-Dec warm-escape pool). Chosen over NWS (`api.weather.gov`) because NWS only covers US territory and the warm-escape destination pool explicitly includes Mexico. |
| Recreation.gov RIDB API (`ridb.recreation.gov`) | Official US government open data API, free, requires self-service API key signup | N/A (gov service) | Active | **Accepted as adapter target, not yet implemented** — this codebase cannot self-register for the API key; stubbed in `src/adapters/recreationGov/ridbAdapter.js` returning `configured: false` until `RIDB_API_KEY` is supplied. Per spec section 23, most of the traveler's favorite campgrounds are state/private properties whose own reservation systems outrank RIDB anyway. |
| National Park Service API (`developer.nps.gov`) | Official US government API, free, requires self-service API key signup | N/A (gov service) | Active | **Accepted as adapter target, not yet implemented** — same reasoning as RIDB; stubbed in `src/adapters/nps/npsAdapter.js`. |
| Amadeus for Developers (flights + hotels) | Vendor SaaS, free tier, requires self-service signup | N/A | Active, official self-service travel API | **Accepted as adapter target, not yet implemented** — no other candidate offers both flight and hotel search under one official, self-service-signup vendor with a real free tier (Skyscanner/Google Flights do not offer public self-service APIs; Kayak has none). Stubbed in `src/adapters/flights/flightsAdapter.js` and `src/adapters/hotels/hotelsAdapter.js`, both returning `configured: false` until `AMADEUS_CLIENT_ID`/`AMADEUS_CLIENT_SECRET` are supplied. |
| `node:test` (Node's built-in test runner) | N/A (built-in) | N/A | N/A | **Accepted** — same as the sibling `strategic-honesty-API` project; no reason to add a third-party test framework |

### Why accepted/rejected

This feature's hard constraint is that several spec requirements (live flight
prices, live hotel prices, federal campground/park data, current Recreation.gov
availability) depend on vendor or government APIs that require an account this
codebase cannot create on its own (email verification, ToS acceptance, or a
developer application form). Per CLAUDE.md's adapter-architecture rule, those
integrations are isolated behind thin adapter modules with a single
`isConfigured()` gate — every route that depends on one degrades to
`RESEARCH_ONLY` / `configured: false` rather than fabricating data, prices, or
booking links (spec sections 7, 15, 26 explicitly forbid this). This lets the
Strategic Honesty business logic (seasonal scoring, camping qualification,
booking-status rules, destination discovery) be built and tested completely
today, with the paid/gated data sources becoming a credentials-only follow-up
rather than a rewrite.

Weather is the one live external data source implemented end-to-end in this
pass, because Open-Meteo needs no account and is directly usable for the
"typical temperatures / precipitation" seasonal-fit inputs the spec asks for
in section 1.

### License compatibility

All accepted libraries are MIT or BSD-2-Clause. Open-Meteo's API responses
are CC-BY 4.0 (attribution required if republished; this project consumes the
data for scoring, not redistribution, so no additional obligation beyond
citing Open-Meteo as the source in adapter comments). No copyleft/GPL/AGPL
dependencies introduced.

### Maintenance status

All accepted npm packages show recent releases as of this evaluation.
Open-Meteo, RIDB, and NPS are all actively operated government/community
services with no deprecation signals.

### Security considerations

- No API keys are hardcoded anywhere; all vendor/government credentials are
  read from environment variables (`.env`, git-ignored) and every adapter
  fails closed (`configured: false`) rather than silently proceeding without
  a key.
- No booking or reservation URL is ever constructed by string concatenation
  from a template — `src/domain/bookingStatus.js` requires an explicit,
  already-known URL plus a passed `validateBookingLink()` check before a
  "Book Now"/"Check Availability" button is surfaced, per spec sections 5, 15.
- The campground favorites dataset (`src/data/favoriteCampgrounds.js`) is
  seeded as UNKNOWN/unverified until backed by a sourced research pass
  (`data/campground-research.md`) with real URLs and a verification
  timestamp — never hand-authored facts without a citation.

### Final architecture decision

```
Strategic Honesty business logic
  src/domain/*        (seasonal scoring, camping qualification, booking-status rules,
                        booking order, weighted scoring engine, destination discovery)
  src/services/*       (campground + recommendation orchestration)
  src/routes/*         (Express routes)
        |
        v
  src/adapters/*       (thin wrappers, one per external system)
        |
        v
  Official SDKs / APIs (Open-Meteo, RIDB, NPS API, Amadeus — the latter three gated
                         behind isConfigured() until credentials are supplied)
```

This mirrors the adapter pattern already used in the sibling
`strategic-honesty-API` project (`src/adapters/youtube`, `src/adapters/buffer`).

### Follow-up needed (not yet done)

- Supply `RIDB_API_KEY`, `NPS_API_KEY`, `AMADEUS_CLIENT_ID`/`AMADEUS_CLIENT_SECRET`
  once the account signups are completed, then implement the actual request
  logic in the three stub adapters (interfaces are already defined).
- Backfill `src/data/favoriteCampgrounds.js` from the sourced research pass
  in `data/campground-research.md` once available.
- Persist scoring-weight overrides and a monitor list (spec section 29)
  once a storage layer is chosen — out of scope for this initial scaffold,
  which is stateless.
