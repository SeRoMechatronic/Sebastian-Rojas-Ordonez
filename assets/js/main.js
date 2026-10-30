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
    document.querySelector('meta[name="description"]').content = (dict && dict['meta.description']) || englishMeta.description;
    langToggle.setAttribute('aria-label', ui('langSwitch'));
    langToggle.setAttribute('title', ui('langSwitch'));
    langToggle.lang = lang === 'en' ? 'es' : 'en';
    updateThemeLabel();
    updateTitle();
    placeIndicator(); // tab labels change width with the language
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
  const themeMetas = [...document.querySelectorAll('meta[name="theme-color"]')];
  const defaultMetaColours = themeMetas.map(meta => meta.getAttribute('content'));
  const currentTheme = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');

  function updateThemeLabel() {
    const label = ui(currentTheme() === 'dark' ? 'themeToLight' : 'themeToDark');
    themeToggle.setAttribute('aria-label', label);
    themeToggle.setAttribute('title', label);
  }

  // The browser bar follows the open tab's background; Home keeps the theme colours.
  function syncThemeColour() {
    const viewBg = activeView ? getComputedStyle(activeView).backgroundColor : '';
    const own = viewBg && viewBg !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(viewBg) ? viewBg : null;
    themeMetas.forEach((meta, i) => {
      const colour = own || (root.dataset.theme ? themeColours[root.dataset.theme] : defaultMetaColours[i]);
      meta.setAttribute('content', colour);
    });
  }

  themeToggle.addEventListener('click', () => {
    root.dataset.theme = currentTheme() === 'dark' ? 'light' : 'dark';
    store.set('theme', root.dataset.theme);
    syncThemeColour();
    updateThemeLabel();
  });
  darkQuery.addEventListener('change', () => { updateThemeLabel(); syncThemeColour(); });

  /* ---------- Scroll: progress bar and header state ---------- */
  const progressBar = $('scroll-progress');
  let scrollQueued = false;

  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      const max = root.scrollHeight - innerHeight;
      progressBar.style.setProperty('--progress', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : '0');
      header.classList.toggle('is-scrolled', scrollY > 8);
      scrollQueued = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Tabs: one view at a time ----------
     The URL fragment decides which view is shown (CSS :target does the swapping, so links, back/forward
     and bookmarks work on their own). This adds the animation, the sliding pill, titles and focus. */
  const views = [...document.querySelectorAll('.view')];
  const tabLinks = [...document.querySelectorAll('[data-tab]')];
  const tabsNav = $('tabs');
  const indicator = $('tabs-indicator');
  const tabsMode = views.length > 0 && typeof CSS !== 'undefined' && CSS.supports('selector(:has(*))');
  let activeView = null;

  // The view holding the fragment target; no fragment (or one outside the views) means Home.
  function viewFor(hash) {
    let target = null;
    try { target = hash && hash.length > 1 ? $(decodeURIComponent(hash.slice(1))) : null; } catch { target = null; }
    const view = target && target.closest('.view');
    return { view: view || views[0], target: view && target !== view ? target : null };
  }

  function placeIndicator() {
    if (!tabsNav || !indicator) return;
    const link = tabsNav.querySelector('a.is-active');
    if (!link || !tabsNav.offsetParent) return; // the bottom bar is used on small screens
    indicator.style.setProperty('--ix', `${link.offsetLeft}px`);
    indicator.style.setProperty('--iw', `${link.offsetWidth}px`);
    if (!tabsNav.classList.contains('is-ready')) requestAnimationFrame(() => tabsNav.classList.add('is-ready'));
  }

  function updateTitle() {
    const home = (lang === 'es' && I18N.es['meta.title']) || englishMeta.title;
    const link = activeView && activeView !== views[0] && tabsNav && tabsNav.querySelector(`[data-tab="${activeView.id}"]`);
    document.title = link ? `${link.textContent.trim()} · Sebastian Rojas-Ordoñez` : home;
  }

  function syncView() {
    if (!tabsMode) return false;
    const { view } = viewFor(location.hash);
    const changed = view !== activeView;
    activeView = view;
    root.dataset.view = view.id;
    tabLinks.forEach(link => {
      const on = link.dataset.tab === view.id;
      link.classList.toggle('is-active', on);
      if (on) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    placeIndicator();
    updateTitle();
    syncThemeColour();
    if (changed) { refreshAbstracts(); onScroll(); }
    return changed;
  }

  function focusView(view) {
    const heading = view.querySelector('h1, h2');
    if (!heading) return;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }

  function replay(view) {
    view.classList.remove('is-entering');
    void view.offsetWidth; // restart the CSS animation
    view.classList.add('is-entering');
  }

  function goTo(hash, viaKeyboard) {
    const { view, target } = viewFor(hash);
    if (view === activeView) {
      // Same tab: move within it (or back to its top when the tab is clicked again).
      if (location.hash !== hash) location.hash = hash;
      else scrollTo({ top: target ? target.getBoundingClientRect().top + scrollY - 92 : 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }
    const forward = views.indexOf(view) > views.indexOf(activeView);
    const swap = () => {
      root.style.scrollBehavior = 'auto';
      location.hash = hash; // CSS swaps the view and the browser jumps to the target
      if (!target) scrollTo(0, 0);
      root.style.scrollBehavior = '';
      syncView();
      if (viaKeyboard) focusView(view); // keyboard users land on the new tab's heading
    };
    if (document.startViewTransition && !reduceMotion) {
      root.dataset.vt = forward ? 'forward' : 'back';
      const transition = document.startViewTransition(swap);
      // The browser may skip the animation (e.g. the mobile toolbar resizes the viewport); the swap still happens.
      transition.ready.catch(() => {});
      transition.finished.finally(() => { delete root.dataset.vt; });
    } else {
      swap();
      if (!reduceMotion) replay(view);
    }
  }

  if (tabsMode) {
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const hash = link.getAttribute('href');
      if (link.hasAttribute('data-to-top')) {
        event.preventDefault();
        scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        return;
      }
      if (hash === '#main') { // skip link: go to the content of the open tab
        event.preventDefault();
        focusView(activeView);
        activeView.scrollIntoView({ block: 'start' });
        return;
      }
      let target = null;
      try { target = hash.length > 1 ? $(decodeURIComponent(hash.slice(1))) : null; } catch { target = null; }
      if (!target) return;
      event.preventDefault();
      goTo(hash, event.detail === 0);
    });

    // Back/forward and typed fragments: CSS has already swapped the view.
    addEventListener('hashchange', () => {
      if (root.dataset.vt) return;
      const before = activeView;
      if (syncView() && before && !reduceMotion) replay(activeView);
    });
    addEventListener('resize', placeIndicator, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeIndicator);
  }

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

  syncView();
  const param = new URLSearchParams(location.search).get('lang');
  if (param === 'es' || param === 'en') store.set('lang', param);
  const initial = param === 'es' || param === 'en' ? param : store.get('lang') === 'es' ? 'es' : 'en';
  applyLanguage(initial, false);
  syncThemeColour();
  onScroll();
})();
