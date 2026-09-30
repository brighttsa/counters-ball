import { createLiveRoom, joinLiveRoom, readLiveRoom, roomApiBase, roomLink, setLiveRoomName, setLiveRoomReady, heartbeatLiveRoom, connectLiveRoomSocket, savedLiveRoomSeat } from '../core/live-match-room-transport.js?v=5';
import { renderTournamentBracket } from './tournament-room-bracket.js';
import { STREET_LEGENDS_ACTS } from '../levels/street-legends-acts-and-unlocks.js?v=2';

const $ = (id) => document.getElementById(id);
const other = (seat) => seat === 'home' ? 'away' : 'home';

export function createLiveMatchRoomFlow({ level, levelForId = (id) => STREET_LEGENDS_ACTS.find((act) => act.id === id),
  prepareLevel = (value) => value, baseUrl, showTitle, showRoomScreen, onStart }) {
  const api = roomApiBase();
  let currentLevel = level;
  let roomId = null;
  let seat = null;
  let timer = null;
  let invite = '';
  let started = false;
  let socket = null;
  let nameTimer = null;
  let playingMatchId = null;
  const completedMatches = new Set();
  const createButton = document.querySelector('[data-action="live-room-create"]');
  const joinButton = document.querySelector('[data-action="live-room-join"]');
  const roomCode = $('live-room-code');

  const setBusy = (busy) => {
    createButton.disabled = busy;
    joinButton.disabled = busy || !roomCode.value.trim();
    createButton.setAttribute('aria-busy', String(busy));
    joinButton.setAttribute('aria-busy', String(busy));
  };
  roomCode.addEventListener('input', () => { if (!roomCode.readOnly) joinButton.disabled = !roomCode.value.trim(); });
  $('live-room-name').addEventListener('input', () => {
    if (!roomId || !seat) return;
    clearTimeout(nameTimer);
    nameTimer = setTimeout(async () => {
      try { render((await setLiveRoomName(api, roomId, $('live-room-name').value)).room); status('Name updated.'); }
      catch { status('Could not update your name. Check your connection and try again.'); }
    }, 350);
  });

  const status = (text) => { $('live-room-status').textContent = text; };
  const render = (room) => {
    if (room.mode === 'tournament') {
      $('live-room-seats').hidden = true;
      $('live-room-bracket').hidden = false;
      renderTournamentBracket($('live-room-bracket'), room, seat);
      $('live-room-title').textContent = 'Four-player knockout';
      $('live-room-line').textContent = room.phase === 'lobby' ? 'Four players. Two semifinals. One final.' :
        room.phase === 'ended' ? 'The room standings are final.' : 'Semifinals are live. Winners meet in the final.';
      const ready = document.querySelector('[data-action="live-room-ready"]');
      ready.hidden = !seat || room.phase !== 'lobby';
      ready.textContent = room.seats[seat]?.ready ? 'Cancel ready' : 'Ready up';
      $('live-room-name').readOnly = room.phase !== 'lobby';
      const matchId = ['semi-a', 'semi-b', 'final'].find((id) => {
        const match = room.tournament?.matches?.[id];
        return match && !match.winner && match.home && match.away && (match.home === seat || match.away === seat);
      });
      if (matchId && !playingMatchId && !completedMatches.has(matchId)) {
        playingMatchId = matchId;
        const match = room.tournament.matches[matchId];
        onStart?.(roomId, match.home === seat ? 'home' : 'away', {
          home: room.seats[match.home], away: room.seats[match.away],
        }, currentLevel, { matchId, onRoundEnd: async () => {
          completedMatches.add(matchId);
          playingMatchId = null;
          showRoomScreen?.();
          status(matchId === 'final' ? 'Final complete.' : 'Semifinal complete. Waiting for the final.');
          try { render((await readLiveRoom(api, roomId)).room); } catch { status('Reconnecting to the bracket…'); }
        } });
      }
      return;
    }
    $('live-room-bracket').hidden = true;
    $('live-room-seats').hidden = false;
    for (const side of ['home', 'away']) {
      const player = room.seats[side];
      $(`live-room-${side}`).textContent = player?.name ?? (side === 'away' ? 'Waiting for a friend' : 'Player 1');
      $(`live-room-${side}-state`).textContent = player ? `${player.online ? 'Online' : 'Away'} · ${player.ready ? 'Ready' : 'Not ready'}` : 'Not joined';
    }
    const ready = document.querySelector('[data-action="live-room-ready"]');
    ready.hidden = !seat || !room.seats[other(seat)] || room.phase === 'ready';
    ready.textContent = room.seats[seat]?.ready ? 'Cancel ready' : 'Ready up';
    if (room.phase === 'ready') {
      status('Both players are ready. Kickoff is next.');
      if (!started) {
        started = true;
        clearInterval(timer);
        socket?.close();
        socket = null;
        onStart?.(roomId, seat, room.seats, currentLevel);
      }
    }
  };
  const poll = async () => {
    if (!roomId) return;
    try { const { room } = await readLiveRoom(api, roomId); render(room); await heartbeatLiveRoom(api, roomId, seat); }
    catch { status('Connection lost. Trying again…'); }
  };
  const startPolling = () => {
    clearInterval(timer);
    timer = setInterval(() => { if (!socket?.connected) poll(); }, 2500);
    poll();
  };
  const startSocket = () => {
    socket?.close();
    socket = connectLiveRoomSocket(api, roomId, (message) => {
      if (message.room) render(message.room);
    });
  };
  const open = (result) => {
    roomId = result.id ?? roomId; seat = result.seat ?? seat; invite = roomLink(`${baseUrl}`, roomId);
    currentLevel = levelForId(result.room.levelId) ?? currentLevel;
    $('live-room-code').value = roomId; $('live-room-code').readOnly = true;
    $('live-room-name').value = result.room.seats[seat]?.name ?? $('live-room-name').value;
    $('live-room-format-field').hidden = true;
    $('live-room-name').readOnly = false; $('live-room-name').disabled = false; $('live-room-venue').textContent = currentLevel.name;
    $('live-room-line').textContent = seat === 'home'
      ? 'You are hosting this table. Send the invite, then ready up together.'
      : 'You joined as the challenger. Your name is set. Ready up when you are set.';
    createButton.disabled = true;
    joinButton.disabled = true;
    document.querySelector('[data-action="live-room-copy"]').hidden = false;
    document.querySelector('[data-action="live-room-ready"]').hidden = false;
    render(result.room);
    if (!started || result.room.mode === 'tournament') { startSocket(); startPolling(); }
  };
  return {
    show(nextLevel = currentLevel) { currentLevel = prepareLevel(nextLevel); started = false; playingMatchId = null; completedMatches.clear(); clearInterval(timer); socket?.close(); socket = null; roomId = null; seat = null; showRoomScreen?.(); $('live-room-name').disabled = false; $('live-room-name').readOnly = false; $('live-room-venue').textContent = currentLevel.name; $('live-room-title').textContent = 'Play someone live'; $('live-room-line').textContent = 'Host the table or join a rival with a code.'; $('live-room-format-field').hidden = false; $('live-room-seats').hidden = true; $('live-room-bracket').hidden = true; roomCode.readOnly = false; roomCode.value = ''; $('live-room-status').textContent = ''; document.querySelector('[data-action="live-room-ready"]').hidden = true; document.querySelector('[data-action="live-room-copy"]').hidden = true; setBusy(false); },
    async open(id) { this.show(); const saved = savedLiveRoomSeat(id); if (saved) { try { open({ id, seat: saved, ...(await readLiveRoom(api, id)) }); return; } catch { /* ask to join below */ } } $('live-room-code').value = id; this.join(); },
    async create() { setBusy(true); status('Creating your room…'); try { const result = await createLiveRoom(api, { levelId: currentLevel.id, homeName: $('live-room-name').value, mode: $('live-room-format').value }); open(result); status(`Room created. Your code is ${result.id}. Send the invite.`); } catch (error) { console.error('Live room create failed', error); setBusy(false); status('Could not create a room. Check your connection.'); } },
    async join() { const id = roomCode.value.trim(); if (!id) return status('Paste a room code first.'); setBusy(true); status('Joining room…'); try { open({ ...(await joinLiveRoom(api, id, $('live-room-name').value)), id }); status('You joined. Ready up when you are set.'); } catch (error) { setBusy(false); status(error.status === 409 ? 'That room is full. Ask the host for a fresh invite.' : 'Could not join that room. Check the code and your connection.'); } },
    async ready() { const room = await readLiveRoom(api, roomId); const next = !room.room.seats[seat].ready; await setLiveRoomReady(api, roomId, seat, next); render((await readLiveRoom(api, roomId)).room); },
    async copy() {
      const message = `Join my KONK! ${$('live-room-bracket').hidden ? 'live match' : 'four-player knockout'} at ${currentLevel.name}. Choose your name and ready up: ${invite}`;
      try { await navigator.clipboard.writeText(message); status('Live match invite copied. Send it to your opponent.'); }
      catch { status(message); }
    },
    back() { clearTimeout(nameTimer); clearInterval(timer); socket?.close(); socket = null; roomId = null; seat = null; showTitle(); },
  };
}
