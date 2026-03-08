import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  GoogleAuthProvider,
  OAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

const statusEl = document.getElementById('auth-status');
const providerButtonsWrap = document.getElementById('auth-provider-buttons');
const providerButtons = Array.from(document.querySelectorAll('[data-provider]'));
const signedInPanel = document.getElementById('signed-in-panel');
const signedInName = document.getElementById('signed-in-name');
const signedInEmail = document.getElementById('signed-in-email');
const signedInAvatar = document.getElementById('signed-in-avatar');
const signOutBtn = document.getElementById('sign-out-btn');
const userStorageKey = 'pt-clinic-user-profile';

const nextParam = new URLSearchParams(window.location.search).get('next');
const continueHref = (typeof nextParam === 'string' && /^\.?\/?[a-zA-Z0-9/_#?&=.-]*$/.test(nextParam) && !nextParam.startsWith('//'))
  ? nextParam
  : './booking.html';

const continueLink = signedInPanel?.querySelector('a[href="./booking.html"]');
if (continueLink) {
  continueLink.setAttribute('href', continueHref);
}

const setStatus = (message, tone = 'info') => {
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.classList.remove('is-error', 'is-success', 'is-muted');
  if (tone === 'error') {
    statusEl.classList.add('is-error');
  } else if (tone === 'success') {
    statusEl.classList.add('is-success');
  } else if (tone === 'muted') {
    statusEl.classList.add('is-muted');
  }
};

const setButtonsDisabled = (disabled) => {
  providerButtons.forEach((button) => {
    button.disabled = disabled;
    button.classList.toggle('is-loading', disabled);
  });
};

const persistUserProfile = (profile) => {
  try {
    localStorage.setItem(userStorageKey, JSON.stringify(profile));
  } catch {
    // Ignore storage issues in restricted browser contexts.
  }
};

const clearPersistedProfile = () => {
  try {
    localStorage.removeItem(userStorageKey);
  } catch {
    // Ignore storage issues in restricted browser contexts.
  }
};

const buildProvider = (providerName) => {
  if (providerName === 'google') {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    return provider;
  }

  if (providerName === 'microsoft') {
    const provider = new OAuthProvider('microsoft.com');
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    return provider;
  }

  if (providerName === 'apple') {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return provider;
  }

  throw new Error('Unknown auth provider.');
};

const authLabel = {
  google: 'Google',
  microsoft: 'Outlook',
  apple: 'Apple',
};

const resolveProvider = (user, requestedProvider) => {
  if (requestedProvider) return requestedProvider;

  const first = user?.providerData?.[0]?.providerId;
  if (first === 'google.com') return 'google';
  if (first === 'microsoft.com') return 'microsoft';
  if (first === 'apple.com') return 'apple';

  return 'password';
};

const syncUserToBackend = async (user, providerName) => {
  const token = await user.getIdToken(true);
  const response = await fetch('/api/auth/sync-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ provider: providerName }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = typeof payload?.error === 'string'
      ? payload.error
      : 'Unable to sync your account with database.';
    throw new Error(errorMessage);
  }

  return payload;
};

const renderSignedInState = (user) => {
  if (!signedInPanel) return;

  if (signedInName) {
    signedInName.textContent = user.displayName || 'PT Clinic Patient';
  }
  if (signedInEmail) {
    signedInEmail.textContent = user.email || 'No e-mail provided';
  }
  if (signedInAvatar) {
    signedInAvatar.src = user.photoURL || './assets/images/team-alex.webp';
  }

  signedInPanel.classList.remove('hidden');
  providerButtonsWrap?.classList.add('hidden');
};

const renderSignedOutState = () => {
  signedInPanel?.classList.add('hidden');
  providerButtonsWrap?.classList.remove('hidden');
};

const fetchFirebaseConfig = async () => {
  const response = await fetch('/api/auth/config');
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to load Firebase config.');
  }

  if (!payload?.enabled) {
    throw new Error('Firebase environment variables are missing on Vercel.');
  }

  return payload.firebaseConfig;
};

const start = async () => {
  setStatus('Loading secure sign-in...', 'muted');

  let firebaseConfig;
  try {
    firebaseConfig = await fetchFirebaseConfig();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Unable to initialize auth.', 'error');
    setButtonsDisabled(true);
    return;
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Persistence can fail in strict privacy contexts; continue with session fallback.
  }

  let syncingUser = false;

  const ensureSynced = async (user, providerName) => {
    if (syncingUser) return;
    syncingUser = true;

    try {
      const payload = await syncUserToBackend(user, providerName);
      const fullName = payload?.user?.fullName || user.displayName || 'PT Clinic Patient';
      persistUserProfile({
        fullName,
        email: payload?.user?.email || user.email || '',
        avatarUrl: payload?.user?.avatarUrl || user.photoURL || '',
        firebaseUid: payload?.user?.firebaseUid || user.uid,
      });
      setStatus(`Signed in as ${fullName}.`, 'success');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Database sync failed.', 'error');
    } finally {
      syncingUser = false;
    }
  };

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      renderSignedOutState();
      clearPersistedProfile();
      setStatus('Ready to sign in.', 'info');
      return;
    }

    renderSignedInState(user);
    await ensureSynced(user, resolveProvider(user));
  });

  signOutBtn?.addEventListener('click', async () => {
    setButtonsDisabled(true);
    try {
      await signOut(auth);
      renderSignedOutState();
      setStatus('Signed out successfully.', 'muted');
    } catch {
      setStatus('Could not sign out. Please retry.', 'error');
    } finally {
      setButtonsDisabled(false);
    }
  });

  try {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      const providerName = resolveProvider(
        redirectResult.user,
        redirectResult.providerId === 'google.com'
          ? 'google'
          : redirectResult.providerId === 'microsoft.com'
            ? 'microsoft'
            : redirectResult.providerId === 'apple.com'
              ? 'apple'
              : undefined
      );

      renderSignedInState(redirectResult.user);
      await ensureSynced(redirectResult.user, providerName);
    }
  } catch {
    setStatus('Provider redirect could not be completed. Try again.', 'error');
  }

  providerButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const providerName = button.dataset.provider;
      if (!providerName) return;

      const label = authLabel[providerName] || 'provider';
      setStatus(`Opening ${label} sign-in...`, 'muted');
      setButtonsDisabled(true);

      try {
        const provider = buildProvider(providerName);
        const result = await signInWithPopup(auth, provider);
        renderSignedInState(result.user);
        await ensureSynced(result.user, providerName);
      } catch (error) {
        const code = typeof error?.code === 'string' ? error.code : '';

        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          try {
            const provider = buildProvider(providerName);
            await signInWithRedirect(auth, provider);
            return;
          } catch {
            setStatus(`Unable to open ${label} sign-in window.`, 'error');
          }
        } else if (code === 'auth/popup-closed-by-user') {
          setStatus('Sign-in popup was closed before completion.', 'muted');
        } else {
          setStatus(`Could not sign in with ${label}. Check provider setup in Firebase console.`, 'error');
        }
      } finally {
        setButtonsDisabled(false);
      }
    });
  });

  setStatus('Choose a provider to continue.', 'info');
};

void start();
