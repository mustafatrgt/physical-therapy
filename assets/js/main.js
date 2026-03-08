document.addEventListener('DOMContentLoaded', () => {
  const html = document.documentElement;
  const body = document.body;

  const header = document.getElementById('main-header');
  const spotlight = document.getElementById('mouse-spotlight');
  const themeToggle = document.getElementById('theme-toggle');
  const themeToggleMobile = document.getElementById('theme-toggle-mobile');
  const themeIconUses = document.querySelectorAll('[data-theme-icon-use]');

  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenuClose = document.getElementById('mobile-menu-close');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  const mobileMenuPanel = document.getElementById('mobile-menu-panel');

  const revealElements = document.querySelectorAll('.reveal-left, .reveal-right, .reveal-up');
  const staggerContainers = document.querySelectorAll('[data-stagger-reveal]');
  const statCounters = document.querySelectorAll('[data-count-up]');
  const heroTyping = document.getElementById('hero-typing');
  const smartVideos = Array.from(document.querySelectorAll('[data-smart-video]'))
    .filter((video) => video instanceof HTMLVideoElement);

  const readCounterConfig = (element) => {
    const end = Number.parseFloat(element.dataset.countUp ?? '0');
    const decimals = Number.parseInt(element.dataset.decimals ?? '0', 10);
    const duration = Number.parseInt(element.dataset.duration ?? '900', 10);
    return {
      end: Number.isFinite(end) ? end : 0,
      decimals: Number.isFinite(decimals) ? Math.max(0, decimals) : 0,
      duration: Number.isFinite(duration) ? Math.max(250, duration) : 900,
      prefix: element.dataset.prefix ?? '',
      suffix: element.dataset.suffix ?? '',
    };
  };

  const setCounterValue = (element, value, config) => {
    const numberText = config.decimals > 0
      ? value.toFixed(config.decimals)
      : String(Math.round(value));
    element.textContent = `${config.prefix}${numberText}${config.suffix}`;
  };

  const setCounterFinal = (element) => {
    const config = readCounterConfig(element);
    setCounterValue(element, config.end, config);
    element.dataset.countAnimated = 'true';
  };

  const animateCounter = (element) => {
    if (element.dataset.countAnimated === 'true') {
      return;
    }

    element.dataset.countAnimated = 'true';
    const config = readCounterConfig(element);
    const startedAt = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / config.duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCounterValue(element, config.end * eased, config);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  };

  const getHeroTypingPhrases = () => {
    if (!heroTyping) {
      return [];
    }

    const rawPhrases = heroTyping.dataset.typingPhrases ?? '';
    const phrases = rawPhrases
      .split('|')
      .map((phrase) => phrase.trim())
      .filter((phrase) => phrase.length > 0);

    if (phrases.length > 0) {
      return phrases;
    }

    return ['Gets You Moving', 'Restores Motion'];
  };

  const initHeroTyping = (reducedMotion) => {
    if (!heroTyping) {
      return;
    }

    const phrases = getHeroTypingPhrases();
    if (phrases.length === 0) {
      return;
    }

    const updateHeroTypingWidth = () => {
      const measure = document.createElement('span');
      const computed = window.getComputedStyle(heroTyping);

      measure.style.position = 'absolute';
      measure.style.visibility = 'hidden';
      measure.style.whiteSpace = 'nowrap';
      measure.style.pointerEvents = 'none';
      measure.style.fontFamily = computed.fontFamily;
      measure.style.fontSize = computed.fontSize;
      measure.style.fontWeight = computed.fontWeight;
      measure.style.letterSpacing = computed.letterSpacing;
      measure.style.textTransform = computed.textTransform;
      measure.style.lineHeight = computed.lineHeight;

      document.body.appendChild(measure);

      let maxWidth = 0;
      phrases.forEach((phrase) => {
        measure.textContent = phrase;
        maxWidth = Math.max(maxWidth, Math.ceil(measure.getBoundingClientRect().width));
      });

      measure.remove();

      if (maxWidth > 0) {
        const fontSize = Number.parseFloat(computed.fontSize) || 16;
        const caretReserve = Math.ceil(fontSize * 0.42);
        heroTyping.style.width = `${maxWidth + caretReserve}px`;
      }
    };

    updateHeroTypingWidth();

    let typingResizeTimer = null;
    window.addEventListener(
      'resize',
      () => {
        if (typingResizeTimer) {
          window.clearTimeout(typingResizeTimer);
        }
        typingResizeTimer = window.setTimeout(updateHeroTypingWidth, 120);
      },
      { passive: true }
    );

    if (reducedMotion || phrases.length === 1) {
      heroTyping.textContent = phrases[0];
      return;
    }

    let phraseIndex = 0;
    let charIndex = phrases[0].length;
    let isDeleting = true;
    let typingTimeoutId = null;
    let heroTypingInView = true;

    const typeDelay = 88;
    const deleteDelay = 58;
    const holdTypedDelay = 3200;
    const holdEmptyDelay = 520;

    const shouldRunTyping = () => document.visibilityState === 'visible' && heroTypingInView;

    const clearTypingTimer = () => {
      if (typingTimeoutId !== null) {
        window.clearTimeout(typingTimeoutId);
        typingTimeoutId = null;
      }
    };

    const scheduleTick = (delay) => {
      clearTypingTimer();
      typingTimeoutId = window.setTimeout(() => {
        typingTimeoutId = null;
        tickTyping();
      }, delay);
    };

    const tickTyping = () => {
      if (!shouldRunTyping()) {
        return;
      }

      const phrase = phrases[phraseIndex];

      if (isDeleting) {
        charIndex -= 1;
      } else {
        charIndex += 1;
      }

      heroTyping.textContent = phrase.slice(0, Math.max(charIndex, 0));

      let nextDelay = isDeleting ? deleteDelay : typeDelay;

      if (!isDeleting && charIndex >= phrase.length) {
        isDeleting = true;
        nextDelay = holdTypedDelay;
      } else if (isDeleting && charIndex <= 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        nextDelay = holdEmptyDelay;
      }

      scheduleTick(nextDelay);
    };

    const syncTypingRunState = () => {
      if (shouldRunTyping()) {
        if (typingTimeoutId === null) {
          const nextDelay = isDeleting ? deleteDelay : typeDelay;
          scheduleTick(nextDelay);
        }
      } else {
        clearTypingTimer();
      }
    };

    document.addEventListener('visibilitychange', syncTypingRunState);

    if ('IntersectionObserver' in window) {
      const heroTypingObserver = new IntersectionObserver(
        (entries) => {
          heroTypingInView = entries.some((entry) => entry.isIntersecting);
          syncTypingRunState();
        },
        {
          threshold: 0.1,
        }
      );
      heroTypingObserver.observe(heroTyping);
    }

    heroTyping.textContent = phrases[0];
    if (shouldRunTyping()) {
      scheduleTick(holdTypedDelay);
    }
  };

  const syncThemeIcon = () => {
    if (themeIconUses.length === 0) {
      return;
    }
    const iconName = html.classList.contains('dark') ? 'dark_mode' : 'light_mode';
    const iconHref = `#${iconName}`;
    themeIconUses.forEach((iconUse) => {
      iconUse.setAttribute('href', iconHref);
      iconUse.setAttribute('xlink:href', iconHref);
    });
  };

  const toggleTheme = () => {
    html.classList.toggle('dark');
    html.classList.toggle('light');
    syncThemeIcon();
  };

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  if (themeToggleMobile) {
    themeToggleMobile.addEventListener('click', toggleTheme);
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
  initHeroTyping(reducedMotion);

  if (smartVideos.length > 0) {
    let videoPlaybackReady = document.readyState === 'complete';

    const shouldPlayVideo = (video) => (
      !reducedMotion
      && videoPlaybackReady
      && document.visibilityState === 'visible'
      && video.dataset.inView === 'true'
    );

    const syncVideoPlayback = (video) => {
      if (shouldPlayVideo(video)) {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      } else {
        video.pause();
      }
    };

    const syncAllVideos = () => {
      smartVideos.forEach((video) => {
        syncVideoPlayback(video);
      });
    };

    smartVideos.forEach((video) => {
      video.dataset.inView = 'false';
      video.pause();
    });

    if ('IntersectionObserver' in window) {
      const videoObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!(entry.target instanceof HTMLVideoElement)) {
              return;
            }
            entry.target.dataset.inView = entry.isIntersecting ? 'true' : 'false';
            syncVideoPlayback(entry.target);
          });
        },
        {
          threshold: 0.3,
          rootMargin: '0px 0px -8% 0px',
        }
      );

      smartVideos.forEach((video) => {
        videoObserver.observe(video);
      });
    } else {
      smartVideos.forEach((video) => {
        video.dataset.inView = 'true';
      });
    }

    const onPageLoaded = () => {
      videoPlaybackReady = true;
      syncAllVideos();
    };

    if (videoPlaybackReady) {
      syncAllVideos();
    } else {
      window.addEventListener('load', onPageLoaded, { once: true });
    }

    document.addEventListener('visibilitychange', syncAllVideos);
    window.addEventListener('pagehide', () => {
      smartVideos.forEach((video) => video.pause());
    });
  }

  const revealStaggerContainer = (container) => {
    if (!(container instanceof HTMLElement)) {
      return;
    }
    if (container.dataset.staggerDone === 'true') {
      return;
    }

    container.dataset.staggerDone = 'true';
    const step = Number.parseInt(container.dataset.staggerStep ?? '140', 10);
    const startDelay = Number.parseInt(container.dataset.staggerStart ?? '0', 10);
    const safeStep = Number.isFinite(step) ? Math.max(40, step) : 140;
    const safeStartDelay = Number.isFinite(startDelay) ? Math.max(0, startDelay) : 0;
    const children = Array.from(container.children).filter((child) => child instanceof HTMLElement);

    children.forEach((child, index) => {
      window.setTimeout(() => {
        child.classList.add('is-visible');
      }, safeStartDelay + (index * safeStep));
    });
  };

  if (reducedMotion) {
    revealElements.forEach((element) => {
      element.classList.add('is-visible');
    });
    staggerContainers.forEach((container) => {
      const children = Array.from(container.children).filter((child) => child instanceof HTMLElement);
      children.forEach((child) => child.classList.add('is-visible'));
      if (container instanceof HTMLElement) {
        container.dataset.staggerDone = 'true';
      }
    });
    statCounters.forEach((counter) => {
      setCounterFinal(counter);
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

  if (staggerContainers.length > 0) {
    const staggerObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          revealStaggerContainer(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    staggerContainers.forEach((container) => {
      staggerObserver.observe(container);
    });
  }

  if (statCounters.length > 0) {
    const counterObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.45,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    statCounters.forEach((counter) => {
      counterObserver.observe(counter);
    });
  }
});
