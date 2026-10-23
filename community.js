(function(){
 const cfg=globalThis.TWOMINUTES_COMMUNITY||{};
 const enabled=()=>/^https:\/\/[^/]+\.supabase\.co\/?$/.test(cfg.supabaseUrl||'')&&!!cfg.supabaseAnonKey;
 const base=()=>cfg.supabaseUrl.replace(/\/$/,'');
 const headers=()=>({'apikey':cfg.supabaseAnonKey,'Authorization':'Bearer '+cfg.supabaseAnonKey,'Content-Type':'application/json'});
 async function api(path,opt={}){const r=await fetch(base()+'/rest/v1/'+path,{...opt,headers:{...headers(),...(opt.headers||{})}});const t=await r.text();if(!r.ok)throw new Error(t||('HTTP '+r.status));return t?JSON.parse(t):null}
 function canonical(raw){const u=new URL(raw);if(!/^https?:$/.test(u.protocol))throw Error('URL non valide');u.hash='';['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach(k=>u.searchParams.delete(k));u.hostname=u.hostname.toLowerCase().replace(/^www\./,'');if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/$/,'');return u.href}
 function domain(raw){return new URL(raw).hostname.toLowerCase().replace(/^www\./,'')}
 function managed(raw){try{return !!getBiasForDomain(domain(raw))}catch{return false}}
 async function clientId(){return new Promise(res=>chrome.storage.local.get('twoMinutesClientId',r=>{if(r.twoMinutesClientId)return res(r.twoMinutesClientId);const id=crypto.randomUUID();chrome.storage.local.set({twoMinutesClientId:id},()=>res(id))}))}
 async function rpc(name,body){return api('rpc/'+name,{method:'POST',body:JSON.stringify(body)})}
 async function list(pageUrl){if(!enabled())return {disabled:true,items:[]};return {disabled:false,items:await rpc('list_article_views_v3',{p_page_url:canonical(pageUrl)})||[]}}
 async function pair(sourceUrl,targetUrl){if(!enabled())return {disabled:true,items:[]};return {disabled:false,items:await rpc('list_pair_target_excerpts_v2',{p_source_url:canonical(sourceUrl),p_target_url:canonical(targetUrl)})||[]}}
 async function addExcerpt(source,target,excerpt){if(!enabled())throw Error('Backend 2minutes non configuré');if(!managed(source.url)||!managed(target.url))throw Error('Les deux médias doivent être pris en charge par 2minutes.');if(canonical(source.url)===canonical(target.url))throw Error('Impossible de lier un article à lui-même.');excerpt=String(excerpt||'').replace(/\s+/g,' ').trim();if(excerpt.length<12)throw Error('Le passage sélectionné est trop court.');if(excerpt.length>600)throw Error('Sélection trop longue — 600 caractères maximum.');return rpc('create_article_excerpt_v3',{p_source_url:canonical(source.url),p_source_title:source.title||'',p_source_image_url:source.imageUrl||'',p_target_url:canonical(target.url),p_target_title:target.title||'',p_target_image_url:target.imageUrl||'',p_excerpt:excerpt,p_client_id:await clientId()})}
 async function addLinkWithExcerpts(source,target,sourceExcerpt,targetExcerpt){
  if(!enabled())throw Error('Backend 2minutes non configuré');
  if(!managed(source.url)||!managed(target.url))throw Error('Média non pris en charge.');
  if(canonical(source.url)===canonical(target.url))throw Error('Articles identiques.');
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const a=clean(sourceExcerpt),b=clean(targetExcerpt);
  if(b.length<12||b.length>600||a&&(a.length<12||a.length>600))throw Error('Chaque sélection doit comporter de 12 à 600 caractères.');
  return rpc('create_article_link_with_excerpts_v1',{p_source_url:canonical(source.url),p_source_title:source.title||'',p_source_image_url:source.imageUrl||'',p_target_url:canonical(target.url),p_target_title:target.title||'',p_target_image_url:target.imageUrl||'',p_source_excerpt:a,p_target_excerpt:b,p_client_id:await clientId()});
 }
 async function vote(id,value){if(!enabled())throw Error('Backend 2minutes non configuré');return rpc('vote_article_excerpt',{p_excerpt_id:id,p_value:Number(value),p_client_id:await clientId()})}
 async function removeExcerpt(id){if(!enabled())throw Error('Backend 2minutes non configuré');return rpc('delete_article_excerpt_v2',{p_excerpt_id:id,p_client_id:await clientId()})}
 globalThis.TwoMinutesCommunity={enabled,canonical,domain,managed,list,pair,addExcerpt,addLinkWithExcerpts,vote,removeExcerpt,clientId};
})();