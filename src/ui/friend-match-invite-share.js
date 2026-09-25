import { encodeFriendInvite } from '../core/friend-match-invite-links.js';

const venueOf = (level) => (level.legend ? `${level.name}, Act ${level.legend.act}` : level.name);

export function buildFriendInvite(level, mode, baseUrl) {
  const url = `${baseUrl}${encodeFriendInvite({ levelId: level.id, mode })}`;
  return {
    url,
    text: `I saved you a table at ${venueOf(level)} in KONK!. Play it, send your mark back, and let's settle this.`,
  };
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
        await navigator.share({ text, url });
        this.report(this.copyText.shared);
      } else await this.copy();
    } catch (error) {
      if (error?.name !== 'AbortError') await this.copy();
    }
  }

  async copy() {
    if (!this.pending) return;
    const message = `${this.pending.text} ${this.pending.url}`;
    try {
      await navigator.clipboard.writeText(message);
      this.report(this.copyText.copied);
    } catch {
      this.report(`Send this link: ${this.pending.url}`);
    }
  }

  report(text) { if (this.status) this.status.textContent = text; }
}
