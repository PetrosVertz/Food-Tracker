#!/usr/bin/env node
// Rebuilds docs/form-review.html from the FORM_PICK table in js/data/gym.js.
// Run from the repo root:  node tools/form-review.js
// The page is static (no app code): it lists each hand-picked exercise with its photos and a "Wrong" tick box,
// and a Copy List button that copies the ticked exercise ids.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ctx = { console: { log() {}, warn() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data/gym.js'), 'utf8') + '\n;this.__G = { FORM_PICK, LIB_RAW };', ctx);
const { FORM_PICK, LIB_RAW } = ctx.__G;
const names = Object.fromEntries(LIB_RAW.map(r => [r[0], r[1]]));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const IMG = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';

const entries = Object.entries(FORM_PICK);
const withPhoto = entries.filter(([, v]) => v), none = entries.filter(([, v]) => !v);

const card = ([id, fe]) => `<li class="card"><label class="row"><input type="checkbox" value="${esc(id)}"><span><b>${esc(names[id] || id)}</b><small>${esc(id)} · ${esc(fe)}</small></span></label>
<div class="ph"><img loading="lazy" alt="" src="${IMG}${esc(fe)}/0.jpg"><img loading="lazy" alt="" src="${IMG}${esc(fe)}/1.jpg"></div></li>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Form Photo Review</title>
<style>
:root{--bg:#fff;--fg:#111;--mut:#555;--line:#ddd;--acc:#0a5c36}
@media (prefers-color-scheme:dark){:root{--bg:#111;--fg:#eee;--mut:#aaa;--line:#333;--acc:#6fd9a0}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.4 system-ui,sans-serif}
header{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 16px;display:flex;gap:12px;align-items:center;justify-content:space-between}
h1{font-size:18px;margin:0} button{font:inherit;padding:10px 16px;border-radius:10px;border:1px solid var(--acc);background:var(--acc);color:var(--bg)}
p.note{margin:12px 16px;color:var(--mut)} ul{list-style:none;margin:0;padding:0 16px 32px;display:grid;gap:16px;max-width:900px}
.card{border:1px solid var(--line);border-radius:12px;padding:12px} .row{display:flex;gap:12px;align-items:center}
.row input{width:26px;height:26px;flex:none} .row small{display:block;color:var(--mut);font-size:12px;word-break:break-all}
.ph{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px} .ph img{width:100%;border-radius:8px;background:var(--line)}
h2{font-size:16px;margin:16px} .none{margin:0 16px 32px;color:var(--mut)}
</style></head><body>
<header><h1>Form Photo Review (<span id="n">0</span> wrong)</h1><button id="copy" type="button">Copy List</button></header>
<p class="note">Tick Wrong on any exercise whose photos show a different movement, then tap Copy List and paste it into the chat.</p>
<ul>
${withPhoto.map(card).join('\n')}
</ul>
<h2>No photo (shown with our own steps only)</h2>
<p class="none">${none.map(([id]) => esc(names[id] || id)).join(', ') || 'None'}</p>
<script>
var boxes=[].slice.call(document.querySelectorAll('input[type=checkbox]')),n=document.getElementById('n');
function ticked(){return boxes.filter(function(b){return b.checked}).map(function(b){return b.value})}
boxes.forEach(function(b){b.addEventListener('change',function(){n.textContent=ticked().length})});
document.getElementById('copy').addEventListener('click',function(){var t=ticked().join(', '),btn=this;
 function done(){btn.textContent='Copied';setTimeout(function(){btn.textContent='Copy List'},1500)}
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,function(){prompt('Copy this list:',t)})}else{prompt('Copy this list:',t)}});
</script></body></html>
`;
fs.writeFileSync(path.join(root, 'docs/form-review.html'), html);
console.log(`docs/form-review.html: ${withPhoto.length} with photos, ${none.length} without`);
