import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function AuthPage() {
  const { createWorkspace, loginWorkspace } = useAuth();

  // Action 1: Create a username state
  const [createUsername, setCreateUsername] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Action 2: Enter existing username state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Handle Action 1: Create username
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const trimmed = createUsername.trim();
    if (!trimmed) {
      setCreateError('Please enter a username.');
      return;
    }

    setCreateError('');
    setCreateLoading(true);

    try {
      await createWorkspace(trimmed);
    } catch (err) {
      console.error('[StudyHub] Create workspace error:', err);
      setCreateError(err.message || 'Unable to create username. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Action 2: Enter existing username
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
      await loginWorkspace(trimmed);
    } catch (err) {
      console.error('[StudyHub] Login workspace error:', err);
      setLoginError(err.message || 'Unable to enter workspace. Please try again.');
    } finally {
      setLoginLoading(false);
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
          Create a new study workspace or enter your existing username to continue. No password required.
        </p>

        <div className="auth-actions-wrapper">
          {/* ACTION 1: Create a username */}
          <section className="auth-action-section" aria-labelledby="heading-create-username">
            <h2 id="heading-create-username" className="auth-section-title">
              Create a username
            </h2>
            <form onSubmit={handleCreateSubmit} className="auth-form" noValidate>
              <div className="auth-input-group">
                <div className={`auth-input-wrapper ${createError ? 'has-error' : ''}`}>
                  <span className="auth-input-icon">@</span>
                  <input
                    id="auth-create-username"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. zackk"
                    value={createUsername}
                    onChange={(e) => {
                      setCreateUsername(e.target.value);
                      if (createError) setCreateError('');
                    }}
                    autoComplete="off"
                    disabled={createLoading || loginLoading}
                    maxLength={30}
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
                disabled={createLoading || loginLoading || !createUsername.trim()}
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
          </section>

          {/* Clean Visual Divider */}
          <div className="auth-divider">
            <span className="auth-divider-line"></span>
            <span className="auth-divider-text">or</span>
            <span className="auth-divider-line"></span>
          </div>

          {/* ACTION 2: Enter an existing username */}
          <section className="auth-action-section" aria-labelledby="heading-login-username">
            <h2 id="heading-login-username" className="auth-section-title">
              Enter your username
            </h2>
            <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
              <div className="auth-input-group">
                <div className={`auth-input-wrapper ${loginError ? 'has-error' : ''}`}>
                  <span className="auth-input-icon">@</span>
                  <input
                    id="auth-login-username"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. zackk"
                    value={loginUsername}
                    onChange={(e) => {
                      setLoginUsername(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    autoComplete="username"
                    disabled={loginLoading || createLoading}
                    maxLength={30}
                  />
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
                disabled={loginLoading || createLoading || !loginUsername.trim()}
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
          </section>
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
