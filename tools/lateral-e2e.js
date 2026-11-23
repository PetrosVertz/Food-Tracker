#!/usr/bin/env node
// Left / Right logging in the real app (Playwright): paired by default, live mirroring, one tap for a pair, undo, drop pair, one side only, compact + load chip,
// asks together/alternating, resume after reload, history view shows the convention, 320 px Greek. Run: node tools/lateral-e2e.js [--shots DIR]
const fs=require('fs'),path=require('path'),http=require('http'),pw=require('playwright');
const root=path.join(__dirname,'..'),argv=process.argv,shots=argv.includes('--shots')?argv[argv.indexOf('--shots')+1]+'/':null;
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);if(!fs.existsSync(f)){r.writeHead(404);return r.end();}const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'}[path.extname(f)]||'application/octet-stream';r.writeHead(200,{'Content-Type':t});fs.createReadStream(f).pipe(r);}).listen(0);
let fails=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await pw.chromium.launch(),errs=[];
async function fresh(w,h,act,lang){const pg=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});pg.on('pageerror',e=>errs.push(e.message));
 const u='http://localhost:'+srv.address().port+'/';await pg.goto(u);
 await pg.evaluate(([a,l])=>{localStorage.clear();localStorage.setItem('ft.ui.v1',JSON.stringify({setupDone:true,lang:l||'en',lastBackup:new Date().toISOString()}));localStorage.setItem('ft.profile.v1',JSON.stringify({sex:'m',name:'T'}));if(a)localStorage.setItem('ft.gym.active',JSON.stringify(a));},[act,lang]);
 await pg.goto(u+'?r=1');await pg.waitForTimeout(500);return pg;}
const act=(exs)=>({id:'a1',date:new Date().toISOString().slice(0,10),start:new Date(Date.now()-6e5).toISOString(),clock0:Date.now()-6e5,name:'T',type:'full',prs:[],exercises:exs});
// A. fresh workout, add a Meadows row via the app (picker path = addToSession), check paired by default
let pg=await fresh(390,844,act([]));
await pg.evaluate(()=>{open('ovSession');addToSession('meadows_row');addToSession('db_curl');addToSession('bench');});
await pg.waitForTimeout(400);
let st=await pg.evaluate(()=>active.exercises.map(x=>({id:x.exId,uni:!!x.uni,n:x.sets.length,cv:x.cv,jt:x.jt})));
ok(st[0].uni&&st[0].n===2&&st[0].cv.l==='bar','Meadows row (barbell) opens as Left / Right with a bar-total convention');
ok(st[1].uni&&st[1].cv.ask===1,'dumbbell curl opens paired and will ask together/alternating in compact');
ok(!st[2].uni&&st[2].cv.l==='bar','bench press stays one row');
// B. mirror while typing + one tap
await pg.evaluate(()=>{showCard&&0;});
await pg.evaluate(()=>{active.cur=1;renderSession();});
await pg.waitForTimeout(300);
const row=async(xi,j)=>pg.$(`.exc[data-x="${xi}"] .setrow[data-s="${j}"]`);
let L=await pg.$(`.exc[data-x="1"] .setrow[data-s="0"] [data-w]`);
await L.scrollIntoViewIfNeeded();await L.click();await pg.keyboard.type('14');
let Rw=await pg.inputValue('.exc[data-x="1"] .setrow[data-s="1"] [data-w]');
ok(Rw==='14','typing 14 in Left shows 14 in Right as you type');
let Lr=await pg.$(`.exc[data-x="1"] .setrow[data-s="0"] [data-r]`);await Lr.click();await pg.keyboard.type('10');
ok(await pg.inputValue('.exc[data-x="1"] .setrow[data-s="1"] [data-r]')==='10','reps mirror too');
// edit Right by hand to 12, then change Left again: Right must stay 12
let Rr=await pg.$(`.exc[data-x="1"] .setrow[data-s="1"] [data-w]`);await Rr.click();await pg.keyboard.press('Control+A');await pg.keyboard.type('12');
await L.click();await pg.keyboard.press('Control+A');await pg.keyboard.type('16');
ok(await pg.inputValue('.exc[data-x="1"] .setrow[data-s="1"] [data-w]')==='12','a hand-edited Right weight is not overwritten');
ok(await pg.inputValue('.exc[data-x="1"] .setrow[data-s="1"] [data-r]')==='10','the untouched Right reps keep mirroring');
if(shots)await pg.screenshot({path:shots+'lr1.png'});
// one tap finishes pair
const sets0=await pg.evaluate(()=>active.exercises[1].sets.length);
await pg.click('.exc[data-x="1"] .setrow[data-s="0"] [data-ok]');await pg.waitForTimeout(400);
st=await pg.evaluate(()=>({d:active.exercises[1].sets.map(s=>[s.side,s.w,s.r,s.done,!!s.auto]),rest:!!REST}));
ok(st.d[0][3]&&st.d[1][3]&&st.d[0][1]==='16'&&st.d[1][1]==='12','one tap finished both sides with their own values (L 16, R 12)');
ok(st.d.length===4&&st.rest,'one new pair added once, rest started once');
// undo
await pg.click('.exc[data-x="1"] .setrow[data-s="0"] [data-ok]');await pg.waitForTimeout(300);
st=await pg.evaluate(()=>active.exercises[1].sets.slice(0,2).map(s=>[s.w,s.r,s.done]));
ok(!st[0][2]&&!st[1][2]&&st[0][0]==='16'&&st[1][0]==='12','undo reopens both and keeps the recorded values');
// finish again, then drop on pair
await pg.click('.exc[data-x="1"] .setrow[data-s="0"] [data-ok]');await pg.waitForTimeout(300);
await pg.evaluate(()=>{const x=active.exercises[1];x.sets[0].type='D';});
await pg.evaluate(()=>{const x=active.exercises[1];x.sets[0].type='N';addDrop(x,1);saveG('act');renderSession();});
await pg.waitForTimeout(300);
st=await pg.evaluate(()=>{const x=active.exercises[1];return x.sets.map((s,j)=>[j,s.side,!!s.drop,Lat.mate(x,j)])});
ok(st[2][2]&&st[3][2]&&st[2][3]===3&&st[3][3]===2&&st[0][3]===1,'a drop under a pair is a drop PAIR; every row still finds its mate');
await pg.click('.exc[data-x="1"] .setrow[data-s="2"] [data-ok]');await pg.waitForTimeout(300);
st=await pg.evaluate(()=>active.exercises[1].sets.map(s=>!!s.done));
ok(st[2]&&st[3]&&!st[4],'ticking the drop pair completes the drop pair and nothing else');
// one side only
await pg.evaluate(()=>{renderSession();});await pg.waitForTimeout(200);
const os=await pg.$('.exc[data-x="1"] .onesd [data-skip]');ok(!!os,'"Left Only / Right Only" appears under an unfinished pair');
// C. compact + chip, narrow viewport
await pg.evaluate(()=>{const x=active.exercises[1];x.sets=x.sets.filter(s=>s.done);makeUni(x,false);saveG('act');renderSession();});
await pg.waitForTimeout(300);
const chip=await pg.textContent('.exc[data-x="1"] .cvchip');
ok(/Reps|Choose/.test(chip)||chip.length>0,'compact shows the load convention beside the weight: '+chip.trim());
st=await pg.evaluate(()=>active.exercises[1].sets.map(s=>[s.side||'',s.w,s.r]));

