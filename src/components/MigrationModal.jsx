import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkLocalDataExists, migrateLocalDataToCloud } from '../utils/migration';
import './MigrationModal.css';

export default function MigrationModal({ onComplete }) {
  const { user, username, isConfigured } = useAuth();
  const [localSummary, setLocalSummary] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user || !isConfigured) return;

    const migrationKey = `studyhub_migrated_${user.id}`;
    if (localStorage.getItem(migrationKey)) return;

    checkLocalDataExists().then((res) => {
      if (res.hasData) {
        setLocalSummary(res.counts);
        setIsOpen(true);
      }
    });
  }, [user, isConfigured]);

  if (!isOpen || !localSummary) return null;

  const handleMigrate = async () => {
    setIsMigrating(true);
    setProgressMsg('Starting sync to your cloud workspace...');
    try {
      await migrateLocalDataToCloud(user, (msg) => setProgressMsg(msg));
      setIsOpen(false);
      if (onComplete) onComplete();
      // Reload window so components immediately reflect migrated data
      window.location.reload();
    } catch (err) {
      console.error('[StudyHub] Migration failed:', err);
      setProgressMsg(`Sync failed: ${err.message}`);
      setIsMigrating(false);
    }
  };

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`studyhub_migrated_${user.id}`, 'dismissed');
    }
    setIsOpen(false);
  };

  return (
    <div className="migration-overlay">
      <div className="migration-card">
        <div className="migration-header">
          <div className="migration-icon-badge">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h2 className="migration-title">Sync Local Data to Cloud</h2>
        </div>

        <p className="migration-desc">
          We found study data saved locally on this browser. Would you like to upload and sync it to your remote account <strong>@{username}</strong> so it is accessible on all your devices?
        </p>

        <div className="migration-stats">
          {localSummary.subjects > 0 && (
            <div className="migration-stat-chip">
              <span className="stat-count">{localSummary.subjects}</span>
              <span className="stat-label">Subjects</span>
            </div>
          )}
          {localSummary.files > 0 && (
            <div className="migration-stat-chip">
              <span className="stat-count">{localSummary.files}</span>
              <span className="stat-label">Files & PDFs</span>
            </div>
          )}
          {localSummary.tasks > 0 && (
            <div className="migration-stat-chip">
              <span className="stat-count">{localSummary.tasks}</span>
              <span className="stat-label">Tasks</span>
            </div>
          )}
          {localSummary.notes > 0 && (
            <div className="migration-stat-chip">
              <span className="stat-count">{localSummary.notes}</span>
              <span className="stat-label">Notes</span>
            </div>
          )}
        </div>

        {progressMsg && (
          <div className="migration-status-msg">
            <span className="migration-spinner"></span>
            <span>{progressMsg}</span>
          </div>
        )}

        <div className="migration-actions">
          <button
            type="button"
            className="migration-btn-skip"
            onClick={handleDismiss}
            disabled={isMigrating}
          >
            Don&apos;t Sync
          </button>
          <button
            type="button"
            className="migration-btn-sync"
            onClick={handleMigrate}
            disabled={isMigrating}
          >
            {isMigrating ? 'Syncing...' : 'Sync to Cloud Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
