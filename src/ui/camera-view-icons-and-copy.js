// What each match camera is called, what it is for, its keyboard key, and a small drawn icon of the
// table as that camera sees it: flat from above, side-on, low behind a cap, or orbiting. Shared by the
// camera panel, the Camera button and the view-change toast so they always agree.
const icon = body => `<svg class="camera-view-icon" viewBox="0 0 24 18" aria-hidden="true" focusable="false">${body}</svg>`;

export const CAMERA_VIEWS = {
  tactical: {
    label: 'Tactical', key: '1', purpose: 'Straight down: see the whole table',
    icon: icon('<rect x="3" y="3" width="18" height="12" rx="1"/><path d="M12 3v12"/><circle cx="12" cy="9" r="2.2"/>'),
  },
  broadcast: {
    label: 'Broadcast', key: '2', purpose: 'TV side view: both goals',
    icon: icon('<path d="M6 4h12l4 11H2z"/><path d="M12 4v11"/>'),
  },
  street: {
    label: 'Street Level', key: '3', purpose: 'Low behind your cap',
    icon: icon('<path d="M9 3h6l8 13H1z"/><circle class="camera-view-icon-cap" cx="12" cy="13" r="2.4"/>'),
  },
  free: {
    label: 'Free Camera', key: null, purpose: 'Drag to orbit the table',
    icon: icon('<path d="M8 8h8l3 6H5z"/><path d="M3 7a9 5 0 0 1 18 0" fill="none"/><path d="M19 4.5l2 2.5-3 .8" fill="none"/>'),
  },
};

const fineKeys = () => globalThis.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches ?? false;

/** "Street Level · 3" where there is a keyboard, "Street Level" on touch. */
export const viewName = (mode, withKey = fineKeys()) => {
  const view = CAMERA_VIEWS[mode] ?? CAMERA_VIEWS.broadcast;
  return withKey && view.key ? `${view.label} · ${view.key}` : view.label;
};
