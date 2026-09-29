import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, FolderOpen, FileText, CheckSquare, ArrowRight } from 'lucide-react';
import './SubjectCard.css';

const SubjectCard = ({ subject, fileCount, taskCount, onOpen, onRename, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRename = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    onRename();
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    onDelete();
  };

  return (
    <div 
      className="subject-card card"
      style={{ '--card-accent': subject.color || 'var(--accent)' }}
    >
      <div className="subject-card-header">
        <div className="subject-icon-badge">
          <span className="subject-emoji-char">{subject.icon}</span>
        </div>
        <div className="subject-actions" ref={menuRef}>
          <button 
            type="button"
            className="btn-icon subject-options-btn" 
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            title="Subject options"
            aria-label="Subject options"
          >
            <MoreVertical size={18} />
          </button>
          
          {menuOpen && (
            <div className="subject-menu dropdown-menu fade-in">
              <button className="dropdown-item" onClick={handleRename}>
                <Edit2 size={15} /> Rename
              </button>
              <button className="dropdown-item text-danger" onClick={handleDelete}>
                <Trash2 size={15} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="subject-card-content" onClick={onOpen}>
        <h3 className="subject-card-title">{subject.name}</h3>
        
        <div className="subject-card-chips">
          <span className="subject-stat-chip">
            <FileText size={13} />
            <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
          </span>
          <span className="subject-stat-chip">
            <CheckSquare size={13} />
            <span>{taskCount} {taskCount === 1 ? 'task' : 'tasks'}</span>
          </span>
        </div>
      </div>
      
      <div className="subject-card-footer">
        <button className="btn btn-secondary subject-open-btn" onClick={onOpen}>
          <span>View Course</span>
          <ArrowRight size={15} className="subject-btn-arrow" />
        </button>
      </div>
    </div>
  );
};

export default SubjectCard;
