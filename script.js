/* =============================================================
   Mangalam HDPE Pipes — interactions
   - Sticky header: appears past first fold on scroll-down,
                    hides on scroll-up. Sits above the nav.
   - Product gallery: thumbs, prev/next, dots, keyboard, swipe.
   - Hover-to-zoom: lens + magnified preview panel (desktop).
   - Apps carousel: paged horizontal scroll.
   - Manufacturing process: tabbed step content.
   - Mobile menu toggle.
   ============================================================= */

(() => {
  'use strict';

  // ---------------------------------------------------------------
  // Sticky header reveal/hide on scroll
  // ---------------------------------------------------------------
  const stickyHeader = document.getElementById('stickyHeader');
  const FOLD_OFFSET = () => Math.max(window.innerHeight * 0.6, 400);
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const goingDown = y > lastY;
    const pastFold = y > FOLD_OFFSET();

    if (goingDown && pastFold) {
      stickyHeader.classList.add('is-visible');
      stickyHeader.setAttribute('aria-hidden', 'false');
    } else if (!goingDown || y < 80) {
      stickyHeader.classList.remove('is-visible');
      stickyHeader.setAttribute('aria-hidden', 'true');
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });

  // ---------------------------------------------------------------
  // Mobile menu
  // ---------------------------------------------------------------
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', String(open));
      mobileMenu.hidden = !open;
    });
    mobileMenu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        hamburger.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.hidden = true;
      }
    });
  }

  // ---------------------------------------------------------------
  // Product gallery: thumbs, prev/next, swipe
  // ---------------------------------------------------------------
  const thumbs = Array.from(document.querySelectorAll('.thumb'));
  const slides = Array.from(document.querySelectorAll('.stage__img'));
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const stage = document.getElementById('stage');
  const viewport = document.getElementById('viewport');
  const zoomLens = document.getElementById('zoomLens');
  const zoomPreview = document.getElementById('zoomPreview');

  let activeIndex = 0;

  function setActive(i) {
    const len = slides.length;
    activeIndex = (i + len) % len;

    slides.forEach((el, idx) => el.classList.toggle('is-active', idx === activeIndex));
    thumbs.forEach((el, idx) => {
      el.classList.toggle('is-active', idx === activeIndex);
      el.setAttribute('aria-selected', String(idx === activeIndex));
    });

    // Sync the zoom preview to the currently active image
    if (zoomPreview) {
      zoomPreview.style.backgroundImage = `url(${slides[activeIndex].src})`;
    }
  }

  thumbs.forEach((t, i) => {
    t.addEventListener('click', () => setActive(i));
    // Hover preview-on-thumbs feels nice on desktop
    t.addEventListener('mouseenter', () => {
      if (window.matchMedia('(hover: hover)').matches) setActive(i);
    });
  });

  if (prevBtn) prevBtn.addEventListener('click', () => setActive(activeIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => setActive(activeIndex + 1));

  // Keyboard nav when gallery is focused
  if (stage) {
    stage.tabIndex = 0;
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') setActive(activeIndex - 1);
      if (e.key === 'ArrowRight') setActive(activeIndex + 1);
    });

    // Touch swipe
    let touchStartX = 0;
    viewport.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    viewport.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) setActive(activeIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  // ---------------------------------------------------------------
  // Hover-to-zoom: lens follows cursor, preview shows magnified
  // crop. Disabled on touch / small screens by CSS.
  // ---------------------------------------------------------------
  const ZOOM_FACTOR = 2;

  function showZoom() {
    stage.classList.add('is-zooming');
    if (zoomPreview) {
      zoomPreview.classList.add('is-visible');
      zoomPreview.setAttribute('aria-hidden', 'false');
    }
  }
  function hideZoom() {
    stage.classList.remove('is-zooming');
    if (zoomPreview) {
      zoomPreview.classList.remove('is-visible');
      zoomPreview.setAttribute('aria-hidden', 'true');
    }
  }
  function moveZoom(e) {
    const rect = viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      hideZoom();
      return;
    }
    const lensSize = zoomLens.offsetWidth;
    const lx = Math.max(0, Math.min(x - lensSize / 2, rect.width - lensSize));
    const ly = Math.max(0, Math.min(y - lensSize / 2, rect.height - lensSize));
    zoomLens.style.transform = `translate(${lx}px, ${ly}px)`;

    if (zoomPreview) {
      const xPct = (x / rect.width) * 100;
      const yPct = (y / rect.height) * 100;
      zoomPreview.style.backgroundSize = `${ZOOM_FACTOR * 100}% ${ZOOM_FACTOR * 100}%`;
      zoomPreview.style.backgroundPosition = `${xPct}% ${yPct}%`;
    }
  }

  if (viewport) {
    viewport.addEventListener('mouseenter', showZoom);
    viewport.addEventListener('mouseleave', hideZoom);
    viewport.addEventListener('mousemove', moveZoom);
  }

  // Initialize first slide + preview
  setActive(0);

  // ---------------------------------------------------------------
  // Applications carousel — page-by-page horizontal scroll
  // ---------------------------------------------------------------
  const appsTrack = document.getElementById('appsTrack');
  const appsPrev = document.getElementById('appsPrev');
  const appsNext = document.getElementById('appsNext');
  let appsOffset = 0;

  function visibleAppsCount() {
    const w = window.innerWidth;
    if (w >= 1024) return 4;
    if (w >= 840) return 3;
    if (w >= 600) return 2;
    return 1;
  }
  function moveApps(direction) {
    if (!appsTrack) return;
    const cards = appsTrack.children;
    if (!cards.length) return;
    const perView = visibleAppsCount();
    const cardWidth = cards[0].getBoundingClientRect().width + 20; // gap matches CSS .apps__track gap
    const maxOffset = -(cards.length - perView) * cardWidth;
    appsOffset += direction * cardWidth * perView;
    appsOffset = Math.min(0, Math.max(maxOffset, appsOffset));
    appsTrack.style.transform = `translateX(${appsOffset}px)`;
  }
  if (appsPrev) appsPrev.addEventListener('click', () => moveApps(1));
  if (appsNext) appsNext.addEventListener('click', () => moveApps(-1));

  // ---------------------------------------------------------------
  // Testimonials carousel — same behavior as apps
  // ---------------------------------------------------------------
  const testiTrack = document.getElementById('testiTrack');
  const testiPrev = document.getElementById('testiPrev');
  const testiNext = document.getElementById('testiNext');
  let testiOffset = 0;

  function moveTesti(direction) {
    if (!testiTrack) return;
    const cards = testiTrack.children;
    if (!cards.length) return;
    const perView = visibleAppsCount();
    const cardWidth = cards[0].getBoundingClientRect().width + 20;
    const maxOffset = -(cards.length - perView) * cardWidth;
    testiOffset += direction * cardWidth * perView;
    testiOffset = Math.min(0, Math.max(maxOffset, testiOffset));
    testiTrack.style.transform = `translateX(${testiOffset}px)`;
  }
  if (testiPrev) testiPrev.addEventListener('click', () => moveTesti(1));
  if (testiNext) testiNext.addEventListener('click', () => moveTesti(-1));

  window.addEventListener('resize', () => {
    appsOffset = 0;
    testiOffset = 0;
    if (appsTrack) appsTrack.style.transform = 'translateX(0)';
    if (testiTrack) testiTrack.style.transform = 'translateX(0)';
  });

  // ---------------------------------------------------------------
  // Manufacturing process tabs
  // ---------------------------------------------------------------
  const PROCESS_STEPS = [
    {
      title: 'High-Grade Raw Material Selection',
      desc: 'Vacuum sizing tanks ensure precise outer diameter while internal pressure maintains perfect roundness and wall thickness uniformity.',
      bullets: ['PE100 grade material', 'Optimal molecular weight distribution'],
      img: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=900&auto=format&fit=crop',
    },
    {
      title: 'Precision Extrusion',
      desc: 'Continuous extrusion under controlled temperature and pressure forms pipes of uniform diameter and wall thickness.',
      bullets: ['Twin-screw extruders', 'Real-time melt temperature monitoring'],
      img: 'https://images.unsplash.com/photo-1565891741441-64926e441838?w=900&auto=format&fit=crop',
    },
    {
      title: 'Controlled Cooling',
      desc: 'Cooling baths set the final dimensions and surface finish. Gradual cooling prevents internal stresses.',
      bullets: ['Multi-stage water baths', 'Temperature ramp control'],
      img: 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=900&auto=format&fit=crop',
    },
    {
      title: 'Vacuum Sizing',
      desc: 'Vacuum sizing tanks ensure precise outer diameter while internal pressure maintains perfect roundness.',
      bullets: ['Tight OD tolerance', 'Roundness ±0.1mm'],
      img: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=900&auto=format&fit=crop',
    },
    {
      title: 'Quality Control Testing',
      desc: 'Every batch is tested for tensile strength, hydrostatic pressure resistance, and density compliance.',
      bullets: ['IS 5984 / ISO 4427 testing', 'Sample retention for 5 years'],
      img: 'https://images.unsplash.com/photo-1581092916357-5189729c2dbd?w=900&auto=format&fit=crop',
    },
    {
      title: 'Permanent Marking',
      desc: 'Inline laser marking applies durable identifiers — batch, size, standard — for full traceability.',
      bullets: ['Laser etching', 'Unique batch IDs'],
      img: 'https://images.unsplash.com/photo-1565891741441-64926e441838?w=900&auto=format&fit=crop',
    },
    {
      title: 'Precision Cutting',
      desc: 'Servo-driven cutters produce accurate, burr-free lengths to customer specification.',
      bullets: ['±2mm length tolerance', 'Clean square cuts'],
      img: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=900&auto=format&fit=crop',
    },
    {
      title: 'Coiling & Packaging',
      desc: 'Smaller diameter pipes are coiled; larger sizes are bundled and wrapped for safe transit.',
      bullets: ['Coils up to 500m', 'Crate or pallet packing'],
      img: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=900&auto=format&fit=crop',
    },
  ];

  const ptabs = Array.from(document.querySelectorAll('.ptab'));
  const pTitle = document.getElementById('processTitle');
  const pDesc = document.getElementById('processDesc');
  const pBullets = document.getElementById('processBullets');
  const pImage = document.getElementById('processImage');
  const pPrev = document.getElementById('processPrev');
  const pNext = document.getElementById('processNext');
  const pPrevMob = document.getElementById('processPrevMob');
  const pNextMob = document.getElementById('processNextMob');
  const pStepPill = document.getElementById('processStepPill');
  let stepIndex = 0;

  function renderStep(i) {
    stepIndex = (i + PROCESS_STEPS.length) % PROCESS_STEPS.length;
    const s = PROCESS_STEPS[stepIndex];
    if (pTitle) pTitle.textContent = s.title;
    if (pDesc) pDesc.textContent = s.desc;
    if (pBullets) pBullets.innerHTML = s.bullets.map(b => `<li>${b}</li>`).join('');
    if (pImage) pImage.src = s.img;
    if (pStepPill) {
      const shortName = (ptabs[stepIndex] && ptabs[stepIndex].textContent) || s.title;
      pStepPill.textContent = `Step ${stepIndex + 1}/${PROCESS_STEPS.length}: ${shortName}`;
    }
    ptabs.forEach((t, idx) => {
      t.classList.toggle('is-active', idx === stepIndex);
      t.setAttribute('aria-selected', String(idx === stepIndex));
    });
    // Scroll the active tab into view on small screens
    const active = ptabs[stepIndex];
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  ptabs.forEach((t, i) => t.addEventListener('click', () => renderStep(i)));
  if (pPrev) pPrev.addEventListener('click', () => renderStep(stepIndex - 1));
  if (pNext) pNext.addEventListener('click', () => renderStep(stepIndex + 1));
  if (pPrevMob) pPrevMob.addEventListener('click', () => renderStep(stepIndex - 1));
  if (pNextMob) pNextMob.addEventListener('click', () => renderStep(stepIndex + 1));
  // Initial render so the mobile pill gets the "Step 1/8: …" prefix on load
  renderStep(0);

  // ---------------------------------------------------------------
  // Modals — open via [data-modal-open="id"], close via
  // [data-modal-close], backdrop, or Escape key.
  // ---------------------------------------------------------------
  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const focusTarget = modal.querySelector('input, select, textarea, button');
    if (focusTarget) focusTarget.focus();
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.is-open')) {
      document.body.classList.remove('modal-open');
    }
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-modal-open]');
    if (opener) {
      e.preventDefault();
      openModal(opener.getAttribute('data-modal-open'));
      return;
    }
    const closer = e.target.closest('[data-modal-close]');
    if (closer) {
      e.preventDefault();
      closeModal(closer.closest('.modal'));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.is-open').forEach(closeModal);
    }
  });

})();
