// Profile credentials are verified before crossing into the room object.
// Only the worker may supply verifiedProfileId; seat tokens still prove ownership.
import { checkProfileRequestLimit } from './profile-request-limits.js';

export async function verifyReadyProfile(request, env, body, {checkLimit=checkProfileRequestLimit,afterVerify,includeName=false}={}) {
  delete body.verifiedProfileId;
  const id = body.profileId;
  delete body.profileId;
  const authorization = request.headers.get('Authorization');
  if (id === undefined && !authorization) return null;
  if (!/^[a-f0-9]{32}$/.test(id ?? '') || !/^Bearer [a-f0-9]{64}$/.test(authorization ?? '')) {
    return Response.json({ error: 'invalid profile credentials' }, { status: 400 });
  }
  const origin = request.headers.get('Origin');
  if (origin && !(env.ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).includes(origin)) {
    return Response.json({ error: 'origin not allowed' }, { status: 403 });
  }
  const limit = await checkLimit(request, env);
  if (!limit.ok) return limit;
  const stub = env.KONK_MATCH.get(env.KONK_MATCH.idFromName(`player:${id}`));
  const response = await stub.fetch('https://match/player', { headers: { Authorization: authorization } });
  const result = await response.json();
  if (!response.ok || result?.profile?.id !== id) {
    return Response.json({ error: 'profile verification failed; check your account before readying up' }, { status: 403 });
  }
  body.verifiedProfileId = id;
  if(afterVerify){const allowance=await afterVerify(env,id);if(!allowance.ok)return allowance;}
  if(includeName)body.verifiedName=result.profile.name;
  return null;
}

export function bindKonkerSeat(room, seat, profileId) {
  if (!room?.seats?.[seat]) return { ok: false, status: 403, error: 'not your seat' };
  if (!profileId) return { ok: true };
  const player = room.seats[seat];
  if (player.profileId === profileId) return { ok: true };
  if (player.profileId || room.phase !== 'lobby' || player.ready) {
    return { ok: false, status: 409, error: 'seat identity is locked' };
  }
  if (Object.entries(room.seats).some(([other, value]) => other !== seat && value?.profileId === profileId)) {
    return { ok: false, status: 409, error: 'this profile already occupies a seat' };
  }
  player.profileId = profileId;
  return { ok: true };
}
