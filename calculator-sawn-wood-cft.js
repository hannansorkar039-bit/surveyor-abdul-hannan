(function(){
  'use strict';

  const rowsEl = document.getElementById('sawnWoodRows');
  const addBtn = document.getElementById('sawnWoodAddRow');
  const calcBtn = document.getElementById('sawnWoodCalculate');
  const resetBtn = document.getElementById('sawnWoodReset');
  const printBtn = document.getElementById('sawnWoodPrint');
  const priceEl = document.getElementById('sawnWoodPricePerCft');
  const totalPiecesEl = document.getElementById('sawnWoodTotalPieces');
  const totalCftEl = document.getElementById('sawnWoodTotalCft');
  const totalPriceEl = document.getElementById('sawnWoodTotalPrice');
  const resultEl = document.getElementById('sawnWoodResult');

  if(!rowsEl || !addBtn || !calcBtn || !resetBtn) return;

  const num = value => {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const fmt = value => Number(value || 0).toLocaleString('bn-BD',{
    minimumFractionDigits:3, maximumFractionDigits:3
  });

  const fmtPieces = value => Number(value || 0).toLocaleString('bn-BD',{
    maximumFractionDigits:3
  });

  const money = value => '৳ ' + Number(value || 0).toLocaleString('bn-BD',{
    minimumFractionDigits:2, maximumFractionDigits:2
  });

  function rowTemplate(index){
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td class="sawn-wood-cft-row-no">${index}</td>
      <td>
        <div class="sawn-wood-cft-length">
          <input class="sawn-wood-len-ft" type="number" min="0" step="any" inputmode="decimal" placeholder="ফুট" aria-label="দৈর্ঘ্য ফুট">
          <span>ফুট</span>
          <input class="sawn-wood-len-in" type="number" min="0" max="11.999" step="0.01" inputmode="decimal" placeholder="0" aria-label="দৈর্ঘ্য ইঞ্চি">
          <span>ইঞ্চি</span>
        </div>
      </td>
      <td><input class="sawn-wood-width" type="number" min="0" step="any" inputmode="decimal" placeholder="ইঞ্চি" aria-label="প্রস্থ ইঞ্চি"></td>
      <td><input class="sawn-wood-thickness" type="number" min="0" step="any" inputmode="decimal" placeholder="ইঞ্চি" aria-label="পুরুত্ব ইঞ্চি"></td>
      <td><input class="sawn-wood-pieces" type="number" min="0" step="1" inputmode="numeric" value="1" aria-label="পিস সংখ্যা"></td>
      <td class="sawn-wood-cft-row-cft">0.000</td>
      <td><button type="button" class="sawn-wood-cft-remove" aria-label="এই কাঠ মুছুন">মুছুন</button></td>
    `;
    tr.querySelector('.sawn-wood-cft-remove').addEventListener('click',()=>{
      tr.remove();
      renumber();
      calculate();
    });
    tr.querySelectorAll('input').forEach(input=>input.addEventListener('input',calculate));
    return tr;
  }

  function renumber(){
    rowsEl.querySelectorAll('tr').forEach((tr,i)=>{
      tr.querySelector('.sawn-wood-cft-row-no').textContent=String(i+1);
    });
  }

  function rowCft(tr){
    const lengthFt=num(tr.querySelector('.sawn-wood-len-ft').value);
    const lengthIn=num(tr.querySelector('.sawn-wood-len-in').value);
    const width=num(tr.querySelector('.sawn-wood-width').value);
    const thickness=num(tr.querySelector('.sawn-wood-thickness').value);
    const pieces=num(tr.querySelector('.sawn-wood-pieces').value);
    const totalLengthFt=lengthFt+(lengthIn/12);
    return (totalLengthFt*width*thickness*pieces)/144;
  }

  function calculate(){
    let totalCft=0;
    let totalPieces=0;
    const rows=[...rowsEl.querySelectorAll('tr')];

    rows.forEach(tr=>{
      const cft=rowCft(tr);
      const pieces=num(tr.querySelector('.sawn-wood-pieces').value);
      tr.querySelector('.sawn-wood-cft-row-cft').textContent=fmt(cft);
      totalCft+=cft;
      totalPieces+=pieces;
    });

    const price=num(priceEl && priceEl.value);
    const totalPrice=totalCft*price;

    totalPiecesEl.textContent=fmtPieces(totalPieces);
    totalCftEl.textContent=fmt(totalCft);
    totalPriceEl.textContent=money(totalPrice);

    if(rows.length){
      resultEl.innerHTML=
        '<strong>সারসংক্ষেপ:</strong> '+fmtPieces(totalPieces)+' পিস কাঠ × মোট <strong>'+fmt(totalCft)+' CFT</strong>' +
        (price>0 ? ' × প্রতি CFT '+money(price)+' = <strong>'+money(totalPrice)+'</strong>' : '।');
    }else{
      resultEl.innerHTML='<span>কাঠের একটি সারি যোগ করে মাপ দিন।</span>';
    }
  }

  function reset(){
    rowsEl.innerHTML='';
    priceEl.value='';
    rowsEl.appendChild(rowTemplate(1));
    calculate();
  }

  addBtn.addEventListener('click',()=>{
    rowsEl.appendChild(rowTemplate(rowsEl.querySelectorAll('tr').length+1));
  });

  calcBtn.addEventListener('click',calculate);
  if(priceEl) priceEl.addEventListener('input',calculate);
  resetBtn.addEventListener('click',reset);
  if(printBtn) printBtn.addEventListener('click',()=>window.print());

  rowsEl.appendChild(rowTemplate(1));
  calculate();
})(); 
