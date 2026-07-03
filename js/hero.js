/* =============================================================
   SERENO · hero.js
   Motor de "scroll-vídeo": dois clipes (avanço da câmera + queda
   para a recepção) tocados QUADRO A QUADRO conforme o scroll do
   mouse, parecendo um vídeo só, contínuo e amarrado à rolagem.

   Funciona em 3 níveis, do ideal ao mais simples — assim o site
   já abre funcionando antes mesmo do Claude Code extrair os frames:

     1) MODO FRAMES   → sequências em assets/frames-1 + frames-2
                        (geradas por scripts/extract_frames.sh).
                        É o efeito "vídeo no scroll" de verdade.
     2) MODO 2 IMAGENS→ room.jpg  →  reception.jpg com leve avanço
                        e crossfade (se a recepção já foi baixada).
     3) MODO 1 IMAGEM → só room.jpg com um Ken-Burns delicado.

   Respeita prefers-reduced-motion (vira imagem estática, sem scrub).
   ============================================================= */
(() => {
  'use strict';

  const canvas = document.getElementById('film');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  const heroEl     = document.querySelector('.hero');
  const layerTop   = document.querySelector('.hero__layer--top');
  const layerRecep = document.querySelector('.hero__layer--reception');
  const hintEl     = document.getElementById('scrollHint');
  const loaderEl   = document.getElementById('loader');
  const loaderFill = document.getElementById('loaderFill');

  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // DPR é lido a cada resize() (acompanha mudança de monitor/zoom). Teto 1.5:
  // em telas retina, 2x dobra a área de pixels e trava o scrub sem ganho visível.
  const dprNow = () => Math.min(window.devicePixelRatio || 1, 1.5);

  // caminhos padrão dos assets
  const ROOM_SRC  = 'assets/img/room.jpg';
  const RECEP_SRC = 'assets/img/reception.jpg';

  // ---------- estado ----------
  let frames      = [];      // Image[] na ordem clip1 + clip2
  let totalFrames = 0;
  let seam        = 0.5;     // ponto de emenda dos clipes (fração 0..1)
  let mode        = 'image1';// 'frames' | 'image2' | 'image1'
  let roomImg     = null;
  let recepImg    = null;
  const state     = { frame: 0, p: 0 };

  // ---------- utils ----------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const norm  = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const pad   = (n, w) => String(n).padStart(w, '0');

  function loadImg(src) {
    return new Promise((resolve) => {
      const im = new Image();
      im.decoding = 'async';
      // decodifica ANTES de resolver: evita decode síncrono no 1º drawImage do scrub
      im.onload  = () => {
        (im.decode ? im.decode() : Promise.resolve())
          .then(() => resolve(im)).catch(() => resolve(im));
      };
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }

  function setProgress(x) {
    if (loaderFill) loaderFill.style.width = (clamp(x, 0, 1) * 100).toFixed(1) + '%';
  }

  // ---------- canvas ----------
  function resize() {
    const dpr = dprNow();
    const w = canvas.clientWidth  || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    drawCurrent();
  }

  // desenha cobrindo o canvas (object-fit: cover) com escala extra
  function drawCover(img, scale = 1, biasY = 0.5) {
    if (!img || !img.naturalWidth) return;
    const cw = canvas.width, ch = canvas.height;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cw / ch;
    let dw, dh;
    if (cr > ir) { dw = cw * scale; dh = dw / ir; }
    else         { dh = ch * scale; dw = dh * ir; }
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) * biasY;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function drawCurrent() {
    // base no tom da marca (não preto), visível só se uma imagem falhar ao carregar
    ctx.fillStyle = '#2a1f1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (mode === 'frames') renderFrames(state.frame);
    else                   renderImages(state.p);
  }

  function renderFrames(f) {
    const idx = clamp(Math.round(f), 0, totalFrames - 1);
    const img = frames[idx] || roomImg;
    drawCover(img, 1, 0.5);
  }

  function renderImages(p) {
    // fase 1: a sala com um avanço sutil da câmera (escala 1 → 1.12)
    const s1 = 1 + 0.12 * norm(p, 0, seam);
    drawCover(roomImg, s1, 0.5);
    // fase 2: crossfade para a recepção (quando disponível)
    if (mode === 'image2' && recepImg) {
      const k = norm(p, seam - 0.04, Math.min(0.96, seam + 0.30));
      if (k > 0) {
        ctx.globalAlpha = k;
        drawCover(recepImg, 1.06 - 0.06 * k, 0.5);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---------- textos sobre o vídeo ----------
  // mostra/esconde uma camada de texto de forma acessível (foco + leitor de tela)
  function setLayer(el, vis) {
    if (!el) return;
    el.style.pointerEvents = vis ? 'auto' : 'none';
    el.inert = !vis;
    el.setAttribute('aria-hidden', vis ? 'false' : 'true');
  }

  function setOverlays(p) {
    if (mode === 'image1') {
      // sem recepção: mantém o título e só esconde a dica de scroll
      if (layerTop) { layerTop.style.opacity = '1'; setLayer(layerTop, true); }
      if (layerRecep) { layerRecep.style.opacity = '0'; setLayer(layerRecep, false); }
      if (hintEl)   hintEl.style.opacity = ((1 - norm(p, 0, 0.06)) * 0.8).toFixed(3);
      return;
    }

    // título da sala: some um pouco antes da emenda
    if (layerTop) {
      const o = 1 - norm(p, 0.30, Math.max(0.36, seam - 0.05));
      layerTop.style.opacity = o.toFixed(3);
      setLayer(layerTop, o > 0.5);
      layerTop.style.transform = `translateX(-50%) translateY(${(-(1 - o) * 10).toFixed(1)}px)`;
    }

    // dica "role para entrar": some logo no início
    if (hintEl) hintEl.style.opacity = ((1 - norm(p, 0, 0.06)) * 0.8).toFixed(3);

    // recepção: aparece ao "pousar" no andar de baixo (alinhado ao frame final do clip2)
    if (layerRecep) {
      const k = norm(p, seam + 0.22, Math.min(0.97, seam + 0.46));
      layerRecep.style.opacity = k.toFixed(3);
      setLayer(layerRecep, k > 0.5);
      layerRecep.style.transform = `translateX(-50%) translateY(${((1 - k) * 14).toFixed(1)}px)`;
    }
  }

  // ---------- render principal ----------
  function render(p) {
    state.p = p;
    if (mode === 'frames') state.frame = p * (totalFrames - 1);
    drawCurrent();
    setOverlays(p);
  }

  // ---------- ligação com o scroll ----------
  function bindScroll() {
    if (REDUCE) {
      // estático: primeiro quadro / sala, título visível, sem scrub
      render(0);
      if (layerTop) layerTop.style.opacity = '1';
      if (hintEl)   hintEl.style.opacity = '0';
      return;
    }

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.create({
        trigger: heroEl,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3,
        onUpdate:  (self) => render(self.progress),
        onRefresh: (self) => render(self.progress),
      });
      render(0);
    } else {
      // fallback sem GSAP: scroll nativo + rAF com easing
      let target = 0, eased = 0, ticking = false;
      const loop = () => {
        eased += (target - eased) * 0.16;
        if (Math.abs(target - eased) < 0.0005) eased = target;
        render(eased);
        if (Math.abs(target - eased) > 0.0006) requestAnimationFrame(loop);
        else ticking = false;
      };
      const measure = () => {
        const total = Math.max(1, heroEl.offsetHeight - window.innerHeight);
        target = clamp(-heroEl.getBoundingClientRect().top / total, 0, 1);
        if (!ticking) { ticking = true; requestAnimationFrame(loop); }
      };
      window.addEventListener('scroll', measure, { passive: true });
      window.addEventListener('resize', measure);
      measure();
    }
  }

  function showSite() {
    document.documentElement.dataset.heroMode = mode; // 'frames' | 'image2' | 'image1'
    resize();
    bindScroll();
    cullWhenCovered();
    if (loaderEl) loaderEl.classList.add('is-done');
  }

  // O fundo do herói é fixed: quando a seção sai da tela (as seções seguintes
  // já cobrem tudo), esconde a camada para o navegador não compositar canvas
  // e animações atrás do conteúdo. O rootMargin reexibe um pouco antes de o
  // topo do herói voltar, para nenhum quadro aparecer "em branco".
  function cullWhenCovered() {
    const stickyEl = document.querySelector('.hero__sticky');
    if (!stickyEl || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([e]) => {
      stickyEl.style.visibility = e.isIntersecting ? 'visible' : 'hidden';
    }, { rootMargin: '12% 0px 12% 0px' }).observe(heroEl);
  }

  // ---------- carregamento ----------
  function buildList(m) {
    const p  = m.pad || 4;
    const ex = m.ext || 'jpg';
    const d1 = m.dir1 || 'assets/frames-1';
    const d2 = m.dir2 || 'assets/frames-2';
    const list = [];
    for (let i = 1; i <= m.clip1; i++) list.push(`${d1}/${pad(i, p)}.${ex}`);
    for (let i = 1; i <= m.clip2; i++) list.push(`${d2}/${pad(i, p)}.${ex}`);
    return list;
  }

  async function preloadFrames(list) {
    const out = new Array(list.length);
    let done = 0, i = 0;
    const CONC = 8;
    async function worker() {
      while (i < list.length) {
        const my = i++;
        out[my] = await loadImg(list[my]);
        setProgress(++done / list.length);
      }
    }
    await Promise.all(Array.from({ length: CONC }, worker));
    return out;
  }

  async function init() {
    // backdrop imediato: já mostra a sala atrás do loader
    roomImg = await loadImg(ROOM_SRC);
    if (roomImg) resize();

    // tenta o manifesto de frames (override por window.SERENO_FRAMES)
    let manifest = window.SERENO_FRAMES || null;
    if (!manifest) {
      try {
        const r = await fetch('assets/frames.json', { cache: 'no-store' });
        if (r.ok) manifest = await r.json();
      } catch (_) { /* file:// ou ausente → cai pro modo imagem */ }
    }

    if (manifest && manifest.clip1 > 0 && manifest.clip2 > 0) {
      const list = buildList(manifest);
      totalFrames = list.length;
      seam = manifest.clip1 / totalFrames;
      const imgs = await preloadFrames(list);
      const ok = imgs.filter(Boolean).length;
      if (ok >= totalFrames * 0.85) {
        // herda o último frame válido em vez de "piscar" para a sala onde houver buraco
        frames = new Array(imgs.length);
        for (let i = 0; i < imgs.length; i++) frames[i] = imgs[i] || frames[i - 1] || roomImg;
        mode = 'frames';
      }
    }

    if (mode !== 'frames') {
      recepImg = await loadImg(RECEP_SRC);
      mode = recepImg ? 'image2' : 'image1';
      if (mode === 'image2') seam = 0.5;
      setProgress(1);
    }

    showSite();
  }

  window.addEventListener('resize', resize);
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();
})();
