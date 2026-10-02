const initialized = new WeakSet();
const rows = cursor => [...cursor];

export async function publicRivalSearchStorage(ctx) {
  const sql = ctx.storage.sql;
  if (!initialized.has(ctx)) {
    sql.exec('CREATE TABLE IF NOT EXISTS rival_searches (ticket TEXT PRIMARY KEY, state TEXT NOT NULL, name TEXT, joined_at INTEGER, expires_at INTEGER NOT NULL, result TEXT)');
    sql.exec('CREATE INDEX IF NOT EXISTS rival_waiting ON rival_searches(state, joined_at, ticket)');
    sql.exec('CREATE INDEX IF NOT EXISTS rival_expiry ON rival_searches(expires_at)');
    sql.exec('CREATE TABLE IF NOT EXISTS rival_limits (client TEXT PRIMARY KEY, requests INTEGER NOT NULL, joins INTEGER NOT NULL, expires_at INTEGER NOT NULL)');
    sql.exec('CREATE INDEX IF NOT EXISTS rival_limit_expiry ON rival_limits(expires_at)');
    if (!await ctx.storage.get('public-search-indexed')) {
      const searches = await ctx.storage.get('public-searches') ?? {};
      const limits = await ctx.storage.get('public-search-limits') ?? {};
      ctx.storage.transactionSync(() => {
        for (const [ticket, entry] of Object.entries(searches)) {
          sql.exec('INSERT OR IGNORE INTO rival_searches VALUES (?, ?, ?, ?, ?, ?)', ticket,
            entry.state, entry.name ?? null, entry.joinedAt ?? null, entry.expiresAt,
            entry.result ? JSON.stringify(entry.result) : null);
        }
        for (const [client, limit] of Object.entries(limits)) {
          sql.exec('INSERT OR IGNORE INTO rival_limits VALUES (?, ?, ?, ?)', client, limit.requests, limit.joins, limit.until);
        }
      });
      await ctx.storage.put('public-search-indexed', true);
      await ctx.storage.delete(['public-searches', 'public-search-limits']);
    }
    initialized.add(ctx);
  }
  return {
    get(ticket, now) {
      const entry = rows(sql.exec('SELECT * FROM rival_searches WHERE ticket = ? AND expires_at > ?', ticket, now))[0];
      return entry && { state: entry.state, name: entry.name, joinedAt: entry.joined_at,
        expiresAt: entry.expires_at, result: entry.result ? JSON.parse(entry.result) : null };
    },
    put(ticket, entry) {
      sql.exec('INSERT OR REPLACE INTO rival_searches VALUES (?, ?, ?, ?, ?, ?)', ticket,
        entry.state, entry.name ?? null, entry.joinedAt ?? null, entry.expiresAt,
        entry.result ? JSON.stringify(entry.result) : null);
    },
    oldest(ticket, now) {
      const entry = rows(sql.exec("SELECT ticket FROM rival_searches WHERE state = 'waiting' AND ticket != ? AND expires_at > ? ORDER BY joined_at, ticket LIMIT 1", ticket, now))[0];
      return entry && [entry.ticket, this.get(entry.ticket, now)];
    },
    limit(client, now, joining) {
      const prior = rows(sql.exec('SELECT * FROM rival_limits WHERE client = ? AND expires_at > ?', client, now))[0];
      const requests = (prior?.requests ?? 0) + 1, joins = (prior?.joins ?? 0) + Number(joining);
      if (requests > 240 || joins > 20) return false;
      sql.exec('INSERT OR REPLACE INTO rival_limits VALUES (?, ?, ?, ?)', client, requests, joins, prior?.expires_at ?? now + 60_000);
      return true;
    },
    async schedule(now) {
      const alarm = await ctx.storage.getAlarm();
      if (alarm === null || alarm > now + 60_000) await ctx.storage.setAlarm(now + 60_000);
    },
    async cleanup(now) {
      sql.exec('DELETE FROM rival_searches WHERE expires_at <= ?', now);
      sql.exec('DELETE FROM rival_limits WHERE expires_at <= ?', now);
      const next = rows(sql.exec('SELECT MIN(expires_at) AS expiry FROM (SELECT expires_at FROM rival_searches UNION ALL SELECT expires_at FROM rival_limits)'))[0]?.expiry;
      if (next != null) await ctx.storage.setAlarm(Math.max(now + 1000, next));
    },
  };
}
