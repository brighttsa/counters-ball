// Occasional procedural sounds per venue: a bird at the veranda, a distant horn
// on the roadside, crickets at night. Each event is a short Web Audio recipe
// fired at random intervals, so the ambience bed feels alive rather than static.
import { AMBIENT_RECIPES } from './venue-ambient-sound-recipes-web-audio.js';

const VENUE_EVENTS = {
  schoolyard: [
    { recipe: 'distantBounce', minGap: 6, maxGap: 18, gain: 0.025 },
    { recipe: 'birdChirp', minGap: 8, maxGap: 25, gain: 0.018 },
  ],
  kiosk: [
    { recipe: 'distantHorn', minGap: 12, maxGap: 35, gain: 0.02 },
    { recipe: 'metalClatter', minGap: 10, maxGap: 28, gain: 0.015 },
  ],
  veranda: [
    { recipe: 'birdChirp', minGap: 5, maxGap: 14, gain: 0.022 },
    { recipe: 'distantDog', minGap: 15, maxGap: 40, gain: 0.015 },
    { recipe: 'windGust', minGap: 8, maxGap: 22, gain: 0.018 },
  ],
  roadside: [
    { recipe: 'carPass', minGap: 8, maxGap: 20, gain: 0.03 },
    { recipe: 'distantHorn', minGap: 10, maxGap: 30, gain: 0.025 },
  ],
  harmattan: [
    { recipe: 'dryRustle', minGap: 4, maxGap: 12, gain: 0.02 },
    { recipe: 'metalClatter', minGap: 14, maxGap: 35, gain: 0.012 },
  ],
  night: [
    { recipe: 'crickets', minGap: 3, maxGap: 8, gain: 0.016 },
    { recipe: 'distantDog', minGap: 18, maxGap: 50, gain: 0.012 },
    { recipe: 'nightInsect', minGap: 6, maxGap: 16, gain: 0.014 },
  ],
};

export class VenueAmbientEventScheduler {
  constructor() {
    this.ctx = null;
    this.dest = null;
    this.timers = new Set();
    this.venue = null;
    this.paused = false;
  }

  attach(ctx, dest) {
    this.ctx = ctx;
    this.dest = dest;
    if (this.venue) this.schedule(this.venue);
  }

  set(venue) {
    this.stop();
    this.venue = venue;
    if (this.ctx && venue) this.schedule(venue);
  }

  schedule(venue) {
    const events = VENUE_EVENTS[venue];
    if (!events) return;
    for (const event of events) {
      this.scheduleOne(event);
    }
  }

  scheduleOne(event) {
    const delay = (event.minGap + Math.random() * (event.maxGap - event.minGap)) * 1000;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.paused || !this.ctx) return;
      const recipe = AMBIENT_RECIPES[event.recipe];
      if (recipe) recipe(this.ctx, this.dest, event.gain);
      this.scheduleOne(event);
    }, delay);
    this.timers.add(timer);
  }

  setPaused(paused) {
    this.paused = paused;
  }

  stop() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  dispose() {
    this.stop();
    this.ctx = null;
    this.dest = null;
  }
}
