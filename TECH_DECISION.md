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

- Supply `RIDB_API_KEY`, `NPS_API_KEY` once the account signups are completed,
  then implement the actual request logic in the two stub adapters
  (interfaces are already defined). Flight provider credentials are covered
  by the Phase 3 addendum below; a hotel provider is still unselected
  (Phase 4).
- Backfill `src/data/favoriteCampgrounds.js` from the sourced research pass
  in `data/campground-research.md` once available.
- Persist scoring-weight overrides and a monitor list (spec section 29)
  once a storage layer is chosen — out of scope for this initial scaffold,
  which is stateless.

---

## Phase 3 addendum: flight provider re-evaluation (Amadeus → Duffel)

**Date:** 2026-08-26

### Why re-evaluated

The initial scaffold above picked Amadeus for Developers as the flight (and
prospective hotel) provider. When Phase 3 actually began, Amadeus's
self-service developer portal had been decommissioned (announced cutover
July 17, 2026) — the only remaining path is the Amadeus Enterprise API
Portal, which requires a sales/contract process this project has no way to
go through. Amadeus was therefore dropped as the flight provider.

### Repos/libraries evaluated

| Candidate | License | Stars | Maintenance | Decision |
|-----------|---------|-------|-------------|----------|
| Amadeus for Developers (Enterprise portal, post-decommission) | Vendor SaaS | N/A | Active vendor, but self-service signup gone | **Rejected** — no self-service path remains; Enterprise requires a sales process |
| Duffel (flights) | Vendor SaaS, genuine self-service signup, free test mode | N/A | Active — official self-service travel API | **Accepted** — real self-service signup still works (`duffel_test_...` tokens, no payment info needed to start), modern REST API, built specifically for indie/self-service integrations |
| `@duffel/api` (duffelhq/duffel-api-javascript) | MIT | N/A (npm: 4.28.0, published 2026-08-13) | Active — official Duffel-maintained TypeScript SDK, maintainers list `@duffel.com` emails | **Accepted** — official SDK over hand-rolled `fetch` calls against the raw REST API, per the reuse-over-rebuild default; ships full TypeScript type definitions, which were read directly (`node_modules/@duffel/api/dist/typings.d.ts`) to get exact request/response field names rather than relying on documentation pages, some of which were incomplete on response details when checked |

### Why accepted/rejected

Duffel was the only flight-search provider found (via direct research of
Duffel's own docs, not assumed from training knowledge) that still offers a
genuinely self-service signup with no sales process and a working free test
mode — matching this project's constraint (no ability to go through a
vendor's account-creation/sales flow). The official `@duffel/api` SDK was
used instead of raw HTTP calls specifically because its shipped `.d.ts`
files gave verified-accurate field names (`slices`, `segments`,
`departing_at`/`arriving_at`, `marketing_carrier`, `total_amount`, etc.),
removing the risk of a hand-written request/response mapper drifting from
the real API shape.

### License compatibility

MIT (`@duffel/api`). No copyleft/GPL/AGPL concerns. Duffel's API itself is a
vendor service, not a dependency with a license to evaluate.

### Maintenance status

`@duffel/api` shows a release (4.28.0) as of this evaluation with official
Duffel maintainers. No abandonment signals.

### Security considerations

- `DUFFEL_ACCESS_TOKEN` is read from the environment only, never hardcoded,
  git-ignored via `.env`. A `duffel_test_`-prefixed token only ever touches
  Duffel's test-mode data — there is no separate test-vs-live base URL to
  misconfigure, the token itself is the boundary.
- `src/adapters/flights/flightsAdapter.js` fails closed (`configured:
  false`) with no token set, and returns `results: []` with a `error`
  message (never a fabricated flight) on any provider-side failure.
- **Live verification status:** the adapter (`duffelClient.js`,
  `mapFlightOffer.js`) was built and unit-tested against Duffel's official
  SDK type definitions, but had not yet been exercised against a real
  `DUFFEL_ACCESS_TOKEN` at the time this addendum was written — see the
  Phase 3 completion report for whether live verification happened in this
  same session or remains a follow-up.

### Final architecture decision

```
Strategic Honesty business logic
  src/domain/flightScheduleRules.js   (pure: outbound/return/day/time/connection rules)
  src/domain/flightSelection.js       (pure: picks the best offer against the rules)
  src/services/dealBoard.js           (orchestrates: calls the adapter, applies selection,
                                        folds real flight data into deal-table rows)
        |
        v
  src/adapters/flights/
    flightsAdapter.js    (isConfigured() gate, searchFlights(), never fabricates on failure)
    duffelClient.js       (thin wrapper around the official @duffel/api SDK)
    mapFlightOffer.js     (raw Duffel Offer -> normalized FlightOption; pure, defensive)
        |
        v
  @duffel/api (official SDK) -> Duffel API (api.duffel.com)
```
