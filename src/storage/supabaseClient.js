import { createClient } from '@supabase/supabase-js';

const safeEnv = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env
  : (typeof process !== 'undefined' && process.env ? process.env : {});

const authSalt = safeEnv.VITE_AUTH_SALT || 'studyhub_auth_salt_semester3_secure';

function getSafeStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

/**
 * Returns current configuration values and status
 */
export function getSupabaseConfig() {
  const envUrl = (safeEnv.VITE_SUPABASE_URL || '').trim();
  const envKey = (safeEnv.VITE_SUPABASE_ANON_KEY || '').trim();

  let localUrl = '';
  let localKey = '';
  try {
    const storage = getSafeStorage();
    localUrl = (storage.getItem('studyhub_custom_supabase_url') || '').trim();
    localKey = (storage.getItem('studyhub_custom_supabase_anon_key') || '').trim();
  } catch (e) {
    // ignore in environments without localStorage
  }


  const isEnvValid = Boolean(
    envUrl &&
    envKey &&
    envUrl.startsWith('https://') &&
    !envUrl.includes('your-project-id') &&
    !envUrl.includes('placeholder')
  );

  const isLocalValid = Boolean(
    localUrl &&
    localKey &&
    localUrl.startsWith('https://') &&
    !localUrl.includes('placeholder')
  );

  let activeUrl = '';
  let activeKey = '';
  let source = 'none';

  if (isEnvValid) {
    activeUrl = envUrl;
    activeKey = envKey;
    source = 'environment';
  } else if (isLocalValid) {
    activeUrl = localUrl;
    activeKey = localKey;
    source = 'manual';
  }

  const isConfigured = Boolean(activeUrl && activeKey);

  return {
    url: activeUrl,
    anonKey: activeKey,
    isConfigured,
    source, // 'environment' | 'manual' | 'none'
  };
}

let activeClient = null;

export let isSupabaseConfigured = false;

function buildClient() {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  isSupabaseConfigured = isConfigured;

  if (!isConfigured) {
    activeClient = createClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: getSafeStorage(),
        },
      }
    );
    return activeClient;
  }

  activeClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: getSafeStorage(),
    },
  });

  return activeClient;
}

// Initialize active client
buildClient();

/**
 * Proxy object for supabase export to always direct calls to current client instance
 */
export const supabase = new Proxy({}, {
  get(_target, prop) {
    if (!activeClient) buildClient();
    const val = activeClient[prop];
    return typeof val === 'function' ? val.bind(activeClient) : val;
  }
});


/**
 * Saves custom Supabase configuration to localStorage (useful for instant testing or when Vercel envs are not yet rebuilt)
 */
export function saveCustomSupabaseConfig(rawUrl, rawKey) {
  const url = (rawUrl || '').trim();
  const anonKey = (rawKey || '').trim();

  if (!url || !anonKey) {
    throw new Error('Both Supabase URL and Anon Key are required.');
  }

  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    throw new Error('Supabase URL must start with https:// and end with .supabase.co');
  }

  localStorage.setItem('studyhub_custom_supabase_url', url);
  localStorage.setItem('studyhub_custom_supabase_anon_key', anonKey);

  buildClient();
  return { success: true };
}

/**
 * Clears custom Supabase configuration from localStorage
 */
export function clearCustomSupabaseConfig() {
  localStorage.removeItem('studyhub_custom_supabase_url');
  localStorage.removeItem('studyhub_custom_supabase_anon_key');
  buildClient();
}

/**
 * Normalizes a username for case-insensitive uniqueness and consistency.
 * Example: " Zakaria " -> "zakaria"
 * @param {string} username
 * @returns {string}
 */
export function normalizeUsername(username) {
  if (!username) return '';
  return username.trim().toLowerCase();
}

/**
 * Validates a username against allowed rules:
 * - 2 to 30 characters
 * - Alphanumeric, underscores, hyphens, and dots
 * @param {string} username
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required.' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Username must be at least 2 characters.' };
  }
  if (trimmed.length > 30) {
    return { valid: false, error: 'Username must not exceed 30 characters.' };
  }
  const validPattern = /^[a-zA-Z0-9_.-]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, underscores (_), hyphens (-), and dots (.)',
    };
  }
  return { valid: true };
}

/**
 * Derives an internal email address from normalized username.
 * @param {string} normalizedUsername
 * @returns {string}
 */
export function deriveInternalEmail(normalizedUsername) {
  return `user_${normalizedUsername}@studyhub.internal`;
}

/**
 * Derives a strong, deterministic secret key for passwordless username authentication
 * using Web Crypto SHA-256.
 * @param {string} normalizedUsername
 * @returns {Promise<string>}
 */
export async function deriveUserSecret(normalizedUsername) {
  const secretSource = `${authSalt}:${normalizedUsername}:studyhub_credential_v1`;
  const encoder = new TextEncoder();
  const data = encoder.encode(secretSource);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `Sh3#${hexHash}!`;
}

/**
 * Retrieves the currently active user, or null if unauthenticated.
 */
export async function getCurrentUser() {
  const { isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    const localUser = localStorage.getItem('studyhub_dev_user');
    if (localUser) {
      try {
        return JSON.parse(localUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (err) {
    console.error('[StudyHub] Error getting current user:', err);
    return null;
  }
}
