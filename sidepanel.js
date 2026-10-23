const $ = s => document.querySelector(s);
let pending = null;
let activeTab = null;
let selected = '';
let refreshBusy = false;
let publishing = false;
let completed = false;

const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
const canonical = raw => {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return String(raw || '');
    u.hash = '';
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach(k => u.searchParams.delete(k));
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/$/, '');
    return u.href;
  } catch {
    return String(raw || '');
  }
};

function setPreview(text, ok, msg) {
  selected = normalize(text);
  const p = $('#preview'), st = $('#status'), btn = $('#publish');
  p.textContent = selected ? `“${selected}”` : 'Sélectionnez un passage dans l’article.';
  p.classList.toggle('empty', !selected);
  st.textContent = msg || '';
  st.classList.toggle('error', !ok && !!msg);
  btn.disabled = !ok;
}

async function currentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function targetTab() {
  const id = Number(pending?.stage==='SOURCE_SELECTION'||pending?.stage==='SOURCE_EDIT'?pending?.sourceTabId:pending?.targetTabId);
  if (Number.isInteger(id)) {
    try { return await chrome.tabs.get(id); } catch (_) {}
  }
  return currentTab();
}

function tabMatchesPending(tab) {
  if (!tab?.id || !pending) return false;
  const expectedId = Number(pending.stage==='SOURCE_SELECTION'||pending.stage==='SOURCE_EDIT' ? pending.sourceTabId : pending.targetTabId);
  // V2.1.31: once the workflow has armed a concrete tab, the tab identity is
  // authoritative. This survives www/redirect/tracking URL differences.
  if (Number.isInteger(expectedId)) return tab.id === expectedId;
  return canonical(tab.url) === canonical(pending.stage==='SOURCE_SELECTION'||pending.stage==='SOURCE_EDIT'?pending.sourceUrl:pending.targetUrl);
}

