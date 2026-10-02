const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const platforms = new Set(['ios', 'android']);
const clean = (value, limit) => typeof value === 'string'
  ? value.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, limit) : '';
export function validateInterest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Please check your submission.' };
  if (body.website) return { ignored: true };
  const email = clean(body.email, 255).toLowerCase();
  if (typeof body.email === 'string' && body.email.trim().length > 254) return { error: 'Email address is too long.' };
  if (body.kind === 'waitlist') {
    if (!emailPattern.test(email)) return { error: 'Enter a valid email address.' };
    if (body.consent !== true) return { error: 'Please agree to receive launch updates.' };
    if (!Array.isArray(body.platforms) || !body.platforms.length || body.platforms.length > 2
      || body.platforms.some(platform => !platforms.has(platform))) return { error: 'Choose iOS, Android, or both.' };
    return { value: { kind: 'waitlist', email, platforms: [...new Set(body.platforms)], name: clean(body.name, 60), consent: true } };
  }
  if (body.kind === 'feedback') {
    const message = clean(body.message, 3001);
    if (message.length < 10 || message.length > 3000) return { error: 'Write between 10 and 3,000 characters.' };
    if (!['web', 'ios', 'android'].includes(body.platform)) return { error: 'Choose where you played.' };
    if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) return { error: 'Choose your experience rating.' };
    if (email && (!emailPattern.test(email) || body.replyConsent !== true)) return { error: 'Check your email and agree to a feedback reply, or leave it blank.' };
    return { value: { kind: 'feedback', message, platform: body.platform, rating: body.rating,
      email, replyConsent: Boolean(email), device: clean(body.device, 100), category: ['idea', 'bug', 'experience'].includes(body.category) ? body.category : 'experience' } };
  }
  return { error: 'Unknown submission type.' };
}

export function csvCell(value) {
  const text = String(value ?? '');
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
