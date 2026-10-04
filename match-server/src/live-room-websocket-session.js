import { publicRoom, seatFor, touch } from './live-match-room-rules.js';
import { tournamentMatchFor } from './tournament-room-rules.js';
import {resumeRankedTurn} from './ranked-abandonment-policy.js';

export function upgradeLiveRoomSocket(ctx, Pair = globalThis.WebSocketPair) {
  const pair = new Pair();
  const [client, server] = Object.values(pair);
  server.serializeAttachment({ seat: null });
  ctx.acceptWebSocket(server);
  return new Response(null, { status: 101, webSocket: client });
}

export async function handleLiveRoomSocketMessage(ctx, socket, raw) {
  let message;
  try { message = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); }
  catch { socket.close(1003, 'Invalid message'); return; }
  let attachment = socket.deserializeAttachment() ?? { seat: null };
  const room = await ctx.storage.get('room');
  if (!attachment.seat) {
    const seat = message.type === 'auth' ? seatFor(room, message.token) : null;
    if (!seat) { socket.close(1008, 'Invalid seat'); return; }
    attachment = { seat, token: message.token };
    socket.serializeAttachment(attachment);
    socket.send(JSON.stringify({ type: 'room', room: publicRoom(room) }));
    const matchId = tournamentMatchFor(room, seat);
    const latest = await ctx.storage.get(matchId ? `room:letter:${matchId}` : 'room:letter');
    if (latest && (room.mode !== 'tournament' || matchId)) socket.send(JSON.stringify({ type: 'turn', ...(matchId ? { matchId } : {}), letter: latest }));
    return;
  }
  if (seatFor(room, attachment.token) !== attachment.seat) { socket.close(1008, 'Seat unavailable'); return; }
  const verdict = touch(room, attachment.seat);
  if (!verdict.ok) { socket.close(1008, 'Seat unavailable'); return; }
  resumeRankedTurn(room,Date.now());
  await ctx.storage.put('room', room);
  broadcastLiveRoom(ctx, room);
}

export function broadcastLiveRoom(ctx, room, event = { type: 'room' }) {
  const message = JSON.stringify({ ...event, room: publicRoom(room) });
  const roomMessage = JSON.stringify({ type: 'room', room: publicRoom(room) });
  for (const socket of ctx.getWebSockets()) {
    const attachment = socket.deserializeAttachment();
    const seat = attachment?.seat;
    if (!seat) continue;
    if (seatFor(room, attachment.token) !== seat) { socket.close(1008, 'Seat unavailable'); continue; }
    const match = event.matchId && room.tournament?.matches[event.matchId];
    const visible = !match || match.home === seat || match.away === seat;
    try { socket.send(visible ? message : roomMessage); } catch { /* disconnected sockets close asynchronously */ }
  }
}
