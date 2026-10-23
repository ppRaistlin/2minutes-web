/**
 * 2minutes — background.js
 * Badge d'orientation sur l'icône Chrome, par onglet.
 */
importScripts('bias-data.js');

const BADGE = {
  'LEFT':         { text: 'G',  color: '#c62828', label: 'Gauche' },
  'LEFT-CENTER':  { text: 'CG', color: '#ef6c63', label: 'Centre-gauche' },
  'LEAST BIASED': { text: 'C',  color: '#607d8b', label: 'Centre' },
  'RIGHT-CENTER': { text: 'CD', color: '#4f83cc', label: 'Centre-droit' },
  'RIGHT':        { text: 'D',  color: '#1565c0', label: 'Droite' },
};

function normalizeMbfc(bias) {
  if (!bias || !bias.mbfc) return null;
  const m = String(bias.mbfc).toUpperCase();
  // Fiabilité et orientation restent deux dimensions différentes.
  if (m.includes('CONSPIRACY') || m.includes('QUESTIONABLE')) return null;
  if (m.includes('LEFT-CENTER') || m.includes('LEFT CENTER')) return 'LEFT-CENTER';
  if (m.includes('RIGHT-CENTER') || m.includes('RIGHT CENTER')) return 'RIGHT-CENTER';
  if (m.includes('LEFT')) return 'LEFT';
  if (m.includes('RIGHT')) return 'RIGHT';
  if (m.includes('LEAST BIASED') || m.includes('CENTER') || m.includes('CENTRE')) return 'LEAST BIASED';
  return null;
}

async function clearBadge(tabId) {
  try {
    await chrome.action.setBadgeText({ tabId, text: '' });
    await chrome.action.setTitle({ tabId, title: '2minutes — Confrontons les points de vue' });
  } catch (_) {}
}

async function updateBadge(tabId, rawUrl) {
  if (!tabId || !rawUrl) return clearBadge(tabId);
  let url;
  try { url = new URL(rawUrl); } catch (_) { return clearBadge(tabId); }
  if (!/^https?:$/.test(url.protocol)) return clearBadge(tabId);

  const bias = getBiasForDomain(url.hostname);
  const cat = normalizeMbfc(bias);
  const cfg = cat && BADGE[cat];
  if (!cfg) return clearBadge(tabId);

  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: cfg.color });
    await chrome.action.setBadgeTextColor({ tabId, color: '#FFFFFF' });
  } catch (_) {
    // setBadgeTextColor n'est pas indispensable sur d'anciennes versions de Chromium.
  }
  await chrome.action.setBadgeText({ tabId, text: cfg.text });
  const media = (bias && bias.name) || url.hostname.replace(/^www\./, '');
  await chrome.action.setTitle({ tabId, title: `2minutes — ${media} · ${cfg.label}` });
}


const POPUP_REOPEN_TABS = new Set();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== '2MIN_REOPEN_POPUP_WHEN_READY') return;
  const tabId = Number(message.tabId);
  if (!Number.isInteger(tabId)) return;
  POPUP_REOPEN_TABS.add(tabId);
  // In case the tab already completed before the message arrived.
  chrome.tabs.get(tabId).then(tab => {
    if (tab?.status === 'complete') reopenPopupForTab(tabId, tab.windowId);
  }).catch(() => POPUP_REOPEN_TABS.delete(tabId));
});

async function reopenPopupForTab(tabId, windowId) {
  if (!POPUP_REOPEN_TABS.has(tabId)) return;
  POPUP_REOPEN_TABS.delete(tabId);
  try {
    await chrome.tabs.update(tabId, { active: true });
    if (Number.isInteger(windowId)) await chrome.windows.update(windowId, { focused: true });
    // Small delay lets Chrome finish switching focus before opening the action popup.
    await new Promise(resolve => setTimeout(resolve, 180));
    if (chrome.action?.openPopup) {
      const opts = Number.isInteger(windowId) ? { windowId } : undefined;
      await chrome.action.openPopup(opts);
    }
  } catch (_) {
    // Older Chromium builds may not support programmatic popup reopening.
  }
}

