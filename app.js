(()=>{'use strict';
const $=id=>document.getElementById(id), q=(s,r=document)=>Array.from(r.querySelectorAll(s));
const store=(k,v)=>{try{localStorage.setItem('tmweb_'+k,JSON.stringify(v))}catch{}};
const read=(k,f)=>{try{let v=JSON.parse(localStorage.getItem('tmweb_'+k));return v===null?f:v}catch{return f}};
const nativeLang=(navigator.language||'fr').slice(0,2);
const inferredCountry=(()=>{const locale=navigator.language||'fr-FR',region=locale.match(/[-_]([a-z]{2})$/i)?.[1]?.toUpperCase();if(region)return region;return ({fr:'FR',en:'GB',es:'ES',de:'DE',it:'IT',pt:'PT',nl:'NL',pl:'PL'})[nativeLang]||'FR'})();
let prefs=read('prefs',{theme:'auto',lang:nativeLang,period:'7',country:inferredCountry}),favs=new Set(read('favorites',[])),history=read('history',[]),current=null,view='home',mediaLimit=50,swWaiting=null;

const COMICS=[
  {src:'./comics/bd3-repetition.jpg',title:'Le biais de répétition'},
  {src:'./comics/bd2-autorite.jpg',title:'Le biais d’autorité'},
  {src:'./comics/bd4-omission.jpg',title:'Le biais d’omission'},
  {src:'./comics/bd5-emotionnel.jpg',title:'Le biais émotionnel'},
  {src:'./comics/bd1-cadrage.jpg',title:'Le biais de cadrage'},
  {src:'./comics/bd6-confirmation.jpg',title:'Le biais de confirmation'}
];
let comicIndex=0,comicTouchStartX=null;

const HELP_LINKS={
  chrome:'https://chromewebstore.google.com/',
  safari:'https://apps.apple.com/fr/mac/story/id1456414021'
};

const entries=Object.entries(BIAS_DATABASE).map(([domain,data])=>({domain,data,name:(data.desc||domain).split(' — ')[0].trim()||domain})).filter(x=>x.data&&[-4,-2,0,2,4].includes(Number(x.data.score))).sort((a,b)=>a.domain.localeCompare(b.domain));
const trustedUrl=raw=>{let u=new URL(raw);if(!['https:','http:'].includes(u.protocol)||!u.hostname.includes('.'))throw Error('Adresse Web non valide.');u.hash='';['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach(p=>u.searchParams.delete(p));u.hostname=u.hostname.toLowerCase().replace(/^www\./,'');if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/$/,'');return u.href};
const domain=url=>new URL(url).hostname.toLowerCase().replace(/^www\./,'');
const canonicalForDB=trustedUrl;
function safeText(node,txt){node.textContent=txt??''}
function node(tag,cls,content){let el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el}
const biasOf=d=>getBiasForDomain(d);
const colors={ '-4':'#c62828','-2':'#e53935','0':'#546e7a','2':'#1976d2','4':'#0d47a1'};
const labelFor=s=>({'-4':'Gauche','-2':'Centre-gauche','0':'Centre','2':'Centre-droit','4':'Droite'})[String(s)]||'Non déterminée';
function badge(b){let v=node('span','badge',b?labelFor(b.score):'Non déterminée');v.style.backgroundColor=b&&colors[String(b.score)]||'#64748b';return v}

function biasPosition(score){return ({'-4':0,'-2':25,'0':50,'2':75,'4':100})[String(score)]??50}
function compactScale(domainName){
 const info=biasOf(domainName), score=info?info.score:'unknown';
 const wrap=node('div','editorialScaleCompact');
 wrap.setAttribute('role','img');
 wrap.setAttribute('aria-label',domainName+' — orientation éditoriale '+(info?labelFor(score):'non déterminée'));
 const domainLabel=node('div','editorialScaleDomain',domainName);
 const barWrap=node('div','editorialScaleBarWrap');
 const bar=node('div','editorialScaleBar');
 const centerTick=node('span','editorialScaleCenterTick');
 const marker=node('span','editorialScaleMarker');
 marker.style.left=biasPosition(score)+'%';
 bar.append(centerTick,marker);
 const labels=node('div','editorialScaleLabels');
 labels.append(node('span','', 'Gauche'), node('span','', 'Centre'), node('span','', 'Droite'));
 barWrap.append(bar,labels);
 wrap.append(domainLabel,barWrap);
 return wrap;
}
function configureSupportLink(id,url){
 const el=$(id);if(!el)return;
 if(typeof url==='string'&&/^https?:\/\//.test(url)){el.href=url;el.classList.remove('disabled')}else{el.removeAttribute('href');el.classList.add('disabled');el.setAttribute('aria-disabled','true')}
}
function renderFavButton(domainName){const b=node('button','favButton',favs.has(domainName)?'★':'☆');b.type='button';b.title=favs.has(domainName)?'Retirer des favoris':'Ajouter aux favoris';b.setAttribute('aria-label',b.title);b.onclick=()=>{favs.has(domainName)?favs.delete(domainName):favs.add(domainName);store('favorites',[...favs]);renderMedia();renderFavorites();if(current)renderCurrentFav()};return b}
function show(page){view=page; q('.headtools .iconBtn').forEach(b=>b.classList.toggle('activePage',b.id===({home:'homeButton',media:'mediaButton',settings:'settingsButton'}[page]||''))); q('.page').forEach(x=>x.classList.toggle('hidden',x.id!==page));q('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===page));if(page==='media')renderMedia();if(page==='favorites')renderFavorites();if(page==='home')renderHistory();window.scrollTo({top:0,behavior:'instant'})}
q('[data-nav]').forEach(x=>x.addEventListener('click',()=>show(x.dataset.nav)));$('mediaButton').onclick=()=>show('media');$('homeButton').onclick=()=>show('home');$('settingsButton').onclick=()=>show('settings');
function renderMediaRow(x){let r=node('div','mediaRow'),fav=renderFavButton(x.domain),info=node('div','mediaInfo'),a=node('a','',x.name===x.domain?x.domain:x.name);a.href='https://'+x.domain+'/';a.target='_blank';a.rel='noopener noreferrer';let sub=node('p','',x.domain);info.append(a,sub);r.append(fav,info,badge(x.data));return r}
function mediaMatches(x){let txt=$('mediaSearch').value.toLowerCase().trim(),filter=$('biasFilter').value,country=$('mediaCountry').value;return (!txt||(x.domain+' '+x.name).toLowerCase().includes(txt))&&(filter==='all'||String(x.data.score)===filter)&&(country==='all'||String(x.data.country||'').toUpperCase()===country)}
function renderMedia(){renderFavorites();let matches=entries.filter(mediaMatches),out=$('mediaList');out.replaceChildren(...matches.slice(0,mediaLimit).map(renderMediaRow));$('mediaTotal').textContent=matches.length+' médias';$('loadMore').classList.toggle('hidden',matches.length<=mediaLimit)}
function renderFavorites(){let matching=entries.filter(x=>favs.has(x.domain));const out=$('favoriteList');out.replaceChildren(...matching.map(renderMediaRow));if(!matching.length)out.append(node('p','muted','Aucun média favori. Ajoutez-en depuis l’annuaire.'));const inline=$('mediaFavoriteList');inline.replaceChildren(...matching.map(renderMediaRow));if(!matching.length)inline.append(node('p','muted small','Aucun favori pour le moment. Cliquez sur ☆ à côté d’un média dans la liste pour l’ajouter.'))}
$('mediaSearch').oninput=()=>{mediaLimit=50;renderMedia()};$('biasFilter').onchange=()=>{mediaLimit=50;renderMedia()};$('mediaCountry').onchange=()=>{mediaLimit=50;renderMedia()};$('loadMore').onclick=()=>{mediaLimit+=50;renderMedia()};
const countryNames={FR:'France',GB:'Royaume-Uni',US:'États-Unis',DE:'Allemagne',CA:'Canada',ES:'Espagne',IT:'Italie',NL:'Pays-Bas',AU:'Australie',NZ:'Nouvelle-Zélande',PL:'Pologne',BE:'Belgique',CH:'Suisse',PT:'Portugal'};
const countries=[...new Set(entries.map(x=>x.data.country).filter(Boolean))].sort((a,b)=>(countryNames[a]||a).localeCompare(countryNames[b]||b,'fr'));
for(const c of countries){$('mediaCountry').add(new Option(countryNames[c]||c,c));$('preferredCountry').add(new Option(countryNames[c]||c,c));}
$('preferredCountry').add(new Option('Tous les pays','all'),0);
if(!prefs.country||!countries.includes(prefs.country)&&prefs.country!=='all'){prefs.country=countries.includes(inferredCountry)?inferredCountry:'all';store('prefs',prefs)}
$('preferredCountry').value=prefs.country;
$('mediaCountry').value=prefs.country;
$('preferredCountry').onchange=()=>{prefs.country=$('preferredCountry').value;store('prefs',prefs);$('mediaCountry').value=prefs.country;mediaLimit=50;renderMedia()};
function renderHistory(){let sec=$('recent'),out=$('recentList');sec.classList.add('hidden');out.replaceChildren();history.forEach((h,i)=>{let r=node('div','mediaRow'),info=node('div','mediaInfo'),a=node('button','subtle',h.title||h.url);a.style.textAlign='left';a.onclick=()=>analyze(h.url,h.title);info.append(a,node('p','',h.domain+' · '+new Date(h.date).toLocaleDateString(prefs.lang||'fr')));let del=node('button','subtle','×');del.setAttribute('aria-label','Supprimer de l’historique');del.onclick=()=>{history.splice(i,1);store('history',history);renderHistory()};r.append(info,del);out.append(r)})}
// Public latest articles: read-only RPC; never attempt direct access to revoked tables.
let latestCursor=0,latestRows=[],latestQuery='',latestPending=0;
const latestFilters={sourceBias:'all',viewBias:'all',sourceJournal:'all',viewJournal:'all'};
const latestFilterSelectors={sourceBias:'filterSourceBias',viewBias:'filterViewBias',sourceJournal:'filterSourceJournal',viewJournal:'filterViewJournal'};
function safeDomainValue(url){try{return domain(url)}catch{return ''}}
function biasKey(d){const bias=d&&biasOf(d);return bias?String(bias.score):'unknown'}
function relationDomain(rel){return (rel.domain||safeDomainValue(rel.url)||'').toLowerCase()}
function filteredRelations(item){let relations=Array.isArray(item.linked_articles)?item.linked_articles:[];return relations.filter(rel=>{
 const d=relationDomain(rel);
 return (latestFilters.viewBias==='all'||biasKey(d)===latestFilters.viewBias)&&(latestFilters.viewJournal==='all'||d===latestFilters.viewJournal)
})}
function selectedArticles(){return latestRows.filter(item=>{
 const d=(item.domain||safeDomainValue(item.url)||'').toLowerCase();
 if(latestFilters.sourceBias!=='all'&&biasKey(d)!==latestFilters.sourceBias)return false;
 if(latestFilters.sourceJournal!=='all'&&d!==latestFilters.sourceJournal)return false;
 if((latestFilters.viewBias!=='all'||latestFilters.viewJournal!=='all')&&!filteredRelations(item).length)return false;
 return true
})}
function updateFilterOptions(){
 const sourceDomains=new Set(),viewDomains=new Set();
 for(const item of latestRows){let d=(item.domain||safeDomainValue(item.url)||'').toLowerCase();if(d)sourceDomains.add(d);for(const r of item.linked_articles||[]){const rd=relationDomain(r);if(rd)viewDomains.add(rd)}}
 for(const [id,domains] of [['filterSourceJournal',sourceDomains],['filterViewJournal',viewDomains]]){
  const select=$(id),previous=select.value;select.replaceChildren(new Option('Tous les journaux','all'));
  [...domains].sort((a,b)=>a.localeCompare(b,'fr')).forEach(d=>select.add(new Option(d,d)));
  if([...select.options].some(o=>o.value===previous))select.value=previous;else{select.value='all';latestFilters[id==='filterSourceJournal'?'sourceJournal':'viewJournal']='all'}
 }
 for(const id of ['filterSourceBias','filterViewBias']){
  const select=$(id),previous=select.value;select.replaceChildren(new Option('Toutes les orientations','all'));
  for(const [v,label] of [['-4','Gauche'],['-2','Centre-gauche'],['0','Centre'],['2','Centre-droit'],['4','Droite'],['unknown','Non déterminée']])select.add(new Option(label,v));
  select.value=previous;
 }
}
const latestFilterButton=$('latestFilterButton'),latestFilterPanel=$('latestFilterPanel');
latestFilterButton.onclick=()=>{const nowClosed=latestFilterPanel.classList.toggle('hidden');latestFilterButton.setAttribute('aria-expanded',String(!nowClosed));latestFilterButton.classList.toggle('active',!nowClosed)};
for(const [field,id] of Object.entries(latestFilterSelectors))$(id).onchange=()=>{latestFilters[field]=$(id).value;latestCursor=10;renderLatest();latestFilterButton.classList.toggle('hasFilters',Object.values(latestFilters).some(v=>v!=='all'))};
$('latestFilterReset').onclick=()=>{for(const [field,id] of Object.entries(latestFilterSelectors)){latestFilters[field]='all';$(id).value='all'};latestCursor=10;latestFilterButton.classList.remove('hasFilters');renderLatest()};
async function fetchLatest(query){const cfg=globalThis.TWOMINUTES_COMMUNITY||{};if(!cfg.supabaseUrl||!cfg.supabaseAnonKey)throw Error('Connexion communautaire non configurée.');
 const endpoint=cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/rpc/';const headers={apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+cfg.supabaseAnonKey,'Content-Type':'application/json'};
 const body=JSON.stringify({p_search:query,p_limit:50});
 let response=await fetch(endpoint+'list_recent_articles_public_v2',{method:'POST',headers,body});
 if(!response.ok&&[404,400].includes(response.status)){response=await fetch(endpoint+'list_recent_articles_public_v1',{method:'POST',headers,body});}
 if(!response.ok){if([404,400].includes(response.status))throw Error('La liste publique des articles nécessite l’activation de la fonction SQL fournie.');throw Error('Impossible de charger les derniers articles ('+response.status+').')}
 const data=await response.json();if(!Array.isArray(data))throw Error('Réponse inattendue du serveur.');return data;
}
function validArticleImage(raw,articleUrl){
 if(typeof raw!=='string'||!raw.trim()||raw.length>4000)return null;
 try {const u=new URL(raw.trim()),a=new URL(articleUrl);
  if(!['https:','http:'].includes(u.protocol)||!u.hostname.includes('.'))return null;
  const cmp=x=>(x.hostname.toLowerCase().replace(/^www\./,'')+x.pathname.replace(/\/$/,'')).toLowerCase();
  if(cmp(u)===cmp(a))return null;
  return u.href;
 }catch{return null}
}
function appendArticleImage(target,raw,articleUrl,cssClass='articleImage'){
 const wrapper=node('div',cssClass),url=validArticleImage(raw,articleUrl);
 const fallback=node('span','imageFallback',url?'Image indisponible':'Aucune photo enregistrée');wrapper.append(fallback);
 if(url){
   const img=document.createElement('img');img.alt='Illustration de l’article';img.loading='lazy';img.decoding='async';
   // Ne pas imposer referrerPolicy=no-referrer : certains éditeurs bloquent les images sans Referer.
   img.addEventListener('load',()=>{fallback.hidden=true;wrapper.classList.add('imageLoaded')});
   img.addEventListener('error',()=>{img.remove();fallback.hidden=false;fallback.textContent='Image inaccessible';wrapper.classList.add('imageError')});
   wrapper.append(img);img.src=url;
 }
 target.append(wrapper);return wrapper;
}
function trustedArticleLink(a,url){try{let u=new URL(url);if(!['http:','https:'].includes(u.protocol))throw Error();a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return true}catch{a.removeAttribute('href');return false}}
function publicBias(domainName){const b=biasOf(domainName);return b?labelFor(b.score):'Orientation non déterminée'}
function latestCard(item){
 const card=node('article','latestCard'),head=node('div','latestCardHeader');
 const visual=node('div','latestThumb'),intro=node('div','latestIntro');
 const imageUrl=validArticleImage(item.image_url,item.url);
 if(imageUrl){const imgLink=node('a','latestImageLink');if(trustedArticleLink(imgLink,item.url)){appendArticleImage(imgLink,imageUrl,item.url,'latestImage');visual.append(imgLink)}else appendArticleImage(visual,imageUrl,item.url,'latestImage')}
 else appendArticleImage(visual,null,item.url,'latestImage');
 const tit=node('h3','latestTitle'),link=node('a','',item.title||'Article sans titre');
 trustedArticleLink(link,item.url);tit.append(link);
 const sourceDomain=item.domain||domain(item.url);
 const sub=compactScale(sourceDomain);
 const dated=node('p','latestDate','Dernière contribution : '+(item.last_linked_at?new Date(item.last_linked_at).toLocaleDateString(prefs.lang||'fr'):'date inconnue'));
 intro.append(tit,sub,dated);head.append(visual,intro);card.append(head);
 const relations=filteredRelations(item);
 if(relations.length){
  const group=node('div','latestPointsGroup');
  const section=node('section','latestLinked');
  const expand=node('button','latestExpand');
  const expandLabel=node('span','latestExpandLabel');
  const expandIcon=node('span','latestExpandIcon');
  expandIcon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const panelId='linked-'+Math.random().toString(36).slice(2);
  // Les points de vue sont fermés par défaut sur tous les écrans.
  const setExpanded=expanded=>{
    section.hidden=!expanded;
    expand.setAttribute('aria-expanded',String(expanded));
    expandLabel.textContent=(expanded?'Masquer':'Voir')+' '+relations.length+' autre'+(relations.length>1?'s':'')+' point'+(relations.length>1?'s':'')+' de vue';
    expandIcon.classList.toggle('isExpanded',expanded);
  };
  expand.type='button';expand.setAttribute('aria-controls',panelId);
  expand.setAttribute('aria-label','Afficher ou masquer les autres points de vue');
  expand.append(expandLabel,expandIcon);
  expand.onclick=()=>setExpanded(section.hidden);
  section.id=panelId;
  
  const list=node('ul','latestRelations'+(relations.length>1?' latestRelationsScrollable':''));if(relations.length>1){list.setAttribute('aria-label','Points de vue, défilement horizontal');list.tabIndex=0;}
  for(const rel of relations){
   const li=node('li','latestRelation'),row=node('div','relatedRow'),information=node('div','relatedText');
   appendArticleImage(row,rel.image_url,rel.url,'relatedImage');
   const a=node('a','relatedTitle',rel.title||rel.domain||'Article lié');trustedArticleLink(a,rel.url);information.append(a);
   const relatedDomain=rel.domain||domain(rel.url);const relatedMeta=node('p','latestDetails',relatedDomain+' · '+publicBias(relatedDomain));
   const rb=biasOf(relatedDomain);if(rb){const dot=node('span','editorialDot');dot.style.backgroundColor=colors[String(rb.score)]||'#64748b';dot.setAttribute('aria-hidden','true');relatedMeta.prepend(dot)}information.append(relatedMeta);
   if(rel.excerpt){
    information.append(node('span','latestExcerpt','« '+rel.excerpt+' »'));
    information.append(node('div','latestVotes','↑ '+Number(rel.upvotes||0)+' pertinents · ↓ '+Number(rel.downvotes||0)+' hors sujet'));
   }else information.append(node('span','latestNoExcerpt','Aucun passage sélectionné pour cet article lié.'));
   row.append(information);li.append(row);list.append(li);
  }
  section.append(list);group.append(expand,section);card.append(group);setExpanded(false);
 }else if(!(Array.isArray(item.linked_articles)&&item.linked_articles.length))card.append(node('p','muted small','Aucun article lié disponible.'));
 return card;
}
function renderLatest(){
 const matching=selectedArticles(),out=$('latestList');
 out.replaceChildren(...matching.slice(0,latestCursor).map(latestCard));
 $('latestMore').classList.toggle('hidden',matching.length<=latestCursor);
 if(!matching.length)$('latestStatus').textContent='Aucun article correspondant aux critères sélectionnés.';
 else $('latestStatus').textContent=matching.length+' article(s) trouvé(s) · les passages affichés sont les plus plébiscités parmi ceux disponibles.';
}
async function loadLatest(query=''){
 const request=++latestPending;latestQuery=query;$('latestStatus').textContent='Chargement…';$('latestList').replaceChildren();$('latestMore').classList.add('hidden');
 try{const rows=await fetchLatest(query);if(request!==latestPending)return;latestRows=rows;latestCursor=10;updateFilterOptions();renderLatest()}
 catch(error){if(request!==latestPending)return;latestRows=[];latestCursor=0;$('latestStatus').textContent=error.message}
}
let latestDebounce; $('latestSearch').addEventListener('input',()=>{clearTimeout(latestDebounce);latestDebounce=setTimeout(()=>loadLatest($('latestSearch').value.trim()),350)});$('latestMore').onclick=()=>{latestCursor=Math.min(latestCursor+10,selectedArticles().length);renderLatest()};
$('clearHistory').onclick=()=>{history=[];store('history',history);renderHistory()};
function record(url,title){history=[{url,title,domain:domain(url),date:Date.now()},...history.filter(h=>h.url!==url)].slice(0,20);store('history',history)}
function renderCurrentFav(){if(!current)return;const b=$('favoriteCurrent');b.textContent=favs.has(current.domain)?'★ Retirer des favoris':'☆ Ajouter aux favoris';b.onclick=()=>{favs.has(current.domain)?favs.delete(current.domain):favs.add(current.domain);store('favorites',[...favs]);renderCurrentFav();renderFavorites();renderMedia()}}
async function community(url){let cfg=globalThis.TWOMINUTES_COMMUNITY||{};if(!cfg.supabaseUrl||!cfg.supabaseAnonKey)throw Error('Connexion communautaire non configurée.');const root=cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/rpc/';const headers={apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+cfg.supabaseAnonKey,'Content-Type':'application/json'};const body=JSON.stringify({p_page_url:url});
 let r=await fetch(root+'list_article_views_v3',{method:'POST',headers,body});if(!r.ok&&[404,400].includes(r.status))r=await fetch(root+'list_article_views_v2',{method:'POST',headers,body});if(!r.ok)throw Error('Service communautaire temporairement indisponible ('+r.status+').');let data=await r.json();if(!Array.isArray(data))throw Error('Réponse communautaire inattendue.');return data}
async function articleMetadata(url){const cfg=globalThis.TWOMINUTES_COMMUNITY||{};if(!cfg.supabaseUrl||!cfg.supabaseAnonKey)return null;try{const r=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/rpc/get_public_article_metadata_v1',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({p_url:url})});if(!r.ok)return null;const rows=await r.json();return Array.isArray(rows)?rows[0]||null:null}catch{return null}}

function renderContributions(items){const out=$('communityCards');out.replaceChildren();let groups=new Map();for(let x of items){if(!x.other_url)continue;let g=groups.get(x.other_url)||[];g.push(x);groups.set(x.other_url,g)}$('communityCount').textContent=groups.size?groups.size+' article(s) lié(s)':'';if(!groups.size){$('communityStatus').textContent='Aucun article lié pour le moment. Vous pouvez explorer d’autres sources.';return}$('communityStatus').textContent='';
 for(const [url,group] of groups){const card=node('article','contribution'),d=domain(url),b=biasOf(d),head=node('div','contributionHead'),text=node('div','contributionText'),h=node('h3','',group[0].other_title||d),link=node('a','','Lire l’article lié ↗');trustedArticleLink(link,url);appendArticleImage(head,group[0].other_image_url,url,'contributionImage');text.append(badge(b),h,node('p','muted small',d),link);head.append(text);card.append(head);for(const x of group){if(!x.excerpt)continue;card.append(node('blockquote','',x.excerpt));let meta=node('div','meta');meta.append(node('span','',x.confirmed?'✓ Confirmé':'Proposé — pas encore confirmé'),node('span','','↑ '+(x.upvotes||0)+' pertinent(s)'),node('span','','↓ '+(x.downvotes||0)+' hors sujet'));card.append(meta)}out.append(card)}
}

// CORS: a static GitHub Pages app cannot read arbitrary newspaper metadata.
// Prefer a real title supplied by sharing or entered by the user; URL slugs are suggestions only.
const STOP_WORDS=new Set('avec après avant aussi cette celui celles cette dans depuis donc elle elles entre être faire leurs mais même nous pour plus sous sont sur tout tous toute vers vous votre notre article actualites actualite news politique france français francais monde lemonde html html5 index amp story post publication direct live'.split(' '));
function topicWords(value){return (value||'').normalize('NFKC').replace(/[’']/g,' ').replace(/[^\p{L}\p{N}\s-]/gu,' ').split(/[\s-]+/).map(x=>x.trim()).filter(x=>x.length>=3&&!STOP_WORDS.has(x.toLocaleLowerCase('fr'))&&!/^\d+$/.test(x)).slice(0,5).join(' ')}
function slugSuggestion(url){try{const u=new URL(url),parts=u.pathname.split('/').filter(Boolean);const slug=decodeURIComponent(parts.at(-1)||'').replace(/\.(html?|php|aspx?)$/i,'').replace(/^(?:article|news|story)-/i,'');const result=topicWords(slug);return result.split(' ').length>=2?result:''}catch{return ''}}
function suggestKeywords(){const title=current?.realTitle||'';return title?topicWords(title):slugSuggestion(current?.url||'')}
function sourceCandidates(){if(!current)return[];const from=entries.find(x=>x.domain===current.domain);const country=from?.data.country||'FR',language=from?.data.language||'fr';let same=entries.filter(x=>x.domain!==current.domain && x.data.language===language && x.data.country===country);
if(same.length<5)same=entries.filter(x=>x.domain!==current.domain && x.data.language===language);
const score=current.bias?Number(current.bias.score):0;
const buckets={opposite:[],center:[],other:[]};
for(const x of same){const v=Number(x.data.score);if(v===0)buckets.center.push(x);else if(score!==0&&Math.sign(v)!==Math.sign(score))buckets.opposite.push(x);else buckets.other.push(x)}
// Stable, curated preference for familiar publishers in the same language and country,
// not alphabetical order or claimed search relevance.
const preferred=['lefigaro.fr','lesechos.fr','liberation.fr','lemonde.fr','mediapart.fr','humanite.fr','france24.com','20minutes.fr','bfmtv.com','afp.com','reuters.com','apnews.com','theguardian.com','bbc.com'];
const sort=b=>b.sort((x,y)=>{const ix=preferred.indexOf(x.domain),iy=preferred.indexOf(y.domain);return (ix<0?999:ix)-(iy<0?999:iy)||x.domain.localeCompare(y.domain)});
Object.values(buckets).forEach(sort);
let selected=[],seen=new Set();const add=x=>{if(x&&!seen.has(x.domain)){selected.push(x);seen.add(x.domain)}};
// Opposite sources first where available; center as a cross-check; then varied perspectives.
buckets.opposite.slice(0,2).forEach(add);buckets.center.slice(0,2).forEach(add);
const all=[...buckets.other,...buckets.opposite.slice(2),...buckets.center.slice(2)];
for(const target of [-4,-2,2,4,0])add(all.find(x=>Number(x.data.score)===target));
for(const x of [...all,...buckets.opposite,...buckets.center]){if(selected.length>=9)break;add(x)}
return selected.slice(0,9)}
function searchLink(host){const words=topicWords($('keywords').value);if(!words)return null;let span=$('period').value,query=words+' site:'+host;if(span!=='all'){const d=new Date();d.setDate(d.getDate()-Number(span));query+=' after:'+d.toISOString().slice(0,10)}return 'https://www.google.com/search?q='+encodeURIComponent(query)}
function renderSearchSources(){const out=$('searchOutlets');out.replaceChildren();const kw=topicWords($('keywords').value);$('keywordStatus').textContent=!kw?'Saisissez des mots-clés relatifs au sujet pour activer les recherches.':(current?.realTitle?'Mots-clés proposés à partir du titre fourni, modifiables.':'Proposition issue de l’URL uniquement : vérifiez et corrigez les mots-clés avant la recherche.');
for(const x of sourceCandidates()){const a=node('a','outletItem');const name=node('strong','',x.name);const sub=node('span','outletMeta',labelFor(x.data.score)+' · '+x.domain);a.append(name,sub);const link=searchLink(x.domain);if(link){a.href=link;a.target='_blank';a.rel='noopener noreferrer';a.title='Chercher ces mots-clés sur '+x.name}else{a.removeAttribute('href');a.classList.add('outletDisabled');a.title='Saisissez des mots-clés pour activer la recherche'}out.append(a)}
if(!out.children.length)out.append(node('p','muted','Aucun média correspondant à la langue du média source dans le référentiel.'))}
$('exploreButton').onclick=()=>{if(!current)return;$('exploreContent').classList.remove('hidden');if(!$('keywords').value)$('keywords').value=suggestKeywords();renderSearchSources()};
$('keywords').oninput=renderSearchSources;$('period').onchange=()=>{prefs.period=$('period').value;store('prefs',prefs);renderSearchSources()};
$('articleTitleInput').onchange=()=>{if(!current)return;current.realTitle=$('articleTitleInput').value.trim();current.title=current.realTitle||current.domain;$('articleHeadline').textContent=current.realTitle||'Article sur '+current.domain;record(current.url,current.title);if(!$('exploreContent').classList.contains('hidden')){$('keywords').value=suggestKeywords();renderSearchSources()}};
async function analyze(raw,title=''){let url;try{url=canonicalForDB(raw)}catch{$('articleUrl').setCustomValidity('Veuillez saisir une URL http(s) valide.');$('articleUrl').reportValidity();return}$('articleUrl').setCustomValidity('');const d=domain(url),b=biasOf(d);current={url,domain:d,bias:b,realTitle:title&&title!==d?title:'',title:title||d};$('articleTitleInput').value=current.realTitle;$('articleMainImage').replaceChildren();$('articleHeadline').textContent=current.title===d?'Article sur '+d:current.title;$('articleDomain').textContent=d;const orient=$('articleBias');orient.textContent=b?labelFor(b.score):'Média non répertorié — orientation non déterminée';orient.style.backgroundColor=b&&colors[String(b.score)]||'#64748b';$('originalLink').href=url;$('communityStatus').textContent='Recherche des contributions existantes…';$('communityCards').replaceChildren();$('communityCount').textContent='';$('exploreContent').classList.add('hidden');$('keywords').value='';$('period').value=prefs.period||'7';renderCurrentFav();record(url,current.title);show('analysis');articleMetadata(url).then(m=>{if(current?.url!==url||!m)return;if(m.title&&!current.realTitle){current.realTitle=m.title;current.title=m.title;$('articleHeadline').textContent=m.title;$('articleTitleInput').value=m.title;record(url,m.title)}appendArticleImage($('articleMainImage'),m.image_url,url,'mainArticleImage')});try{let rows=await community(url);if(current?.url===url)renderContributions(rows)}catch(e){if(current?.url===url)$('communityStatus').textContent=e.message+' Vous pouvez néanmoins explorer d’autres sources.'}}

// The URL-help tooltip is a centered overlay on all screen sizes.
const urlHelp=document.querySelector('.urlHelp');
document.addEventListener('pointerdown',event=>{
  if(urlHelp.open && !event.target.closest('.urlHelpText') && !event.target.closest('.urlHelp > summary')) urlHelp.open=false;
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&urlHelp.open){urlHelp.open=false;event.preventDefault()}
});

$('articleForm').onsubmit=e=>{e.preventDefault();analyze($('articleUrl').value)};$('articleUrl').addEventListener('input',()=> $('articleUrl').setCustomValidity(''));
function setTheme(){let dark=prefs.theme==='dark'||prefs.theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches;document.body.dataset.theme=dark?'dark':'light'}$('themeSelect').value=prefs.theme||'auto';$('themeSelect').onchange=()=>{prefs.theme=$('themeSelect').value;store('prefs',prefs);setTheme()};matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',setTheme);setTheme();
$('defaultPeriod').value=prefs.period||'7';$('defaultPeriod').onchange=()=>{prefs.period=$('defaultPeriod').value;store('prefs',prefs)};
const languageNames={fr:'Français',en:'English',es:'Español',de:'Deutsch',it:'Italiano',pt:'Português',nl:'Nederlands',pl:'Polski'};for(let l of TWO_MIN_LANGS){$('uiLanguage').add(new Option(languageNames[l]||l,l))};$('uiLanguage').value=TWO_MIN_LANGS.includes(prefs.lang)?prefs.lang:'fr';$('uiLanguage').onchange=()=>{prefs.lang=$('uiLanguage').value;store('prefs',prefs);setUILang(prefs.lang);applyLang()};function applyLang(){setUILang(prefs.lang);document.documentElement.lang=UI_LANG;$('heroSub').textContent='Mais d’abord…';$('exploreButton').textContent=T('perspective')+' →';}applyLang();

function showComic(index){comicIndex=(index+COMICS.length)%COMICS.length;const item=COMICS[comicIndex];$('comicImage').src=item.src;$('comicImage').alt=item.title;$(`comicCounter`).textContent=item.title+' · '+(comicIndex+1)+' / '+COMICS.length;}
function openComic(index=0){const dialog=$('comicDialog');if(!dialog.open){dialog.showModal();}showComic(index)}
$('comicButton').onclick=()=>openComic(0);$('comicPrev').onclick=()=>showComic(comicIndex-1);$('comicNext').onclick=()=>showComic(comicIndex+1);$('comicDialog').addEventListener('click',e=>{const rect=$('comicDialog').getBoundingClientRect();if(e.target===$('comicDialog')&&(e.clientY<rect.top||e.clientY>rect.bottom||e.clientX<rect.left||e.clientX>rect.right))$('comicDialog').close()});
$('comicTrack').addEventListener('touchstart',e=>{comicTouchStartX=e.changedTouches[0].clientX},{passive:true});
$('comicTrack').addEventListener('touchend',e=>{if(comicTouchStartX===null)return;const dx=e.changedTouches[0].clientX-comicTouchStartX;if(Math.abs(dx)>45)showComic(comicIndex+(dx<0?1:-1));comicTouchStartX=null},{passive:true});
$('comicDialog').addEventListener('keydown',e=>{if(!$('comicDialog').open)return;if(e.key==='ArrowLeft')showComic(comicIndex-1);if(e.key==='ArrowRight')showComic(comicIndex+1)});

const openChiracVideo=()=>{const dialog=$('videoDialog');const video=$('chiracVideo');dialog.showModal();video.currentTime=0;const attempt=video.play();if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>{ /* Browser may require a second tap on Play */ });};$('logoVideo').onclick=openChiracVideo;$('tvVideoButton').onclick=openChiracVideo;$('closeVideo').onclick=()=>{const video=$('chiracVideo');video.pause();video.currentTime=0;$('videoDialog').close()};$('videoDialog').addEventListener('close',()=>{const video=$('chiracVideo');video.pause();video.currentTime=0;});
configureSupportLink('helpChromeLink',HELP_LINKS.chrome);configureSupportLink('helpSafariLink',HELP_LINKS.safari);
const openHelpDialog=()=>{$('helpDialog').showModal()};$('helpButton').onclick=openHelpDialog;$('closeHelp').onclick=()=>$('helpDialog').close();$('helpDialog').addEventListener('click',e=>{const dlg=$('helpDialog');const rect=dlg.getBoundingClientRect();if(e.target===dlg&&(e.clientY<rect.top||e.clientY>rect.bottom||e.clientX<rect.left||e.clientX>rect.right))dlg.close()});
const params=new URLSearchParams(location.search);let shared=params.get('url')||params.get('text')||'';if(shared){let found=shared.match(/https?:\/\/[^\s]+/);if(found){$('articleUrl').value=found[0];analyze(found[0],params.get('title')||'');window.history.replaceState(null,'',location.pathname)}}
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').then(reg=>{if(reg.waiting)offerUpdate(reg.waiting);reg.addEventListener('updatefound',()=>{let w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)offerUpdate(w)})})}).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload())}
function offerUpdate(worker){swWaiting=worker;$('updateBanner').classList.remove('hidden')}$('applyUpdate').onclick=()=>{if(swWaiting)swWaiting.postMessage({type:'SKIP_WAITING'})};$('hideUpdate').onclick=()=>$('updateBanner').classList.add('hidden');
renderHistory();loadLatest();})();