/* Calculator UX Pro — presentation, navigation and accessibility only.
   Calculation engines, formulas and calculator data are intentionally untouched. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const tabs = () => $$('.calc-tab[data-tab]');
  const panels = () => $$('.calc-panel[id]');
  const storageKey = 'sah-calculator-recent-v1';

  function tabLabel(tab) {
    return (tab.querySelector('strong')?.textContent || tab.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function activate(tab, opts = {}) {
    if (!tab) return;
    const id = tab.dataset.tab;
    const panel = document.getElementById('panel-' + id);
    if (!panel) return;

    // Keep the existing calculator engine responsible for the real tab switch.
    if (!tab.classList.contains('active')) tab.click();
    else {
      tabs().forEach(t => {
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        t.tabIndex = t === tab ? 0 : -1;
      });
      panels().forEach(p => p.classList.toggle('active', p === panel));
    }

    tabs().forEach(t => t.tabIndex = t === tab ? 0 : -1);
    remember(tab);
    if (opts.scroll !== false) {
      tab.scrollIntoView({ behavior: opts.smooth === false ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
      panel.scrollIntoView({ behavior: opts.smooth === false ? 'auto' : 'smooth', block: 'start' });
    }
    if (opts.focus) {
      panel.setAttribute('tabindex', '-1');
      panel.focus({ preventScroll: true });
    }
    if (history.replaceState && opts.updateHash !== false) history.replaceState(null, '', '#' + id);
  }

  function readRecent() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  }
  function remember(tab) {
    const id = tab?.dataset?.tab;
    if (!id) return;
    const list = readRecent().filter(x => x !== id);
    list.unshift(id);
    try { localStorage.setItem(storageKey, JSON.stringify(list.slice(0, 5))); } catch {}
  }

  function setupTabs() {
    const all = tabs();
    all.forEach(tab => {
      tab.setAttribute('aria-controls', 'panel-' + tab.dataset.tab);
      tab.tabIndex = tab.classList.contains('active') ? 0 : -1;
      tab.addEventListener('keydown', e => {
        if (!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End','Enter',' '].includes(e.key)) return;
        e.preventDefault();
        const visible = tabs().filter(t => !t.hidden);
        if (e.key === 'Enter' || e.key === ' ') return activate(tab, { scroll: true });
        if (!visible.length) return;
        const pos = visible.indexOf(tab);
        let next = pos < 0 ? 0 : pos;
        if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = visible.length - 1;
        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(visible.length - 1, next + 1);
        else next = Math.max(0, next - 1);
        const target = visible[next];
        if (target) { target.focus(); activate(target, { scroll: false }); }
      });
      tab.addEventListener('click', () => remember(tab), { passive: true });
    });

    const hash = location.hash.replace(/^#/, '');
    if (hash) {
      const target = all.find(t => t.dataset.tab === hash);
      if (target) setTimeout(() => activate(target, { smooth: false, scroll: true, updateHash: false }), 0);
    }
  }

  function setupNavigationStatus() {
    const status = $('#calcSearchStatus');
    if (!status) return;
    const update = () => {
      const active = tabs().find(t => t.classList.contains('active'));
      if (!active || status.dataset.searching === '1') return;
      status.textContent = `বর্তমানে খোলা: ${tabLabel(active)}`;
      status.classList.add('is-navigation-status');
    };
    tabs().forEach(t => t.addEventListener('click', () => setTimeout(update, 0), { passive: true }));
    window.addEventListener('hashchange', update, { passive: true });
    setTimeout(update, 0);
  }

  function improveValidationMessages() {
    $$('input, select, textarea').forEach(field => {
      if (field.dataset.uxValidation === '1') return;
      field.dataset.uxValidation = '1';
      field.addEventListener('invalid', () => {
        field.classList.add('input-error');
        if (!field.nextElementSibling?.classList.contains('input-error-note')) {
          const note = document.createElement('small');
          note.className = 'input-error-note';
          note.textContent = field.validity.valueMissing ? 'এই ঘরটি পূরণ করুন।' : 'দেওয়া মানটি যাচাই করুন।';
          field.insertAdjacentElement('afterend', note);
        }
      }, { passive: true });
      field.addEventListener('input', () => {
        if (field.validity.valid) {
          field.classList.remove('input-error');
          if (field.nextElementSibling?.classList.contains('input-error-note')) field.nextElementSibling.remove();
        }
      }, { passive: true });
    });
  }

  function setupSearch() {
    const input = $('#calcSearch');
    const clear = $('#calcSearchClear');
    const status = $('#calcSearchStatus');
    const recentBtn = $('#calcRecent');
    const allBtn = $('#calcShowAll');
    if (!input || !status) return;

    const apply = (query = '') => {
      status.dataset.searching = query.trim() ? '1' : '0';
      const q = query.trim().toLocaleLowerCase('bn-BD');
      const list = tabs();
      let count = 0;
      list.forEach(tab => {
        const panel = document.getElementById('panel-' + tab.dataset.tab);
        const hay = (tabLabel(tab) + ' ' + (panel?.textContent || '')).toLocaleLowerCase('bn-BD');
        const show = !q || hay.includes(q);
        tab.hidden = !show;
        if (show) count++;
      });
      clear.hidden = !q;
      allBtn?.classList.toggle('is-active', !q);

      const active = list.find(t => t.classList.contains('active'));
      if (q && count && active?.hidden) {
        const first = list.find(t => !t.hidden);
        if (first) activate(first, { scroll: false });
      }
      status.textContent = q ? (count ? `${count}টি ক্যালকুলেটর পাওয়া গেছে` : 'কোনো ক্যালকুলেটর পাওয়া যায়নি') : '';
    };

    input.addEventListener('input', () => apply(input.value));
    clear?.addEventListener('click', () => { input.value = ''; apply(''); input.focus(); });
    allBtn?.addEventListener('click', () => {
      input.value = '';
      tabs().forEach(t => t.hidden = false);
      apply('');
    });
    recentBtn?.addEventListener('click', () => {
      const recent = readRecent();
      if (!recent.length) {
        status.innerHTML = '<span class="calc-recent-empty">এখনও কোনো সাম্প্রতিক ক্যালকুলেটর নেই। একটি ক্যালকুলেটর খুললেই এখানে দেখা যাবে।</span>';
        return;
      }
      status.innerHTML = '<div class="calc-recent-list">' + recent.map(id => {
        const t = tabs().find(x => x.dataset.tab === id);
        return t ? `<button type="button" class="calc-recent-chip" data-recent-tab="${escapeHtml(id)}">${escapeHtml(tabLabel(t))}</button>` : '';
      }).join('') + '</div>';
      $$('.calc-recent-chip', status).forEach(b => b.addEventListener('click', () => {
        const t = tabs().find(x => x.dataset.tab === b.dataset.recentTab);
        if (t) {
          tabs().forEach(x => x.hidden = false);
          activate(t, { scroll: true });
          status.textContent = '';
        }
      }));
    });
    apply('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function resultText(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.calc-result-tools').forEach(node => node.remove());
    return (clone.innerText || clone.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function printResult(result) {
    const panel = result.closest('.calc-panel');
    const title = panel?.querySelector('h2,h3')?.textContent?.trim() || 'ভূমি ক্যালকুলেটর ফলাফল';
    const text = resultText(result);
    if (!text) return;

    // Print inside the current page instead of opening about:blank.
    // This works reliably on Android Chrome and still allows Save as PDF.
    const oldSheet = document.querySelector('.calc-ux-print-sheet');
    oldSheet?.remove();
    const sheet = document.createElement('section');
    sheet.className = 'calc-ux-print-sheet';
    sheet.innerHTML = `<h1>${escapeHtml(title)}</h1><div class="calc-ux-print-meta">সার্ভেয়ার আবদুল হান্নান • ভূমি ক্যালকুলেটর</div><div class="calc-ux-print-result"></div>`;
    sheet.querySelector('.calc-ux-print-result').textContent = text;
    document.body.appendChild(sheet);

    const cleanup = () => {
      document.body.classList.remove('calc-ux-printing');
      sheet.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    document.body.classList.add('calc-ux-printing');
    setTimeout(() => window.print(), 80);
  }

  async function copyText(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}

    // Fallback for Android browsers, local previews and restricted clipboard contexts.
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.left = '-1000px';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.focus();
      area.select();
      area.setSelectionRange(0, area.value.length);
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }

  function enhanceResult(result) {
    if (!result || result.dataset.uxEnhanced === '1' || !resultText(result)) return;
    result.dataset.uxEnhanced = '1';
    result.setAttribute('tabindex', '-1');
    result.setAttribute('role', result.getAttribute('role') || 'region');
    result.setAttribute('aria-label', 'হিসাবের ফলাফল');
    const tools = document.createElement('div');
    tools.className = 'calc-result-tools';
    tools.innerHTML = '<button type="button" class="calc-result-tool calc-result-copy">📋 ফলাফল কপি</button><button type="button" class="calc-result-tool calc-result-print">🖨️ প্রিন্ট / PDF</button>';
    result.prepend(tools);
    tools.querySelector('.calc-result-copy').addEventListener('click', async e => {
      const button = e.currentTarget;
      const text = resultText(result);
      const ok = await copyText(text);
      if (ok) {
        button.textContent = '✓ কপি হয়েছে';
        button.classList.add('copied');
        setTimeout(() => { button.textContent = '📋 ফলাফল কপি'; button.classList.remove('copied'); }, 1800);
      } else {
        button.textContent = 'কপি করা যায়নি';
        setTimeout(() => { button.textContent = '📋 ফলাফল কপি'; }, 1800);
      }
    });
    tools.querySelector('.calc-result-print').addEventListener('click', () => printResult(result));
  }

  function setupResults() {
    $$('.calc-result').forEach(enhanceResult);
    // Observe the document, not the result itself. This prevents the UX toolbar
    // insertion from recursively triggering another toolbar insertion.
    const observer = new MutationObserver(records => {
      let needsScan = false;
      records.forEach(r => {
        if (r.type === 'childList' && r.addedNodes.length) needsScan = true;
      });
      if (needsScan) $$('.calc-result').forEach(enhanceResult);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function setupKeyboardCalculation() {
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || el.type !== 'number') return;
      const panel = el.closest('.calc-panel.active');
      if (!panel) return;
      // Only auto-submit when this panel has exactly one primary calculation action.
      const buttons = $$('.calc-primary[id]', panel).filter(b => !b.disabled && b.offsetParent !== null);
      if (buttons.length !== 1) return;
      e.preventDefault();
      buttons[0].click();
    });
  }

  function setupLaunchCards() {
    // The existing calculator-bootstrap.js owns launch-card navigation.
    // This listener only records the destination for the Recent feature.
    $$('.calculator-launch-card').forEach(card => card.addEventListener('click', () => {
      const tabId = card.dataset.calcTab;
      if (tabId) {
        const tab = tabs().find(t => t.dataset.tab === tabId);
        if (tab) remember(tab);
      }
    }, { passive: true }));
  }

  function init() {
    setupTabs();
    setupSearch();
    setupNavigationStatus();
    improveValidationMessages();
    setupResults();
    setupKeyboardCalculation();
    setupLaunchCards();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
