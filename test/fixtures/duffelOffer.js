/**
 * A realistic Duffel Offer fixture, shaped to match @duffel/api's shipped OfferTypes.d.ts exactly
 * (field names verified against node_modules/@duffel/api/dist/typings.d.ts, not guessed). This is
 * synthetic test data, not a captured real response — no live Duffel credentials were available
 * when this was written. Represents a round trip: MSP -> LAS (Thursday, depart after 3pm),
 * LAS -> MSP (Sunday, arrive near 5pm) — matching the default traveler profile's schedule rules.
 */

function buildMspLasRoundTripOffer(overrides = {}) {
  const base = {
    id: 'off_00009htYpSCXrwaB9DnUm0',
    live_mode: false,
    base_amount: '210.00',
    base_currency: 'USD',
    tax_amount: '35.60',
    tax_currency: 'USD',
    total_amount: '245.60',
    total_currency: 'USD',
    expires_at: '2026-08-26T23:00:00Z',
    created_at: '2026-08-26T12:00:00Z',
    updated_at: '2026-08-26T12:00:00Z',
    owner: { iata_code: 'DL', name: 'Delta Air Lines', id: 'arl_00001876aqC8c5umZmrRds' },
    slices: [
      {
        id: 'sli_outbound',
        duration: 'PT2H35M',
        origin: { iata_code: 'MSP', name: 'Minneapolis-Saint Paul Intl', time_zone: 'America/Chicago', latitude: 44.883378, longitude: -93.222043 },
        destination: { iata_code: 'LAS', name: 'Harry Reid Intl', time_zone: 'America/Los_Angeles', latitude: 36.084, longitude: -115.152 },
        segments: [
          {
            id: 'seg_out_1',
            origin: { iata_code: 'MSP', name: 'Minneapolis-Saint Paul Intl', time_zone: 'America/Chicago', latitude: 44.883378, longitude: -93.222043 },
            destination: { iata_code: 'LAS', name: 'Harry Reid Intl', time_zone: 'America/Los_Angeles', latitude: 36.084, longitude: -115.152 },
            origin_terminal: '1',
            destination_terminal: '3',
            departing_at: '2026-08-27T15:45:00',
            arriving_at: '2026-08-27T17:20:00',
            marketing_carrier: { iata_code: 'DL', name: 'Delta Air Lines' },
            marketing_carrier_flight_number: '1234',
            operating_carrier: { iata_code: 'DL', name: 'Delta Air Lines' },
            aircraft: { iata_code: '738', name: 'Boeing 737-800' },
            duration: 'PT2H35M',
            distance: '1300',
            stops: [],
            passengers: [
              {
                passenger_id: 'pas_1',
                cabin_class: 'economy',
                cabin_class_marketing_name: 'Main Cabin',
                fare_basis_code: 'Y',
                baggages: [{ type: 'checked', quantity: 1 }],
              },
            ],
          },
        ],
      },
      {
        id: 'sli_return',
        duration: 'PT2H40M',
        origin: { iata_code: 'LAS', name: 'Harry Reid Intl', time_zone: 'America/Los_Angeles', latitude: 36.084, longitude: -115.152 },
        destination: { iata_code: 'MSP', name: 'Minneapolis-Saint Paul Intl', time_zone: 'America/Chicago', latitude: 44.883378, longitude: -93.222043 },
        segments: [
          {
            id: 'seg_ret_1',
            origin: { iata_code: 'LAS', name: 'Harry Reid Intl', time_zone: 'America/Los_Angeles', latitude: 36.084, longitude: -115.152 },
            destination: { iata_code: 'MSP', name: 'Minneapolis-Saint Paul Intl', time_zone: 'America/Chicago', latitude: 44.883378, longitude: -93.222043 },
            origin_terminal: '3',
            destination_terminal: '1',
            departing_at: '2026-08-30T13:30:00',
            arriving_at: '2026-08-30T17:10:00',
            marketing_carrier: { iata_code: 'DL', name: 'Delta Air Lines' },
            marketing_carrier_flight_number: '5678',
            operating_carrier: { iata_code: 'DL', name: 'Delta Air Lines' },
            aircraft: { iata_code: '738', name: 'Boeing 737-800' },
            duration: 'PT2H40M',
            distance: '1300',
            stops: [],
            passengers: [
              {
                passenger_id: 'pas_1',
                cabin_class: 'economy',
                cabin_class_marketing_name: 'Main Cabin',
                fare_basis_code: 'Y',
                baggages: [{ type: 'checked', quantity: 1 }],
              },
            ],
          },
        ],
      },
    ],
  };

  return { ...base, ...overrides };
}

/** A one-connection variant of the outbound slice, for testing connection-preference logic. */
function buildOneStopOutboundSlice() {
  return {
    id: 'sli_outbound_1stop',
    duration: 'PT5H10M',
    origin: { iata_code: 'MSP', name: 'Minneapolis-Saint Paul Intl', time_zone: 'America/Chicago', latitude: 44.883378, longitude: -93.222043 },
    destination: { iata_code: 'LAS', name: 'Harry Reid Intl', time_zone: 'America/Los_Angeles', latitude: 36.084, longitude: -115.152 },
    segments: [
      {
        id: 'seg_a',
        origin: { iata_code: 'MSP', name: 'Minneapolis-Saint Paul Intl', time_zone: 'America/Chicago', latitude: 44.883378, longitude: -93.222043 },
        destination: { iata_code: 'DEN', name: 'Denver Intl', time_zone: 'America/Denver' },
        departing_at: '2026-08-27T15:45:00',
        arriving_at: '2026-08-27T17:00:00',
        marketing_carrier: { iata_code: 'UA', name: 'United Airlines' },
        marketing_carrier_flight_number: '200',
        operating_carrier: { iata_code: 'UA', name: 'United Airlines' },
        aircraft: { iata_code: '73G', name: 'Boeing 737-700' },
        duration: 'PT1H15M',
        stops: [],
        passengers: [{ passenger_id: 'pas_1', cabin_class: 'economy', cabin_class_marketing_name: 'Economy', fare_basis_code: 'Y', baggages: [] }],
      },
      {
        id: 'seg_b',
        origin: { iata_code: 'DEN', name: 'Denver Intl', time_zone: 'America/Denver' },
        destination: { iata_code: 'LAS', name: 'Harry Reid Intl', time_zone: 'America/Los_Angeles', latitude: 36.084, longitude: -115.152 },
        departing_at: '2026-08-27T18:00:00',
        arriving_at: '2026-08-27T18:55:00',
        marketing_carrier: { iata_code: 'UA', name: 'United Airlines' },
        marketing_carrier_flight_number: '450',
        operating_carrier: { iata_code: 'UA', name: 'United Airlines' },
        aircraft: { iata_code: '73G', name: 'Boeing 737-700' },
        duration: 'PT1H55M',
        stops: [],
        passengers: [{ passenger_id: 'pas_1', cabin_class: 'economy', cabin_class_marketing_name: 'Economy', fare_basis_code: 'Y', baggages: [] }],
      },
    ],
  };
}

module.exports = { buildMspLasRoundTripOffer, buildOneStopOutboundSlice };
