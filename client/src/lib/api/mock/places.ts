import type { Place } from '../types'

/**
 * Public landmarks used by the mock geocoder (Gauteng, approximate
 * coordinates). Real geocoding (Google Maps or Mapbox) replaces this.
 */
export const PLACES: Place[] = [
  {
    id: 'tembisa-plaza',
    label: 'Tembisa Plaza',
    area: 'Tembisa, Ekurhuleni',
    lat: -25.9963,
    lng: 28.2268,
  },
  {
    id: 'tembisa-rank',
    label: 'Tembisa Taxi Rank',
    area: 'Tembisa, Ekurhuleni',
    lat: -25.9989,
    lng: 28.2219,
  },
  {
    id: 'rabie-ridge',
    label: 'Rabie Ridge',
    area: 'Midrand, Johannesburg',
    lat: -26.0185,
    lng: 28.1875,
  },
  {
    id: 'ivory-park',
    label: 'Ivory Park',
    area: 'Midrand, Johannesburg',
    lat: -25.9906,
    lng: 28.1972,
  },
  {
    id: 'clayville',
    label: 'Clayville',
    area: 'Olifantsfontein, Ekurhuleni',
    lat: -25.9681,
    lng: 28.2391,
  },
  {
    id: 'midrand-gautrain',
    label: 'Midrand Gautrain Station',
    area: 'Midrand, Johannesburg',
    lat: -25.9965,
    lng: 28.1375,
  },
  {
    id: 'midrand-cbd',
    label: 'Midrand CBD (Boulders)',
    area: 'Midrand, Johannesburg',
    lat: -25.9987,
    lng: 28.1262,
  },
  {
    id: 'waterfall-city',
    label: 'Waterfall City',
    area: 'Midrand, Johannesburg',
    lat: -26.017,
    lng: 28.1065,
  },
  {
    id: 'kempton-park',
    label: 'Kempton Park CBD',
    area: 'Kempton Park, Ekurhuleni',
    lat: -26.1035,
    lng: 28.233,
  },
  {
    id: 'sandton-gautrain',
    label: 'Sandton Gautrain Station',
    area: 'Sandton, Johannesburg',
    lat: -26.1076,
    lng: 28.0567,
  },
  {
    id: 'rosebank',
    label: 'Rosebank Mall',
    area: 'Rosebank, Johannesburg',
    lat: -26.146,
    lng: 28.0436,
  },
  {
    id: 'park-station',
    label: 'Park Station',
    area: 'Johannesburg CBD',
    lat: -26.1966,
    lng: 28.0423,
  },
  {
    id: 'centurion-gautrain',
    label: 'Centurion Gautrain Station',
    area: 'Centurion, Tshwane',
    lat: -25.8517,
    lng: 28.1898,
  },
  {
    id: 'pretoria-station',
    label: 'Pretoria Station',
    area: 'Pretoria, Tshwane',
    lat: -25.759,
    lng: 28.1898,
  },
]

export function placeById(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id)
}

/** Great-circle distance in km. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Coarse (~1 km) point for publishing a private pickup area (BR3). */
export function approximate(p: { lat: number; lng: number }) {
  return { lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 }
}
