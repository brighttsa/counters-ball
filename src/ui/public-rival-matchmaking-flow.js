import { loadSearchTicket, saveSearchTicket, newSearchTicket, searchForRival } from '../core/public-rival-matchmaking-transport.js';

export function createPublicRivalSearch({ api, status, busy, matched, name,requestSearch=searchForRival,loadTicket=loadSearchTicket,saveTicket=saveSearchTicket,pollMs=2500 }) {
  let ticket = null, timer = null, generation = 0;
  const find = document.getElementById('find-rival');
  const cancel = document.getElementById('cancel-rival-search');
  const controls = (searching) => {
    find.hidden = searching; cancel.hidden = !searching;
    busy(searching);
  };
  const finish = (result) => {
    clearTimeout(timer); ticket = null; saveTicket(null); controls(false);
    if (result.state === 'matched') matched(result);
    else status(result.state === 'expired' ? 'Search expired. Find a rival to try again.' : 'Search cancelled.');
  };
  const request = async (action, version) => {
    try {
      const result = await requestSearch(api, { action, ticket, name: name() });
      if (version !== generation) return;
      if (result.state !== 'waiting') return finish(result);
      status('Finding a rival… Waiting for another player.');
      timer = setTimeout(() => request('poll', version), pollMs);
    } catch (error) {
      if (version !== generation) return;
      if ([400,401,403,409,429].includes(error.status)) {
        clearTimeout(timer); ticket = null; saveTicket(null); controls(false);
        return status(error.message);
      }
      status('Connection interrupted. Reconnecting to your search…');
      timer = setTimeout(() => request(action, version), pollMs);
    }
  };
  return {
    start() {
      if (ticket) return;
      ticket = loadTicket() ?? newSearchTicket(); saveTicket(ticket);
      controls(true); status('Finding a rival…'); request('join', ++generation);
    },
    async cancel() {
      if (!ticket) return true;
      clearTimeout(timer);
      const version = ++generation;
      cancel.disabled = true; status('Cancelling search…');
      try {
        const result = await requestSearch(api, { action: 'cancel', ticket });
        if (version === generation) finish(result);
        return result.state !== 'matched';
      } catch {
        status('Could not cancel yet. Retry cancellation or check your connection.');
        return false;
      } finally { cancel.disabled = false; }
    },
    reset() { find.hidden = false; cancel.hidden = true; },
  };
}
