document.addEventListener('DOMContentLoaded', () => {
  const html = document.documentElement;
  const body = document.body;

  const header = document.getElementById('main-header');
  const spotlight = document.getElementById('mouse-spotlight');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-toggle-icon');

  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenuClose = document.getElementById('mobile-menu-close');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  const mobileMenuPanel = document.getElementById('mobile-menu-panel');

  const revealElements = document.querySelectorAll('.reveal-left, .reveal-right, .reveal-up');

  const syncThemeIcon = () => {
    if (!themeIcon) {
      return;
    }
    themeIcon.textContent = html.classList.contains('dark') ? 'dark_mode' : 'light_mode';
  };

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      html.classList.toggle('dark');
      html.classList.toggle('light');
      syncThemeIcon();
    });
  }
  syncThemeIcon();

  if (header) {
    const onScroll = () => {
      if (window.scrollY > 50) {
        header.classList.add('header-scrolled');
        header.classList.remove('py-4');
      } else {
        header.classList.remove('header-scrolled');
        header.classList.add('py-4');
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (spotlight && window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('mousemove', (event) => {
      spotlight.style.setProperty('--x', `${event.clientX}px`);
      spotlight.style.setProperty('--y', `${event.clientY}px`);
    }, { passive: true });
  }

  let menuWasOpen = false;
  let lastFocusedElement = null;

  const setMenuState = (open) => {
    if (!mobileMenuPanel || !mobileMenuOverlay || !mobileMenuToggle) {
      return;
    }

    menuWasOpen = open;
    mobileMenuPanel.classList.toggle('translate-x-full', !open);
    mobileMenuOverlay.classList.toggle('opacity-0', !open);
    mobileMenuOverlay.classList.toggle('pointer-events-none', !open);
    mobileMenuPanel.setAttribute('aria-hidden', String(!open));
    mobileMenuOverlay.setAttribute('aria-hidden', String(!open));
    mobileMenuToggle.setAttribute('aria-expanded', String(open));
    body.classList.toggle('menu-open', open);

    if (open) {
      lastFocusedElement = document.activeElement;
      mobileMenuClose?.focus();
    } else if (lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    }
  };

  if (mobileMenuToggle && mobileMenuClose && mobileMenuOverlay && mobileMenuPanel) {
    mobileMenuToggle.addEventListener('click', () => setMenuState(true));
    mobileMenuClose.addEventListener('click', () => setMenuState(false));
    mobileMenuOverlay.addEventListener('click', () => setMenuState(false));

    mobileMenuPanel.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenuState(false));
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuWasOpen) {
        setMenuState(false);
      }
    });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    revealElements.forEach((element) => {
      element.classList.add('is-visible');
    });
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: '0px 0px -8% 0px',
    }
  );

  revealElements.forEach((element) => {
    revealObserver.observe(element);
  });
});
