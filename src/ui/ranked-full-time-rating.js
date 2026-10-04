import { readRankedStanding } from '../core/ranked-community-transport.js';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function showRankedFullTimeRating(api,matchId,{read=readRankedStanding,delay=wait}={}){
  const screen=document.querySelector('[data-screen="results"]');
  const list=document.getElementById('results-lines');
  if(!screen||!list)return;
  for(let attempt=0;attempt<10&&!screen.classList.contains('is-active');attempt++)await delay(100);
  if(!screen.classList.contains('is-active'))return;
  const line=document.createElement('li');
  line.className='results-ranked-rating';
  line.textContent='Ranked rating settling...';
  list.dataset.rankedMatch=matchId;
  list.append(line);
  const current=()=>screen.classList.contains('is-active')&&list.dataset.rankedMatch===matchId&&line.isConnected;
  for(let attempt=0;attempt<8;attempt++){
    if(!current())return;
    try{
      const {own}=await read(api,{personal:true});
      if(!current())return;
      if(own?.lastResult?.matchId===matchId){
        const {delta,rating}=own.lastResult;
        line.textContent=`Ranked rating ${delta>0?'+':''}${delta} · now ${rating}`;
        return;
      }
    }catch{/* Settlement may still be in flight; do not invent a result. */}
    if(attempt<7)await delay(1500);
  }
  if(current())line.textContent='Rating still settling. Check standings in a moment.';
}
