import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const authSalt = import.meta.env.VITE_AUTH_SALT || 'studyhub_auth_salt_semester3_secure';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[StudyHub] Supabase credentials not configured in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Please set up your .env file.'
  );
}

// Create Supabase client with persistent local session storage
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);

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
  // Allow letters, digits, underscores, hyphens, and periods
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
 * Users never see or interact with this email.
 * @param {string} normalizedUsername
 * @returns {string}
 */
export function deriveInternalEmail(normalizedUsername) {
  return `user_${normalizedUsername}@studyhub.internal`;
}

/**
 * Derives a strong, deterministic secret key for passwordless username authentication
 * using Web Crypto SHA-256. This enables genuine Supabase JWT sessions & RLS without
 * requiring the user to memorize or enter a password.
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
 * Works with both Supabase session and dev fallback.
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured) {
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

