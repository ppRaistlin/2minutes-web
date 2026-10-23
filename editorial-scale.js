/* 2Minutes EditorialScale V1 — visual-only mapping, shared by Chrome views. */
(function(root){
  'use strict';
  const SCORE_BY_MBFC={'LEFT':-4,'LEFT-CENTER':-2,'LEAST BIASED':0,'RIGHT-CENTER':2,'RIGHT':4};
  const LABELS={ '-4':'Gauche','-2':'Centre-gauche','0':'Centre','2':'Centre-droit','4':'Droite' };
  function score(value){
    if(typeof value==='number')return [-4,-2,0,2,4].includes(value)?value:null;
    const m=String(value?.mbfc||value||'').toUpperCase();
    if(/CONSPIRACY|QUESTIONABLE/.test(m))return null;
    if(m.includes('LEFT-CENTER')||m.includes('LEFT CENTER'))return -2;
    if(m.includes('RIGHT-CENTER')||m.includes('RIGHT CENTER'))return 2;
    if(m.includes('LEFT'))return -4;
    if(m.includes('RIGHT'))return 4;
    if(m.includes('LEAST BIASED')||m.includes('CENTER')||m.includes('CENTRE'))return 0;
    return null;
  }
  function html(value,variant='compact'){
    const s=score(value),valid=s!==null,p=valid?((s+4)/8)*100:50;
    const accessible=valid?'Orientation éditoriale : position '+(1+((s+4)/2))+' sur 5, '+LABELS[s]:'Orientation éditoriale non disponible';
    return `<div class="tm-editorial-scale ${variant==='full'?'tm-scale-full':'tm-scale-compact'}" role="img" aria-label="${accessible}">
      <div class="tm-scale-track">${valid?`<span class="tm-scale-dot" style="left:${p}%"></span>`:''}<span class="tm-scale-center" aria-hidden="true"></span></div>
      ${variant==='full'?'<div class="tm-scale-labels" aria-hidden="true"><span>Gauche</span><span>Centre</span><span>Droite</span></div>':''}
      ${!valid?'<span class="tm-scale-unavailable">Orientation non disponible</span>':''}
    </div>`;
  }
  root.EditorialScale={score,html};
})(typeof globalThis==='object'?globalThis:window);
