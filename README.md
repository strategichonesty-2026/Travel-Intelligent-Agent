# Travel Intelligence Agent

An autonomous travel-research backend for a Minnesota-based traveler: seasonal-aware
destination discovery, strict site-level campground qualification, and honest
booking-link/booking-status surfacing. Built per the "Autonomous Travel Intelligence
Agent" specification addendum — see [TECH_DECISION.md](./TECH_DECISION.md) for the
reuse-vs-build evaluation behind each piece.

This is a research and recommendation engine, not a booking engine: it never
fabricates prices, availability, or reservation URLs. Anything it can't verify against
a real source is marked `UNKNOWN` or `RESEARCH_ONLY` rather than guessed.

## Status

This initial scaffold implements the parts of the spec that are pure business logic
and testable without paid/gated vendor credentials:

- **Seasonal Fit Score** (spec §1, §27) — June-August prioritizes camping/outdoor
  destinations; November-December prioritizes warm-weather escapes; other months are
  neutral. `src/domain/seasonalEngine.js`
- **Weighted scoring engine** (spec §2, §20) — default trip and camping-value weights,
  user-overridable per request via `POST /scoring/preview`. `src/domain/scoringEngine.js`
- **Automatic destination discovery** (spec §3, §28) — no destination required; ranks a
  curated seasonal candidate pool against stated preferences and explains why each
  candidate was surfaced. `src/domain/destinationDiscovery.js`
- **Booking status / link integrity** (spec §5-7, §15, §26) — `RESEARCH_ONLY` /
  `CHECK_AVAILABILITY` / `BOOKING_READY` / `MONITOR` / `BOOKED` / `EXPIRED`, link
  validation, and the mandatory "price confirmed at checkout" disclaimer.
  `src/domain/bookingStatus.js`
- **Booking order** (spec §9), including limited-inventory reordering.
  `src/domain/bookingOrder.js`
- **Strict campsite qualification** (spec §12-14, §17-19) — individual-site waterfront
  (not campground-level "lake access"), water/electric hookups with amperage,
  bathhouse facilities, seasonal-suspension checks, driving-tier classification, and
  cost calculation with fuel clearly labeled as estimated.
  `src/domain/campingQualification.js`
- **Favorite Campground List** (spec §10) — seeded with the traveler's 14 named
  properties in `src/data/favoriteCampgrounds.js`, each defaulted to `UNKNOWN` until
  backed by a sourced research pass (see `data/campground-research.md`).

### Not yet implemented (requires credentials this codebase can't self-provision)

Flight search, hotel search, Recreation.gov (RIDB) facility data, and NPS park-alert
data all require a self-service developer signup this codebase cannot complete on its
own. Those adapters (`src/adapters/flights`, `src/adapters/hotels`,
`src/adapters/recreationGov`, `src/adapters/nps`) are fully interfaced but return
`configured: false` until real API keys are supplied via `.env` — see `.env.example`
and TECH_DECISION.md's "Follow-up needed" section. Until then, every automatic
recommendation is intentionally capped at `RESEARCH_ONLY`.

## Running

```bash
npm install
cp .env.example .env   # optional — only needed once the gated adapters have keys
npm run dev
```

```bash
npm test
npm run lint
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness check |
| POST | `/recommendations` | Automatic destination discovery — `{ startDate, endDate?, budget?, travelers?, preferences?: string[], weights? }` |
| GET | `/campgrounds/favorites` | The traveler's favorite campground list, with qualification verdicts |
| GET | `/campgrounds/favorites/qualified` | Only campgrounds passing strict site-level qualification |
| GET | `/campgrounds/favorites/ranked` | Value-ranked with BEST VALUE / BEST FACILITIES / BEST CLOSE-TO-HOME labels |
| GET | `/campgrounds/favorites/:id` | Single campground with qualification detail |
| GET | `/campgrounds/favorites/:id/booking` | Booking status, link validation, price disclaimer |
| GET | `/scoring/weights` | Default trip and camping scoring weights |
| POST | `/scoring/preview` | Preview a weighted score with custom weights |

## Data sourcing

`src/data/favoriteCampgrounds.js` and any campground discovered as "similar" (spec
§11, §22) must carry a `verification.sources` URL and `verification.confidence`
(`HIGH`/`MEDIUM`/`LOW`) before being treated as qualified — see spec §14 and §21 for
why (Shell Lake's official reservation system, which exposes site-level waterfront and
hookup data, is the model for `HIGH` confidence; campground-level-only claims are
`MEDIUM`; third-party aggregators are `LOW`).
