/* share-export.js — files exported by ferrucci-lab.com apps (CSV, PDF report) go to the system share menu
 * on phones and tablets (WhatsApp, mail, Drive, Save to Files…), and are downloaded on computers as before.
 *
 *   if(ShareExport.wantsShare('text/csv')) …                  // touch screen + browser able to share such a file
 *   ShareExport.deliver(file, {title, askTap})                 // share, or download where sharing is not possible
 *   const blob = await ShareExport.pagesToPdf(pageElements)    // A4 portrait PDF, one page per element
 *
 * deliver(): the share menu needs a fresh user gesture. Call it straight from the click for a file built at
 * once (CSV). For a file that takes time (the PDF), the gesture may have expired when it is ready: deliver()
 * then calls askTap(share) and the app shows a small box whose « Partager » button calls share() — the tap
 * gives the new gesture. A cancelled share menu does nothing; any other failure downloads the file.
 *
 * pagesToPdf(): renders each element with html2canvas and puts it on an A4 page with jsPDF (both loaded from
 * jsDelivr on first use, ~550 KB, never on page load). The elements must be laid out (not display:none),
 * e.g. the print report shown off-screen with a fixed width of 186 mm (A4 minus the margins).
 * The text in the PDF is an image (not selectable), which is fine for a lab report.
 */
(function(global){
  'use strict';
  const LIBS = {
    html2canvas: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
  };
  const loaded = {};
  function loadScript(src){
    return loaded[src] || (loaded[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => res(); s.onerror = () => { delete loaded[src]; s.remove(); rej(new Error('load ' + src)); };
      document.head.appendChild(s);
    }));
  }

  const touch = () => !!(global.matchMedia && global.matchMedia('(pointer:coarse)').matches);
  function canShareFile(file){
    try{ return !!(navigator.share && navigator.canShare && navigator.canShare({files:[file]})); }catch(_){ return false; }
  }
  function wantsShare(type){
    if(!touch()) return false;
    const ext = {'text/csv':'csv', 'application/pdf':'pdf'}[type] || 'bin';
    return canShareFile(new File(['x'], 'test.' + ext, {type}));
  }
  function download(file){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = file.name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  // returns 'shared' | 'cancelled' | 'downloaded' | 'asked'
  async function deliver(file, {title, askTap} = {}){
    if(!touch() || !canShareFile(file)){ download(file); return 'downloaded'; }
    const share = async () => {
      try{ await navigator.share({files:[file], title: title || file.name}); return 'shared'; }
      catch(err){
        if(err && err.name === 'AbortError') return 'cancelled';
        if(err && err.name === 'NotAllowedError' && askTap) throw err;
        download(file); return 'downloaded';
      }
    };
    const fresh = !navigator.userActivation || navigator.userActivation.isActive;
    if(!fresh && askTap){ askTap(share); return 'asked'; }
    try{ return await share(); }
    catch(_){ askTap(share); return 'asked'; }   // NotAllowedError: the gesture had expired
  }

  async function pagesToPdf(pages, {marginTop = 11, marginSide = 12, scale = 2.5} = {}){
    await Promise.all([loadScript(LIBS.html2canvas), loadScript(LIBS.jspdf)]);
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    const {jsPDF} = global.jspdf;
    const pdf = new jsPDF({unit:'mm', format:'a4', orientation:'portrait', compress:true});
    const W = 210 - 2 * marginSide, H = 297 - 2 * marginTop;
    for(let i = 0; i < pages.length; i++){
      const canvas = await global.html2canvas(pages[i], {scale, backgroundColor:'#ffffff', useCORS:true, logging:false});
      let w = W, h = canvas.height * W / canvas.width;
      if(h > H){ w = w * H / h; h = H; }   // a very long table: shrink the page to fit
      if(i) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', marginSide + (W - w) / 2, marginTop, w, h, undefined, 'FAST');
    }
    return pdf.output('blob');
  }

  global.ShareExport = {wantsShare, deliver, download, pagesToPdf, loadScript, isTouch:touch};
})(window);