// EditorialScale V1.1: notification at each page arrival and tab activation.
// Each activation/document uses a fresh token: a late callback must never
// display a stale orientation or its badge in another tab.
const EDITORIAL_TABS = new Map();
let EDITORIAL_SEQ = 0;
const EDITORIAL_ACTIVE = new Map(); // windowId -> active tabId
const editorDomain = raw => {try{const u=new URL(raw);return /^https?:$/.test(u.protocol)?u.hostname.toLowerCase().replace(/^www\./,''):''}catch{return ''}};
const validEditorial = raw => {
  const domain=editorDomain(raw);
  if(!domain)return null;
  const bias=getBiasForDomain(domain),cat=normalizeMbfc(bias),cfg=cat&&BADGE[cat];
  if(!cfg)return null;
  const scores={'LEFT':-4,'LEFT-CENTER':-2,'LEAST BIASED':0,'RIGHT-CENTER':2,'RIGHT':4};
  return {domain,bias,cat,cfg,score:scores[cat],media:(bias?.desc||'').split(' — ')[0].trim()||domain};
};
function invalidateEditorial(tabId,{hide=true}={}){
  const old=EDITORIAL_TABS.get(tabId);
  if(old?.timer)clearTimeout(old.timer);
  const state={token:++EDITORIAL_SEQ,domain:'',url:'',timer:null,showing:false};
  EDITORIAL_TABS.set(tabId,state);
  if(hide)chrome.tabs.sendMessage(tabId,{type:'2MIN_HIDE_ORIENTATION_TOAST'}).catch(()=>{});
  return state;
}
async function editorialShow(tabId,tab,reason='navigation'){
  if(!tab?.url)return;
  const info=validEditorial(tab.url);
  const existing=EDITORIAL_TABS.get(tabId);
  if(existing?.showing && existing.url===tab.url)return; // already visible for this document
  const state=invalidateEditorial(tabId);
  state.domain=info?.domain||'';
  state.url=tab.url;
  const token=state.token;
  if(!info){await clearBadge(tabId);return;}
  await clearBadge(tabId);
  let enabled=true;
  try{const settings=await chrome.storage.local.get('twoMinutesOrientationToastEnabled');enabled=settings.twoMinutesOrientationToastEnabled!==false}catch(_){ }
  if(EDITORIAL_TABS.get(tabId)?.token!==token)return;
  if(!enabled){if(EDITORIAL_TABS.get(tabId)?.token===token)await updateBadge(tabId,tab.url);return;}
  // A background tab never displays a floating toast.
  try{
    const tabs=await chrome.tabs.query({active:true,windowId:tab.windowId});
    const win=await chrome.windows.get(tab.windowId);
    if(tabs[0]?.id!==tabId||!win.focused){if(EDITORIAL_TABS.get(tabId)?.token===token)await updateBadge(tabId,tab.url);return;}
    const receipt=await chrome.tabs.sendMessage(tabId,{type:'2MIN_SHOW_ORIENTATION_TOAST',domain:info.domain,media:info.media,score:info.score});
    if(EDITORIAL_TABS.get(tabId)?.token!==token)return;
    if(!receipt?.ok)throw Error('Notice non disponible');
    state.showing=true;
    state.timer=setTimeout(()=>{if(EDITORIAL_TABS.get(tabId)?.token===token){state.showing=false;state.timer=null;void updateBadge(tabId,state.url)}},3000);
  }catch(_){if(EDITORIAL_TABS.get(tabId)?.token===token){state.showing=false;await updateBadge(tabId,state.url)}}
}
function editorialHideTab(tabId){
  if(!Number.isInteger(tabId))return;
  const prior=invalidateEditorial(tabId);
  // Keep the usual badge when an inactive tab is revisited later.
  chrome.tabs.get(tabId).then(tab=>updateBadge(tabId,tab.url)).catch(()=>{});
}
// A new document is a new arrival even on the same media. SPA routes with an
// actual URL change are handled by tabs.onUpdated; a reload by status=loading.
chrome.tabs.onUpdated.addListener((tabId,changeInfo,tab)=>{
  if(changeInfo.status==='loading'||changeInfo.url){invalidateEditorial(tabId);void clearBadge(tabId);}
  if(changeInfo.status==='complete'){
    // Content scripts might not yet have registered; the document-ready ping
    // below retries in that case, without introducing a second visible toast.
    void editorialShow(tabId,tab,'complete');
  }
  if(changeInfo.status==='complete'&&POPUP_REOPEN_TABS.has(tabId))reopenPopupForTab(tabId,tab.windowId);
});
// A tab activation is ALWAYS an arrival, even if the domain is unchanged.
chrome.tabs.onActivated.addListener(async({tabId,windowId})=>{
  const previous=EDITORIAL_ACTIVE.get(windowId);
  if(previous!==undefined&&previous!==tabId)editorialHideTab(previous);
  EDITORIAL_ACTIVE.set(windowId,tabId);
  try{const tab=await chrome.tabs.get(tabId);await editorialShow(tabId,tab,'activated')}catch(_){await clearBadge(tabId)}
});
chrome.windows.onFocusChanged.addListener(async windowId=>{
  if(windowId===chrome.windows.WINDOW_ID_NONE){
    for(const activeId of EDITORIAL_ACTIVE.values())editorialHideTab(activeId);
    return;
  }
  try{
    const [tab]=await chrome.tabs.query({active:true,windowId});
    if(tab?.id){EDITORIAL_ACTIVE.set(windowId,tab.id);await editorialShow(tab.id,tab,'focus')}
  }catch(_){}
});
chrome.tabs.onRemoved.addListener(tabId=>{
  const record=EDITORIAL_TABS.get(tabId);if(record?.timer)clearTimeout(record.timer);
  EDITORIAL_TABS.delete(tabId);
  for(const [windowId,id] of EDITORIAL_ACTIVE)if(id===tabId)EDITORIAL_ACTIVE.delete(windowId);
});
chrome.runtime.onInstalled.addListener(async()=>{try{for(const tab of await chrome.tabs.query({}))await updateBadge(tab.id,tab.url)}catch(_){}});
chrome.runtime.onStartup.addListener(async()=>{try{for(const tab of await chrome.tabs.query({}))await updateBadge(tab.id,tab.url)}catch(_){}});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.type==='2MIN_EDITORIAL_DOCUMENT_READY'){
    // If tab-onUpdated fired before the content script was ready, retry once.
    const tabId=sender.tab?.id,tab=sender.tab;
    if(Number.isInteger(tabId)&&tab?.active){
      const state=EDITORIAL_TABS.get(tabId);
      if(!state?.showing)void editorialShow(tabId,tab,'document-ready');
    }
    reply({ok:true});return;
  }
  if(message?.type!=='2MIN_TOAST_OPEN_CONSULTATION')return;
  (async()=>{
    const tabId=sender.tab?.id,tab=Number.isInteger(tabId)?await chrome.tabs.get(tabId):null;
    if(!tab||editorDomain(tab.url)!==message.domain){reply({ok:false});return;}
    invalidateEditorial(tabId,{hide:false});
    await updateBadge(tabId,tab.url);
    try{await chrome.action.openPopup({windowId:tab.windowId});reply({ok:true})}
    catch(_){await chrome.windows.create({url:chrome.runtime.getURL('popup.html'),type:'popup',width:530,height:650});reply({ok:true,fallback:true})}
  })().catch(()=>reply({ok:false}));return true;
});

