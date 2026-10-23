/**
 * 2minutes — découverte gratuite d'articles candidats.
 * RSS/Atom est lu directement par l'extension, sans backend ni API payante.
 * Audit: 17 octobre 2026.
 */
const ARTICLE_DISCOVERY = {
  'lemonde.fr': {mode:'RSS_LOCAL', feeds:['https://www.lemonde.fr/actualite-en-continu/rss_full.xml'], policy:'PERSONAL_ONLY'},
  'mediapart.fr': {mode:'RSS_LOCAL', feeds:['https://www.mediapart.fr/articles/feed'], policy:'LOCAL'},
  'rfi.fr': {mode:'RSS_LOCAL', discover:true, homepage:'https://www.rfi.fr/fr/', policy:'LOCAL'},
  'franceinfo.fr': {mode:'RSS_LOCAL', discover:true, homepage:'https://www.franceinfo.fr/', policy:'LOCAL'},
  '20minutes.fr': {mode:'RSS_LOCAL', discover:true, homepage:'https://www.20minutes.fr/', policy:'LOCAL'},
  'liberation.fr': {mode:'RSS_LOCAL', discover:true, homepage:'https://www.liberation.fr/', policy:'LOCAL'},
  'france24.com': {mode:'RSS_LOCAL', discover:true, homepage:'https://www.france24.com/fr/', policy:'LOCAL'},
  'nouvelobs.com': {mode:'RSS_LOCAL', discover:true, homepage:'https://www.nouvelobs.com/', policy:'LOCAL'},
  'bbc.com': {mode:'RSS_LOCAL', feeds:['https://feeds.bbci.co.uk/news/rss.xml'], policy:'LOCAL'},
  'bbc.co.uk': {mode:'RSS_LOCAL', feeds:['https://feeds.bbci.co.uk/news/rss.xml'], policy:'LOCAL'},
  'theguardian.com': {mode:'RSS_LOCAL', feeds:['https://www.theguardian.com/world/rss'], policy:'PERSONAL_ONLY'},
  'tagesschau.de': {mode:'RSS_LOCAL', feeds:['https://www.tagesschau.de/xml/rss2'], policy:'PERSONAL_ONLY'},
  'elpais.com': {mode:'RSS_LOCAL', feeds:['https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada'], policy:'LOCAL'},
  'lavanguardia.com': {mode:'RSS_LOCAL', discover:true, homepage:'https://www.lavanguardia.com/', policy:'LOCAL'},
  'repubblica.it': {mode:'RSS_LOCAL', discover:true, homepage:'https://www.repubblica.it/', policy:'LOCAL'},
  'corriere.it': {mode:'RSS_LOCAL', discover:true, homepage:'https://www.corriere.it/', policy:'LOCAL'},
  'ansa.it': {mode:'RSS_LOCAL', discover:true, homepage:'https://www.ansa.it/', policy:'PERSONAL_ONLY'},
  'nos.nl': {mode:'RSS_LOCAL', feeds:['https://feeds.nos.nl/nosnieuwsalgemeen'], policy:'LOCAL'},
  'rtbf.be': {mode:'RSS_LOCAL', discover:true, homepage:'https://www.rtbf.be/', policy:'LOCAL'},
  'rtp.pt': {mode:'RSS_LOCAL', discover:true, homepage:'https://www.rtp.pt/noticias/', policy:'LOCAL'},
  'reuters.com': {mode:'WEB_SEARCH'},
  'abc.net.au': {mode:'WEB_SEARCH'},
  'afp.com': {mode:'WEB_SEARCH'}
};
