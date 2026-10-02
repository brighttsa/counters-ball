import { createMatchTransitionController } from '../core/match-transition-controller.js';

export function createMatchTransitionStatus(app, onCancel, onError) {
  const dialog = document.createElement('dialog');
  dialog.className = 'match-transition-status';
  dialog.setAttribute('aria-labelledby', 'match-transition-title');
  dialog.innerHTML = '<p id="match-transition-title" role="status">Setting the table</p><button type="button">Cancel</button>';
  document.body.append(dialog);
  const controller = createMatchTransitionController({ app,
    show: () => { if (!dialog.open) dialog.showModal(); },
    hide: () => { if (dialog.open) dialog.close(); }, onError });
  const cancel = () => { controller.cancel(); onCancel(); };
  dialog.querySelector('button').addEventListener('click', cancel);
  dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
  return controller;
}
