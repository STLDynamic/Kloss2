export const date = d => d.toISOString().slice(0,10);
export const add = (s,n) => {const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return date(d)};
export function monday(s){const d=new Date(s+'T00:00:00Z');return add(s,-((d.getUTCDay()+6)%7))}
export function week(s){const m=monday(s),t=new Date(add(m,3)+'T00:00:00Z'),y=t.getUTCFullYear();return `${y} · v ${1+Math.round((new Date(m+'T00:00:00Z')-new Date(monday(y+'-01-04')+'T00:00:00Z'))/604800000)}`}
export function recipe(p){const r={};for(const x of p.recipe)r[x.block]=(r[x.block]||0)+x.qty;return r}
export function validate(s){
 const int=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
 const day=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&date(new Date(d))===d;
 const fail=()=>{throw Error('Ogiltig säkerhetskopia. Kontrollera filens format och innehåll.')};
 if(!s||s.version!==1||!Array.isArray(s.blocks)||!Array.isArray(s.products)||!Array.isArray(s.deliveries)||!s.plans||typeof s.plans!=='object'||Array.isArray(s.plans))fail();
 for(const list of [s.blocks,s.products,s.deliveries]){if(new Set(list.map(x=>x.id)).size!==list.length)fail();for(const x of list)if(typeof x.id!=='string'||!/^\w[\w-]{0,80}$/.test(x.id)||['__proto__','constructor','prototype'].includes(x.id))fail()}
 for(const b of s.blocks)if(typeof b.name!=='string'||!b.name.trim()||typeof b.number!=='string'||!b.number.trim()||!int(b.balance)||!day(b.asOf))fail();
 for(const b of s.blocks){
  if(b.marked!==undefined&&(!Array.isArray(b.marked)||b.marked.some(m=>typeof m.name!=='string'||!m.name.trim()||!int(m.balance))||new Set(b.marked.map(m=>m.name)).size!==b.marked.length||b.marked.reduce((n,m)=>n+m.balance,0)>b.balance))fail();
 }
 const ids=new Set(s.blocks.map(b=>b.id));
 for(const p of s.products)if(typeof p.name!=='string'||!p.name.trim()||!Array.isArray(p.recipe)||!p.recipe.length||p.recipe.some(r=>!ids.has(r.block)||!int(r.qty)||r.qty===0||(r.mark!==undefined&&(typeof r.mark!=='string'||(r.mark&&!s.blocks.find(b=>b.id===r.block)?.marked?.some(m=>m.name===r.mark))))))fail();
 for(const d of s.deliveries)if(!ids.has(d.block)||!int(d.qty)||!day(d.date))fail();
 for(const [key,values] of Object.entries(s.plans)){if(!day(key)||monday(key)!==key||!values||typeof values!=='object'||Array.isArray(values))fail();for(const [id,n] of Object.entries(values))if(!s.products.some(p=>p.id===id)||!int(n))fail()}
 return s;
}
export function forecast(s) {
 return projectInventory(s).plans;
}

export function projectInventory(s, summaryWeeks = []){
 const results={},available=Object.fromEntries(s.blocks.map(b=>[b.id,0]));
 const marked=new Map(s.blocks.map(b=>[b.id,new Map()]));
 const stock = Object.fromEntries(summaryWeeks.map(week => [week, {}]));
 const weeks = Object.keys(s.plans).sort();
 const summaryDates = [...summaryWeeks].sort();
 const firstWeek = [weeks[0], summaryDates[0]].filter(Boolean).sort()[0];
 if (!firstWeek) return {plans: results, stock};
 const start = [firstWeek, ...s.blocks.map(b => b.asOf)].sort()[0];
 const end = [
  weeks.length && add(weeks.at(-1), 4),
  summaryDates.length && add(summaryDates.at(-1), 6)
 ].filter(Boolean).sort().at(-1);
 for(let day=start;day<=end;day=add(day,1)){
  const m=monday(day),i=(new Date(day+'T00:00:00Z').getUTCDay()+6)%7;
  const summary = stock[m];
  for(const b of s.blocks)if(day===b.asOf){available[b.id]=b.balance;marked.set(b.id,new Map((b.marked||[]).map(m=>[m.name,m.balance])))}
  if (summary) {
   for (const block of s.blocks) {
    if (day >= block.asOf && !Object.hasOwn(summary, block.id)) {
     summary[block.id] = {from: day, opening: available[block.id], deliveries: 0, demand: 0, reserved: 0, closing: 0};
    }
   }
  }
  for (const delivery of s.deliveries) {
   if (delivery.date !== day || day < s.blocks.find(b => b.id === delivery.block).asOf) continue;
   available[delivery.block] += delivery.qty;
   if (summary) summary[delivery.block].deliveries += delivery.qty;
  }
  if (i === 6 && summary) {
   for (const [id, row] of Object.entries(summary)) row.closing = available[id];
  }
  if(i>4)continue;
  for(const p of s.products){const n=s.plans[m]?.[p.id];if(n===undefined)continue;const r=recipe(p),key=m+'/'+p.id;
   const out=results[key]??={planned:n,remaining:0,possible:0,missing:{},need:{},excluded:0,stamping:[],ready:0};
   const count=Math.floor(n/5)+(i<n%5?1:0);
   if(Object.keys(r).some(id=>day<s.blocks.find(b=>b.id===id).asOf)){out.excluded+=count;continue}
   out.remaining+=count;
   const possible=Math.min(count,...Object.entries(r).map(([id,q])=>Math.floor(available[id]/q)));out.possible+=possible;
   let ready=possible;
   for(const [id,q] of Object.entries(r)){
    const stock=marked.get(id),requirements=new Map();
    for(const row of p.recipe)if(row.block===id&&row.mark)requirements.set(row.mark,(requirements.get(row.mark)||0)+row.qty);
    const before=available[id];
    for(const [name,perPallet] of requirements){
     const need=count*perPallet,used=Math.min(need,stock.get(name)||0);
     ready=Math.min(ready,Math.floor((stock.get(name)||0)/perPallet));stock.set(name,(stock.get(name)||0)-used);
     let item=out.stamping.find(x=>x.block===id&&x.name===name);
     if(!item){item={block:id,name,need:0,prepared:0,toStamp:0};out.stamping.push(item)}
     item.need+=need;item.prepared+=used;item.toStamp+=need-used;
    }
    // Keep the marked subset within the shared stock after all material reservations.
    let excess=Math.max(0,[...stock.values()].reduce((a,b)=>a+b,0)-Math.max(0,before-count*q));
    for(const [name,balance] of stock){const used=Math.min(excess,balance);stock.set(name,balance-used);excess-=used}
   }
   out.ready+=ready;
   for (const [id, quantity] of Object.entries(r)) {
    const need = count * quantity;
    const reserved = Math.min(need, available[id]);
    out.need[id] = (out.need[id] || 0) + need;
    out.missing[id] = (out.missing[id] || 0) + need - reserved;
    available[id] -= reserved;
    if (summary) {
     summary[id].demand += need;
     summary[id].reserved += reserved;
    }
   }
  }
 }
 return {plans: results, stock};
}
