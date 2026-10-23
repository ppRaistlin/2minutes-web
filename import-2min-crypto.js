/* Anonymous .2min upload: hybrid RSA-OAEP-3072 / AES-256-GCM encryption.
   Only the PUBLIC key is distributed. The PRIVATE key must stay in Supabase secrets. */
(function(global){ 'use strict';
 const encode=new TextEncoder();
 const b64=buf=>{const v=new Uint8Array(buf);let str='';for(let i=0;i<v.length;i+=0x8000)str+=String.fromCharCode(...v.subarray(i,i+0x8000));return btoa(str)};
 const unpem=pem=>Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g,'').replace(/\s/g,'')),c=>c.charCodeAt(0));
 function hex(bytes){return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('')}
 async function encrypt(document,publicKeyPem){
  if(!global.crypto?.subtle)throw Error('Chiffrement indisponible : ouvrez le site en HTTPS.');
  const publicKey=await crypto.subtle.importKey('spki',unpem(publicKeyPem),{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
  const rawKey=crypto.getRandomValues(new Uint8Array(32));
  const key=await crypto.subtle.importKey('raw',rawKey,{name:'AES-GCM'},false,['encrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const payload=encode.encode(JSON.stringify(document));
  const digest=hex(await crypto.subtle.digest('SHA-256',payload));
  const associatedData=encode.encode('2minutes-upload-v1');
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:associatedData},key,payload);
  const wrapped=await crypto.subtle.encrypt({name:'RSA-OAEP'},publicKey,rawKey);
  rawKey.fill(0);
  return {version:1,algorithm:'RSA-OAEP-256+A256GCM',wrapped_key:b64(wrapped),iv:b64(iv),ciphertext:b64(ciphertext),sha256:digest};
 }
 global.TwoMinUploadCrypto={encrypt};
})(globalThis);
