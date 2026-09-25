// Friend Match Lite invites: no backend yet, just a private link to the same
// table. The result share after full time becomes the reply challenge.
const MODES = new Set(['campaign', 'legends']);
const LEVEL_ID = /^[a-z0-9-]{1,48}$/;
export const FRIEND_INVITE_PARAMS = ['friend', 'fm'];

export function encodeFriendInvite({ levelId, mode }) {
  return `?${new URLSearchParams({ friend: levelId, fm: mode })}`;
}

export function decodeFriendInvite(search) {
  const params = new URLSearchParams(search);
  const levelId = params.get('friend');
  const mode = params.get('fm');
  if (!levelId || !LEVEL_ID.test(levelId) || !MODES.has(mode)) return null;
  return { levelId, mode };
}

export function stripFriendInviteParams(href) {
  const url = new URL(href);
  for (const key of FRIEND_INVITE_PARAMS) url.searchParams.delete(key);
  return url.toString();
}

export function friendInviteLine(level) {
  const table = level.legend ? `${level.name}, Act ${level.legend.act}` : level.name;
  return `Your friend called you to ${table}. Play it, share your full-time mark, and make them answer.`;
}
