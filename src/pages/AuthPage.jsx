import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function AuthPage() {
  const { signIn, signUp, isConfigured } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(username);
      } else {
        await signUp(username);
      }
    } catch (err) {
      console.error('[StudyHub] Auth error:', err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (newMode) => {
    setMode(newMode);
    setError('');
  };

  return (
    <div className="auth-container">
      {/* Background ambient lighting */}
      <div className="auth-glow-orb auth-glow-1"></div>
      <div className="auth-glow-orb auth-glow-2"></div>

      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="auth-logo-badge">
            <svg
              className="auth-logo-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="12" y1="6" x2="16" y2="6" />
              <line x1="12" y1="10" x2="16" y2="10" />
            </svg>
          </div>
          <h1 className="auth-brand-title">StudyHub</h1>
          <p className="auth-brand-subtitle">Semester 3 Digital Learning Workspace</p>
        </div>

        {/* Configuration Notice if Supabase keys not set */}
        {!isConfigured && (
          <div className="auth-notice-banner">
            <span className="notice-icon">⚠️</span>
            <div className="notice-text">
              <strong>Supabase Not Connected:</strong> Running in local simulation mode. To enable real cloud multi-device sync, add <code>VITE_SUPABASE_URL</code> & <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code>.
            </div>
          </div>
        )}

        {/* Auth Mode Tabs */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => handleTabChange('signin')}
            id="tab-signin"
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => handleTabChange('signup')}
            id="tab-signup"
          >
            Create Account
          </button>
        </div>

        {/* Dynamic description */}
        <p className="auth-instructions">
          {mode === 'signin'
            ? 'Enter your username to access your cloud-synced study workspace.'
            : 'Choose a unique username to start your remote cloud workspace. No password required!'}
        </p>

        {/* Error Alert */}
        {error && (
          <div className="auth-error-box" role="alert">
            <svg
              className="auth-error-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-input-group">
            <label htmlFor="auth-username" className="auth-label">
              Username
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">@</span>
              <input
                id="auth-username"
                type="text"
                className="auth-input"
                placeholder="e.g. Zakaria"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                disabled={loading}
                maxLength={30}
              />
            </div>
            <span className="auth-input-hint">
              Case-insensitive (e.g., &quot;Zakaria&quot; and &quot;zakaria&quot; refer to the same account).
            </span>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || !username.trim()}
            id="auth-submit-button"
          >
            {loading ? (
              <span className="auth-spinner-container">
                <span className="auth-spinner"></span>
                <span>{mode === 'signin' ? 'Signing In...' : 'Creating Account...'}</span>
              </span>
            ) : mode === 'signin' ? (
              'Sign In to Workspace'
            ) : (
              'Create My Account'
            )}
          </button>
        </form>

        {/* Multi-device sync highlight */}
        <div className="auth-features-footer">
          <div className="feature-pill">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
            <span>Cloud Storage</span>
          </div>
          <div className="feature-pill">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Cross-Device Sync</span>
          </div>
          <div className="feature-pill">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <span>PDF Memory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
