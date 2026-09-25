import { encodeFriendInvite } from '../core/friend-match-invite-links.js';

const venueOf = (level) => (level.legend ? `${level.name}, Act ${level.legend.act}` : level.name);

export function buildFriendInvite(level, mode, baseUrl) {
  const url = `${baseUrl}${encodeFriendInvite({ levelId: level.id, mode })}`;
  return {
    url,
    text: `I saved you a table at ${venueOf(level)} in KONK!. Play it, send your mark back, and let's settle this.`,
  };
}

// iMessage only builds a rich link preview when the message is the link alone, so Apple devices share and
// copy the bare link; elsewhere (WhatsApp, Telegram…) the line of text rides along above the preview.
export function prefersBareLinks(nav = globalThis.navigator) {
  const ua = nav?.userAgent ?? '';
  return /iPhone|iPad|iPod|Macintosh/.test(ua) && !/Android/.test(ua);
}

export class FriendMatchInviteShare {
  constructor(statusEl, copy = { shared: 'Invite shared.', copied: 'Invite copied. Send it before your friend starts talking.' }) {
    this.status = statusEl;
    this.copyText = copy;
    this.pending = null;
  }

  prepare(invite) {
    this.pending = invite;
    this.report('');
  }

  async share() {
    if (!this.pending) return;
    const { text, url } = this.pending;
    try {
      if (navigator.share) {
        await navigator.share(prefersBareLinks() ? { url } : { text, url });
        this.report(this.copyText.shared);
      } else await this.copy();
    } catch (error) {
      if (error?.name !== 'AbortError') await this.copy();
    }
  }

  async copy() {
    if (!this.pending) return;
    const message = prefersBareLinks() ? this.pending.url : `${this.pending.text} ${this.pending.url}`;
    try {
      await navigator.clipboard.writeText(message);
      this.report(this.copyText.copied);
    } catch {
      this.report(`Send this link: ${this.pending.url}`);
    }
  }

  report(text) { if (this.status) this.status.textContent = text; }
}
