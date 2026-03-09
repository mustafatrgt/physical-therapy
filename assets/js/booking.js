document.addEventListener('DOMContentLoaded', () => {
  const serviceTrack = document.getElementById('booking-service-track');
  const serviceShell = document.querySelector('.service-scroll-shell');
  const scrollNav = document.getElementById('service-scroll-nav');
  const scrollThumb = document.getElementById('service-scroll-thumb');
  const serviceCards = Array.from(document.querySelectorAll('.booking-service-card'));

  const selectedLabel = document.getElementById('selected-service-label');
  const selectedInput = document.getElementById('selected-service-input');
  const selectedPrice = document.getElementById('selected-service-price');
  const selectedDateLabel = document.getElementById('selected-date-label');
  const selectedTimeLabel = document.getElementById('selected-time-label');
  const selectedDateInput = document.getElementById('selected-date-input');
  const selectedTimeInput = document.getElementById('selected-time-input');

  const progressFill = document.getElementById('booking-progress-fill');
  const progressStep = document.getElementById('booking-progress-step');

  const monthLabel = document.getElementById('booking-month-label');
  const dayGrid = document.getElementById('booking-day-grid');
  const slotGrid = document.getElementById('booking-slot-grid');

  const dayButtons = Array.from(dayGrid?.querySelectorAll('button') || []);
  const timeButtons = Array.from(slotGrid?.querySelectorAll('button') || []);

  const confirmBookingBtn = document.getElementById('confirm-booking-btn');
  const submitStatus = document.getElementById('booking-submit-status');

  const patientNameInput = document.getElementById('patient-name');
  const patientEmailInput = document.getElementById('patient-email');
  const patientPhoneInput = document.getElementById('patient-phone');
  const patientSpecialistInput = document.getElementById('patient-specialist');
  const injuryDetailsInput = document.getElementById('injury-details');

  const serviceStorageKey = 'pt-clinic-booking-service';
  const appointmentsStorageKey = 'pt-clinic-appointments-v1';
  const userProfileKey = 'pt-clinic-user-profile';

  let suppressCardClick = false;
  let bookingConfirmed = false;

  if (!serviceTrack || serviceCards.length === 0) {
    return;
  }

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const trackDragThreshold = 4;
  const trackDragSpeed = 1.55;

  const readJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  };

  const writeJson = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors in restricted contexts.
    }
  };

  const readUserProfile = () => {
    const profile = readJson(userProfileKey, null);
    if (!profile || typeof profile !== 'object') {
      return null;
    }
    return profile;
  };

  const showSubmitStatus = (message, tone = 'info', useHtml = false) => {
    if (!submitStatus) {
      return;
    }

    submitStatus.classList.remove('hidden', 'is-error', 'is-success', 'is-info');
    if (tone === 'error') {
      submitStatus.classList.add('is-error');
    } else if (tone === 'success') {
      submitStatus.classList.add('is-success');
    } else {
      submitStatus.classList.add('is-info');
    }

    if (useHtml) {
      submitStatus.innerHTML = message;
    } else {
      submitStatus.textContent = message;
    }

    if (tone === 'error') {
      submitStatus.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  };

  const clearSubmitStatus = () => {
    if (!submitStatus) {
      return;
    }
    submitStatus.classList.add('hidden');
    submitStatus.classList.remove('is-error', 'is-success', 'is-info');
    submitStatus.textContent = '';
  };

  const setProgress = (stepNumber) => {
    const safeStep = clamp(stepNumber, 0, 3);
    if (progressFill) {
      progressFill.style.width = `${(safeStep / 3) * 100}%`;
    }
    if (progressStep) {
      progressStep.textContent = `Step ${safeStep} of 3`;
    }
  };

  const getCurrentFlowStep = () => {
    if (bookingConfirmed) {
      return 3;
    }

    const hasService = Boolean(selectedInput?.value);
    const hasDate = Boolean(selectedDateInput?.value);
    const hasTime = Boolean(selectedTimeInput?.value);

    if (!hasService) {
      return 0;
    }
    if (!hasDate || !hasTime) {
      return 1;
    }
    return 2;
  };

  const refreshProgress = () => {
    setProgress(getCurrentFlowStep());
  };

  const hydratePatientProfile = () => {
    const profile = readUserProfile();
    if (!profile) {
      return;
    }

    if (patientNameInput && !patientNameInput.value && typeof profile.fullName === 'string') {
      patientNameInput.value = profile.fullName;
    }

    if (patientEmailInput && !patientEmailInput.value && typeof profile.email === 'string') {
      patientEmailInput.value = profile.email;
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

    refreshProgress();
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
    bookingConfirmed = false;
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

    refreshProgress();

    if (persist) {
      localStorage.setItem(serviceStorageKey, card.dataset.serviceId ?? serviceName);
    }
  };

  const getMonthTitle = () => monthLabel?.textContent?.trim() || 'October 2026';

  const setDateSummary = (dayValue) => {
    if (selectedDateInput) {
      selectedDateInput.value = dayValue ? `${getMonthTitle()} ${dayValue}` : '';
    }

    if (selectedDateLabel) {
      selectedDateLabel.textContent = dayValue
        ? `Date: ${getMonthTitle()} • ${dayValue}`
        : 'Date: Not selected';
    }
  };

  const setTimeSummary = (timeValue) => {
    if (selectedTimeInput) {
      selectedTimeInput.value = timeValue || '';
    }

    if (selectedTimeLabel) {
      selectedTimeLabel.textContent = timeValue
        ? `Time: ${timeValue}`
        : 'Time: Not selected';
    }
  };

  const saveBaseClasses = (buttons) => {
    buttons.forEach((button) => {
      const baseClass = button.className
        .replace(/\bbg-primary\b/g, '')
        .replace(/\btext-background-dark\b/g, '')
        .replace(/\bfont-black\b/g, '')
        .replace(/\bshadow-\[0_0_15px_rgba\(19,236,236,0\.35\)\]\b/g, '')
        .replace(/\bshadow-\[0_0_15px_rgba\(19,236,236,0\.3\)\]\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      button.dataset.baseClass = baseClass;

      if (button.className.includes('text-slate-600')) {
        button.dataset.isInactive = 'true';
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      }
    });
  };

  const activateButton = (buttons, activeButton, selectedShadowClass) => {
    const neutralTextClasses = ['text-slate-100', 'text-slate-200', 'text-slate-300', 'text-slate-400', 'text-slate-500', 'text-slate-600'];

    buttons.forEach((button) => {
      button.className = button.dataset.baseClass || button.className;
      button.classList.remove('bg-primary', 'text-background-dark', 'font-black', selectedShadowClass);

      if (button === activeButton) {
        button.classList.remove(...neutralTextClasses);
        button.classList.add('bg-primary', 'text-background-dark', 'font-black', selectedShadowClass);
      }
    });
  };

  const getInitialActiveButton = (buttons) => buttons.find((button) => button.className.includes('bg-primary')) || null;

  saveBaseClasses(dayButtons);
  saveBaseClasses(timeButtons);

  let activeDayButton = getInitialActiveButton(dayButtons);
  let activeTimeButton = getInitialActiveButton(timeButtons);

  if (activeDayButton) {
    activateButton(dayButtons, activeDayButton, 'shadow-[0_0_15px_rgba(19,236,236,0.35)]');
    setDateSummary(activeDayButton.textContent?.trim() || '');
  } else {
    setDateSummary('');
  }

  if (activeTimeButton) {
    activateButton(timeButtons, activeTimeButton, 'shadow-[0_0_15px_rgba(19,236,236,0.3)]');
    setTimeSummary(activeTimeButton.textContent?.trim() || '');
  } else {
    setTimeSummary('');
  }

  dayButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.isInactive === 'true') {
        return;
      }

      bookingConfirmed = false;
      activeDayButton = button;
      activateButton(dayButtons, button, 'shadow-[0_0_15px_rgba(19,236,236,0.35)]');
      setDateSummary(button.textContent?.trim() || '');
      refreshProgress();
      clearSubmitStatus();
    });
  });

  timeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      bookingConfirmed = false;
      activeTimeButton = button;
      activateButton(timeButtons, button, 'shadow-[0_0_15px_rgba(19,236,236,0.3)]');
      setTimeSummary(button.textContent?.trim() || '');
      refreshProgress();
      clearSubmitStatus();
    });
  });

  serviceCards.forEach((card) => {
    card.setAttribute('aria-pressed', 'false');
    card.addEventListener('click', () => {
      if (suppressCardClick) {
        return;
      }
      applySelection(card);
      clearSubmitStatus();
    });
  });

  const storedService = localStorage.getItem(serviceStorageKey);
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

  const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
  const buildAppointmentId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `apt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  };

  const confirmBooking = () => {
    const serviceName = selectedInput?.value?.trim() || '';
    const servicePrice = selectedPrice?.textContent?.replace('/ hour', '').trim() || '';
    const dateValue = selectedDateInput?.value?.trim() || '';
    const timeValue = selectedTimeInput?.value?.trim() || '';

    const patientName = patientNameInput?.value?.trim() || '';
    const patientEmail = normalizeEmail(patientEmailInput?.value);
    const patientPhone = patientPhoneInput?.value?.trim() || '';
    const specialist = patientSpecialistInput?.value?.trim() || 'No Preference';
    const injuryDetails = injuryDetailsInput?.value?.trim() || '';

    if (!serviceName) {
      showSubmitStatus('Please select a service before confirming your booking.', 'error');
      return;
    }

    if (!dateValue || !timeValue) {
      showSubmitStatus('Please choose both date and time to continue.', 'error');
      return;
    }

    if (!patientName) {
      showSubmitStatus('Please enter your full name.', 'error');
      return;
    }

    if (!patientEmail || !patientEmail.includes('@')) {
      showSubmitStatus('Please enter a valid email address.', 'error');
      return;
    }

    const profile = readUserProfile();
    const appointment = {
      id: buildAppointmentId(),
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      ownerUid: profile?.firebaseUid || null,
      ownerEmail: normalizeEmail(profile?.email || patientEmail),
      ownerName: profile?.fullName || patientName,
      serviceName,
      servicePrice,
      dateLabel: dateValue,
      timeLabel: timeValue,
      patientName,
      patientEmail,
      patientPhone,
      specialist,
      injuryDetails,
    };

    const appointments = readJson(appointmentsStorageKey, []);
    const nextAppointments = Array.isArray(appointments) ? appointments : [];
    nextAppointments.unshift(appointment);
    writeJson(appointmentsStorageKey, nextAppointments);

    bookingConfirmed = true;
    refreshProgress();

    const profilePath = profile ? '/profile' : '/login?next=/profile';
    showSubmitStatus(
      `Booking confirmed. <a class="underline underline-offset-4" href="${profilePath}">Manage in profile</a>.`,
      'success',
      true
    );
  };

  confirmBookingBtn?.addEventListener('click', confirmBooking);

  [patientNameInput, patientEmailInput, patientPhoneInput, patientSpecialistInput, injuryDetailsInput].forEach((field) => {
    field?.addEventListener('input', () => {
      bookingConfirmed = false;
      clearSubmitStatus();
      refreshProgress();
    });
    field?.addEventListener('change', () => {
      bookingConfirmed = false;
      clearSubmitStatus();
      refreshProgress();
    });
  });

  serviceTrack.addEventListener('scroll', syncScrollerUi, { passive: true });
  window.addEventListener('resize', syncScrollerUi, { passive: true });

  hydratePatientProfile();
  refreshProgress();
  syncScrollerUi();
});
