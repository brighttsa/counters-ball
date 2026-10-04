import test from 'node:test';
import assert from 'node:assert/strict';
import {showRankedFullTimeRating} from '../src/ui/ranked-full-time-rating.js';

function fixture(){
  const lines=[];
  const screen={classList:{contains:()=>true}};
  const list={dataset:{},append(node){node.isConnected=true;lines.push(node);}};
  const prior=globalThis.document;
  globalThis.document={querySelector:()=>screen,getElementById:()=>list,createElement:()=>({isConnected:false,textContent:''})};
  return {lines,list,restore:()=>{globalThis.document=prior;}};
}

test('ranked full-time cue waits for the matching verified settlement',async()=>{
  const f=fixture();try{
    let calls=0;
    await showRankedFullTimeRating('api','current',{read:async()=>({own:{lastResult:++calls===1?
      {matchId:'older',delta:12,rating:1012}:{matchId:'current',delta:-9,rating:1003}}}),delay:async()=>{}});
    assert.equal(calls,2);
    assert.equal(f.lines[0].textContent,'Ranked rating -9 · now 1003');
  }finally{f.restore();}
});

test('unconfirmed results never display an invented rating change',async()=>{
  const f=fixture();try{
    await showRankedFullTimeRating('api','current',{read:async()=>({own:{lastResult:null}}),delay:async()=>{}});
    assert.match(f.lines[0].textContent,/still settling/);
  }finally{f.restore();}
});
