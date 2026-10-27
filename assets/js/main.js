/* Sebastian Rojas-Ordoñez — page behaviour. No dependencies; everything degrades to plain HTML without JS. */
(() => {
  'use strict';

  const root = document.documentElement;
  const I18N = window.SITE_I18N || { es: {}, ui: { en: {}, es: {} } };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage blocked: preferences just won't persist */ } },
  };
  const $ = id => document.getElementById(id);

  const langToggle = $('lang-toggle');
  const themeToggle = $('theme-toggle');
  const menuToggle = $('menu-toggle');
  const navLinks = $('nav-links');
  const header = $('site-header');

  /* ---------- Language ---------- */
  let lang = 'en';
  const ui = key => (I18N.ui[lang] && I18N.ui[lang][key]) || I18N.ui.en[key] || '';
  const englishHtml = new Map();
  const englishAttrs = new Map();
  const englishMeta = { title: document.title, description: document.querySelector('meta[name="description"]').content };

  function parseAttrKeys(el) {
    return el.dataset.i18nAttr.split(';').map(pair => pair.split(':').map(part => part.trim()));
  }

  let translated = false; // the HTML is English until Spanish has been applied once

  function applyLanguage(next, persist) {
    lang = next === 'es' ? 'es' : 'en';
    const dict = lang === 'es' ? I18N.es : null;
    if (dict) translated = true;
    if (translated) swapTexts(dict);
    root.lang = lang;
    document.title = (dict && dict['meta.title']) || englishMeta.title;
    document.querySelector('meta[name="description"]').content = (dict && dict['meta.description']) || englishMeta.description;
    langToggle.setAttribute('aria-label', ui('langSwitch'));
    langToggle.setAttribute('title', ui('langSwitch'));
    langToggle.lang = lang === 'en' ? 'es' : 'en';
    updateThemeLabel();
    updateMenuLabel();
    refreshAbstracts();
    root.classList.remove('lang-pending');

    if (persist) {
      store.set('lang', lang);
      const url = new URL(location.href);
      if (lang === 'es') url.searchParams.set('lang', 'es');
      else url.searchParams.delete('lang');
      history.replaceState(history.state, '', url);
    }
  }

  function swapTexts(dict) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      if (!englishHtml.has(el)) englishHtml.set(el, el.innerHTML);
      const value = dict && dict[el.dataset.i18n];
      el.innerHTML = value !== undefined && value !== null ? value : englishHtml.get(el);
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const pairs = parseAttrKeys(el);
      if (!englishAttrs.has(el)) englishAttrs.set(el, Object.fromEntries(pairs.map(([attr]) => [attr, el.getAttribute(attr)])));
      pairs.forEach(([attr, key]) => {
        const value = dict && dict[key];
        el.setAttribute(attr, value !== undefined && value !== null ? value : englishAttrs.get(el)[attr]);
      });
    });
  }

  langToggle.addEventListener('click', () => applyLanguage(lang === 'es' ? 'en' : 'es', true));

  /* ---------- Theme ---------- */
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const themeColours = { light: '#f6f3ed', dark: '#07120f' };
  const currentTheme = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');

  function updateThemeLabel() {
    const label = ui(currentTheme() === 'dark' ? 'themeToLight' : 'themeToDark');
    themeToggle.setAttribute('aria-label', label);
    themeToggle.setAttribute('title', label);
  }

  function syncThemeColour() {
    if (!root.dataset.theme) return; // no explicit choice: the media-based <meta> tags already match
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', themeColours[root.dataset.theme]));
  }

  themeToggle.addEventListener('click', () => {
    root.dataset.theme = currentTheme() === 'dark' ? 'light' : 'dark';
    store.set('theme', root.dataset.theme);
    syncThemeColour();
    updateThemeLabel();
  });
  darkQuery.addEventListener('change', updateThemeLabel);
  syncThemeColour();

  /* ---------- Mobile menu ---------- */
  const menuIsOpen = () => menuToggle.getAttribute('aria-expanded') === 'true';

  function updateMenuLabel() {
    menuToggle.setAttribute('aria-label', ui(menuIsOpen() ? 'menuClose' : 'menuOpen'));
  }

  function setMenu(open) {
    navLinks.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    updateMenuLabel();
  }

  menuToggle.addEventListener('click', () => setMenu(!menuIsOpen()));
  navLinks.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('click', event => { if (menuIsOpen() && !event.target.closest('.nav-shell')) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuIsOpen()) { setMenu(false); menuToggle.focus(); }
  });

  /* ---------- Scroll: progress bar, header state, active nav link ---------- */
  const progressBar = $('scroll-progress');
  const navItems = [...navLinks.querySelectorAll('a[href^="#"]')]
    .map(link => ({ link, section: document.querySelector(link.getAttribute('href')) }))
    .filter(item => item.section);
  let scrollQueued = false;

  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      const max = root.scrollHeight - innerHeight;
      progressBar.style.setProperty('--progress', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : '0');
      header.classList.toggle('is-scrolled', scrollY > 8);
      let active = null;
      navItems.forEach(item => { if (item.section.getBoundingClientRect().top <= innerHeight * .35) active = item; });
      if (innerHeight + scrollY >= root.scrollHeight - 4) active = navItems[navItems.length - 1];
      navItems.forEach(item => {
        item.link.classList.toggle('is-active', item === active);
        if (item === active) item.link.setAttribute('aria-current', 'location');
        else item.link.removeAttribute('aria-current');
      });
      scrollQueued = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });

  /* ---------- Reveal on scroll (with a small stagger inside grids) ---------- */
  const reveals = [...document.querySelectorAll('.reveal')];
  reveals.forEach(el => {
    const siblings = [...el.parentElement.children].filter(child => child.classList.contains('reveal'));
    if (siblings.length > 1) el.style.setProperty('--stagger', String(siblings.indexOf(el) % 4));
  });
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: .06 });
    reveals.forEach(el => revealObserver.observe(el));
  }

  /* ---------- Hero counters ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      counterObserver.unobserve(entry.target);
      const el = entry.target;
      const finalText = el.textContent;
      const target = Number(el.dataset.count);
      const suffix = finalText.replace(/^\d+/, '');
      const start = performance.now();
      const step = now => {
        const t = Math.min(1, (now - start) / 1100);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + suffix;
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = finalText;
      };
      requestAnimationFrame(step);
    }), { threshold: .6 });
    document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));
  }

  /* ---------- Pointer effects (fine pointers only) ---------- */
  if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
    const hero = document.querySelector('.hero');
    hero.addEventListener('pointermove', event => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--hx', ((event.clientX - r.left) / r.width - .5).toFixed(3));
      hero.style.setProperty('--hy', ((event.clientY - r.top) / r.height - .5).toFixed(3));
    });

    const portrait = $('portrait');
    portrait.addEventListener('pointermove', event => {
      const r = portrait.getBoundingClientRect();
      const x = (event.clientX - r.left) / r.width - .5;
      const y = (event.clientY - r.top) / r.height - .5;
      portrait.style.transform = `rotateY(${(x * 8).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg)`;
    });
    portrait.addEventListener('pointerleave', () => { portrait.style.transform = ''; });

    document.querySelectorAll('.spot').forEach(card => card.addEventListener('pointermove', event => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - r.left}px`);
      card.style.setProperty('--my', `${event.clientY - r.top}px`);
    }));
  }

  /* ---------- Collapsible abstracts ---------- */
  const abstractToggles = [...document.querySelectorAll('.abstract-toggle')];

  function refreshAbstracts() {
    abstractToggles.forEach(button => {
      const box = $(button.getAttribute('aria-controls'));
      box.style.setProperty('--abstract-h', `${box.scrollHeight + 8}px`);
    });
  }

  abstractToggles.forEach(button => button.addEventListener('click', () => {
    const box = $(button.getAttribute('aria-controls'));
    const open = button.getAttribute('aria-expanded') !== 'true';
    box.style.setProperty('--abstract-h', `${box.scrollHeight + 8}px`);
    box.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
  }));
  addEventListener('resize', refreshAbstracts, { passive: true });

  /* ---------- In-page PDF viewer ---------- */
  const viewer = $('pdf-viewer');
  const viewerFrame = $('viewer-frame');
  const canEmbedPdf = () => typeof viewer.showModal === 'function'
    && navigator.pdfViewerEnabled !== false
    && matchMedia('(min-width: 900px) and (pointer: fine)').matches;

  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-viewer]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!canEmbedPdf()) return; // phones and tablets: let the link open the PDF in a new tab
    event.preventDefault();
    const href = link.getAttribute('href');
    $('viewer-title').textContent = link.dataset.title || '';
    $('viewer-open').href = href;
    $('viewer-download').href = href;
    // reuse the friendly file name of the card's own download button
    const named = document.querySelector(`a[download][href="${href}"]:not(#viewer-download)`);
    $('viewer-download').setAttribute('download', named ? named.getAttribute('download') : '');
    viewerFrame.src = `${href}#view=FitH`;
    viewer.showModal();
    viewer.focus(); // focus the dialog itself rather than ringing its first button
  });
  $('viewer-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener('close', () => { viewerFrame.src = 'about:blank'; });

  /* ---------- Copy e-mail ---------- */
  const copyButton = $('copy-email');
  const copyStatus = $('copy-status');
  let copyTimer;
  copyButton.addEventListener('click', async () => {
    const email = copyButton.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
      copyButton.classList.add('is-copied');
      copyStatus.textContent = ui('copied');
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copyButton.classList.remove('is-copied'); copyStatus.textContent = ''; }, 2200);
    } catch {
      location.href = `mailto:${email}`;
    }
  });

  /* ---------- Print: expand every archive card ---------- */
  addEventListener('beforeprint', () => document.querySelectorAll('details').forEach(d => { d.dataset.wasOpen = String(d.open); d.open = true; }));
  addEventListener('afterprint', () => document.querySelectorAll('details').forEach(d => { d.open = d.dataset.wasOpen === 'true'; }));

  /* ---------- Start ---------- */
  $('year').textContent = String(new Date().getFullYear());

  const param = new URLSearchParams(location.search).get('lang');
  if (param === 'es' || param === 'en') store.set('lang', param);
  const initial = param === 'es' || param === 'en' ? param : store.get('lang') === 'es' ? 'es' : 'en';
  applyLanguage(initial, false);
  onScroll();
})();
