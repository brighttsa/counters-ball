// Count bytes while reading, rather than allocating an attacker-sized body first.
export async function readBoundedText(request, maxBytes) {
  const length = request.headers.get('Content-Length');
  if (length && /^\d+$/.test(length) && Number(length) > maxBytes) return null;
  if (!request.body) return '';
  const reader = request.body.getReader(), decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}
