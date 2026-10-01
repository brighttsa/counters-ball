// Keep the identical completed turn until the server acknowledges it.
export function createLiveMatchTurnOutbox({ send, onSent, onRetry, onError, delay = 1500 }) {
  let closed = false;
  let timer = null;
  const attempt = async (letter) => {
    if (closed) return;
    try {
      await send(letter);
      if (!closed) onSent(letter);
    } catch (error) {
      if (closed) return;
      if (error.status && error.status < 500 && error.status !== 429) return onError(error);
      onRetry();
      timer = setTimeout(() => attempt(letter), delay);
    }
  };
  return { send: attempt, close() { closed = true; clearTimeout(timer); } };
}