// V2.1.20 — panneau latéral utilisé pendant la sélection d'un passage.
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== '2MIN_OPEN_SELECTION_SIDE_PANEL') return;
  const tabId = Number(message.tabId);
  const windowId = Number(message.windowId);
  (async () => {
    try {
      if (Number.isInteger(tabId) && chrome.sidePanel?.setOptions) {
        await chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: true });
      }
      if (chrome.sidePanel?.open) {
        if (Number.isInteger(tabId)) await chrome.sidePanel.open({ tabId });
        else if (Number.isInteger(windowId)) await chrome.sidePanel.open({ windowId });
      }
      sendResponse({ ok: true });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true;
});


// V2.1.22 — fermer automatiquement le panneau après publication d'un extrait.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== '2MIN_CLOSE_SELECTION_SIDE_PANEL') return;
  const tabId = Number(message.tabId);
  const windowId = Number(message.windowId);
  (async () => {
    try {
      if (chrome.sidePanel?.close) {
        const opts = Number.isInteger(windowId) ? { windowId } : undefined;
        await chrome.sidePanel.close(opts);
        sendResponse({ ok: true, method: 'close' });
        return;
      }
      // Fallback Chromium: désactiver le panneau pour l'onglet courant le ferme.
      // Il sera réactivé automatiquement au prochain workflow de sélection.
      if (Number.isInteger(tabId) && chrome.sidePanel?.setOptions) {
        await chrome.sidePanel.setOptions({ tabId, enabled: false });
        sendResponse({ ok: true, method: 'disable' });
        return;
      }
      sendResponse({ ok: false, error: 'Side panel close API unavailable' });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true;
});


// V2.1.29 — workflow unique de sélection pour nouvelle liaison ET « Ajouter un passage ».
// Le panneau est ouvert pendant le geste utilisateur, AVANT la création de l'onglet cible.
// Il reste ensuite visible lorsque le nouvel onglet devient actif; le contexte est déjà stocké.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== '2MIN_START_SELECTION_WORKFLOW') return;
  const pending = message.pending || {};
  const targetUrl = String(pending.targetUrl || '');
  const requestedWindowId = Number.isInteger(message.windowId) ? message.windowId : null;
  if (!/^https?:\/\//i.test(targetUrl)) {
    sendResponse({ ok: false, error: 'URL cible invalide' });
    return;
  }
  // V2.1.30: invoke open() synchronously in the message handler, before any await.
  // Chrome requires a live user activation for sidePanel.open().
  let earlyOpenPromise = null;
  if (chrome.sidePanel?.open && Number.isInteger(requestedWindowId)) {
    try { earlyOpenPromise = chrome.sidePanel.open({ windowId: requestedWindowId }); } catch (_) {}
  }
  (async () => {
    try {
      // V2.1.42: capture authoritative metadata from the SOURCE tab before the
      // target tab is created. This guarantees sourceImageUrl is already part
      // of pendingLink when the side panel later publishes the relationship.
      let resolvedPending = { ...pending };
      const sourceTabId = Number.isInteger(message.sourceTabId)
        ? message.sourceTabId
        : (Number.isInteger(Number(pending.sourceTabId)) ? Number(pending.sourceTabId) : null);
      if (Number.isInteger(sourceTabId) && chrome.scripting?.executeScript) {
        try {
          const injected = await chrome.scripting.executeScript({
            target: { tabId: sourceTabId },
            func: () => {
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
                if (typeof value === 'object') {
                  return valid(value.contentUrl) || valid(value.url) || valid(value['@id']);
                }
                return '';
              };

              let imageUrl = '';
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
                if (value) { imageUrl = value; break; }
              }

              if (!imageUrl) {
                try {
                  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
                  for (const el of scripts) {
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
                    const text = `${img.alt || ''} ${img.className || ''}`.toLowerCase();
                    return w >= 300 && h >= 160 && !/logo|avatar|icon|sprite|author|profile/.test(text) && !!valid(img.currentSrc || img.src);
                  })
                  .sort((a,b) => (Number(b.naturalWidth||b.width||0)*Number(b.naturalHeight||b.height||0)) - (Number(a.naturalWidth||a.width||0)*Number(a.naturalHeight||a.height||0)));
                imageUrl = valid(candidates[0]?.currentSrc || candidates[0]?.src || '');
              }

              return {
                url: location.href,
                title: document.querySelector('meta[property="og:title"]')?.content || document.title || '',
                imageUrl
              };
            }
          });
          const meta = injected?.[0]?.result;
          if (meta) {
            resolvedPending = {
              ...resolvedPending,
              sourceUrl: meta.url || resolvedPending.sourceUrl,
              sourceTitle: meta.title || resolvedPending.sourceTitle,
              sourceImageUrl: meta.imageUrl || resolvedPending.sourceImageUrl || '',
              sourceTabId
            };
          }
        } catch (_) {}
      }

      await chrome.storage.local.set({ twoMinutesPendingLink: resolvedPending });
      await chrome.storage.local.remove('twoMinutesLastSelection');

      let sideOpened = false;
      if (earlyOpenPromise) {
        try { await earlyOpenPromise; sideOpened = true; } catch (_) {}
      }

      // V2 workflow: source selection first; target tab opens only after explicit continue.
      if (resolvedPending.workflowVersion === 2) {
        const sourceStage = { ...resolvedPending, workflowVersion: 2, stage: 'SOURCE_SELECTION', sourceTabId,
          targetWindowId: requestedWindowId, sourceExcerpt: '', targetExcerpt: '' };
        await chrome.storage.local.set({ twoMinutesPendingLink: sourceStage });
        sendResponse({ ok: true, sourceStage: true, sideOpened });
        return;
      }
      const tab = await chrome.tabs.create({ url: targetUrl, active: true, ...(Number.isInteger(requestedWindowId) ? { windowId: requestedWindowId } : {}) });
      if (!tab?.id) throw new Error('Impossible d’ouvrir l’article cible.');

      // V2.1.31: arm the exact target tab. Existing linked URLs come from the
      // database in canonical form and can redirect to a www/tracking variant;
      // the side panel must follow the tab identity, not require URL equality.
      const armedPending = {
        ...resolvedPending,
        targetTabId: tab.id,
        targetWindowId: tab.windowId,
        armedAt: Date.now(),
        targetReady: false,
        targetResolvedUrl: ''
      };
      await chrome.storage.local.set({ twoMinutesPendingLink: armedPending });

      if (chrome.sidePanel?.setOptions) {
        await chrome.sidePanel.setOptions({ tabId: tab.id, path: 'sidepanel.html', enabled: true });
      }

      // If opening at window level failed, try once for the new tab; otherwise use popup fallback.
      if (!sideOpened && chrome.sidePanel?.open) {
        try {
          await chrome.sidePanel.open({ tabId: tab.id });
          sideOpened = true;
        } catch (_) {}
      }
      if (!sideOpened) reopenPopupForTab(tab.id, tab.windowId);

      sendResponse({ ok: true, tabId: tab.id, windowId: tab.windowId, sideOpened });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true;
});