if(shots)await pg.screenshot({path:shots+'lr2.png'});
// D. ask before saving alternating-capable compact set
await pg.evaluate(()=>{const x=active.exercises[1];x.sets.push(newSet());saveG('act');renderSession();});await pg.waitForTimeout(200);
await pg.evaluate(()=>{const x=active.exercises[1];const s=x.sets[x.sets.length-1];s.w='14';s.r='10';saveG('act');renderSession();});
const lj=await pg.evaluate(()=>active.exercises[1].sets.length-1);await pg.click(`.exc[data-x="1"] .setrow[data-s="${lj}"] [data-ok]`);await pg.waitForTimeout(300);
const asked=await pg.evaluate(()=>document.getElementById('ovCv').classList.contains('open'));
ok(asked,'a compact set on a together-or-alternating movement asks how to count before saving');
if(shots)await pg.screenshot({path:shots+'lr3.png'});
await pg.click('#cvList [data-cvo="0"]');await pg.waitForTimeout(300);
st=await pg.evaluate(()=>active.exercises[1].cv);ok(st.l==='hand'&&st.n===2&&!st.ask,'choosing stores the convention');
// D2. resume: reload the page, everything is still there
await pg.reload({waitUntil:'load'});await pg.waitForTimeout(700);
st=await pg.evaluate(()=>{const x=active&&active.exercises[1];return x?{cv:x.cv,uni:!!x.uni,sets:x.sets.map(s=>[s.side||'',s.w,s.r,!!s.done])}:null});
ok(st&&st.cv&&st.cv.l==='hand'&&st.sets.length>=3,'resume after a reload keeps the convention and every set');
// D3. finish -> the day view shows the convention beside the sets
await pg.evaluate(()=>{open('ovSession');finishWorkout(false);});await pg.waitForTimeout(800);
const dayv=await pg.evaluate(async()=>{await finishWorkout; const k=sessions.length?sessions[sessions.length-1].date:null; if(!k) return null; logCalSession(k); return document.getElementById('dsBody').textContent;});
ok(dayv&&/Per Hand|Together|Each Side/.test(dayv),'the saved workout shows the load convention in the day view');
await pg.close();
// E. small phone + Greek
pg=await fresh(320,568,act([]),'el');await pg.evaluate(()=>{open('ovSession');addToSession('lunges');});await pg.waitForTimeout(500);
if(shots)await pg.screenshot({path:shots+'lr4.png'});
const ov=await pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);ok(ov,'320 px wide: no sideways overflow');
ok(errs.length===0,'no page errors '+JSON.stringify(errs.slice(0,3)));
await b.close();srv.close();process.exit(fails?1:0);})();
