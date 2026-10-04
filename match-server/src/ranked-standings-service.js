import { rankedSeason,freshRating } from './ranked-rating-rules.js';
const parseCursor=value=>{
  if(!value)return null;
  try{const cursor=JSON.parse(atob(value));if(Number.isFinite(cursor.rating)&&/^[a-f0-9]{32}$/.test(cursor.profile))return cursor;}catch{}
  throw Object.assign(Error('Invalid standings cursor'),{status:400});
};
export async function rankedStanding(ctx,env,{profileId,seasonId,cursor,limit=25}={},now=Date.now()){
  const current=rankedSeason(now,Date.parse(env.RANKED_SEASON_ANCHOR));
  const season=seasonId??current.id;
  if(!/^\d{1,6}$/.test(season)||Number(season)>current.index)throw Object.assign(Error('Unknown season'),{status:400});
  const sql=ctx.storage.sql,c=parseCursor(cursor),size=Math.min(50,Math.max(1,Math.floor(Number(limit)||25)));
  const rankFor=rating=>Number([...sql.exec('SELECT COUNT(*) AS count FROM ranked_ratings WHERE season=? AND placed=1 AND rating>?',season,rating)][0].count)+1;
  const rows=[...sql.exec(`SELECT * FROM ranked_ratings WHERE season=? AND placed=1 ${c?'AND (rating<? OR (rating=? AND profile>?))':''} ORDER BY rating DESC,profile LIMIT ?`,
    season,...(c?[c.rating,c.rating,c.profile]:[]),size+1)];
  const more=rows.length>size;rows.splice(size);
  const publicRow=row=>({id:row.profile,name:row.name,rating:Math.round(row.rating),rank:rankFor(row.rating),matches:row.matches,wins:row.wins,draws:row.draws,losses:row.losses});
  let own=null;
  if(profileId){
    const row=[...sql.exec('SELECT * FROM ranked_ratings WHERE season=? AND profile=?',season,profileId)][0];
    if(!row&&Number(season)>0&&(await ctx.storage.get(`ranked:pending:${Number(season)-1}`)??0)>0)throw Object.assign(Error('Previous season results are still settling'),{status:503});
    const previous=!row&&Number(season)>0?await ctx.storage.get(`ranked:rating:${Number(season)-1}:${profileId}`):null;
    own=row?{...publicRow(row),rank:row.placed?rankFor(row.rating):null,placed:Boolean(row.placed)}:{...freshRating(previous),rank:null,placed:false};
    own.distinctOpponents=(await ctx.storage.get(`ranked:rating:${season}:${profileId}`))?.opponents?.length??0;
    const active=await ctx.storage.get(`ranked:active:${profileId}`);own.activeMatch=active?.roomId??null;
  }
  const last=rows.at(-1);
  return {season:{id:season,start:current.start+(Number(season)-current.index)*28*86400000,end:current.end+(Number(season)-current.index)*28*86400000},
    rows:rows.map(publicRow),own,nextCursor:more?btoa(JSON.stringify({rating:last.rating,profile:last.profile})):null,
    placedPlayers:Number([...sql.exec('SELECT COUNT(*) AS count FROM ranked_ratings WHERE season=? AND placed=1',season)][0].count)};
}
