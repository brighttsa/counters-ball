export async function limitRankedRequest(ctx, scope, now=Date.now()) {
  if(!['network','player'].includes(scope))return Response.json({error:'Invalid request scope'},{status:400});
  let counter=await ctx.storage.get('ranked-request-counter');
  if(!counter || counter.until<=now)counter={count:0,until:now+60000};
  const maximum=scope==='network'?6000:60;
  if(counter.count>=maximum)return Response.json({error:'Too many ranked requests; retry shortly'},
    {status:429,headers:{'Retry-After':String(Math.max(1,Math.ceil((counter.until-now)/1000)))}});
  counter.count++;await ctx.storage.put('ranked-request-counter',counter);
  await ctx.storage.setAlarm(counter.until);
  return Response.json({ok:true});
}

async function check(env,key,scope) {
  return env.KONK_MATCH.get(env.KONK_MATCH.idFromName(`ranked-limit:${scope}:${key}`))
    .fetch('https://match/internal/ranked/limit',{method:'POST',headers:{'X-Ranked-Limit-Scope':scope}});
}
export async function checkRankedNetworkLimit(request,env) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(request.headers.get('CF-Connecting-IP')??'local'));
  const key=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  return check(env,key,'network');
}
// Only invoke after credentials have been verified, so strangers cannot spend a victim's budget.
export function checkRankedPlayerLimit(env,id){return check(env,id,'player');}
export async function cleanupRankedLimit(ctx,now=Date.now()) {
  const counter=await ctx.storage.get('ranked-request-counter');
  if(!counter)return false;
  if(counter.until<=now)await ctx.storage.deleteAll();else await ctx.storage.setAlarm(counter.until);
  return true;
}
