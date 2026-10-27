/**
 * StudyHub Authentication & Password Security Utilities
 *
 * Implements client-compatible password hashing using the standard Web Crypto API (PBKDF2-HMAC-SHA256).
 * No plain text passwords are ever stored or logged.
 */

import { supabase, getSupabaseConfig, getActiveWorkspace } from '../storage/supabaseClient.js';

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTE_LENGTH = 16;
const CREDENTIALS_BUCKET = 'study-files';
const CREDENTIALS_DIR = '_auth_credentials';

/**
 * Convert an ArrayBuffer or Uint8Array to a hex string
 */
export function bufToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Convert a hex string to a Uint8Array
 */
export function hexToBuf(hex) {
  if (!hex || hex.length % 2 !== 0) {
    return new Uint8Array(0);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Constant-time comparison of two strings to prevent timing side-channel attacks
 */
export function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Obtain a safe crypto implementation (Browser or Node)
 */
function getCrypto() {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API is not available in this environment.');
}

/**
 * Validates password rules:
 * - Minimum 6 characters
 * - Cannot be empty
 * @param {string} password
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Please enter a password.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must not exceed 128 characters.' };
  }
  return { valid: true };
}

/**
 * Hash a password using PBKDF2-HMAC-SHA256 with 100,000 iterations.
 * @param {string} password
 * @param {string|null} saltHex - Optional existing salt in hex. If not provided, a random 16-byte salt is generated.
 * @returns {Promise<{ hash: string, salt: string }>}
 */
export async function hashPassword(password, saltHex = null) {
  const c = getCrypto();
  const saltBytes = saltHex ? hexToBuf(saltHex) : c.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));

  const keyMaterial = await c.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await c.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return {
    hash: bufToHex(derivedBits),
    salt: bufToHex(saltBytes),
  };
}

/**
 * Verify a plain-text candidate password against a stored PBKDF2 hash and salt.
 * @param {string} candidatePassword
 * @param {string} storedHash
 * @param {string} storedSalt
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(candidatePassword, storedHash, storedSalt) {
  if (!candidatePassword || !storedHash || !storedSalt) return false;
  try {
    const { hash } = await hashPassword(candidatePassword, storedSalt);
    return constantTimeCompare(hash, storedHash);
  } catch (err) {
    console.error('[StudyHub] Error verifying password:', err);
    return false;
  }
}

/**
 * Helper to get local credential key
 */
function getLocalCredKey(workspaceId) {
  return `studyhub_cred_${workspaceId}`;
}

/**
 * Retrieve stored password credentials for a workspace.
 * Checks:
 * 1. Supabase workspaces row (if columns exist)
 * 2. Supabase storage bucket study-files (_auth_credentials/{workspaceId}.json)
 * 3. localStorage fallback
 *
 * @param {object} workspace - The workspace object (containing id, username_normalized, etc.)
 * @returns {Promise<{ hash: string, salt: string }|null>}
 */
export async function getWorkspaceCredentials(workspace) {
  if (!workspace || !workspace.id) return null;

  // 1. Check workspace object itself if it was populated with password_hash
  if (workspace.password_hash && workspace.password_salt) {
    return {
      hash: workspace.password_hash,
      salt: workspace.password_salt,
    };
  }

  const { isConfigured } = getSupabaseConfig();

  // 2. If Supabase is configured, check remote storage / table
  if (isConfigured) {
    // Check if remote table has password_hash
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('password_hash, password_salt')
        .eq('id', workspace.id)
        .maybeSingle();

      if (!error && data && data.password_hash && data.password_salt) {
        return {
          hash: data.password_hash,
          salt: data.password_salt,
        };
      }
    } catch (e) {
      // Column may not exist on table yet, fall through to storage bucket
    }

    // Check remote storage bucket file
    try {
      const credPath = `${CREDENTIALS_DIR}/${workspace.id}.json`;
      const { data, error } = await supabase.storage
        .from(CREDENTIALS_BUCKET)
        .download(credPath);

      if (!error && data) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (parsed.hash && parsed.salt) {
          // Cache in local storage for fast subsequent loads
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(getLocalCredKey(workspace.id), JSON.stringify(parsed));
            }
          } catch (_) {}
          return { hash: parsed.hash, salt: parsed.salt };
        }
      }
    } catch (e) {
      // Non-blocking, fall through to localStorage
    }
  }

  // 3. Fallback to localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem(getLocalCredKey(workspace.id));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.hash && parsed.salt) {
          return { hash: parsed.hash, salt: parsed.salt };
        }
      }

      // Also check local workspaces list
      const localWorkspaces = JSON.parse(window.localStorage.getItem('studyhub_local_workspaces') || '[]');
      const found = localWorkspaces.find((w) => w.id === workspace.id);
      if (found && found.password_hash && found.password_salt) {
        return { hash: found.password_hash, salt: found.password_salt };
      }
    }
  } catch (e) {
    // ignore
  }

  return null;
}

/**
 * Save password credentials for a workspace.
 * Writes to:
 * 1. Supabase workspaces row (if columns exist)
 * 2. Supabase storage bucket study-files (_auth_credentials/{workspaceId}.json)
 * 3. LocalStorage
 *
 * @param {object} workspace - The workspace object
 * @param {string} hash - The PBKDF2 hash
 * @param {string} salt - The salt
 * @returns {Promise<void>}
 */
export async function saveWorkspaceCredentials(workspace, hash, salt) {
  if (!workspace || !workspace.id) {
    throw new Error('Invalid workspace provided for credential storage.');
  }

  const { isConfigured } = getSupabaseConfig();
  const credPayload = {
    workspace_id: workspace.id,
    username_normalized: workspace.username_normalized,
    hash,
    salt,
    updated_at: new Date().toISOString(),
  };

  // 1. Save to localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(getLocalCredKey(workspace.id), JSON.stringify(credPayload));

      // Also update local workspaces list if present
      const localWorkspaces = JSON.parse(window.localStorage.getItem('studyhub_local_workspaces') || '[]');
      const idx = localWorkspaces.findIndex((w) => w.id === workspace.id);
      if (idx !== -1) {
        localWorkspaces[idx].password_hash = hash;
        localWorkspaces[idx].password_salt = salt;
        window.localStorage.setItem('studyhub_local_workspaces', JSON.stringify(localWorkspaces));
      }
    }
  } catch (e) {
    console.warn('[StudyHub] LocalStorage credential write notice:', e);
  }

  // 2. Save remotely if Supabase is configured
  if (isConfigured) {
    // Try updating workspaces table column if the column exists
    try {
      await supabase
        .from('workspaces')
        .update({ password_hash: hash, password_salt: salt })
        .eq('id', workspace.id);
    } catch (e) {
      // Column may not exist on table yet, safe to ignore
    }

    // Save to storage bucket for cross-device synchronization
    try {
      const credPath = `${CREDENTIALS_DIR}/${workspace.id}.json`;
      const blob = new Blob([JSON.stringify(credPayload)], { type: 'application/json' });
      const { error } = await supabase.storage
        .from(CREDENTIALS_BUCKET)
        .upload(credPath, blob, { upsert: true });

      if (error) {
        console.warn('[StudyHub] Note saving credentials to storage bucket:', error.message);
      }
    } catch (e) {
      console.warn('[StudyHub] Storage upload notice:', e);
    }
  }
}
