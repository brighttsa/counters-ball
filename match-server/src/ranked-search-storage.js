const initialized=new WeakSet();
export function rankedSearchStorage(ctx){
  const sql=ctx.storage.sql;
  if(!initialized.has(ctx)){
    sql.exec('CREATE TABLE IF NOT EXISTS ranked_searches (ticket TEXT PRIMARY KEY,profile TEXT NOT NULL,state TEXT NOT NULL,rating REAL NOT NULL,joined INTEGER NOT NULL,expires INTEGER NOT NULL,value TEXT NOT NULL)');
    sql.exec("CREATE UNIQUE INDEX IF NOT EXISTS ranked_profile_search ON ranked_searches(profile) WHERE state IN ('waiting','pairing')");
    sql.exec('CREATE INDEX IF NOT EXISTS ranked_search_skill ON ranked_searches(state,rating,joined)');
    initialized.add(ctx);
  }
  return {
    get(ticket){const row=[...sql.exec('SELECT value FROM ranked_searches WHERE ticket=?',ticket)][0];return row&&JSON.parse(row.value);},
    active(profile){const row=[...sql.exec("SELECT value FROM ranked_searches WHERE profile=? AND state IN ('waiting','pairing')",profile)][0];return row&&JSON.parse(row.value);},
    put(entries){ctx.storage.transactionSync(()=>{
      for(const e of entries)sql.exec('INSERT OR REPLACE INTO ranked_searches VALUES (?,?,?,?,?,?,?)',e.ticket,e.profile,e.state,e.rating,e.joined,e.expires,JSON.stringify(e));
    });},
    expire(now){sql.exec("DELETE FROM ranked_searches WHERE expires<=? AND state!='pairing'",now);},
    pending(){return [...sql.exec("SELECT value FROM ranked_searches WHERE state='pairing' ORDER BY joined,ticket LIMIT 10")].map(row=>JSON.parse(row.value));},
    hasEntries(){return Boolean([...sql.exec('SELECT 1 FROM ranked_searches LIMIT 1')].length);},
    rival(entry,now){
      const width=Math.min(700,150+100*Math.floor((now-entry.joined)/15000));
      const candidates=[...sql.exec("SELECT value FROM ranked_searches WHERE state='waiting' AND profile!=? AND expires>? AND rating BETWEEN ? AND ? ORDER BY ABS(rating-?),joined,ticket",entry.profile,now,entry.rating-width,entry.rating+width,entry.rating)];
      return candidates.map(row=>JSON.parse(row.value)).find(other=>Math.abs(other.rating-entry.rating)<=Math.min(700,150+100*Math.floor((now-other.joined)/15000)));
    },
  };
}
