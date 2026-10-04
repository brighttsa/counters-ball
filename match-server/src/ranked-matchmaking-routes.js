import {readBoundedText} from './bounded-request-body.js';
import {verifyReadyProfile} from './konker-room-seat-identity.js';
import {checkRankedNetworkLimit,checkRankedPlayerLimit} from './ranked-request-limits.js';
export async function routeRankedMatchmaking(request,env){
  if(new URL(request.url).pathname!=='/ranked/search')return null;
  const error=(message,status)=>Response.json({error:message},{status});
  if(env.RANKED_SETTLEMENT_ENABLED!=='true')return error('Ranked play is not released',409);
  if(request.method!=='POST')return error('Method not allowed',405);
  if(!(env.ALLOWED_ORIGINS??'').split(',').map(s=>s.trim()).includes(request.headers.get('Origin')??''))return error('Origin not allowed',403);
  const text=await readBoundedText(request,1024);if(text===null)return error('Search request too large',413);
  let input;try{input=JSON.parse(text);}catch{return error('Invalid search',400);}
  if(!input?.profileId||!request.headers.get('Authorization'))return error('Saved KONKER profile required',401);
  const body={ticket:input.ticket,action:input.action,profileId:input.profileId};
  const failure=await verifyReadyProfile(request,env,body,{checkLimit:checkRankedNetworkLimit,
    afterVerify:checkRankedPlayerLimit,includeName:true});if(failure)return failure;
  const queue=env.KONK_MATCH.get(env.KONK_MATCH.idFromName('ranked-matchmaking-v1'));
  return queue.fetch('https://match/internal/ranked/search',{method:'POST',body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
}
