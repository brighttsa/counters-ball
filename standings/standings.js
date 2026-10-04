import {readRankedStanding} from '../src/core/ranked-community-transport.js';
import {roomApiBase} from '../src/core/live-match-room-transport.js';
const $=id=>document.getElementById(id),api=roomApiBase();
let cursor=null,busy=false,season,version=0;
async function load(more=false){
  if(busy)return;busy=true;const current=++version;$('refresh').disabled=true;$('more').disabled=true;
  $('status').textContent='Loading standings...';
  try{
    const result=await readRankedStanding(api,{cursor:more?cursor:null,season,personal:true});
    if(current!==version)return;
    if(!more)$('rows').replaceChildren();
    if(season==null){season=result.season.id;$('season').replaceChildren();
      for(let n=Number(season);n>=Math.max(0,Number(season)-3);n--){const option=document.createElement('option');option.value=String(n);option.textContent=`Season ${n+1}`;$('season').append(option);}}
    $('season-current').textContent=`Season ${Number(season)+1}`;
    const hasPreviousSeason=$('season').options.length>1;
    $('season-current').hidden=hasPreviousSeason;$('season').hidden=!hasPreviousSeason;
    $('season').disabled=!hasPreviousSeason;$('ranked').hidden=false;
    for(const row of result.rows){const tr=document.createElement('tr');
      for(const text of [row.rank,row.name,row.rating,`${row.wins} / ${row.draws} / ${row.losses}`]){const td=document.createElement('td');td.textContent=String(text);tr.append(td);}
      $('rows').append(tr);}
    cursor=result.nextCursor;$('more').hidden=!cursor;
    $('status').textContent=result.placedPlayers?`${result.placedPlayers} placed KONKER${result.placedPlayers===1?'':'S'}`:'No placed KONKERS yet.';
    $('own').hidden=!result.own;
    if(result.own){$('own-name').textContent=result.own.name??'YOUR STANDING';
      $('own-detail').textContent=result.own.placed?`Rank ${result.own.rank} · ${result.own.rating} rating`:`Provisional · ${result.own.rating} rating · ${Math.min(5,result.own.matches)}/5 matches · ${result.own.distinctOpponents}/3 opponents`;}
  }catch(error){
    $('status').textContent=error.status===409?'Ranked standings are not live yet. Casual play is available.':error.status?error.message:'Standings could not load. Check your connection and retry.';
    if(!more){$('rows').replaceChildren();$('own').hidden=true;$('ranked').hidden=true;$('more').hidden=true;}
  }finally{busy=false;$('refresh').disabled=false;$('more').disabled=false;}
}
$('refresh').addEventListener('click',()=>load());$('more').addEventListener('click',()=>load(true));
$('season').addEventListener('change',()=>{season=$('season').value;load();});
load();
