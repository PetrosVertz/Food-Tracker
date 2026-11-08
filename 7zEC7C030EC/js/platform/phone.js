// Phone features in one place: haptics, vibration, camera, barcode reader, keeping the screen on, sharing / saving files, clipboard.
// Food Track · Gym Buddy — the native app (Capacitor) swaps the inside of these functions for native plugins; callers never change.

const Phone = (() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let wake = null, detector = null, detectorP = null;
  const BARCODES = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

  return {
    isIOS,
    // a light tap: Android vibrates; iPhone web apps can't vibrate, so a hidden iOS switch gives the tick
    haptic(){ try{ if(navigator.vibrate && !isIOS) navigator.vibrate(8); else { const l = document.getElementById('hapL'); if(l) l.click(); } }catch(_){} },
    vibrate(pattern){ try{ navigator.vibrate?.(pattern); }catch(_){} },

    hasCamera: () => !!navigator.mediaDevices?.getUserMedia,
    camera(){ return navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } }); },

    // the phone's own barcode reader if it has one, otherwise a small library loaded once
    barcodeReader(){
      if(detector) return Promise.resolve(detector);
      return detectorP || (detectorP = (async () => {
        if('BarcodeDetector' in window){
          try{ const sup = await window.BarcodeDetector.getSupportedFormats();
            if(sup.includes('ean_13')) return detector = new window.BarcodeDetector({ formats: BARCODES.filter(f => sup.includes(f)) }); }catch(e){}
        }
        const m = await import('https://fastly.jsdelivr.net/npm/barcode-detector@3/dist/es/ponyfill.min.js');
        return detector = new m.BarcodeDetector({ formats: BARCODES });
      })().catch(e => { detectorP = null; throw e; }));
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
    openUrl(url){ if(/^https?:/.test(url)) window.open(url, '_blank', 'noopener'); else location.href = url; },
  };
})();
