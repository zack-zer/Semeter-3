import { createClient } from '@supabase/supabase-js';

const safeEnv = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env
  : (typeof process !== 'undefined' && process.env ? process.env : {});

const WORKSPACE_STORAGE_KEY = 'studyhub_active_workspace';

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
    source,
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
      'placeholder-anon-key'
    );
    return activeClient;
  }

  activeClient = createClient(url, anonKey);
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
 * Normalizes a username for case-insensitive uniqueness and consistency.
 * Example: " Zackk " -> "zackk"
 * @param {string} username
 * @returns {string}
 */
export function normalizeUsername(username) {
  if (!username) return '';
  return username.trim().toLowerCase();
}

/**
 * Validates a username:
 * - 3 to 30 characters
 * - Letters, numbers, underscores, and hyphens only
 * - No spaces
 * @param {string} username
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Please enter a username.' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters.' };
  }
  if (trimmed.length > 30) {
    return { valid: false, error: 'Username must not exceed 30 characters.' };
  }
  if (/\s/.test(trimmed)) {
    return { valid: false, error: 'Username cannot contain spaces.' };
  }
  // Allow letters, digits, underscores, and hyphens
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, underscores (_), and hyphens (-).',
    };
  }
  return { valid: true };
}

/**
 * Retrieves the currently active workspace from local storage.
 */
export function getActiveWorkspace() {
  try {
    const storage = getSafeStorage();
    const raw = storage.getItem(WORKSPACE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Sets the active workspace in local storage.
 */
export function setActiveWorkspace(workspace) {
  try {
    const storage = getSafeStorage();
    if (workspace) {
      storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    } else {
      storage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Convenience helper to get current workspace or null
 */
export async function getCurrentUser() {
  const ws = getActiveWorkspace();
  if (!ws) return null;
  return {
    id: ws.id,
    workspace_id: ws.id,
    username: ws.username,
    username_normalized: ws.username_normalized,
  };
}
