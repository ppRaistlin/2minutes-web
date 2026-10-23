const fs=require('node:fs');const crypto=require('node:crypto');const vm=require('node:vm');const assert=require('node:assert/strict');
const pub=fs.readFileSync(__dirname+'/../import-public-key.pem','utf8');
const priv=fs.readFileSync('/mnt/data/2min_secure_keys/2minutes-import-private-KEEP-SECRET.pem','utf8');
const doc=require('../import-2min-validator.js').validate(JSON.parse(fs.readFileSync(__dirname+'/../samples/exemple-bfmtv.2min','utf8')));
const ctx={crypto:crypto.webcrypto,TextEncoder,Uint8Array,btoa,atob,globalThis:null};ctx.globalThis=ctx;
vm.runInNewContext(fs.readFileSync(__dirname+'/../import-2min-crypto.js','utf8'),ctx);
(async()=>{
 const o=await ctx.TwoMinUploadCrypto.encrypt(doc,pub);
 assert.equal(o.algorithm,'RSA-OAEP-256+A256GCM');
 const aes=crypto.privateDecrypt({key:priv,oaepHash:'sha256'},Buffer.from(o.wrapped_key,'base64'));
 assert.equal(aes.length,32);
 const enc=Buffer.from(o.ciphertext,'base64'),tag=enc.subarray(enc.length-16),ct=enc.subarray(0,enc.length-16);
 const decipher=crypto.createDecipheriv('aes-256-gcm',aes,Buffer.from(o.iv,'base64'));
 decipher.setAAD(Buffer.from('2minutes-upload-v1'));decipher.setAuthTag(tag);
 const plaintext=Buffer.concat([decipher.update(ct),decipher.final()]);
 assert.equal(crypto.createHash('sha256').update(plaintext).digest('hex'),o.sha256);
 assert.deepEqual(JSON.parse(plaintext.toString('utf8')),doc);
 assert.equal(o.ciphertext.includes('BFMTV'),false);
 // Flip ciphertext: AES-GCM authentication must reject.
 const altered=Buffer.from(enc);altered[5]^=1;
 const dec2=crypto.createDecipheriv('aes-256-gcm',aes,Buffer.from(o.iv,'base64'));
 dec2.setAAD(Buffer.from('2minutes-upload-v1'));dec2.setAuthTag(altered.subarray(altered.length-16));
 assert.throws(()=>Buffer.concat([dec2.update(altered.subarray(0,altered.length-16)),dec2.final()]));
 console.log('PASS encrypt/decrypt, SHA-256, tampering rejected');
})().catch(e=>{console.error(e);process.exit(1)});
