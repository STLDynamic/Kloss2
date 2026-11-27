const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.TEST_URL || 'http://localhost:8000');await page.getByRole('button',{name:'Lägg till plastkloss',exact:true}).click();await page.getByLabel('Nummer',{exact:true}).fill('A');await page.getByLabel('Namn',{exact:true}).fill('Standard');await page.getByLabel('Saldo (st)').fill('1000');await page.getByLabel('Gäller från dagens början').fill('2026-01-01');await page.getByRole('button',{name:'Spara',exact:true}).click();await page.getByRole('button',{name:'Produkter / Recept',exact:true}).click();await page.getByRole('button',{name:'Lägg till produkt',exact:true}).click();await page.getByLabel('Produktnamn').fill('Artikel 2');await page.getByLabel('Stycken per pall').fill('10');await page.getByRole('button',{name:'Spara',exact:true}).click();await page.getByRole('button',{name:'Veckokalender',exact:true}).click();await page.locator('[data-week]').first().fill('25');await page.locator('[data-week]').first().press('Tab');await page.reload();assert.equal(await page.locator('[data-week]').first().inputValue(),'25');await page.locator('[data-week]').nth(1).fill('0');await page.locator('[data-week]').nth(1).press('Tab');assert.equal(await page.locator('[data-week]').nth(2).inputValue(),'');assert.equal(await page.locator('[data-week]').nth(1).inputValue(),'0');
 await page.getByRole('button', {name: 'Plastklossar', exact: true}).click();
 await page.getByRole('button', {name: 'Lägg till plastkloss', exact: true}).click();
 await page.getByLabel('Nummer', {exact: true}).fill('P75');
 await page.getByLabel('Namn', {exact: true}).fill('75 mm');
 await page.getByLabel('Saldo (st)', {exact: true}).fill('1000');
 await page.getByLabel('Gäller från dagens början').fill('2026-01-01');
 const marks = [['V-EMB', 30], ['nr. 5', 0], ['SE', 50]];
 for (const [name, balance] of marks) {
  await page.getByRole('button', {name: 'Lägg till märkning', exact: true}).click();
  await page.locator('[name=markName]').last().fill(name);
  await page.locator('[name=markBalance]').last().fill(String(balance));
 }
 await page.getByRole('button', {name: 'Spara', exact: true}).click();
 await page.getByRole('button', {name: 'Produkter / Recept', exact: true}).click();
 await page.getByRole('button', {name: 'Redigera', exact: true}).click();
 await page.getByLabel('Produktnamn').fill('V-EMB 5');
 const block = page.getByRole('combobox', {name: 'Plastkloss', exact: true});
 await block.selectOption({label: 'P75 · 75 mm'});
 const p75 = await block.inputValue();
 for (const [index, [name]] of marks.entries()) {
  if (index) await page.getByRole('button', {name: '+ Lägg till kloss / märkning', exact: true}).click();
  assert.equal(await block.nth(index).inputValue(), p75);
  await page.getByLabel('Stycken per pall').nth(index).fill('2');
  await page.getByRole('combobox', {name: 'Märkning', exact: true}).nth(index).selectOption(name);
 }
 await page.getByRole('button', {name: 'Spara', exact: true}).click();
 await page.getByRole('button', {name: 'Veckokalender', exact: true}).click();
 await page.reload();
 const firstPlan = page.locator('td:has([data-week])').first();
 assert.equal(await firstPlan.locator('.need').innerText(), 'P75: 150 st');
 const summary = firstPlan.locator('.stamping summary');
 const stamping = firstPlan.locator('.stamping p');
 assert.equal(await summary.innerText(), 'Att märka');
 assert.equal(await stamping.first().isVisible(), false);
 await summary.click();
 assert.equal(await stamping.first().isVisible(), true);
 assert.equal(await stamping.count(), 3);
 for (const [index, [name, balance]] of marks.entries()) {
  const line = await stamping.nth(index).innerText();
  assert.ok(line.includes(`P75 · ${name}\n`));
  assert.ok(line.includes(`Behov: 50 st · Redan märkta: ${balance} st`));
  assert.ok(line.includes(`Att märka: ${50 - balance} st`));
 }
 await summary.press('Enter');
 assert.equal(await stamping.first().isVisible(), false);
 const stockWeek = page.getByRole('combobox', {name: 'Visa vecka'});
 assert.equal(await stockWeek.inputValue(), await firstPlan.locator('[data-week]').getAttribute('data-week'));
 const stockCells = page.getByRole('row', {name: /P75 · 75 mm/}).getByRole('cell');
 assert.deepEqual((await stockCells.allInnerTexts()).slice(3), ['150 st', '150 st', '0 st', '850 st']);
 await stockWeek.selectOption({index: 1});
 assert.deepEqual((await stockCells.allInnerTexts()).slice(1), ['850 st', '0 st', '0 st', '0 st', '0 st', '850 st']);
 const nextPlan = page.locator('[data-week]').nth(1);
 await nextPlan.fill('10');
 await nextPlan.press('Tab');
 assert.equal(await stockWeek.inputValue(), await nextPlan.getAttribute('data-week'));
 assert.deepEqual((await stockCells.allInnerTexts()).slice(3), ['60 st', '60 st', '0 st', '790 st']);
 await page.getByRole('button', {name: 'Denna vecka', exact: true}).click();
 assert.equal(await stockWeek.inputValue(), await firstPlan.locator('[data-week]').getAttribute('data-week'));
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Exportera JSON'}).click();const download=await downloadPromise;await download.saveAs('/tmp/kloss-backup.json');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kloss2-v1')));page.on('dialog',d=>d.accept());await page.locator('#import').setInputFiles('/tmp/kloss-backup.json');await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('importerats'));assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kloss2-v1'))),saved);await page.locator('#import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":0}')});await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('kunde inte'));assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kloss2-v1'))),saved);await page.setViewportSize({width:390,height:844});const calendar=page.locator('.table-wrap').filter({has:page.locator('[data-week]')});const first=calendar.locator('tbody td').first();const x=(await first.boundingBox()).x;await calendar.evaluate(e=>e.scrollLeft=300);assert.equal((await first.boundingBox()).x,x);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/kloss-mobile.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS: weekly stock and week selection, stamped inventory and recipe persistence, stamping forecast, UI creation, calendar edit/reload, blank/zero, JSON roundtrip, invalid import preservation, mobile overflow and sticky column; no browser errors.');await browser.close()})().catch(e=>{console.error(e);process.exit(1)});
