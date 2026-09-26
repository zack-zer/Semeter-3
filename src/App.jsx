import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

/* --- Page imports --- */
import Dashboard from './pages/Dashboard';
import Semester from './pages/Semester';
import Subject from './pages/Subject';
import FileViewer from './pages/FileViewer';
import Tasks from './pages/Tasks';
import Notes from './pages/Notes';

/* --- Component imports --- */
import Header from './components/Header';
import Sidebar from './components/Sidebar';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Desktop sidebar state: defaults to open (true), persisted in localStorage
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('studyhub_desktop_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  // Mobile sidebar state: defaults to closed (false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const location = useLocation();
  const isViewer = location.pathname.startsWith('/viewer');

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist desktop sidebar state
  useEffect(() => {
    localStorage.setItem('studyhub_desktop_sidebar_open', String(desktopSidebarOpen));
  }, [desktopSidebarOpen]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleMenuToggle = () => {
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(prev => !prev);
    } else {
      setDesktopSidebarOpen(prev => !prev);
    }
  };

  return (
    <div className="app-container">
      <Header
        theme={theme}
        onThemeToggle={toggleTheme}
        onMenuToggle={handleMenuToggle}
        isSidebarCollapsed={!desktopSidebarOpen}
      />
      <div className={`app-layout ${!desktopSidebarOpen ? 'sidebar-collapsed' : ''}`}>
        {!isViewer && (
          <Sidebar
            isOpen={mobileSidebarOpen}
            isDesktopOpen={desktopSidebarOpen}
            onClose={() => setMobileSidebarOpen(false)}
          />
        )}
        <main className={`main-content ${isViewer ? 'full-width' : ''} ${!desktopSidebarOpen ? 'sidebar-collapsed' : ''}`}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/semester" element={<Semester />} />
            <Route path="/subject/:subjectId" element={<Subject />} />
            <Route path="/subject/:subjectId/folder/:folderId" element={<Subject />} />
            <Route path="/viewer/:fileId" element={<FileViewer />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/notes" element={<Notes />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
