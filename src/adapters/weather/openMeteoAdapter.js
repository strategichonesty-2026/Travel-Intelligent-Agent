/**
 * Thin wrapper around Open-Meteo (open-source, MIT-licensed, no API key required) —
 * see TECH_DECISION.md "Seasonal Weather Intelligence" for the evaluation. Used for the
 * "typical temperatures / precipitation / daylight" seasonal-fit inputs in spec section 1.
 */

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_BASE = 'https://archive-api.open-meteo.com/v1/archive';

async function getShortRangeForecast(lat, lon) {
  const url = `${FORECAST_BASE}?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_mean,daylight_duration&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo forecast request failed: ${res.status}`);
  return res.json();
}

/**
 * Historical daily data for the same calendar dates in prior years, used as a proxy for
 * "typical" seasonal conditions when the travel date is too far out for a forecast.
 */
async function getHistoricalAverage(lat, lon, { startDate, endDate, yearsBack = 5 }) {
  const target = new Date(startDate);
  const years = Array.from({ length: yearsBack }, (_, i) => target.getUTCFullYear() - (i + 1));
  const mmdd = (d) => `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

  const samples = await Promise.all(
    years.map(async (year) => {
      const start = new Date(Date.UTC(year, target.getUTCMonth(), target.getUTCDate()));
      const end = endDate ? new Date(Date.UTC(year, new Date(endDate).getUTCMonth(), new Date(endDate).getUTCDate())) : start;
      const url = `${ARCHIVE_BASE}?latitude=${lat}&longitude=${lon}&start_date=${year}-${mmdd(start)}&end_date=${year}-${mmdd(end)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.json();
    }),
  );

  const valid = samples.filter(Boolean);
  if (valid.length === 0) return { available: false };

  const allMax = valid.flatMap((s) => s.daily?.temperature_2m_max || []);
  const allMin = valid.flatMap((s) => s.daily?.temperature_2m_min || []);
  const allPrecip = valid.flatMap((s) => s.daily?.precipitation_sum || []);
  const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

  return {
    available: true,
    yearsSampled: valid.length,
    avgHighC: avg(allMax),
    avgLowC: avg(allMin),
    avgPrecipitationMm: avg(allPrecip),
  };
}

module.exports = { getShortRangeForecast, getHistoricalAverage };
