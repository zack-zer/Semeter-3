import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, CheckSquare, StickyNote, Link2, X, LogOut } from 'lucide-react';
import { getAllSubjects } from '../storage/subjectStore';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, isDesktopOpen = true, onClose }) => {
  const [subjects, setSubjects] = useState([]);
  const location = useLocation();
  const { username, signOut } = useAuth();

  useEffect(() => {
    getAllSubjects().then(setSubjects).catch(console.error);
  }, [location]);

  const handleLinkClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    if (window.confirm(`Log out of account "${username}"?`)) {
      signOut();
    }
  };

  return (
    <>
      <div className={`sidebar-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${!isDesktopOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-mobile-header">
          <span className="sidebar-title">Menu</span>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end onClick={handleLinkClick}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/semester" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <GraduationCap size={18} />
            <span>Semester 3</span>
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <CheckSquare size={18} />
            <span>Tasks</span>
          </NavLink>
          <NavLink to="/notes" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <StickyNote size={18} />
            <span>Notes</span>
          </NavLink>
          <NavLink to="/links" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <Link2 size={18} />
            <span>Links</span>
          </NavLink>
        </nav>

        <div className="sidebar-divider"></div>

        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Subjects</h3>
          <ul className="sidebar-subjects">
            {subjects.map((subject) => (
              <li key={subject.id}>
                <NavLink
                  to={`/subject/${subject.id}`}
                  className={({ isActive }) => `sidebar-link subject-link ${isActive ? 'active' : ''}`}
                  onClick={handleLinkClick}
                >
                  <span className="subject-icon">{subject.icon}</span>
                  <span className="subject-name">{subject.name}</span>
                </NavLink>
              </li>
            ))}
            {subjects.length === 0 && (
              <li className="sidebar-empty">No subjects yet.</li>
            )}
          </ul>
        </div>

        {username && (
          <div className="sidebar-footer-user">
            <div className="sidebar-user-info">
              <span className="sidebar-user-avatar">
                {username.charAt(0).toUpperCase()}
              </span>
              <div className="sidebar-user-meta">
                <span className="sidebar-username">@{username}</span>
                <span className="sidebar-user-status">Cloud Synced</span>
              </div>
            </div>
            <button
              type="button"
              className="btn-icon sidebar-logout-btn"
              onClick={handleLogout}
              title="Log Out"
              aria-label="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
