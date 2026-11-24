// node tools/foods/test.js. Uses the same Playwright installation as tools/check.js --boot.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
async function run(){
  const server = http.createServer((req, res) => {
    const route = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (route === '/' ? '/index.html' : route));
    if(!file.startsWith(root + path.sep) || !fs.existsSync(file)){res.writeHead(404).end(); return;}
    const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json'};
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(done => server.listen(0,'127.0.0.1',done));
  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port, {waitUntil:'domcontentloaded'});
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready;
      if(!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, {once:true}));
      return reg.active?.state;
    });
    await context.setOffline(true);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'catalogue-cases.js'),'utf8')});
    console.log(await page.evaluate(() => foodCatalogueCases()), 'offline food catalogue checks passed');
  } finally {
    if(browser) await browser.close();
    server.close();
  }
}
run().catch(err => { console.error(err); process.exitCode = 1; });
