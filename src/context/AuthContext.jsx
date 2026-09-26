import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  normalizeUsername,
  validateUsername,
  deriveInternalEmail,
  deriveUserSecret,
} from '../storage/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user profile from public.profiles table
  const fetchProfile = useCallback(async (userId) => {
    if (!userId || !isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[StudyHub] Error fetching profile:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[StudyHub] Unexpected error fetching profile:', err);
      return null;
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      if (!isSupabaseConfigured) {
        // Fallback for unconfigured dev environment
        const localUser = localStorage.getItem('studyhub_dev_user');
        if (localUser && mounted) {
          try {
            const parsed = JSON.parse(localUser);
            setUser({ id: parsed.id || 'dev-user-id' });
            setProfile(parsed);
          } catch (e) {
            localStorage.removeItem('studyhub_dev_user');
          }
        }
        if (mounted) setLoading(false);
        return;
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[StudyHub] Session retrieval error:', sessionError);
        }

        if (session?.user && mounted) {
          setUser(session.user);
          const prof = await fetchProfile(session.user.id);
          if (mounted) setProfile(prof);
        }
      } catch (err) {
        console.error('[StudyHub] Error initializing auth session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Listen to auth state changes (token refresh, sign out, sign in from other tabs)
    let authListener = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            const prof = await fetchProfile(session.user.id);
            if (mounted) setProfile(prof);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
      });
      authListener = data?.subscription;
    }

    return () => {
      mounted = false;
      if (authListener) authListener.unsubscribe();
    };
  }, [fetchProfile]);

  /**
   * Check if a normalized username is already taken.
   */
  const checkUsernameExists = async (normalizedUsername) => {
    if (!isSupabaseConfigured) {
      const localUsers = JSON.parse(localStorage.getItem('studyhub_dev_users') || '[]');
      return localUsers.some((u) => u.username_normalized === normalizedUsername);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username_normalized')
      .eq('username_normalized', normalizedUsername)
      .maybeSingle();

    if (error) {
      console.warn('[StudyHub] Note checking username:', error.message);
      return false;
    }
    return Boolean(data);
  };

  /**
   * Passwordless Sign In using username only
   * @param {string} rawUsername
   */
  const signIn = async (rawUsername) => {
    setError(null);
    const validation = validateUsername(rawUsername);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const normalized = normalizeUsername(rawUsername);

    if (!isSupabaseConfigured) {
      // Dev mode fallback
      const localUsers = JSON.parse(localStorage.getItem('studyhub_dev_users') || '[]');
      const found = localUsers.find((u) => u.username_normalized === normalized);
      if (!found) {
        throw new Error(`No account found with username "${rawUsername}". Please create an account first.`);
      }
      const fakeUser = { id: found.id };
      setUser(fakeUser);
      setProfile(found);
      localStorage.setItem('studyhub_dev_user', JSON.stringify(found));
      return { user: fakeUser, profile: found };
    }

    // 1. Verify that the profile exists
    const exists = await checkUsernameExists(normalized);
    if (!exists) {
      throw new Error(`No account found with username "${rawUsername}". Please create an account first.`);
    }

    // 2. Derive email and deterministic credential
    const email = deriveInternalEmail(normalized);
    const password = await deriveUserSecret(normalized);

    // 3. Authenticate with Supabase
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw new Error(signInError.message || 'Unable to sign in. Please verify your username.');
    }

    const authUser = data.user;
    setUser(authUser);

    // 4. Fetch the profile
    let prof = await fetchProfile(authUser.id);
    if (!prof) {
      // Re-create profile if missing
      const { data: newProf } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          username: rawUsername.trim(),
          username_normalized: normalized,
        })
        .select()
        .single();
      prof = newProf;
    }
    setProfile(prof);
    return { user: authUser, profile: prof };
  };

  /**
   * Passwordless Create Account using username only
   * @param {string} rawUsername
   */
  const signUp = async (rawUsername) => {
    setError(null);
    const validation = validateUsername(rawUsername);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const normalized = normalizeUsername(rawUsername);
    const trimmed = rawUsername.trim();

    if (!isSupabaseConfigured) {
      // Dev mode fallback
      const localUsers = JSON.parse(localStorage.getItem('studyhub_dev_users') || '[]');
      if (localUsers.some((u) => u.username_normalized === normalized)) {
        throw new Error(`Username "${trimmed}" is already taken. Please choose another username.`);
      }
      const newDevProf = {
        id: `dev-${Date.now()}`,
        username: trimmed,
        username_normalized: normalized,
        created_at: new Date().toISOString(),
      };
      localUsers.push(newDevProf);
      localStorage.setItem('studyhub_dev_users', JSON.stringify(localUsers));
      localStorage.setItem('studyhub_dev_user', JSON.stringify(newDevProf));
      setUser({ id: newDevProf.id });
      setProfile(newDevProf);
      return { user: { id: newDevProf.id }, profile: newDevProf };
    }

    // 1. Check if normalized username already exists
    const exists = await checkUsernameExists(normalized);
    if (exists) {
      throw new Error(`Username "${trimmed}" is already taken. Please choose another username.`);
    }

    // 2. Derive email and deterministic credential
    const email = deriveInternalEmail(normalized);
    const password = await deriveUserSecret(normalized);

    // 3. Register user with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: trimmed,
          username_normalized: normalized,
        },
      },
    });

    if (signUpError) {
      throw new Error(signUpError.message || 'Failed to create account. Please try again.');
    }

    const authUser = data.user;
    if (!authUser) {
      throw new Error('Account creation initiated. Please try signing in.');
    }

    // 4. Create profile entry in profiles table
    const { data: prof, error: profError } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        username: trimmed,
        username_normalized: normalized,
      })
      .select()
      .single();

    if (profError) {
      console.warn('[StudyHub] Profile insert notice:', profError);
    }

    setUser(authUser);
    setProfile(prof || { id: authUser.id, username: trimmed, username_normalized: normalized });

    return { user: authUser, profile: prof };
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      } else {
        localStorage.removeItem('studyhub_dev_user');
      }
    } catch (err) {
      console.error('[StudyHub] Sign out error:', err);
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  const value = {
    user,
    profile,
    username: profile?.username || user?.user_metadata?.username || '',
    loading,
    error,
    setError,
    signIn,
    signUp,
    signOut,
    isAuthenticated: Boolean(user),
    isConfigured: isSupabaseConfigured,
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
