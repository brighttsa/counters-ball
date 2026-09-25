import { createLiveRoom, joinLiveRoom, readLiveRoom, roomApiBase, roomLink, setLiveRoomReady, heartbeatLiveRoom } from '../core/live-match-room-transport.js';

const $ = (id) => document.getElementById(id);
const other = (seat) => seat === 'home' ? 'away' : 'home';

export function createLiveMatchRoomFlow({ level, baseUrl, showTitle, onStart }) {
  const api = roomApiBase();
  let roomId = null;
  let seat = null;
  let timer = null;
  let invite = '';
  let started = false;

  const status = (text) => { $('live-room-status').textContent = text; };
  const render = (room) => {
    $('live-room-seats').hidden = false;
    for (const side of ['home', 'away']) {
      const player = room.seats[side];
      $(`live-room-${side}`).textContent = player?.name ?? (side === 'away' ? 'Waiting for a friend' : 'Player 1');
      $(`live-room-${side}-state`).textContent = player ? `${player.online ? 'Online' : 'Away'} · ${player.ready ? 'Ready' : 'Not ready'}` : 'Not joined';
    }
    const ready = document.querySelector('[data-action="live-room-ready"]');
    ready.hidden = !seat || !room.seats[other(seat)] || room.phase === 'ready';
    ready.textContent = room.seats[seat]?.ready ? 'Cancel ready' : 'Ready up';
    if (room.phase === 'ready') { status('Both players are ready. Kickoff is next.'); if (!started) { started = true; onStart?.(roomId, seat); } }
  };
  const poll = async () => {
    if (!roomId) return;
    try { const { room } = await readLiveRoom(api, roomId); render(room); await heartbeatLiveRoom(api, roomId, seat); }
    catch { status('Connection lost. Trying again…'); }
  };
  const startPolling = () => { clearInterval(timer); timer = setInterval(poll, 2500); poll(); };
  const open = (result) => {
    roomId = result.id ?? roomId; seat = result.seat ?? seat; invite = roomLink(`${baseUrl}`, roomId);
    $('live-room-code').value = roomId; $('live-room-code').readOnly = true;
    $('live-room-name').readOnly = true; $('live-room-venue').textContent = level.name;
    document.querySelector('[data-action="live-room-copy"]').hidden = false;
    document.querySelector('[data-action="live-room-ready"]').hidden = false;
    render(result.room); startPolling();
  };
  return {
    show() { started = false; document.querySelectorAll('[data-screen]').forEach((screen) => screen.classList.toggle('is-active', screen.dataset.screen === 'live-room')); $('live-room-venue').textContent = level.name; $('live-room-name').readOnly = false; $('live-room-code').readOnly = false; document.body.dataset.screen = 'live-room'; },
    open(id) { this.show(); $('live-room-code').value = id; this.join(); },
    async create() { status('Creating your room…'); try { open(await createLiveRoom(api, { levelId: level.id, homeName: $('live-room-name').value })); status('Room ready. Send the invite code.'); } catch { status('Could not create a room. Check your connection.'); } },
    async join() { const id = $('live-room-code').value.trim(); if (!id) return status('Paste a room code first.'); status('Joining room…'); try { open({ ...(await joinLiveRoom(api, id, $('live-room-name').value)), id }); status('You joined. Ready up when you are set.'); } catch (error) { status(error.status === 409 ? 'That room is full.' : 'Could not join that room.'); } },
    async ready() { const room = await readLiveRoom(api, roomId); const next = !room.room.seats[seat].ready; await setLiveRoomReady(api, roomId, seat, next); render((await readLiveRoom(api, roomId)).room); },
    async copy() { try { await navigator.clipboard.writeText(invite); status('Invite copied. Your friend can join the room.'); } catch { status(invite); } },
    back() { clearInterval(timer); roomId = null; seat = null; showTitle(); },
  };
}
