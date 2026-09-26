// The kids watching the table, heard rather than seen: short CC0 recordings of children cheering and groaning
// (craigsmith on Freesound, public domain; see AGENTS.md for the binary-asset exception). Fetched and decoded
// once, after the first tap unlocks audio, and played through the effects bus so mute, Sound effects Off and
// pause all apply. Two cheers alternate at random so goals do not always sound the same.
const CLIPS = {
  cheer: ['assets/audio/kids-cheer-yay.mp3', 'assets/audio/kids-cheer-excited.mp3'],
  aww: ['assets/audio/kids-aww-near-miss.mp3'],
  win: ['assets/audio/kids-win-cheer.mp3'],
};
const LEVEL = { cheer: 0.55, aww: 0.45, win: 0.6 }; // under the whistle and the net, over the ambience
const MIN_GAP_MS = 900; // a goal right after a near miss must not stack two crowds

export class KidsCrowdReactions {
  constructor(fetchBytes = (url) => fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(url))))) {
    this.fetchBytes = fetchBytes;
    this.buffers = {};
    this.loading = null;
    this.lastAt = 0;
  }

  /** Start loading once the board has a context; failures just leave the kids quiet. */
  load(ctx) {
    if (this.loading || !ctx) return this.loading;
    this.loading = Promise.all(Object.entries(CLIPS).map(async ([kind, urls]) => {
      this.buffers[kind] = (await Promise.all(urls.map(async (url) => {
        try { return await ctx.decodeAudioData(await this.fetchBytes(url)); } catch { return null; }
      }))).filter(Boolean);
    }));
    return this.loading;
  }

  /** @param board the sound board (ctx, master, available()) @param kind 'cheer' | 'aww' | 'win' */
  play(board, kind, now = performance.now()) {
    const choices = this.buffers[kind];
    if (!choices?.length || !board.available?.() || now - this.lastAt < MIN_GAP_MS) return false;
    this.lastAt = now;
    const source = board.ctx.createBufferSource();
    const gain = board.ctx.createGain();
    source.buffer = choices[Math.floor(Math.random() * choices.length)];
    gain.gain.value = LEVEL[kind];
    source.connect(gain).connect(board.master);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start();
    return true;
  }
}
