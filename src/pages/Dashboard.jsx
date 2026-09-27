import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  FileText, 
  Clock, 
  CheckCircle, 
  Play, 
  File as FileIcon, 
  GraduationCap, 
  Calendar, 
  ArrowRight,
  BookMarked,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { getAllSubjects } from '../storage/subjectStore';
import { getAllFiles } from '../storage/fileStore';
import { getTaskStats } from '../storage/taskStore';
import { getRecentFiles } from '../storage/progressStore';
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
            subjectName: subjectsMap[file.subjectId] || 'Course Material',
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

  if (loading) {
    return (
      <div className="page-loading-state">
        <div className="page-loading-spinner"></div>
        <p className="page-loading-text">Loading academic overview...</p>
      </div>
    );
  }

  const totalTasks = stats.pending + stats.completed;
  const taskCompletionRate = totalTasks > 0 ? Math.round((stats.completed / totalTasks) * 100) : 0;
  // Representative academic term progress (e.g. Week 8 of 15)
  const currentWeek = 8;
  const totalWeeks = 15;
  const semesterTermPercent = Math.round((currentWeek / totalWeeks) * 100);

  return (
    <div className="dashboard-container fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Academic Dashboard</h1>
          <p className="page-subtitle">Welcome back • Track your coursework and continue your study sessions.</p>
        </div>
        <div className="dashboard-header-badge">
          <GraduationCap size={16} />
          <span>Semester 3</span>
        </div>
      </header>

      {/* Collegiate Semester Overview Banner */}
      <section className="semester-overview-card card mb-8">
        <div className="overview-header">
          <div className="overview-title-block">
            <div className="overview-kicker">
              <GraduationCap size={16} className="overview-kicker-icon" />
              <span>Term Progress & Overview</span>
            </div>
            <h2 className="overview-heading">Semester 3 Curriculum</h2>
            <p className="overview-caption">
              Active enrolled subjects, study materials, and assignments for this academic term.
            </p>
          </div>

          <div className="overview-progress-panel">
            <div className="term-progress-header">
              <span className="term-progress-label">
                <Calendar size={14} /> Term Timeline
              </span>
              <span className="term-progress-value">Week {currentWeek} of {totalWeeks}</span>
            </div>
            <div className="term-progress-bar-wrap">
              <div className="term-progress-fill" style={{ width: `${semesterTermPercent}%` }}></div>
            </div>
            <div className="term-progress-meta">
              <span>{semesterTermPercent}% Semester Elapsed</span>
              {totalTasks > 0 && <span>• {taskCompletionRate}% Tasks Done</span>}
            </div>
          </div>
        </div>

        {/* Grouped Academic Stats Grid */}
        <div className="academic-stats-grid">
          <div className="academic-stat-item" onClick={() => navigate('/semester')}>
            <div className="stat-icon-emblem subjects-emblem">
              <BookOpen size={20} />
            </div>
            <div className="stat-body">
              <div className="stat-number">{stats.subjects}</div>
              <div className="stat-label">Enrolled Subjects</div>
            </div>
          </div>

          <div className="academic-stat-item" onClick={() => navigate('/semester')}>
            <div className="stat-icon-emblem files-emblem">
              <FileText size={20} />
            </div>
            <div className="stat-body">
              <div className="stat-number">{stats.files}</div>
              <div className="stat-label">Study Materials</div>
            </div>
          </div>

          <div className="academic-stat-item" onClick={() => navigate('/tasks')}>
            <div className="stat-icon-emblem pending-emblem">
              <Clock size={20} />
            </div>
            <div className="stat-body">
              <div className="stat-number">{stats.pending}</div>
              <div className="stat-label">Pending Tasks</div>
            </div>
          </div>

          <div className="academic-stat-item" onClick={() => navigate('/tasks')}>
            <div className="stat-icon-emblem completed-emblem">
              <CheckCircle2 size={20} />
            </div>
            <div className="stat-body">
              <div className="stat-number">{stats.completed}</div>
              <div className="stat-label">Completed Tasks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Continue Studying Section */}
      <section className="dashboard-section">
        <div className="section-header-row">
          <h2 className="section-title">
            <BookMarked size={20} className="section-title-icon" /> Continue Studying
          </h2>
          {recentFiles.length > 0 && (
            <span className="section-caption text-secondary">Recently opened course documents</span>
          )}
        </div>

        {recentFiles.length > 0 ? (
          <div className="recent-files-grid">
            {recentFiles.map(rf => {
              const percent = rf.totalPages > 0 ? Math.round((rf.currentPage / rf.totalPages) * 100) : 0;
              return (
                <div key={rf.fileId} className="card recent-file-card">
                  <div className="recent-file-header">
                    <div className="recent-file-icon">
                      <FileText size={22} />
                    </div>
                    <div className="recent-file-info">
                      <span className="recent-file-subject">{rf.subjectName}</span>
                      <h3 className="recent-file-name" title={rf.file.name}>{rf.file.name}</h3>
                    </div>
                  </div>
                  <div className="recent-file-progress">
                    <div className="progress-text">
                      <span>Reading Page {rf.currentPage} of {rf.totalPages}</span>
                      <span className="recent-file-time">{formatRelative(rf.lastOpened)}</span>
                    </div>
                    <ProgressBar value={percent} showLabel size="sm" />
                  </div>
                  <button 
                    className="btn btn-primary recent-file-btn"
                    onClick={() => navigate(`/viewer/${rf.fileId}`)}
                  >
                    <Play size={15} /> Resume Reading
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card empty-recent">
            <div className="empty-recent-content">
              <div className="empty-recent-badge">
                <FileIcon size={36} />
              </div>
              <h3>No reading sessions recorded yet</h3>
              <p className="text-secondary">Open any PDF or lecture slide in your subjects to resume reading from where you left off.</p>
              <button className="btn btn-secondary mt-4" onClick={() => navigate('/semester')}>
                <BookOpen size={16} /> Browse Subjects
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Quick Actions Section */}
      <section className="dashboard-section">
        <div className="section-header-row">
          <h2 className="section-title">
            <Plus size={20} className="section-title-icon" /> Quick Actions
          </h2>
          <span className="section-caption text-secondary">Fast shortcuts to organize coursework</span>
        </div>
        <div className="quick-actions-grid">
          <button className="card quick-action-card" onClick={() => navigate('/semester')}>
            <div className="quick-action-icon-wrap">
              <BookOpen size={22} />
            </div>
            <div className="quick-action-text">
              <span className="quick-action-title">Manage Subjects</span>
              <span className="quick-action-desc">Add or view semester courses</span>
            </div>
            <ArrowRight size={16} className="quick-action-arrow" />
          </button>
          
          <button className="card quick-action-card" onClick={() => navigate('/tasks')}>
            <div className="quick-action-icon-wrap">
              <CheckCircle size={22} />
            </div>
            <div className="quick-action-text">
              <span className="quick-action-title">Assignment Tasks</span>
              <span className="quick-action-desc">Track to-dos and deadlines</span>
            </div>
            <ArrowRight size={16} className="quick-action-arrow" />
          </button>

          <button className="card quick-action-card" onClick={() => navigate('/notes')}>
            <div className="quick-action-icon-wrap">
              <FileText size={22} />
            </div>
            <div className="quick-action-text">
              <span className="quick-action-title">Study Notes</span>
              <span className="quick-action-desc">Record lecture notes & ideas</span>
            </div>
            <ArrowRight size={16} className="quick-action-arrow" />
          </button>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
