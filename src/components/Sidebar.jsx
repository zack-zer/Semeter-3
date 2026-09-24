import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, CheckSquare, StickyNote, X } from 'lucide-react';
import { getAllSubjects } from '../storage/subjectStore';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const [subjects, setSubjects] = useState([]);
  const location = useLocation();

  useEffect(() => {
    getAllSubjects().then(setSubjects).catch(console.error);
  }, [location]);

  return (
    <>
      <div className={`sidebar-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-mobile-header">
          <span className="sidebar-title">Menu</span>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end onClick={onClose}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/semester" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <GraduationCap size={18} />
            <span>Semester 3</span>
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <CheckSquare size={18} />
            <span>Tasks</span>
          </NavLink>
          <NavLink to="/notes" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <StickyNote size={18} />
            <span>Notes</span>
          </NavLink>
        </nav>

        <div className="sidebar-divider"></div>

        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Subjects</h3>
          <ul className="sidebar-subjects">
            {subjects.map(subject => (
              <li key={subject.id}>
                <NavLink to={`/subject/${subject.id}`} className={({ isActive }) => `sidebar-link subject-link ${isActive ? 'active' : ''}`} onClick={onClose}>
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
      </aside>
    </>
  );
};

export default Sidebar;
