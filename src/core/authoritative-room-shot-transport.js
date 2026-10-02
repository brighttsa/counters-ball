import { liveRoomSeatToken } from './live-match-room-transport.js?v=7';

async function request(base,id,intent,fetchImpl=fetch) {
  const token=liveRoomSeatToken(id),controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try {
    const response=await fetchImpl(`${base}/rooms/${id}/shot`,{method:intent?'POST':'GET',signal:controller.signal,
      headers:intent?{'Content-Type':'application/json'}:{Authorization:`Bearer ${token}`},
      ...(intent?{body:JSON.stringify({...intent,token})}:{})});
    const body=await response.json();
    if(!response.ok)throw Object.assign(new Error(body.error??'Could not reach the match'),{status:response.status});
    return body;
  } finally {clearTimeout(timeout);}
}
export const readAuthoritativeRoom=(base,id,fetchImpl)=>request(base,id,null,fetchImpl);
export const sendAuthoritativeShot=(base,id,intent,fetchImpl)=>request(base,id,intent,fetchImpl);
