export function liveRoomVenueFor(level, venues) {
  return venues.find((venue) => venue.id === level?.id || venue.backdrop === level?.backdrop) ?? venues[0];
}
