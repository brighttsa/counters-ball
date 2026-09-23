// The home screen features the Street Legends act the player is most likely to
// want next: the act after the one they last won at that venue, otherwise the
// act they last played. With no history, the Roadside opener (or Act 2 once won).
export const FIRST_VISIT_ACT_ID = 'legends-roadside-act-1';

// Short venue words for the home button ("Play Jamestown", not "Play Lights").
const VENUE_SHORT_NAME = {
  schoolyard: 'Schoolyard', kiosk: 'Kiosk', veranda: 'Veranda',
  roadside: 'Roadside', harmattan: 'Harmattan', night: 'Jamestown',
};

export function pickFeaturedLegendAct(acts, progress) {
  const played = acts.findIndex((act) => act.id === progress?.lastLegendAct);
  const last = played >= 0 ? played : Math.max(0, acts.findIndex((act) => act.id === FIRST_VISIT_ACT_ID));
  const next = acts[last + 1];
  const wonLast = (progress.stars?.[acts[last].id] ?? 0) >= 1;
  return wonLast && next && next.legend.venue === acts[last].legend.venue ? last + 1 : last;
}

export function featuredActCopy(level) {
  return {
    kicker: `ACT ${level.legend.act} / ${level.legend.acts}`,
    venue: level.name,
    actTitle: level.actTitle,
    button: `Play ${VENUE_SHORT_NAME[level.backdrop] ?? level.name}`,
  };
}
