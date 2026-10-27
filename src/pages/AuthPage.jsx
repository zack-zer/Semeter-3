import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function AuthPage() {
  const {
    createWorkspace,
    loginWorkspace,
    checkAccountStatus,
    setPasswordForExistingWorkspace,
  } = useAuth();

  // Mode toggle: 'login' (default) | 'create' | 'set_password'
  const [mode, setMode] = useState('login');

  // Action 1: Enter existing username & password state (Default view)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Action 2: Create username & password state
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirmPassword, setCreateConfirmPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Action 3: Existing account without password setup state
  const [setupWorkspace, setSetupWorkspace] = useState(null);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  // Handle Action 1: Login with existing username & password
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const trimmed = loginUsername.trim();
    if (!trimmed) {
      setLoginError('Please enter a username.');
      return;
    }

    setLoginError('');
    setLoginLoading(true);

    try {
      // 1. Check account existence and password status
      const status = await checkAccountStatus(trimmed);
      if (!status.exists) {
        setLoginError('Username not found.');
        setLoginLoading(false);
        return;
      }

      // 2. Account exists but does NOT have a password yet -> Prompt to create password
      if (!status.hasPassword) {
        setSetupWorkspace(status.workspace);
        setMode('set_password');
        setSetupPassword(loginPassword);
        setSetupConfirmPassword('');
        setSetupError('');
        setLoginLoading(false);
        return;
      }

      // 3. Account has a password: require password
      if (!loginPassword) {
        setLoginError('Please enter your password.');
        setLoginLoading(false);
        const passInput = document.getElementById('auth-login-password');
        if (passInput) passInput.focus();
        return;
      }

      await loginWorkspace(trimmed, loginPassword);
    } catch (err) {
      console.error('[StudyHub] Login workspace error:', err);
      if (err.code === 'NO_PASSWORD_SET') {
        setSetupWorkspace(err.workspace || { username: trimmed });
        setMode('set_password');
        setSetupPassword(loginPassword);
        setSetupConfirmPassword('');
        setSetupError('');
      } else {
        setLoginError(err.message || 'Unable to enter workspace. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Action 2: Create new username with password
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const trimmed = createUsername.trim();
    if (!trimmed) {
      setCreateError('Please enter a username.');
      return;
    }

    if (!createPassword) {
      setCreateError('Please enter a password.');
      return;
    }

    if (createPassword.length < 6) {
      setCreateError('Password must be at least 6 characters.');
      return;
    }

    if (createPassword !== createConfirmPassword) {
      setCreateError('Passwords do not match.');
      return;
    }

    setCreateError('');
    setCreateLoading(true);

    try {
      await createWorkspace(trimmed, createPassword);
    } catch (err) {
      console.error('[StudyHub] Create workspace error:', err);
      setCreateError(err.message || 'Unable to create username. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Action 3: Set password for existing account without password
  const handleSetupPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!setupWorkspace?.username) {
      setSetupError('Session expired. Please enter your username again.');
      setMode('login');
      return;
    }

    if (!setupPassword) {
      setSetupError('Please enter a password.');
      return;
    }

    if (setupPassword.length < 6) {
      setSetupError('Password must be at least 6 characters.');
      return;
    }

    if (setupPassword !== setupConfirmPassword) {
      setSetupError('Passwords do not match.');
      return;
    }

    setSetupError('');
    setSetupLoading(true);

    try {
      await setPasswordForExistingWorkspace(setupWorkspace.username, setupPassword);
    } catch (err) {
      console.error('[StudyHub] Set password error:', err);
      setSetupError(err.message || 'Unable to set password. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Ambient background lighting */}
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

        <p className="auth-instructions">
          {mode === 'login'
            ? 'Enter your username and password to access your study workspace.'
            : mode === 'create'
            ? 'Create your username and password to start your study workspace.'
            : 'Set a password to secure your existing study workspace and documents.'}
        </p>

        <div className="auth-content-view">
          {mode === 'login' ? (
            /* DEFAULT VIEW: Enter existing username & password */
            <section className="auth-action-section" aria-labelledby="heading-login-username">
              <h2 id="heading-login-username" className="auth-section-title">
                Enter your username
              </h2>
              <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
                {/* Username Input */}
                <div className="auth-input-group">
                  <div className={`auth-input-wrapper ${loginError ? 'has-error' : ''}`}>
                    <span className="auth-input-icon">@</span>
                    <input
                      id="auth-login-username"
                      type="text"
                      className="auth-input"
                      placeholder="e.g. student123"
                      value={loginUsername}
                      onChange={(e) => {
                        setLoginUsername(e.target.value);
                        if (loginError) setLoginError('');
                      }}
                      autoComplete="username"
                      autoFocus
                      disabled={loginLoading}
                      maxLength={30}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="auth-input-group">
                  <div className={`auth-input-wrapper ${loginError ? 'has-error' : ''}`}>
                    <span className="auth-input-icon">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="auth-login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      className="auth-input has-toggle"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (loginError) setLoginError('');
                      }}
                      autoComplete="current-password"
                      disabled={loginLoading}
                      maxLength={128}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle-btn"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      tabIndex="-1"
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {loginError && (
                    <div className="auth-field-error" id="auth-login-error" role="alert">
                      <svg
                        viewBox="0 0 24 24"
                        className="auth-field-error-icon"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{loginError}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn auth-btn-continue"
                  disabled={loginLoading || !loginUsername.trim()}
                  id="auth-continue-button"
                >
                  {loginLoading ? (
                    <span className="auth-spinner-container">
                      <span className="auth-spinner"></span>
                      <span>Continuing...</span>
                    </span>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>

              {/* Clickable toggle to switch to username creation */}
              <div className="auth-toggle-footer">
                <button
                  type="button"
                  className="auth-toggle-btn"
                  id="auth-toggle-to-create"
                  onClick={() => {
                    setMode('create');
                    setLoginError('');
                    setCreateError('');
                  }}
                >
                  Create a new username
                </button>
              </div>
            </section>
          ) : mode === 'create' ? (
            /* TOGGLE VIEW: Create username & password */
            <section className="auth-action-section" aria-labelledby="heading-create-username">
              <h2 id="heading-create-username" className="auth-section-title">
                Create your username
              </h2>
              <form onSubmit={handleCreateSubmit} className="auth-form" noValidate>
                {/* Create Username Input */}
                <div className="auth-input-group">
                  <div className={`auth-input-wrapper ${createError ? 'has-error' : ''}`}>
                    <span className="auth-input-icon">@</span>
                    <input
                      id="auth-create-username"
                      type="text"
                      className="auth-input"
                      placeholder="e.g. student123"
                      value={createUsername}
                      onChange={(e) => {
                        setCreateUsername(e.target.value);
                        if (createError) setCreateError('');
                      }}
                      autoComplete="off"
                      autoFocus
                      disabled={createLoading}
                      maxLength={30}
                    />
                  </div>
                </div>

                {/* Create Password Input */}
                <div className="auth-input-group">
                  <div className={`auth-input-wrapper ${createError ? 'has-error' : ''}`}>
                    <span className="auth-input-icon">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="auth-create-password"
                      type={showCreatePassword ? 'text' : 'password'}
                      className="auth-input has-toggle"
                      placeholder="Password (min. 6 characters)"
                      value={createPassword}
                      onChange={(e) => {
                        setCreatePassword(e.target.value);
                        if (createError) setCreateError('');
                      }}
                      autoComplete="new-password"
                      disabled={createLoading}
                      maxLength={128}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle-btn"
                      onClick={() => setShowCreatePassword((prev) => !prev)}
                      tabIndex="-1"
                      aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                    >
                      {showCreatePassword ? (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="auth-input-group">
                  <div className={`auth-input-wrapper ${createError ? 'has-error' : ''}`}>
                    <span className="auth-input-icon">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="auth-create-confirm-password"
                      type={showCreatePassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Confirm password"
                      value={createConfirmPassword}
                      onChange={(e) => {
                        setCreateConfirmPassword(e.target.value);
                        if (createError) setCreateError('');
                      }}
                      autoComplete="new-password"
                      disabled={createLoading}
                      maxLength={128}
                    />
                  </div>

                  {createError && (
                    <div className="auth-field-error" id="auth-create-error" role="alert">
                      <svg
                        viewBox="0 0 24 24"
                        className="auth-field-error-icon"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{createError}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn auth-btn-create"
                  disabled={createLoading || !createUsername.trim() || !createPassword || !createConfirmPassword}
                  id="auth-create-button"
                >
                  {createLoading ? (
                    <span className="auth-spinner-container">
                      <span className="auth-spinner"></span>
                      <span>Creating...</span>
                    </span>
                  ) : (
                    'Create username'
                  )}
                </button>
              </form>

              {/* Clickable toggle to switch back to login */}
              <div className="auth-toggle-footer">
                <button
                  type="button"
                  className="auth-toggle-btn"
                  id="auth-toggle-to-login"
                  onClick={() => {
                    setMode('login');
                    setCreateError('');
                    setLoginError('');
                  }}
                >
                  Already have a username? Enter it
                </button>
              </div>
            </section>
          ) : (
            /* EXISTING ACCOUNT PASSWORD CREATION VIEW */
            <section className="auth-action-section" aria-labelledby="heading-setup-password">
              <h2 id="heading-setup-password" className="auth-section-title">
                Set a password for @{setupWorkspace?.username || loginUsername}
              </h2>
              <p className="auth-section-subtitle">
                Your account was found! All your existing documents, PDFs, and notes will remain intact. Create a password to secure your account.
              </p>

              <div className="auth-account-badge">
                <svg className="auth-account-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Account found. Create and confirm a new password to continue.</span>
              </div>

              <form onSubmit={handleSetupPasswordSubmit} className="auth-form" noValidate>
                {/* New Password Input */}
                <div className="auth-input-group">
                  <div className={`auth-input-wrapper ${setupError ? 'has-error' : ''}`}>
                    <span className="auth-input-icon">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="auth-setup-password"
                      type={showSetupPassword ? 'text' : 'password'}
                      className="auth-input has-toggle"
                      placeholder="New password (min. 6 characters)"
                      value={setupPassword}
                      onChange={(e) => {
                        setSetupPassword(e.target.value);
                        if (setupError) setSetupError('');
                      }}
                      autoComplete="new-password"
                      autoFocus
                      disabled={setupLoading}
                      maxLength={128}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle-btn"
                      onClick={() => setShowSetupPassword((prev) => !prev)}
                      tabIndex="-1"
                      aria-label={showSetupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSetupPassword ? (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password Input */}
                <div className="auth-input-group">
                  <div className={`auth-input-wrapper ${setupError ? 'has-error' : ''}`}>
                    <span className="auth-input-icon">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="auth-setup-confirm-password"
                      type={showSetupPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Confirm new password"
                      value={setupConfirmPassword}
                      onChange={(e) => {
                        setSetupConfirmPassword(e.target.value);
                        if (setupError) setSetupError('');
                      }}
                      autoComplete="new-password"
                      disabled={setupLoading}
                      maxLength={128}
                    />
                  </div>

                  {setupError && (
                    <div className="auth-field-error" id="auth-setup-error" role="alert">
                      <svg
                        viewBox="0 0 24 24"
                        className="auth-field-error-icon"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{setupError}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn auth-btn-create"
                  disabled={setupLoading || !setupPassword || !setupConfirmPassword}
                  id="auth-setup-button"
                >
                  {setupLoading ? (
                    <span className="auth-spinner-container">
                      <span className="auth-spinner"></span>
                      <span>Saving password...</span>
                    </span>
                  ) : (
                    'Save password & enter'
                  )}
                </button>

                <button
                  type="button"
                  className="auth-back-btn"
                  id="auth-setup-back"
                  onClick={() => {
                    setMode('login');
                    setSetupError('');
                    setLoginError('');
                  }}
                >
                  ← Back to username login
                </button>
              </form>
            </section>
          )}
        </div>

        {/* Features footer */}
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Secure Password</span>
          </div>
        </div>
      </div>
    </div>
  );
}
