/* Transient editorial-orientation notice isolated from publisher CSS. */
(()=>{'use strict';
 let host=null, expiry=null, identity=0;
 const close=()=>{identity++;if(expiry)clearTimeout(expiry);expiry=null;host?.remove();host=null};
 chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.type==='2MIN_HIDE_ORIENTATION_TOAST'){close();reply({ok:true});return;}
  if(message?.type!=='2MIN_SHOW_ORIENTATION_TOAST')return;
  close();
  if(document.hidden){reply({ok:false,reason:'hidden document'});return;}
  if(location.hostname.toLowerCase().replace(/^www\./,'')!==message.domain){reply({ok:false,reason:'domain mismatch'});return;}
  const score=Number(message.score);if(![-4,-2,0,2,4].includes(score)){reply({ok:false,reason:'invalid score'});return;}
  const version=++identity;
  host=document.createElement('div');host.id='two-minutes-orientation-toast';host.style.cssText='position:fixed;top:20px;right:20px;z-index:2147483647;width:311px;max-width:calc(100vw - 32px);pointer-events:auto';
  const root=host.attachShadow({mode:'closed'});
  const style=document.createElement('style');style.textContent=`
  *{box-sizing:border-box}
  button{display:block;width:100%;border:1px solid #506481;border-radius:13px;padding:10px 11px;background:#101827;color:#fff;box-shadow:0 9px 35px #0007;text-align:left;cursor:pointer;font-family:system-ui,Arial,sans-serif}
  .layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,4fr);gap:10px;align-items:center}
  .brand{display:flex;align-items:center;justify-content:center;min-width:0}
  .brand img{display:block;width:100%;height:auto;max-width:58px;object-fit:contain}
  .details{min-width:0}
  .media{font-size:15px;line-height:1.2;font-weight:750;overflow-wrap:anywhere;margin-bottom:2px}
  .subtitle{font-size:9px;color:#bbcce1;margin-bottom:8px}
  .bar{height:7px;border-radius:8px;background:linear-gradient(90deg,#c62828,#e57878 25%,#858b94 50%,#78a9e2 75%,#1565c0);position:relative;margin:8px 10px 10px}
  .mid{position:absolute;left:50%;height:18px;width:1px;top:-5px;background:#fff8}
  .point{position:absolute;left:var(--left);top:50%;transform:translate(-50%,-50%);height:17px;width:17px;border-radius:50%;background:white;border:3px solid #1b2432}
  .labels{display:flex;justify-content:space-between;gap:5px;font-size:9px}
  .hint{font-size:10px;color:#bbcce1;margin-top:8px;line-height:1.35}

  `;
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','2Minutes : orientation éditoriale de '+message.media+'. Cliquez pour consulter les points de vue.');
  const layout=document.createElement('div');layout.className='layout';
  const brand=document.createElement('div');brand.className='brand';
  const logo=document.createElement('img');logo.src=chrome.runtime.getURL('icons/icon128.png');logo.alt='Logo 2Minutes';logo.width=64;logo.height=64;brand.append(logo);
  const details=document.createElement('div');details.className='details';
  const media=document.createElement('div');media.className='media';media.textContent=message.media||message.domain;
  const subtitle=document.createElement('div');subtitle.className='subtitle';subtitle.textContent='Orientation éditoriale';
  const bar=document.createElement('div');bar.className='bar';bar.style.setProperty('--left',((score+4)/8*100)+'%');
  const mid=document.createElement('span');mid.className='mid';const point=document.createElement('span');point.className='point';bar.append(mid,point);
  const labels=document.createElement('div');labels.className='labels';for(const x of ['Gauche','Centre','Droite']){const span=document.createElement('span');span.textContent=x;labels.append(span)}
  const hint=document.createElement('div');hint.className='hint';hint.textContent='Cliquez pour consulter les points de vue';
  details.append(media,subtitle,bar,labels,hint);
  layout.append(brand,details);button.append(layout);root.append(style,button);
  button.addEventListener('click',()=>{if(version!==identity)return;close();chrome.runtime.sendMessage({type:'2MIN_TOAST_OPEN_CONSULTATION',domain:message.domain}).catch(()=>{});});
  (document.body||document.documentElement).append(host);
  expiry=setTimeout(()=>{if(identity===version)close()},3000);
  reply({ok:true});
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)close()});
 window.addEventListener('pagehide',close);
 chrome.runtime.sendMessage({type:'2MIN_EDITORIAL_DOCUMENT_READY'}).catch(()=>{});
})();
