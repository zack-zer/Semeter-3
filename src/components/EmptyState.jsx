import React from 'react';

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => {
  return (
    <div style={{
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
        padding: '1.5rem',
        borderRadius: '50%',
        marginBottom: '1.5rem',
        color: 'var(--text-muted)'
      }}>
        <Icon size={48} strokeWidth={1.5} />
      </div>
      
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: '0 0 0.5rem 0'
      }}>
        {title}
      </h3>
      
      <p style={{
        color: 'var(--text-secondary)',
        maxWidth: '400px',
        margin: '0 0 1.5rem 0',
        lineHeight: 1.5
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
