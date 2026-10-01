import { checkNextLetter, checkOpeningLetter } from './match-turn-ledger-rules.js';
import { seatFor } from './live-match-room-rules.js';
import { broadcastLiveRoom } from './live-room-websocket-session.js';

const json = (body, status = 200) => Response.json(body, { status });

export async function duelRoomTurn(ctx, request, room) {
  if (request.method === 'GET') {
    if (!seatFor(room, request.headers.get('Authorization')?.replace(/^Bearer /i, ''))) return json({ error: 'not your seat' }, 403);
    const letter = await ctx.storage.get('room:letter');
    return letter ? json({ letter, seq: letter.k }) : json({ error: 'match has not started' }, 404);
  }
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const body = await request.json();
  const seat = seatFor(room, body.token);
  if (!seat || body.letter?.by !== seat[0]) return json({ error: 'not your seat' }, 403);
  const previous = await ctx.storage.get('room:letter');
  // Receipts survive subsequent turns, so losing an HTTP response cannot fork the match.
  const accepted = Number.isInteger(body.letter?.k) ? await ctx.storage.get(`room:turn:${body.letter.k}`) : null;
  const receipt = accepted ?? previous;
  if (receipt && JSON.stringify(receipt) === JSON.stringify(body.letter)) return json({ seq: receipt.k });
  if (!['ready', 'playing'].includes(room.phase)) return json({ error: 'match has not started' }, 409);
  const verdict = previous ? checkNextLetter(previous, body.letter) : checkOpeningLetter(body.letter);
  if (!verdict.ok) return json({ error: verdict.error, ...(previous ? { letter: previous, seq: previous.k } : {}) }, verdict.status);
  room.phase = body.letter.ra[0] === 1 ? 'ended' : 'playing';
  room.updatedAt = Date.now();
  await ctx.storage.put({ 'room:letter': body.letter, [`room:turn:${body.letter.k}`]: body.letter, room });
  await ctx.storage.setAlarm(Date.now() + 30 * 24 * 60 * 60 * 1000);
  broadcastLiveRoom(ctx, room, { type: 'turn', letter: body.letter });
  return json({ seq: body.letter.k }, previous ? 200 : 201);
}
