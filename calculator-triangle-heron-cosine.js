(function () {
  'use strict';
  function init() {
    const $ = id => document.getElementById(id);
    const result = $('thcResult');
    const drawing = $('thcDrawing');
    if (!result || !drawing) return;
    const sideIds = {
      a: { ft: 'thcAFt', inch: 'thcAIn' },
      b: { ft: 'thcBFt', inch: 'thcBIn' },
      c: { ft: 'thcCFt', inch: 'thcCIn' }
    };
    let derivedSide = null;
    const fmt = (n, digits = 4) => Number(n).toLocaleString('bn-BD', { minimumFractionDigits: 0, maximumFractionDigits: digits, useGrouping: false });
    const fmtFeetInches = feet => {
      const totalInches = Math.round(feet * 12);
      return Math.floor(totalInches / 12).toLocaleString('bn-BD', {useGrouping:false}) + "'-" + (totalInches % 12).toLocaleString('bn-BD', {useGrouping:false}) + '"';
    };
    const setAngles = (A, B, C) => {
      [['thcAngleA', A], ['thcAngleB', B], ['thcAngleC', C]].forEach(([id, value]) => {
        const el = $(id);
        if (el) el.textContent = Number.isFinite(value) ? fmt(value, 2) + '°' : '—°';
      });
    };
    const readSide = side => {
      if (side === derivedSide) return null;
      const ftText = $(sideIds[side].ft).value.trim();
      const inText = $(sideIds[side].inch).value.trim();
      if (ftText === '' && inText === '') return null;
      const ft = ftText === '' ? 0 : Number(ftText);
      const inch = inText === '' ? 0 : Number(inText);
      if (!Number.isFinite(ft) || !Number.isFinite(inch) || ft < 0 || inch < 0 || !Number.isInteger(ft) || inch > 11 || !Number.isInteger(inch)) {
        throw new Error('ফুট ও ইঞ্চি পূর্ণ সংখ্যা হতে হবে; ইঞ্চি ০–১১-এর মধ্যে দিন।');
      }
      return ft + inch / 12;
    };
    const angle = (opposite, side1, side2) => {
      const cosine = (side1 * side1 + side2 * side2 - opposite * opposite) / (2 * side1 * side2);
      return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
    };
    const showError = message => {
      setAngles(NaN, NaN, NaN);
      drawing.innerHTML = '<div class="calc-help" role="alert">' + message + '</div>';
      result.innerHTML = '<div class="warning" role="alert">' + message + '</div>';
    };
    const clearOutputs = () => {
      result.innerHTML = ''; setAngles(NaN, NaN, NaN);
      drawing.innerHTML = '<div class="calc-help">তিন বাহুর মাপ অথবা নির্বাচিত কোণের দুই পাশের বাহু ও কোণ দিলে ড্রয়িং দেখা যাবে।</div>';
    };
    const writeSide = (side, feet) => {
      const totalInches = Math.round(feet * 12);
      $(sideIds[side].ft).value = String(Math.floor(totalInches / 12));
      $(sideIds[side].inch).value = String(totalInches % 12);
      derivedSide = side;
    };
    let drawingZoom = 1, drawingPanX = 0, drawingPanY = 0;
    function applyDrawingTransform() {
      const group = $('thcDrawingViewport');
      if (group) group.setAttribute('transform', 'translate('+drawingPanX+' '+drawingPanY+') translate(380 220) scale('+drawingZoom+') translate(-380 -220)');
    }
    function attachDrawingControls() {
      const svg = drawing.querySelector('svg');
      if (!svg) return;
      drawingZoom = 1; drawingPanX = 0; drawingPanY = 0;
      // One finger pans; exactly two fingers perform smooth pinch zoom.
      const activePointers = new Map();
      let dragging = false, startX = 0, startY = 0, startPanX = 0, startPanY = 0;
      let pinchStartDistance = 0, pinchStartZoom = 1, pinchStartPanX = 0, pinchStartPanY = 0;
      let pinchStartCenterX = 0, pinchStartCenterY = 0;
      const distance = (p1, p2) => Math.hypot(p2.x-p1.x, p2.y-p1.y);
      const center = (p1, p2) => ({x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2});
      const beginPinch = () => {
        const pts = [...activePointers.values()];
        if (pts.length !== 2) return;
        dragging = false; pinchStartDistance = Math.max(distance(pts[0],pts[1]),1);
        pinchStartZoom = drawingZoom; pinchStartPanX = drawingPanX; pinchStartPanY = drawingPanY;
        const c = center(pts[0],pts[1]); pinchStartCenterX = c.x; pinchStartCenterY = c.y;
      };
      svg.addEventListener('pointerdown', e => {
        activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
        try { svg.setPointerCapture(e.pointerId); } catch (_) {}
        if (activePointers.size === 2) { beginPinch(); }
        else if (activePointers.size === 1) {
          dragging = true; startX=e.clientX; startY=e.clientY; startPanX=drawingPanX; startPanY=drawingPanY;
          svg.style.cursor='grabbing';
        }
        e.preventDefault();
      });
      svg.addEventListener('pointermove', e => {
        if (!activePointers.has(e.pointerId)) return;
        activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
        const pts=[...activePointers.values()];
        if (pts.length >= 2) {
          const d=Math.max(distance(pts[0],pts[1]),1), c=center(pts[0],pts[1]);
          drawingZoom=Math.max(0.6,Math.min(3,pinchStartZoom*d/pinchStartDistance));
          const rect=svg.getBoundingClientRect(), factor=760/Math.max(rect.width,1);
          drawingPanX=pinchStartPanX+(c.x-pinchStartCenterX)*factor;
          drawingPanY=pinchStartPanY+(c.y-pinchStartCenterY)*factor;
          applyDrawingTransform();
        } else if (dragging && pts.length === 1) {
          const rect=svg.getBoundingClientRect(), factor=760/Math.max(rect.width,1);
          drawingPanX=startPanX+(e.clientX-startX)*factor;
          drawingPanY=startPanY+(e.clientY-startY)*factor;
          applyDrawingTransform();
        }
        e.preventDefault();
      });
      const endDrag = e => {
        activePointers.delete(e.pointerId);
        if (activePointers.size === 1) {
          const remaining=[...activePointers.values()][0];
          dragging=true; startX=remaining.x; startY=remaining.y; startPanX=drawingPanX; startPanY=drawingPanY;
        } else if (activePointers.size === 0) dragging=false;
        if (activePointers.size < 2) svg.style.cursor='grab';
      };
      svg.addEventListener('pointerup', endDrag); svg.addEventListener('pointercancel', endDrag); svg.addEventListener('lostpointercapture', endDrag);
      applyDrawingTransform();
    }
    function setDrawingZoom(delta) {
      drawingZoom = Math.max(0.6, Math.min(3, drawingZoom + delta)); applyDrawingTransform();
    }
    function resetDrawingView() { drawingZoom = 1; drawingPanX = 0; drawingPanY = 0; applyDrawingTransform(); }
    function update() {
      let vals;
      try { vals = { a: readSide('a'), b: readSide('b'), c: readSide('c') }; }
      catch (err) { showError(err.message); return; }
      const entered = Object.keys(vals).filter(k => vals[k] !== null);
      const angleInput = $('thcAngleInput').value.trim();
      const selectedAngle = $('thcAngleSelect').value;
      let suppliedAngle = null;
      if (angleInput !== '') {
        suppliedAngle = Number(angleInput);
        if (!Number.isFinite(suppliedAngle) || suppliedAngle <= 0 || suppliedAngle >= 180) {
          showError('নির্বাচিত কোণ ০°-এর বেশি এবং ১৮০°-এর কম হতে হবে।'); return;
        }
      }
      if (entered.length === 2) {
        if (suppliedAngle === null) { clearOutputs(); return; }
        const missing = ['a','b','c'].find(k => vals[k] === null);
        if (missing !== selectedAngle.toLowerCase()) {
          const needed = {A:'বাহু b ও c', B:'বাহু a ও c', C:'বাহু a ও b'}[selectedAngle];
          showError('কোণ '+selectedAngle+' ব্যবহার করতে '+needed+'-এর মাপ দিন। নির্বাচিত কোণের দুই পাশের বাহুই ইনপুট দিতে হবে।'); return;
        }
        const adjacent = selectedAngle === 'A' ? [vals.b, vals.c] : selectedAngle === 'B' ? [vals.a, vals.c] : [vals.a, vals.b];
        const x = adjacent[0], y = adjacent[1], rad = suppliedAngle * Math.PI / 180;
        if (!(x > 0 && y > 0)) { showError('দুটি বাহুর মাপ শূন্যের চেয়ে বড় হতে হবে।'); return; }
        const squared = x*x + y*y - 2*x*y*Math.cos(rad);
        if (!(squared > 0)) { showError('এই কোণে তৃতীয় বাহুর বৈধ মাপ পাওয়া যায়নি।'); return; }
        const derivedLength = Math.sqrt(squared);
        writeSide(missing, derivedLength);
        // Keep the exact calculated length internally; round only the displayed ft-inch input.
        // This avoids changing the entered angle because of whole-inch display rounding.
        vals[missing] = derivedLength;
      } else if (entered.length < 2) { clearOutputs(); return; }
      const a = vals.a, b = vals.b, c = vals.c;
      if (!(a > 0 && b > 0 && c > 0)) { showError('তিনটি বাহুর প্রত্যেকটির মোট মাপ শূন্যের চেয়ে বড় হতে হবে।'); return; }
      if (a + b <= c || a + c <= b || b + c <= a) { showError('এই তিন বাহু দিয়ে বৈধ ত্রিভুজ গঠন সম্ভব নয়। যেকোনো দুই বাহুর যোগফল তৃতীয় বাহুর চেয়ে বেশি হতে হবে।'); return; }
      let A = angle(a, b, c), B = angle(b, a, c), C = 180 - A - B;
      if (suppliedAngle !== null && entered.length === 2) {
        // Preserve the user's selected angle exactly; derive the other two from the unrounded side.
        if (selectedAngle === 'A') A = suppliedAngle;
        else if (selectedAngle === 'B') B = suppliedAngle;
        else C = suppliedAngle;
        if (selectedAngle === 'A') C = 180 - A - B;
        else if (selectedAngle === 'B') C = 180 - A - B;
        else B = 180 - A - C;
      }
      const area = 0.5 * b * c * Math.sin(A * Math.PI / 180);
      if (![A, B, C, area].every(Number.isFinite) || !(area > 0)) { showError('এই মাপ থেকে নির্ভরযোগ্য ফলাফল নির্ণয় করা যায়নি। মাপ যাচাই করুন।'); return; }
      const W = 900, H = 560, padX = 155, padY = 125;
      const xC = 0, yC = 0, xB = a, xA = (b*b + a*a - c*c) / (2*a), yA = Math.sqrt(Math.max(0, b*b - xA*xA));
      const minX = Math.min(xC, xB, xA), maxX = Math.max(xC, xB, xA), minY = 0, maxY = yA;
      const scale = Math.min((W - 2*padX) / Math.max(maxX-minX, 0.000001), (H - 2*padY) / Math.max(maxY-minY, 0.000001));
      const px = x => padX + (x-minX)*scale, py = y => H-padY-(y-minY)*scale;
      const Axy = [px(xA), py(yA)], Bxy = [px(xB), py(0)], Cxy = [px(xC), py(0)];
      const dimensionLabel = (p, q, text, offset = 18) => {
        const dx=q[0]-p[0], dy=q[1]-p[1], len=Math.hypot(dx,dy)||1, mx=(p[0]+q[0])/2, my=(p[1]+q[1])/2;
        const nx=-dy/len, ny=dx/len; let rotation=Math.atan2(dy,dx)*180/Math.PI;
        if(rotation>90)rotation-=180; if(rotation< -90)rotation+=180;
        const tx=mx+nx*offset, ty=my+ny*offset;
        return '<text x="'+tx+'" y="'+ty+'" text-anchor="middle" dominant-baseline="middle" class="thc-dimension" transform="rotate('+rotation+' '+tx+' '+ty+')">'+text+'</text>';
      };
      const angleText = (p,q,r,label,deg) => {
        // Place the angle and its degree outside the polygon, along the external angle bisector.
        // Rotate the text parallel to one adjacent side, keeping text upright for readability.
        const v1=[q[0]-p[0],q[1]-p[1]],v2=[r[0]-p[0],r[1]-p[1]];
        const l1=Math.hypot(v1[0],v1[1])||1,l2=Math.hypot(v2[0],v2[1])||1;
        let ux=v1[0]/l1+v2[0]/l2,uy=v1[1]/l1+v2[1]/l2,ul=Math.hypot(ux,uy)||1;
        ux=-ux/ul; uy=-uy/ul;
        const tx=p[0]+ux*70, ty=p[1]+uy*70;
        let rotation=Math.atan2(v1[1],v1[0])*180/Math.PI;
        if(rotation>90)rotation-=180; if(rotation< -90)rotation+=180;
        return '<text x="'+tx+'" y="'+ty+'" text-anchor="middle" dominant-baseline="middle" class="thc-angle">'+label+' = '+fmt(deg,2)+'°</text>';
      };
      setAngles(A,B,C);
      drawing.innerHTML='<svg class="thc-triangle-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="বাহুর মাপ অনুযায়ী ত্রিভুজের ড্রয়িং; এক আঙুল দিয়ে সরানো এবং দুই আঙুল দিয়ে জুম করা যাবে" style="display:block;width:100%;height:auto;max-height:680px;touch-action:none;cursor:grab">'+
        '<g id="thcDrawingViewport">'+
        '<polygon points="'+Axy.join(',')+' '+Bxy.join(',')+' '+Cxy.join(',')+'" fill="#b8f5b1" fill-opacity=".5" stroke="#087f70" stroke-width="3" stroke-linejoin="round"/>'+ 
        dimensionLabel(Axy,Bxy,'c = '+fmtFeetInches(c),20)+dimensionLabel(Bxy,Cxy,'a = '+fmtFeetInches(a))+dimensionLabel(Cxy,Axy,'b = '+fmtFeetInches(b))+
        angleText(Axy,Bxy,Cxy,'A',A)+angleText(Bxy,Axy,Cxy,'B',B)+angleText(Cxy,Axy,Bxy,'C',C)+'</g></svg>';
      attachDrawingControls();
      result.innerHTML='<div class="result-main">ক্ষেত্রফল = '+fmt(area)+' বর্গফুট</div><div class="result-list">'+
        '<div class="result-item"><strong>'+fmt(area)+' বর্গফুট</strong><span>বর্গফুট</span></div>'+ 
        '<div class="result-item"><strong>'+fmt(area/435.6)+' শতাংশ</strong><span>১ শতাংশ = ৪৩৫.৬ বর্গফুট</span></div>'+ 
        '<div class="result-item"><strong>'+fmt(area/720)+' কাঠা</strong><span>১ কাঠা = ৭২০ বর্গফুট</span></div>'+ 
        '</div><div class="calc-help">কোণ: A = '+fmt(A,2)+'°, B = '+fmt(B,2)+'°, C = '+fmt(C,2)+'° (যোগফল ১৮০°)</div>';
    }
    Object.entries(sideIds).forEach(([side,pair]) => {
      [pair.ft,pair.inch].forEach(id => $(id).addEventListener('input', () => {
        if (derivedSide && side !== derivedSide) {
          $(sideIds[derivedSide].ft).value=''; $(sideIds[derivedSide].inch).value=''; derivedSide=null;
        } else if (derivedSide === side) derivedSide=null;
        update();
      }));
    });
    const zoomIn = $('thcZoomIn'), zoomOut = $('thcZoomOut'), zoomReset = $('thcZoomReset'), printBtn = $('thcPrint');
    if (zoomIn) zoomIn.addEventListener('click', () => setDrawingZoom(0.25));
    if (zoomOut) zoomOut.addEventListener('click', () => setDrawingZoom(-0.25));
    if (zoomReset) zoomReset.addEventListener('click', resetDrawingView);
    if (printBtn) printBtn.addEventListener('click', () => {
      // Build an isolated, compact print sheet so unrelated page-wide print rules
      // cannot hide the triangle drawing/results or split the page into many pages.
      const oldSheet = document.getElementById('thcPrintSheet');
      if (oldSheet) oldSheet.remove();
      const panel = document.getElementById('panel-triangle-heron-cosine');
      if (!panel) return;
      const sheet = document.createElement('div');
      sheet.id = 'thcPrintSheet';
      sheet.className = 'thc-print-sheet';
      const title = document.createElement('h1');
      title.textContent = 'ত্রিভুজাকার জমির ক্ষেত্রফল — কোসাইন সূত্র';
      sheet.appendChild(title);
      const printMeta = document.createElement('div');
      printMeta.className = 'calc-ux-print-meta';
      printMeta.textContent = 'সার্ভেয়ার আবদুল হান্নান • ভূমি ক্যালকুলেটর';
      sheet.appendChild(printMeta);
      const grid = panel.querySelector('.thc-measure-angle-grid');
      if (grid) {
        const gridCopy = grid.cloneNode(true);
        const sourceFields = grid.querySelectorAll('input,select,textarea');
        const copiedFields = gridCopy.querySelectorAll('input,select,textarea');
        sourceFields.forEach((field, index) => {
          const copy = copiedFields[index];
          if (!copy) return;
          if (field.tagName === 'SELECT') copy.value = field.value;
          else copy.value = field.value;
        });
        sheet.appendChild(gridCopy);
      }
      const drawingTitle = document.createElement('h2');
      drawingTitle.textContent = 'ত্রিভুজের ড্রয়িং';
      sheet.appendChild(drawingTitle);
      const drawingCopy = document.getElementById('thcDrawing').cloneNode(true);
      drawingCopy.removeAttribute('id');
      drawingCopy.querySelectorAll('button').forEach(el => el.remove());
      drawingCopy.style.cssText = 'display:block!important;visibility:visible!important;position:relative!important;overflow:visible!important;width:100%!important;height:90mm!important;max-height:90mm!important;margin:0 auto!important;padding:0!important;';
      const svg = drawingCopy.querySelector('svg');
      if (svg) svg.style.cssText += ';display:block!important;visibility:visible!important;width:100%!important;height:88mm!important;max-height:88mm!important;transform:none!important;';
      sheet.appendChild(drawingCopy);
      const resultCopy = document.getElementById('thcResult').cloneNode(true);
      resultCopy.removeAttribute('id');
      sheet.appendChild(resultCopy);
      document.body.appendChild(sheet);
      document.body.classList.add('thc-print-mode');
      window.setTimeout(() => window.print(), 80);
    });
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('thc-print-mode');
      const sheet = document.getElementById('thcPrintSheet');
      if (sheet) sheet.remove();
    });
    $('thcAngleInput').addEventListener('input', update);
    $('thcAngleSelect').addEventListener('change', update);
    $('thcCalculate').addEventListener('click', update);
    $('thcReset').addEventListener('click', () => {
      Object.values(sideIds).forEach(pair=>{ $(pair.ft).value=''; $(pair.inch).value=''; });
      $('thcAngleInput').value=''; $('thcAngleSelect').value='C'; derivedSide=null; resetDrawingView(); clearOutputs();
    });
    clearOutputs();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
