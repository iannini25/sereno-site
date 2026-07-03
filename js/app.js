/* =============================================================
   SERENO · app.js
   Scroll suave (Lenis) + navbar + menu + animações de entrada +
   fio dourado que se desenha + galeria horizontal com pin +
   formulário que monta a mensagem de WhatsApp.
   Tudo respeitando prefers-reduced-motion.
   ============================================================= */
(() => {
  'use strict';

  const REDUCE  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  // Constantes de motion (ms). NAV_OFFSET acompanha o scroll-margin-top do CSS.
  const NAV_OFFSET          = 76;   // recuo das âncoras sob a navbar fixa (= scroll-margin-top)
  const REVEAL_STAGGER_STEP = 80;   // atraso entre irmãos que entram no scroll
  const REVEAL_STAGGER_MAX  = 320;  // teto do atraso acumulado
  const COUNT_DURATION_MS   = 1400; // duração do count-up do stat de prova

  // Sem pin (reduced-motion ou sem GSAP): CSS empilha a galeria #experiencia.
  if (REDUCE || !hasGSAP) document.documentElement.classList.add('no-pin');

  /* ---------------- Lenis (rolagem suave) ---------------- */
  let lenis = null;
  if (window.Lenis && !REDUCE) {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function scrollToTarget(hash) {
    const el = document.querySelector(hash);
    if (!el) return;
    if (lenis) { lenis.scrollTo(el, { offset: -NAV_OFFSET }); return; }
    const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET);
    window.scrollTo({ top, behavior: REDUCE ? 'auto' : 'smooth' });
  }

  /* ---------------- Navbar sólida no scroll ---------------- */
  const nav = document.getElementById('nav');
  const onScrollNav = () => {
    if (!nav) return;
    nav.classList.toggle('nav--solid', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScrollNav, { passive: true });
  if (lenis) lenis.on('scroll', onScrollNav);
  onScrollNav();

  /* ---------------- Menu mobile ---------------- */
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  let lastFocused = null;

  const setMenu = (open, { restoreFocus = true } = {}) => {
    const wasOpen = document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    if (burger) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    }
    if (drawer) drawer.setAttribute('aria-hidden', String(!open));
    // fundo (main + rodapé) fica inerte p/ leitor de tela enquanto o menu cobre a tela.
    // O header NÃO — o botão de fechar (burger) mora nele e precisa continuar operável.
    [document.getElementById('topo'), document.querySelector('.foot')]
      .forEach((el) => { if (el) el.inert = open; });
    // trava a rolagem de fundo enquanto o menu cobre a tela (evita scroll-bleed)
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();

    if (open && !wasOpen) {
      lastFocused = document.activeElement;
      const first = drawer && drawer.querySelector('a');
      // rAF: a visibilidade do drawer só vira "visible" no próximo frame (transition),
      // então focar de imediato cairia num elemento ainda oculto (não-focável).
      if (first) requestAnimationFrame(() => first.focus());
    } else if (!open && wasOpen && restoreFocus) {
      const back = lastFocused || burger;
      if (back) back.focus();
    }
  };
  if (burger) {
    burger.addEventListener('click', () =>
      setMenu(!document.body.classList.contains('menu-open')));
  }
  // Esc fecha só quando aberto e devolve o foco ao botão
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
  });
  // foco preso entre os links do drawer (Tab cicla)
  if (drawer) {
    drawer.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !document.body.classList.contains('menu-open')) return;
      const links = Array.from(drawer.querySelectorAll('a'));
      if (!links.length) return;
      const first = links[0], last = links[links.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------------- Âncoras: rolagem suave + fecha menu ---------------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href.length < 2) return;
      if (!document.querySelector(href)) return;
      e.preventDefault();
      setMenu(false, { restoreFocus: false });
      scrollToTarget(href);
      history.replaceState(null, '', href);
    });
  });

  /* ---------------- Entrada no scroll (.reveal) ---------------- */
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  if (REDUCE || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const group = el.parentElement
          ? Array.from(el.parentElement.querySelectorAll(':scope > .reveal'))
          : [el];
        const i = Math.max(0, group.indexOf(el));
        el.style.transitionDelay = Math.min(i * REVEAL_STAGGER_STEP, REVEAL_STAGGER_MAX) + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------------- Seção ativa na navbar ---------------- */
  (function activeSection() {
    const links = Array.from(document.querySelectorAll('.nav__links a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map();
    links.forEach((a) => {
      const sec = document.getElementById(a.getAttribute('href').slice(1));
      if (sec) map.set(sec, a);
    });
    if (!map.size) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        const a = map.get(en.target);
        if (a) a.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    map.forEach((_, sec) => io.observe(sec));
  })();

  /* ---------------- Fio dourado que se desenha ---------------- */
  const threadPath = document.getElementById('threadPath');
  if (threadPath) {
    const len = threadPath.getTotalLength();
    threadPath.style.strokeDasharray = String(len);
    if (hasGSAP && !REDUCE) {
      threadPath.style.strokeDashoffset = String(len);
      gsap.to(threadPath, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: { trigger: '.thread', start: 'top 80%', end: 'bottom bottom', scrub: true },
      });
    } else {
      threadPath.style.strokeDashoffset = '0';
    }
  }

  /* ---------------- Galeria horizontal com pin (#experiencia) ---------------- */
  (function setupExperience() {
    const pin   = document.getElementById('expPin');
    const track = document.getElementById('expTrack');
    const line  = document.getElementById('expLine'); // linha do tempo dourada
    if (!pin || !track) return;

    if (!hasGSAP || REDUCE) return; // mobile/reduzido: empilhamento vertical via CSS

    const mm = gsap.matchMedia();
    mm.add('(min-width: 821px)', () => {
      const getX = () => Math.max(0, pin.scrollWidth - pin.clientWidth);
      const tween = gsap.to(track, {
        x: () => -getX(),
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => '+=' + getX(),
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // a linha do tempo dourada se desenha junto com o avanço horizontal
          onUpdate: (self) => { if (line) line.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; },
        },
      });
      return () => { tween.kill(); gsap.set(track, { clearProps: 'x' }); if (line) line.style.transform = 'scaleX(0)'; };
    });
  })();

  /* ---------------- Contadores (stat de prova social) ---------------- */
  (function countUp() {
    const nums = Array.from(document.querySelectorAll('.stat__num[data-count]'));
    if (!nums.length) return;
    const fmt = (el, v) => {
      const dec = +(el.dataset.decimals || 0);
      const s = v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      el.textContent = (el.dataset.prefix || '') + s + (el.dataset.suffix || '');
    };
    if (REDUCE || !('IntersectionObserver' in window)) {
      nums.forEach((el) => fmt(el, parseFloat(el.dataset.count)));
      return;
    }
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const dur = COUNT_DURATION_MS; let start = null;
      const tick = (t) => {
        if (start === null) start = t;
        const p = Math.min(1, (t - start) / dur);
        fmt(el, target * (1 - Math.pow(1 - p, 3))); // easeOutCubic
        if (p < 1) requestAnimationFrame(tick); else fmt(el, target);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.6 });
    nums.forEach((el) => io.observe(el));
  })();

  /* ---------------- Formulário → WhatsApp ---------------- */
  const form = document.getElementById('booking');
  if (form) {
    // ⚠️  PLACEHOLDER — TROQUE pelo número real da clínica antes de publicar
    //     (formato internacional, só dígitos; ex.: 5531987654321). Mantenha em
    //     sincronia com o WhatsApp exibido na seção #visite do index.html.
    const PHONE = '5531999999999';

    const status = document.getElementById('booking-status');
    const nomeEl = document.getElementById('f-nome');
    const foneEl = document.getElementById('f-fone');
    let errTimer = 0;
    // limpa o estado de erro assim que o usuário corrige o campo
    [nomeEl, foneEl].forEach((el) => el && el.addEventListener('input', () => {
      el.removeAttribute('aria-invalid');
    }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = (id) => (document.getElementById(id)?.value || '').trim();
      const nome   = val('f-nome');
      const fone   = val('f-fone');
      const ritual = val('f-ritual');
      const dia    = val('f-dia');

      // limpa estado anterior
      [nomeEl, foneEl].forEach((el) => el && el.removeAttribute('aria-invalid'));
      if (status) status.textContent = '';

      if (!nome || !fone) {
        if (!nome && nomeEl) nomeEl.setAttribute('aria-invalid', 'true');
        if (!fone && foneEl) foneEl.setAttribute('aria-invalid', 'true');
        (!nome ? nomeEl : foneEl)?.focus();
        if (status) status.textContent = 'Por favor, preencha seu nome e WhatsApp.';
        form.classList.add('booking--err');
        clearTimeout(errTimer);
        errTimer = setTimeout(() => form.classList.remove('booking--err'), 1500);
        return;
      }

      const linhas = [
        'Olá, Sereno! Gostaria de agendar uma sessão.',
        '',
        `• Nome: ${nome}`,
        `• WhatsApp: ${fone}`,
        `• Ritual: ${ritual}`,
        dia ? `• Preferência de dia: ${dia}` : null,
      ].filter(Boolean);

      const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(linhas.join('\n'))}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  /* ---------------- Recalcula posições após carregar fontes/imagens ---------------- */
  if (hasGSAP) {
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
  }
})();
