const { Pool } = require('pg');
const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let pool;
let schemaReadyPromise;

const getPool = () => {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL environment variable.');
  }

  pool = new Pool({ connectionString });
  return pool;
};

const getFirebaseAuth = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials in environment variables.');
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  }

  return getAuth();
};

const ensureSchema = async () => {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  const db = getPool();
  schemaReadyPromise = (async () => {
    await db.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await db.query(`
      CREATE TABLE IF NOT EXISTS clinic_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firebase_uid TEXT UNIQUE NOT NULL,
        email TEXT,
        full_name TEXT,
        avatar_url TEXT,
        provider TEXT,
        providers TEXT[] NOT NULL DEFAULT '{}',
        last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS clinic_users_email_lower_idx
      ON clinic_users ((LOWER(email)))
      WHERE email IS NOT NULL;
    `);
  })();

  return schemaReadyPromise;
};

const readJsonBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (typeof req.body === 'object') {
    return req.body;
  }
  return {};
};

const normalizeProvider = (requestedProvider, claimProvider) => {
  const map = {
    google: 'google.com',
    'google.com': 'google.com',
    microsoft: 'microsoft.com',
    'microsoft.com': 'microsoft.com',
    apple: 'apple.com',
    'apple.com': 'apple.com',
  };

  if (requestedProvider && map[requestedProvider]) {
    return map[requestedProvider];
  }

  if (claimProvider && map[claimProvider]) {
    return map[claimProvider];
  }

  return claimProvider || requestedProvider || 'unknown';
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    await ensureSchema();

    const authorization = req.headers.authorization || req.headers.Authorization || '';
    const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

    if (!idToken) {
      return res.status(401).json({ error: 'Missing bearer token.' });
    }

    const body = readJsonBody(req);
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(idToken, true);

    const claimProvider = decodedToken?.firebase?.sign_in_provider;
    const provider = normalizeProvider(body.provider, claimProvider);

    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email || null;
    const fullName = decodedToken.name || body.fullName || null;
    const avatarUrl = decodedToken.picture || body.avatarUrl || null;

    const db = getPool();
    const { rows } = await db.query(
      `
        INSERT INTO clinic_users (
          firebase_uid,
          email,
          full_name,
          avatar_url,
          provider,
          providers,
          last_login_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, ARRAY[$5]::TEXT[], NOW(), NOW())
        ON CONFLICT (firebase_uid) DO UPDATE
          SET email = EXCLUDED.email,
              full_name = COALESCE(EXCLUDED.full_name, clinic_users.full_name),
              avatar_url = COALESCE(EXCLUDED.avatar_url, clinic_users.avatar_url),
              provider = COALESCE(EXCLUDED.provider, clinic_users.provider),
              providers = (
                SELECT ARRAY(
                  SELECT DISTINCT provider_item
                  FROM UNNEST(
                    COALESCE(clinic_users.providers, ARRAY[]::TEXT[])
                    || COALESCE(EXCLUDED.providers, ARRAY[]::TEXT[])
                  ) AS provider_item
                  WHERE provider_item IS NOT NULL AND provider_item <> ''
                )
              ),
              last_login_at = NOW(),
              updated_at = NOW()
        RETURNING id, firebase_uid, email, full_name, avatar_url, provider, providers, created_at, updated_at, last_login_at;
      `,
      [firebaseUid, email, fullName, avatarUrl, provider]
    );

    const user = rows[0];

    return res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        firebaseUid: user.firebase_uid,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        provider: user.provider,
        providers: user.providers,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error during user sync.';

    if (/Firebase token has invalid signature|Firebase ID token has expired|argument error/i.test(message)) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    return res.status(500).json({ error: message });
  }
};
