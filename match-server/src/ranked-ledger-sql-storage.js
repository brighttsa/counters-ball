const initialized=new WeakSet();
export function rankedLedgerContext(ctx){
  const sql=ctx.storage.sql;
  if(!initialized.has(ctx)){
    sql.exec('CREATE TABLE IF NOT EXISTS ranked_ledger (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS ranked_ratings (season TEXT,profile TEXT,rating REAL,matches INTEGER,wins INTEGER,draws INTEGER,losses INTEGER,placed INTEGER,name TEXT,PRIMARY KEY(season,profile))');
    sql.exec('CREATE INDEX IF NOT EXISTS ranked_board ON ranked_ratings(season,placed,rating DESC,profile)');
    sql.exec('CREATE TABLE IF NOT EXISTS ranked_reservations (match_id TEXT PRIMARY KEY,room TEXT,cutoff INTEGER,status TEXT,checked INTEGER DEFAULT 0)');
    sql.exec('CREATE INDEX IF NOT EXISTS ranked_pending_cutoff ON ranked_reservations(status,cutoff,checked)');
    initialized.add(ctx);
  }
  const get=async key=>{const row=[...sql.exec('SELECT value FROM ranked_ledger WHERE key=?',key)][0];return row?JSON.parse(row.value):undefined;};
  return {storage:{get,sql,put:async entries=>{
    ctx.storage.transactionSync(()=>{
      for(const [key,value]of Object.entries(entries)){
        sql.exec('INSERT OR REPLACE INTO ranked_ledger VALUES (?,?)',key,JSON.stringify(value));
        if(key.startsWith('ranked:reservation:')){
          sql.exec('INSERT INTO ranked_reservations(match_id,room,cutoff,status) VALUES (?,?,?,?) ON CONFLICT(match_id) DO UPDATE SET status=excluded.status',
            value.registration.matchId,value.registration.roomId,value.registration.season.end+600000,value.status);
        }
        const match=/^ranked:rating:(\d+):([a-f0-9]{32})$/.exec(key);
        if(match){
          const [,season,id]=match;
          const name=[...sql.exec('SELECT value FROM ranked_ledger WHERE key=?',`ranked:name:${id}`)][0];
          sql.exec('INSERT OR REPLACE INTO ranked_ratings VALUES (?,?,?,?,?,?,?,?,?)',season,id,value.rating,value.matches,
            value.wins,value.draws,value.losses,Number(value.placed),name?JSON.parse(name.value):'KONKER');
        }
      }
    });
  }}};
}
