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
   * Enter StudyHub workspace with username only
   * Creates workspace if it doesn't exist, or opens it if it does
   * @param {string} rawUsername
   */
  const enterWorkspace = async (rawUsername) => {
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
      let found = localWorkspaces.find((w) => w.username_normalized === normalized);
      if (!found) {
        found = {
          id: `local-${normalized}`,
          username: trimmed,
          username_normalized: normalized,
          created_at: new Date().toISOString(),
        };
        localWorkspaces.push(found);
        localStorage.setItem('studyhub_local_workspaces', JSON.stringify(localWorkspaces));
      }
      setActiveWorkspace(found);
      setWorkspace(found);
      return found;
    }

    // Remote Supabase Cloud Persistence
    // 1. Check if workspace already exists
    const { data: existing, error: selectError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('username_normalized', normalized)
      .maybeSingle();

    if (selectError) {
      console.error('[StudyHub] Error querying workspace:', selectError);
      throw new Error(`Cloud connection error: ${selectError.message}`);
    }

    if (existing) {
      // Update last active timestamp
      await supabase
        .from('workspaces')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', existing.id);

      setActiveWorkspace(existing);
      setWorkspace(existing);
      return existing;
    }

    // 2. Workspace does not exist yet -> Claim & create it immediately
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
      console.error('[StudyHub] Error creating workspace:', insertError);
      throw new Error(`Failed to claim workspace: ${insertError.message}`);
    }

    setActiveWorkspace(created);
    setWorkspace(created);
    return created;
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
    enterWorkspace,
    signIn: enterWorkspace, // alias
    signUp: enterWorkspace, // alias
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
