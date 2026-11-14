/* Dropdown customizado do lab: substitui visualmente todo <select> (o select nativo continua no DOM, oculto, e recebe o valor).
   Tema automático a partir do campo e do site; sobrescreva com --dd-bg, --dd-fg, --dd-accent, --dd-radius no :root do site. */
(() => {
  const opaque = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (m) { const v = m[1].split(',').map(Number); if (v.length < 4 || v[3] > 0.6) return c; }
    }
    return getComputedStyle(document.body).backgroundColor || '#fcfcfa';
  };
  const lum = (c) => { const v = (c.match(/[\d.]+/g) || [255, 255, 255]).map(Number); return (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) / 255; };
  const accentGuess = () => {
    const root = getComputedStyle(document.documentElement);
    for (const k of ['--dd-accent', '--accent', '--acc', '--lime', '--brand', '--primary', '--orange', '--green', '--blue']) {
      const v = root.getPropertyValue(k).trim(); if (v) return v;
    }
    const b = document.querySelector('.btn, button, .cta, a[class*="btn"]');
    return b ? getComputedStyle(b).backgroundColor : '#333';
  };
  let uid = 0;

  function build(sel) {
    if (sel.dataset.ddDone) return; sel.dataset.ddDone = '1';
    const cs = getComputedStyle(sel);
    const wrap = document.createElement('div'); wrap.className = 'dd';
    const id = 'dd' + (++uid);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', id);
    const lbl = sel.labels && sel.labels[0]; if (lbl) { lbl.id = lbl.id || id + 'l'; btn.setAttribute('aria-labelledby', lbl.id + ' ' + id + 'v'); }
    else if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
    const val = document.createElement('span'); val.className = 'dd-val'; val.id = id + 'v';
    const chev = document.createElement('span'); chev.className = 'dd-chev'; chev.setAttribute('aria-hidden', 'true');
    chev.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
    btn.append(val, chev);
    // herda tipografia e caixa do select original
    ['font', 'color', 'padding', 'textAlign'].forEach((p) => (btn.style[p] = cs[p]));
    // o site já desenha a própria seta ao lado do select? então usa a dele (e gira junto)
    const CHEV = 'svg[class*="chev"],svg[class*="caret"],[class*="chev"],[class*="caret"],[class*="seta"]';
    const scope = sel.closest('label') || sel.parentElement.parentElement || sel.parentElement;
    const sibChev = [...scope.querySelectorAll(CHEV)].find((c) => !c.contains(sel) && c.getBoundingClientRect().width < 40 && c.getBoundingClientRect().width > 0)
      || [...sel.parentElement.children].find((c) => c !== sel && c.matches('svg') && c.getBoundingClientRect().width < 40);
    if (sibChev) { chev.style.display = 'none'; sibChev.classList.add('dd-sib-chev'); }
    const chevHost = sibChev ? sibChev.parentElement : null;
    if (parseFloat(cs.borderTopWidth) > 0 || cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      btn.style.background = cs.backgroundColor; btn.style.border = cs.border; btn.style.borderRadius = cs.borderRadius;
    }
    const list = document.createElement('ul'); list.className = 'dd-list'; list.id = id; list.setAttribute('role', 'listbox'); list.tabIndex = -1;
    [...sel.options].forEach((o, i) => {
      if (o.hidden) return;
      const li = document.createElement('li'); li.setAttribute('role', 'option'); li.id = id + 'o' + i; li.dataset.i = i;
      li.textContent = o.textContent; if (o.disabled) li.setAttribute('aria-disabled', 'true');
      list.append(li);
    });
    // tema
    const bg = opaque(sel.parentElement), dark = lum(bg) < 0.45;
    const root = getComputedStyle(document.documentElement);
    wrap.style.setProperty('--dd-bg', root.getPropertyValue('--dd-bg').trim() || (dark ? '#1b1b1f' : '#fdfdfb'));
    wrap.style.setProperty('--dd-fg', root.getPropertyValue('--dd-fg').trim() || (dark ? '#f4f3ef' : '#16161a'));
    wrap.style.setProperty('--dd-accent', accentGuess());
    const r = parseFloat(root.getPropertyValue('--dd-radius')) || Math.min(18, Math.max(10, parseFloat(cs.borderRadius) || 14));
    wrap.style.setProperty('--dd-radius', r + 'px');

    sel.classList.add('dd-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    sel.parentNode.insertBefore(wrap, sel); wrap.append(sel, btn, list);

    const items = () => [...list.children].filter((li) => !li.hasAttribute('aria-disabled'));
    let active = -1;
    const sync = () => {
      val.textContent = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : '';
      [...list.children].forEach((li) => li.setAttribute('aria-selected', String(+li.dataset.i === sel.selectedIndex)));
    };
    const setActive = (k) => {
      const it = items(); if (!it.length) return; active = (k + it.length) % it.length;
      it.forEach((li, j) => li.classList.toggle('is-active', j === active));
      list.setAttribute('aria-activedescendant', it[active].id); it[active].scrollIntoView({ block: 'nearest' });
    };
    const open = () => {
      document.querySelectorAll('.dd.is-open').forEach((d) => d !== wrap && d.__close && d.__close());
      const rect = btn.getBoundingClientRect();
      wrap.classList.toggle('dd-up', window.innerHeight - rect.bottom < 260 && rect.top > 260);
      wrap.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); if (chevHost) chevHost.classList.add('dd-open-parent');
      const it = items(); setActive(Math.max(0, it.findIndex((li) => +li.dataset.i === sel.selectedIndex)));
      list.focus({ preventScroll: true });
    };
    const close = (focus) => { wrap.classList.remove('is-open'); if (chevHost) chevHost.classList.remove('dd-open-parent'); btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus({ preventScroll: true }); };
    wrap.__close = close;
    const choose = (li) => {
      if (!li || li.hasAttribute('aria-disabled')) return;
      sel.selectedIndex = +li.dataset.i; sync();
      sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true }));
      close(true);
    };
    btn.addEventListener('click', () => (wrap.classList.contains('is-open') ? close(true) : open()));
    btn.addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); } });
    list.addEventListener('click', (e) => choose(e.target.closest('li')));
    list.addEventListener('mousemove', (e) => { const li = e.target.closest('li'); if (li) { const k = items().indexOf(li); if (k > -1 && k !== active) setActive(k); } });
    list.addEventListener('keydown', (e) => {
      const it = items();
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(it.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(it[active]); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') close(false);
      else if (e.key.length === 1) { const k = it.findIndex((li) => li.textContent.trim().toLowerCase().startsWith(e.key.toLowerCase())); if (k > -1) setActive(k); }
    });
    document.addEventListener('pointerdown', (e) => { if (!wrap.contains(e.target)) close(false); });
    sel.addEventListener('change', sync);
    if (sel.form) sel.form.addEventListener('reset', () => setTimeout(sync));
    sync();
  }

  const run = () => document.querySelectorAll('select:not([multiple])').forEach(build);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
