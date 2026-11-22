const { chromium } = require('playwright'); const fs = require('fs');
const R = '/home/user/Food-Tracker/js/'; const out = process.argv[2]; const mode = process.argv[3] || 'neutral';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1312, height: 1199 }, deviceScaleFactor: 1 });
  await p.setContent('<html><body style="margin:0;background:#fff"><div id=x></div></body></html>');
  await p.addScriptTag({ content: fs.readFileSync(R + 'data/recovery-anatomy.js', 'utf8') + fs.readFileSync(R + 'recovery-anatomy.js', 'utf8') });
  for (const sex of ['m', 'f']) {
    // whole sheet at 1:1: crop = full sheet
    const html = await p.evaluate(([sex, mode]) => {
      const cols = mode === 'mixed' ? { chest_mid: '#e8b04a', chest_lower: '#59d38c', chest_upper: '#59d38c', delt_front: '#ff6b5c', delt_side: '#e8b04a', delt_rear: '#59d38c', biceps: '#ff6b5c', triceps: '#59d38c',
        quads: '#ff6b5c', hamstrings: '#e8b04a', glutes: '#59d38c', abductors: '#e8b04a', lats: '#e8b04a', lower_back: '#59d38c', upper_back: '#ff6b5c', traps: '#59d38c', abs: '#59d38c', obliques: '#e8b04a', calves: '#59d38c', adductors: '#e8b04a', forearms: '#59d38c' } : {};
      const D = RA_DATA[sex]; const svg = recoveryAnatomySVG({ sex, view: 'both', colorsByHead: cols, crop: [0, 0, D.W, D.H], w: D.W, h: D.H, idPrefix: 'c' + sex });
      return svg; }, [sex, mode]);
    await p.evaluate(h => { document.getElementById('x').innerHTML = h; }, html);
    await p.screenshot({ path: `${out}/${sex}_${mode}.png`, clip: { x: 0, y: 0, width: 1312, height: 1199 } });
  }
  await b.close();
})();
