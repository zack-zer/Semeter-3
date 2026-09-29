import React from 'react';

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="empty-state-wrapper fade-in">
      <div className="empty-state-icon-wrap">
        <Icon size={36} strokeWidth={1.75} />
      </div>
      
      <h3 className="empty-state-title">
        {title}
      </h3>
      
      <p className="empty-state-desc">
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
