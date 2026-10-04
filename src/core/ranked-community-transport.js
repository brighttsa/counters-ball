import {savedKonkerProfile} from './konker-profile-transport.js';
async function call(base,path,init={},fetchImpl=globalThis.fetch){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetchImpl(`${base}${path}`,{...init,signal:controller.signal});
    const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error??'Ranked unavailable'),{status:response.status});
    return data;
  }finally{clearTimeout(timer);}
}
export function searchRanked(base,details,fetchImpl){
  const profile=savedKonkerProfile();if(!profile)throw Object.assign(Error('Save or restore your KONKER profile before playing ranked.'),{status:401});
  return call(base,'/ranked/search',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${profile.secret}`},
    body:JSON.stringify({action:details.action,ticket:details.ticket,profileId:profile.id})},fetchImpl);
}
export function readRankedStanding(base,{cursor,season,personal=false}={},fetchImpl){
  const profile=personal?savedKonkerProfile():null,query=new URLSearchParams();
  if(cursor)query.set('cursor',cursor);if(season)query.set('season',season);
  if(profile)query.set('profileId',profile.id);
  return call(base,`/standings${profile?'/me':''}?${query}`,{headers:profile?{Authorization:`Bearer ${profile.secret}`}:{},cache:'no-store'},fetchImpl);
}
const KEY='konk:ranked-search';
export function loadRankedTicket(){try{return sessionStorage.getItem(KEY);}catch{return null;}}
export function saveRankedTicket(ticket){try{if(ticket)sessionStorage.setItem(KEY,ticket);else sessionStorage.removeItem(KEY);}catch{}}
