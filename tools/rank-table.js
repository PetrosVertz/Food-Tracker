#!/usr/bin/env node
// Prints the rank fairness tables (docs/notes/rank-fairness.md) from the rating in js/data/gym.js.  Run: node tools/rank-table.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const c = {}; vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/data/gym.js'), 'utf8').replace(/^const /gm, 'var ') + '\n;this.G = { RANK, TIER_STD, TIERS, rankParts, rankScore, rankSteps, rankLevel, rankRefParts };', c);
const { TIER_STD, TIERS, rankScore, rankSteps, rankLevel, rankRefParts, rankParts } = c.G;
const name = n => `${TIERS[Math.floor(n / 3)][0].toUpperCase() + TIERS[Math.floor(n / 3)].slice(1)} ${3 - n % 3}`;
// smallest kg (0.5 steps) whose parts reach the level
const need = (mk, body, std, n) => { const st = rankSteps(body, std)[n]; if(!n) return 0; let a = 0, b = 2000;
  for(let i = 0; i < 50; i++){ const m = (a + b) / 2; if(rankScore(mk(m), body, std) >= st) b = m; else a = m; } return Math.ceil(b * 2) / 2; };
const ref = rankRefParts, x35 = kg => ({ P: kg * 7 / 6, W: kg * 7 / 6, V: kg * 15 });
const out = [];
for(const lift of ['bench', 'squat', 'deadlift']) for(const sex of ['m', 'f']){
  const std = { s: TIER_STD[lift], k: 1 }, bws = [55, 65, 80, 100, 120];
  out.push(`\n### ${lift[0].toUpperCase() + lift.slice(1)} · ${sex === 'm' ? 'men' : 'women'}\n`);
  out.push('| Level | ' + bws.map(b => `${b} kg`).join(' | ') + ' |'); out.push('|---|' + bws.map(() => '---:').join('|') + '|');
  for(let n = 0; n < 15; n++) out.push(`| ${name(n)} | ` + bws.map(bw => { const body = { bw, sex };
    return n ? `${need(ref, body, std, n)} · ${need(x35, body, std, n)}` : '–'; }).join(' | ') + ' |');
}
if(require.main === module) console.log(out.join('\n'));
module.exports = { c: c.G };
