document.addEventListener('DOMContentLoaded', () => {
  const serviceTrack = document.getElementById('booking-service-track');
  const serviceShell = document.querySelector('.service-scroll-shell');
  const scrollNav = document.getElementById('service-scroll-nav');
  const scrollThumb = document.getElementById('service-scroll-thumb');
  const serviceCards = Array.from(document.querySelectorAll('.booking-service-card'));
  const selectedLabel = document.getElementById('selected-service-label');
  const selectedInput = document.getElementById('selected-service-input');
  const selectedPrice = document.getElementById('selected-service-price');
  const progressFill = document.getElementById('booking-progress-fill');
  const progressStep = document.getElementById('booking-progress-step');
  const storageKey = 'pt-clinic-booking-service';
  let suppressCardClick = false;

  if (!serviceTrack || serviceCards.length === 0) {
    return;
  }

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const trackDragThreshold = 4;
  const trackDragSpeed = 1.55;

  const setProgress = (hasSelectedService) => {
    if (progressFill) {
      progressFill.style.width = hasSelectedService ? '33.333%' : '0%';
    }
    if (progressStep) {
      progressStep.textContent = hasSelectedService ? 'Step 1 of 3' : 'Step 0 of 3';
    }
  };

  const clearSelection = () => {
    serviceCards.forEach((item) => {
      item.classList.remove('is-selected');
      item.classList.remove('always-border-glow');
      item.setAttribute('aria-pressed', 'false');
    });

    if (selectedLabel) {
      selectedLabel.textContent = 'Not selected';
    }
    if (selectedPrice) {
      selectedPrice.textContent = '';
    }
    if (selectedInput) {
      selectedInput.value = '';
    }

    setProgress(false);
  };

  const maxScrollableDistance = () => Math.max(0, serviceTrack.scrollWidth - serviceTrack.clientWidth);

  const syncEdgeFade = () => {
    if (!serviceShell) {
      return;
    }

    const maxScroll = maxScrollableDistance();
    const atStart = serviceTrack.scrollLeft <= 2;
    const atEnd = maxScroll - serviceTrack.scrollLeft <= 2;

    serviceShell.classList.toggle('is-at-start', atStart);
    serviceShell.classList.toggle('is-at-end', atEnd);
  };

  const syncScrollThumb = () => {
    if (!scrollNav || !scrollThumb) {
      return;
    }

    const maxScroll = maxScrollableDistance();
    if (maxScroll <= 1) {
      scrollNav.classList.add('is-hidden');
      scrollThumb.style.width = '0px';
      scrollThumb.style.transform = 'translate3d(0, -50%, 0)';
      return;
    }

    scrollNav.classList.remove('is-hidden');

    const navWidth = scrollNav.clientWidth;
    if (navWidth <= 0) {
      return;
    }

    const visibleRatio = serviceTrack.clientWidth / serviceTrack.scrollWidth;
    const thumbWidth = clamp(Math.round(navWidth * visibleRatio), 34, navWidth);
    const maxThumbTravel = Math.max(0, navWidth - thumbWidth);
    const progress = clamp(serviceTrack.scrollLeft / maxScroll, 0, 1);
    const thumbX = maxThumbTravel * progress;

    scrollThumb.style.width = `${thumbWidth}px`;
    scrollThumb.style.transform = `translate3d(${thumbX}px, -50%, 0)`;
  };

  const syncScrollerUi = () => {
    syncEdgeFade();
    syncScrollThumb();
  };

  const applySelection = (card, persist = true) => {
    serviceCards.forEach((item) => {
      const isSelected = item === card;
      item.classList.toggle('is-selected', isSelected);
      item.classList.toggle('always-border-glow', isSelected);
      item.setAttribute('aria-pressed', String(isSelected));
    });

    const serviceName = card.dataset.serviceName ?? card.querySelector('h3')?.textContent?.trim() ?? '';
    const servicePrice = card.dataset.servicePrice ?? '';

    if (selectedLabel) {
      selectedLabel.textContent = serviceName || 'Not selected';
    }
    if (selectedPrice) {
      selectedPrice.textContent = servicePrice ? `${servicePrice} / hour` : '';
    }
    if (selectedInput) {
      selectedInput.value = serviceName;
    }

    setProgress(serviceName.length > 0);

    if (persist) {
      localStorage.setItem(storageKey, card.dataset.serviceId ?? serviceName);
    }
  };

  serviceCards.forEach((card) => {
    card.setAttribute('aria-pressed', 'false');
    card.addEventListener('click', () => {
      if (suppressCardClick) {
        return;
      }
      applySelection(card);
    });
  });

  const storedService = localStorage.getItem(storageKey);
  const initialCard = serviceCards.find((card) => card.dataset.serviceId === storedService);

  if (initialCard) {
    applySelection(initialCard, false);
  } else {
    clearSelection();
  }

  let trackDragActive = false;
  let trackDragStartX = 0;
  let trackStartScroll = 0;
  let trackMoved = false;

  const endTrackDrag = () => {
    if (!trackDragActive) {
      return;
    }

    serviceTrack.classList.remove('is-dragging');
    trackDragActive = false;

    if (trackMoved) {
      suppressCardClick = true;
      window.setTimeout(() => {
        suppressCardClick = false;
      }, 140);
    }

    trackMoved = false;
  };

  serviceTrack.addEventListener('mousedown', (event) => {
    if (event.button !== 0) {
      return;
    }

    trackDragActive = true;
    trackDragStartX = event.clientX;
    trackStartScroll = serviceTrack.scrollLeft;
    trackMoved = false;
    serviceTrack.classList.add('is-dragging');
  });

  window.addEventListener('mousemove', (event) => {
    if (!trackDragActive) {
      return;
    }

    const deltaX = event.clientX - trackDragStartX;
    if (Math.abs(deltaX) > trackDragThreshold) {
      trackMoved = true;
    }

    if (trackMoved) {
      event.preventDefault();
      serviceTrack.scrollLeft = trackStartScroll - (deltaX * trackDragSpeed);
      syncScrollerUi();
    }
  });

  window.addEventListener('mouseup', endTrackDrag);
  serviceTrack.addEventListener('mouseleave', () => {
    if (trackDragActive && trackMoved) {
      endTrackDrag();
    }
  });

  serviceTrack.addEventListener('dragstart', (event) => {
    if (trackDragActive) {
      event.preventDefault();
    }
  });

  if (scrollNav && scrollThumb) {
    let thumbDragActive = false;
    let thumbDragPointerId = null;
    let thumbStartX = 0;
    let thumbStartLeft = 0;

    const endThumbDrag = () => {
      if (!thumbDragActive) {
        return;
      }

      if (thumbDragPointerId !== null && scrollThumb.hasPointerCapture(thumbDragPointerId)) {
        scrollThumb.releasePointerCapture(thumbDragPointerId);
      }

      scrollThumb.classList.remove('is-dragging');
      thumbDragActive = false;
      thumbDragPointerId = null;
    };

    scrollThumb.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) {
        return;
      }
      if (event.pointerType === 'touch') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      thumbDragActive = true;
      thumbDragPointerId = event.pointerId;
      thumbStartX = event.clientX;
      thumbStartLeft = scrollThumb.offsetLeft;

      scrollThumb.classList.add('is-dragging');
      scrollThumb.setPointerCapture(event.pointerId);
    });

    scrollThumb.addEventListener('pointermove', (event) => {
      if (!thumbDragActive || event.pointerId !== thumbDragPointerId) {
        return;
      }

      const maxScroll = maxScrollableDistance();
      if (maxScroll <= 0) {
        return;
      }

      const navWidth = scrollNav.clientWidth;
      const thumbWidth = scrollThumb.offsetWidth;
      const maxThumbTravel = Math.max(0, navWidth - thumbWidth);
      const nextLeft = clamp(thumbStartLeft + (event.clientX - thumbStartX), 0, maxThumbTravel);
      const progress = maxThumbTravel === 0 ? 0 : nextLeft / maxThumbTravel;

      serviceTrack.scrollLeft = progress * maxScroll;
      syncScrollerUi();
    });

    scrollThumb.addEventListener('pointerup', endThumbDrag);
    scrollThumb.addEventListener('pointercancel', endThumbDrag);

    scrollNav.addEventListener('pointerdown', (event) => {
      if (event.target === scrollThumb || event.button !== 0) {
        return;
      }

      const maxScroll = maxScrollableDistance();
      if (maxScroll <= 0) {
        return;
      }

      const rect = scrollNav.getBoundingClientRect();
      const thumbWidth = scrollThumb.offsetWidth;
      const maxThumbTravel = Math.max(0, rect.width - thumbWidth);
      const targetLeft = clamp(event.clientX - rect.left - (thumbWidth / 2), 0, maxThumbTravel);
      const progress = maxThumbTravel === 0 ? 0 : targetLeft / maxThumbTravel;

      serviceTrack.scrollTo({
        left: progress * maxScroll,
        behavior: 'smooth',
      });
    });
  }

  serviceTrack.addEventListener('scroll', syncScrollerUi, { passive: true });
  window.addEventListener('resize', syncScrollerUi, { passive: true });

  syncScrollerUi();
});
