// Phone features in one place: haptics, vibration, camera, barcode reader, keeping the screen on, sharing / saving files, clipboard.
// Food Track · Gym Buddy — the native app (Capacitor) swaps the inside of these functions for native plugins; callers never change.

const Phone = (() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let wake = null, detector = null, detectorP = null, qrP = null, ctx = null;
  const BARCODES = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
  const PONY = 'https://fastly.jsdelivr.net/npm/barcode-detector@3/dist/es/ponyfill.min.js';   // the reader iPhone uses (no BarcodeDetector in Safari)

  return {
    isIOS,
    // a light tap: Android vibrates; iPhone web apps can't vibrate, so a hidden iOS switch gives the tick
    haptic(){ try{ if(navigator.vibrate && !isIOS) navigator.vibrate(8); else { const l = document.getElementById('hapL'); if(l) l.click(); } }catch(_){} },
    vibrate(pattern){ try{ navigator.vibrate?.(pattern); }catch(_){} },

    // sounds made with Web Audio (no sound files). iPhone: Web Audio follows the silent switch, so a muted phone stays quiet.
    // Call unlockAudio() from a tap once (the browser only lets sound start after one); sound('bell') = boxing-ring bell, sound('done') = soft finish tone.
    unlockAudio(){ try{ if(!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if(ctx.state === 'suspended') ctx.resume(); }catch(_){} },
    sound(kind){
      try{ this.unlockAudio(); if(!ctx) return; const now = ctx.currentTime, out = ctx.createGain(); out.connect(ctx.destination);
        // one partial: starts at `at`, rings out over `len` seconds
        const tone = (f, at, peak, len, type) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.value = f; o.connect(g); g.connect(out);
          g.gain.setValueAtTime(.0001, now + at); g.gain.exponentialRampToValueAtTime(peak, now + at + .006); g.gain.exponentialRampToValueAtTime(.0001, now + at + len); o.start(now + at); o.stop(now + at + len + .05); };
        if(kind === 'bell'){   // two quick strikes of a metal bell: inharmonic partials, the higher ones die faster
          out.gain.value = .8;
          [0, .32].forEach(at => [[1, .34, 1.7], [2.76, .2, 1.1], [5.4, .1, .6], [8.93, .05, .35]].forEach(([k, pk, len]) => tone(660 * k, at, pk, len)));
        }else if(kind === 'done'){   // quiet, soft, rising: C – E – G – C, long gentle tails
          out.gain.value = .5;
          [[523.25, 0], [659.25, .14], [783.99, .28], [1046.5, .44]].forEach(([f, at], i) => { tone(f, at, .16, 1.6 + i * .15); tone(f * 2, at, .02, .9); });
        }
      }catch(_){}
    },

    hasCamera: () => !!navigator.mediaDevices?.getUserMedia,
    // hi: as sharp as the camera allows (receipts), otherwise Full HD
    camera(hi){ return navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: hi ? 3840 : 1920 }, height: { ideal: hi ? 2160 : 1080 } } }); },

    // the phone's own barcode reader if it has one, otherwise a small library loaded once
    barcodeReader(){
      if(detector) return Promise.resolve(detector);
      return detectorP || (detectorP = (async () => {
        if('BarcodeDetector' in window){
          try{ const sup = await window.BarcodeDetector.getSupportedFormats();
            if(sup.includes('ean_13')) return detector = new window.BarcodeDetector({ formats: BARCODES.filter(f => sup.includes(f)) }); }catch(e){}
        }
        const m = await import(PONY);
        return detector = new m.BarcodeDetector({ formats: BARCODES });
      })().catch(e => { detectorP = null; throw e; }));
    },
    // QR codes (shared workouts, 0.7.7): the phone's own reader if it reads QR, otherwise the same library as barcodes
    qrReader(){
      return qrP || (qrP = (async () => {
        if('BarcodeDetector' in window){
          try{ if((await window.BarcodeDetector.getSupportedFormats()).includes('qr_code')) return new window.BarcodeDetector({ formats: ['qr_code'] }); }catch(e){}
        }
        const m = await import(PONY);
        return new m.BarcodeDetector({ formats: ['qr_code'] });
      })().catch(e => { qrP = null; throw e; }));
    },

    async keepScreenOn(on){
      try{ if(on){ if(!wake && navigator.wakeLock && document.visibilityState === 'visible'){ wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } }
        else if(wake){ const w = wake; wake = null; await w.release(); } }catch(e){ wake = null; }
    },

    // share a file (iPhone: share sheet → Files / iCloud Drive); falls back to a download. Throws AbortError if the person cancels.
    async shareFile(blob, name){
      const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
      if(navigator.canShare && navigator.canShare({ files: [file] })){ await navigator.share({ files: [file], title: name }); return 'shared'; }
      this.download(blob, name); return 'downloaded';
    },
    download(blob, name){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); },
    // share text; false when there's no share sheet (the caller copies instead). Throws AbortError if cancelled.
    async shareText(title, text){ if(!navigator.share) return false; await navigator.share({ title, text }); return true; },
    async copy(text){
      try{ await navigator.clipboard.writeText(text); }
      catch(e){ const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(_){} ta.remove(); }
    },
    // 0.7.9: pick one photo. 'camera' opens the front camera, 'library' the photo library. Resolves to the File, or null when cancelled.
    pickPhoto(src){ return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; if(src === 'camera') i.setAttribute('capture', 'user');
      i.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0'; document.body.appendChild(i);
      const done = f => { i.remove(); res(f || null); };
      i.addEventListener('change', () => done(i.files && i.files[0]), { once: true }); i.addEventListener('cancel', () => done(null), { once: true }); i.click(); }); },
    // the phone's position, once. Rounded to 2 decimals (about 1 km): enough to find shops, not enough to find a door.
    // { lat, lon } or { err: 'denied' | 'unavailable' | 'timeout' | 'ask' }. quiet: never opens the permission question ('ask' = not allowed yet).
    async locate(o){
      if(!navigator.geolocation) return { err: 'unavailable' };
      if(o && o.quiet){ try{ const st = await navigator.permissions.query({ name: 'geolocation' }); if(st.state === 'denied') return { err: 'denied' }; if(st.state !== 'granted') return { err: 'ask' }; }catch(e){ return { err: 'ask' }; } }
      const r2 = v => Math.round(v * 100) / 100;
      return new Promise(res => navigator.geolocation.getCurrentPosition(p => res({ lat: r2(p.coords.latitude), lon: r2(p.coords.longitude) }),
        e => res({ err: e && e.code === 1 ? 'denied' : e && e.code === 3 ? 'timeout' : 'unavailable' }), { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }));
    },
    openUrl(url){ if(/^https?:/.test(url)) window.open(url, '_blank', 'noopener'); else location.href = url; },
  };
})();
