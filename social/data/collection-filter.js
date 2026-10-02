export function filterCampaignPosters(posters, group = 'All', query = '') {
  const search = query.trim().normalize('NFC').toLocaleLowerCase();
  return posters.filter(p => (group === 'All' || p.group === group) &&
    [p.title, p.headline, p.subheadline, p.eyebrow, p.signature, p.caption]
      .join(' ').normalize('NFC').toLocaleLowerCase().includes(search));
}
