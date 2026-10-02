import { DurableObject } from 'cloudflare:workers';
import { saveInterest, exportInterest, expireInterest } from './community-interest-service.js';

export class KonkCommunity extends DurableObject {
  fetch(request) {
    return this.ctx.blockConcurrencyWhile(async () => {
      const url = new URL(request.url);
      if (url.pathname === '/export') return exportInterest(this.ctx, url.searchParams.get('kind'));
      return saveInterest(this.ctx, await request.json(), request.headers.get('X-Interest-Client'));
    });
  }
  alarm() { return this.ctx.blockConcurrencyWhile(() => expireInterest(this.ctx)); }
}
