import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, FolderOpen } from 'lucide-react';
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
    <div className="subject-card card">
      <div className="subject-card-header">
        <div className="subject-icon-large">{subject.icon}</div>
        <div className="subject-actions" ref={menuRef}>
          <button 
            className="btn-icon" 
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          >
            <MoreVertical size={20} />
          </button>
          
          {menuOpen && (
            <div className="subject-menu dropdown-menu fade-in">
              <button className="dropdown-item" onClick={handleRename}>
                <Edit2 size={16} /> Rename
              </button>
              <button className="dropdown-item text-danger" onClick={handleDelete}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="subject-card-content">
        <h3 className="subject-card-title">{subject.name}</h3>
        <p className="subject-card-stats">
          {fileCount} {fileCount === 1 ? 'file' : 'files'} &middot; {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </p>
      </div>
      
      <div className="subject-card-footer">
        <button className="btn btn-primary w-100" onClick={onOpen}>
          <FolderOpen size={18} /> Open Subject
        </button>
      </div>
    </div>
  );
};

export default SubjectCard;
