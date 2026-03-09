(() => {
  const headerSlot = document.getElementById('site-header-slot');
  const footerSlot = document.getElementById('site-footer-slot');

  if (!headerSlot && !footerSlot) {
    return;
  }

  const page = (
    headerSlot?.dataset.page
    || footerSlot?.dataset.page
    || document.body.dataset.page
    || 'home'
  ).toLowerCase();

  const isBookingPage = page === 'booking';
  const isLoginPage = page === 'login';
  const bookHref = headerSlot?.dataset.bookHref || (isBookingPage ? '#appointment' : '/booking');
  const loginHref = '/login';
  const profileHref = '/profile';
  const useHomeAnchors = isBookingPage || isLoginPage || page === 'profile';
  const navLinks = {
    services: useHomeAnchors ? '/#services' : '#services',
    about: useHomeAnchors ? '/#about' : '#about',
    team: useHomeAnchors ? '/#team' : '#team',
    insurance: useHomeAnchors ? '/#insurance' : '#insurance',
  };
  const patientPortalHref = profileHref;
  const homeHref = '/';
  const userStorageKey = 'pt-clinic-user-profile';
  const parseFirebaseAuthUserFallback = () => {
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || !key.startsWith('firebase:authUser:')) {
          continue;
        }

        const raw = localStorage.getItem(key);
        if (!raw) {
          continue;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
          continue;
        }

        const providers = Array.isArray(parsed.providerData)
          ? parsed.providerData
            .map((provider) => provider?.providerId)
            .filter((providerId) => typeof providerId === 'string' && providerId.length > 0)
          : [];

        return {
          fullName: parsed.displayName || parsed.email || 'PT Clinic Patient',
          email: parsed.email || '',
          avatarUrl: parsed.photoURL || '',
          firebaseUid: parsed.uid || '',
          provider: providers[0] || 'unknown',
          providers,
        };
      }
    } catch {
      return null;
    }

    return null;
  };

  const readProfile = () => {
    try {
      const raw = localStorage.getItem(userStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }

      const fallbackProfile = parseFirebaseAuthUserFallback();
      if (fallbackProfile) {
        localStorage.setItem(userStorageKey, JSON.stringify(fallbackProfile));
        return fallbackProfile;
      }

      return null;
    } catch {
      return null;
    }
  };
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  const userProfile = readProfile();
  const isSignedIn = Boolean(userProfile && (userProfile.email || userProfile.fullName || userProfile.firebaseUid));
  const avatarUrl = userProfile?.avatarUrl || './assets/images/team-alex.webp';
  const displayName = userProfile?.fullName || userProfile?.email || 'Patient Profile';
  const safeDisplayName = escapeHtml(displayName);
  const displayInitial = safeDisplayName.trim().charAt(0).toUpperCase() || 'P';
  const desktopProfileButton = isSignedIn
    ? `<a class="hidden md:inline-flex items-center justify-center size-10 rounded-full border border-primary/30 bg-white/[0.04] hover:border-primary/50 transition-all overflow-hidden refractive-border rotating-border-container" href="${profileHref}" aria-label="Open profile" title="${safeDisplayName}">
<img class="header-avatar-image size-full object-cover" src="${escapeHtml(avatarUrl)}" alt="${safeDisplayName}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';">
<span class="header-avatar-fallback hidden items-center justify-center size-full bg-primary/20 text-primary text-sm font-black">${displayInitial}</span>
</a>`
    : '';
  const mobileProfileLink = isSignedIn
    ? `<a class="mobile-menu-link flex items-center gap-3 text-xl font-black leading-tight text-white" href="${profileHref}">
<span class="inline-flex size-8 rounded-full overflow-hidden border border-primary/30 bg-white/[0.04]">
<img class="header-avatar-image size-full object-cover" src="${escapeHtml(avatarUrl)}" alt="${safeDisplayName}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';">
<span class="header-avatar-fallback hidden items-center justify-center size-full bg-primary/20 text-primary text-xs font-black">${displayInitial}</span>
</span>
<span>Profile</span>
</a>`
    : '';
  const desktopSignInButton = isLoginPage
    ? ''
    : `<a class="hidden md:inline-flex relative group overflow-hidden px-4 md:px-5 py-2 md:py-2.5 rounded-full text-slate-200 border border-white/10 hover:border-primary/35 hover:text-primary text-xs md:text-sm font-bold transition-all bg-white/[0.02] refractive-border rotating-border-container" href="${loginHref}">
<span class="relative z-10">Sign In</span>
<div class="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
</a>`;
  const desktopBookNowButton = isBookingPage
    ? ''
    : `<a class="hidden md:inline-flex relative group overflow-hidden bg-primary px-4 md:px-6 py-2 md:py-2.5 rounded-full text-background-dark font-bold text-xs md:text-sm transition-all shadow-[0_4px_15px_rgba(19,236,236,0.2)]" href="${bookHref}">
<span class="relative z-10">Book Now</span>
<div class="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
</a>`;
  const mobileSignInButton = isLoginPage || isSignedIn
    ? ''
    : `<a class="relative group overflow-hidden glass-panel border border-white/10 px-6 py-4 rounded-2xl text-slate-100 font-black text-sm transition-all text-center" href="${loginHref}">
<span class="relative z-10">Sign In</span>
<div class="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
</a>`;
  const mobileBookNowButton = isBookingPage
    ? ''
    : `<a class="mt-auto relative group overflow-hidden bg-primary px-6 py-4 rounded-2xl text-background-dark font-black text-sm transition-all shadow-[0_4px_15px_rgba(19,236,236,0.2)] text-center" href="${bookHref}">
<span class="relative z-10">Book Now</span>
<div class="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
</a>`;
  const footerId = footerSlot?.dataset.footerId || '';
  const footerIdAttr = footerId ? ` id="${footerId}"` : '';

  const iconSprite = `
<svg aria-hidden="true" class="pointer-events-none absolute w-0 h-0 overflow-hidden">
<symbol id="architecture" viewBox="0 -960 960 960"><path d="m270-120-10-88 114-314q15 14 32.5 23.5T444-484L334-182l-64 62Zm420 0-64-62-110-302q20-5 37.5-14.5T586-522l114 314-10 88ZM395-555q-35-35-35-85 0-39 22.5-69.5T440-752v-88h80v88q35 12 57.5 42.5T600-640q0 50-35 85t-85 35q-50 0-85-35Zm113.5-56.5Q520-623 520-640t-11.5-28.5Q497-680 480-680t-28.5 11.5Q440-657 440-640t11.5 28.5Q463-600 480-600t28.5-11.5Z"/></symbol>
<symbol id="arrow_forward" viewBox="0 -960 960 960"><path d="M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z"/></symbol>
<symbol id="call" viewBox="0 -960 960 960"><path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67ZM241-600Zm358 358Z"/></symbol>
<symbol id="check_circle" viewBox="0 -960 960 960"><path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></symbol>
<symbol id="close" viewBox="0 -960 960 960"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></symbol>
<symbol id="dark_mode" viewBox="0 -960 960 960"><path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z"/></symbol>
<symbol id="expand_more" viewBox="0 -960 960 960"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></symbol>
<symbol id="light_mode" viewBox="0 -960 960 960"><path d="M565-395q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm-226.5 56.5Q280-397 280-480t58.5-141.5Q397-680 480-680t141.5 58.5Q680-563 680-480t-58.5 141.5Q563-280 480-280t-141.5-58.5ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z"/></symbol>
<symbol id="location_on" viewBox="0 -960 960 960"><path d="M536.5-503.5Q560-527 560-560t-23.5-56.5Q513-640 480-640t-56.5 23.5Q400-593 400-560t23.5 56.5Q447-480 480-480t56.5-23.5ZM480-186q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z"/></symbol>
<symbol id="mail" viewBox="0 -960 960 960"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z"/></symbol>
<symbol id="menu" viewBox="0 -960 960 960"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></symbol>
<symbol id="star" viewBox="0 -960 960 960"><path d="m233-120 65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Z"/></symbol>
<symbol id="verified_user" viewBox="0 -960 960 960"><path d="m438-338 226-226-57-57-169 169-84-84-57 57 141 141Zm42 258q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q104-33 172-132t68-220v-189l-240-90-240 90v189q0 121 68 220t172 132Zm0-316Z"/></symbol>
</svg>`;

  const headerHtml = `
${iconSprite}
<header class="fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-2 sm:px-4 md:px-6 py-3 md:py-4" id="main-header">
<nav class="max-w-7xl mx-auto glass-panel rounded-full px-3 sm:px-4 md:px-8 py-2.5 md:py-4 flex items-center justify-between gap-2 refractive-border">
<a class="flex items-center gap-2 sm:gap-3 min-w-0" href="${homeHref}" aria-label="Go to homepage">
<div class="size-8 md:size-10 bg-primary rounded-lg md:rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(19,236,236,0.3)]">
<svg aria-hidden="true" class="ms-icon text-background-dark text-2xl font-bold"><use href="#architecture"></use></svg>
</div>
<h2 class="brand-title text-slate-100 text-sm sm:text-base md:text-xl font-extrabold tracking-tighter truncate max-w-[124px] sm:max-w-none">PT CLINIC</h2>
</a>
<div class="hidden md:flex items-center gap-10">
<a class="text-slate-300 hover:text-primary transition-colors text-sm font-semibold tracking-wide" href="${navLinks.services}">Services</a>
<a class="text-slate-300 hover:text-primary transition-colors text-sm font-semibold tracking-wide" href="${navLinks.about}">About</a>
<a class="text-slate-300 hover:text-primary transition-colors text-sm font-semibold tracking-wide" href="${navLinks.team}">Team</a>
<a class="text-slate-300 hover:text-primary transition-colors text-sm font-semibold tracking-wide" href="${navLinks.insurance}">Insurance</a>
</div>
<div class="flex items-center gap-2 sm:gap-3 shrink-0">
<button aria-label="Toggle theme" class="hidden md:flex size-10 rounded-full glass-panel items-center justify-center text-slate-300 hover:text-primary transition-all group relative overflow-hidden refractive-border bg-white/[0.02] rotating-border-container" id="theme-toggle" type="button">
<span class="relative z-10 flex items-center justify-center"><svg aria-hidden="true" class="ms-icon text-xl" id="theme-toggle-icon"><use data-theme-icon-use href="#dark_mode"></use></svg></span>
<div class="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
</button>
<button aria-controls="mobile-menu-panel" aria-expanded="false" aria-label="Open menu" class="md:hidden size-9 sm:size-10 rounded-full glass-panel flex items-center justify-center text-slate-300 hover:text-primary transition-all" id="mobile-menu-toggle" type="button">
<svg aria-hidden="true" class="ms-icon text-xl"><use href="#menu"></use></svg>
</button>
${isSignedIn ? desktopProfileButton : desktopSignInButton}
${desktopBookNowButton}
</div>
</nav>
</header>
<div aria-hidden="true" class="fixed inset-0 z-40 bg-background-dark/80 backdrop-blur-md opacity-0 pointer-events-none transition-opacity duration-300 md:hidden" id="mobile-menu-overlay"></div>
<aside aria-hidden="true" class="fixed top-0 right-0 z-50 h-full w-[88%] max-w-sm translate-x-full transition-transform duration-300 md:hidden" id="mobile-menu-panel">
<div class="h-full glass-panel border-l border-primary/20 p-6 flex flex-col">
<div class="flex items-center justify-between mb-10">
<h3 class="text-xl font-extrabold tracking-tight text-white">PT CLINIC</h3>
<button aria-label="Close menu" class="size-10 rounded-full glass-panel flex items-center justify-center text-slate-300 hover:text-primary" id="mobile-menu-close" type="button">
<svg aria-hidden="true" class="ms-icon text-xl"><use href="#close"></use></svg>
</button>
</div>
<nav class="flex flex-col gap-6">
<a class="mobile-menu-link text-3xl font-black leading-tight text-white" href="${navLinks.services}">Services</a>
<a class="mobile-menu-link text-3xl font-black leading-tight text-white" href="${navLinks.about}">About</a>
<a class="mobile-menu-link text-3xl font-black leading-tight text-white" href="${navLinks.team}">Team</a>
<a class="mobile-menu-link text-3xl font-black leading-tight text-white" href="${navLinks.insurance}">Insurance</a>
${mobileProfileLink}
</nav>
<button aria-label="Toggle theme" class="mt-8 h-11 w-fit px-4 rounded-full glass-panel flex items-center gap-2 text-slate-200 hover:text-primary transition-all group relative overflow-hidden refractive-border bg-white/[0.02] rotating-border-container" id="theme-toggle-mobile" type="button">
<span class="relative z-10 flex items-center gap-2"><svg aria-hidden="true" class="ms-icon text-xl" id="theme-toggle-icon-mobile"><use data-theme-icon-use href="#dark_mode"></use></svg>
<span class="text-sm font-semibold">Theme</span></span>
<div class="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
</button>
${mobileSignInButton}
${mobileBookNowButton}
</div>
</aside>`;

  const footerHtml = `
<footer class="mt-40 border-t border-white/5 bg-background-dark/50 backdrop-blur-3xl"${footerIdAttr}>
<div class="max-w-7xl mx-auto px-6 pt-14 pb-10 md:pt-20 md:pb-12">
<div class="grid grid-cols-1 lg:grid-cols-4 gap-10 md:gap-14 mb-12 md:mb-16" data-stagger-reveal data-stagger-step="130">
<div class="col-span-1 lg:col-span-1">
<div class="flex items-center gap-3 mb-8">
<div class="size-10 bg-primary rounded-xl flex items-center justify-center">
<svg aria-hidden="true" class="ms-icon text-background-dark text-2xl font-bold"><use href="#architecture"></use></svg>
</div>
<h2 class="text-white text-2xl font-black tracking-tighter">PT CLINIC</h2>
</div>
<p class="text-slate-400 leading-relaxed mb-10 font-medium">Redefining rehabilitation through precision science and specialized human care.</p>
<div class="flex gap-4">
<a class="size-12 rounded-xl glass-panel flex items-center justify-center text-slate-400 hover:text-primary transition-all group relative overflow-hidden refractive-border bg-white/[0.02] rotating-border-container" href="#" aria-label="X (Twitter)">
<span class="relative z-10 flex items-center justify-center"><svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg></span>
<div class="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
</a>
<a class="size-12 rounded-xl glass-panel flex items-center justify-center text-slate-400 hover:text-primary transition-all group relative overflow-hidden refractive-border bg-white/[0.02] rotating-border-container" href="#" aria-label="Instagram">
<span class="relative z-10 flex items-center justify-center"><svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></span>
<div class="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
</a>
</div>
</div>
<div>
<h4 class="text-white font-bold mb-8">Quick Links</h4>
<ul class="space-y-4">
<li><a class="text-slate-400 hover:text-primary transition-colors font-medium text-sm" href="${navLinks.services}">Our Services</a></li>
<li><a class="text-slate-400 hover:text-primary transition-colors font-medium text-sm" href="${navLinks.team}">Find a Therapist</a></li>
<li><a class="text-slate-400 hover:text-primary transition-colors font-medium text-sm" href="${patientPortalHref}">Patient Portal</a></li>
<li><a class="text-slate-400 hover:text-primary transition-colors font-medium text-sm" href="${navLinks.insurance}">Insurance Info</a></li>
</ul>
</div>
<div>
<h4 class="text-white font-bold mb-8">Newsletter</h4>
<p class="text-slate-400 text-sm mb-6">Stay updated with the latest in recovery science.</p>
<div class="relative group">
<input class="booking-field footer-newsletter-field w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all" placeholder="Your email" type="email">
<button class="absolute right-2 top-2 bottom-2 bg-primary px-4 rounded-lg text-background-dark" aria-label="Submit email">
<svg aria-hidden="true" class="ms-icon text-xl"><use href="#arrow_forward"></use></svg>
</button>
</div>
</div>
<div>
<h4 class="text-white font-bold mb-8">Contact</h4>
<ul class="space-y-4">
<li class="flex gap-4"><svg aria-hidden="true" class="ms-icon text-primary"><use href="#location_on"></use></svg><span class="text-slate-400 text-sm">123 Wellness Way, Metro City</span></li>
<li class="flex gap-4"><svg aria-hidden="true" class="ms-icon text-primary"><use href="#call"></use></svg><span class="text-slate-400 text-sm">(555) 000-1234</span></li>
<li class="flex gap-4"><svg aria-hidden="true" class="ms-icon text-primary"><use href="#mail"></use></svg><span class="text-slate-400 text-sm">hello@ptclinic.com</span></li>
</ul>
</div>
</div>
<div class="pt-8 md:pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
<p class="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] text-center md:text-left leading-relaxed">&copy; 2026 PHYSICAL THERAPY CLINIC. ALL RIGHTS RESERVED.</p>
<p class="text-slate-500 text-xs font-semibold tracking-wide text-center">Created by Mustafa Turgut</p>
<div class="flex gap-8">
<a class="text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest" href="#">Privacy</a>
<a class="text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest" href="#">Terms</a>
</div>
</div>
</div>
</footer>`;

  if (headerSlot) {
    headerSlot.innerHTML = headerHtml;
  }

  if (footerSlot) {
    footerSlot.innerHTML = footerHtml;
  }
})();
