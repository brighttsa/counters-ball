import { createLiveRoom, joinLiveRoom, readLiveRoom, roomApiBase, roomLink, setLiveRoomName, setLiveRoomReady, heartbeatLiveRoom, connectLiveRoomSocket, savedLiveRoomSeat, acceptMatchedLiveRoom } from '../core/live-match-room-transport.js?v=6';
import { renderTournamentBracket } from './tournament-room-bracket.js';
import { createPublicRivalSearch } from './public-rival-matchmaking-flow.js';
import { leavePublicLiveRoom } from '../core/live-match-room-transport.js?v=6';
import { resumeLiveRoom, forgetLiveRoomSeat } from '../core/live-match-room-transport.js?v=6';
import { wireKonkerProfileControls } from './konker-profile-controls.js';
import { markRoomLocation } from '../core/live-room-seat-recovery.js';
import { STREET_LEGENDS_ACTS } from '../levels/street-legends-acts-and-unlocks.js?v=2';
import { createTableTalkControls } from './table-talk-controls.js?v=3';

const $ = (id) => document.getElementById(id);
const other = (seat) => seat === 'home' ? 'away' : 'home';

export function createLiveMatchRoomFlow({ level, levelForId = id => STREET_LEGENDS_ACTS.find(act => act.id === id), prepareLevel = (value) => value, baseUrl, showTitle, showRoomScreen = () => {}, onStart, music }) {
  const api = roomApiBase();
  const voiceRoot = $('table-talk-controls');
  const voice = voiceRoot ? createTableTalkControls(voiceRoot, api, music) : { configure() {}, setInMatch() {}, leave: async () => {} };
  wireKonkerProfileControls(api);
  let currentLevel = level;
  let roomId = null;
  let seat = null;
  let timer = null;
  let invite = '';
  let started = false;
  let socket = null;
  let nameTimer = null;
  let playingMatchId = null;
  let publicPair = false;
  const completedMatches = new Set();
  const createButton = document.querySelector('[data-action="live-room-create"]');
  const joinButton = document.querySelector('[data-action="live-room-join"]');
  const roomCode = $('live-room-code');

  const setBusy = (busy) => {
    if (!roomId) $('konker-profile-controls').hidden = busy;
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
    if (room.phase === 'cancelled') {
      voice.configure(null, false);
      voice.setInMatch(false);
      clearTimeout(nameTimer);
      clearInterval(timer); socket?.close(); socket = null; roomId = null; seat = null; publicPair = false;
      search.reset();
      createButton.hidden = false; joinButton.hidden = false; roomCode.closest('label').hidden = false;
      roomCode.value = ''; roomCode.readOnly = false; $('live-room-format-field').hidden = false;
      document.querySelector('[data-action="live-room-ready"]').hidden = true;
      $('live-room-title').textContent = 'Rival left';
      status('Your rival left before kickoff. Find another rival.');
      setBusy(false);
      return;
    }
    voice.configure(roomId, !publicPair && room.phase !== 'ended');
    if (room.mode === 'tournament') {
      $('live-room-seats').hidden = true;
      $('live-room-bracket').hidden = false;
      renderTournamentBracket($('live-room-bracket'), room, seat);
      $('live-room-title').textContent = 'Four-player knockout';
      if (room.phase === 'ended') voice.leave();
      if (room.phase === 'ended') voice.setInMatch(false);
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
        voice.setInMatch(true);
        const match = room.tournament.matches[matchId];
        onStart?.(roomId, match.home === seat ? 'home' : 'away', {
          home: room.seats[match.home], away: room.seats[match.away],
        }, currentLevel, { matchId, onRoundEnd: async () => {
          completedMatches.add(matchId);
          playingMatchId = null;
          voice.setInMatch(false);
          showRoomScreen();
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
    ready.hidden = !seat || !room.seats[other(seat)] || room.phase !== 'lobby';
    ready.textContent = room.seats[seat]?.ready ? 'Cancel ready' : 'Ready up';
    if (['ready', 'playing'].includes(room.phase)) {
      status('Both players are ready. Kickoff is next.');
      if (!started) {
        started = true;
        voice.setInMatch(true);
        clearInterval(timer);
        socket?.close();
        socket = null;
        onStart?.(roomId, seat, room.seats, currentLevel);
      }
    }
  };
  const poll = async () => {
    if (!roomId) return;
    const id = roomId;
    try { const { room } = await readLiveRoom(api, id); if (roomId !== id) return;
      render(room); if (roomId === id) await heartbeatLiveRoom(api, id, seat); }
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
    $('konker-profile-controls').hidden = true;
    $('find-rival').hidden = true; $('cancel-rival-search').hidden = true;
    roomId = result.id ?? roomId; seat = result.seat ?? seat; invite = roomLink(`${baseUrl}`, roomId);
    voice.configure(roomId, !publicPair);
    markRoomLocation(roomId);
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
  const search = createPublicRivalSearch({ api, status, name: () => $('live-room-name').value,
    busy(value) {
      setBusy(value);
      for (const id of ['live-room-name', 'live-room-code', 'live-room-format']) $(id).disabled = value;
      createButton.hidden = value; joinButton.hidden = value;
      roomCode.closest('label').hidden = value;
      $('live-room-format-field').hidden = value;
      $('live-room-venue').textContent = value ? 'Schoolyard Break' : currentLevel.name;
      $('live-room-line').textContent = value ? 'A casual match. Two real players.' : 'Find a rival or invite your friends.';
    },
    matched(result) {
      publicPair = true;
      open(acceptMatchedLiveRoom(result));
      $('live-room-title').textContent = 'Rival found';
      $('live-room-line').textContent = 'A casual match at Schoolyard Break.';
      createButton.hidden = true; joinButton.hidden = true;
      roomCode.closest('label').hidden = true;
      document.querySelector('[data-action="live-room-copy"]').hidden = true;
      status('Your rival is here. Ready up together.');
    },
  });
  $('find-rival').addEventListener('click', () => search.start());
  $('cancel-rival-search').addEventListener('click', () => search.cancel());
  return {
    show(nextLevel = currentLevel) { voice.setInMatch(false); voice.configure(null, false); publicPair = false; search.reset(); createButton.hidden = false; joinButton.hidden = false; roomCode.closest('label').hidden = false; currentLevel = prepareLevel(nextLevel); started = false; playingMatchId = null; completedMatches.clear(); clearInterval(timer); socket?.close(); socket = null; roomId = null; seat = null; showRoomScreen(); $('live-room-name').disabled = false; $('live-room-name').readOnly = false; $('live-room-venue').textContent = currentLevel.name; $('live-room-title').textContent = 'Play someone live'; $('live-room-line').textContent = 'Find a rival or invite your friends.'; $('live-room-format-field').hidden = false; $('live-room-seats').hidden = true; $('live-room-bracket').hidden = true; roomCode.readOnly = false; roomCode.value = ''; $('live-room-status').textContent = ''; document.querySelector('[data-action="live-room-ready"]').hidden = true; document.querySelector('[data-action="live-room-copy"]').hidden = true; setBusy(false); },
    async open(id) { this.show(); const saved = savedLiveRoomSeat(id); if (saved) { try { open(await resumeLiveRoom(api, id)); return; } catch (error) { if (![403, 404].includes(error.status)) { status('Could not reconnect. Reopen your invite to retry.'); return; } forgetLiveRoomSeat(id); } } $('live-room-code').value = id; return this.join(); },
    async create() { setBusy(true); status('Creating your room…'); try { const result = await createLiveRoom(api, { levelId: currentLevel.id, homeName: $('live-room-name').value, mode: $('live-room-format').value }); open(result); status(`Room created. Your code is ${result.id}. Send the invite.`); } catch (error) { console.error('Live room create failed', error); setBusy(false); status('Could not create a room. Check your connection.'); } },
    async join() { const id = roomCode.value.trim(); if (!id) return status('Paste a room code first.'); setBusy(true); status('Joining room…'); try { if (savedLiveRoomSeat(id)) { open(await resumeLiveRoom(api, id)); return; } open({ ...(await joinLiveRoom(api, id, $('live-room-name').value)), id }); status('You joined. Ready up when you are set.'); } catch (error) { setBusy(false); status(error.status === 410 || error.status === 404 ? 'That room has ended or expired. Ask for a fresh invite.' : error.status === 409 ? 'That room is full or already playing. Ask for a fresh invite.' : 'Could not join that room. Check the code and your connection.'); } },
    async ready() { const room = await readLiveRoom(api, roomId); const next = !room.room.seats[seat].ready; await setLiveRoomReady(api, roomId, seat, next); render((await readLiveRoom(api, roomId)).room); },
    async copy() {
      const message = `Join my KONK! ${$('live-room-bracket').hidden ? 'live match' : 'four-player knockout'} at ${currentLevel.name}. Choose your name and ready up: ${invite}`;
      try { await navigator.clipboard.writeText(message); status('Live match invite copied. Send it to your opponent.'); }
      catch { status(message); }
    },
    async back() { if (!await search.cancel()) return;
      if (publicPair && roomId && !started) {
        try { await leavePublicLiveRoom(api, roomId); publicPair = false; }
        catch { status('Could not leave yet. Check your connection and try again.'); return; }
      }
      await voice.leave(); clearTimeout(nameTimer); clearInterval(timer); socket?.close(); socket = null; roomId = null; seat = null; markRoomLocation(null); showTitle(); },
  };
}
