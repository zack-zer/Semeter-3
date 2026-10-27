import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  supabase,
  getSupabaseConfig,
  getActiveWorkspace,
  setActiveWorkspace,
  normalizeUsername,
  validateUsername,
} from '../storage/supabaseClient';
import {
  validatePassword,
  hashPassword,
  verifyPassword,
  getWorkspaceCredentials,
  saveWorkspaceCredentials,
} from '../utils/authSecurity';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      const active = getActiveWorkspace();
      if (!active) {
        if (mounted) setLoading(false);
        return;
      }

      const { isConfigured } = getSupabaseConfig();
      if (isConfigured && active?.username_normalized) {
        try {
          // Verify workspace exists remotely or sync latest record
          const { data } = await supabase
            .from('workspaces')
            .select('*')
            .eq('username_normalized', active.username_normalized)
            .maybeSingle();

          if (data && mounted) {
            setWorkspace(data);
            setActiveWorkspace(data);
          }
        } catch (err) {
          console.warn('[StudyHub] Note verifying workspace:', err);
        }
      }

      if (mounted) setLoading(false);
    }

    initSession();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Check whether an account exists and whether it already has a password set.
   * @param {string} rawUsername
   * @returns {Promise<{ exists: boolean, hasPassword: boolean, workspace: object|null }>}
   */
  const checkAccountStatus = async (rawUsername) => {
    setError(null);
    const validation = validateUsername(rawUsername);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const normalized = normalizeUsername(rawUsername);
    const { isConfigured } = getSupabaseConfig();

    let target = null;
    if (!isConfigured) {
      const localWorkspaces = JSON.parse(localStorage.getItem('studyhub_local_workspaces') || '[]');
      target = localWorkspaces.find((w) => w.username_normalized === normalized) || null;
    } else {
      const { data, error: selectError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('username_normalized', normalized)
        .maybeSingle();

      if (selectError) {
        console.error('[StudyHub] Error checking account status:', selectError);
        throw new Error(`Cloud connection error: ${selectError.message}`);
      }
      target = data;
    }

    if (!target) {
      return { exists: false, hasPassword: false, workspace: null };
    }

    const creds = await getWorkspaceCredentials(target);
    const hasPassword = Boolean(creds && creds.hash && creds.salt);

    return {
      exists: true,
      hasPassword,
      workspace: target,
    };
  };

  /**
   * Create a new StudyHub workspace for a new username and password.
   * Fails if username already exists.
   * @param {string} rawUsername
   * @param {string} rawPassword
   */
  const createWorkspace = async (rawUsername, rawPassword) => {
    setError(null);
    const userVal = validateUsername(rawUsername);
    if (!userVal.valid) {
      throw new Error(userVal.error);
    }

    const passVal = validatePassword(rawPassword);
    if (!passVal.valid) {
      throw new Error(passVal.error);
    }

    const normalized = normalizeUsername(rawUsername);
    const trimmed = rawUsername.trim();
    const { isConfigured } = getSupabaseConfig();

    // Hash password with PBKDF2
    const { hash, salt } = await hashPassword(rawPassword);

    if (!isConfigured) {
      // Local demo mode fallback
      const localWorkspaces = JSON.parse(localStorage.getItem('studyhub_local_workspaces') || '[]');
      const existing = localWorkspaces.find((w) => w.username_normalized === normalized);
      if (existing) {
        throw new Error('Username already exists.');
      }

      const newWs = {
        id: `local-${normalized}`,
        username: trimmed,
        username_normalized: normalized,
        created_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      };
      localWorkspaces.push(newWs);
      localStorage.setItem('studyhub_local_workspaces', JSON.stringify(localWorkspaces));
      await saveWorkspaceCredentials(newWs, hash, salt);
      setActiveWorkspace(newWs);
      setWorkspace(newWs);
      return newWs;
    }

    // Remote Supabase Cloud Persistence
    // 1. Check if workspace already exists
    const { data: existing, error: selectError } = await supabase
      .from('workspaces')
      .select('id, username')
      .eq('username_normalized', normalized)
      .maybeSingle();

    if (selectError) {
      console.error('[StudyHub] Error querying workspace:', selectError);
      throw new Error(`Cloud connection error: ${selectError.message}`);
    }

    if (existing) {
      throw new Error('Username already exists.');
    }

    // 2. Workspace does not exist -> Create new workspace
    const newRecord = {
      username: trimmed,
      username_normalized: normalized,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    };

    const { data: created, error: insertError } = await supabase
      .from('workspaces')
      .insert(newRecord)
      .select()
      .single();

    if (insertError) {
      if (
        insertError.code === '23505' ||
        insertError.message?.toLowerCase().includes('duplicate') ||
        insertError.message?.toLowerCase().includes('unique')
      ) {
        throw new Error('Username already exists.');
      }
      console.error('[StudyHub] Error creating workspace:', insertError);
      throw new Error(`Failed to create workspace: ${insertError.message}`);
    }

    // 3. Save password credentials securely
    await saveWorkspaceCredentials(created, hash, salt);

    setActiveWorkspace(created);
    setWorkspace(created);
    return created;
  };

  /**
   * Log into an existing StudyHub workspace by username and password.
   * If the account exists but does not have a password yet, throws an error with code 'NO_PASSWORD_SET'.
   * @param {string} rawUsername
   * @param {string} [rawPassword]
   */
  const loginWorkspace = async (rawUsername, rawPassword) => {
    setError(null);
    const userVal = validateUsername(rawUsername);
    if (!userVal.valid) {
      throw new Error(userVal.error);
    }

    const normalized = normalizeUsername(rawUsername);
    const { isConfigured } = getSupabaseConfig();

    let existing = null;
    if (!isConfigured) {
      // Local demo mode fallback
      const localWorkspaces = JSON.parse(localStorage.getItem('studyhub_local_workspaces') || '[]');
      existing = localWorkspaces.find((w) => w.username_normalized === normalized);
    } else {
      // Remote Supabase Cloud Persistence
      const { data, error: selectError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('username_normalized', normalized)
        .maybeSingle();

      if (selectError) {
        console.error('[StudyHub] Error querying workspace:', selectError);
        throw new Error(`Cloud connection error: ${selectError.message}`);
      }
      existing = data;
    }

    if (!existing) {
      throw new Error('Username not found.');
    }

    // Retrieve stored credentials for this account
    const creds = await getWorkspaceCredentials(existing);
    if (!creds || !creds.hash || !creds.salt) {
      // Existing account without password
      const err = new Error('This account does not have a password set yet. Please create a password to continue.');
      err.code = 'NO_PASSWORD_SET';
      err.workspace = existing;
      throw err;
    }

    // Account has a password: verify it
    if (!rawPassword) {
      throw new Error('Please enter your password.');
    }

    const isMatch = await verifyPassword(rawPassword, creds.hash, creds.salt);
    if (!isMatch) {
      throw new Error('Incorrect password. Please try again.');
    }

    // Update last_active_at timestamp without modifying existing study data
    if (isConfigured) {
      try {
        await supabase
          .from('workspaces')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', existing.id);
      } catch (e) {
        // Non-blocking update failure
      }
    }

    setActiveWorkspace(existing);
    setWorkspace(existing);
    return existing;
  };

  /**
   * Set a password for an existing account that has no password yet.
   * Preserves all documents, PDFs, subjects, notes, and the existing workspace ID.
   * @param {string} rawUsername
   * @param {string} newPassword
   */
  const setPasswordForExistingWorkspace = async (rawUsername, newPassword) => {
    setError(null);
    const userVal = validateUsername(rawUsername);
    if (!userVal.valid) {
      throw new Error(userVal.error);
    }

    const passVal = validatePassword(newPassword);
    if (!passVal.valid) {
      throw new Error(passVal.error);
    }

    const normalized = normalizeUsername(rawUsername);
    const { isConfigured } = getSupabaseConfig();

    let existing = null;
    if (!isConfigured) {
      const localWorkspaces = JSON.parse(localStorage.getItem('studyhub_local_workspaces') || '[]');
      existing = localWorkspaces.find((w) => w.username_normalized === normalized);
    } else {
      const { data, error: selectError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('username_normalized', normalized)
        .maybeSingle();

      if (selectError) {
        throw new Error(`Cloud connection error: ${selectError.message}`);
      }
      existing = data;
    }

    if (!existing) {
      throw new Error('Username not found.');
    }

    // Guard: Prevent overwriting if password already exists
    const currentCreds = await getWorkspaceCredentials(existing);
    if (currentCreds && currentCreds.hash && currentCreds.salt) {
      throw new Error('This account already has a password set. Please log in with your password.');
    }

    // Hash new password using PBKDF2
    const { hash, salt } = await hashPassword(newPassword);

    // Save credentials associated with existing workspace (does NOT touch workspace id or documents)
    await saveWorkspaceCredentials(existing, hash, salt);

    if (isConfigured) {
      try {
        await supabase
          .from('workspaces')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', existing.id);
      } catch (e) {
        // Non-blocking
      }
    }

    setActiveWorkspace(existing);
    setWorkspace(existing);
    return existing;
  };

  /**
   * Legacy enter helper for backward compatibility
   */
  const enterWorkspace = async (rawUsername, password) => {
    try {
      return await loginWorkspace(rawUsername, password);
    } catch (err) {
      if (err.message === 'Username not found.') {
        return await createWorkspace(rawUsername, password);
      }
      throw err;
    }
  };

  /**
   * Leave current workspace and return to username login
   */
  const signOut = () => {
    setActiveWorkspace(null);
    setWorkspace(null);
    setError(null);
  };

  const value = {
    workspace,
    user: workspace, // backwards compatibility
    profile: workspace,
    username: workspace?.username || '',
    loading,
    error,
    setError,
    checkAccountStatus,
    createWorkspace,
    loginWorkspace,
    setPasswordForExistingWorkspace,
    enterWorkspace,
    signIn: loginWorkspace,
    signUp: createWorkspace,
    signOut,
    isAuthenticated: Boolean(workspace),
    isConfigured: getSupabaseConfig().isConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
