import { savedKonkerProfile } from './konker-profile-transport.js';

export function readyProfileProof(storage) {
  const profile = savedKonkerProfile(storage);
  return profile ? { body: { profileId: profile.id }, headers: { Authorization: `Bearer ${profile.secret}` } }
    : { body: {}, headers: {} };
}
