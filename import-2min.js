/* V1.0.44 — local validation, encryption with a PUBLIC key, anonymous PENDING upload.
   Editorial publication remains authorized and transactional server-side. */
(()=>{'use strict';
 const $=id=>document.getElementById(id), cfg=globalThis.TWOMINUTES_COMMUNITY||{};
 const validate=globalThis.TwoMinImportValidator?.validate;
 const encrypt=globalThis.TwoMinUploadCrypto?.encrypt;
 const maxBytes=globalThis.TwoMinImportValidator?.MAX_FILE_BYTES||204800;
 const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
 let payload=null,busy=false,token=null,staff=false;
 const text=(id,s)=>$(id).textContent=s;
 const setText=text;
 const show=(id,yes)=>$(id).classList.toggle('hidden',!yes);
 const message=(id,s,kind='')=>{$(id).textContent=s;$(id).className='editorialMessage '+kind};
 const refresh=()=>{$('editorialFile').disabled=busy;$('editorialImport').disabled=busy||!payload||!$('editorialConfirm').checked;$('editorialLogin').disabled=busy};
 const request=async(url,options={})=>{const res=await fetch(url,options);const raw=await res.text();let body;try{body=JSON.parse(raw)}catch{body={}}if(!res.ok)throw Error(body.error||body.message||'Service temporairement indisponible ('+res.status+')');return body};
 const htmlSafe=x=>String(x??'');
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
   if(p.reference_excerpt)field(box,'Passage authentique sélectionné dans l’article de référence',p.reference_excerpt);
   field(box,'Passage authentique sélectionné dans l’article lié',p.target_excerpt);
   if(p.target_article.image_url)field(box,'Image de l’article lié',p.target_article.image_url);
   field(box,'Nature de la confrontation',p.contradiction_type||'Non précisée');
   field(box,'Explication',p.explanation);
   const evidence=tag('div',undefined,'editorialPreviewField');evidence.append(tag('strong','Références à vérifier'));
   const ul=tag('ul');p.evidence_urls.forEach(url=>{const li=tag('li');li.append(extLink(url,url));ul.append(li)});evidence.append(ul);box.append(evidence);
   box.append(tag('span','Paire acceptée','editorialAccepted'));root.append(box);
  });
  setText('editorialPairCount',payload.pairs.length+' paire(s)');show('editorialPreviewPanel',true);
 }

 function resetFile(){payload=null;$('editorialConfirm').checked=false;show('editorialPreviewPanel',false);show('editorialReport',false);refresh()}
 async function chooseFile(){resetFile();const file=$('editorialFile').files?.[0];if(!file)return;
  try{if(!file.name.toLowerCase().endsWith('.2min')||file.size===0||file.size>maxBytes)throw Error('Fichier .2min invalide ou supérieur à 200 Ko.');
  payload=validate(JSON.parse(await file.text()));
  text('editorialFileStatus',file.name+' — '+payload.pairs.length+' paire(s) acceptée(s) validée(s) localement.');
  renderPreview(payload);message('editorialImportStatus','Vérifiez la provenance réelle des citations avant l’envoi.','ok')
  }catch(e){payload=null;text('editorialFileStatus','Fichier refusé.');message('editorialImportStatus','Erreur locale : '+(e instanceof SyntaxError?'JSON invalide':e.message),'error')}
  refresh();
 }
 async function readPublicKey(){const r=await fetch('./import-public-key.pem',{cache:'no-store'});if(!r.ok)throw Error('Clé publique absente : déploiement incomplet.');return r.text()}
 async function submit(){if(busy||!payload||!$('editorialConfirm').checked)return;
  busy=true;refresh();show('editorialReport',false);message('editorialImportStatus','Chiffrement local en cours…');
  try{
   if(!base||!encrypt||!validate)throw Error('Importateur non configuré.');
   const pem=await readPublicKey(),envelope=await encrypt(payload,pem);
   message('editorialImportStatus','Transmission chiffrée à Supabase…');
   const result=await request(base+'/functions/v1/submit-2min',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(envelope)});
   if(result.status!=='pending'&&result.status!=='already_pending'&&result.status!=='already_processed')throw Error('Réponse du serveur inattendue');
   $('editorialReport').replaceChildren(tag('p','Référence de dépôt : '+result.id),tag('p','Statut : '+(result.status==='already_pending'?'déjà reçu — en attente':result.status==='already_processed'?'déjà traité':'en attente de revue')),tag('p','Aucune publication automatique.'));
   show('editorialReport',true);$('editorialConfirm').checked=false;
   message('editorialImportStatus','Fichier reçu de manière chiffrée. Il sera vérifié par la rédaction avant publication.','ok');
  }catch(e){message('editorialImportStatus','Dépôt impossible : '+e.message,'error')}
  finally{busy=false;refresh()}
 }
 async function staffRpc(name,body){if(!token)throw Error('Connexion rédaction requise');return request(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)})}
 async function refreshQueue(){if(!staff)return;
  const out=$('editorialQueueList');out.replaceChildren(tag('p','Chargement…','muted'));
  try{const data=await staffRpc('tm_list_pending_2min_v1',{});out.replaceChildren();
   const items=Array.isArray(data)?data:[];
   if(!items.length){out.append(tag('p','Aucun fichier en attente.','muted'));return}
   for(const item of items){const box=tag('article',undefined,'editorialQueueItem');box.append(tag('h4',item.reference_title||'Analyse sans titre'));
     box.append(tag('p',(item.pairs_count||0)+' paire(s) · reçu le '+new Date(item.created_at).toLocaleString('fr-FR'),'muted small'));
     const preview=tag('details');const summary=tag('summary','Vérifier les affirmations et les preuves');preview.append(summary);
     // The submitted normalized document is returned only to editorial accounts.
     const doc=item.document;
     if(doc?.pairs&&doc.reference_article){const wrap=tag('div');const prev=$('editorialPreview');
       // Preview each item via the same safe DOM rendering, without HTML injection.
       wrap.append(tag('strong',doc.reference_article.title));
       for(const pair of doc.pairs){const section=tag('div',undefined,'editorialPair');section.append(tag('h4',pair.target_article.title));
         field(section,'Affirmation source',pair.reference_claim?.text||'');field(section,'Affirmation opposée',pair.counter_claim?.text||'');if(pair.reference_excerpt)field(section,'Passage de référence',pair.reference_excerpt);
         field(section,'Extrait lié',pair.target_excerpt);field(section,'Explication',pair.explanation);
         for(const url of pair.evidence_urls||[])section.append(extLink(url,url));wrap.append(section)}preview.append(wrap)}
     box.append(preview);
     const actions=tag('div',undefined,'editorialQueueActions');
     for(const [caption,fn,body] of [['Approuver','tm_approve_2min_submission_v1',{p_id:item.id}],['Refuser','tm_reject_2min_submission_v1',{p_id:item.id}]]){
      const b=tag('button',caption,caption==='Approuver'?'primary':'subtle');b.type='button';b.onclick=async()=>{
        if(!confirm(caption+' ce dépôt ?'))return;b.disabled=true;
        try{const result=await staffRpc(fn,body);message('editorialAuthStatus',caption+' : '+JSON.stringify(result),'ok');await refreshQueue()}
        catch(e){message('editorialAuthStatus',e.message,'error');b.disabled=false}
      };actions.append(b)
     }box.append(actions);out.append(box)
   }
  }catch(e){out.replaceChildren(tag('p','Impossible de charger la file : '+e.message,'error'))}
 }
 async function login(e){e.preventDefault();if(busy)return;busy=true;refresh();
  try{if(!base||!cfg.supabaseAnonKey)throw Error('Connexion Supabase non configurée');
   const data=await request(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({email:$('editorialEmail').value.trim(),password:$('editorialPassword').value})});
   token=data.access_token;$('editorialPassword').value='';if(await staffRpc('tm_editorial_can_import_v1',{})!==true)throw Error('Compte non habilité à la revue rédactionnelle');
   staff=true;show('editorialReviewQueue',true);show('editorialLogout',true);show('editorialAuthForm',false);
   message('editorialAuthStatus','Revue rédactionnelle autorisée.','ok');await refreshQueue();
  }catch(e){token=null;staff=false;message('editorialAuthStatus',e.message,'error')}
  finally{busy=false;refresh()}
 }
 $('editorialOpen').addEventListener('click',()=>{const panel=$('editorialUploadFlow'),open=panel.classList.toggle('hidden')===false;$('editorialOpen').setAttribute('aria-expanded',String(open));if(open)$('editorialFile').focus()});
 $('editorialFile').addEventListener('change',chooseFile);$('editorialConfirm').addEventListener('change',refresh);$('editorialImport').addEventListener('click',submit);
 $('editorialAuthForm').addEventListener('submit',login);$('editorialRefreshQueue').addEventListener('click',refreshQueue);
 $('editorialLogout').addEventListener('click',()=>{token=null;staff=false;show('editorialReviewQueue',false);show('editorialLogout',false);show('editorialAuthForm',true);message('editorialAuthStatus','Session rédaction fermée.')});
 if(!validate||!encrypt){message('editorialImportStatus','Module de validation ou de chiffrement manquant.','error');$('editorialOpen').disabled=true}
 refresh();
})();
