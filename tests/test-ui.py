from playwright.sync_api import sync_playwright
from pathlib import Path
src=Path('/mnt/data/site144')
with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for label,w,h in [('desktop',1320,900),('mobile',390,844)]:
    page=browser.new_page(viewport={'width':w,'height':h})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    from re import sub
    html=sub(r'<script src="\./[^"]+"(?: defer)?></script>', '', (src/'index.html').read_text())
    page.set_content(html)
    page.add_style_tag(content=(src/'style.css').read_text())
    for script in ['bias-data.js','i18n.js','community-config.js','app.js','import-2min-validator.js','import-2min-crypto.js','import-2min.js']:
      page.add_script_tag(content=(src/script).read_text())
    page.locator('#editorialOpen').click()
    assert page.locator('#editorialUploadFlow').is_visible()
    page.locator('#editorialFile').set_input_files(str(src/'samples/exemple-bfmtv.2min'))
    page.wait_for_timeout(100)
    assert page.locator('.editorialPair').count()==2, f'{label}: pair count {page.locator(".editorialPair").count()}'
    assert 'BFMTV' in page.locator('#editorialPreview').inner_text()
    assert page.locator('#editorialImport').is_disabled()
    page.locator('#editorialConfirm').check()
    assert page.locator('#editorialImport').is_enabled()
    assert page.locator('#editorialEmail').count()==1
    page.screenshot(path=str(src/f'tests/{label}-v144.png'),full_page=True)
    print(label, 'preview PASS','errors',errors[:2])
    assert not errors, errors
    page.locator('#editorialFile').set_input_files({'name':'bad.2min','mimeType':'application/json','buffer':b'{bad json'})
    page.wait_for_timeout(20)
    assert not page.locator('#editorialPreviewPanel').is_visible()
    assert page.locator('#editorialImport').is_disabled()
    assert 'JSON invalide' in page.locator('#editorialImportStatus').inner_text()
    print(label,'invalid JSON PASS')
    page.close()
  browser.close()
