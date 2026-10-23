/* 2Minutes .2min format V0.1-draft validator. Pure code: browser + Node tests.
   Never execute content from a user-supplied document. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TwoMinImportValidator=api;
})(typeof globalThis!=='undefined'?globalThis:this, function(){
 'use strict';
 const MAX_FILE_BYTES=200*1024;
 const TRACKING=['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'];
 const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const text=(s,min,max,field)=>{
  if(typeof s!=='string'||s.trim().length<min||Array.from(s.trim()).length>max)throw Error(field+' manquant ou trop long');
  return s.trim();
 };
 function canonical(raw){
  if(typeof raw!=='string'||raw.length>4000||/[\u0000-\u001f\u007f]/.test(raw))throw Error('URL absente ou invalide');
  let u;try{u=new URL(raw)}catch{throw Error('URL invalide : '+String(raw).slice(0,90))}
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port||!u.hostname.includes('.')||
     u.hostname==='localhost'||!/[a-z]/i.test(u.hostname)||u.hostname.endsWith('.')||/\\/.test(raw))throw Error('URL non autorisée');
  u.hash='';u.hostname=u.hostname.toLowerCase().replace(/^www\./,'');
  for(const k of TRACKING)u.searchParams.delete(k);
  if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/$/,'');
  if(u.href.length>4000)throw Error('URL trop longue');
  return u.href;
 }
 function validate(raw){
  if(!obj(raw)||raw.format!=='2minutes-article-confrontation'||raw.format_version!=='0.1-draft'||raw.status!=='user_approved')
   throw Error('Format, statut ou version .2min incompatible (attendu : 0.1-draft approuvé)');
  if(!obj(raw.reference_article))throw Error('Article de référence manquant');
  const referenceUrl=canonical(raw.reference_article.url);
  const referenceTitle=text(raw.reference_article.title,1,500,'Titre de référence');
  const language=text(raw.search_language??raw.language,2,5,'Langue');
  if(!/^[a-z]{2}(-[A-Za-z]{2})?$/.test(language))throw Error('Langue de recherche incorrecte');
  if(!Array.isArray(raw.pairs)||raw.pairs.length<1||raw.pairs.length>25)throw Error('Le fichier doit contenir entre 1 et 25 paires');
  const seen=new Set();
  const pairs=raw.pairs.map((p,i)=>{
   const label='Paire '+(i+1);
   if(!obj(p)||p.approval!=='accepted')throw Error(label+' : statut non accepté');
   if(!obj(p.target_article))throw Error(label+' : article lié manquant');
   const targetUrl=canonical(p.target_article.url);
   if(targetUrl===referenceUrl||seen.has(targetUrl))throw Error(label+' : même article ou doublon d’URL');
   seen.add(targetUrl);
   const targetTitle=text(p.target_article.title,1,500,label+' : titre');
   const targetExcerpt=text(p.target_excerpt,12,600,label+' : extrait').replace(/\s+/g,' ').trim();
   if(Array.from(targetExcerpt).length<12)throw Error(label+' : extrait trop court');
   if(!obj(p.reference_claim)||!obj(p.counter_claim))throw Error(label+' : affirmations manquantes');
   const refClaim={text:text(p.reference_claim.text,1,3000,label+' : affirmation source'),attribution:text(p.reference_claim.attribution,1,500,label+' : auteur de la source')};
   const counterClaim={text:text(p.counter_claim.text,1,3000,label+' : affirmation opposée'),attribution:text(p.counter_claim.attribution,1,500,label+' : auteur opposé')};
   const explanation=text(p.explanation,1,5000,label+' : explication');
   const contradictionType=p.contradiction_type==null?'':text(p.contradiction_type,1,120,label+' : type de confrontation');
   if(!Array.isArray(p.evidence_urls)||p.evidence_urls.length<2||p.evidence_urls.length>12)throw Error(label+' : références manquantes ou trop nombreuses');
   const evidenceUrls=p.evidence_urls.map(canonical);
   if(!evidenceUrls.includes(referenceUrl)||!evidenceUrls.includes(targetUrl))throw Error(label+' : les deux URL des articles doivent figurer dans les références');
   return {approval:'accepted',target_article:{url:targetUrl,title:targetTitle},reference_claim:refClaim,counter_claim:counterClaim,
           target_excerpt:targetExcerpt,contradiction_type:contradictionType,explanation,evidence_urls:evidenceUrls};
  });
  return {format:'2minutes-article-confrontation',format_version:'0.1-draft',status:'user_approved',
    search_language:language,reference_article:{url:referenceUrl,title:referenceTitle},pairs};
 }
 return {validate,canonical,MAX_FILE_BYTES};
});
