// Kwame's Corner: a solo practice table on the Schoolyard where Kwame walks a new player through
// flicking, power, a target, a bank shot and the camera views. Only the away keeper stands on the table;
// it never flicks (awayFlickLimit 0) and the allowances are high enough that the lessons, not the rules,
// decide when practice ends. See kwame-corner-practice-lesson-steps.js for the lessons.
import { CAMPAIGN_LEVELS } from './campaign-level-definitions.js';

const SCHOOLYARD = CAMPAIGN_LEVELS[0];

export const KWAME_CORNER_TABLE = {
  ...SCHOOLYARD,
  id: 'kwame-corner-practice',
  practice: true,
  name: "Kwame's Corner",
  blurb: 'Kwame shows you how the street plays.',
  introLines: ['Six short lessons · about two minutes'],
  rules: { goalsToWin: 99, flickLimit: 99, awayFlickLimit: 0, threeStarFlicks: 99 },
  awaySlots: [0],
  ballStart: [0, 0],
  opponent: { ...SCHOOLYARD.opponent, difficulty: 'rookie' },
};
