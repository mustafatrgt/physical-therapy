document.addEventListener('DOMContentLoaded', () => {
  const userProfileKey = 'pt-clinic-user-profile';
  const appointmentsStorageKey = 'pt-clinic-appointments-v1';

  const profileAuthRequired = document.getElementById('profile-auth-required');
  const profileContent = document.getElementById('profile-content');

  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const profileAvatar = document.getElementById('profile-avatar');
  const profileMeta = document.getElementById('profile-meta');

  const statTotal = document.getElementById('stat-total');
  const statUpcoming = document.getElementById('stat-upcoming');
  const statCancelled = document.getElementById('stat-cancelled');

  const appointmentsList = document.getElementById('appointments-list');
  const appointmentsEmpty = document.getElementById('appointments-empty');

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
      // Ignore storage write errors in restricted contexts.
    }
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

  const formatDateTime = (isoLike) => {
    const value = String(isoLike || '');
    if (!value) {
      return 'Unknown date';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const profile = readJson(userProfileKey, null);
  const isSignedIn = Boolean(profile && (profile.firebaseUid || profile.email || profile.fullName));

  if (!isSignedIn) {
    profileAuthRequired?.classList.remove('hidden');
    profileContent?.classList.add('hidden');
    return;
  }

  profileAuthRequired?.classList.add('hidden');
  profileContent?.classList.remove('hidden');

  const currentUid = String(profile.firebaseUid || '').trim();
  const currentEmail = normalizeEmail(profile.email);
  const currentName = profile.fullName || profile.email || 'PT Clinic Patient';

  if (profileName) {
    profileName.textContent = currentName;
  }

  if (profileEmail) {
    profileEmail.textContent = profile.email || 'No email on profile';
  }

  if (profileAvatar) {
    profileAvatar.src = profile.avatarUrl || './assets/images/team-alex.webp';
  }

  if (profileMeta) {
    const provider = profile.provider ? `Provider: ${profile.provider}` : 'Profile synced locally';
    profileMeta.textContent = provider;
  }

  const getUserAppointments = () => {
    const all = readJson(appointmentsStorageKey, []);
    const safeArray = Array.isArray(all) ? all : [];

    const mine = safeArray.filter((appointment) => {
      if (!appointment || typeof appointment !== 'object') {
        return false;
      }

      const ownerUid = String(appointment.ownerUid || '').trim();
      const ownerEmail = normalizeEmail(appointment.ownerEmail || appointment.patientEmail);

      if (currentUid && ownerUid) {
        return currentUid === ownerUid;
      }

      if (currentEmail && ownerEmail) {
        return currentEmail === ownerEmail;
      }

      return false;
    });

    return mine.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  };

  const getStatusMeta = (status) => {
    if (status === 'cancelled') {
      return {
        label: 'Cancelled',
        className: 'appointment-status-chip--cancelled',
      };
    }

    if (status === 'completed') {
      return {
        label: 'Completed',
        className: 'appointment-status-chip--completed',
      };
    }

    return {
      label: 'Upcoming',
      className: 'appointment-status-chip--upcoming',
    };
  };

  const renderStats = (appointments) => {
    const total = appointments.length;
    const cancelled = appointments.filter((item) => item.status === 'cancelled').length;
    const upcoming = appointments.filter((item) => (item.status || 'upcoming') === 'upcoming').length;

    if (statTotal) statTotal.textContent = String(total);
    if (statCancelled) statCancelled.textContent = String(cancelled);
    if (statUpcoming) statUpcoming.textContent = String(upcoming);
  };

  const renderAppointments = () => {
    if (!appointmentsList || !appointmentsEmpty) {
      return;
    }

    const appointments = getUserAppointments();
    renderStats(appointments);

    if (appointments.length === 0) {
      appointmentsList.innerHTML = '';
      appointmentsEmpty.classList.remove('hidden');
      return;
    }

    appointmentsEmpty.classList.add('hidden');

    appointmentsList.innerHTML = appointments.map((appointment) => {
      const status = String(appointment.status || 'upcoming').toLowerCase();
      const statusMeta = getStatusMeta(status);
      const canCancel = status === 'upcoming';

      return `
<article class="profile-appointment-card glass-panel rounded-2xl p-5 border border-primary/15" data-appointment-id="${escapeHtml(appointment.id)}">
  <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
    <div class="min-w-0">
      <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">${escapeHtml(appointment.dateLabel || 'Date TBD')}</p>
      <h4 class="text-xl font-bold text-white">${escapeHtml(appointment.serviceName || 'Therapy Session')}</h4>
      <p class="text-slate-400 mt-1">${escapeHtml(appointment.timeLabel || 'Time TBD')} • ${escapeHtml(appointment.servicePrice || '')}</p>
    </div>
    <span class="appointment-status-chip ${statusMeta.className}">${statusMeta.label}</span>
  </div>

  <div class="grid sm:grid-cols-2 gap-3 mt-5 text-sm">
    <p class="text-slate-300"><span class="text-slate-500">Patient:</span> ${escapeHtml(appointment.patientName || currentName)}</p>
    <p class="text-slate-300"><span class="text-slate-500">Email:</span> ${escapeHtml(appointment.patientEmail || profile.email || '')}</p>
    <p class="text-slate-300"><span class="text-slate-500">Phone:</span> ${escapeHtml(appointment.patientPhone || '-')}</p>
    <p class="text-slate-300"><span class="text-slate-500">Specialist:</span> ${escapeHtml(appointment.specialist || 'No Preference')}</p>
  </div>

  ${appointment.injuryDetails ? `<p class="text-slate-400 text-sm mt-4 leading-relaxed">${escapeHtml(appointment.injuryDetails)}</p>` : ''}

  <div class="flex flex-wrap items-center justify-between gap-3 mt-5">
    <p class="text-slate-500 text-xs">Booked: ${formatDateTime(appointment.createdAt)}</p>
    ${canCancel
      ? `<button class="profile-cancel-btn" type="button" data-cancel-appointment="${escapeHtml(appointment.id)}">Cancel Appointment</button>`
      : `<span class="text-slate-500 text-xs">${status === 'cancelled' ? `Cancelled: ${formatDateTime(appointment.cancelledAt || appointment.updatedAt)}` : ''}</span>`}
  </div>
</article>`;
    }).join('');
  };

  appointmentsList?.addEventListener('click', (event) => {
    const button = event.target instanceof HTMLElement
      ? event.target.closest('[data-cancel-appointment]')
      : null;

    if (!(button instanceof HTMLElement)) {
      return;
    }

    const appointmentId = button.dataset.cancelAppointment;
    if (!appointmentId) {
      return;
    }

    const wantsToCancel = window.confirm('Cancel this appointment?');
    if (!wantsToCancel) {
      return;
    }

    const all = readJson(appointmentsStorageKey, []);
    const safeArray = Array.isArray(all) ? all : [];

    const next = safeArray.map((appointment) => {
      if (!appointment || typeof appointment !== 'object') {
        return appointment;
      }

      if (String(appointment.id || '') !== appointmentId) {
        return appointment;
      }

      const ownerUid = String(appointment.ownerUid || '').trim();
      const ownerEmail = normalizeEmail(appointment.ownerEmail || appointment.patientEmail);
      const isOwner = (currentUid && ownerUid && ownerUid === currentUid)
        || (currentEmail && ownerEmail && ownerEmail === currentEmail);

      if (!isOwner) {
        return appointment;
      }

      return {
        ...appointment,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      };
    });

    writeJson(appointmentsStorageKey, next);
    renderAppointments();
  });

  renderAppointments();
});
