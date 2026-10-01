import { accessKonkerProfile, savedKonkerProfile, parseProfileRecoveryCode, newKonkerProfileCredentials, storeKonkerProfile } from '../core/konker-profile-transport.js';
export function wireKonkerProfileControls(api) {
  const input = document.getElementById('live-room-name'), status = document.getElementById('konker-profile-status');
  const save = document.getElementById('konker-profile-save'), restore = document.getElementById('konker-profile-restore');
  const exportButton = document.getElementById('konker-profile-export'), code = document.getElementById('konker-profile-code');
  let profile = savedKonkerProfile(), pending = null;
  if (profile) input.value = profile.name;
  const render = () => { exportButton.hidden = !profile; save.textContent = profile ? 'Save profile name' : 'Create KONKER profile';
    status.textContent = profile ? `Profile: ${profile.name}` : ''; };
  render();
  const act = async task => {
    save.disabled = restore.disabled = true;
    try { profile = await task(); storeKonkerProfile(profile); input.value = profile.name; code.value = ''; render(); }
    catch (error) { status.textContent = error.message; }
    finally { save.disabled = restore.disabled = false; }
  };
  save.onclick = () => act(() => accessKonkerProfile(api, profile ?? (pending ??= newKonkerProfileCredentials()), input.value));
  restore.onclick = () => act(() => {
    const credentials = parseProfileRecoveryCode(code.value); if (!credentials) throw Error('Enter your complete recovery code.');
    return accessKonkerProfile(api, credentials);
  });
  exportButton.onclick = () => {
    if (!profile) return;
    const text = `KONK! profile recovery code\nKeep this private. Anyone with this code can access your profile.\n\n${profile.id}.${profile.secret}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' })), link = document.createElement('a');
    link.href = url; link.download = 'KONK-private-profile-recovery.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
}
