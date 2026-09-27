import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  supabase,
  getSupabaseConfig,
  getActiveWorkspace,
  setActiveWorkspace,
  normalizeUsername,
  validateUsername,
} from '../storage/supabaseClient';

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
   * Create a new StudyHub workspace for a new username.
   * Fails if username already exists.
   * @param {string} rawUsername
   */
  const createWorkspace = async (rawUsername) => {
    setError(null);
    const validation = validateUsername(rawUsername);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const normalized = normalizeUsername(rawUsername);
    const trimmed = rawUsername.trim();
    const { isConfigured } = getSupabaseConfig();

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
      setActiveWorkspace(newWs);
      setWorkspace(newWs);
      return newWs;
    }

    // Remote Supabase Cloud Persistence
    // Check if workspace already exists
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

    // Workspace does not exist -> Create new workspace
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

    setActiveWorkspace(created);
    setWorkspace(created);
    return created;
  };

  /**
   * Log into an existing StudyHub workspace by username.
   * Fails if username does not exist.
   * @param {string} rawUsername
   */
  const loginWorkspace = async (rawUsername) => {
    setError(null);
    const validation = validateUsername(rawUsername);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const normalized = normalizeUsername(rawUsername);
    const { isConfigured } = getSupabaseConfig();

    if (!isConfigured) {
      // Local demo mode fallback
      const localWorkspaces = JSON.parse(localStorage.getItem('studyhub_local_workspaces') || '[]');
      const found = localWorkspaces.find((w) => w.username_normalized === normalized);
      if (!found) {
        throw new Error('Username not found.');
      }
      setActiveWorkspace(found);
      setWorkspace(found);
      return found;
    }

    // Remote Supabase Cloud Persistence
    const { data: existing, error: selectError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('username_normalized', normalized)
      .maybeSingle();

    if (selectError) {
      console.error('[StudyHub] Error querying workspace:', selectError);
      throw new Error(`Cloud connection error: ${selectError.message}`);
    }

    if (!existing) {
      throw new Error('Username not found.');
    }

    // Update last_active_at timestamp without modifying existing study data
    try {
      await supabase
        .from('workspaces')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', existing.id);
    } catch (e) {
      // Non-blocking update failure
    }

    setActiveWorkspace(existing);
    setWorkspace(existing);
    return existing;
  };

  /**
   * Legacy enter helper for backward compatibility
   */
  const enterWorkspace = async (rawUsername) => {
    try {
      return await loginWorkspace(rawUsername);
    } catch (err) {
      if (err.message === 'Username not found.') {
        return await createWorkspace(rawUsername);
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
    createWorkspace,
    loginWorkspace,
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
