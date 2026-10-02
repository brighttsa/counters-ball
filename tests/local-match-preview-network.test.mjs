import test from 'node:test';
import assert from 'node:assert/strict';
import { localMatchApi,isWifiMatchPreview } from '../src/core/local-match-preview-network.js';
import { roomLink } from '../src/core/live-match-room-transport.js';
import { usesVerifiedPrivateRoom } from '../src/core/live-room-preview-creation.js';
test('release enables only private classic venues on the production site',()=>{
  const location=new URL('https://konk.world/play/');
  assert.equal(usesVerifiedPrivateRoom({levelId:'schoolyard'},location),true);
  assert.equal(usesVerifiedPrivateRoom({levelId:'schoolyard',mode:'tournament'},location),false);
  assert.equal(usesVerifiedPrivateRoom({levelId:'legend-roadside-act1'},location),false);
  assert.equal(usesVerifiedPrivateRoom({levelId:'schoolyard'},new URL('https://example.com/')),false);
});
test('Wi-Fi invitations open the game route rather than the site root',()=>{
  assert.equal(roomLink('http://192.168.100.239:4197/','abcdefghij'),
    'http://192.168.100.239:4197/play/?room=abcdefghij');
});
test('Wi-Fi test port uses the same Mac for the room API',()=>{
  for(const host of ['192.168.100.239','10.0.0.2','172.16.1.2']){
    const loc=new URL(`http://${host}:4197/play/`);
    assert.equal(isWifiMatchPreview(loc),true);assert.equal(localMatchApi(loc),`http://${host}:8787`);
  }
});
test('production, public IPs and other ports never opt into the local API',()=>{
  for(const url of ['https://konk.world/play/','http://8.8.8.8:4197/','http://192.168.1.2:80/','http://172.32.1.2:4197/']){
    assert.equal(localMatchApi(new URL(url)),null);
  }
  assert.equal(localMatchApi({hostname:'localhost'}),'http://localhost:8787');
});
