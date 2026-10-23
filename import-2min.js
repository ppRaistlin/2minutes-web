/* 2Minutes integrated editorial importer. Client-side validation + server-side authorization.
   All write operations go through the SECURITY DEFINER RPC; no admin keys or direct table writes. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const validate=globalThis.TwoMinImportValidator?.validate;
 const maxBytes=globalThis.TwoMinImportValidator?.MAX_FILE_BYTES||204800;
 const cfg=globalThis.TWOMINUTES_COMMUNITY||{};
 let accessToken=null,documentToImport=null,busy=false,authorised=false;
 const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
 const key=cfg.supabaseAnonKey;
 const setText=(id,value)=>{$(id).textContent=value};
 function show(id,visible){$(id).classList.toggle('hidden',!visible)}
 function message(s,type=''){setText('editorialImportStatus',s);$('editorialImportStatus').className='editorialMessage '+type}
 function authMessage(s,type=''){setText('editorialAuthStatus',s);$('editorialAuthStatus').className='editorialMessage '+type}
 function refresh(){
  $('editorialLogin').disabled=busy;
  $('editorialLogout').disabled=busy;
  $('editorialFile').disabled=busy||!authorised;
  $('editorialImport').disabled=busy||!authorised||!documentToImport||!$('editorialConfirm').checked;
 }
 function resetFile(){documentToImport=null;$('editorialFile').value='';$('editorialConfirm').checked=false;show('editorialPreviewPanel',false);show('editorialReport',false);setText('editorialFileStatus','Aucun fichier sélectionné.');message('');refresh()}
 function logout(){const oldToken=accessToken;if(oldToken&&base&&key)fetch(base+'/auth/v1/logout',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+oldToken}}).catch(()=>{});accessToken=null;authorised=false;resetFile();show('editorialImporter',false);show('editorialAuthForm',true);show('editorialLogout',false);$('editorialPassword').value='';$('editorialAccessBadge').textContent='Accès réservé';authMessage('Non connecté.');refresh()}
 async function jsonRequest(url,options){
  const response=await fetch(url,options);
  const raw=await response.text();let data;
  try{data=raw?JSON.parse(raw):null}catch{data=null}
  if(!response.ok){const msg=typeof data==='object'&&data&&(data.message||data.error_description||data.msg||data.error);
   const err=new Error(msg||('Service Supabase indisponible ('+response.status+')'));err.status=response.status;throw err;}
  return data;
 }
 async function rpc(name,body){return jsonRequest(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(body)})}
 async function login(e){
  e.preventDefault();if(busy||!base||!key)return;
  busy=true;refresh();authMessage('Vérification du compte…');
  try{
   const data=await jsonRequest(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:$('editorialEmail').value.trim(),password:$('editorialPassword').value})});
   if(!data?.access_token)throw Error('Connexion refusée');
   accessToken=data.access_token;$('editorialPassword').value='';
   const allowed=await rpc('tm_editorial_can_import_v1',{});
   if(allowed!==true){accessToken=null;throw Error('Ce compte n’a pas l’autorisation d’importer des analyses rédactionnelles.');}
   authorised=true;show('editorialAuthForm',false);show('editorialLogout',true);show('editorialImporter',true);
   $('editorialAccessBadge').textContent='Rédaction autorisée';authMessage('Compte autorisé. Session temporaire non enregistrée.','ok');
  }catch(err){authorised=false;accessToken=null;show('editorialImporter',false);authMessage(err.message||'Échec de connexion.','error')}
  finally{busy=false;refresh()}
 }
 const tag=(tagName,text,cls)=>{const e=document.createElement(tagName);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 function extLink(url,text){const a=tag('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a}
 function field(container,label,value){const d=tag('div',undefined,'editorialPreviewField');d.append(tag('strong',label),tag('p',value));container.append(d)}
 function renderPreview(payload){
  const root=$('editorialPreview');root.replaceChildren();
  root.append(tag('h4','Article de référence'));
  root.append(extLink(payload.reference_article.url,payload.reference_article.title));
  root.append(tag('p',payload.reference_article.url,'editorialUrl'));
  root.append(tag('p','Langue : '+payload.search_language+' · '+payload.pairs.length+' paire(s) explicitement acceptée(s)','muted small'));
  payload.pairs.forEach((p,index)=>{
   const box=tag('article',undefined,'editorialPair');
   box.append(tag('h4','Paire '+(index+1)+' — '+new URL(p.target_article.url).hostname));
   box.append(extLink(p.target_article.url,p.target_article.title));
   box.append(tag('p',p.target_article.url,'editorialUrl'));
   field(box,'Affirmation de référence',p.reference_claim.text);
   field(box,'Auteur / attribution (référence)',p.reference_claim.attribution);
   field(box,'Affirmation opposée',p.counter_claim.text);
   field(box,'Auteur / attribution (opposition)',p.counter_claim.attribution);
   field(box,'Passage authentique sélectionné dans l’article lié',p.target_excerpt);
   field(box,'Nature de la confrontation',p.contradiction_type||'Non précisée');
   field(box,'Explication',p.explanation);
   const evidence=tag('div',undefined,'editorialPreviewField');evidence.append(tag('strong','Références à vérifier'));
   const ul=tag('ul');p.evidence_urls.forEach(url=>{const li=tag('li');li.append(extLink(url,url));ul.append(li)});evidence.append(ul);box.append(evidence);
   box.append(tag('span','Paire acceptée','editorialAccepted'));root.append(box);
  });
  setText('editorialPairCount',payload.pairs.length+' paire(s)');show('editorialPreviewPanel',true);
 }
 async function handleFile(){const file=$('editorialFile').files?.[0];resetFile();if(!file)return;
  try{
   if(!authorised)throw Error('Connexion rédaction requise');
   if(!file.name.toLowerCase().endsWith('.2min')||file.size>maxBytes||file.size===0)throw Error('Choisissez un fichier .2min valide de 200 Ko maximum.');
   const raw=JSON.parse(await file.text());documentToImport=validate(raw);
   setText('editorialFileStatus',file.name+' — fichier reconnu, '+documentToImport.pairs.length+' paire(s) acceptée(s).');
   renderPreview(documentToImport);message('Relisez les affirmations et références avant toute écriture.','ok');
  }catch(e){documentToImport=null;setText('editorialFileStatus','Fichier non retenu.');message('Fichier refusé : '+(e instanceof SyntaxError?'JSON invalide':e.message),'error')}
  refresh();
 }
 async function publish(){
  if(!authorised||!accessToken||busy||!documentToImport||!$('editorialConfirm').checked)return;
  busy=true;refresh();message('Importation en cours — ne fermez pas cette page.');show('editorialReport',false);
  try{
   const result=await rpc('tm_import_editorial_2min_v2',{p_document:documentToImport});
   if(!result||typeof result!=='object'||!Number.isInteger(result.pairs_total))throw Error('Résultat d’importation inattendu');
   const report=[
    'Paires traitées : '+result.pairs_total,
    'Articles créés : '+result.articles_created+' · réutilisés : '+result.articles_reused,
    'Liaisons créées : '+result.links_created+' · réutilisées : '+result.links_reused,
    'Extraits créés : '+result.excerpts_created+' · réutilisés : '+result.excerpts_reused,
    'Analyses conservées : '+result.analyses_created+' · déjà présentes : '+result.analyses_reused
   ];
   $('editorialReport').replaceChildren(...report.map(s=>tag('p',s)));
   show('editorialReport',true);message('Importation confirmée par Supabase. Aucun doublon supplémentaire n’a été créé.','ok');$('editorialConfirm').checked=false;
  }catch(e){if(e.status===401||e.status===403){logout();authMessage('Session expirée ou non autorisée : reconnectez-vous.','error')}else message('Importation refusée (aucune écriture partielle) : '+e.message,'error')}
  finally{busy=false;refresh()}
 }
 // Fail closed if public application configuration is not available.
 if(!base||!key||!validate){authMessage('Module indisponible : configuration ou validateur manquant.','error');$('editorialLogin').disabled=true;return;}
 $('editorialAuthForm').addEventListener('submit',login);
 $('editorialLogout').addEventListener('click',logout);
 $('editorialFile').addEventListener('change',handleFile);
 $('editorialConfirm').addEventListener('change',refresh);
 $('editorialImport').addEventListener('click',publish);
 refresh();
})();
