import React, { useState, useEffect } from 'react';
import { CheckSquare } from 'lucide-react';
import { getAllTasks, addTask, updateTask, deleteTask, toggleTaskDone } from '../storage/taskStore';
import { getAllSubjects } from '../storage/subjectStore';
import TaskItem from '../components/TaskItem';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import './Tasks.css';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjectsMap, setSubjectsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [filterState, setFilterState] = useState('all'); // 'all', 'pending', 'completed'
  const [filterSubject, setFilterSubject] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', subjectId: '', deadline: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const subs = await getAllSubjects();
      setSubjects(subs);
      const map = subs.reduce((acc, s) => ({...acc, [s.id]: s.name}), {});
      setSubjectsMap(map);

      const ts = await getAllTasks();
      setTasks(ts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTasks = tasks
    .filter(t => {
      if (filterState === 'pending') return !t.done;
      if (filterState === 'completed') return t.done;
      return true;
    })
    .filter(t => {
      if (filterSubject === 'all') return true;
      return t.subjectId === filterSubject;
    })
    .sort((a, b) => {
      if (a.done === b.done) return new Date(b.createdAt) - new Date(a.createdAt);
      return a.done ? 1 : -1;
    });

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (editingTask) {
      await updateTask(editingTask.id, formData);
    } else {
      await addTask(formData);
    }
    setIsModalOpen(false);
    setEditingTask(null);
    loadData();
  };

  const openAddModal = () => {
    setFormData({ title: '', description: '', subjectId: subjects[0]?.id || '', deadline: '' });
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setFormData({ title: task.title, description: task.description, subjectId: task.subjectId, deadline: task.deadline || '' });
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleToggle = async (id) => {
    await toggleTaskDone(id);
    loadData();
  };

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(id);
      loadData();
    }
  };

  if (loading) return <div className="p-8">Loading tasks...</div>;

  return (
    <div className="tasks-page-container fade-in">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="text-secondary">Track your assignments and to-dos</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>+ Add Task</button>
      </header>

      <div className="filter-bar">
        <div className="filter-tabs">
          <button className={`filter-tab ${filterState === 'all' ? 'active' : ''}`} onClick={() => setFilterState('all')}>All</button>
          <button className={`filter-tab ${filterState === 'pending' ? 'active' : ''}`} onClick={() => setFilterState('pending')}>Pending</button>
          <button className={`filter-tab ${filterState === 'completed' ? 'active' : ''}`} onClick={() => setFilterState('completed')}>Completed</button>
        </div>
        <div className="filter-select">
          <select className="select" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
            <option value="all">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="tasks-list-container">
        {tasks.length === 0 ? (
          <EmptyState 
            icon={CheckSquare}
            title="No tasks yet"
            description="Add something you need to accomplish."
            actionLabel="+ Add Task"
            onAction={openAddModal}
          />
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-secondary">No tasks match the current filter.</div>
        ) : (
          <div className="task-list">
            {filteredTasks.map(t => (
              <TaskItem 
                key={t.id}
                task={t}
                subjectName={subjectsMap[t.subjectId]}
                onToggle={() => handleToggle(t.id)}
                onEdit={() => openEditModal(t)}
                onDelete={() => handleDelete(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} title={editingTask ? 'Edit Task' : 'Add Task'} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleModalSubmit}>
          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Title</label>
            <input type="text" className="input w-full" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} autoFocus required />
          </div>
          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Subject</label>
            <select className="select w-full" value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})} required>
              {subjects.length === 0 && <option value="">No subjects available</option>}
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea className="textarea w-full" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Deadline (Optional)</label>
            <input type="date" className="input w-full" value={formData.deadline || ''} onChange={e => setFormData({...formData, deadline: e.target.value})} />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tasks;
