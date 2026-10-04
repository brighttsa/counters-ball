import {searchRanked,loadRankedTicket,saveRankedTicket} from '../core/ranked-community-transport.js';
export function rankedSearchEntry(){
  if(new URLSearchParams(globalThis.location?.search).get('ranked')!=='1')return {};
  return {requestSearch:searchRanked,loadTicket:loadRankedTicket,saveTicket:saveRankedTicket,pollMs:4000};
}
export function decorateRankedLobby(options){
  if(!options.requestSearch)return;
  document.getElementById('ranked-standings-link').hidden=false;
  document.getElementById('live-room-title').textContent='Play ranked';
  document.getElementById('live-room-line').textContent='Skill-based matchmaking. 60-second turns; 90-second reconnect grace. Saved KONKER profiles only.';
  document.getElementById('live-room-code').closest('label').hidden=true;
  document.getElementById('live-room-format-field').hidden=true;
  for(const action of ['live-room-create','live-room-join'])document.querySelector(`[data-action="${action}"]`).hidden=true;
}
