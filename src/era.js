// Elige la era antes de que arranque la interfaz: cambia el catálogo y la campaña activos
(function () {
  const P = window.PTCG; let era = 'wotc';
  try { era = localStorage.getItem('ptcg_era') || 'wotc'; } catch (e) {}
  const q = new URLSearchParams(location.search).get('era'); if (q === 'mega' || q === 'wotc') era = q;
  P.ERA = era;
  if (era === 'mega' && P.CampaignMega) { P.CARDS_WOTC = P.CARDS; P.CARDS = P.CARDS_MEGA; P.Campaign_WOTC = P.Campaign; P.Campaign = P.CampaignMega; P._byName = null; }
})();
