import test from 'node:test';
import assert from 'node:assert/strict';
import {rankedClockLabel} from '../src/ui/ranked-match-clock.js';
test('ranked clock uses server time, freezes during reconnect and never declares a winner',()=>{
  const room={phase:'playing',ranked:{serverNow:100000,turnDeadline:160000,suspendedAt:null}};
  assert.equal(rankedClockLabel(room),'60s · turn limit');
  assert.equal(rankedClockLabel(room,51000),'9s · turn limit');
  assert.equal(rankedClockLabel(room,90000),'Checking turn result…');
  assert.equal(rankedClockLabel({...room,ranked:{...room.ranked,suspendedAt:110000}},90000),'Reconnect · paused');
  assert.equal(rankedClockLabel({...room,phase:'ended'}),'flicks left');
  assert.equal(rankedClockLabel({phase:'playing'}),'flicks left');
});
