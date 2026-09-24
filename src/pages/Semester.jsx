import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { getAllSubjects, addSubject, updateSubject, deleteSubject } from '../storage/subjectStore';
import { getFileCountForSubject } from '../storage/fileStore';
import { getTasksBySubject } from '../storage/taskStore';
import SubjectCard from '../components/SubjectCard';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import './Semester.css';

const emojis = ['💻', '🧮', '🗄️', '🤖', '🌐', '📊', '📐', '🔬', '📚', '✏️', '🎨', '🔧', '📝', '🧪', '🏛️', '💡', '🎯', '🧠', '📱', '🔒'];

const Semester = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  const [selectedSubject, setSelectedSubject] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', icon: '📚' });

  const loadData = async () => {
    setLoading(true);
    try {
      const subs = await getAllSubjects();
      const enriched = await Promise.all(subs.map(async sub => {
        const fileCount = await getFileCountForSubject(sub.id);
        const tasks = await getTasksBySubject(sub.id);
        return { ...sub, fileCount, taskCount: tasks.length };
      }));
      setSubjects(enriched);
    } catch (error) {
      console.error('Failed to load subjects', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    await addSubject(formData.name.trim(), formData.icon);
    setIsAddModalOpen(false);
    setFormData({ name: '', icon: '📚' });
    loadData();
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !selectedSubject) return;
    await updateSubject(selectedSubject.id, { name: formData.name.trim(), icon: formData.icon });
    setIsRenameModalOpen(false);
    setSelectedSubject(null);
    loadData();
  };

  const handleDelete = async () => {
    if (!selectedSubject) return;
    await deleteSubject(selectedSubject.id);
    setIsDeleteConfirmOpen(false);
    setSelectedSubject(null);
    loadData();
  };

  const openRenameModal = (sub) => {
    setSelectedSubject(sub);
    setFormData({ name: sub.name, icon: sub.icon });
    setIsRenameModalOpen(true);
  };

  const openDeleteConfirm = (sub) => {
    setSelectedSubject(sub);
    setIsDeleteConfirmOpen(true);
  };

  if (loading) return <div className="p-8">Loading semester...</div>;

  return (
    <div className="semester-container fade-in">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Semester 3</h1>
          <p className="text-secondary">Manage your subjects and courses</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormData({ name: '', icon: '📚' }); setIsAddModalOpen(true); }}>
          + Add Subject
        </button>
      </header>

      {subjects.length > 0 ? (
        <div className="grid-3">
          {subjects.map(sub => (
            <SubjectCard 
              key={sub.id} 
              subject={sub}
              fileCount={sub.fileCount}
              taskCount={sub.taskCount}
              onOpen={() => navigate(`/subject/${sub.id}`)}
              onRename={() => openRenameModal(sub)}
              onDelete={() => openDeleteConfirm(sub)}
            />
          ))}
        </div>
      ) : (
        <EmptyState 
          icon={BookOpen}
          title="No subjects yet"
          description="Create your first subject to start organizing Semester 3."
          actionLabel="+ Add Subject"
          onAction={() => setIsAddModalOpen(true)}
        />
      )}

      <Modal isOpen={isAddModalOpen || isRenameModalOpen} title={isAddModalOpen ? 'Add Subject' : 'Rename Subject'} onClose={() => { setIsAddModalOpen(false); setIsRenameModalOpen(false); }}>
        <form onSubmit={isAddModalOpen ? handleAddSubmit : handleRenameSubmit}>
          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Subject Name</label>
            <input 
              type="text" 
              className="input w-full" 
              placeholder="e.g. Mathematics"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              autoFocus
            />
          </div>
          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Select Icon</label>
            <div className="emoji-grid">
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className={`emoji-btn ${formData.icon === emoji ? 'selected' : ''}`}
                  onClick={() => setFormData({...formData, icon: emoji})}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn btn-ghost" onClick={() => { setIsAddModalOpen(false); setIsRenameModalOpen(false); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isAddModalOpen ? 'Create' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isDeleteConfirmOpen}
        title="Delete Subject"
        message={`Are you sure you want to delete "${selectedSubject?.name}"? This will also delete all files, folders, tasks, and notes inside it. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
};

export default Semester;