// V2.2.1 — explicit abandon: clear the draft and close the side panel.
// Do not close the source/target tabs: their browsing state belongs to the user.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== '2MIN_V2_ABANDON_WORKFLOW') return;
  (async () => {
    try {
      const {twoMinutesPendingLink: draft} = await chrome.storage.local.get('twoMinutesPendingLink');
      const sourceTabId = Number(draft?.sourceTabId);
      const targetTabId = Number(draft?.targetTabId);
      const windowId = Number(draft?.targetWindowId ?? sender?.tab?.windowId);
      await chrome.storage.local.remove(['twoMinutesPendingLink', 'twoMinutesLastSelection']);
      // Answer before closing: closing the panel disconnects its message channel.
      respond({ok:true});
      try {
        if (chrome.sidePanel?.close) {
          if(Number.isInteger(windowId))await chrome.sidePanel.close({windowId});
          else await chrome.sidePanel.close({});
        } else if (chrome.sidePanel?.setOptions) {
          // Fallback for Chromium versions without sidePanel.close().
          for (const id of [sourceTabId, targetTabId]) {
            if (Number.isInteger(id) && id > 0) {
              try { await chrome.sidePanel.setOptions({tabId:id,enabled:false}); } catch (_) {}
            }
          }
        }
      }catch(_){
        for(const id of [sourceTabId,targetTabId]){
          if(Number.isInteger(id)&&id>0)try{await chrome.sidePanel?.setOptions?.({tabId:id,enabled:false})}catch(_){}
        }
      }
    } catch (error) {
      respond({ok:false,error:String(error?.message||error)});
    }
  })();
  return true;
});

