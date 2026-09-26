const HOME_GOALS = ['That one was yours.', 'In it goes.', 'Right through.', 'That shot paid off.'];
const AWAY_GOALS = [(kid) => `${kid} answers.`, (kid) => `${kid} found the gap.`];

export function ordinaryGoalDetail({ scorer, kid, names, versus, goalNumber }) {
  if (versus) return `${names[scorer]} takes the goal.`;
  return scorer === 'home' ? HOME_GOALS[(goalNumber - 1) % HOME_GOALS.length]
    : AWAY_GOALS[(goalNumber - 1) % AWAY_GOALS.length](kid);
}

export const MATCH_COPY = Object.freeze({
  soloTurn: 'Your flick',
  handover: 'Pass it over',
  fullTime: 'Full time',
  goldenDetail: 'One each. Next goal wins.',
  extraDetail: 'Still level. Two flicks each.',
});
