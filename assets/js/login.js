import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  GoogleAuthProvider,
  OAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

const statusEl = document.getElementById('auth-status');
const providerButtonsWrap = document.getElementById('auth-provider-buttons');
const providerButtons = Array.from(document.querySelectorAll('[data-provider]'));
const signedInPanel = document.getElementById('signed-in-panel');
const signedInName = document.getElementById('signed-in-name');
const signedInEmail = document.getElementById('signed-in-email');
const signedInAvatar = document.getElementById('signed-in-avatar');
const signOutBtn = document.getElementById('sign-out-btn');
const emailAuthWrap = document.getElementById('email-auth-wrap');
const emailAuthForm = document.getElementById('email-auth-form');
const emailAuthNameWrap = document.getElementById('email-auth-name-wrap');
const emailAuthName = document.getElementById('email-auth-name');
const emailAuthEmail = document.getElementById('email-auth-email');
const emailAuthPassword = document.getElementById('email-auth-password');
const emailAuthSubmit = document.getElementById('email-auth-submit');
const emailAuthModeCopy = document.getElementById('email-auth-mode-copy');
const emailAuthModeButtons = Array.from(document.querySelectorAll('[data-email-auth-mode]'));
const emailResetBtn = document.getElementById('email-reset-btn');
const userStorageKey = 'pt-clinic-user-profile';
let emailAuthMode = 'signin';

const nextParam = new URLSearchParams(window.location.search).get('next');
const continueHref = (typeof nextParam === 'string' && /^\.?\/?[a-zA-Z0-9/_#?&=.-]*$/.test(nextParam) && !nextParam.startsWith('//'))
  ? nextParam
  : './booking.html';

const continueLink = signedInPanel?.querySelector('a[href="./booking.html"]');
if (continueLink) {
  continueLink.setAttribute('href', continueHref);
}

const anchorToStatus = () => {
  if (!statusEl) return;
  statusEl.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
  });
  if (!statusEl.hasAttribute('tabindex')) {
    statusEl.setAttribute('tabindex', '-1');
  }
  statusEl.focus({ preventScroll: true });
};

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

  if (tone === 'error') {
    requestAnimationFrame(anchorToStatus);
  }
};

const setButtonsDisabled = (disabled) => {
  providerButtons.forEach((button) => {
    button.disabled = disabled;
    button.classList.toggle('is-loading', disabled);
  });
};

const setEmailAuthMode = (mode) => {
  emailAuthMode = mode === 'signup' ? 'signup' : 'signin';

  const isSignUp = emailAuthMode === 'signup';
  if (emailAuthNameWrap) {
    emailAuthNameWrap.classList.toggle('hidden', !isSignUp);
  }
  if (emailAuthSubmit) {
    emailAuthSubmit.querySelector('span').textContent = isSignUp
      ? 'Create Account with Email'
      : 'Sign In with Email';
  }
  if (emailAuthModeCopy) {
    emailAuthModeCopy.textContent = isSignUp
      ? 'Create a new patient account with your email.'
      : 'Sign in with your clinic email and password.';
  }
  if (emailAuthPassword) {
    emailAuthPassword.autocomplete = isSignUp ? 'new-password' : 'current-password';
  }

  emailAuthModeButtons.forEach((button) => {
    const isActive = button.dataset.emailAuthMode === emailAuthMode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
};

const setEmailControlsDisabled = (disabled) => {
  if (emailAuthForm) {
    Array.from(emailAuthForm.elements).forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      element.toggleAttribute('disabled', disabled);
    });
  }
  if (emailResetBtn) {
    emailResetBtn.disabled = disabled;
  }
};

const setAuthControlsDisabled = (disabled) => {
  setButtonsDisabled(disabled);
  setEmailControlsDisabled(disabled);
};