// V2 workflow: transition to linked article after selection or explicit deferral.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== '2MIN_V2_OPEN_TARGET') return;
  (async()=>{try{
    const data=await chrome.storage.local.get('twoMinutesPendingLink');
    const p=data.twoMinutesPendingLink;
    if (!p || p.workflowVersion!==2 || p.stage!=='SOURCE_SELECTION') throw Error('Brouillon source indisponible.');
    const tab=await chrome.tabs.create({url:p.targetUrl,active:true,...(Number.isInteger(p.targetWindowId)?{windowId:p.targetWindowId}:{})});
    if(!tab?.id)throw Error('Impossible d’ouvrir l’article lié.');
    // Preserve the already persisted source passage. A legitimate deferral
    // supplies no text and has no previously stored source excerpt.
    const sourceExcerpt=String(message.sourceExcerpt||p.sourceExcerpt||'').replace(/\s+/g,' ').trim();
    if(sourceExcerpt && (sourceExcerpt.length<12||sourceExcerpt.length>600))throw Error('Passage source invalide.');
    await chrome.storage.local.set({twoMinutesPendingLink:{...p,sourceExcerpt,sourceSelectionDeferred:!sourceExcerpt,targetTabId:tab.id,targetWindowId:tab.windowId,stage:'TARGET_SELECTION',targetReady:false,targetResolvedUrl:''}});
    await chrome.sidePanel?.setOptions?.({tabId:tab.id,path:'sidepanel.html',enabled:true});
    respond({ok:true,tabId:tab.id});
  }catch(e){respond({ok:false,error:String(e.message||e)})}})();return true;
});

