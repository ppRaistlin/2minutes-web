/**
 * 2minutes — content.js
 * - Badge biais + lien AFP + liens vers sites à l'opposé politique (même langue)
 */
(function () {

  // ── 1. Titre de l'article ────────────────────────────────────────────────
  function getArticleTitle() {
    const selectors = [
      'article h1','main h1','[role="main"] h1','.article h1','.post h1',
      '.entry-title','.article-title','.article__title','.post-title','h1.title','h1',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 10) return el.innerText.trim();
    }
    const og = document.querySelector('meta[property="og:title"]');
    if (og && og.content.trim().length > 10) return og.content.trim();
    const tw = document.querySelector('meta[name="twitter:title"]');
    if (tw && tw.content.trim().length > 10) return tw.content.trim();
    return document.title.trim();
  }

  // ── Image principale de l'article ────────────────────────────────────────
  function getArticleImage() {
    const absolute = raw => {
      try {
        const u = new URL(String(raw || '').trim(), location.href);
        return /^https?:$/.test(u.protocol) ? u.href : '';
      } catch { return ''; }
    };
    const comparable = raw => {
      try {
        const u = new URL(raw, location.href);
        u.hash = '';
        u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
        if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/$/, '');
        return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}${u.search}`;
      } catch { return ''; }
    };
    const pageUrls = new Set([
      comparable(location.href),
      comparable(document.querySelector('link[rel="canonical"]')?.href || '')
    ].filter(Boolean));
    const valid = raw => {
      const href = absolute(raw);
      if (!href) return '';
      if (pageUrls.has(comparable(href))) return '';
      return href;
    };
    const imageValue = value => {
      if (!value) return '';
      if (typeof value === 'string') return valid(value);
      if (Array.isArray(value)) {
        for (const item of value) {
          const found = imageValue(item);
          if (found) return found;
        }
        return '';
      }
      if (typeof value === 'object') {
        return valid(value.contentUrl) || valid(value.url) || valid(value['@id']);
      }
      return '';
    };

    const meta = [
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'meta[itemprop="image"]',
      'link[rel="image_src"]'
    ];
    for (const sel of meta) {
      const el = document.querySelector(sel);
      const value = valid(el?.getAttribute('content') || el?.getAttribute('href'));
      if (value) return value;
    }

    try {
      for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
        const data = JSON.parse(el.textContent || 'null');
        const stack = Array.isArray(data) ? [...data] : [data];
        while (stack.length) {
          const node = stack.shift();
          if (!node || typeof node !== 'object') continue;
          if (Array.isArray(node)) { stack.push(...node); continue; }
          const type = Array.isArray(node['@type']) ? node['@type'].join(' ') : String(node['@type'] || '');
          if (/Article|NewsArticle|ReportageNewsArticle|BlogPosting/i.test(type)) {
            const found = imageValue(node.image || node.thumbnailUrl || node.primaryImageOfPage);
            if (found) return found;
          }
          for (const value of Object.values(node)) if (value && typeof value === 'object') stack.push(value);
        }
      }
    } catch {}

    const candidates = [...document.querySelectorAll('article figure img, article picture img, article img, main figure img, main picture img, main img, [role="main"] img')]
      .filter(img => {
        const r = img.getBoundingClientRect();
        const w = Number(img.naturalWidth || img.width || r.width || 0);
        const h = Number(img.naturalHeight || img.height || r.height || 0);
        const text = `${img.alt || ''} ${img.className || ''}`.toLowerCase();
        return w >= 300 && h >= 160 && !/logo|avatar|icon|sprite|author|profile/.test(text) && !!valid(img.currentSrc || img.src);
      })
      .sort((a,b) => (Number(b.naturalWidth||b.width||0)*Number(b.naturalHeight||b.height||0)) -
                     (Number(a.naturalWidth||a.width||0)*Number(a.naturalHeight||a.height||0)));
    return valid(candidates[0]?.currentSrc || candidates[0]?.src || '');
  }

  // ── 2. Langue ────────────────────────────────────────────────────────────

  function getArticlePublishedAt() {
    const metaSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="article:published_time"]',
      'meta[name="date"]',
      'meta[name="pubdate"]',
      'meta[name="publish-date"]',
      'meta[itemprop="datePublished"]'
    ];
    for (const sel of metaSelectors) {
      const v = document.querySelector(sel)?.getAttribute('content');
      if (v && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
    }
    const t = document.querySelector('time[datetime]')?.getAttribute('datetime');
    if (t && !Number.isNaN(Date.parse(t))) return new Date(t).toISOString();
    try {
      for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
        const data = JSON.parse(el.textContent || 'null');
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const candidates = [item, ...(Array.isArray(item?.['@graph']) ? item['@graph'] : [])];
          for (const x of candidates) {
            const v = x?.datePublished;
            if (v && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
          }
        }
      }
    } catch {}
    return null;
  }
  function detectLang() {
    const raw = (
      document.documentElement.lang ||
      document.querySelector('meta[http-equiv="content-language"]')?.content ||
      document.querySelector('meta[name="language"]')?.content || ''
    ).toLowerCase().split('-')[0];
    if (['fr','en','de','es','it','nl','pt'].includes(raw)) return raw;
    const h = window.location.hostname;
    if (/\.fr$|afp|lemonde|figaro|liberation|mediapart|franceinfo|humanite|politis|telerama|obs\.com|lesechos|lepoint/.test(h)) return 'fr';
    if (/\.de$|spiegel|welt|bild|zeit\.de|sueddeutsche|taz\.de/.test(h)) return 'de';
    if (/\.es$|elmundo|elpais|clarin|lavanguardia|publico\.es/.test(h)) return 'es';
    if (/\.it$|corriere|repubblica|lastampa|ilmanifesto/.test(h)) return 'it';
    if (/\.nl$|volkskrant|telegraaf|bnr\.nl|trouw\.nl/.test(h)) return 'nl';
    return 'en';
  }

  // ── 3. Mots-clés ─────────────────────────────────────────────────────────
  function extractKeywords(title) {
    const stop = new Set([
      'le','la','les','un','une','des','de','du','au','aux','en','et','ou','a',
      'par','sur','sous','dans','avec','sans','pour','que','qui','ce','cette',
      'est','sont','ont','mais','donc','alors','tres','plus','apres','avant',
      'the','an','in','on','at','to','of','for','and','or','but','is','are',
      'was','were','has','have','had','with','by','from','that','this','it',
      'be','not','no','so','if','do','did','about','after','when','what','who',
      'they','will','would','could','should','just','also','than','then',
      'der','die','das','ein','und','oder','mit','von','fur','ist','sind',
      'el','los','una','del','por','con','como','mas','todo','pero',
    ]);
    return title
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .map(w => w.toLowerCase())
      .filter(w => w.length > 3 && !stop.has(w) && !/^\d+$/.test(w))
      .slice(0, 5)
      .join(' ');
  }

  // ── 4. Opposite sites database ───────────────────────────────────────────
  const OPP = {
    fr: {
      'LEFT':        [['Le Figaro','lefigaro.fr','Centre-droit'],['Le Point','lepoint.fr','Centre-droit'],['Valeurs Actuelles','valeursactuelles.com','Droite'],['Les Echos','lesechos.fr','Centre-droit']],
      'LEFT-CENTER': [['Le Figaro','lefigaro.fr','Centre-droit'],['Le Point','lepoint.fr','Centre-droit'],['Les Echos','lesechos.fr','Centre-droit'],['Le Parisien','leparisien.fr','Centre-droit']],
      'LEAST BIASED':[['Le Figaro','lefigaro.fr','Centre-droit'],['Liberation','liberation.fr','Centre-gauche'],['L\'Obs','nouvelobs.com','Centre-gauche'],['Le Point','lepoint.fr','Centre-droit']],
      'RIGHT-CENTER':[['Le Monde','lemonde.fr','Centre-gauche'],['Liberation','liberation.fr','Centre-gauche'],['L\'Obs','nouvelobs.com','Centre-gauche'],['Mediapart','mediapart.fr','Centre-gauche']],
      'RIGHT':       [['Le Monde','lemonde.fr','Centre-gauche'],['Liberation','liberation.fr','Centre-gauche'],['Mediapart','mediapart.fr','Centre-gauche'],['L\'Humanite','humanite.fr','Gauche']],
    },
    en: {
      'LEFT':        [['Wall Street Journal','wsj.com','Centre-droit'],['The Telegraph','telegraph.co.uk','Centre-droit'],['National Review','nationalreview.com','Droite'],['NY Post','nypost.com','Droite']],
      'LEFT-CENTER': [['Wall Street Journal','wsj.com','Centre-droit'],['The Times','thetimes.co.uk','Centre-droit'],['Daily Telegraph','telegraph.co.uk','Centre-droit'],['Fox Business','foxbusiness.com','Centre-droit']],
      'LEAST BIASED':[['The Guardian','theguardian.com','Centre-gauche'],['Wall Street Journal','wsj.com','Centre-droit'],['NPR','npr.org','Centre-gauche'],['The Telegraph','telegraph.co.uk','Centre-droit']],
      'RIGHT-CENTER':[['The Guardian','theguardian.com','Centre-gauche'],['New York Times','nytimes.com','Centre-gauche'],['Washington Post','washingtonpost.com','Centre-gauche'],['NBC News','nbcnews.com','Centre-gauche']],
      'RIGHT':       [['New York Times','nytimes.com','Centre-gauche'],['The Guardian','theguardian.com','Centre-gauche'],['HuffPost','huffpost.com','Gauche'],['Mother Jones','motherjones.com','Gauche']],
    },
    de: {
      'LEFT':        [['Die Welt','welt.de','Centre-droit'],['Focus Online','focus.de','Centre-droit'],['Bild','bild.de','Centre-droit'],['FAZ','faz.net','Centre-droit']],
      'LEFT-CENTER': [['Die Welt','welt.de','Centre-droit'],['Focus Online','focus.de','Centre-droit'],['FAZ','faz.net','Centre-droit'],['Handelsblatt','handelsblatt.com','Centre-droit']],
      'LEAST BIASED':[['Der Spiegel','spiegel.de','Centre-gauche'],['Die Welt','welt.de','Centre-droit'],['Zeit Online','zeit.de','Centre-gauche'],['Focus','focus.de','Centre-droit']],
      'RIGHT-CENTER':[['Der Spiegel','spiegel.de','Centre-gauche'],['Zeit Online','zeit.de','Centre-gauche'],['Sueddeutsche Zeitung','sueddeutsche.de','Centre-gauche'],['Tagesschau','tagesschau.de','Centre']],
      'RIGHT':       [['Der Spiegel','spiegel.de','Centre-gauche'],['Die Tageszeitung','taz.de','Gauche'],['Zeit Online','zeit.de','Centre-gauche'],['Sueddeutsche Zeitung','sueddeutsche.de','Centre-gauche']],
    },
    es: {
      'LEFT':        [['El Mundo','elmundo.es','Centre-droit'],['ABC Espana','abc.es','Centre-droit'],['La Razon','larazon.es','Droite'],['La Vanguardia','lavanguardia.com','Centre-droit']],
      'LEFT-CENTER': [['El Mundo','elmundo.es','Centre-droit'],['ABC Espana','abc.es','Centre-droit'],['La Vanguardia','lavanguardia.com','Centre-droit'],['El Confidencial','elconfidencial.com','Centre-droit']],
      'LEAST BIASED':[['El Mundo','elmundo.es','Centre-droit'],['El Pais','elpais.com','Centre-gauche'],['La Vanguardia','lavanguardia.com','Centre-droit']],
      'RIGHT-CENTER':[['El Pais','elpais.com','Centre-gauche'],['elDiario.es','eldiario.es','Centre-gauche'],['Publico','publico.es','Gauche'],['ctxt.es','ctxt.es','Gauche']],
      'RIGHT':       [['El Pais','elpais.com','Centre-gauche'],['elDiario.es','eldiario.es','Centre-gauche'],['Publico','publico.es','Gauche']],
    },
    it: {
      'LEFT':        [['Corriere della Sera','corriere.it','Centre'],['La Stampa','lastampa.it','Centre-droit'],['Il Giornale','ilgiornale.it','Droite']],
      'LEFT-CENTER': [['Corriere della Sera','corriere.it','Centre'],['La Stampa','lastampa.it','Centre-droit'],['Il Sole 24 Ore','ilsole24ore.com','Centre-droit']],
      'LEAST BIASED':[['La Repubblica','repubblica.it','Centre-gauche'],['Corriere della Sera','corriere.it','Centre'],['Il Giornale','ilgiornale.it','Droite']],
      'RIGHT-CENTER':[['La Repubblica','repubblica.it','Centre-gauche'],['Il Manifesto','ilmanifesto.it','Gauche'],['Il Fatto Quotidiano','ilfattoquotidiano.it','Centre-gauche']],
      'RIGHT':       [['La Repubblica','repubblica.it','Centre-gauche'],['Il Manifesto','ilmanifesto.it','Gauche'],['Il Fatto Quotidiano','ilfattoquotidiano.it','Centre-gauche']],
    },
    nl: {
      'LEFT':        [['De Telegraaf','telegraaf.nl','Centre-droit'],['Algemeen Dagblad','ad.nl','Centre-droit']],
      'LEFT-CENTER': [['De Telegraaf','telegraaf.nl','Centre-droit'],['BNR','bnr.nl','Centre-droit']],
      'LEAST BIASED':[['De Telegraaf','telegraaf.nl','Centre-droit'],['NRC','nrc.nl','Centre-gauche'],['Trouw','trouw.nl','Centre-gauche']],
      'RIGHT-CENTER':[['De Volkskrant','volkskrant.nl','Centre-gauche'],['NRC','nrc.nl','Centre-gauche'],['Trouw','trouw.nl','Centre-gauche']],
      'RIGHT':       [['De Volkskrant','volkskrant.nl','Centre-gauche'],['NRC','nrc.nl','Centre-gauche'],['Trouw','trouw.nl','Centre-gauche']],
    },
    _default: {
      'LEFT':        [['Wall Street Journal','wsj.com','Centre-droit'],['The Telegraph','telegraph.co.uk','Centre-droit'],['National Review','nationalreview.com','Droite']],
      'LEFT-CENTER': [['Wall Street Journal','wsj.com','Centre-droit'],['The Times','thetimes.co.uk','Centre-droit'],['Fox Business','foxbusiness.com','Centre-droit']],
      'LEAST BIASED':[['Reuters','reuters.com','Centre'],['BBC','bbc.com','Centre-gauche'],['WSJ','wsj.com','Centre-droit']],
      'RIGHT-CENTER':[['Reuters','reuters.com','Centre'],['The Guardian','theguardian.com','Centre-gauche'],['New York Times','nytimes.com','Centre-gauche']],
      'RIGHT':       [['New York Times','nytimes.com','Centre-gauche'],['The Guardian','theguardian.com','Centre-gauche'],['The Intercept','theintercept.com','Gauche']],
    },
  };

  const LCOL = {
    'Gauche':'#c62828','Centre-gauche':'#e53935','Centre':'#546e7a',
    'Centre-droit':'#1976d2','Droite':'#0d47a1'
  };
  function lcol(lbl) {
    for (const [k,v] of Object.entries(LCOL)) if (lbl.includes(k)) return v;
    return '#888';
  }

  function normMbfc(bias) {
    if (!bias || !bias.mbfc) return 'LEAST BIASED';
    const m = bias.mbfc.toUpperCase();
    if (m.includes('CONSPIRACY') || m.includes('QUESTIONABLE')) return null;
    if (m.includes('LEFT-CENTER') || m.includes('LEFT CENTER')) return 'LEFT-CENTER';
    if (m.includes('LEFT')) return 'LEFT';
    if (m.includes('RIGHT-CENTER') || m.includes('RIGHT CENTER')) return 'RIGHT-CENTER';
    if (m.includes('RIGHT')) return 'RIGHT';
    return 'LEAST BIASED';
  }

  function gNewsUrl(keywords, domain) {
    return `https://www.google.com/search?q=${encodeURIComponent(keywords + ' site:' + domain)}&tbm=nws&hl=fr`;
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  const hostname = window.location.hostname;
  const bias     = getBiasForDomain(hostname);
  const title    = getArticleTitle();
  const imageUrl = getArticleImage();
  const lang     = detectLang();
  const publishedAt = getArticlePublishedAt();
  const kw       = extractKeywords(title);
  const mbfcCat  = normMbfc(bias);

  const langMap  = OPP[lang] || OPP['_default'];
  const oppArr   = mbfcCat ? (langMap[mbfcCat] || OPP['_default'][mbfcCat] || []).filter(([,d]) => !hostname.includes(d)) : [];

  const afpUrl   = kw ? gNewsUrl(kw, 'afp.com') : null;
  const oppLinks = kw ? oppArr.slice(0, 3).map(([name, domain, label]) => ({
    name, domain, label, url: gNewsUrl(kw, domain)
  })) : [];

  chrome.storage.local.set({
    lastBias:    { ...(bias||{}), domain: hostname, url: window.location.href },
    lastArticle: { title, imageUrl, lang, keywords: kw, afpSearchUrl: afpUrl, oppLinks, mbfcCat, domain: hostname, pageUrl: window.location.href, publishedAt, savedAt: Date.now() },
  });

  // 2minutes V2: aucune interface n’est injectée dans la page visitée.
  // La page est uniquement analysée; l’UI vit dans popup.html / explore.html.
  return;

})();

