
(function(){
  'use strict';

  const rowsEl = document.getElementById('woodRows');
  const addBtn = document.getElementById('woodAddRow');
  const calcBtn = document.getElementById('woodCalculate');
  const resetBtn = document.getElementById('woodReset');
  const printBtn = document.getElementById('woodPrint');
  const priceEl = document.getElementById('woodPricePerCft');
  const totalCftEl = document.getElementById('woodTotalCft');
  const totalPriceEl = document.getElementById('woodTotalPrice');
  const resultEl = document.getElementById('woodResult');

  if(!rowsEl || !addBtn || !calcBtn || !resetBtn) return;

  const num = (value) => {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const fmt = (value, digits=3) =>
    Number(value || 0).toLocaleString('bn-BD',{minimumFractionDigits:digits,maximumFractionDigits:digits});

  const money = (value) =>
    '৳ ' + Number(value || 0).toLocaleString('bn-BD',{minimumFractionDigits:2,maximumFractionDigits:2});

  function rowTemplate(index){
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td class="wood-cft-row-no">${index}</td>
      <td>
        <div class="wood-cft-unit">
          <input class="wood-cft-circ-ft" type="number" min="0" step="any" inputmode="decimal" aria-label="মাঝের পরিধি ফুট">
          <span>ফুট</span>
          <input class="wood-cft-circ-in" type="number" min="0" step="any" inputmode="decimal" aria-label="মাঝের পরিধি ইঞ্চি" placeholder="0">
          <span>ইঞ্চি</span>
        </div>
      </td>
      <td>
        <div class="wood-cft-unit">
          <input class="wood-cft-len-ft" type="number" min="0" step="any" inputmode="decimal" aria-label="দৈর্ঘ্য ফুট">
          <span>ফুট</span>
          <input class="wood-cft-len-in" type="number" min="0" step="any" inputmode="decimal" aria-label="দৈর্ঘ্য ইঞ্চি" placeholder="0">
          <span>ইঞ্চি</span>
        </div>
      </td>
      <td class="wood-cft-row-cft">0.000</td>
      <td><button type="button" class="wood-cft-remove" aria-label="এই কাঠ মুছুন">মুছুন</button></td>
    `;
    tr.querySelector('.wood-cft-remove').addEventListener('click',()=>{tr.remove(); renumber(); calculate();});
    tr.querySelectorAll('input').forEach(input=>input.addEventListener('input',calculate));
    return tr;
  }

  function renumber(){
    rowsEl.querySelectorAll('tr').forEach((tr,i)=>{
      tr.querySelector('.wood-cft-row-no').textContent = String(i+1);
    });
  }

  function addRow(){
    rowsEl.appendChild(rowTemplate(rowsEl.children.length+1));
  }

  function calculate(){
    let total=0;
    let validRows=0;

    rowsEl.querySelectorAll('tr').forEach(tr=>{
      const circFt=num(tr.querySelector('.wood-cft-circ-ft').value);
      const circIn=num(tr.querySelector('.wood-cft-circ-in').value);
      const lenFt=num(tr.querySelector('.wood-cft-len-ft').value);
      const lenIn=num(tr.querySelector('.wood-cft-len-in').value);

      // Normalize 12 inches = 1 foot, allowing users to enter values such as 15 inches.
      const circumferenceInches = circFt*12 + circIn;
      const lengthFeet = lenFt + (lenIn/12);

      // Hoppus-based form when circumference is in inches and length in feet.
      const cft = (circumferenceInches*circumferenceInches*lengthFeet)/2304;
      tr.querySelector('.wood-cft-row-cft').textContent = fmt(cft,3);
      if(circumferenceInches > 0 && lengthFeet > 0) validRows++;
      total += cft;
    });

    const price=num(priceEl ? priceEl.value : 0);
    const totalPrice=total*price;
    totalCftEl.textContent=fmt(total,3);
    totalPriceEl.textContent=money(totalPrice);

    if(validRows){
      resultEl.innerHTML = `<strong>${fmt(validRows,0)}টি কাঠ হিসাব হয়েছে।</strong> মোট CFT = <strong>${fmt(total,3)}</strong>${price>0 ? ` এবং মোট মূল্য = <strong>${money(totalPrice)}</strong>` : ''}।`;
    }else{
      resultEl.innerHTML = '<span>প্রতিটি কাঠের মাঝের পরিধি/বেড় ও দৈর্ঘ্য লিখলে হিসাব দেখাবে।</span>';
    }
    return {total,totalPrice};
  }

  addBtn.addEventListener('click',()=>{addRow();calculate();});
  calcBtn.addEventListener('click',calculate);
  if(priceEl) priceEl.addEventListener('input',calculate);

  resetBtn.addEventListener('click',()=>{
    rowsEl.innerHTML='';
    if(priceEl) priceEl.value='';
    addRow();
    calculate();
  });

  if(printBtn) printBtn.addEventListener('click',()=>{
    calculate();
    window.print();
  });

  addRow();
  calculate();
})();
