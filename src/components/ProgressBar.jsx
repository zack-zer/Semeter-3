import React from 'react';

const ProgressBar = ({ value, showLabel = false, size = 'md' }) => {
  const safeValue = Math.min(100, Math.max(0, value || 0));
  const height = size === 'sm' ? '4px' : '8px';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
      <div 
        style={{ 
          flexGrow: 1, 
          height, 
          backgroundColor: 'var(--bg-tertiary)', 
          borderRadius: '999px',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{ 
            height: '100%', 
            width: `${safeValue}%`, 
            backgroundColor: 'var(--accent)',
            borderRadius: '999px',
            transition: 'width 0.3s ease'
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: '2.5rem', textAlign: 'right' }}>
          {Math.round(safeValue)}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
