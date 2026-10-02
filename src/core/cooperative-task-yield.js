// rAF alone runs before paint; continue in a task after the frame has been presented.
export function yieldAfterPaint() {
  return new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

export async function consumeBuildSteps(iterator, { signal, yieldTask = yieldAfterPaint } = {}) {
  try {
    await yieldTask();
    while (true) {
      if (signal?.aborted) throw new DOMException('Build cancelled', 'AbortError');
      const next = iterator.next();
      if (next.done) return next.value;
      await yieldTask();
    }
  } catch (error) {
    iterator.return();
    throw error;
  }
}
