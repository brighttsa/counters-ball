import { joinLiveRoom, readLiveRoom, roomApiBase, roomLink, setLiveRoomName, setLiveRoomReady, heartbeatLiveRoom, connectLiveRoomSocket, savedLiveRoomSeat, acceptMatchedLiveRoom, leavePublicLiveRoom, resumeLiveRoom, forgetLiveRoomSeat } from '../core/live-match-room-transport.js?v=7';
import { createPreviewAwareRoom } from '../core/live-room-preview-creation.js';
import { requestRoomRematch } from '../core/live-match-room-transport.js?v=7';
import { renderTournamentBracket } from './tournament-room-bracket.js';
import { createPublicRivalSearch } from './public-rival-matchmaking-flow.js';
import { wireKonkerProfileControls } from './konker-profile-controls.js';
import { markRoomLocation } from '../core/live-room-seat-recovery.js';
import { STREET_LEGENDS_ACTS } from '../levels/street-legends-acts-and-unlocks.js?v=2';
import { createTableTalkControls } from './table-talk-controls.js?v=5';
const $ = (id) => document.getElementById(id);
const other = (seat) => seat === 'home' ? 'away' : 'home';
export function createLiveMatchRoomFlow({ level, levelForId = id => STREET_LEGENDS_ACTS.find(act => act.id === id), prepareLevel = (value) => value, baseUrl, showTitle, showRoomScreen = () => {}, onStart, music }) {
  const api = roomApiBase();
  const voiceRoot = $('table-talk-controls');
  const voice = voiceRoot ? createTableTalkControls(voiceRoot, api, music) : { configure() {}, setInMatch() {}, leave: async () => {} };
  wireKonkerProfileControls(api);
  let currentLevel = level;
  let roomId = null,seat = null;
  let timer = null;
  let invite = '',started = false;
  let socket = null,nameTimer = null;
  let playingMatchId = null,serverMatchId=null;
  let publicPair = false;
  const completedMatches = new Set();
  const createButton = document.querySelector('[data-action="live-room-create"]');
  const joinButton = document.querySelector('[data-action="live-room-join"]');
  const roomCode = $('live-room-code');
  const pathCards = [...document.querySelectorAll('[data-action="live-room-path"]')];
  const pathFields = { name: $('live-room-name-field'), code: $('live-room-code-field'), format: $('live-room-format-field') };
  let selectedPath = null;
  const resetPaths = () => {
    selectedPath = null;
    $('live-room-paths').hidden = false;
    $('live-room-path-back').hidden = true;
    Object.values(pathFields).forEach((field) => { field.hidden = true; });
    createButton.hidden = true; joinButton.hidden = true;
    $('find-rival').hidden = true; $('cancel-rival-search').hidden = true;
    $('konker-profile-controls').hidden = true;
    for (const card of pathCards) card.setAttribute('aria-pressed', 'false');
  };
  const choosePath = (path) => {
    if (!['friend', 'rival', 'knockout'].includes(path)) return;
    selectedPath = path;
    $('live-room-paths').hidden = true;
    $('live-room-path-back').hidden = false;
    pathCards.forEach((card) => card.setAttribute('aria-pressed', String(card.dataset.path === path)));
    pathFields.name.hidden = false;
    pathFields.code.hidden = path === 'rival';
    pathFields.format.hidden = true;
    $('live-room-format').value = path === 'knockout' ? 'tournament' : 'duel';
    $('room-format-value').textContent = path === 'knockout' ? 'Four-player knockout' : 'Head-to-head match';
    document.querySelector('[name="room-format-choice"][value="tournament"]').checked = path === 'knockout';
    document.querySelector('[name="room-format-choice"][value="duel"]').checked = path !== 'knockout';
    createButton.hidden = path === 'rival'; joinButton.hidden = path === 'rival';
    $('find-rival').hidden = path !== 'rival';
    $('live-room-title').textContent = path === 'friend' ? 'Bring a friend to the table'
      : path === 'knockout' ? 'Host a four-player knockout' : 'Find someone to play';
    $('live-room-line').textContent = path === 'friend' ? 'Host a table or enter your friend’s room code.'
      : path === 'knockout' ? 'Four players. Two semifinals. One final. Host or join with a room code.'
        : 'Meet another player for a casual match.';
    joinButton.disabled = !roomCode.value.trim();
  };
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
    serverMatchId=room.simulation?room.matchId:null;
    if (room.phase === 'cancelled') {
      voice.configure(null, false);
      voice.setInMatch(false);
      clearTimeout(nameTimer);
      clearInterval(timer); socket?.close(); socket = null; roomId = null; seat = null; publicPair = false;
      search.reset();
      roomCode.value = ''; roomCode.readOnly = false;
      document.querySelector('[data-action="live-room-ready"]').hidden = true;
      $('live-room-title').textContent = 'Rival left';
      status('Your rival left before kickoff. Find another rival.');
      resetPaths();
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
    $('live-room-bracket').hidden = true; $('live-room-seats').hidden = false;
    for (const side of ['home', 'away']) {
      const player = room.seats[side];
      $(`live-room-${side}`).textContent = player?.name ?? (side === 'away' ? 'Waiting for a friend' : 'Player 1');
      $(`live-room-${side}-state`).textContent = player ? `${player.online ? 'Online' : 'Away'} · ${player.ready ? 'Ready' : 'Not ready'}` : 'Not joined';
    }
    const ready = document.querySelector('[data-action="live-room-ready"]');
    ready.hidden = !seat || !room.seats[other(seat)] || room.phase !== 'lobby';
    ready.textContent = room.seats[seat]?.ready ? 'Cancel ready' : 'Ready up';
    if (['ready', 'playing'].includes(room.phase) || (room.simulation && room.phase === 'ended')) {
      status('Both players are ready. Kickoff is next.');
      if (!started) {
        started = true;
        voice.setInMatch(true);
        clearInterval(timer);
        socket?.close();
        socket = null;
        onStart?.(roomId, seat, room.seats, currentLevel, { simulation: room.simulation });
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
    $('konker-profile-controls').hidden = false;
    $('live-room-paths').hidden = true; $('live-room-path-back').hidden = true;
    pathFields.name.hidden = false; pathFields.code.hidden = false; pathFields.format.hidden = true;
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
    createButton.disabled = true; joinButton.disabled = true;
    document.querySelector('[data-action="live-room-copy"]').hidden = false;
    document.querySelector('[data-action="live-room-copy-code"]').hidden = false;
    document.querySelector('[data-action="live-room-ready"]').hidden = false;
    render(result.room);
    if (!started || result.room.mode === 'tournament') { startSocket(); startPolling(); }
  };
  const search = createPublicRivalSearch({ api, status, name: () => $('live-room-name').value,
    busy(value) {
      setBusy(value);
      for (const id of ['live-room-name', 'live-room-code', 'live-room-format']) $(id).disabled = value;
      createButton.hidden = value || !['friend', 'knockout'].includes(selectedPath);
      joinButton.hidden = value || !['friend', 'knockout'].includes(selectedPath);
      $('find-rival').hidden = selectedPath !== 'rival' || value;
      $('cancel-rival-search').hidden = selectedPath !== 'rival' || !value;
      pathFields.code.hidden = value || selectedPath === 'rival';
      pathFields.format.hidden = true;
      $('live-room-path-back').hidden = value;
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
      document.querySelector('[data-action="live-room-copy-code"]').hidden = true;
      status('Your rival is here. Ready up together.');
    },
  });
  $('find-rival').addEventListener('click', () => search.start());
  $('cancel-rival-search').addEventListener('click', () => search.cancel());
  return {
    rematch(){if(!serverMatchId||!roomId||!started)return false;
      void requestRoomRematch(api,roomId,serverMatchId).then(result=>{started=false;showRoomScreen();open(result);status('Rematch requested. Both players must accept.');})
        .catch(()=>status('Could not request rematch. Try again.'));return true;},
    show(nextLevel = currentLevel) { voice.setInMatch(false); voice.configure(null, false); publicPair = false; search.reset(); currentLevel = prepareLevel(nextLevel); started = false; playingMatchId = null; completedMatches.clear(); clearInterval(timer); socket?.close(); socket = null; roomId = null; seat = null; showRoomScreen(); $('live-room-name').disabled = false; $('live-room-name').readOnly = false; $('live-room-venue').textContent = currentLevel.name; $('live-room-title').textContent = 'Who are you playing?'; $('live-room-line').textContent = 'Pick a way to bring someone to the table.'; $('live-room-seats').hidden = true; $('live-room-bracket').hidden = true; roomCode.readOnly = false; roomCode.value = ''; $('live-room-status').textContent = ''; document.querySelector('[data-action="live-room-ready"]').hidden = true; document.querySelector('[data-action="live-room-copy"]').hidden = true; document.querySelector('[data-action="live-room-copy-code"]').hidden = true; resetPaths(); setBusy(false); },
    choosePath,
    backToPaths() { search.reset(); resetPaths(); roomCode.value = ''; roomCode.readOnly = false; joinButton.disabled = true; $('live-room-title').textContent = 'Who are you playing?'; $('live-room-line').textContent = 'Pick a way to bring someone to the table.'; $('live-room-status').textContent = ''; pathCards[0]?.focus({ preventScroll: true }); },
    async open(id) { this.show(); const saved = savedLiveRoomSeat(id); if (saved) { try { open(await resumeLiveRoom(api, id)); return; } catch (error) { if (![403, 404].includes(error.status)) { status('Could not reconnect. Reopen your invite to retry.'); return; } forgetLiveRoomSeat(id); } } choosePath('friend'); $('live-room-code').value = id; return this.join(); },
    async create() { setBusy(true); status('Creating your room…'); try { const result = await createPreviewAwareRoom(api, { levelId: currentLevel.id, homeName: $('live-room-name').value, mode: $('live-room-format').value }); open(result); status(`Room created. Your code is ${result.id}. Send the invite.`); } catch (error) { console.error('Live room create failed', error); setBusy(false); status('Could not create a room. Check your connection.'); } },
    async join() { const id = roomCode.value.trim(); if (!id) return status('Paste a room code first.'); setBusy(true); status('Joining room…'); try { if (savedLiveRoomSeat(id)) { open(await resumeLiveRoom(api, id)); return; } open({ ...(await joinLiveRoom(api, id, $('live-room-name').value)), id }); status('You joined. Ready up when you are set.'); } catch (error) { setBusy(false); status(error.status === 410 || error.status === 404 ? 'That room has ended or expired. Ask for a fresh invite.' : error.status === 409 ? 'That room is full or already playing. Ask for a fresh invite.' : 'Could not join that room. Check the code and your connection.'); } },
    async ready() { const room = await readLiveRoom(api, roomId); const next = !room.room.seats[seat].ready; await setLiveRoomReady(api, roomId, seat, next); render((await readLiveRoom(api, roomId)).room); },
    async copy() {
      const message = `Join my KONK! ${$('live-room-bracket').hidden ? 'live match' : 'four-player knockout'} at ${currentLevel.name}. Choose your name and ready up: ${invite}`;
      try {
        if (navigator.share) { await navigator.share({ title: 'Join my KONK! table', text: message, url: invite }); return; }
        await navigator.clipboard.writeText(`${message} ${invite}`);
        status('Invite link copied. Send it to your friend.');
      } catch (error) { if (error?.name !== 'AbortError') status('Could not share the invite. Try Copy code.'); }
    },
    async copyCode() {
      try { await navigator.clipboard.writeText(roomId); status(`Room code ${roomId} copied.`); }
      catch { status(`Room code: ${roomId}`); }
    },
    async back() { if (!await search.cancel()) return;
      if (publicPair && roomId && !started) {
        try { await leavePublicLiveRoom(api, roomId); publicPair = false; }
        catch { status('Could not leave yet. Check your connection and try again.'); return; }
      }
      await voice.leave(); clearTimeout(nameTimer); clearInterval(timer); socket?.close(); socket = null; roomId = null; seat = null; markRoomLocation(null); showTitle(); },
  };
}
