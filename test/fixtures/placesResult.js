/**
 * A realistic Google Places API (New) Text Search response fixture, field names verified against
 * Google's current documentation for the Text Search endpoint. Synthetic test data, not a
 * captured real response.
 */

function buildPlacesSearchResponse(overrides = {}) {
  return {
    places: [
      {
        id: 'places/ChIJi7xhMnh1a4cR2t5CvIcXCVw',
        displayName: { text: 'The Brown Palace Hotel', languageCode: 'en' },
        formattedAddress: '321 17th St, Denver, CO 80202, USA',
        rating: 4.6,
        userRatingCount: 3200,
        priceLevel: 'PRICE_LEVEL_EXPENSIVE',
        location: { latitude: 39.7434, longitude: -104.9903 },
        types: ['lodging', 'point_of_interest', 'establishment'],
        websiteUri: 'https://www.brownpalace.com/',
        googleMapsUri: 'https://maps.google.com/?cid=1234567890',
      },
      {
        id: 'places/ChIJabc123def456',
        displayName: { text: 'Denver Downtown Inn', languageCode: 'en' },
        formattedAddress: '100 14th St, Denver, CO 80202, USA',
        rating: 3.9,
        userRatingCount: 540,
        priceLevel: 'PRICE_LEVEL_MODERATE',
        location: { latitude: 39.7481, longitude: -104.9998 },
        types: ['lodging', 'point_of_interest', 'establishment'],
        websiteUri: 'https://denverdowntowninn.example.com/',
        googleMapsUri: 'https://maps.google.com/?cid=9876543210',
      },
    ],
    ...overrides,
  };
}

module.exports = { buildPlacesSearchResponse };
