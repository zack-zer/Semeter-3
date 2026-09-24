import React from 'react';
import './StatCard.css';

const StatCard = ({ icon: Icon, value, label, color }) => {
  return (
    <div className="stat-card card">
      <div 
        className="stat-icon-wrapper" 
        style={{ backgroundColor: `${color}20`, color: color }}
      >
        <Icon size={24} />
      </div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
};

export default StatCard;
