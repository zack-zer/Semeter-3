import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  supabase,
  getSupabaseConfig,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
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
  const [configState, setConfigState] = useState(() => getSupabaseConfig());

  // Fetch user profile from public.profiles table
  const fetchProfile = useCallback(async (userId) => {
    if (!userId || !getSupabaseConfig().isConfigured) return null;
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

  // Initialize or re-initialize session on mount or config reload
  const initSession = useCallback(async () => {
    setLoading(true);
    const cfg = getSupabaseConfig();
    setConfigState(cfg);

    if (!cfg.isConfigured) {
      // Local demo simulation fallback
      const localUser = localStorage.getItem('studyhub_dev_user');
      if (localUser) {
        try {
          const parsed = JSON.parse(localUser);
          setUser({ id: parsed.id || 'dev-user-id' });
          setProfile(parsed);
        } catch (e) {
          localStorage.removeItem('studyhub_dev_user');
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
      return;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[StudyHub] Session retrieval error:', sessionError);
      }

      if (session?.user) {
        setUser(session.user);
        const prof = await fetchProfile(session.user.id);
        setProfile(prof || {
          id: session.user.id,
          username: session.user.user_metadata?.username || 'User',
          username_normalized: session.user.user_metadata?.username_normalized || 'user',
        });
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error('[StudyHub] Error initializing auth session:', err);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    initSession();

    let authListener = null;
    const cfg = getSupabaseConfig();
    if (cfg.isConfigured) {
      try {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              setUser(session.user);
              const prof = await fetchProfile(session.user.id);
              setProfile(prof || {
                id: session.user.id,
                username: session.user.user_metadata?.username || 'User',
                username_normalized: session.user.user_metadata?.username_normalized || 'user',
              });
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
          }
        });
        authListener = data?.subscription;
      } catch (err) {
        console.warn('[StudyHub] Could not attach auth listener:', err);
      }
    }

    return () => {
      if (authListener) authListener.unsubscribe();
    };
  }, [initSession, fetchProfile]);

  /**
   * Check if a normalized username is already taken.
   */
  const checkUsernameExists = async (normalizedUsername) => {
    const { isConfigured } = getSupabaseConfig();
    if (!isConfigured) {
      const localUsers = JSON.parse(localStorage.getItem('studyhub_dev_users') || '[]');
      return localUsers.some((u) => u.username_normalized === normalizedUsername);
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username_normalized')
        .eq('username_normalized', normalizedUsername)
        .maybeSingle();

      if (error) {
        console.warn('[StudyHub] Username existence query notice:', error.message);
        return false;
      }
      return Boolean(data);
    } catch (err) {
      console.warn('[StudyHub] Error checking username existence:', err);
      return false;
    }
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
    const { isConfigured } = getSupabaseConfig();

    if (!isConfigured) {
      // Local demo mode
      const localUsers = JSON.parse(localStorage.getItem('studyhub_dev_users') || '[]');
      const found = localUsers.find((u) => u.username_normalized === normalized);
      if (!found) {
        throw new Error(`Account "${rawUsername}" not found in local demo mode. Please create an account first.`);
      }
      const fakeUser = { id: found.id };
      setUser(fakeUser);
      setProfile(found);
      localStorage.setItem('studyhub_dev_user', JSON.stringify(found));
      return { user: fakeUser, profile: found };
    }

    // 1. Verify that profile exists in remote Supabase
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
      throw new Error(signInError.message || 'Unable to sign in. Please check your credentials.');
    }

    const authUser = data.user;
    setUser(authUser);

    // 4. Fetch the profile
    let prof = await fetchProfile(authUser.id);
    if (!prof) {
      // Upsert profile if missing
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
    setProfile(prof || { id: authUser.id, username: rawUsername.trim(), username_normalized: normalized });
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
    const { isConfigured } = getSupabaseConfig();

    if (!isConfigured) {
      // Local demo mode
      const localUsers = JSON.parse(localStorage.getItem('studyhub_dev_users') || '[]');
      if (localUsers.some((u) => u.username_normalized === normalized)) {
        throw new Error(`Username "${trimmed}" is already taken in local demo mode.`);
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

    let authUser = data.user;

    // If session is null (e.g. pending confirmation before trigger executed), perform sign in
    if (!data.session && authUser) {
      try {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!signInErr && signInData?.user) {
          authUser = signInData.user;
        }
      } catch (e) {
        console.warn('[StudyHub] Immediate sign-in attempt notice:', e);
      }
    }

    if (!authUser) {
      throw new Error('Account created. Please sign in with your username.');
    }

    // 4. Ensure profile entry exists
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          username: trimmed,
          username_normalized: normalized,
        })
        .select()
        .single();

      setUser(authUser);
      setProfile(prof || { id: authUser.id, username: trimmed, username_normalized: normalized });
      return { user: authUser, profile: prof };
    } catch (e) {
      setUser(authUser);
      setProfile({ id: authUser.id, username: trimmed, username_normalized: normalized });
      return { user: authUser, profile: { id: authUser.id, username: trimmed } };
    }
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    try {
      const { isConfigured } = getSupabaseConfig();
      if (isConfigured) {
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

  /**
   * Connect custom Supabase configuration at runtime
   */
  const connectSupabase = (url, anonKey) => {
    saveCustomSupabaseConfig(url, anonKey);
    return initSession();
  };

  /**
   * Disconnect custom Supabase configuration
   */
  const disconnectSupabase = () => {
    clearCustomSupabaseConfig();
    return initSession();
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
    isConfigured: configState.isConfigured,
    configSource: configState.source,
    supabaseUrl: configState.url,
    connectSupabase,
    disconnectSupabase,
    reloadConfig: initSession,
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