// V2.1.32 — annuler proprement un ajout de passage si l'utilisateur quitte
// l'article cible avant de publier. Le premier chargement peut rediriger
// (www, tracking, URL canonique) : on mémorise donc l'URL réellement chargée
// au premier `complete`, puis toute navigation ultérieure vers une autre page
// annule la procédure et ferme le side panel.
function selectionPageKey(raw) {
  try {
    const u = new URL(String(raw || ''));
    if (!/^https?:$/.test(u.protocol)) return String(raw || '');
    u.hash = '';
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid']
      .forEach(k => u.searchParams.delete(k));
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/$/, '');
    return u.href;
  } catch (_) {
    return String(raw || '');
  }
}

// V2.2.8 — Leaving the page while choosing a passage invalidates the draft.
// Tab switching alone is allowed. The sanctioned source -> target transition
// changes the draft stage BEFORE the new target page is armed.
const SELECTION_STAGES = new Set(['SOURCE_SELECTION', 'TARGET_SELECTION', 'SOURCE_EDIT', 'TARGET_EDIT']);
const cancelledNavigationDrafts = new Set();
function activeSelectionTabId(p) {
  return Number(p.stage === 'SOURCE_SELECTION' || p.stage === 'SOURCE_EDIT' ? p.sourceTabId : p.targetTabId);
}
function selectionDraftKey(p) {
  return [p.workflowVersion, p.sourceTabId, p.targetTabId, p.armedAt || '', p.targetReadyAt || '', p.stage].join(':');
}
async function cancelSelectionWorkflow(pending, reason = 'navigation') {
  if (!pending) return false;
  const originalKey = selectionDraftKey(pending);
  if (cancelledNavigationDrafts.has(originalKey)) return false;
  cancelledNavigationDrafts.add(originalKey);
  try {
    const data = await chrome.storage.local.get('twoMinutesPendingLink');
    const current = data.twoMinutesPendingLink;
    // An in-flight navigation notification must NOT cancel a workflow that
    // already advanced to the explicitly authorized next stage.
    if (!current || selectionDraftKey(current) !== originalKey ||
        (current.workflowVersion === 2 && !SELECTION_STAGES.has(current.stage))) return false;
    const tabId = activeSelectionTabId(current);
    const ids = [Number(current.sourceTabId), Number(current.targetTabId)];
    const windowId = Number(current.targetWindowId);
    await chrome.storage.local.remove(['twoMinutesPendingLink', 'twoMinutesLastSelection']);
    try {
      if (chrome.sidePanel?.close && Number.isInteger(windowId) && windowId > 0) {
        await chrome.sidePanel.close({ windowId });
      } else {
        for (const id of ids) if (Number.isInteger(id) && id > 0)
          await chrome.sidePanel?.setOptions?.({ tabId: id, enabled: false });
      }
    } catch (_) {
      for (const id of [tabId, ...ids]) if (Number.isInteger(id) && id > 0)
        try { await chrome.sidePanel?.setOptions?.({ tabId: id, enabled: false }); } catch (_) {}
    }
    return true;
  } finally {
    cancelledNavigationDrafts.delete(originalKey);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  (async () => {
    try {
      const { twoMinutesPendingLink: pending } = await chrome.storage.local.get('twoMinutesPendingLink');
      if (!pending) return;
      if (pending.workflowVersion !== 2) {
        // Keep the former workflow working as before.
        if (Number(pending.targetTabId) !== tabId) return;
        if (!pending.targetReady) {
          if (changeInfo.status === 'complete') {
            await chrome.storage.local.set({ twoMinutesPendingLink: {
              ...pending, targetReady: true,
              targetResolvedUrl: tab?.url || pending.targetUrl,
              targetReadyAt: Date.now()
            }});
          }
          return;
        }
        if (changeInfo.url && selectionPageKey(pending.targetResolvedUrl || pending.targetUrl) !== selectionPageKey(changeInfo.url))
          await cancelSelectionWorkflow(pending, 'navigation');
        return;
      }
      if (!SELECTION_STAGES.has(pending.stage) || activeSelectionTabId(pending) !== tabId) return;
      const targetStage = pending.stage === 'TARGET_SELECTION' || pending.stage === 'TARGET_EDIT';
      if (targetStage && !pending.targetReady) {
        // The extension itself just opened this target tab. Permit its initial
        // load/redirect chain and remember the first settled document.
        if (changeInfo.status === 'complete') {
          const again = (await chrome.storage.local.get('twoMinutesPendingLink')).twoMinutesPendingLink;
          if (again && selectionDraftKey(again) === selectionDraftKey(pending))
            await chrome.storage.local.set({ twoMinutesPendingLink: {
              ...again, targetReady: true,
              targetResolvedUrl: tab?.url || again.targetUrl,
              targetReadyAt: Date.now()
            }});
        }
        return;
      }
      const reference = targetStage ? (pending.targetResolvedUrl || pending.targetUrl) : pending.sourceUrl;
      const changedPage = Boolean(changeInfo.url && reference && selectionPageKey(changeInfo.url) !== selectionPageKey(reference));
      // A refresh is a new document even if its URL is identical. No tab
      // activation event is used: visiting another tab alone is NOT cancellation.
      const reloadedDocument = changeInfo.status === 'loading';
      if (changedPage || reloadedDocument)
        await cancelSelectionWorkflow(pending, changedPage ? 'url-changed' : 'page-reloaded');
    } catch (_) {}
  })();
});

