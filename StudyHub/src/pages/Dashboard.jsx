import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, Clock, CheckCircle, Play, File as FileIcon } from 'lucide-react';
import { getAllSubjects } from '../storage/subjectStore';
import { getAllFiles } from '../storage/fileStore';
import { getTaskStats } from '../storage/taskStore';
import { getRecentFiles } from '../storage/progressStore';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import { formatRelative } from '../utils/formatDate';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ subjects: 0, files: 0, pending: 0, completed: 0 });
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const subjects = await getAllSubjects();
        const files = await getAllFiles();
        const taskStats = await getTaskStats();
        
        setStats({
          subjects: subjects.length,
          files: files.length,
          pending: taskStats.pending,
          completed: taskStats.done
        });

        const recent = await getRecentFiles(4);
        const subjectsMap = subjects.reduce((acc, sub) => ({...acc, [sub.id]: sub.name}), {});
        const filesMap = files.reduce((acc, f) => ({...acc, [f.id]: f}), {});

        const enrichedRecent = recent.map(r => {
          const file = filesMap[r.fileId];
          if (!file) return null;
          return {
            ...r,
            file,
            subjectName: subjectsMap[file.subjectId] || 'Unknown Subject',
          };
        }).filter(Boolean);

        setRecentFiles(enrichedRecent);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div className="loading-state">Loading dashboard...</div>;

  return (
    <div className="dashboard-container fade-in">
      <header className="page-header">
        <h1 className="page-title">Welcome back!</h1>
        <p className="text-secondary">Here's an overview of your studies.</p>
      </header>

      <div className="stats-grid">
        <StatCard icon={BookOpen} value={stats.subjects} label="Total Subjects" color="var(--accent)" />
        <StatCard icon={FileText} value={stats.files} label="Total Files" color="#3b82f6" />
        <StatCard icon={Clock} value={stats.pending} label="Pending Tasks" color="var(--warning)" />
        <StatCard icon={CheckCircle} value={stats.completed} label="Completed Tasks" color="var(--success)" />
      </div>

      <section className="dashboard-section">
        <h2 className="section-title">Continue Studying</h2>
        {recentFiles.length > 0 ? (
          <div className="recent-files-grid">
            {recentFiles.map(rf => {
              const percent = rf.totalPages > 0 ? Math.round((rf.currentPage / rf.totalPages) * 100) : 0;
              return (
                <div key={rf.fileId} className="card recent-file-card">
                  <div className="recent-file-header">
                    <div className="recent-file-icon">
                      <FileText size={24} />
                    </div>
                    <div className="recent-file-info">
                      <h3 className="recent-file-name">{rf.file.name}</h3>
                      <p className="recent-file-subject">{rf.subjectName}</p>
                    </div>
                  </div>
                  <div className="recent-file-progress">
                    <div className="progress-text">
                      <span>Page {rf.currentPage} of {rf.totalPages}</span>
                      <span>{formatRelative(rf.lastOpened)}</span>
                    </div>
                    <ProgressBar value={percent} showLabel size="sm" />
                  </div>
                  <button 
                    className="btn btn-primary recent-file-btn"
                    onClick={() => navigate(`/viewer/${rf.fileId}`)}
                  >
                    <Play size={16} /> Continue
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card empty-recent">
            <div className="empty-recent-content">
              <FileIcon size={48} className="empty-icon" />
              <h3>No recent files</h3>
              <p className="text-secondary">Start studying to see your recent files here.</p>
            </div>
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          <button className="card quick-action-card" onClick={() => navigate('/semester')}>
            <BookOpen size={24} />
            <span>Add Subject</span>
          </button>
          <button className="card quick-action-card" onClick={() => navigate('/tasks')}>
            <CheckCircle size={24} />
            <span>Add Task</span>
          </button>
          <button className="card quick-action-card" onClick={() => navigate('/notes')}>
            <FileText size={24} />
            <span>Add Note</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
