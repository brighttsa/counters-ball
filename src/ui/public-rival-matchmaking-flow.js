import { loadSearchTicket, saveSearchTicket, newSearchTicket, searchForRival } from '../core/public-rival-matchmaking-transport.js';

export function createPublicRivalSearch({ api, status, busy, matched, name }) {
  let ticket = null, timer = null, generation = 0;
  const find = document.getElementById('find-rival');
  const cancel = document.getElementById('cancel-rival-search');
  const controls = (searching) => {
    find.hidden = searching; cancel.hidden = !searching;
    busy(searching);
  };
  const finish = (result) => {
    clearTimeout(timer); ticket = null; saveSearchTicket(null); controls(false);
    if (result.state === 'matched') matched(result);
    else status(result.state === 'expired' ? 'Search expired. Find a rival to try again.' : 'Search cancelled.');
  };
  const request = async (action, version) => {
    try {
      const result = await searchForRival(api, { action, ticket, name: name() });
      if (version !== generation) return;
      if (result.state !== 'waiting') return finish(result);
      status('Finding a rival… Waiting for another player.');
      timer = setTimeout(() => request('poll', version), 2500);
    } catch (error) {
      if (version !== generation) return;
      if (error.status === 429 || error.status === 400) {
        clearTimeout(timer); ticket = null; saveSearchTicket(null); controls(false);
        return status(error.status === 429 ? 'Matchmaking is busy. Try again shortly.' : 'Search could not start. Try again.');
      }
      status('Connection interrupted. Reconnecting to your search…');
      timer = setTimeout(() => request(action, version), 2500);
    }
  };
  return {
    start() {
      if (ticket) return;
      ticket = loadSearchTicket() ?? newSearchTicket(); saveSearchTicket(ticket);
      controls(true); status('Finding a rival…'); request('join', ++generation);
    },
    async cancel() {
      if (!ticket) return true;
      clearTimeout(timer);
      const version = ++generation;
      cancel.disabled = true; status('Cancelling search…');
      try {
        const result = await searchForRival(api, { action: 'cancel', ticket });
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
