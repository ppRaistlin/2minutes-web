// Supabase Edge Function: anonymous submission of encrypted, locally validated .2min.
// Deploy with --no-verify-jwt. Does NOT publish excerpts; only stages for staff review.
const allowedOrigins = new Set(['https://ppraistlin.github.io', 'http://localhost:3000', 'http://127.0.0.1:3000']);
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const pemBytes = (b64pem: string) => Uint8Array.from(atob(b64pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), c => c.charCodeAt(0));
const fromB64 = (s: unknown, max: number) => {
  if (typeof s !== 'string' || s.length > max || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw Error('Invalid encrypted payload');
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
};
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map(n=>n.toString(16).padStart(2,'0')).join('');
const json = (body: unknown, code = 200, origin = '') => new Response(JSON.stringify(body), { status: code, headers: {
  'content-type':'application/json; charset=utf-8',
  ...(allowedOrigins.has(origin)?{'access-control-allow-origin':origin}:{}),
  'access-control-allow-methods':'POST, OPTIONS',
  'access-control-allow-headers':'content-type',
  'cache-control':'no-store',
  'vary':'Origin'
} });
function validateDocument(v: unknown) {
  if (!v || typeof v!=='object' || Array.isArray(v)) throw Error('Invalid 2min document');
  const o = v as Record<string,unknown>;
  if (o.format!=='2minutes-article-confrontation' || o.format_version!=='0.1-draft' || o.status!=='user_approved') throw Error('Unsupported 2min format');
  if (!Array.isArray(o.pairs) || o.pairs.length<1 || o.pairs.length>25) throw Error('Invalid number of pairs');
  if (typeof o.search_language!=='string' || !/^[a-z]{2}(-[A-Za-z]{2})?$/.test(o.search_language)) throw Error('Invalid language');
  const ref=o.reference_article as Record<string,unknown>;
  const checkUrl=(value: unknown) => {
    if (typeof value!=='string' || value.length>4000 || /[\u0000-\u001f\\]/.test(value)) throw Error('Invalid URL');
    const u=new URL(value);
    if (!['http:','https:'].includes(u.protocol) || u.username || u.password || u.port || !u.hostname.includes('.') || u.hostname.endsWith('.') || u.hostname==='localhost') throw Error('Disallowed URL');
    if (u.hash || u.hostname.startsWith('www.') || [...u.searchParams.keys()].some(x=>/^(utm_|gclid|fbclid)/.test(x))) throw Error('Non-canonical URL');
    return u.href;
  };
  const checkText=(value:unknown,min:number,max:number)=>{if(typeof value!=='string'||value.trim().length<min||[...value.trim()].length>max)throw Error('Invalid text field')};
  if(!ref || typeof ref!=='object')throw Error('Missing reference article');
  const refUrl=checkUrl(ref.url);checkText(ref.title,1,500);
  const seen=new Set<string>();
  for(const pair of o.pairs as Record<string,unknown>[]){
    if(!pair || pair.approval!=='accepted')throw Error('Unapproved pair');
    const a=pair.target_article as Record<string,unknown>;
    if(!a || typeof a!=='object')throw Error('Missing target article');
    const url=checkUrl(a.url);checkText(a.title,1,500);
    if(url===refUrl||seen.has(url))throw Error('Duplicate article');seen.add(url);
    checkText(pair.target_excerpt,12,600);
    if(pair.reference_excerpt!==undefined && pair.reference_excerpt!==null)checkText(pair.reference_excerpt,12,600);
    checkText(pair.explanation,1,5000);
    for(const name of ['reference_claim','counter_claim']){
      const claim=pair[name] as Record<string,unknown>;
      if(!claim || typeof claim!=='object')throw Error('Missing claim');
      checkText(claim.text,1,3000);checkText(claim.attribution,1,500);
    }
    if(!Array.isArray(pair.evidence_urls)||pair.evidence_urls.length<2||pair.evidence_urls.length>12)throw Error('Invalid evidence');
    const evidence=(pair.evidence_urls as unknown[]).map(checkUrl);
    if(!evidence.includes(refUrl)||!evidence.includes(url))throw Error('Missing evidence links');
  }
}
Deno.serve(async req => {
  const origin=req.headers.get('origin')||'';
  if(req.method==='OPTIONS')return json({},200,origin);
  if(req.method!=='POST')return json({error:'Method not allowed'},405,origin);
  if(origin && !allowedOrigins.has(origin))return json({error:'Origin not allowed'},403,origin);
  const length=Number(req.headers.get('content-length')||0);
  if(length>380000)return json({error:'Encrypted file too large'},413,origin);
  try{
    const input=await req.text();if(input.length>380000)throw Error('Encrypted file too large');
    const envelope=JSON.parse(input);
    if(envelope.version!==1 || envelope.algorithm!=='RSA-OAEP-256+A256GCM' || !/^[0-9a-f]{64}$/.test(envelope.sha256||'')) throw Error('Unsupported encryption envelope');
    const pem64=Deno.env.get('IMPORT_RSA_PRIVATE_KEY_B64');
    const salt=Deno.env.get('IMPORT_IP_HASH_SALT');
    const base=Deno.env.get('SUPABASE_URL');
    const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!pem64||!salt||!base||!serviceKey)throw Error('Server configuration incomplete');
    const privatePem=atob(pem64);
    const key=await crypto.subtle.importKey('pkcs8',pemBytes(privatePem),{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
    const secret=await crypto.subtle.decrypt({name:'RSA-OAEP'},key,fromB64(envelope.wrapped_key,1000));
    if(secret.byteLength!==32)throw Error('Invalid encryption key');
    const aes=await crypto.subtle.importKey('raw',secret,{name:'AES-GCM'},false,['decrypt']);
    const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(envelope.iv,30),additionalData:encoder.encode('2minutes-upload-v1')},aes,fromB64(envelope.ciphertext,350000));
    if(plaintext.byteLength>204800)throw Error('Document too large');
    const hash=hex(await crypto.subtle.digest('SHA-256',plaintext));
    if(hash!==envelope.sha256)throw Error('Integrity check failed');
    const document=JSON.parse(decoder.decode(plaintext));validateDocument(document);
    const addr=req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const sender=hex(await crypto.subtle.digest('SHA-256',encoder.encode(salt+'|'+addr)));
    const response=await fetch(base.replace(/\/$/,'')+'/rest/v1/rpc/tm_stage_2min_submission_v1', {
      method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},
      body:JSON.stringify({p_document:document,p_sha256:hash,p_sender_hash:sender})
    });
    const result=await response.json();
    if(!response.ok)throw Error(result.message||'Submission rejected by database');
    return json(result,200,origin);
  }catch(err){
    // Do not return SQL details, private key material, stack traces or plaintext excerpts.
    const msg=String(err instanceof Error?err.message:err);
    const client= /too large|Invalid|Unsupported|Disallowed|Duplicate|Missing|Unapproved|Integrity|non-canonical|evidence|domain|authorised|Too many/.test(msg);
    return json({error:client?msg:'Dépôt indisponible : vérifiez la configuration ou réessayez.'},client?400:503,origin);
  }
});