// 2minutes V2.1.2 — sélection sourcée robuste dans l’article lié.
// La sélection est mémorisée dès qu'elle est faite, avant l'ouverture de la popup.
(() => {
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const canonical = value => {
    try {
      const u = new URL(value);
      u.hash = '';
      ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach(k => u.searchParams.delete(k));
      u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
      if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/$/, '');
      return u.href;
    } catch { return String(value || ''); }
  };
  let lastSelection = '';

  function currentArticleImage() {
    const absolute = raw => {
      try {
        const u = new URL(String(raw || '').trim(), location.href);
        return /^https?:$/.test(u.protocol) ? u.href : '';
      } catch { return ''; }
    };
    const comparable = raw => {
      try {
        const u = new URL(raw, location.href);
        u.hash = '';
        u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
        if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/$/, '');
        return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}${u.search}`;
      } catch { return ''; }
    };
    const page = comparable(location.href);
    const canonicalPage = comparable(document.querySelector('link[rel="canonical"]')?.href || '');
    const valid = raw => {
      const href = absolute(raw);
      if (!href) return '';
      const cmp = comparable(href);
      if (cmp === page || (canonicalPage && cmp === canonicalPage)) return '';
      return href;
    };
    const selectors = [
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'meta[itemprop="image"]',
      'link[rel="image_src"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const value = valid(el?.getAttribute('content') || el?.getAttribute('href'));
      if (value) return value;
    }
    try {
      for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
        const data = JSON.parse(el.textContent || 'null');
        const stack = Array.isArray(data) ? [...data] : [data];
        while (stack.length) {
          const node = stack.shift();
          if (!node || typeof node !== 'object') continue;
          if (Array.isArray(node)) { stack.push(...node); continue; }
          const type = Array.isArray(node['@type']) ? node['@type'].join(' ') : String(node['@type'] || '');
          if (/Article|NewsArticle|ReportageNewsArticle|BlogPosting/i.test(type) && node.image) {
            const values = Array.isArray(node.image) ? node.image : [node.image];
            for (const item of values) {
              const value = typeof item === 'string' ? valid(item) : valid(item?.contentUrl) || valid(item?.url) || valid(item?.['@id']);
              if (value) return value;
            }
          }
          for (const value of Object.values(node)) if (value && typeof value === 'object') stack.push(value);
        }
      }
    } catch {}
    const imgs = [...document.querySelectorAll('article figure img, article picture img, article img, main figure img, main picture img, main img, [role="main"] img')]
      .filter(img => {
        const r = img.getBoundingClientRect();
        const w = Number(img.naturalWidth || img.width || r.width || 0);
        const h = Number(img.naturalHeight || img.height || r.height || 0);
        return w >= 300 && h >= 160 && !/logo|avatar|icon|sprite|author|profile/i.test(`${img.alt || ''} ${img.className || ''}`) && !!valid(img.currentSrc || img.src);
      })
      .sort((a,b) => (Number(b.naturalWidth||b.width||0)*Number(b.naturalHeight||b.height||0)) - (Number(a.naturalWidth||a.width||0)*Number(a.naturalHeight||a.height||0)));
    return valid(imgs[0]?.currentSrc || imgs[0]?.src || '');
  }

  function captureSelection() {
    const text = normalize(window.getSelection?.().toString());
    if (!text) return;
    const body = normalize(document.body?.innerText);
    if (!body.includes(text)) return;
    lastSelection = text;
    chrome.storage.local.set({
      twoMinutesLastSelection: {
        text,
        url: canonical(location.href),
        title: document.title,
        imageUrl: currentArticleImage(),
        savedAt: Date.now()
      }
    });
  }

  document.addEventListener('selectionchange', captureSelection, true);
  document.addEventListener('mouseup', captureSelection, true);
  document.addEventListener('keyup', captureSelection, true);

  // V2.2.4 : repérage non destructif du passage source dans l'article affiché.
  const HIGHLIGHT_NAME='two-minutes-current-point-of-view';
  let fallbackSelection=false;
  function clearPointHighlight(){
    try{CSS.highlights?.delete(HIGHLIGHT_NAME)}catch{}
    if(fallbackSelection){window.getSelection()?.removeAllRanges();fallbackSelection=false}
  }
  function displayPointHighlight(raw,expected){
    clearPointHighlight();
    const normUrl=u=>{try{const x=new URL(u);x.hash='';x.hostname=x.hostname.replace(/^www\./,'').toLowerCase();return x.href.replace(/\/$/,'')}catch{return''}};
    const canonicalPage=normUrl(document.querySelector('link[rel="canonical"]')?.href||location.href);
    if(expected&&normUrl(expected)!==normUrl(location.href)&&normUrl(expected)!==canonicalPage)return false;
    const search=String(raw||'').replace(/\s+/g,' ').trim();
    if(search.length<12)return false;
    const root=document.querySelector('article')||document.querySelector('main')||document.body;
    const iterator=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
      const el=node.parentElement;if(!el||!node.nodeValue?.trim()||el.closest('script,style,nav,footer,header,button,textarea,[aria-hidden="true"]'))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    let flattened='',positions=[],n;
    while((n=iterator.nextNode())&&flattened.length<1200000){
      const rawText=n.nodeValue||'';
      for(let i=0;i<rawText.length;i++){
        const ch=rawText[i];if(/\s/.test(ch)){
          if(flattened.endsWith(' '))continue;
          flattened+=' ';positions.push({node:n,offset:i});
        }else{flattened+=ch;positions.push({node:n,offset:i})}
      }
    }
    const normalized=str=>str.replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ').trim();
    const content=normalized(flattened),needle=normalized(search);
    // Les caractères typographiques restent inchangés; évite de surligner un faux passage.
    const index=content.indexOf(needle);
    if(index<0)return false;
    const leading=flattened.length-content.length&&flattened.startsWith(' ')?1:0;
    const a=positions[index+leading],b=positions[index+leading+needle.length-1];if(!a||!b)return false;
    const range=document.createRange();range.setStart(a.node,a.offset);range.setEnd(b.node,b.offset+1);
    if(globalThis.CSS?.highlights&&globalThis.Highlight){
      if(!document.getElementById('two-minutes-highlight-style')){
        const style=document.createElement('style');style.id='two-minutes-highlight-style';
        style.textContent='::highlight(two-minutes-current-point-of-view){background:rgba(255,193,71,.65);color:inherit}';document.documentElement.append(style);
      }
      CSS.highlights.set(HIGHLIGHT_NAME,new Highlight(range));
    }else{const sel=window.getSelection();sel?.removeAllRanges();sel?.addRange(range);fallbackSelection=true}
    const rect=range.getBoundingClientRect();
    window.scrollBy({top:rect.top-window.innerHeight*.35,behavior:'smooth'});
    return true;
  }
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === '2MIN_HIGHLIGHT_SOURCE_EXCERPT') {
      sendResponse({ok:displayPointHighlight(msg.text,msg.expectedUrl)});return;
    }
    if (msg?.type === '2MIN_GET_ARTICLE_META') {
      sendResponse({
        url: canonical(location.href),
        title: document.title,
        imageUrl: currentArticleImage()
      });
      return;
    }
    if (msg?.type !== '2MIN_GET_SELECTION') return;
    const current = normalize(window.getSelection?.().toString());
    const text = current || lastSelection;
    const body = normalize(document.body?.innerText);
    if (text) {
      sendResponse({ text, found: body.includes(text), url: canonical(location.href), title: document.title, imageUrl: currentArticleImage(), cached: !current });
      return;
    }
    chrome.storage.local.get('twoMinutesLastSelection', data => {
      const cached = data?.twoMinutesLastSelection;
      const sameUrl = canonical(cached?.url) === canonical(location.href);
      const cachedText = sameUrl ? normalize(cached?.text) : '';
      sendResponse({ text: cachedText, found: !!cachedText && body.includes(cachedText), url: canonical(location.href), title: document.title, imageUrl: currentArticleImage(), cached: true });
    });
    return true;
  });
})();
