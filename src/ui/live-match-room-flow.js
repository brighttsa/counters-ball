import { createLiveRoom, joinLiveRoom, readLiveRoom, roomApiBase, roomLink, setLiveRoomReady, heartbeatLiveRoom } from '../core/live-match-room-transport.js';

const $ = (id) => document.getElementById(id);
const other = (seat) => seat === 'home' ? 'away' : 'home';

export function createLiveMatchRoomFlow({ level, baseUrl, showTitle, onStart }) {
  const api = roomApiBase();
  let currentLevel = level;
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
    if (room.phase === 'ready') { status('Both players are ready. Kickoff is next.'); if (!started) { started = true; onStart?.(roomId, seat, room.seats, currentLevel); } }
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
    $('live-room-name').readOnly = true; $('live-room-venue').textContent = currentLevel.name;
    $('live-room-line').textContent = seat === 'home'
      ? 'You are hosting this table. Send the invite, then ready up together.'
      : 'You joined as the challenger. Confirm your name, then ready up.';
    document.querySelector('[data-action="live-room-create"]').disabled = true;
    document.querySelector('[data-action="live-room-join"]').disabled = true;
    document.querySelector('[data-action="live-room-copy"]').hidden = false;
    document.querySelector('[data-action="live-room-ready"]').hidden = false;
    render(result.room); startPolling();
  };
  return {
    show(nextLevel = currentLevel) { currentLevel = nextLevel; started = false; document.querySelectorAll('[data-screen]').forEach((screen) => screen.classList.toggle('is-active', screen.dataset.screen === 'live-room')); $('live-room-venue').textContent = currentLevel.name; $('live-room-line').textContent = 'Host the table or join a rival with a code. You will each see your own side during the match.'; $('live-room-name').readOnly = false; $('live-room-code').readOnly = false; $('live-room-code').value = ''; $('live-room-status').textContent = ''; document.querySelector('[data-action="live-room-create"]').disabled = false; document.querySelector('[data-action="live-room-join"]').disabled = false; document.body.dataset.screen = 'live-room'; },
    open(id) { this.show(); $('live-room-code').value = id; this.join(); },
    async create() { status('Creating your room…'); try { const result = await createLiveRoom(api, { levelId: currentLevel.id, homeName: $('live-room-name').value }); open(result); status(`Room created. Your code is ${result.id}. Send the invite.`); } catch { status('Could not create a room. Check your connection.'); } },
    async join() { const id = $('live-room-code').value.trim(); if (!id) return status('Paste a room code first.'); status('Joining room…'); try { open({ ...(await joinLiveRoom(api, id, $('live-room-name').value)), id }); status('You joined. Ready up when you are set.'); } catch (error) { status(error.status === 409 ? 'That room is full. Ask the host for a fresh invite.' : 'Could not join that room. Check the code and your connection.'); } },
    async ready() { const room = await readLiveRoom(api, roomId); const next = !room.room.seats[seat].ready; await setLiveRoomReady(api, roomId, seat, next); render((await readLiveRoom(api, roomId)).room); },
    async copy() {
      const message = `Join me for a live KONK! match at ${currentLevel.name}. Tap this invite, choose your name, and ready up: ${invite}`;
      try { await navigator.clipboard.writeText(message); status('Live match invite copied. Send it to your opponent.'); }
      catch { status(message); }
    },
    back() { clearInterval(timer); roomId = null; seat = null; showTitle(); },
  };
}