const getEmailAuthErrorMessage = (errorCode, mode) => {
  if (errorCode === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (errorCode === 'auth/missing-password') {
    return 'Please enter your password.';
  }
  if (errorCode === 'auth/weak-password') {
    return 'Password must be at least 6 characters.';
  }
  if (errorCode === 'auth/email-already-in-use') {
    return 'This email is already registered. Switch to Sign In.';
  }
  if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
    return 'Invalid email or password.';
  }
  if (errorCode === 'auth/too-many-requests') {
    return 'Too many attempts. Please try again in a few minutes.';
  }
  if (errorCode === 'auth/network-request-failed') {
    return 'Network error. Check your connection and retry.';
  }
  return mode === 'signup'
    ? 'Unable to create account. Please retry.'
    : 'Unable to sign in with email. Please retry.';
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

const buildLocalProfileFromFirebaseUser = (user, providerName = 'unknown') => ({
  fullName: user?.displayName || user?.email || 'PT Clinic Patient',
  email: user?.email || '',
  avatarUrl: user?.photoURL || '',
  firebaseUid: user?.uid || '',
  provider: providerName,
  providers: Array.isArray(user?.providerData)
    ? user.providerData
      .map((item) => item?.providerId)
      .filter((item) => typeof item === 'string' && item.length > 0)
    : [],
});

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

const getProviderAuthErrorMessage = (providerName, errorCode) => {
  const label = authLabel[providerName] || 'Provider';
  const codeSuffix = errorCode ? ` (${errorCode})` : '';

  if (errorCode === 'auth/operation-not-allowed') {
    return `${label} sign-in is disabled in Firebase Authentication.${codeSuffix}`;
  }
  if (errorCode === 'auth/unauthorized-domain') {
    return `This domain is not authorized for ${label}. Add ${window.location.hostname} in Firebase Auth > Settings > Authorized domains.${codeSuffix}`;
  }
  if (errorCode === 'auth/invalid-app-credential' || errorCode === 'auth/invalid-credential') {
    return `${label} provider credentials are invalid. Check provider setup in Firebase console.${codeSuffix}`;
  }
  if (errorCode === 'auth/account-exists-with-different-credential') {
    return `This email already exists with another sign-in method.${codeSuffix}`;
  }
  if (errorCode === 'auth/network-request-failed') {
    return `Network error while contacting auth provider. Please retry.${codeSuffix}`;
  }
  if (errorCode === 'auth/internal-error') {
    return `${label} sign-in failed due to an internal auth error. Retry in a few seconds.${codeSuffix}`;
  }

  return `Could not sign in with ${label}. Check provider setup in Firebase console.${codeSuffix}`;
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
  emailAuthWrap?.classList.add('hidden');
};

const renderSignedOutState = () => {
  signedInPanel?.classList.add('hidden');
  providerButtonsWrap?.classList.remove('hidden');
  emailAuthWrap?.classList.remove('hidden');
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
  setEmailAuthMode('signin');

  setStatus('Loading secure sign-in...', 'muted');

  let firebaseConfig;
  try {
    firebaseConfig = await fetchFirebaseConfig();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Unable to initialize auth.', 'error');
    setAuthControlsDisabled(true);
    return;
  }

  if (!String(firebaseConfig.apiKey || '').startsWith('AIza')) {
    setStatus('Firebase API key format is invalid. Update FIREBASE_API_KEY on Vercel and redeploy.', 'error');
    setAuthControlsDisabled(true);
    return;
  }

  let app;
  let auth;
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch {
    setStatus('Firebase configuration is invalid. Check Vercel env vars and redeploy.', 'error');
    setAuthControlsDisabled(true);
    return;
  }

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
        provider: payload?.user?.provider || providerName || 'unknown',
        providers: payload?.user?.providers || [],
      });
      setStatus(`Signed in as ${fullName}.`, 'success');
    } catch (error) {
      const fallbackProvider = providerName || resolveProvider(user);
      persistUserProfile(buildLocalProfileFromFirebaseUser(user, fallbackProvider));
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

    const resolvedProvider = resolveProvider(user);
    persistUserProfile(buildLocalProfileFromFirebaseUser(user, resolvedProvider));
    renderSignedInState(user);
    await ensureSynced(user, resolvedProvider);
  });

  signOutBtn?.addEventListener('click', async () => {
    setAuthControlsDisabled(true);
    try {
      await signOut(auth);
      renderSignedOutState();
      setStatus('Signed out successfully.', 'muted');
      window.setTimeout(() => {
        window.location.reload();
      }, 120);
    } catch {
      setStatus('Could not sign out. Please retry.', 'error');
    } finally {
      setAuthControlsDisabled(false);
    }
  });

  providerButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const providerName = button.dataset.provider;
      if (!providerName) return;

      const label = authLabel[providerName] || 'provider';
      setStatus(`Opening ${label} sign-in...`, 'muted');
      setAuthControlsDisabled(true);

      try {
        const provider = buildProvider(providerName);
        const result = await signInWithPopup(auth, provider);
        persistUserProfile(buildLocalProfileFromFirebaseUser(result.user, providerName));
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
          setStatus(getProviderAuthErrorMessage(providerName, code), 'error');
        }
      } finally {
        setAuthControlsDisabled(false);
      }
    });
  });

  emailAuthModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setEmailAuthMode(button.dataset.emailAuthMode || 'signin');
    });
  });

  emailAuthForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = (emailAuthEmail?.value || '').trim().toLowerCase();
    const password = emailAuthPassword?.value || '';
    const fullName = (emailAuthName?.value || '').trim();
    const isSignUp = emailAuthMode === 'signup';

    if (!email) {
      setStatus('Please enter your email address.', 'error');
      return;
    }
    if (!password || password.length < 6) {
      setStatus('Password must be at least 6 characters.', 'error');
      return;
    }
    if (isSignUp && !fullName) {
      setStatus('Please enter your full name.', 'error');
      return;
    }

    setStatus(isSignUp ? 'Creating your account...' : 'Signing you in...', 'muted');
    setAuthControlsDisabled(true);

    try {
      let credential;
      if (isSignUp) {
        credential = await createUserWithEmailAndPassword(auth, email, password);
        if (fullName) {
          await updateProfile(credential.user, { displayName: fullName });
        }
        await credential.user.reload();
      } else {
        credential = await signInWithEmailAndPassword(auth, email, password);
      }

      const activeUser = auth.currentUser || credential.user;
      persistUserProfile(buildLocalProfileFromFirebaseUser(activeUser, 'password'));
      renderSignedInState(activeUser);
      await ensureSynced(activeUser, 'password');
      if (emailAuthPassword) {
        emailAuthPassword.value = '';
      }
      setStatus(isSignUp ? 'Account created and signed in successfully.' : 'Signed in successfully.', 'success');
    } catch (error) {
      const errorCode = typeof error?.code === 'string' ? error.code : '';
      setStatus(getEmailAuthErrorMessage(errorCode, isSignUp ? 'signup' : 'signin'), 'error');
    } finally {
      setAuthControlsDisabled(false);
    }
  });

  emailResetBtn?.addEventListener('click', async () => {
    const email = (emailAuthEmail?.value || '').trim().toLowerCase();
    if (!email) {
      setStatus('Enter your email first, then click reset password.', 'muted');
      return;
    }

    setStatus('Sending password reset email...', 'muted');
    setAuthControlsDisabled(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setStatus('Password reset email sent. Check your inbox.', 'success');
    } catch (error) {
      const errorCode = typeof error?.code === 'string' ? error.code : '';
      setStatus(getEmailAuthErrorMessage(errorCode, 'signin'), 'error');
    } finally {
      setAuthControlsDisabled(false);
    }
  });

  setStatus('Choose a provider or sign in with email.', 'info');

  void (async () => {
    try {
      const redirectResult = await getRedirectResult(auth);
      if (!redirectResult?.user) return;

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

      persistUserProfile(buildLocalProfileFromFirebaseUser(redirectResult.user, providerName));
      renderSignedInState(redirectResult.user);
      await ensureSynced(redirectResult.user, providerName);
    } catch {
      setStatus('Provider redirect could not be completed. Try again.', 'error');
    }
  })();
};

void start();