// V2.2.9 — main-frame navigation is authoritative for the SOURCE article.
// tabs.onUpdated alone can miss the change on some websites; webNavigation
// observes full reloads and History API route changes as well.
// No onActivated check: simply switching tabs must not cancel the workflow.
async function cancelOnSelectionDocumentChange(details, kind) {
  if (details.frameId !== 0) return;
  try {
    const { twoMinutesPendingLink: pending } = await chrome.storage.local.get('twoMinutesPendingLink');
    if (!pending || pending.workflowVersion !== 2 || !SELECTION_STAGES.has(pending.stage)) return;
    if (activeSelectionTabId(pending) !== details.tabId) return;
    const targetStage = pending.stage === 'TARGET_SELECTION' || pending.stage === 'TARGET_EDIT';
    if (targetStage && !pending.targetReady) return; // first sanctioned target load
    const expected = targetStage ? (pending.targetResolvedUrl || pending.targetUrl) : pending.sourceUrl;
    const different = selectionPageKey(details.url) !== selectionPageKey(expected);
    // Same-URL reload is still a new document; an SPA history event is a
    // cancellation only when the route truly changed.
    if (kind === 'document' || different) {
      await cancelSelectionWorkflow(pending, different ? 'url-changed' : 'page-reloaded');
    }
  } catch (_) {}
}
chrome.webNavigation.onCommitted.addListener(details => {
  void cancelOnSelectionDocumentChange(details, 'document');
});
chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
  void cancelOnSelectionDocumentChange(details, 'history');
});

chrome.tabs.onRemoved.addListener(tabId => {
  (async () => {
    try {
      const { twoMinutesPendingLink: pending } = await chrome.storage.local.get('twoMinutesPendingLink');
      if (!pending) return;
      if (pending.workflowVersion === 2) {
        if (SELECTION_STAGES.has(pending.stage) && activeSelectionTabId(pending) === tabId)
          await cancelSelectionWorkflow(pending, 'selection-tab-closed');
      } else if (Number(pending.targetTabId) === tabId) {
        await cancelSelectionWorkflow(pending, 'tab-closed');
      }
    } catch (_) {}
  })();
});

// Changer d'onglet dans la fenêtre de sélection revient aussi à quitter
// l'article en cours : on annule plutôt que de laisser un side panel orphelin.
chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  (async () => {
    try {
      const data = await chrome.storage.local.get('twoMinutesPendingLink');
      const pending = data?.twoMinutesPendingLink;
      const targetTabId = Number(pending?.targetTabId);
      const targetWindowId = Number(pending?.targetWindowId);
      if (!pending || !Number.isInteger(targetTabId)) return;
      if (Number.isInteger(targetWindowId) && targetWindowId !== windowId) return;
      if (tabId !== targetTabId && pending.workflowVersion !== 2) await cancelSelectionWorkflow(pending, 'tab-changed');
    } catch (_) {}
  })();
});


// V2.2.3 — Publication confirmée: nettoyer le brouillon puis fermer le side panel.
// Ne jamais fermer les onglets des articles.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== '2MIN_V2_COMPLETE_WORKFLOW') return;
  (async () => {
    try {
      const {twoMinutesPendingLink: draft} = await chrome.storage.local.get('twoMinutesPendingLink');
      const sourceTabId=Number(draft?.sourceTabId ?? message.sourceTabId);
      const targetTabId=Number(draft?.targetTabId ?? message.targetTabId);
      const windowId=Number(draft?.targetWindowId ?? message.targetWindowId);
      await chrome.storage.local.remove(['twoMinutesPendingLink','twoMinutesLastSelection']);
      respond({ok:true}); // Répondre avant fermeture, sous peine de déconnecter le port.
      try {
        if(chrome.sidePanel?.close && Number.isInteger(windowId)&&windowId>0){
          await chrome.sidePanel.close({windowId});
        }else{
          for(const id of [sourceTabId,targetTabId]){
            if(Number.isInteger(id)&&id>0)try{await chrome.sidePanel?.setOptions?.({tabId:id,enabled:false})}catch(_){}
          }
        }
      }catch(_){
        for(const id of [sourceTabId,targetTabId]){
          if(Number.isInteger(id)&&id>0)try{await chrome.sidePanel?.setOptions?.({tabId:id,enabled:false})}catch(_){}
        }
      }
    } catch(e){respond({ok:false,error:String(e?.message||e)})}
  })();
  return true;
});

