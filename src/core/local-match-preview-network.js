export function isWifiMatchPreview(loc) {
  if(loc?.protocol!=='http:' || loc.port!=='4197')return false;
  const parts=loc.hostname.split('.').map(Number);
  if(parts.length!==4 || parts.some(value=>!Number.isInteger(value)||value<0||value>255))return false;
  return parts[0]===10 || (parts[0]===192&&parts[1]===168)
    || (parts[0]===172&&parts[1]>=16&&parts[1]<=31);
}
export function localMatchApi(loc) {
  if(loc?.hostname==='localhost'||loc?.hostname==='127.0.0.1')return 'http://localhost:8787';
  return isWifiMatchPreview(loc)?`http://${loc.hostname}:8787`:null;
}
