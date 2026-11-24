/** S8 Listing Details URLs. Separate paths per kind, since ids are opaque (UUIDs in production). */
export const routeListingPath = (routeId: string) => `/listings/routes/${routeId}`
export const journeyListingPath = (journeyId: string) => `/listings/journeys/${journeyId}`
