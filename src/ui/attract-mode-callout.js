// The title screen's AI match stays silent except for goals: a short chalk callout ("GOAL! … · 2-1")
// makes the table behind the menu feel inhabited without competing with the buttons.
// It shows only while the title screen is on top: the same match keeps playing behind other menus.
const CALLOUT_MS = 2800;
const EXIT_MS = 300;

export class AttractModeCallout {
  constructor(el = document.getElementById('attract-callout'),
    isTitleShowing = () => document.querySelector('.screen-title')?.checkVisibility?.() ?? true) {
    this.el = el;
    this.isTitleShowing = isTitleShowing;
    this.scores = null;
    this.timer = null;
    this.exitTimer = null;
  }

  setScore(scores) {
    this.scores = { ...scores };
  }

  goal(detail) {
    if (!this.el || !this.isTitleShowing()) return;
    const score = this.scores && !/\d+-\d+/.test(detail) ? ` · ${this.scores.home}-${this.scores.away}` : '';
    this.el.textContent = `GOAL! ${detail}${score}`;
    clearTimeout(this.timer);
    clearTimeout(this.exitTimer);
    this.el.classList.remove('attract-callout-exit');
    this.el.hidden = false;
    this.timer = setTimeout(() => {
      this.el.classList.add('attract-callout-exit');
      this.exitTimer = setTimeout(() => this.hide(), EXIT_MS);
    }, CALLOUT_MS);
  }

  hide() {
    clearTimeout(this.timer);
    clearTimeout(this.exitTimer);
    if (!this.el) return;
    this.el.hidden = true;
    this.el.classList.remove('attract-callout-exit');
  }
}

/** A HUD for the attract match: goals and scores reach the callout, every other HUD call is ignored. */
export function createAttractHud(callout) {
  return new Proxy({}, {
    get(_, prop) {
      if (prop === 'goal') return (detail) => callout.goal(detail);
      if (prop === 'setScore') return (scores) => callout.setScore(scores);
      return () => {};
    },
  });
}
