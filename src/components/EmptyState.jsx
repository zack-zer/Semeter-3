import React from 'react';

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="empty-state-wrapper fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      textAlign: 'center',
      height: '100%'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        padding: '1.5rem',
        borderRadius: '50%',
        marginBottom: '1.5rem',
        color: 'var(--accent)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
      }}>
        <Icon size={44} strokeWidth={1.5} />
      </div>
      
      <h3 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '1.4rem',
        fontWeight: 600,
        letterSpacing: '-0.015em',
        color: 'var(--text-primary)',
        margin: '0 0 0.5rem 0'
      }}>
        {title}
      </h3>
      
      <p style={{
        color: 'var(--text-secondary)',
        maxWidth: '420px',
        margin: '0 0 1.5rem 0',
        lineHeight: 1.6,
        fontSize: '0.92rem'
      }}>
        {description}
      </p>
      
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