// V2.3.1 — Close the selection panel as soon as the foreground document is no
// longer the EXACT document handled by the current workflow stage. Switching
// tabs closes the view, but does not discard the draft: only page navigation
// during selection invokes the existing cancellation policy above.
const selectionPanelCheckSerial = new Map();
async function guardSelectionPanel(windowId, expectedActiveTabId = null) {
  const serial = (selectionPanelCheckSerial.get(windowId)||0)+1;
  selectionPanelCheckSerial.set(windowId,serial);
  // Allow the authorized source -> target and review -> edit transitions to
  // finish writing the new stage and activating the expected tab.
  await new Promise(resolve => setTimeout(resolve, 200));
  if(serial !== selectionPanelCheckSerial.get(windowId)) return;
  try {
    const [tab] = await chrome.tabs.query({active:true,windowId});
    if(!tab?.id || (expectedActiveTabId !== null && tab.id !== expectedActiveTabId))return;
    const {twoMinutesPendingLink: draft} = await chrome.storage.local.get('twoMinutesPendingLink');
    if(!draft || draft.workflowVersion!==2)return;
    const stage=draft.stage;
    let validTab,validUrl;
    if(stage==='SOURCE_SELECTION'||stage==='SOURCE_EDIT'){
      validTab=Number(draft.sourceTabId);
      validUrl=draft.sourceUrl;
    }else{
      validTab=Number(draft.targetTabId);
      validUrl=draft.targetResolvedUrl||draft.targetUrl;
    }
    if(!Number.isInteger(validTab)||validTab<=0)return; // transition not armed
    if(validTab===tab.id && selectionPageKey(tab.url)===selectionPageKey(validUrl))return;
    // During the initial sanctioned target load a redirect is expected.
    if(validTab===tab.id && (stage==='TARGET_SELECTION'||stage==='TARGET_EDIT') && !draft.targetReady)return;
    // Recheck after awaits to avoid closing a newly activated legitimate tab.
    const [again]=await chrome.tabs.query({active:true,windowId});
    const latest=(await chrome.storage.local.get('twoMinutesPendingLink')).twoMinutesPendingLink;
    if(again?.id!==tab.id||!latest||latest.stage!==stage)return;
    if(chrome.sidePanel?.close){
      try{await chrome.sidePanel.close({windowId});return;}catch(_){}
    }
    // Older Chrome: disabling a tab-scoped panel closes it. The normal
    // workflow opening command restores it via setOptions.
    try{await chrome.sidePanel?.setOptions?.({tabId:tab.id,enabled:false});}catch(_){}
    try{await chrome.sidePanel?.setOptions?.({tabId:validTab,enabled:false});}catch(_){}
  }catch(_){}
}
chrome.tabs.onActivated.addListener(({tabId,windowId})=>{void guardSelectionPanel(windowId,tabId)});
chrome.tabs.onUpdated.addListener((tabId,changeInfo,tab)=>{
  if(changeInfo.url || changeInfo.status==='complete'){
    if(Number.isInteger(tab?.windowId))void guardSelectionPanel(tab.windowId);
  }
});
chrome.webNavigation.onHistoryStateUpdated.addListener(details=>{
  if(details.frameId!==0)return;
  chrome.tabs.get(details.tabId).then(tab=>{
    if(Number.isInteger(tab.windowId))void guardSelectionPanel(tab.windowId);
  }).catch(()=>{});
});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local'||!changes.twoMinutesPendingLink)return;
  const draft=changes.twoMinutesPendingLink.newValue;
  if(draft?.workflowVersion!==2)return;
  const windowId=Number(draft.targetWindowId);
  if(Number.isInteger(windowId)&&windowId>0)void guardSelectionPanel(windowId);
});
