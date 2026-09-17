// Shared world dimensions so physics, markings, meshes and AI always agree.
export const PITCH_HALF_LENGTH = 1.5;   // chalk goal line, along x
export const PITCH_HALF_WIDTH = 1.0;    // chalk touch line, along z

export const TABLE_HALF_LENGTH = 2.2;   // table sheet extents
export const TABLE_HALF_WIDTH = 1.6;

export const WALL_HALF_LENGTH = 1.62;   // wooden batten rim (physics bounce bounds)
export const WALL_HALF_WIDTH = 1.12;

export const GOAL_HALF_WIDTH = 0.26;    // half opening between matchstick posts
export const GOAL_LINE_X = PITCH_HALF_LENGTH;

export const CAP_RADIUS = 0.085;
export const CAP_HEIGHT = 0.024;
export const BALL_RADIUS = 0.035;

export const MAX_FLICK_SPEED = 3.4;     // world units / second at full pull
export const MAX_PULL = 0.85;           // world units of drag for full power

// Sides, not colours: home always attacks +x, away attacks -x.
export const SIDE_HOME = 'home';
export const SIDE_AWAY = 'away';
export const attackDirection = (side) => (side === SIDE_HOME ? 1 : -1);
export const otherSide = (side) => (side === SIDE_HOME ? SIDE_AWAY : SIDE_HOME);

// Kickoff formation for the home side (negative x); mirrored for away.
export const TEAM_FORMATION = [
  [-1.32, 0.0],   // keeper on the goal line
  [-0.88, -0.5],
  [-0.88, 0.5],
  [-0.42, -0.26],
  [-0.42, 0.26],
];
