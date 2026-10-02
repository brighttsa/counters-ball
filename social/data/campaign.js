import { featurePosters } from './feature-campaign.js';
export const formats = {
  portrait: { label: 'Instagram portrait', width: 1080, height: 1350 },
  square: { label: 'Instagram square', width: 1080, height: 1080 },
  landscape: { label: 'X landscape', width: 1600, height: 900 },
  story: { label: 'Story / Reel', width: 1080, height: 1920 },
};
export const palettes = {
  paper: { background: '#faf5e2', ink: '#101411', accent: '#c83d30' },
  ink: { background: '#101411', ink: '#faf5e2', accent: '#f5d84a' },
  red: { background: '#c83d30', ink: '#faf5e2', accent: '#f5d84a' },
  yellow: { background: '#f5d84a', ink: '#101411', accent: '#c83d30' },
};
export const venues = { schoolyard: 'Schoolyard Break', kiosk: 'Kiosk Corner', veranda: "Auntie Ama’s veranda", jamestown: 'Jamestown', 'street-legends': 'Tema Street Legends' };
export const captions = {
  twi: `YƐ KONKI! 🇬🇭🔥\n\nWo nim counters ball?\nThen you already know the feeling.\n\nOne cap.\nOne perfect angle.\nOne clean KONK!\n\nKONKERS, mo ayɛ ready? 👀\n\n🎮 konk.world\n\n#YɛKonki #KONKERS #CountersBall`,
  community: `WE ARE KONKERS. 🇬🇭\n\nWe flick.\nWe compete.\nWe talk plenty when we score.\nThen we run it back.\n\nFrom the classrooms and streets we grew up on to screens around the world.\n\nThis is our game.\nThis is our table.\n\nYƐ KONKI! 🔴🟡🟢\n\nkonk.world\n\n#YɛKonki #KONKERS #CountersBall`,
  origin: `Born in Ghana. 🇬🇭\nPlayed by KONKERS everywhere. 🌍\n\nWe’re taking counters ball beyond the places we grew up playing it.\n\nOne flick at a time.\n\nYƐ KONKI!\n\n#KONKERS #YɛKonki #CountersBall`,
  engagement: `KONKERS, roll call! 🇬🇭\n\nWhere are you playing KONK! from?\n\nDrop your city + your best score.\n\nLet’s see how far the table has reached. 🌍\n\nYƐ KONKI!`,
  challenge: `Every KONKER thinks they can flick.\n\nUntil another KONKER sits across the table. 👀\n\nTag the person you know you can beat.\n\nYƐ KONKI!`,
  score: `KONKERS, receipts or it didn’t happen. 👀\n\nDrop your best KONK! score.\n\nScreenshots encouraged.\nTrash talk permitted.\n\nYƐ KONKI!`,
  nostalgia: `Before touchscreens, we had bottle caps.\n\nBefore online multiplayer, we had whoever was sitting across from us.\n\nBefore KONK!, we had counters ball. 🇬🇭\n\nSome games never really leave you.\n\nYƐ KONKI!`,
};
const poster = (id, title, layout, palette, headline, subheadline, extra = {}) => ({
  id, title, layout, palette, headline, subheadline, eyebrow: 'KONK! / BOTTLE-CAP FOOTBALL',
  signature: 'YƐ KONKI!', cta: 'konk.world', venue: 'veranda', logoPosition: 'top-right',
  decoration: true, caption: captions.community, group: 'Campaign', ...extra,
});
export const posters = [
  poster('01-community', 'We Are Konkers', 'community', 'paper', 'WE ARE\nKONKERS.', 'Born in Ghana. Played everywhere.', { signature: 'YƐ KONKI! 🔥', motion: true }),
  poster('02-ye-konki', 'YƐ Konki!', 'slogan', 'red', 'YƐ\nKONKI!', 'IF YOU KNOW,\nYOU KNOW. 🇬🇭', { motion: true }),
  poster('03-challenge', 'The Challenge', 'gameplay', 'ink', 'YOU CALL\nTHAT A FLICK?', 'PROVE IT.', { venue: 'schoolyard', caption: captions.challenge }),
  poster('04-from-ghana', 'From Ghana', 'origin', 'ink', 'BORN\nIN GHANA.', 'BUILT\nTO TRAVEL.\n🇬🇭 → 🌍', { venue: 'kiosk', caption: captions.origin }),
  poster('05-run-it-back', 'Run It Back', 'duel', 'yellow', 'KONKERS\nDON’T QUIT.', 'WE RUN\nIT BACK.', { caption: captions.challenge }),
  poster('06-nostalgia', 'Bottle Caps. Paper Ball.', 'objects', 'paper', 'BOTTLE CAPS.\nPAPER BALL.', 'NO EXPLANATION\nNEEDED. 🇬🇭', { caption: captions.nostalgia }),
  poster('07-welcome', 'Welcome to the Table', 'welcome', 'ink', 'ONE GAME\nAND YOU’RE\nA KONKER.', 'WELCOME\nTO THE TABLE.'),
  poster('08-versus', 'Two Konkers', 'duel', 'paper', 'TWO KONKERS.\nONE TABLE.', 'WHO DEY WIN? 👀', { caption: captions.challenge }),
  poster('09-score-flex', 'Score Flex', 'receipt', 'ink', 'NO SCREENSHOT?\nIT DIDN’T\nHAPPEN. 👀', 'KONKERS,\nSHOW YOUR SCORE.', { caption: captions.score }),
  poster('10-movement', 'Our Game. Our Turn.', 'movement', 'paper', 'OUR GAME.\nOUR CULTURE.\nOUR TURN.', '🇬🇭', { motion: true, caption: captions.origin }),
  poster('11-week', 'Konker of the Week', 'gameplay', 'yellow', 'YOUR MOMENT.\nOUR TABLE.', 'KONKER OF THE WEEK', { eyebrow: 'COMMUNITY / KONKER OF THE WEEK', group: 'Series' }),
  poster('12-weekly-challenge', 'Konker Challenge', 'gameplay', 'ink', 'ONE FLICK.\nMAKE IT COUNT.', 'KONKER CHALLENGE', { eyebrow: 'WEEKLY / KONKER CHALLENGE', group: 'Series', caption: captions.challenge }),
  poster('13-roll-call', 'Konker Roll Call', 'slogan', 'yellow', 'WHERE YOU\nDEY PLAY?', 'DROP YOUR CITY.\nKONKER ROLL CALL.', { eyebrow: 'COMMUNITY / ROLL CALL', group: 'Series', caption: captions.engagement }),
  poster('14-memories', 'Konker Memories', 'objects', 'paper', 'WHO WAS\nAT YOUR TABLE?', 'KONKER MEMORIES', { eyebrow: 'COMMUNITY / MEMORIES', group: 'Series', caption: captions.nostalgia }),
  poster('15-culture', 'YƐ Konki! Culture', 'slogan', 'red', 'YƐ\nKONKI!', 'THE TABLE HAS STORIES.', { eyebrow: 'CULTURE / YƐ KONKI!', group: 'Series' }),
  poster('16-score-card', 'Score Card', 'score', 'paper', 'THE RECEIPTS.', 'RUN IT BACK.', { eyebrow: 'KONK! / FULL TIME', group: 'Series', homeName: 'HOME', awayName: 'AWAY', homeScore: '03', awayScore: '01', caption: captions.score }),
  poster('17-friend-versus', 'Versus Challenge', 'duel', 'red', 'YOU. ME.\nTHE TABLE.', 'SETTLE IT WITH A FLICK.', { eyebrow: 'KONK! / VERSUS', group: 'Series', caption: captions.challenge }),
  poster('18-street-legends', 'Street Legends', 'gameplay', 'ink', 'STREET\nLEGENDS.', 'SMALL TABLE. BIG REPUTATION.', { eyebrow: 'THE CHALLENGE / STREET LEGENDS', venue: 'street-legends', group: 'Series' }),
  poster('19-twi-first', 'YƐ KONKI! / Twi First', 'twi-first', 'paper', 'YƐ KONKI!', 'ONE CAP.\nONE PERFECT ANGLE.\nONE CLEAN KONK!', { eyebrow: 'THE TABLE IS OURS. 🇬🇭', question: 'Wo nim counters ball?', closing: 'KONKERS, mo ayɛ ready?', caption: captions.twi, venue: 'kiosk', group: 'Community', motion: true, motionDuration: 6, motionFormats: ['portrait', 'story'] }),
  ...featurePosters,
];