async function directSelection(tabId) {
  try {
    const out = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const norm = v => String(v || '').replace(/\s+/g, ' ').trim();
        const text = norm(window.getSelection?.().toString());
        const body = norm(document.body?.innerText);
        const absolute = raw => {
          try {
            const u = new URL(String(raw || '').trim(), location.href);
            return /^https?:$/.test(u.protocol) ? u.href : '';
          } catch (_) { return ''; }
        };
        const comparable = raw => {
          try {
            const u = new URL(raw, location.href);
            u.hash = '';
            u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
            if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/$/, '');
            return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}${u.search}`;
          } catch (_) { return ''; }
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
          if (typeof value === 'object') return valid(value.contentUrl) || valid(value.url) || valid(value['@id']);
          return '';
        };

        let imageUrl = '';
        for (const sel of [
          'meta[property="og:image:secure_url"]',
          'meta[property="og:image"]',
          'meta[property="og:image:url"]',
          'meta[name="twitter:image"]',
          'meta[name="twitter:image:src"]',
          'meta[itemprop="image"]',
          'link[rel="image_src"]'
        ]) {
          const el = document.querySelector(sel);
          const value = valid(el?.getAttribute('content') || el?.getAttribute('href'));
          if (value) { imageUrl = value; break; }
        }

        if (!imageUrl) {
          try {
            for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
              const data = JSON.parse(el.textContent || 'null');
              const stack = Array.isArray(data) ? [...data] : [data];
              while (stack.length && !imageUrl) {
                const node = stack.shift();
                if (!node || typeof node !== 'object') continue;
                if (Array.isArray(node)) { stack.push(...node); continue; }
                const type = Array.isArray(node['@type']) ? node['@type'].join(' ') : String(node['@type'] || '');
                if (/Article|NewsArticle|ReportageNewsArticle|BlogPosting/i.test(type)) {
                  imageUrl = imageValue(node.image || node.thumbnailUrl || node.primaryImageOfPage);
                }
                if (!imageUrl) for (const value of Object.values(node)) if (value && typeof value === 'object') stack.push(value);
              }
              if (imageUrl) break;
            }
          } catch (_) {}
        }

        if (!imageUrl) {
          const candidates = [...document.querySelectorAll('article figure img, article picture img, article img, main figure img, main picture img, main img, [role="main"] img')]
            .filter(img => {
              const rect = img.getBoundingClientRect();
              const w = Number(img.naturalWidth || img.width || rect.width || 0);
              const h = Number(img.naturalHeight || img.height || rect.height || 0);
              const desc = `${img.alt || ''} ${img.className || ''}`.toLowerCase();
              return w >= 300 && h >= 160 && !/logo|avatar|icon|sprite|author|profile/.test(desc) && !!valid(img.currentSrc || img.src);
            })
            .sort((a,b) => (Number(b.naturalWidth||b.width||0)*Number(b.naturalHeight||b.height||0)) - (Number(a.naturalWidth||a.width||0)*Number(a.naturalHeight||a.height||0)));
          imageUrl = valid(candidates[0]?.currentSrc || candidates[0]?.src || '');
        }

        return {
          text,
          found: !!text && body.includes(text),
          url: location.href,
          title: document.title,
          imageUrl,
          direct: true
        };
      }
    });
    return out?.[0]?.result || null;
  } catch (_) {
    return null;
  }
}

async function messageSelection(tabId) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, { type: '2MIN_GET_SELECTION' }, r => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(r || null);
    });
  });
}

async function cachedSelection() {
  const d = await chrome.storage.local.get('twoMinutesLastSelection');
  return d?.twoMinutesLastSelection || null;
}

async function readSelection(tab) {
  // Prefer the page content listener, but do not depend on it. The side panel
  // also reads window.getSelection() directly from the exact target tab.
  let r = await messageSelection(tab.id);
  if (!normalize(r?.text)) {
    const direct = await directSelection(tab.id);
    if (normalize(direct?.text)) r = direct;
  }
  if (normalize(r?.text)) {
    const cache = {
      text: normalize(r.text),
      url: r.url || tab.url || pending?.targetUrl || '',
      title: r.title || tab.title || '',
      imageUrl: r.imageUrl || '',
      savedAt: Date.now(),
      targetTabId: tab.id
    };
    // Keep a stable copy because clicking the side panel may clear the visual
    // selection in the article.
    chrome.storage.local.set({ twoMinutesLastSelection: cache }).catch(() => {});
    return { ...r, ...cache, found: r.found !== false };
  }
  const cached = await cachedSelection();
  const cachedTabId = Number(cached?.targetTabId);
  if (normalize(cached?.text) && (!Number.isInteger(cachedTabId) || cachedTabId === tab.id)) return cached;
  return r || null;
}

async function refreshSelection() {
  if (refreshBusy || !pending) return;
  refreshBusy = true;
  try {
    activeTab = await targetTab();
    if (!activeTab?.id) return setPreview('', false, 'Article cible non disponible.');
    if (!tabMatchesPending(activeTab)) return setPreview('', false, 'Ouvrez l’article lié pour sélectionner un passage.');

    const r = await readSelection(activeTab);
    const text = normalize(r?.text);
    const tooLong = text.length > 600;
    const tooShort = text.length > 0 && text.length < 12;
    // With an armed targetTabId, provenance is guaranteed by the tab itself.
    const expectedTabId=Number(pending.stage==='SOURCE_SELECTION'||pending.stage==='SOURCE_EDIT'?pending.sourceTabId:pending.targetTabId);
    const expectedUrl=pending.stage==='SOURCE_SELECTION'||pending.stage==='SOURCE_EDIT'?pending.sourceUrl:pending.targetUrl;
    const sameSource = Number.isInteger(expectedTabId)
      ? activeTab.id === expectedTabId && (!r?.url||canonical(r.url)===canonical(activeTab.url)||canonical(r.url)===canonical(expectedUrl))
      : canonical(r?.url || activeTab.url) === canonical(expectedUrl);
    const found = r?.found !== false;
    const ok = !!text && found && sameSource && !tooLong && !tooShort;

    let msg = '';
    if (tooLong) msg = 'Sélection trop longue — 600 caractères maximum.';
    else if (tooShort) msg = 'Sélection trop courte.';
    else if (text && !sameSource) msg = 'Cette sélection provient d’un autre article.';
    else if (text && !found) msg = 'Le passage sélectionné n’a pas pu être vérifié dans la page.';
    else if (ok) msg = `${text.length} caractères — prêt à ajouter.`;
    setPreview(text, ok, msg);
    if(pending?.stage==='TARGET_SELECTION' || pending?.stage==='TARGET_EDIT') $('#publish').textContent='Continuer vers le récapitulatif';
    else $('#publish').textContent='Valider et ouvrir l’article lié';
  } finally {
    refreshBusy = false;
  }
}


let restoring=false;
let lastRenderedStage=null;
async function storePending(update){pending={...pending,...update,updatedAt:Date.now()};await chrome.storage.local.set({twoMinutesPendingLink:pending})}

// V2.3.6 — Extract linked article metadata from its exact tab, not from the
// source article. Previous versions kept sourceImageUrl but never populated
// targetImageUrl before sending the publication RPC.
function safeImageForArticle(raw, articleUrl) {
  try {
    if (!raw || !articleUrl) return '';
    const image = new URL(String(raw));
    if (!['https:', 'http:'].includes(image.protocol)) return '';
    if (canonical(image.href) === canonical(articleUrl)) return '';
    return image.href;
  } catch (_) { return ''; }
}
async function readTargetArticleMetadata() {
  if (!pending?.targetUrl) return {};
  const id=Number(pending.targetTabId);
  if (!Number.isInteger(id) || id<=0) return {};
  let tab;
  try { tab=await chrome.tabs.get(id); } catch (_) { return {}; }
  if (!tab?.id || !/^https?:/i.test(tab.url||'')) return {};
  // The known target tab must not have navigated to a foreign article.
  if (canonical(tab.url)!==canonical(pending.targetUrl) &&
      canonical(tab.url)!==canonical(pending.targetResolvedUrl||pending.targetUrl)) return {};
  // Direct selection metadata includes og:image, JSON-LD and large article imagery.
  // This works even when clicking the side panel has cleared text selection.
  const data=await directSelection(tab.id);
  if (!data || canonical(data.url)!==canonical(tab.url)) return {};
  const next={};
  const imageUrl=safeImageForArticle(data.imageUrl,pending.targetUrl);
  if(imageUrl)next.targetImageUrl=imageUrl;
  if(!pending.targetTitle && normalize(data.title))next.targetTitle=normalize(data.title);
  return next;
}

function sourceMode(){return pending?.stage==='SOURCE_SELECTION'||pending?.stage==='SOURCE_EDIT'}
function mediaName(url){
  try{
    const hostname=new URL(url).hostname.toLowerCase().replace(/^www\./,'');
    const bias=getBiasForDomain(hostname);
    const name=String(bias?.desc||'').split(' — ')[0].trim();
    return name || hostname;
  }catch(_){return 'Média inconnu'}
}
function renderWorkflow(){
 if(!pending)return;
 const stage=pending.stage||'TARGET_SELECTION';
 $('#target').textContent=sourceMode()?pending.sourceUrl:pending.targetUrl;
 const scaleMount=$('#workflowEditorialScales');if(scaleMount){const srcHost=(()=>{try{return new URL(pending.sourceUrl).hostname}catch{return ''}})();const dstHost=(()=>{try{return new URL(pending.targetUrl).hostname}catch{return ''}})();scaleMount.innerHTML='<div class="tm-side-scale-item"><small>'+mediaName(pending.sourceUrl)+'</small>'+EditorialScale.html(getBiasForDomain(srcHost),'compact')+'</div><div class="tm-side-scale-item"><small>'+mediaName(pending.targetUrl)+'</small>'+EditorialScale.html(getBiasForDomain(dstHost),'compact')+'</div>'; }
 $('#step').textContent=stage==='REVIEW'?'Étape 4 / 4 — Récapitulatif':sourceMode()?'Étape 2 / 4 — Passage source':'Étape 3 / 4 — Passage lié';
 const sourceDetails=$('#sourceDetails');
 const showSource=Boolean(pending.sourceExcerpt) && !sourceMode() && stage!=='REVIEW';
 sourceDetails.style.display=showSource?'block':'none';
 $('#sourcePreview').textContent=showSource?'« '+pending.sourceExcerpt+' »':'';
 // Expand the source text automatically when entering the linked-article step.
 // Afterwards, allow the user to collapse it manually without resetting it on every refresh.
 if(showSource && lastRenderedStage!==stage)sourceDetails.open=true;
 lastRenderedStage=stage;
 $('#instruction').textContent=sourceMode()?'Sélectionnez sur cette page le passage de l’article source.':'Sélectionnez sur cette page un passage de l’article lié.';
 $('#defer').style.display=stage==='SOURCE_SELECTION'?'block':'none';
 $('#review').style.display=stage==='REVIEW'?'block':'none';
 $('#publish').style.display=stage==='REVIEW'?'none':'block';
 $('#cancel').style.display=stage==='REVIEW'?'none':'block';
 $('#preview').style.display=stage==='REVIEW'?'none':'block';
 $('#publish').textContent=stage==='REVIEW'?'Publier les passages':sourceMode()?'Valider et ouvrir l’article lié':'Continuer vers le récapitulatif';
 if(stage==='REVIEW'){
  $('#reviewSource').textContent=pending.sourceExcerpt||'Passage source reporté';
  $('#reviewTarget').textContent=pending.targetExcerpt||'Passage lié manquant';
  $('#publish').disabled=publishing || completed || !pending.targetExcerpt;
  $('#reviewPublish').disabled=publishing || completed || !pending.targetExcerpt;
 }
}
async function initialize(){
 const data=await chrome.storage.local.get('twoMinutesPendingLink');pending=data.twoMinutesPendingLink||null;
 if(!pending){$('#target').textContent='Aucun ajout en cours';$('#status').textContent='Démarrez depuis l’extension 2minutes.';$('#publish').disabled=true;$('#defer').style.display='none';return}
 if(pending.workflowVersion!==2){$('#status').textContent='Ancien brouillon : utilisez la version précédente ou abandonnez ce brouillon.';$('#publish').disabled=true;return}
 renderWorkflow();if(pending.stage!=='REVIEW')await refreshSelection();
}
chrome.storage.onChanged.addListener((changes,area)=>{
 if(area!=='local')return;
 if(changes.twoMinutesPendingLink && !publishing && !completed){
  const previousStage=pending?.stage;
  pending=changes.twoMinutesPendingLink.newValue||null;
  // A draft update can be triggered by our own async storage write.  Do not
  // erase a validated passage before the navigation message has been sent.
  if(previousStage!==pending?.stage)selected='';
  if(pending){renderWorkflow();if(pending.stage!=='REVIEW' && previousStage!==pending.stage)refreshSelection();}
  else {
    // A navigation cancel cleared the draft. Close the visible side panel,
    // even on Chromium releases that lack chrome.sidePanel.close().
    $('#target').textContent='Aucun ajout en cours';
    $('#publish').disabled=true;
    window.close();
  }
 }
 if(changes.twoMinutesLastSelection&&pending?.stage!=='REVIEW')refreshSelection();
});
chrome.tabs.onActivated.addListener(()=>{if(pending?.stage!=='REVIEW')refreshSelection()});
chrome.tabs.onUpdated.addListener((id,info)=>{if([Number(pending?.sourceTabId),Number(pending?.targetTabId)].includes(id)&&info.status==='complete'&&pending?.stage!=='REVIEW')refreshSelection()});
$('#publish').onclick=async()=>{
 if(publishing || completed)return;
 try{
  if(!pending)return;
  const stage=pending.stage;
  if(stage==='SOURCE_SELECTION'){
   // Snapshot before any await: chrome.storage.onChanged (or selection polling)
   // may mutate `selected` while the asynchronous write completes.
   const sourceText=normalize(selected);
   if(sourceText.length<12||sourceText.length>600)return;
   await storePending({sourceExcerpt:sourceText,sourceSelectionDeferred:false});
   const r=await chrome.runtime.sendMessage({type:'2MIN_V2_OPEN_TARGET',sourceExcerpt:sourceText});
   if(!r?.ok)throw Error(r?.error||'Navigation impossible');
  }else if(stage==='SOURCE_EDIT'){
   if(!selected||selected.length<12||selected.length>600)return;
   await storePending({sourceExcerpt:selected,stage:'REVIEW'});
   const id=Number(pending.targetTabId);if(Number.isInteger(id))await chrome.tabs.update(id,{active:true});
  }else if(stage==='TARGET_SELECTION'||stage==='TARGET_EDIT'){
   if(!selected||selected.length<12||selected.length>600)return;
   // Capture target metadata BEFORE leaving its selection stage.
   const targetMetadata=await readTargetArticleMetadata();
   await storePending({...targetMetadata,targetExcerpt:selected,stage:'REVIEW'});
  }else if(stage==='REVIEW'){
   if(!pending.targetExcerpt)throw Error('Sélectionnez un passage lié avant de publier.');
   publishing=true;
   // Retry metadata collection just before publication if the selected article
   // loaded its og:image late. Keep any previously captured valid URL.
   const recoveredTarget=await readTargetArticleMetadata().catch(()=>({}));
   if(recoveredTarget.targetImageUrl || recoveredTarget.targetTitle){
     await storePending({
       targetImageUrl:pending.targetImageUrl || recoveredTarget.targetImageUrl || '',
       targetTitle:pending.targetTitle || recoveredTarget.targetTitle || ''
     });
   }
   const draftSnapshot={...pending};
   const publishBtn=$('#reviewPublish');
   const savedLabel=publishBtn.textContent;
   publishBtn.disabled=true;
   publishBtn.classList.add('publishing');
   publishBtn.textContent='Publication en cours…';
   $('#status').textContent='Enregistrement des passages…';
   $('#status').classList.remove('error');
   $('#cancel').disabled=true;
   $('#reviewAbandon').disabled=true;
   $('#reviewRestart').disabled=true;
   try {
     await TwoMinutesCommunity.addLinkWithExcerpts(
       {url:draftSnapshot.sourceUrl,title:draftSnapshot.sourceTitle||'',imageUrl:draftSnapshot.sourceImageUrl||''},
       {url:draftSnapshot.targetUrl,title:draftSnapshot.targetTitle||'',imageUrl:draftSnapshot.targetImageUrl||''},
       draftSnapshot.sourceExcerpt||'',draftSnapshot.targetExcerpt||'');
     completed=true;
     publishBtn.classList.remove('publishing');
     publishBtn.textContent='✓ Liaison publiée';
     $('#success').classList.add('show');
     $('#status').textContent='Publication confirmée.';
     // Laisser un court instant au message de confirmation avant de fermer.
     await new Promise(resolve=>setTimeout(resolve,900));
     const result=await chrome.runtime.sendMessage({type:'2MIN_V2_COMPLETE_WORKFLOW',sourceTabId:draftSnapshot.sourceTabId,targetTabId:draftSnapshot.targetTabId,targetWindowId:draftSnapshot.targetWindowId});
     if(!result?.ok)throw Error(result?.error||'Impossible de fermer le panneau.');
     window.close();
   }catch(e){
     // After successful RPC, do not enable a second publication on a close failure.
     if(completed){$('#status').textContent='Liaison publiée. Vous pouvez fermer le panneau.';$('#status').classList.remove('error');}
     else {$('#status').textContent=e?.message||String(e);$('#status').classList.add('error');publishBtn.disabled=false;publishBtn.textContent=savedLabel;$('#cancel').disabled=false;$('#reviewAbandon').disabled=false;$('#reviewRestart').disabled=false;}
   }finally{publishing=false;publishBtn.classList.remove('publishing');}
  }
 }catch(e){$('#status').textContent=e?.message||String(e);$('#status').classList.add('error');if(pending?.stage==='REVIEW'&&!completed&&!publishing)$('#reviewPublish').disabled=false}
};
$('#defer').onclick=async()=>{try{const r=await chrome.runtime.sendMessage({type:'2MIN_V2_OPEN_TARGET',sourceExcerpt:''});if(!r?.ok)throw Error(r?.error||'Navigation impossible')}catch(e){$('#status').textContent=e.message}};
// Review actions: one horizontal row, with a complete restart on the source article.
$('#reviewPublish').onclick=()=>$('#publish').click();
$('#reviewAbandon').onclick=()=>$('#cancel').click();
$('#reviewRestart').onclick=async()=>{
 if(!pending || publishing || completed || pending.stage!=='REVIEW')return;
 // Recommencer discards both excerpts but keeps the chosen article pair.
 if(!confirm('Recommencer la sélection depuis l’article source ? Les deux passages du brouillon seront effacés.'))return;
 const button=$('#reviewRestart');
 button.disabled=true;
 try{
   let sourceTab=null;
   const id=Number(pending.sourceTabId);
   if(Number.isInteger(id)&&id>0){try{sourceTab=await chrome.tabs.get(id)}catch(_){}}
   // Do not silently restart on a different page in the original source tab.
   if(sourceTab&&canonical(sourceTab.url)!==canonical(pending.sourceUrl))sourceTab=null;
   selected='';
   await chrome.storage.local.remove('twoMinutesLastSelection');
   await storePending({
     stage:'SOURCE_SELECTION',sourceExcerpt:'',targetExcerpt:'',
     sourceSelectionDeferred:false,targetReady:false,targetResolvedUrl:''
   });
   if(!sourceTab){
     sourceTab=await chrome.tabs.create({url:pending.sourceUrl,active:true});
     await storePending({sourceTabId:sourceTab.id});
   }else{
     await chrome.tabs.update(sourceTab.id,{active:true});
   }
   // Restart can be resumed from the current sidebar, or reopened if Chrome
   // closes it during the authorized tab activation.
   renderWorkflow();
   await refreshSelection();
 }catch(e){
   $('#status').textContent=e?.message||String(e);
   $('#status').classList.add('error');
 }finally{button.disabled=false}
};
$('#cancel').onclick=async()=>{
 if(!confirm('Abandonner cette liaison et effacer le brouillon ?'))return;
 $('#cancel').disabled=true;
 try{
  const response=await chrome.runtime.sendMessage({type:'2MIN_V2_ABANDON_WORKFLOW'});
  if(!response?.ok)throw Error(response?.error||'Abandon impossible.');
  // The service worker closes the side panel. Closing this view is only a fallback.
  window.close();
 }catch(e){
  $('#status').textContent=e?.message||String(e);
  $('#status').classList.add('error');
  $('#cancel').disabled=false;
 }
};
setInterval(()=>{if(pending&&pending.stage!=='REVIEW')refreshSelection()},500);
initialize();
