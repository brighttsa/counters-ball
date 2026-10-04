import {verifyReadyProfile} from './konker-room-seat-identity.js';
import {checkRankedNetworkLimit,checkRankedPlayerLimit} from './ranked-request-limits.js';

export async function routeRankedStandings(request,env){
  const url=new URL(request.url),own=url.pathname==='/standings/me';
  if(!own&&url.pathname!=='/standings')return null;
  const json=(body,status)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  if(env.RANKED_SETTLEMENT_ENABLED!=='true')return json({error:'Ranked standings are not released'},409);
  if(request.method!=='GET')return json({error:'Method not allowed'},405);
  const body={seasonId:url.searchParams.get('season')??undefined,
    cursor:url.searchParams.get('cursor')??undefined,limit:url.searchParams.get('limit')??25};
  if((body.cursor?.length??0)>512)return json({error:'Invalid standings cursor'},400);
  if(own){
    body.profileId=url.searchParams.get('profileId');
    if(!body.profileId||!request.headers.get('Authorization'))return json({error:'Saved KONKER profile required'},401);
    const failure=await verifyReadyProfile(request,env,body,{checkLimit:checkRankedNetworkLimit,
      afterVerify:checkRankedPlayerLimit});if(failure)return failure;
    body.profileId=body.verifiedProfileId;delete body.verifiedProfileId;
  }else{
    const limit=await checkRankedNetworkLimit(request,env);if(!limit.ok)return limit;
  }
  const coordinator=env.KONK_MATCH.get(env.KONK_MATCH.idFromName('ranked-standings-v1'));
  const response=await coordinator.fetch('https://match/internal/ranked/standing',{
    method:'POST',body:JSON.stringify(body),signal:AbortSignal.timeout(8000),
  });
  return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
