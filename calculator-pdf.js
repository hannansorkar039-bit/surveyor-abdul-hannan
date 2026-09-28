/* Bengali-capable PDF helper. Local TTF + in-memory cache. */
(function(){
  const FONT_URL='fonts/Lohit-Bengali.ttf';
  let fontBase64=null, readyPromise=null;
  function arrayBufferToBase64(buffer){
    const bytes=new Uint8Array(buffer); let binary=''; const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    return btoa(binary);
  }
  async function loadFont(){
    if(fontBase64) return fontBase64;
    const response=await fetch(FONT_URL,{cache:'force-cache'});
    if(!response.ok) throw new Error('Bengali font unavailable');
    fontBase64=arrayBufferToBase64(await response.arrayBuffer());
    return fontBase64;
  }
  async function ensure(){
    if(readyPromise) return readyPromise;
    readyPromise=(async()=>{
      if(!(window.jspdf&&window.jspdf.jsPDF)) return false;
      try{ await loadFont(); return true; }catch(e){ return false; }
    })();
    return readyPromise;
  }
  window.SAH_PDF={
    ensure,
    async create(options){
      if(!(window.jspdf&&window.jspdf.jsPDF)) return null;
      const ok=await ensure();
      const doc=new window.jspdf.jsPDF(options||{});
      if(ok){
        try{
          doc.addFileToVFS('Lohit-Bengali.ttf',fontBase64);
          doc.addFont('Lohit-Bengali.ttf','LohitBengali','normal');
          doc.addFont('Lohit-Bengali.ttf','LohitBengali','bold');
          doc.setFont('LohitBengali','normal');
        }catch(e){}
      }
      return doc;
    },
    fontFamily:'LohitBengali'
  };
})();
