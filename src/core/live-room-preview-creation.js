import { createLiveRoom } from './live-match-room-transport.js?v=7';
import { isWifiMatchPreview } from './local-match-preview-network.js';

export function usesVerifiedPrivateRoom(details,loc=globalThis.location){
  const preview=(loc?.hostname==='localhost'||isWifiMatchPreview(loc)) && new URLSearchParams(loc.search).get('serverMatch')==='1';
  return details.mode!=='tournament' && ['schoolyard','kiosk','veranda','roadside','harmattan','nightbulb'].includes(details.levelId)
    && (preview||(loc?.protocol==='https:'&&loc.hostname==='konk.world'));
}
export function createPreviewAwareRoom(api,details,loc=globalThis.location) {
  return createLiveRoom(api,{...details,...(usesVerifiedPrivateRoom(details,loc)?{simulation:'server-v1'}:{})});
}
