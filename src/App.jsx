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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isViewer = location.pathname.startsWith('/viewer');

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app-container">
      <Header
        theme={theme}
        onThemeToggle={toggleTheme}
        onMenuToggle={() => setSidebarOpen(prev => !prev)}
      />
      <div className="app-layout">
        {!isViewer && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}
        <main className={`main-content ${isViewer ? 'full-width' : ''}`}>
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
