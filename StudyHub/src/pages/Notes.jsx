import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { getAllNotes, addNote, updateNote, deleteNote } from '../storage/noteStore';
import { getAllSubjects } from '../storage/subjectStore';
import NoteCard from '../components/NoteCard';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import './Notes.css';

const Notes = () => {
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjectsMap, setSubjectsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [filterSubject, setFilterSubject] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', subjectId: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const subs = await getAllSubjects();
      setSubjects(subs);
      const map = subs.reduce((acc, s) => ({...acc, [s.id]: s.name}), {});
      setSubjectsMap(map);

      const ns = await getAllNotes();
      setNotes(ns);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredNotes = notes.filter(n => {
    if (filterSubject === 'all') return true;
    return n.subjectId === filterSubject;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (editingNote) {
      await updateNote(editingNote.id, formData);
    } else {
      await addNote(formData);
    }
    setIsModalOpen(false);
    setEditingNote(null);
    loadData();
  };

  const openAddModal = () => {
    setFormData({ title: '', content: '', subjectId: subjects[0]?.id || '' });
    setEditingNote(null);
    setIsModalOpen(true);
  };

  const openEditModal = (note) => {
    setFormData({ title: note.title, content: note.content, subjectId: note.subjectId });
    setEditingNote(note);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to delete this note?')) {
      await deleteNote(id);
      loadData();
    }
  };

  if (loading) return <div className="p-8">Loading notes...</div>;

  return (
    <div className="notes-page-container fade-in">
      <header className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="text-secondary">Jot down your thoughts and ideas</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>+ Add Note</button>
      </header>

      <div className="filter-bar">
        <select className="select" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
          <option value="all">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="notes-grid-container">
        {notes.length === 0 ? (
          <EmptyState 
            icon={FileText}
            title="No notes yet"
            description="Jot down something to remember."
            actionLabel="+ Add Note"
            onAction={openAddModal}
          />
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-secondary">No notes match the current filter.</div>
        ) : (
          <div className="grid-3">
            {filteredNotes.map(n => (
              <NoteCard 
                key={n.id}
                note={n}
                subjectName={subjectsMap[n.subjectId]}
                onEdit={() => openEditModal(n)}
                onDelete={() => handleDelete(n.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} title={editingNote ? 'Edit Note' : 'Add Note'} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleModalSubmit}>
          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Title</label>
            <input type="text" className="input w-full" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} autoFocus required />
          </div>
          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Subject (Optional)</label>
            <select className="select w-full" value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})}>
              <option value="">No Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group mb-4">
            <label className="block text-sm font-medium mb-2">Content</label>
            <textarea className="textarea w-full" rows={8} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} required />
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

export default Notes;
