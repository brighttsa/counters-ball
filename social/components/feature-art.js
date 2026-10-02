const node = (tag, name, text) => {
  const element = document.createElement(tag); element.className = name;
  if (text !== undefined) element.textContent = text;
  return element;
};
const cap = (name, asset) => {
  const image = node('img', `cap ${name}`); image.src = `/social/assets/cap-${asset}.png`;
  image.alt = ''; return image;
};
export function buildFeatureArt(config, art, photo) {
  if (config.feature === 'special') {
    art.append(photo, cap('first', 'red')); return;
  }
  if (config.feature === 'knockout') {
    const bracket = node('div', 'knockout-bracket');
    ['red', 'rival', 'gold', 'red'].forEach((asset, i) => bracket.append(cap(`seed seed-${i}`, asset)));
    bracket.append(node('div', 'bracket-path path-left'), node('div', 'bracket-path path-right'),
      cap('champion', 'gold'), node('span', 'bracket-caption', 'SEMI-FINALS → FINAL'));
    art.append(bracket); return;
  }
  if (config.feature === 'profile') {
    art.append(cap('first', 'gold'), node('div', 'identity-stamp', 'KONKER.'));
    return;
  }
  art.append(cap('first', 'red'), cap('second', 'rival'));
  if (config.feature === 'invite') art.append(node('div', 'invite-path'), node('span', 'art-label', 'YOUR TABLE. THEIR NEXT MATCH.'));
  if (config.feature === 'rival') art.append(node('strong', 'versus-mark', 'VS'));
  if (config.feature === 'voice') art.append(node('div', 'voice-quote', '“Chale, see goal!”'), node('div', 'voice-response', '“You dey talk plenty.”'));
}
