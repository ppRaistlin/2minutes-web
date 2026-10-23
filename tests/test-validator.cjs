const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const validator=require('../import-2min-validator.js');
const sample=JSON.parse(fs.readFileSync(path.join(__dirname,'../samples/exemple-bfmtv.2min'),'utf8'));
let passed=0;
function check(name,mutation,expectedValid){
 const candidate=structuredClone(sample);mutation(candidate);
 try{
  const result=validator.validate(candidate);
  assert.equal(expectedValid,true,`${name}: accepted incorrectly`);
  assert.equal(result.pairs.length,2);
  assert(result.pairs.every(p=>p.approval==='accepted'));
 }catch(e){
  if(expectedValid)throw e;
  assert(!String(e.message).includes('accepted incorrectly'),name+': should have been rejected');
 }
 passed++;console.log('PASS',name);
}
check('BFMTV LCP RTL (2 accepted pairs)',()=>{},true);
check('wrong format',d=>d.format_version='99',false);
check('invalid status',d=>d.status='draft',false);
check('rejected pair',d=>d.pairs[1].approval='rejected',false);
check('missing target URL',d=>delete d.pairs[0].target_article.url,false);
check('duplicate article pair',d=>d.pairs[1].target_article.url=d.pairs[0].target_article.url,false);
check('source and target identical',d=>d.pairs[0].target_article.url=d.reference_article.url,false);
check('excerpt too long',d=>d.pairs[0].target_excerpt='x'.repeat(601),false);
check('excerpt too short',d=>d.pairs[0].target_excerpt='x',false);
check('missing attribution',d=>delete d.pairs[0].counter_claim.attribution,false);
check('missing evidence',d=>d.pairs[0].evidence_urls=[],false);
check('unsafe scheme',d=>d.pairs[0].target_article.url='javascript:alert(1)',false);
check('URL credentials',d=>d.pairs[0].target_article.url='https://evil@lcp.fr/story',false);
console.log(`VALIDATOR RESULT: ${passed}/${passed} PASS`);
