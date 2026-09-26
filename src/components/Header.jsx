import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  LayoutDashboard,
  GraduationCap,
  CheckSquare,
  StickyNote,
  Link2,
  Search,
  Sun,
  Moon,
  Menu,
  LogOut,
  User,
} from 'lucide-react';
import SearchModal from './SearchModal';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = ({ theme, onThemeToggle, onMenuToggle, isSidebarCollapsed }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { username, signOut } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    if (window.confirm(`Log out of account "${username}"?`)) {
      signOut();
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button
            type="button"
            className="btn-icon menu-toggle-btn mobile-menu-btn"
            onClick={onMenuToggle}
            aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
            title={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
          >
            <Menu size={24} />
          </button>
          <NavLink to="/" className="header-logo">
            <BookOpen size={24} className="logo-icon" />
            <span>StudyHub</span>
          </NavLink>
        </div>

        <nav className="header-nav">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/semester" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <GraduationCap size={20} />
            <span>Semester 3</span>
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <CheckSquare size={20} />
            <span>Tasks</span>
          </NavLink>
          <NavLink to="/notes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <StickyNote size={20} />
            <span>Notes</span>
          </NavLink>
          <NavLink to="/links" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Link2 size={20} />
            <span>Links</span>
          </NavLink>
        </nav>

        <div className="header-right">
          <button className="btn-icon search-btn" onClick={() => setIsSearchOpen(true)} aria-label="Search">
            <Search size={20} />
            <span className="search-shortcut">Ctrl+K</span>
          </button>

          <button
            className="theme-toggle"
            onClick={onThemeToggle}
            aria-label="Toggle Theme"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span className="theme-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {username && (
            <div className="header-user-menu">
              <div className="header-user-badge" title={`Signed in as @${username}`}>
                <span className="header-user-avatar">
                  {username.charAt(0).toUpperCase()}
                </span>
                <span className="header-username">{username}</span>
              </div>
              <button
                type="button"
                className="btn-icon header-logout-btn"
                onClick={handleLogout}
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Header;
