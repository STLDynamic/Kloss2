import {add,monday,week,recipe,forecast,validate} from './model.js';
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(new Date()),key='kloss2-v1';
let state={version:1,blocks:[],products:[],plans:{},deliveries:[]},view='calendar',offset=0,storageBlocked=false;
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),id=()=>crypto.randomUUID();
try{const raw=localStorage.getItem(key);if(raw)state=validate(JSON.parse(raw))}catch{storageBlocked=true;$('#message').textContent='Sparade data kunde inte läsas. Originalet bevaras. Importera en giltig kopia för att fortsätta.'}
function save(){if(storageBlocked){$('#saved').textContent='Inte sparat – importera en giltig kopia';return}try{localStorage.setItem(key,JSON.stringify(state));$('#saved').textContent='Sparat lokalt · '+new Date().toLocaleTimeString('sv-SE')}catch{$('#saved').textContent='Kunde inte spara – exportera en kopia nu'}}
function modal(html,submit){$('#fields').innerHTML=html;$('#form').onsubmit=e=>{e.preventDefault();const previous=structuredClone(state);try{submit(new FormData(e.target));validate(state);save();$('#dialog').close();render()}catch{state=previous;let error=$('#form-error');if(!error){error=document.createElement('p');error.id='form-error';error.setAttribute('role','alert');$('#fields').append(error)}error.textContent='Kontrollera uppgifterna. Märkta klossar får inte överstiga totalt saldo. Namnen måste vara unika; märkningar som används i recept får inte tas bort.'}};$('#dialog').showModal()}
$('#cancel').onclick=()=>$('#dialog').close();
const num=(name,value='',text='Antal',min=0)=>`<label>${text}<input required type="number" min="${min}" max="100000000" step="1" name="${name}" value="${value}"></label>`;
const text=(name,value,label)=>`<label>${label}<input required maxlength="100" name="${name}" value="${esc(value)}"></label>`;
const day=(value=today)=>`<label>Gäller från dagens början<input required type="date" name="date" value="${value}"></label>`;
function blockForm(b){
 const markedRow=m=>`<div class="marked-row"><label>Märkning<input name="markName" required maxlength="100" value="${esc(m?.name||'')}" placeholder="V-EMB + ISPM"></label><label>Redan märkta (st)<input name="markBalance" required type="number" min="0" max="100000000" value="${m?.balance||0}"></label><button type="button" class="remove-mark" aria-label="Ta bort märkning">×</button></div>`;
 modal(`<h2>${b?'Uppdatera saldo':'Ny plastkloss'}</h2>${text('number',b?.number||'','Nummer')}${text('name',b?.name||'','Namn')}${num('balance',b?.balance??0,'Saldo (st)')}${day(b?.asOf||today)}<p>Totalt saldo inkluderar redan märkta klossar. Alla antal nedan gäller samma saldodatum. Tidigare planer dras inte av igen.</p><h3>Varav märkta klossar</h3><p>En rad = en färdig kombination av stämplar, till exempel V-EMB + ISPM. Räkna varje fysisk kloss endast en gång.</p><div id="marked-rows">${(b?.marked||[]).map(markedRow).join('')}</div><button type="button" id="add-mark">Lägg till märkning</button>`,f=>{
 const marked=f.getAll('markName').map((name,i)=>({name:name.trim(),balance:+f.getAll('markBalance')[i]}));
 const data={id:b?.id||id(),number:f.get('number').trim(),name:f.get('name').trim(),balance:+f.get('balance'),asOf:f.get('date'),marked};if(!data.number||!data.name)throw Error();if(b)Object.assign(state.blocks.find(x=>x.id===b.id),data);else state.blocks.push(data)
 });
 $('#add-mark').onclick=()=>$('#marked-rows').insertAdjacentHTML('beforeend',markedRow());$('#marked-rows').onclick=e=>{if(e.target.classList.contains('remove-mark'))e.target.closest('.marked-row').remove()};
}
function markOptions(block,selected=''){return `<option value="">Ingen märkning krävs</option>`+(state.blocks.find(b=>b.id===block)?.marked||[]).map(m=>`<option value="${esc(m.name)}" ${m.name===selected?'selected':''}>${esc(m.name)}</option>`).join('')}
function productForm(product) {
 if (!state.blocks.length) {
  $('#message').textContent = 'Lägg först till en plastkloss.';
  return;
 }

 function recipeRow({block = state.blocks[0].id, qty = 1, mark = ''} = {}) {
  const blocks = state.blocks.map(b =>
   `<option value="${b.id}" ${block === b.id ? 'selected' : ''}>${esc(b.number)} · ${esc(b.name)}</option>`
  ).join('');
  return `<div class="recipe-row">
   <label>Plastkloss<select name="block">${blocks}</select></label>
   <label>Stycken per pall<input name="qty" required type="number" min="1" max="100000000" value="${qty}"></label>
   <label>Märkning<select name="mark">${markOptions(block, mark)}</select></label>
   <button type="button" class="remove" aria-label="Ta bort receptrad">×</button>
  </div>`;
 }

 modal(`<h2>${product ? 'Redigera produkt' : 'Ny produkt'}</h2>
  ${text('name', product?.name || '', 'Produktnamn')}
  <p>Lägg till en rad per märkning, även när klossarna har samma storlek. En pall kan till exempel ha tre rader med 75 mm: 2 V-EMB, 2 nr. 5 och 2 SE.</p>
  <div id="recipe">${(product?.recipe || [{}]).map(recipeRow).join('')}</div>
  <button type="button" id="addrow">+ Lägg till kloss / märkning</button>
  <p class="muted">Saknas en märkning? Lägg till den för rätt kloss under Plastklossar → Uppdatera saldo. Ange 0 om inga är märkta ännu.</p>`, form => {
  const name = form.get('name').trim();
  const quantities = form.getAll('qty');
  const marks = form.getAll('mark');
  const rows = form.getAll('block').map((block, i) => ({block, qty: Number(quantities[i]), mark: marks[i]}));
  if (!rows.length || !name) throw Error();
  const data = {id: product?.id || id(), name, recipe: rows};
  if (product) Object.assign(state.products.find(p => p.id === product.id), data);
  else state.products.push(data);
 });

 const recipeForm = $('#recipe');
 $('#addrow').onclick = () => {
  const previousBlock = recipeForm.lastElementChild?.querySelector('[name=block]').value;
  recipeForm.insertAdjacentHTML('beforeend', recipeRow({block: previousBlock}));
  recipeForm.lastElementChild.querySelector('[name=qty]').focus();
 };
 recipeForm.onchange = event => {
  if (event.target.name !== 'block') return;
  event.target.closest('.recipe-row').querySelector('[name=mark]').innerHTML = markOptions(event.target.value);
 };
 recipeForm.onclick = event => {
  if (event.target.classList.contains('remove')) event.target.closest('.recipe-row').remove();
 };
}
function stampingHtml(result) {
 if (!result.stamping.length) return '';
 const rows = result.stamping.map(mark => {
  const block = state.blocks.find(b => b.id === mark.block);
  return `<p>${esc(block.number)} · ${esc(mark.name)}<br>
   Behov: ${mark.need} st · Redan märkta: ${mark.prepared} st<br>
   <b>Att märka: ${mark.toStamp} st</b></p>`;
 }).join('');
 return `<details class="stamping">
  <summary>Att märka</summary>
  ${rows}
  <small>${result.ready} hela pallar med befintlig märkning och material. Att märka är arbetsbehov. Kontrollera materialbrist separat.</small>
 </details>`;
}
function render(){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#content').innerHTML='';
 if(view==='calendar'){
 const weeks=Array.from({length:8},(_,i)=>add(monday(today),(offset+i)*7)),result=forecast(state);
 $('#content').innerHTML=`<div class="toolbar"><div><h2>Veckokalender</h2><p class="muted">Gemensamt lager · prioritet uppifrån och ned · antal pallar</p></div><div><button id="prev" aria-label="Föregående vecka">←</button> <button id="now">Denna vecka</button> <button id="next" aria-label="Nästa vecka">→</button></div></div>${!state.products.length?'<div class="empty"><h3>Din första vecka börjar här.</h3><p>Lägg till plastklossar och en produkt med recept för att börja planera.</p><button id="begin" class="primary">Lägg till plastkloss</button></div>':`<div class="table-wrap"><table><thead><tr><th>Produkt / prioritet</th>${weeks.map(w=>`<th>${week(w)}<br><small>${w} – ${add(w,6)}</small></th>`).join('')}</tr></thead><tbody>${state.products.map((p,i)=>`<tr><td><strong>${esc(p.name)}</strong><p class="muted">Prioritet ${i+1}</p></td>${weeks.map(w=>{const r=result[w+'/'+p.id],n=state.plans[w]?.[p.id];return `<td class="${r?.remaining&&r.possible===0?'zero':r&&r.possible<r.remaining?'short':''}"><input aria-label="${esc(p.name)} ${week(w)}" data-week="${w}" data-product="${p.id}" type="number" min="0" max="100000000" step="1" placeholder="Ingen plan" value="${n??''}">${r?`<div class="need">${Object.entries(r.need).map(([id,q])=>`${esc(state.blocks.find(b=>b.id===id).number)}: ${q} st`).join('<br>')}</div><progress max="${r.remaining||1}" value="${r.remaining?r.possible:n===0?1:0}"></progress><strong>${r.possible} / ${r.remaining} hela pallar</strong><div class="missing">${Object.entries(r.missing).filter(([,q])=>q>0).map(([id,q])=>`Saknas ${esc(state.blocks.find(b=>b.id===id).number)}: ${q} st`).join('<br>')}</div>${stampingHtml(r)}${r.excluded?`<p class="muted">${r.excluded} pallar före saldodatum undantas.</p>`:''}${n===0?'<p class="muted">Ingen produktion planerad (0)</p>':''}`:'<p class="muted">Ingen plan</p>'}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`}`;
 $('#prev').onclick=()=>{offset--;render()};$('#next').onclick=()=>{offset++;render()};$('#now').onclick=()=>{offset=0;render()};if($('#begin'))$('#begin').onclick=()=>blockForm();
 document.querySelectorAll('[data-week]').forEach(input=>input.onchange=()=>{if(!input.checkValidity()){input.reportValidity();return}const w=input.dataset.week,p=input.dataset.product;state.plans[w]??={};if(input.value==='')delete state.plans[w][p];else state.plans[w][p]=+input.value;save();render()});
 }else if(view==='blocks'){
 $('#content').innerHTML=`<div class="toolbar"><h2>Plastklossar</h2><button id="new" class="primary">Lägg till plastkloss</button></div>${state.blocks.map(b=>`<div class="card"><div><h3>${esc(b.number)} · ${esc(b.name)}</h3><span class="muted">Saldo vid början av ${b.asOf}</span></div><div><strong>${b.balance.toLocaleString('sv-SE')} st totalt</strong><p class="muted">${(b.marked||[]).map(m=>`${esc(m.name)}: ${m.balance} st`).join('<br>')||'Inga märkta klossar registrerade'}<br>Omärkta: ${b.balance-(b.marked||[]).reduce((n,m)=>n+m.balance,0)} st</p></div><div><button data-edit="${b.id}">Uppdatera saldo</button> <button data-delete="${b.id}">Ta bort</button></div></div>`).join('')||'<p>Inga plastklossar ännu.</p>'}<details class="rules"><summary>Planerade leveranser (${state.deliveries.length})</summary><p>Leveranser är tillgängliga vid början av leveransdagen.</p><button id="delivery">Lägg till leverans</button>${state.deliveries.map(d=>`<p>${d.date} · ${esc(state.blocks.find(b=>b.id===d.block).number)} · ${d.qty} st <button data-delivery="${d.id}">Ta bort</button></p>`).join('')}</details>`;
 $('#new').onclick=()=>blockForm();document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>blockForm(state.blocks.find(x=>x.id===b.dataset.edit)));
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{const id=b.dataset.delete;if(state.products.some(p=>p.recipe.some(r=>r.block===id))||state.deliveries.some(d=>d.block===id)){$('#message').textContent='Klossen används i ett recept eller en leverans och kan inte tas bort.';return}if(confirm('Ta bort plastklossen?')){state.blocks=state.blocks.filter(x=>x.id!==id);save();render()}});
 $('#delivery').onclick=()=>{if(!state.blocks.length)return;modal(`<h2>Planerad leverans</h2><label>Plastkloss<select name="block">${state.blocks.map(b=>`<option value="${b.id}">${esc(b.number)}</option>`).join('')}</select></label>${num('qty',1,'Antal (st)',1)}${day()}`,f=>state.deliveries.push({id:id(),block:f.get('block'),qty:+f.get('qty'),date:f.get('date')}))};
 document.querySelectorAll('[data-delivery]').forEach(b=>b.onclick=()=>{if(confirm('Ta bort leveransen?')){state.deliveries=state.deliveries.filter(d=>d.id!==b.dataset.delivery);save();render()}});
 }else{
 $('#content').innerHTML=`<div class="toolbar"><h2>Produkter / Recept</h2><button id="new" class="primary">Lägg till produkt</button></div><p class="muted">Ordningen styr materialprioritet inom varje dag. Ändringar i recept gäller alla planer.</p>${state.products.map((p,i)=>`<div class="card"><div><h3>${i+1}. ${esc(p.name)}</h3><span class="muted">${p.recipe.map(r=>`${esc(state.blocks.find(b=>b.id===r.block).number)}: ${r.qty} st / pall${r.mark?' · '+esc(r.mark):' · utan märkningskrav'}`).join('<br>')}</span></div><div><button data-up="${i}" ${i===0?'disabled':''} aria-label="Höj prioritet för ${esc(p.name)}">↑</button> <button data-edit="${p.id}">Redigera</button></div></div>`).join('')}`;
 $('#new').onclick=()=>productForm();document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>productForm(state.products.find(p=>p.id===b.dataset.edit)));document.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const i=+b.dataset.up;[state.products[i-1],state.products[i]]=[state.products[i],state.products[i-1]];save();render()});
 }}
 document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{view=b.dataset.view;$('#message').textContent='';render()});
 $('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`kloss2-${today}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#backup').textContent='Kopia exporterad. Förvara filen på en säker plats.'};
 $('#import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5000000)throw Error();const next=validate(JSON.parse(await file.text()));if(confirm('Ersätt alla lokala data med säkerhetskopian? Exportera först om du vill behålla nuvarande data.')){state=next;storageBlocked=false;save();render();$('#message').textContent='Säkerhetskopian har importerats.'}}catch{$('#message').textContent='Filen kunde inte importeras. Välj en giltig Kloss2-kopia. Dina data har inte ändrats.'}finally{e.target.value=''}};
 render();
