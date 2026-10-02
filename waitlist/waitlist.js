import { interestPayload, submitInterest } from './waitlist-transport.js';
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  }
}
for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs.find(item => item !== tab);
    selectTab(next); next.focus();
  });
}
if (location.hash === '#feedback') selectTab(tabs[1]);
for (const form of document.forms) {
  const kind = form.id === 'waitlist-form' ? 'waitlist' : 'feedback';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]'), status = form.querySelector('.status');
    if (button.disabled) return;
    const original = button.firstChild.textContent;
    try {
      const payload = interestPayload(new FormData(form), kind);
      button.disabled = true; button.firstChild.textContent = 'SENDING '; form.setAttribute('aria-busy', 'true');
      status.dataset.state = ''; status.textContent = 'Saving your submission…';
      await submitInterest(payload);
      form.reset(); status.dataset.state = 'success';
      status.textContent = kind === 'waitlist' ? "You're on the list. We'll email you when your next round is ready."
        : 'Feedback received. Thanks for helping shape the next round.';
    } catch (error) { status.dataset.state = 'error'; status.textContent = error.message; }
    finally { button.disabled = false; button.firstChild.textContent = original; form.removeAttribute('aria-busy'); }
  });
}
